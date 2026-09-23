"use client";

import { useSyncExternalStore } from "react";
import type { Stage } from "@/components/independent/ui";
import { TFP_WEIGHTS } from "@/lib/team/data";
import { isoDay, isWeekday, parseDay, today, trialClock } from "@/lib/demo/dates";

export { today } from "@/lib/demo/dates";

/**
 * The one engagement the demo is about, held where both portals can see it.
 *
 * The prototype has exactly one Team Builder and one Independent, and the thing they are doing
 * together — an application that becomes an interview, an offer, then a trial — was previously two
 * unconnected copies: the client had `candidates`, the talent had `applications`, and neither
 * moved when the other side acted. Starting from an empty demo that breaks immediately: the talent
 * applies and the client's tracker stays empty.
 *
 * So the deal lives here. Each store still exposes its own shape (Candidate, Application,
 * Contract) — it derives them from this one record, and writes back through these actions.
 * ponytail: a single deal, not a table. One pair, one engagement at a time: `startDeal` refuses
 * while one exists instead of overwriting it; widen it to a list when a second pair exists.
 */

export type ObjectiveKind = "kpi" | "okr" | "task";

/** An Automatic objective's own key results — its progress is the share of them done. */
export type DealKeyResult = { id: string; title: string; done?: boolean };

/** `description` — what good looks like, as the Team Builder wrote it when assigning the objective. */
export type DealObjective = { id: string; title: string; description?: string; kind: ObjectiveKind; target?: number; unit?: string; dailyTarget?: number; keyResults?: DealKeyResult[] };

/** An objective as the talent proposed it: its type, plus a target (Manual) or key results (Automatic). */
export type ProposedObjective = { title: string; kind: ObjectiveKind; target?: number; unit?: string; keyResults?: string[] };

/**
 * IN-072 / IN-073 — the proposal exactly as the talent submitted it. The Team Builder reviews
 * this record and the offer is built from it, so the rate and objectives signed are the ones
 * proposed. `version` counts resubmissions after a revision request.
 */
export type DealProposal = { version: number; sent: string; rate: string; letter: string; portfolio?: string; objectives: ProposedObjective[] };

/** TB-067 / IN-034 — one submitted evaluation, criteria scores included, so the talent reads the real one. */
export type DealEvaluation = { stars: number; scores?: { label: string; value: number }[]; feedback: string; recommendation: string; date: string; tfp?: number };

/** IN-041 / TB-112 — what happened on an objective, and what either side said about it. */
export type ObjectiveEvent = { at: string; text: string };
export type ObjectiveComment = { side: "team" | "independent"; name: string; at: string; text: string };

export type ContractObjective = DealObjective & {
  progress: number;
  status: "on" | "pending" | "complete" | "risk" | "revision";
  meta: string;
  current?: number;
  updated?: string;
  retired?: boolean;
  /** Progress % after each update, oldest first — the trend chart. */
  trend?: number[];
  /** Newest first. */
  activity?: ObjectiveEvent[];
  /** The latest submission, as the Team Builder reviews it. */
  lastUpdate?: { date: string; text: string; value?: number; done?: boolean };
  comments?: ObjectiveComment[];
};

export type InterviewOutcome = "done" | "declined" | "cancelled";

export type OfferStatus = "sent" | "accepted" | "declined" | "withdrawn";

/** TB-072 — the full-time offer that follows a trial; it rides on the same engagement. */
export type FullTimeOffer = { salary: string; start: string; benefits: string[]; status: OfferStatus; sent: string; accepted?: string; declineReason?: string };

export type Deal = {
  roleSlug: string;
  title: string;
  company: string;
  match: number;
  /** Where the pipeline has got to — the same vocabulary both portals already use. */
  stage: Stage;
  /** When it started: the application (IN-017), or the interview invitation when the Team Builder
   *  started it (`invited`) — someone matched or invited from Discover who never applied. */
  submitted: string;
  invited?: boolean;
  dropped?: boolean;
  /** IN-017 — the note sent with the application, and whether the quiz results went with it. */
  note?: string;
  quiz?: boolean;
  /** TB-037 / IN-070 — set when the Team Builder books one; `accepted` once the talent confirms. */
  /**
   * `outcome` — how it ended, once it has: the Team Builder marked it held (IN-018 Interview
   * completed, which is what unlocks Request Proposal), the talent declined it (IN-071), or the
   * Team Builder cancelled it. `past` takes it off both upcoming lists. A new invitation replaces
   * the whole record, so a declined or cancelled slot can be offered again.
   */
  interview?: { when: string; format: string; link?: string; note?: string; accepted?: boolean; past?: boolean; outcome?: InterviewOutcome };
  /** TB-103 — the request, and the note the Team Builder sent with it. */
  proposalRequest?: { note?: string; date: string };
  /** IN-072 — what the talent proposed; absent until they submit. */
  proposal?: DealProposal;
  /** TB-106 — the Team Builder's requested changes; cleared when the talent resubmits. */
  revision?: { note: string; date: string };
  /** TB-107 — declined, with the reason the talent is shown; cleared if they are undropped. */
  proposalDeclined?: { reason?: string; date: string };
  /**
   * TB-105 / IN-074 — the terms the trial starts on. `deposit` is what the Team Builder funded when
   * sending it: the escrow (rate × trial months) and the platform fee on top. `updated` is set when
   * a sent offer is edited, so the talent is told the terms changed.
   */
  offer?: { rate: string; start: string; end: string; objectives: DealObjective[]; status: OfferStatus; sent: string; deposit?: { escrow: number; fee: number }; updated?: string; declineReason?: string };
  /** Created when the offer is accepted: from then on both trackers read this. */
  contract?: {
    started: string;
    ends: string;
    rate: string;
    /** The escrow funded for the trial. Contracts made before it was recorded fall back to the rate. */
    deposit?: number;
    /** Progress on each objective, shared so an update on one side is a review on the other. */
    objectives: ContractObjective[];
    /** Legacy tiles; the heatmap and streak are now worked out from `logs` (see `activityOf`). */
    activity: number[];
    streak: number;
    /** TB-058 — which objectives the talent logged on each day, keyed yyyy-mm-dd. */
    logs?: Record<string, string[]>;
    /** TB-067 / TB-117 — every evaluation sent, newest first. `evaluation` is the pre-list record. */
    evaluations?: DealEvaluation[];
    evaluation?: { stars: number; feedback: string; recommendation: string; date: string };
    ended?: boolean;
    /** The day the Team Builder ended it; lists read "Ended" with this, not the scheduled end date. */
    endedOn?: string;
    /**
     * What has left escrow so far. The deposit is held from acceptance; End Contract (TB-071)
     * releases what is still held, and a dispute ruling (AD-034 / AD-035) can release or refund
     * part of it first. Absent means nothing has moved yet.
     */
    escrow?: { released: number; refunded: number };
  };
  /** TB-072 / IN-046 — the full-time offer after the trial, and the talent's answer to it. */
  fullTime?: FullTimeOffer;
};

/**
 * A role the Team Builder has published. It lives here rather than in their own store because the
 * talent's job board is the other half of it: with nothing seeded, a posting is the only way a
 * role exists at all.
 */
export type Posting = {
  slug: string;
  title: string;
  type: "trial" | "full-time";
  company: string;
  companyBlurb: string;
  location: string;
  industry: string;
  size: string;
  /** The company's site, for the job page's Visit website. */
  website?: string;
  rate: string;
  rateRange: string;
  level: string;
  description: string[];
  skills: string[];
  objectives: string[];
  expectation: string;
  /** Optional so postings saved before these fields existed still load. */
  attachment?: string;
  duration?: string;
  /** Seats to fill ("How many to hire"); missing means one. */
  hires?: number;
  /**
   * Set when the last seat is hired. The posting stays on file so the hired talent's application
   * still has its job details, but it leaves the board and can't be applied to.
   */
  filled?: boolean;
  /**
   * Closed, archived or deleted by the Team Builder. Kept on file for the same reason as `filled`:
   * deleting it left anyone already in the pipeline with an application that had no job behind it.
   */
  closed?: boolean;
  posted: string;
  closes: string;
};

/**
 * TB-018 — at or above this, an application is a match: the Team Builder's tracker files it
 * under Matched rather than Candidates, on both sides and for records made before the rule.
 */
export const MATCH_THRESHOLD = 80;

/** The stage to show for a deal — a strong enough application reads as a match. */
export const stageOf = (deal: Deal): Stage => (deal.stage === "applied" && deal.match >= MATCH_THRESHOLD ? "matched" : deal.stage);

/** The stages from which there is a thread: an interview is on the table. */
const CHATTABLE: Stage[] = ["invited", "invite_accepted", "interviewed", "proposal_requested", "proposal_sent", "offer_received", "offer_accepted", "hired"];

/**
 * IN-006 — the talent can only message a company once it has invited them to interview. Before
 * that there is no thread to open, on either side.
 */
export const canMessage = (deal: Deal | null) => !!deal && stageCanMessage(stageOf(deal));

/** The same rule for any tracker card: no thread while they're only a candidate or a match. */
export const stageCanMessage = (stage: Stage) => CHATTABLE.includes(stage);

/** Accepted a full-time offer: the contract is full-time from then on, on both sides. */
export const isFullTime = (deal: Deal | null) => deal?.fullTime?.status === "accepted";

/** An open offer the talent can still answer. */
export const offerOpen = (deal: Deal | null) => deal?.offer?.status === "sent";

type State = { deal: Deal | null; postings: Posting[] };

const KEY = "hireable.demo.deal";
const EMPTY: State = { deal: null, postings: [] };

let snapshot: State = EMPTY;
let loaded = false;
const subscribers = new Set<() => void>();
const emit = () => {
  for (const fn of subscribers) fn();
};

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<State>) : null;
    snapshot = saved ? { deal: saved.deal ?? null, postings: saved.postings ?? [] } : EMPTY;
  } catch {
    snapshot = EMPTY;
  }
}

function write(next: State) {
  snapshot = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode — the demo still works for this tab */
  }
  emit();
}

function subscribe(fn: () => void) {
  if (!loaded) {
    ensureLoaded();
    emit();
  }
  subscribers.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    try {
      const saved = e.newValue ? (JSON.parse(e.newValue) as Partial<State>) : null;
      snapshot = saved ? { deal: saved.deal ?? null, postings: saved.postings ?? [] } : EMPTY;
    } catch {
      snapshot = EMPTY;
    }
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    subscribers.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

/** The deal as both portals see it — re-renders on either side's move, across tabs. */
export function useDeal(): Deal | null {
  return useSyncExternalStore(
    subscribe,
    () => snapshot.deal,
    () => null,
  );
}

export function getDeal(): Deal | null {
  ensureLoaded();
  return snapshot.deal;
}

/** Every role ever published, newest first — the job board shows the ones still open. */
export function usePostings(): Posting[] {
  return useSyncExternalStore(
    subscribe,
    () => snapshot.postings,
    () => EMPTY.postings,
  );
}

/** A posting still taking applications. */
export const isOpen = (p: Posting) => !p.filled && !p.closed;

/** TB-026 — publishing (or reopening) puts the role in front of the talent. */
export function publishPosting(posting: Posting) {
  ensureLoaded();
  write({ ...snapshot, postings: [posting, ...snapshot.postings.filter((p) => p.slug !== posting.slug)] });
}

/**
 * A hire takes one seat. With one live pair in the demo, a single-seat posting is full after one
 * hire; a multi-seat one stays open for the rest.
 */
export function fillPosting(slug: string) {
  ensureLoaded();
  const posting = snapshot.postings.find((p) => p.slug === slug);
  if (!posting || (posting.hires ?? 1) > 1) return;
  write({ ...snapshot, postings: snapshot.postings.map((p) => (p.slug === slug ? { ...p, filled: true } : p)) });
}

/** A role that is closed, archived or deleted comes off the board — but stays on file. */
export function closePosting(slug: string) {
  ensureLoaded();
  if (!snapshot.postings.some((p) => p.slug === slug)) return;
  write({ ...snapshot, postings: snapshot.postings.map((p) => (p.slug === slug ? { ...p, closed: true } : p)) });
}

/**
 * IN-017 — applying is what starts the deal; there is nothing before it. Refused (false) while an
 * engagement already exists: there is one deal slot, and a second application used to overwrite
 * the first — contract, escrow record and evaluation included.
 */
export function startDeal(deal: Omit<Deal, "stage" | "submitted"> & Partial<Pick<Deal, "stage" | "submitted">>) {
  ensureLoaded();
  if (snapshot.deal) return false;
  write({ ...snapshot, deal: { stage: "applied", submitted: today(), ...deal } });
  return true;
}

export function updateDeal(patch: (deal: Deal) => Deal) {
  ensureLoaded();
  if (!snapshot.deal) return;
  write({ ...snapshot, deal: patch(snapshot.deal) });
}

/** Money leaving the trial's escrow — released to the talent or refunded to the Team Builder. */
export function settleEscrow(delta: { released?: number; refunded?: number }) {
  updateDeal((d) => {
    if (!d.contract) return d;
    const was = d.contract.escrow ?? { released: 0, refunded: 0 };
    return { ...d, contract: { ...d.contract, escrow: { released: was.released + (delta.released ?? 0), refunded: was.refunded + (delta.refunded ?? 0) } } };
  });
}

export function clearDeal() {
  ensureLoaded();
  write({ ...snapshot, deal: null });
}

/**
 * True once the browser has taken over. Everything in this demo lives in localStorage, so the
 * server and the first client render see nothing: a page that looks a record up would 404 on a
 * refresh before the store had loaded. Screens gate on this instead of guessing.
 */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/* ------------------------------------------------------------ objectives */

/** The share of an Automatic objective's key results that are done. */
export const keyResultPercent = (krs: DealKeyResult[] | undefined) => (krs?.length ? Math.round((krs.filter((k) => k.done).length / krs.length) * 100) : 0);

/** Pending, Achieved and the rest, as the talent logs and the Team Builder rules. */
export const objectiveFrom = (o: DealObjective): ContractObjective => ({
  ...o,
  keyResults: o.keyResults?.map((k) => ({ ...k, done: false })),
  progress: 0,
  status: "on",
  meta: "No update yet",
});

/**
 * TB-058 — the activity heatmap and streak, worked out from what was logged: one tile per weekday
 * since the start (2 when every objective still open was logged that day, 1 for some, 0 for
 * none), and the streak is the run of logged weekdays up to today — today not logged yet doesn't
 * break it. Nothing wrote these before, so every trial read "No streak · Unresponsive" throughout.
 */
export function activityOf(contract: NonNullable<Deal["contract"]>, now = new Date()): { activity: number[]; streak: number } {
  const from = parseDay(contract.started);
  if (!from) return { activity: contract.activity ?? [], streak: contract.streak ?? 0 };
  const logs = contract.logs ?? {};
  const open = Math.max(1, contract.objectives.filter((o) => o.status !== "complete").length);
  const days: number[] = [];
  const d = new Date(from);
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  while (d <= end) {
    if (isWeekday(d)) {
      const logged = new Set(logs[isoDay(d)] ?? []).size;
      days.push(logged === 0 ? 0 : logged >= open ? 2 : 1);
    }
    d.setDate(d.getDate() + 1);
  }
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i] > 0) streak++;
    else if (i < days.length - 1) break;
  }
  return { activity: days, streak };
}

/** Today's log gains this objective — any submission keeps the streak alive. */
export const withLog = (logs: Record<string, string[]> | undefined, objectiveId: string) => {
  const key = isoDay();
  const day = logs?.[key] ?? [];
  return { ...logs, [key]: day.includes(objectiveId) ? day : [...day, objectiveId] };
};

/** Every evaluation on the contract, newest first, including one saved before the list existed. */
export const evaluationsOf = (contract: Deal["contract"]): DealEvaluation[] => contract?.evaluations ?? (contract?.evaluation ? [contract.evaluation] : []);

/**
 * Where a live trial stands. It closes on its end date, or sooner once every objective is approved
 * (the rule the evaluation, disputes and Admin's process check all open on) or the Team Builder
 * ends it. A closed trial stops counting down: an early close used to read "Day 1 of 30 · 30 days
 * left" right under "The trial has ended".
 */
export function trialStateOf(contract: NonNullable<Deal["contract"]>, now = new Date()) {
  const clock = trialClock(contract.started, contract.ends, now);
  const allApproved = contract.objectives.length > 0 && contract.objectives.every((o) => o.status === "complete");
  const over = clock.over || allApproved || !!contract.ended;
  const day = clock.over ? clock.label : contract.ended ? "Ended early" : allApproved ? "Closed early" : clock.label;
  return { over, left: over ? 0 : clock.left, day, total: clock.total };
}

/**
 * TB-058 / IN-076 — the Trial Fit Score, worked out rather than left at a hard 0%: Performance is
 * the share of objectives approved, Profile and Work Style come from the match the application
 * started on, and once an evaluation is in (phase 4) its stars fold in at the post-trial weights.
 */
export function fitScoreOf(deal: Deal): { overall: number; performance: number; profile: number; workStyle: number; evaluation?: number; phase: 3 | 4 } {
  const c = deal.contract;
  // Scored on the objectives agreed at the offer: ones assigned after a trial converts to full-time
  // used to drag down the "final, read-only" score the moment they were created.
  const agreed = new Set(deal.offer?.objectives.map((o) => o.id));
  const trial = c?.objectives.filter((o) => agreed.size === 0 || agreed.has(o.id)) ?? [];
  const performance = trial.length ? Math.round((trial.filter((o) => o.status === "complete").length / trial.length) * 100) : 0;
  const profile = deal.match;
  const workStyle = deal.match;
  const latest = evaluationsOf(c)[0];
  const phase = latest ? 4 : 3;
  const w = TFP_WEIGHTS[phase];
  const evaluation = latest ? Math.round((latest.stars / 5) * 100) : 0;
  const overall = Math.round((performance * w.performance + profile * w.profile + workStyle * w.workStyle + evaluation * w.evaluation) / 100);
  return { overall, performance, profile, workStyle, evaluation: latest ? evaluation : undefined, phase };
}
