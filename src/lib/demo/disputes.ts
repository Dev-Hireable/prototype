"use client";

import { useEffect, useSyncExternalStore } from "react";
import * as Case from "@/lib/disputes/case";
import type { Attachment, Ctx, Dispute, DisputeFacts, DisputeNotice, DisputeParty, DisputeStatus, Money, Refusal, Say, Step } from "@/lib/disputes/case";
import { dayLabel, momentLabel, parseDay } from "@/lib/portal/dates";
import { contractTypeOf, converted, evaluationsOf, lifecycleOfDeal, readDeal, settleEscrow, startedAsTrial } from "@/lib/demo/deal";
import type { Phase } from "@/lib/contract/lifecycle";
import type { Deal } from "@/lib/demo/deal";
import { JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import type { JobType } from "@/lib/contract/job-types";
import { notify, PAIR, recordLedger } from "@/lib/demo/live";
import { trialTasks } from "@/lib/demo/tasks";
import { isArchived, isCompleted } from "@/lib/work/model";

/**
 * Disputes, held where all three portals can see them — one record per dispute, keyed by the
 * contract, worked as a case (the rules are in @/lib/disputes/case):
 *   - the party who files states their claim, and the other side has five days to respond;
 *   - then Hireable support reviews it, and can ask either side for more (five days again);
 *   - a turn that runs out closes the case for the other side — checked by every open portal
 *     (useDisputeDeadlines), so it happens whoever has the app open;
 *   - the two sides can settle by splitting the amount in question, or support rules;
 *   - while it's open the amount in question stays in escrow, so End Contract waits (TB-071).
 * Every step goes on the case's one timeline and tells the other side.
 */

export type { Attachment, Dispute, DisputeFacts, DisputeParty, DisputeStatus, Entry, Proposal } from "@/lib/disputes/case";
export { checkSplit, isOpen, leftLabel, openProposal, otherParty, outcomeOf, partyCan, partyName, partyTurn, SLA_DAYS, TURN_DAYS, usd, waitingOn } from "@/lib/disputes/case";

export const DISPUTE_STATUSES: DisputeStatus[] = ["Pending", "Resolved", "Rejected", "Withdrawn"];
export const STATUS_TONE: Record<DisputeStatus, "warn" | "ok" | "danger" | "neutral"> = { Pending: "warn", Resolved: "ok", Rejected: "danger", Withdrawn: "neutral" };

/**
 * IN-059 — the four reason codes the sheet allows. The Team Builder's form (TB-073 / TB-118) names
 * none, so it uses the same four — the codes TB-111 already uses for revisions — and Admin filters
 * on one vocabulary instead of three.
 */
export const DISPUTE_REASONS = ["Missing Deliverable", "Out-of-Scope Output", "Missed Deadline", "No Report Submitted"];

/** The Hireable support person the demo's admin signs in as. */
const SUPPORT = "Admin Lead";

/* ------------------------------------------------------------------ store */

const KEY = "hireable.demo.disputes";
const EMPTY: Dispute[] = [];
let snapshot: Dispute[] = EMPTY;
/** The saved string `snapshot` was read from, so an unchanged store isn't parsed again. */
let lastRaw: string | null = null;
let loaded = false;
let listening = false;
const subscribers = new Set<() => void>();
const emit = () => {
  for (const fn of subscribers) fn();
};

/** Disputes saved before cases had turns are read as cases (Case.migrateDispute). */
function parse(raw: string | null): Dispute[] {
  try {
    const all = raw ? (JSON.parse(raw) as Dispute[]) : EMPTY;
    return Array.isArray(all) ? all.map(Case.migrateDispute) : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Read what's saved now; writers call it first so they add to another tab's changes, not over them. */
function refresh() {
  if (typeof window === "undefined") return;
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return;
  }
  if (loaded && raw === lastRaw) return;
  loaded = true;
  lastRaw = raw;
  snapshot = parse(raw);
  if (!listening) {
    listening = true;
    // One listener for the tab: the other portal, in another tab, moved it.
    window.addEventListener("storage", (e) => {
      if (e.key !== null && e.key !== KEY) return;
      refresh();
      emit();
    });
  }
}

const ensureLoaded = () => {
  if (!loaded) refresh();
};

function write(next: Dispute[]) {
  snapshot = next;
  try {
    lastRaw = JSON.stringify(next);
    localStorage.setItem(KEY, lastRaw);
  } catch {
    /* private mode — the demo still works for this tab */
  }
  emit();
}

function subscribe(fn: () => void) {
  ensureLoaded();
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

/**
 * Every dispute, newest first. Loaded on the first read rather than on subscribe, so a detail
 * screen finds its record on the first paint instead of 404ing a frame early.
 */
export function useDisputes(): Dispute[] {
  return useSyncExternalStore(
    subscribe,
    () => {
      ensureLoaded();
      return snapshot;
    },
    () => EMPTY,
  );
}

export function getDisputes(): Dispute[] {
  refresh();
  return snapshot;
}

/**
 * One change at a time across tabs. Every open portal checks deadlines on its own, so two tabs
 * could otherwise close the same case — and move its money — twice. The Web Locks API queues
 * them; the second re-reads, finds it closed and does nothing.
 */
async function exclusive<T>(fn: () => T): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks?.request) return fn();
  return locks.request("hireable.disputes", () => fn());
}

/* ------------------------------------------------------------ contracts */

/** The pair, as a dispute records them. */
const TEAM = { name: PAIR.team.name, company: PAIR.team.company, slug: "nairobi-solutions" };
const IND = { name: PAIR.independent.name, slug: PAIR.independent.slug, avatar: PAIR.independent.avatar };

export type ContractRef = { key: string; links: Dispute["links"]; title: string; type: JobType; rate: string; started: string; ends: string };

/**
 * The live contract — the deal's trial, the full-time or part-time engagement it became, or one the
 * talent was hired straight onto. Both trackers show it, each under its own slug. The key stays the
 * one it started with, so a dispute follows the contract across a conversion instead of detaching.
 */
export function dealContract(deal: Deal | null): ContractRef | null {
  if (!deal?.contract) return null;
  const type = contractTypeOf(deal);
  const conversion = converted(deal) ? deal.conversion : undefined;
  return {
    key: `deal:${deal.roleSlug}:${deal.contract.started}`,
    links: { team: PAIR.independent.slug, independent: deal.roleSlug },
    title: deal.title,
    type,
    rate: deal.contract.rate,
    started: dayLabel(conversion?.start ?? deal.contract.started),
    ends: type === "trial" ? dayLabel(deal.contract.ends) : "Ongoing",
  };
}

/* ---------------------------------------------------------------- money */

const usd = Case.usd;
/** "$1,600" or "$2,000 /month" → the number in it. */
export const rateAmount = (rate: string) => Number(rate.replace(/[^0-9.]/g, "")) || 0;

/**
 * TB-073 / IN-059 — the amount in question has to be a real, positive sum no bigger than what is
 * at stake. It used to take anything: "abc" was filed as $0.00, "..." as "$...".
 */
export function checkAmount(raw: string, cap: number): { value: number | null; error?: string } {
  const s = raw.trim().replace(/[$,\s]/g, "");
  if (!s) return { value: null, error: "Enter the amount in question." };
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return { value: null, error: "Enter an amount in dollars, like 1,600.00." };
  const n = Number(s);
  if (n <= 0) return { value: null, error: "The amount has to be more than $0." };
  if (cap > 0 && n > cap) return { value: null, error: `It can't be more than ${usd(cap)}, the amount at stake on this contract.` };
  return { value: n };
}

/** Open, or closed for the Independent but not paid out yet — either way the money stays put. */
export const holds = (d: Dispute) => d.status === "Pending" || d.resolution?.payment === "awaiting release";

export type Escrow = { total: number; released: number; refunded: number; held: number; onHold: number };

/**
 * The trial's escrow right now: what was deposited when the offer went out, minus what End
 * Contract or a dispute has moved. `onHold` is the part an open dispute is keeping — End Contract
 * can't touch it.
 */
export function escrowOf(deal: Deal | null, all: Dispute[]): Escrow | null {
  const ref = dealContract(deal);
  const c = deal?.contract;
  // A direct full-time or part-time hire never had a trial, so nothing was ever put in escrow.
  if (!ref || !c || !startedAsTrial(deal)) return null;
  const total = c.deposit ?? rateAmount(c.rate);
  // A contract ended before escrow was tracked released everything when it ended.
  const released = c.escrow?.released ?? (c.ended ? total : 0);
  const refunded = c.escrow?.refunded ?? 0;
  const held = Math.max(0, total - released - refunded);
  // Only a dispute about the trial holds its escrow; one about the role holds pay instead (@/lib/demo/contract).
  const onHold = Math.min(held, all.filter((d) => d.contract === ref.key && d.type === "trial" && holds(d)).reduce((n, d) => n + d.amount, 0));
  return { total, released, refunded, held, onHold };
}

/**
 * The escrow a dispute is about — only while the contract is still a trial. Once it converts to
 * full-time or part-time, the trial's escrow is its history, and a dispute is about the pay, the
 * same as on a direct hire (TB-118 / IN-059: filing stays open for as long as the contract runs).
 */
export const escrowInPlay = (deal: Deal | null, all: Dispute[]): Escrow | null => (contractTypeOf(deal) === "trial" ? escrowOf(deal, all) : null);

/**
 * The escrow a filed dispute moves when it's settled or ruled on: the trial's, if it was filed about
 * the trial — even after the contract has converted, since its amount stayed on hold in escrow
 * through the conversion. One filed about the role's pay moves none. (It used to go by what the
 * contract is now, so a trial dispute ruled after a conversion left its amount in escrow for good.)
 */
const escrowOfDispute = (d: Dispute, deal: Deal | null, all: Dispute[]): Escrow | null => (dealContract(deal)?.key === d.contract && d.type === "trial" ? escrowOf(deal, all) : null);

/** One line for the Escrow row on either tracker. */
export function escrowLine(e: Escrow, started: string, names: { releasedTo: string; refundedTo: string }) {
  if (e.held > 0 && e.onHold > 0) return `${usd(e.held)} held since ${started} · ${usd(e.onHold)} on hold for a dispute`;
  if (e.held > 0) return `${usd(e.held)} held since ${started}${e.released + e.refunded > 0 ? ` · ${usd(e.released + e.refunded)} settled` : ""}`;
  const parts = [e.released > 0 && `${usd(e.released)} released to ${names.releasedTo}`, e.refunded > 0 && `${usd(e.refunded)} refunded to ${names.refundedTo}`].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Nothing held";
}

/**
 * A dispute about the live contract's role (not its trial): it holds pay rather than escrow, and the
 * contract's clock settles it from what it held (@/lib/demo/contract).
 */
const onLiveRole = (d: Dispute, deal: Deal | null) => dealContract(deal)?.key === d.contract && d.type !== "trial";

/** Move money out of the trial's escrow (or record it outright on a contract with none), into both ledgers. */
function settle(d: Dispute, m: Money) {
  const deal = readDeal();
  // The role's pay held for it is paid on or refunded by the contract's clock — never recorded twice.
  if (onLiveRole(d, deal)) return;
  // Out of escrow only while there's a trial's escrow in play; otherwise it's pay, recorded outright.
  if (escrowOfDispute(d, deal, snapshot) && (m.refund > 0 || m.release > 0)) settleEscrow({ refunded: m.refund, released: m.release });
  const row = { contract: d.links.independent, title: d.title, company: d.team.company, period: `Dispute · ${d.reason}`, chapter: d.type };
  if (m.refund > 0) recordLedger({ ...row, amount: usd(m.refund), kind: "refunded" });
  if (m.release > 0) recordLedger({ ...row, amount: usd(m.release), kind: "released" });
}

/* ---------------------------------------------------------------- rules */

export type FileBlock = "open" | "filed" | "withdrawn" | "starts" | "trial" | "ended" | "settled";

/** The part of a contract a dispute is about: its trial, or the full-time / part-time role after it. */
export type Chapter = "trial" | "role";
const chapterOf = (d: Pick<Dispute, "type">): Chapter => (d.type === "trial" ? "trial" : "role");

/**
 * Why `party` can't file on this contract right now, if they can't:
 *   open      one is already open on it, from either side — the other party answers it instead
 *             of filing a second;
 *   filed     the independent has filed on this chapter before — one per chapter: the trial and
 *             the role it became each get their own (IN-032 / IN-082);
 *   withdrawn the Team Builder withdrew one on this chapter, and can't refile (TB-093);
 *   starts    its first day hasn't come — the trial's, or the role's after a trial converted:
 *             nothing has happened yet to dispute (TB-118 / IN-059: "an active contract");
 *   trial     the trial is still running — filing opens when it ends (TB-073 / IN-076);
 *   ended     the contract has ended: disputes are filed while it runs, as the alternative to
 *             ending it (TB-071), and ending paid out what was owed;
 *   settled   nothing is left in the trial's escrow to move.
 * `phase` is where the contract is in its lifecycle; without one (a contract the demo only lists)
 * there's no timing to check. `chapter` is what a new one would be about; without one, every
 * dispute on the contract counts. The store runs this same check on file, so no caller can skip it.
 */
export function fileBlock(all: Dispute[], key: string, party: DisputeParty, escrow: Escrow | null, phase?: Phase, chapter?: Chapter): { block: FileBlock | null; dispute?: Dispute } {
  const here = all.filter((d) => d.contract === key);
  // An open one, from either side and about either chapter, is answered rather than filed over.
  const open = here.find(holds);
  if (open) return { block: "open", dispute: open };
  const same = chapter ? here.filter((d) => chapterOf(d) === chapter) : here;
  const own = same.find((d) => d.filedBy === "independent");
  if (party === "independent" && own) return { block: "filed", dispute: own };
  const withdrawn = same.find((d) => d.filedBy === "team" && d.status === "Withdrawn");
  if (party === "team" && withdrawn) return { block: "withdrawn", dispute: withdrawn };
  if (phase === "starts" || phase === "trial" || phase === "ended") return { block: phase };
  if (escrow && escrow.held <= 0) return { block: "settled" };
  return { block: null };
}

/**
 * What the disabled File a Dispute button says, for a block that leaves nothing to open — one line,
 * naming the day it changes where there is one. `starts` is the first day of what's current; `trialEnds`
 * the trial's last day.
 */
export function fileBlockHint(block: FileBlock | null, side: DisputeParty, days: { starts: string; trialEnds: string }): string | undefined {
  switch (block) {
    case "starts":
      return `Filing opens on ${days.starts}, the contract's first day`;
    case "trial":
      return `Available once the trial ends on ${days.trialEnds}`;
    case "ended":
      return "This contract has ended, so it can't be disputed any more";
    case "withdrawn":
      return side === "team" ? "You withdrew a dispute on this part of the contract, so it can't be disputed again" : undefined;
    case "filed":
      return side === "independent" ? "You've filed a dispute on this part of the contract. One can be filed per chapter" : undefined;
    case "open":
      return "A dispute is already open on this contract";
    case "settled":
      return "The trial's escrow has been paid out, so there's nothing left in it to dispute";
    default:
      return undefined;
  }
}

/** The live contract's phase, for fileBlock — undefined for any other contract. */
function phaseOf(deal: Deal | null, key: string): Phase | undefined {
  return dealContract(deal)?.key === key ? lifecycleOfDeal(deal)?.phase : undefined;
}

/** The chapter a new dispute on the live contract would be about: the trial while it is one, then the role. */
export const liveChapter = (deal: Deal | null): Chapter => (contractTypeOf(deal) === "trial" ? "trial" : "role");

/**
 * The most a dispute can be for: what the trial's escrow still holds, or on a role a month's pay —
 * the most one payday can keep back.
 */
export function disputeCap(deal: Deal | null, all: Dispute[], rate: string): { cap: number; note: string } {
  const inPlay = escrowInPlay(deal, all);
  if (inPlay) return { cap: inPlay.held, note: "what is still held in escrow" };
  const monthly = rateAmount(deal?.conversion?.status === "accepted" ? deal.conversion.salary : rate);
  return { cap: monthly, note: `a month's pay, ${usd(monthly)}, kept back from the next payday until it closes` };
}

/** Admin's process check, from the live contract where there is one, else as it was when filed. */
export function factsFor(ref: ContractRef, deal: Deal | null, all: Dispute[]): DisputeFacts {
  const c = dealContract(deal)?.key === ref.key ? deal?.contract : undefined;
  const ends = parseDay(ref.ends);
  /** The same rule the evaluation opens on: the end date came, or every trial task was Done first. */
  const scored = c ? trialTasks(c.tasks) : [];
  const allDone = scored.length > 0 && scored.every((t) => isCompleted(t.status));
  /** The Independent's own work on the contract — what support checks the process against. */
  const theirs = c ? c.tasks.filter((t) => !isArchived(t) && t.assignee === "independent") : [];
  return {
    started: ref.started,
    ends: ref.ends,
    trialEnded: ref.type === "trial" ? (!!ends && ends.getTime() <= Date.now()) || !!c?.ended || allDone : false,
    evaluation: evaluationsOf(c).length > 0,
    tasksDone: theirs.filter((t) => isCompleted(t.status)).length,
    tasksTotal: theirs.length,
    escrowHeld: escrowOf(deal, all)?.held ?? 0,
    escrowFunded: escrowOf(deal, all)?.total,
  };
}

/* -------------------------------------------------------------- display */

/** "23 Sep 2026" and "23 Sep 2026, 3:04 PM" — the demo's format, not en-GB's "Sept". */
export const dateOf = (ms: number) => dayLabel(new Date(ms));
export const stampOf = (ms: number) => momentLabel(new Date(ms));
export const daysOpen = (d: Dispute, now = Date.now()) => Math.max(0, Math.floor(((d.status === "Pending" ? now : (d.resolution?.at ?? d.updated)) - d.at) / 86400000));
export const ageOf = (d: Dispute) => {
  const n = daysOpen(d);
  return n === 0 ? "Today" : n === 1 ? "1 day" : `${n} days`;
};

export const contractName = (d: Dispute) => `${d.title} — ${JOB_TYPE_LABEL[d.type].toLowerCase()}`;

export const unseenByAdmin = (all: Dispute[]) => all.filter((d) => (d.adminSeen ?? 0) < d.updated);

/** Where each side opens a case — what every notification about it links to. */
export const caseHref = (side: DisputeParty, id: string) => (side === "team" ? `/team/payments/disputes/${id}` : `/independent/wallet/disputes/${id}`);

/* -------------------------------------------------------------- actions */

export type Done = { ok: true; dispute: Dispute } | Refusal;

function tell(d: Dispute, n: DisputeNotice) {
  const avatar = n.from === "support" || n.from === "system" ? "/admin/avatar.jpg" : n.from === "team" ? PAIR.team.avatar : d.independent.avatar;
  notify(n.to, { title: n.title, body: n.body, href: caseHref(n.to, d.id), avatar });
}

/** The escrow a step may move, and how its notices say a moment. */
function ctxFor(d: Dispute, handler?: string): Ctx {
  const deal = readDeal();
  const held = escrowOfDispute(d, deal, snapshot)?.held;
  return { now: Date.now(), when: stampOf, handler, held };
}

/** Apply one step to one case: re-read, check, move the money, save, then tell whoever it concerns. */
function act(id: string, step: (d: Dispute, ctx: Ctx) => Step | Refusal | null, handler?: string): Promise<Done> {
  return exclusive((): Done => {
    refresh();
    const d = snapshot.find((x) => x.id === id);
    if (!d) return { ok: false, error: "That dispute doesn't exist any more." };
    const out = step(d, ctxFor(d, handler));
    if (!out) return { ok: false, error: "Nothing to do." };
    if (!out.ok) return out;
    if (out.money) settle(d, out.money);
    // What support does is, by definition, seen by support.
    const next = handler ? { ...out.next, adminSeen: out.next.updated } : out.next;
    write(snapshot.map((x) => (x.id === id ? next : x)));
    for (const n of out.notices) tell(next, n);
    // Closed about the role: the contract's clock pays on, or refunds, the pay it held.
    if (onLiveRole(next, readDeal()) && !holds(next)) void import("@/lib/demo/contract").then((m) => m.sweepContract());
    return { ok: true, dispute: next };
  });
}

/**
 * TB-073 / TB-118 / IN-059 — file a dispute. It opens as a case with the other side's turn to
 * respond, and they're told. Resolves to null when fileBlock says no.
 */
export function fileDispute(input: { ref: ContractRef; filedBy: DisputeParty; reason: string; description: string; amount: number; evidence?: string; attachments?: Attachment[] }): Promise<Done> {
  return exclusive((): Done => {
    refresh();
    const deal = readDeal();
    // The same check the button runs — the escrow in play (not a converted contract's paid-out trial
    // escrow, which used to refuse every filing on it), where the contract is in its lifecycle, and
    // the chapter it would be about.
    const live = dealContract(deal)?.key === input.ref.key;
    const { block } = fileBlock(snapshot, input.ref.key, input.filedBy, live ? escrowInPlay(deal, snapshot) : null, phaseOf(deal, input.ref.key), live ? liveChapter(deal) : undefined);
    if (block) return { ok: false, error: fileBlockHint(block, input.filedBy, { starts: "its first day", trialEnds: "its last day" }) ?? "This contract can't be disputed right now." };
    // The amount is checked here too, not only in the form: a real sum, no more than is at stake.
    const cap = live ? disputeCap(deal, snapshot, input.ref.rate).cap : 0;
    if (!(input.amount > 0) || (cap > 0 && input.amount > cap)) return { ok: false, error: `The amount has to be more than $0 and no more than ${usd(cap)}.` };
    const now = Date.now();
    const out = Case.openCase(
      {
        id: `dsp-${now.toString(36)}`,
        contract: input.ref.key,
        links: input.ref.links,
        title: input.ref.title,
        type: input.ref.type,
        rate: input.ref.rate,
        team: TEAM,
        independent: IND,
        filedBy: input.filedBy,
        reason: input.reason,
        description: input.description,
        amount: input.amount,
        evidence: input.evidence,
        attachments: input.attachments,
        facts: factsFor(input.ref, deal, snapshot),
      },
      { now, when: stampOf },
    );
    write([out.next, ...snapshot]);
    for (const n of out.notices) tell(out.next, n);
    return { ok: true, dispute: out.next };
  });
}

/** It's their turn: the answer hands the case to Hireable support. */
export const respondToDispute = (id: string, party: DisputeParty, say: Say) => act(id, (d, c) => Case.respond(d, party, say, c));
/** Not their turn, but something support should see. */
export const addToDispute = (id: string, party: DisputeParty, say: Say) => act(id, (d, c) => Case.addInfo(d, party, say, c));
export const proposeSettlement = (id: string, party: DisputeParty, split: { refund: number; release: number; note?: string }) => act(id, (d, c) => Case.propose(d, party, split, c));
export const answerSettlement = (id: string, party: DisputeParty, accept: boolean) => act(id, (d, c) => Case.answer(d, party, accept, c));
/** TB-093 / IN-082 — only the filer, only while it's open. */
export const withdrawDispute = (id: string, party: DisputeParty) => act(id, (d, c) => Case.withdraw(d, party, c));

/** AD-033 — support puts a question to one side, who has five days to answer. */
export const askParty = (id: string, party: DisputeParty, note: string) => act(id, (d, c) => Case.ask(d, party, note, c), SUPPORT);
export const extendDeadline = (id: string, days: number) => act(id, (d, c) => Case.extend(d, days, c), SUPPORT);
/** AD-034 — a ruling for one side; a refund moves at once, a release waits on AD-035. */
export const resolveDispute = (id: string, favor: DisputeParty, notes: string) => act(id, (d, c) => Case.rule(d, favor, notes, c), SUPPORT);
export const rejectDispute = (id: string, notes: string) => act(id, (d, c) => Case.reject(d, notes, c), SUPPORT);
/** AD-035 — pay out a case closed for the Independent. */
export const releasePayment = (id: string) => act(id, (d, c) => Case.release(d, c), SUPPORT);

/**
 * Close every case whose turn ran out, and remind anyone with a day left. There's no server to
 * run it on a schedule, so every open portal does (useDisputeDeadlines) — the lock and the
 * re-read in `act` make sure each case closes once, whichever tab gets there first.
 */
async function sweepDeadlines() {
  refresh();
  const now = Date.now();
  const due = snapshot.filter((d) => {
    const t = Case.partyTurn(d);
    return !!t && (now >= t.due || (!t.reminded && t.due - now <= Case.REMIND_BEFORE));
  });
  // One at a time on purpose: each takes the lock and re-reads what the one before it saved.
  // react-doctor-disable-next-line react-doctor/async-await-in-loop
  for (const d of due) await act(d.id, (x, c) => Case.expire(x, c) ?? Case.remind(x, c));
}

/** Keeps the deadlines honest while a portal is open: on load, every minute, and on coming back to the tab. */
export function useDisputeDeadlines() {
  useEffect(() => {
    const run = () => void sweepDeadlines();
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

/** Opening a dispute in Admin clears its "new activity" badge. */
export function markAdminSeen(id: string) {
  refresh();
  const d = snapshot.find((x) => x.id === id);
  if (!d || (d.adminSeen ?? 0) >= d.updated) return;
  write(snapshot.map((x) => (x.id === id ? { ...x, adminSeen: x.updated } : x)));
}
