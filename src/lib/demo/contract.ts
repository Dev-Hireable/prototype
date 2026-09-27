"use client";

import { useEffect } from "react";
import { nextPay, noticeLastDay, type Notice, type PayPeriod, payPeriods } from "@/lib/contract/lifecycle";
import type { Dispute } from "@/lib/disputes/case";
import { dayLabel, isoDay, parseDay, today } from "@/lib/demo/dates";
import { contractTypeOf, type Deal, type DealEvaluation, evaluationsOf, fitScoreOf, lifecycleOfDeal, readDeal, type RoleHold, settleEscrow, startedAsTrial, trialEvaluationOf, updateDeal } from "@/lib/demo/deal";
// disputes.ts reaches back only through a lazy import() of sweepContract, so neither module needs the
// other while it loads: a cycle on paper, not at runtime.
// fallow-ignore-next-line circular-dependency
import { dealContract, escrowOf, getDisputes, holds, rateAmount, usd } from "@/lib/demo/disputes";
import { JOB_TYPE_LABEL, type OngoingType } from "@/lib/demo/job-types";
import { move, notify, PAIR, recordLedger, recordPayment } from "@/lib/demo/live";

/**
 * The live contract's lifecycle as it moves money and closes its chapters (the rules are in
 * @/lib/contract/lifecycle):
 *
 *   the trial's evaluation   makes its Trial Fit Score final and pays out its escrow (TB-067)
 *   the evaluation window    if it passes with no evaluation, the escrow pays out on its own — the
 *                            Team Builder is reminded the day before
 *   the post-trial offer     accepting it releases what the trial's escrow still holds (IN-084); one
 *                            not answered by its start date expires (TB-072)
 *   full-time / part-time    each month is paid on its last day, pro rata for a part-month (IN-051);
 *                            a role dispute keeps its amount back from the pay while it's open
 *   ending                   either side gives notice and the role runs, paid, to its last day; the
 *                            Team Builder can end at once, paying the notice; a contract not started
 *                            yet is cancelled, owing nothing (TB-071 / IN-091)
 *
 * Every step re-reads the saved deal first, and the clock runs one tab at a time, so two open
 * portals can't move the same money twice.
 */

const role = (d: Deal) => ({ slug: d.roleSlug, title: d.title });
const trialPeriod = (d: Deal) => `Trial ${dayLabel(d.contract?.started)} – ${dayLabel(d.contract?.ends)}`;
const talent = () => PAIR.independent.name.split(" ")[0];
const teamHref = (tab?: string) => `/team/independents/${PAIR.independent.slug}${tab ? `?tab=${tab}` : ""}`;
const talentHref = (d: Deal, tab?: string) => `/independent/contracts/${d.roleSlug}${tab ? `?tab=${tab}` : ""}`;
const cents = (n: number) => Math.round(n * 100) / 100;
const fail = (error: string) => ({ ok: false as const, error });

/** One change at a time across tabs (the Web Locks API queues them; the next one re-reads). */
async function exclusive<T>(fn: () => T): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks?.request) return fn();
  return locks.request("hireable.contract", () => fn());
}

/** Pays out what the trial's escrow still holds — less anything a dispute is keeping — to the talent. */
function releaseEscrow(d: Deal, period = trialPeriod(d)): number {
  const e = escrowOf(d, getDisputes());
  const amount = e ? e.held - e.onHold : 0;
  if (amount <= 0) return 0;
  settleEscrow({ released: amount });
  recordPayment({ contract: d.roleSlug, title: d.title, company: d.company, amount: usd(amount), period, chapter: "trial" });
  return amount;
}

/** A trial called off before its first day: nothing was worked, so its escrow goes back to the company. */
function refundEscrow(d: Deal): number {
  const e = escrowOf(d, getDisputes());
  const amount = e ? e.held - e.onHold : 0;
  if (amount <= 0) return 0;
  settleEscrow({ refunded: amount });
  recordLedger({ contract: d.roleSlug, title: d.title, company: d.company, amount: usd(amount), period: `${trialPeriod(d)} · cancelled before it started`, chapter: "trial", kind: "refunded" });
  return amount;
}

/* ----------------------------------------------------------- evaluation */

export type EvaluationInput = Omit<DealEvaluation, "date" | "tfp">;
export type EvaluationResult = { ok: true; trial: boolean; released: number; score?: number } | { ok: false; error: string };

/**
 * TB-067 / TB-117 — the Team Builder's evaluation. Once the trial is over, the first is the trial's
 * own: it makes the Trial Fit Score final — frozen as it stands, with these stars — and pays out
 * the escrow. On a full-time or part-time contract it's a review of the role, and moves neither.
 */
export function sendEvaluation(e: EvaluationInput): EvaluationResult {
  const d = readDeal();
  const l = lifecycleOfDeal(d);
  if (!d?.contract || !l) return fail("There's no contract to evaluate.");
  if (l.phase === "ended") return fail("This contract has ended, so it can't be evaluated any more.");
  const date = today();
  if (l.phase === "evaluation") {
    const score = fitScoreOf(d, e);
    updateDeal((x) => (x.contract ? { ...x, contract: { ...x.contract, trialScore: score, evaluations: [{ ...e, date, tfp: score.overall }, ...evaluationsOf(x.contract)] } } : x));
    const released = releaseEscrow(d);
    move("evaluation_sent", role(d), { type: "trial" });
    return { ok: true, trial: true, released, score: score.overall };
  }
  if (l.phase !== "ongoing") {
    if (l.phase === "starts") return fail(l.converted || !l.startedAsTrial ? `Reviews open on ${dayLabel(l.since)}, the role's first day.` : "The evaluation opens when the trial ends.");
    return fail(l.phase === "trial" ? "The evaluation opens when the trial ends." : "The trial's evaluation has already been sent.");
  }
  updateDeal((x) => (x.contract ? { ...x, contract: { ...x.contract, evaluations: [{ ...e, date }, ...evaluationsOf(x.contract)] } } : x));
  move("evaluation_sent", role(d), { type: contractTypeOf(d) });
  return { ok: true, trial: false, released: 0 };
}

/* ------------------------------------------------------ post-trial offer */

export type AcceptResult = { ok: true; released: number } | { ok: false; error: string };

/**
 * IN-084 — the talent accepts the full-time or part-time offer. It has to still be out: not
 * withdrawn, not ended with the contract, and not past its start date (it expired then — accepting
 * it late would pay days nobody had agreed to). What the trial's escrow still holds, less what a
 * dispute is keeping, is released now.
 */
export function acceptConversion(): AcceptResult {
  const d = readDeal();
  const offer = d?.conversion;
  const l = lifecycleOfDeal(d);
  if (!d?.contract || !offer || !l) return fail("There's no offer to accept.");
  if (l.phase === "ended") return fail("The contract has ended, so this offer can't be accepted.");
  if (offer.status === "withdrawn") return fail(`${d.company} withdrew this offer, so it can't be accepted.`);
  if (offer.status !== "sent" && offer.status !== "expired") return fail("This offer has already been answered.");
  if (l.phase !== "offer") return fail(`This offer expired on ${dayLabel(offer.start)}, its start date, without an answer. ${d.company} can send you a new one.`);
  const released = releaseEscrow(d, `Trial complete — hired ${JOB_TYPE_LABEL[offer.type].toLowerCase()}`);
  updateDeal((x) => (x.conversion ? { ...x, conversion: { ...x.conversion, status: "accepted", accepted: today() } } : x));
  move("hire_accepted", role(d), { type: offer.type });
  return { ok: true, released };
}

/* -------------------------------------------------------------- ending */

export type EndSide = "team" | "independent";
export type EndResult = { ok: true; released: number; paid: number; refunded?: number; withdrew?: OngoingType; notice?: Notice; cancelled?: boolean } | { ok: false; error: string };

/** What ending the live contract would do right now, for `by` — the buttons and their confirmations read this. */
export type EndOption = { how: "cancel" | "close" | "notice" | "now"; lastDay?: Date; blocked?: string } | null;

/**
 * Who can end the live contract, how, at this point in its lifecycle:
 *   before its first day    either side cancels it — nothing was worked, so nothing is owed
 *   the trial / evaluation  nobody yet: the Team Builder evaluates it first (TB-071)
 *   decision / offer        the Team Builder closes it, releasing the escrow
 *   a running role          either side gives notice; the Team Builder can also end it at once,
 *                           paying the notice — but not while a dispute is holding pay
 */
export function endOptions(d: Deal | null, by: EndSide, now = new Date()): EndOption[] {
  const l = lifecycleOfDeal(d, now);
  const c = d?.contract;
  if (!d || !c || !l || l.phase === "ended") return [];
  if (l.phase === "starts") return [{ how: "cancel" }];
  if (l.phase === "decision" || l.phase === "offer") return by === "team" ? [{ how: "close", blocked: trialHoldReason(d) }] : [];
  if (l.phase !== "ongoing" || l.type === "trial") return [];
  const lastDay = l.notice ? parseDay(l.notice.lastDay) : noticeLastDay(l.type, now);
  const notice: EndOption = l.notice ? null : { how: "notice", lastDay };
  const endNow: EndOption = by === "team" ? { how: "now", lastDay, blocked: trialHoldReason(d) ?? roleHoldReason(d) } : null;
  return [notice, endNow].filter(Boolean);
}

/** A dispute about the trial is keeping part of its escrow: ending can't release it. */
function trialHoldReason(d: Deal): string | undefined {
  const e = startedAsTrial(d) ? escrowOf(d, getDisputes()) : null;
  return e && e.onHold > 0 ? `A dispute is holding ${usd(e.onHold)} in escrow, so the contract can't end until it's resolved.` : undefined;
}

/** A dispute about the role is keeping pay back: ending at once waits for it (notice still runs). */
function roleHoldReason(d: Deal): string | undefined {
  const open = roleDisputes(d).filter(holds);
  return open.length ? `A dispute is holding ${usd(open.reduce((n, x) => n + x.amount, 0))} of ${talent()}'s pay, so the contract can't end at once until it's resolved. Notice can still be given.` : undefined;
}

/**
 * TB-071 / IN-091 — ending the live contract, for good: nothing reopens it.
 *   cancel  before its first day: a trial's escrow goes back to the company, a role owes nothing
 *   close   after the trial's evaluation: what the escrow still holds is released, and a post-trial
 *           offer still out is withdrawn with it
 *   notice  a running role keeps going to the notice's last day, then ends on its own (the clock)
 *   now     the Team Builder ends a running role today, paying through the notice's last day
 */
export function endContract(by: EndSide, how: "cancel" | "close" | "notice" | "now"): EndResult {
  const d = readDeal();
  const l = lifecycleOfDeal(d);
  const c = d?.contract;
  if (!d || !c || !l) return fail("There's no contract to end.");
  if (l.phase === "ended") return fail("This contract has already ended.");
  const option = endOptions(d, by).find((o) => o?.how === how);
  if (!option) return fail(refusal(l.phase, by, how));
  if (option.blocked) return fail(option.blocked);
  const on = today();
  const other: EndSide = by === "team" ? "independent" : "team";
  const who = by === "team" ? d.company : PAIR.independent.name;

  if (how === "cancel") {
    const refunded = l.type === "trial" ? refundEscrow(d) : 0;
    updateDeal((x) => (x.contract ? { ...x, contract: { ...x.contract, ended: true, endedOn: on, cancelled: true } } : x));
    const what = l.type === "trial" ? "trial" : `${JOB_TYPE_LABEL[l.type].toLowerCase()} role`;
    tell(d, other, `Contract cancelled`, `${who} cancelled the ${d.title} ${what} before its first day, ${dayLabel(l.since)}.${refunded > 0 ? ` The ${usd(refunded)} in escrow went back to ${d.company}.` : " Nothing was owed."}`);
    return { ok: true, released: 0, paid: 0, refunded, cancelled: true };
  }

  if (how === "close") {
    const withdrew = d.conversion?.status === "sent" ? d.conversion.type : undefined;
    const released = releaseEscrow(d);
    updateDeal((x) => (x.contract ? { ...x, conversion: withdrew && x.conversion ? { ...x.conversion, status: "withdrawn" } : x.conversion, contract: { ...x.contract, ended: true, endedOn: on } } : x));
    move("contract_ended", role(d), { type: l.type, note: [withdrew && `Its ${JOB_TYPE_LABEL[withdrew].toLowerCase()} offer is withdrawn with it.`, released > 0 && `The ${usd(released)} still in escrow has been released to your payout method.`].filter(Boolean).join(" ") || undefined });
    return { ok: true, released, paid: 0, withdrew };
  }

  const type = l.type as OngoingType;
  const lastDay = option.lastDay ?? noticeLastDay(type, new Date());
  if (how === "notice") {
    const notice: Notice = { by, given: isoDay(), lastDay: isoDay(lastDay) };
    updateDeal((x) => (x.contract ? { ...x, contract: { ...x.contract, notice } } : x));
    tell(d, other, `${by === "team" ? d.company : talent()} gave notice`, `The ${d.title} ${JOB_TYPE_LABEL[type].toLowerCase()} role ends after ${dayLabel(lastDay)}. It carries on, and is paid, until then.`);
    return { ok: true, released: 0, paid: 0, notice };
  }

  // Now: paid through the notice's last day — the part after today in lieu of the notice.
  const paid = payUpTo(d, lastDay, true);
  updateDeal((x) => (x.contract ? { ...x, contract: { ...x.contract, ended: true, endedOn: on, notice: undefined } } : x));
  move("contract_ended", role(d), { type, note: paid > 0 ? `Your pay through ${dayLabel(lastDay)}, ${usd(paid)}, has been recorded — the notice period included.` : undefined });
  return { ok: true, released: 0, paid };
}

function refusal(phase: string, by: EndSide, how: string) {
  if (phase === "trial") return "The trial is still running. It can be ended once it's over and evaluated.";
  if (phase === "evaluation") return "Send the trial's evaluation first: it makes the Trial Fit Score final and settles the escrow.";
  if ((phase === "decision" || phase === "offer") && by === "independent") return "The trial is over. The company decides what's next: a role, or closing the contract.";
  if (how === "now" && by === "independent") return "Give notice to end the contract. It carries on, and is paid, through the notice period.";
  if (how === "notice") return "Notice has already been given on this contract.";
  return "The contract can't be ended that way right now.";
}

/** IN-091 / TB-071 — whoever gave notice takes it back before its last day; the role carries on. */
export function withdrawNotice(by: EndSide): { ok: true } | { ok: false; error: string } {
  const d = readDeal();
  const l = lifecycleOfDeal(d);
  const n = d?.contract?.notice;
  if (!d || !l || !n || l.phase !== "ongoing") return fail("There's no notice to take back.");
  if (n.by !== by) return fail(`Only ${n.by === "team" ? d.company : talent()} can take back the notice they gave.`);
  updateDeal((x) => (x.contract ? { ...x, contract: { ...x.contract, notice: undefined } } : x));
  tell(d, by === "team" ? "independent" : "team", "Notice withdrawn", `${by === "team" ? d.company : talent()} took back the notice on ${d.title}. The ${JOB_TYPE_LABEL[l.type].toLowerCase()} role carries on.`);
  return { ok: true };
}

/** A contract notice for one side, opening the contract. */
function tell(d: Deal, to: EndSide, title: string, body: string, tab?: string) {
  notify(to, { title, body, href: to === "team" ? teamHref(tab) : talentHref(d, tab), avatar: to === "team" ? PAIR.independent.avatar : PAIR.team.avatar, kind: "payments" });
}

/* ----------------------------------------------------------------- pay */

/** What a full-time or part-time role pays a month ("$4,000 /month" → 4000). */
const monthlyOf = (d: Deal | null) => rateAmount(d?.conversion?.status === "accepted" ? d.conversion.salary : (d?.contract?.rate ?? ""));

/**
 * The pay schedule on a full-time or part-time contract: what it pays a month, what's been paid
 * through, and the next payday with its amount — none once it has ended, before its first day, or
 * on a trial. `held` is what open role disputes are keeping back.
 */
export function payScheduleOf(d: Deal | null, now = new Date()): { monthly: number; paidThrough?: Date; next?: PayPeriod; held: number } | null {
  const l = lifecycleOfDeal(d, now);
  const c = d?.contract;
  const since = l ? parseDay(l.since) : undefined;
  if (!c || !l || l.type === "trial" || !since) return null;
  const monthly = monthlyOf(d);
  const paidThrough = parseDay(c.paidThrough);
  const held = d ? roleDisputes(d).filter(holds).reduce((n, x) => n + x.amount, 0) : 0;
  const running = l.phase === "ongoing" && !!monthly;
  let next = running ? nextPay(since, paidThrough, monthly) : undefined;
  // Under notice, the last payday is the notice's last day, pro rata.
  const last = l.notice ? parseDay(l.notice.lastDay) : undefined;
  if (next && last && next.to > last) next = { ...next, to: last, amount: payPeriods(next.from, last, monthly, true)[0]?.amount ?? 0 };
  return { monthly, paidThrough, next, held };
}

/** Role disputes on the live contract (about the pay, not the trial's escrow). */
function roleDisputes(d: Deal): Dispute[] {
  const key = dealContract(d)?.key;
  return key ? getDisputes().filter((x) => x.contract === key && x.type !== "trial") : [];
}

/** How much of a closed role dispute goes back to the company. */
function refundOf(x: Dispute): number {
  const r = x.resolution;
  if (!r) return 0;
  if (r.payment === "refunded") return r.moved ?? x.amount;
  if (r.payment === "split" && r.split) return r.split.refund;
  return 0;
}

/**
 * Brings the role disputes' holds on pay up to date: a newly filed one starts holding; one that has
 * closed pays on what it kept back — less the company's refund, which comes out of it first. A
 * refund bigger than what was kept back comes off the next pay; once the contract has ended there
 * is no next pay, so it stops at what was held.
 */
function syncHolds(d: Deal): Record<string, RoleHold> {
  const c = d.contract;
  const out: Record<string, RoleHold> = { ...c?.roleHolds };
  if (!c) return out;
  const row = { contract: d.roleSlug, title: d.title, company: d.company, chapter: contractTypeOf(d) };
  for (const x of roleDisputes(d)) {
    const h = out[x.id];
    if (holds(x)) {
      if (!h) out[x.id] = { amount: x.amount, reason: x.reason, withheld: 0 };
      continue;
    }
    if (!h || h.closed) continue;
    const refund = refundOf(x);
    const back = Math.min(refund, h.withheld);
    const paidOn = cents(h.withheld - back);
    if (back > 0) recordLedger({ ...row, amount: usd(back), period: `Dispute · ${x.reason} — refunded from the pay held`, kind: "refunded" });
    if (paidOn > 0) recordPayment({ ...row, amount: usd(paidOn), period: `Pay held for the dispute (${x.reason}) — paid out` });
    out[x.id] = { ...h, withheld: 0, deduct: c.ended ? 0 : cents(refund - back), closed: true };
  }
  return out;
}

/**
 * Records the pay due up to `until` — whole months, and the part-month too when it's closing. Open
 * role disputes keep their amounts back from it, and a refund still owed after one closed comes off
 * it (syncHolds).
 */
function payUpTo(d: Deal, until: Date, closing = false): number {
  const l = lifecycleOfDeal(d);
  const c = d.contract;
  const since = l ? parseDay(l.since) : undefined;
  const monthly = monthlyOf(d);
  if (!c || !l || l.type === "trial" || !since || !monthly) return 0;
  const paid = parseDay(c.paidThrough);
  const from = paid ? new Date(paid.getFullYear(), paid.getMonth(), paid.getDate() + 1) : since;
  const periods = payPeriods(from, until, monthly, closing);
  const heldBy = syncHolds(d);
  const row = { contract: d.roleSlug, title: d.title, company: d.company, chapter: l.type };
  const now = new Date();
  let total = 0;
  for (const p of periods) {
    let amount = p.amount;
    const notes: string[] = [];
    for (const [id, h] of Object.entries(heldBy)) {
      if (!h.closed) {
        const take = cents(Math.min(h.amount - h.withheld, amount));
        if (take <= 0) continue;
        heldBy[id] = { ...h, withheld: cents(h.withheld + take) };
        amount = cents(amount - take);
        notes.push(`${usd(take)} held for a dispute`);
      } else if (h.deduct && h.deduct > 0) {
        const take = cents(Math.min(h.deduct, amount));
        if (take <= 0) continue;
        heldBy[id] = { ...h, deduct: cents(h.deduct - take) };
        amount = cents(amount - take);
        notes.push(`${usd(take)} refunded for a dispute`);
        recordLedger({ ...row, amount: usd(take), period: `Dispute · ${h.reason} — kept from the pay for ${dayLabel(p.from)} – ${dayLabel(p.to)}`, kind: "refunded" });
      }
    }
    const inLieu = p.to > now ? " · in lieu of notice" : "";
    const label = `${dayLabel(p.from)} – ${dayLabel(p.to)}${inLieu}${notes.length ? ` · less ${notes.join(", ")}` : ""}`;
    if (amount > 0) recordPayment({ ...row, amount: usd(amount), period: label });
    else notify("independent", { title: "Pay held for a dispute", body: `Your ${d.title} pay for ${dayLabel(p.from)} – ${dayLabel(p.to)} is held while the dispute is open. It's paid out, or refunded, when the case closes.`, href: "/independent/wallet", kind: "payments" });
    total += amount;
  }
  const last = periods.at(-1);
  updateDeal((x) => (x.contract ? { ...x, contract: { ...x.contract, roleHolds: heldBy, ...(last ? { paidThrough: isoDay(last.to) } : {}) } } : x));
  return cents(total);
}

/* --------------------------------------------------------------- clock */

const fired = (d: Deal, key: string) => d.contract?.fired?.includes(key) ?? false;
const fire = (key: string) => updateDeal((x) => (x.contract ? { ...x, contract: { ...x.contract, fired: [...(x.contract.fired ?? []), key] } } : x));

/**
 * What time does on its own:
 *   the evaluation reminder the day before it's due, and the escrow paying out once the evaluation
 *   window has passed without one
 *   whatever the trial's escrow is still holding once its evaluation is in (or overdue) and no
 *   dispute keeps it — a dispute rejected or withdrawn after the trial gives its amount back
 *   a post-trial offer running past its start date unanswered: it expires
 *   each month's pay on a full-time or part-time role, and the role disputes' holds on it
 *   notice running out: the role ends, paid through the notice's last day
 *
 * Exported for lib/demo/disputes.ts, which loads this module lazily to run it
 * (`import(…).then((m) => m.sweepContract())`); fallow can't see that use.
 */
// fallow-ignore-next-line unused-export
export function sweepContract(now = new Date()) {
  return exclusive(() => {
    const d = readDeal();
    const l = lifecycleOfDeal(d, now);
    const c = d?.contract;
    if (!d || !c || !l) return;
    const who = talent();
    if (l.phase === "evaluation" && l.trial) {
      const due = l.trial.evaluationDue;
      const eve = new Date(due.getFullYear(), due.getMonth(), due.getDate() - 1);
      if (now >= eve && !l.trial.evaluationOverdue && !fired(d, "evaluation-reminder")) {
        fire("evaluation-reminder");
        notify("team", { title: `${who}'s evaluation is due tomorrow`, body: `Send your evaluation of the ${d.title} trial by ${dayLabel(due)}. If the window closes without one, the escrow is released to ${who}.`, href: teamHref("evaluation"), avatar: PAIR.independent.avatar, kind: "payments" });
      }
    }

    // The trial's escrow, once it's settled which way it goes: evaluated, or the window passed.
    const settledTrial = !!l.trial?.over && !c.cancelled && (!!trialEvaluationOf(d) || !!l.trial?.evaluationOverdue);
    if (settledTrial && l.phase !== "starts") {
      const e = escrowOf(d, getDisputes());
      if (e && e.held - e.onHold > 0) {
        const overdue = l.phase === "evaluation";
        const released = releaseEscrow(d);
        if (released > 0 && overdue && !fired(d, "escrow-released")) {
          fire("escrow-released");
          notify("team", { title: `${who}'s trial budget was released`, body: `The evaluation window closed on ${dayLabel(l.trial?.evaluationDue)} with no evaluation, so the ${usd(released)} held in escrow${e.onHold > 0 ? ` (less ${usd(e.onHold)} a dispute is keeping)` : ""} went to ${who}. You can still send your evaluation.`, href: teamHref("contract"), avatar: PAIR.independent.avatar, kind: "payments" });
        }
      }
    }

    // TB-072 — an offer nobody answered by its start date.
    if (d.conversion?.status === "sent" && l.phase === "decision" && l.expired) {
      const kind = JOB_TYPE_LABEL[d.conversion.type].toLowerCase();
      const start = dayLabel(d.conversion.start);
      updateDeal((x) => (x.conversion?.status === "sent" ? { ...x, conversion: { ...x.conversion, status: "expired" } } : x));
      notify("team", { title: `Your ${kind} offer to ${who} expired`, body: `${who} didn't answer it by ${start}, its start date, so it can't be accepted any more. Send a new one with a later start, or end the contract.`, href: teamHref(), avatar: PAIR.independent.avatar, kind: "payments" });
      notify("independent", { title: "Offer expired", body: `The ${kind} offer for ${d.title} passed its start date, ${start}, without an answer. ${d.company} can send you a new one.`, href: talentHref(d), avatar: PAIR.team.avatar, kind: "payments" });
    }

    // Notice ran out: the role ends, paid through its last day (below).
    const noticeOver = !!c.notice && !c.ended && l.phase === "ended";
    if (l.phase === "ongoing") payUpTo(d, now);
    // A role dispute can close after the contract has ended: what it held is settled all the same.
    else if (!noticeOver && c.roleHolds) updateDeal((x) => (x.contract ? { ...x, contract: { ...x.contract, roleHolds: syncHolds(x) } } : x));

    if (noticeOver && c.notice) {
      const last = parseDay(c.notice.lastDay) ?? now;
      // Re-read: the steps above may have saved since `d` was read.
      const paid = payUpTo(readDeal() ?? d, last, true);
      updateDeal((x) => (x.contract ? { ...x, contract: { ...x.contract, ended: true, endedOn: dayLabel(last) } } : x));
      const body = `The ${d.title} contract ended after ${dayLabel(last)}, the last day of the notice.${paid > 0 ? ` The last pay, ${usd(paid)}, has been recorded.` : ""}`;
      tell(d, "team", "Contract ended", body);
      tell(d, "independent", "Contract ended", body);
    }
  });
}

/** Runs the clock in every open portal: on load, each minute, and when a tab comes back. */
export function useContractClock() {
  useEffect(() => {
    const run = () => void sweepContract();
    run();
    const timer = setInterval(run, 60_000);
    const back = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", back);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", back);
    };
  }, []);
}
