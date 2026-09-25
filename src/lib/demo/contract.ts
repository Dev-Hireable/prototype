"use client";

import { useEffect } from "react";
import { nextPay, payPeriods, type PayPeriod } from "@/lib/contract/lifecycle";
import { dayLabel, isoDay, parseDay, today } from "@/lib/demo/dates";
import { contractTypeOf, type Deal, type DealEvaluation, evaluationsOf, fitScoreOf, lifecycleOfDeal, readDeal, settleEscrow, startedAsTrial, updateDeal } from "@/lib/demo/deal";
import { dealContract, escrowOf, getDisputes, holds, rateAmount, usd } from "@/lib/demo/disputes";
import type { OngoingType } from "@/lib/demo/job-types";
import { move, notify, PAIR, recordPayment } from "@/lib/demo/live";

/**
 * The live contract's lifecycle as it moves money and closes its chapters (the rules are in
 * @/lib/contract/lifecycle):
 *
 *   the trial's evaluation   makes its Trial Fit Score final and pays out its escrow (TB-067)
 *   the evaluation window    if it passes with no evaluation and no dispute, the escrow pays out on
 *                            its own — the Team Builder is reminded the day before
 *   full-time / part-time    each month is paid on its last day, pro rata for a part-month (IN-051)
 *   ending                   pays what's owed up to today, withdraws a post-trial offer still out,
 *                            and is final (TB-071)
 *
 * Every step re-reads the saved deal first, and the clock runs one tab at a time, so two open
 * portals can't move the same money twice.
 */

const role = (d: Deal) => ({ slug: d.roleSlug, title: d.title });
const trialPeriod = (d: Deal) => `Trial ${dayLabel(d.contract?.started)} – ${dayLabel(d.contract?.ends)}`;

/** One change at a time across tabs (the Web Locks API queues them; the next one re-reads). */
async function exclusive<T>(fn: () => T): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks?.request) return fn();
  return locks.request("hireable.contract", () => fn());
}

/** Pays out what the trial's escrow still holds — less anything a dispute is keeping — to the talent. */
function releaseEscrow(d: Deal): number {
  const e = escrowOf(d, getDisputes());
  const amount = e ? e.held - e.onHold : 0;
  if (amount <= 0) return 0;
  settleEscrow({ released: amount });
  recordPayment({ contract: d.roleSlug, title: d.title, company: d.company, amount: usd(amount), period: trialPeriod(d), chapter: "trial" });
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
  if (!d?.contract || !l) return { ok: false, error: "There's no contract to evaluate." };
  if (l.phase === "ended") return { ok: false, error: "This contract has ended, so it can't be evaluated any more." };
  const date = today();
  if (l.phase === "evaluation") {
    const score = fitScoreOf(d, e);
    updateDeal((x) => (x.contract ? { ...x, contract: { ...x.contract, trialScore: score, evaluations: [{ ...e, date, tfp: score.overall }, ...evaluationsOf(x.contract)] } } : x));
    const released = releaseEscrow(d);
    move("evaluation_sent", role(d), { type: "trial" });
    return { ok: true, trial: true, released, score: score.overall };
  }
  if (l.phase !== "ongoing") return { ok: false, error: l.phase === "trial" || l.phase === "starts" ? "The evaluation opens when the trial ends." : "The trial's evaluation has already been sent." };
  updateDeal((x) => (x.contract ? { ...x, contract: { ...x.contract, evaluations: [{ ...e, date }, ...evaluationsOf(x.contract)] } } : x));
  move("evaluation_sent", role(d), { type: contractTypeOf(d) });
  return { ok: true, trial: false, released: 0 };
}

/* -------------------------------------------------------------- ending */

export type EndResult = { ok: true; released: number; paid: number; withdrew?: OngoingType } | { ok: false; error: string };

/**
 * TB-071 — ending the live contract, for good: nothing reopens it. It pays out what's owed up to
 * today (a trial's escrow still held, a full-time or part-time role's pay so far this month) and
 * withdraws a post-trial offer that's still out, so it can't be accepted afterwards.
 */
export function endContract(): EndResult {
  const d = readDeal();
  const l = lifecycleOfDeal(d);
  const c = d?.contract;
  if (!d || !c || !l) return { ok: false, error: "There's no contract to end." };
  if (l.phase === "ended") return { ok: false, error: "This contract has already ended." };
  // The trial's escrow, while there was one: a dispute filed during the trial can still hold part of
  // it after the contract converts, and ending can't release that either.
  const e = startedAsTrial(d) ? escrowOf(d, getDisputes()) : null;
  // A dispute keeps its amount in escrow until support rules; ending can't release it.
  if (e && e.onHold > 0) return { ok: false, error: `A dispute is holding ${usd(e.onHold)} in escrow, so the contract can't end until it's resolved.` };
  const withdrew = d.conversion?.status === "sent" ? d.conversion.type : undefined;
  const released = l.type === "trial" ? releaseEscrow(d) : 0;
  const paid = l.phase === "ongoing" ? payUpTo(d, new Date(), true) : 0;
  const on = today();
  updateDeal((x) => (x.contract ? { ...x, conversion: withdrew && x.conversion ? { ...x.conversion, status: "withdrawn" } : x.conversion, contract: { ...x.contract, ended: true, endedOn: on } } : x));
  if (withdrew) move("hire_withdrawn", role(d), { type: withdrew });
  const note = released > 0 ? `The ${usd(released)} still in escrow has been released to your payout method.` : paid > 0 ? `Your pay through ${on}, ${usd(paid)}, has been recorded.` : undefined;
  move("contract_ended", role(d), { type: l.type, note });
  return { ok: true, released, paid, withdrew };
}

/* ----------------------------------------------------------------- pay */

/** What a full-time or part-time role pays a month ("$4,000 /month" → 4000). */
export const monthlyOf = (d: Deal | null) => rateAmount(d?.conversion?.status === "accepted" ? d.conversion.salary : (d?.contract?.rate ?? ""));

/**
 * The pay schedule on a full-time or part-time contract: what it pays a month, what's been paid
 * through, and the next payday with its amount — none once it has ended, or on a trial.
 */
export function payScheduleOf(d: Deal | null, now = new Date()): { monthly: number; paidThrough?: Date; next?: PayPeriod } | null {
  const l = lifecycleOfDeal(d, now);
  const c = d?.contract;
  const since = l ? parseDay(l.since) : undefined;
  if (!c || !l || l.type === "trial" || !since) return null;
  const monthly = monthlyOf(d);
  const paidThrough = parseDay(c.paidThrough);
  return { monthly, paidThrough, next: l.phase === "ended" || !monthly ? undefined : nextPay(since, paidThrough, monthly) };
}

/** Records the pay due up to `now` — whole months, and the part-month too when it's closing. */
function payUpTo(d: Deal, now: Date, closing = false): number {
  const l = lifecycleOfDeal(d, now);
  const c = d.contract;
  const since = l ? parseDay(l.since) : undefined;
  const monthly = monthlyOf(d);
  if (!c || !l || l.type === "trial" || !since || !monthly) return 0;
  const paid = parseDay(c.paidThrough);
  const from = paid ? new Date(paid.getFullYear(), paid.getMonth(), paid.getDate() + 1) : since;
  const periods = payPeriods(from, now, monthly, closing);
  if (!periods.length) return 0;
  updateDeal((x) => (x.contract ? { ...x, contract: { ...x.contract, paidThrough: isoDay(periods[periods.length - 1].to) } } : x));
  for (const p of periods) recordPayment({ contract: d.roleSlug, title: d.title, company: d.company, amount: usd(p.amount), period: `${dayLabel(p.from)} – ${dayLabel(p.to)}`, chapter: l.type });
  return periods.reduce((n, p) => n + p.amount, 0);
}

/* --------------------------------------------------------------- clock */

const fired = (d: Deal, key: string) => d.contract?.fired?.includes(key) ?? false;
const fire = (key: string) => updateDeal((x) => (x.contract ? { ...x, contract: { ...x.contract, fired: [...(x.contract.fired ?? []), key] } } : x));

/**
 * What time does on its own: the evaluation reminder the day before it's due, the escrow paying
 * out once the evaluation window has passed with no evaluation and no dispute, and each month's
 * pay on a full-time or part-time contract.
 */
export function sweepContract(now = new Date()) {
  return exclusive(() => {
    const d = readDeal();
    const l = lifecycleOfDeal(d, now);
    if (!d?.contract || !l) return;
    const talent = PAIR.independent.name.split(" ")[0];
    if (l.phase === "evaluation" && l.trial) {
      const due = l.trial.evaluationDue;
      const eve = new Date(due.getFullYear(), due.getMonth(), due.getDate() - 1);
      if (now >= eve && !l.trial.evaluationOverdue && !fired(d, "evaluation-reminder")) {
        fire("evaluation-reminder");
        notify("team", { title: `${talent}'s evaluation is due tomorrow`, body: `Send your evaluation of the ${d.title} trial by ${dayLabel(due)}. If the window closes without one, the escrow is released to ${talent}.`, href: `/team/independents/${PAIR.independent.slug}?tab=evaluation`, avatar: PAIR.independent.avatar, kind: "payments" });
      }
      const key = dealContract(d)?.key;
      const disputed = getDisputes().some((x) => x.contract === key && holds(x));
      if (l.trial.evaluationOverdue && !disputed && !fired(d, "escrow-released")) {
        fire("escrow-released");
        const released = releaseEscrow(d);
        if (released > 0) notify("team", { title: `${talent}'s trial budget was released`, body: `The evaluation window closed on ${dayLabel(due)} with no evaluation and no dispute, so the ${usd(released)} held in escrow went to ${talent}. You can still send your evaluation.`, href: `/team/independents/${PAIR.independent.slug}?tab=contract`, avatar: PAIR.independent.avatar, kind: "payments" });
      }
    }
    if (l.phase === "ongoing") payUpTo(d, now);
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
