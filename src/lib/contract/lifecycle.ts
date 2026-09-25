import { dayLabel, parseDay, trialClock } from "../demo/dates";
import type { JobType, OngoingType } from "../demo/job-types";

/**
 * A contract's lifecycle — one record that moves through phases, read the same way by every tab on
 * both sides (the Work tab's access, the Overview's callouts, Contract & Payment's terms and money,
 * the Evaluation tab), the header's status and the dashboards:
 *
 *   starts      signed, but its first day is still to come — the trial's, or the full-time or
 *               part-time role's after a trial converted ("Starts 28 Sep")
 *   trial       the trial is running
 *   evaluation  the trial is over (its last day came, or every trial task was approved first); the
 *               Team Builder's evaluation is due within EVALUATION_DAYS of the last day
 *   decision    evaluated: the Team Builder hires full-time or part-time, or closes it. A declined
 *               or withdrawn offer comes back here, so a new one can still be sent
 *   offer       a post-trial offer is out, waiting on the talent
 *   ongoing     full-time or part-time: converted from the trial, or hired directly
 *   ended       ended by the Team Builder — final: nothing reopens it
 *
 * A direct hire goes starts → ongoing → ended, with no trial chapter anywhere.
 */
export type Phase = "starts" | "trial" | "evaluation" | "decision" | "offer" | "ongoing" | "ended";

/** Days the Team Builder has after the trial's last day to send the evaluation. */
export const EVALUATION_DAYS = 5;

/** What the lifecycle is worked out from — the deal's facts, adapted by `factsOf` in @/lib/demo/deal. */
export type ContractFacts = {
  /** How it began: a trial, or straight into a full-time or part-time role. */
  startedAs: JobType;
  /** First day, and a trial's last day. */
  started: string;
  ends?: string;
  ended?: boolean;
  endedOn?: string;
  /** The trial's evaluation has been sent. */
  evaluated: boolean;
  /** Every trial task was approved: the trial closes early. */
  trialDone: boolean;
  /** The post-trial offer, if one was made (TB-072). */
  conversion?: { type: OngoingType; status: "sent" | "accepted" | "declined" | "withdrawn"; start: string };
};

export type TrialChapter = {
  started: string;
  ends: string;
  over: boolean;
  /** Closed before its last day, every trial task approved. */
  closedEarly: boolean;
  /** "Day 4 of 30", or how it closed. */
  day: string;
  /** Working days left while it runs. */
  left: number;
  /** When the evaluation is due, and whether that has passed without one. */
  evaluationDue: Date;
  evaluationOverdue: boolean;
};

export type Lifecycle = {
  phase: Phase;
  /** What it is now: the trial, or the full-time / part-time role it became or began as. */
  type: JobType;
  startedAsTrial: boolean;
  /** The trial became a full-time or part-time role. */
  converted: boolean;
  /** The first day of what's current — the trial, or the role after it. */
  since: string;
  /** The trial chapter, when there was one — kept after it converts, as the contract's history. */
  trial?: TrialChapter;
  /** The role on offer, while phase is "offer". */
  offered?: OngoingType;
  endedOn?: string;
};

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** A day still to come. */
const later = (day: string, now: Date) => {
  const d = parseDay(day);
  return !!d && d > startOfDay(now);
};

function trialChapter(f: ContractFacts, now: Date): TrialChapter {
  const ends = f.ends ?? f.started;
  const clock = trialClock(f.started, ends, now);
  const over = clock.over || f.trialDone || !!f.ended;
  const last = parseDay(ends) ?? startOfDay(now);
  const evaluationDue = new Date(last);
  evaluationDue.setDate(evaluationDue.getDate() + EVALUATION_DAYS);
  const closedEarly = over && !clock.over && !f.ended;
  return {
    started: f.started,
    ends,
    over,
    closedEarly,
    day: clock.over ? `Ended ${dayLabel(ends)}` : closedEarly ? "Closed early" : f.ended ? "Ended early" : clock.label,
    left: over ? 0 : clock.left,
    evaluationDue,
    evaluationOverdue: over && !f.evaluated && startOfDay(now) > evaluationDue,
  };
}

export function lifecycleOf(f: ContractFacts, now = new Date()): Lifecycle {
  const startedAsTrial = f.startedAs === "trial";
  const converted = startedAsTrial && f.conversion?.status === "accepted";
  const type: JobType = converted && f.conversion ? f.conversion.type : f.startedAs;
  const since = converted && f.conversion ? f.conversion.start : f.started;
  const base = { type, startedAsTrial, converted, since, trial: startedAsTrial ? trialChapter(f, now) : undefined };
  if (f.ended) return { ...base, phase: "ended", endedOn: f.endedOn };
  if (later(since, now)) return { ...base, phase: "starts" };
  if (!startedAsTrial || converted) return { ...base, phase: "ongoing" };
  if (!base.trial?.over) return { ...base, phase: "trial" };
  if (!f.evaluated) return { ...base, phase: "evaluation" };
  if (f.conversion?.status === "sent") return { ...base, phase: "offer", offered: f.conversion.type };
  return { ...base, phase: "decision" };
}

/** The trial is over and hasn't turned into anything yet: its work is closed while it's decided. */
export const trialClosed = (l: Lifecycle) => l.phase === "evaluation" || l.phase === "decision" || l.phase === "offer";

/* ------------------------------------------------------------------ pay */

/** One pay period on a full-time or part-time contract: a month, or the part of one it began or ended in. */
export type PayPeriod = { from: Date; to: Date; amount: number };

const monthEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const nextDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
const cents = (n: number) => Math.round(n * 100) / 100;
const daysFrom = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;

/**
 * IN-051 — the pay due from `from` through `until`, at `monthly` a month. Each month is paid on its
 * last day, pro rata by calendar day for a month the contract began part-way through; `closing`
 * pays the part-month it ends in too.
 */
export function payPeriods(from: Date, until: Date, monthly: number, closing = false): PayPeriod[] {
  const out: PayPeriod[] = [];
  const last = startOfDay(until);
  let start = startOfDay(from);
  while (start <= last) {
    const end = monthEnd(start);
    const to = end <= last ? end : closing ? last : null;
    if (!to) break;
    out.push({ from: start, to, amount: cents((monthly * daysFrom(start, to)) / end.getDate()) });
    start = nextDay(to);
  }
  return out;
}

/** The next payday after everything paid through `paidThrough`, and what it pays. */
export function nextPay(since: Date, paidThrough: Date | undefined, monthly: number): PayPeriod {
  const from = paidThrough ? nextDay(paidThrough) : startOfDay(since);
  const to = monthEnd(from);
  return { from, to, amount: cents((monthly * daysFrom(from, to)) / to.getDate()) };
}

export type StatusTone = "ok" | "warn" | "danger" | "info" | "neutral";

const TYPE: Record<OngoingType, string> = { "full-time": "Full-time", "part-time": "Part-time" };

/** The status each side reads in the header, the lists and the cards. */
export function statusOf(l: Lifecycle, side: "team" | "independent"): { label: string; tone: StatusTone } {
  switch (l.phase) {
    case "starts":
      return { label: `Starts ${dayLabel(l.since)}`, tone: "info" };
    case "trial":
      return { label: "On track", tone: "ok" };
    case "evaluation":
      if (side === "independent") return { label: "Awaiting evaluation", tone: "neutral" };
      return l.trial?.evaluationOverdue ? { label: "Evaluation overdue", tone: "danger" } : { label: "Evaluation due", tone: "warn" };
    case "decision":
      return side === "team" ? { label: "Evaluation sent", tone: "ok" } : { label: "Evaluation received", tone: "ok" };
    case "offer":
      return side === "team" ? { label: `${TYPE[l.offered ?? "full-time"]} offer sent`, tone: "info" } : { label: `${TYPE[l.offered ?? "full-time"]} offer to review`, tone: "info" };
    case "ongoing":
      return { label: "Active", tone: "ok" };
    case "ended":
      return { label: "Ended", tone: "neutral" };
  }
}
