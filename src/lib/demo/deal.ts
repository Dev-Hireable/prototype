"use client";

import type { SuggestionDecision, TaskSuggestion } from "@/lib/demo/suggestions";
import { useSyncExternalStore } from "react";
import type { Stage } from "@/components/independent/ui";
import { TFP_WEIGHTS } from "@/lib/team/data";
import { dayLabel, isoDay, isWeekday, parseDay, today, trialClock } from "@/lib/demo/dates";
import type { JobType, OngoingType } from "@/lib/demo/job-types";
import { lifecycleOf, type ContractFacts, type Lifecycle, type Notice } from "@/lib/contract/lifecycle";
import { dayLevel, trialTasks } from "@/lib/demo/tasks";
import type { OfferTask, PlannedTask, Task, TaskComment } from "@/lib/demo/tasks";
import type { ChatSource } from "@/lib/demo/live";
import { STORAGE_MESSAGE, WorkError } from "@/lib/work/errors";
import { migrateItems } from "@/lib/work/migrate";
import type { WorkProject } from "@/lib/work/model";
import { isCompleted } from "@/lib/work/model";


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
 *
 * Every write re-reads what's saved first, so a tab working from an older copy can't overwrite a
 * change another tab made since. The contract's work list only changes through `transactDeal` — the
 * work repository (@/lib/work/repository) — which saves all or nothing and says when it couldn't.
 */

/**
 * IN-072 / IN-073 — the proposal exactly as the talent submitted it: their rate (or expected salary),
 * on a part-time role the hours a week they offer, the day they'd start, and a cover letter. The work
 * itself is the Team Builder's to set — the trial's tasks in its job post, a role's once it starts —
 * so a proposal carries no tasks; `tasks` is only on proposals sent before that, when the talent
 * wrote them. What the proposal settles is what the offer carries (TB-105).
 * `version` counts resubmissions after a revision request.
 */
/** `suggestions`: changes to the trial's tasks the talent suggested in a revision (./suggestions). */
/**
 * A proposal as sent. `start` is the day the talent proposes to start (yyyy-mm-dd) — the offer takes
 * it as agreed (TB-105); proposals from before it was asked for have none (proposedStart).
 */
export type DealProposal = { version: number; sent: string; rate: string; letter: string; portfolio?: string; hours?: number; start?: string; tasks?: PlannedTask[]; suggestions?: TaskSuggestion[] };

/**
 * TB-106 — one entry in a proposal's history, oldest first (the Review proposal Activity pane):
 * every version as it was submitted, each revision request with its note, a decline, and the notes
 * the Team Builder left on it. `at` is a momentLabel ("23 Sep 2026, 3:04 PM").
 */
export type ProposalEvent =
  | { kind: "proposal"; at: string; proposal: DealProposal }
  | { kind: "revision"; at: string; note: string }
  | { kind: "declined"; at: string; reason?: string }
  | { kind: "comment"; at: string; by: "team" | "independent"; text: string; chatId?: string };

/**
 * The proposal's history. Deals saved before it was kept get one worked out from what's on file —
 * the current version, and the open revision request or decline — so older versions start there.
 */
export function proposalHistory(deal: Deal): ProposalEvent[] {
  if (deal.proposalHistory?.length) return deal.proposalHistory;
  const events: ProposalEvent[] = [];
  if (deal.proposal) events.push({ kind: "proposal", at: deal.proposal.sent, proposal: deal.proposal });
  if (deal.revision) events.push({ kind: "revision", at: deal.revision.date, note: deal.revision.note });
  if (deal.proposalDeclined) events.push({ kind: "declined", at: deal.proposalDeclined.date, reason: deal.proposalDeclined.reason });
  return events;
}

/** Where a note written on the proposal came from, so both inboxes can link back to it. */
export const proposalSource = (deal: Deal | null): ChatSource | undefined => (deal?.proposal ? { kind: "proposal", version: deal.proposal.version, roleSlug: deal.roleSlug, title: deal.title } : undefined);

/** The deal with one more entry on its proposal history. */
export const withProposalEvent = (deal: Deal, event: ProposalEvent): Deal => ({ ...deal, proposalHistory: [...proposalHistory(deal), event] });

/** TB-067 / IN-034 — one submitted evaluation, criteria scores included, so the talent reads the real one. */
export type DealEvaluation = { stars: number; scores?: { label: string; value: number }[]; feedback: string; recommendation: string; date: string; tfp?: number };

/** The Trial Fit Score's parts: live while the trial runs (phase 3), final once it's evaluated (phase 4). */
export type TrialScore = { overall: number; performance: number; profile: number; workStyle: number; evaluation?: number; phase: 3 | 4 };

export type InterviewOutcome = "done" | "declined" | "cancelled";

export type OfferStatus = "sent" | "accepted" | "declined" | "withdrawn";

/**
 * TB-105 — the offer a proposal is answered with, for the role's own type. A trial has an end date
 * and the escrow funded with it (`deposit`: rate × trial months, plus the platform fee on top); a
 * full-time offer has a salary and its benefits; a part-time one a monthly rate and hours a week.
 * `updated` is set when a sent offer is edited, so the talent is told the terms changed.
 */
export type DealOffer = {
  type: JobType;
  rate: string;
  start: string;
  end?: string;
  tasks: OfferTask[];
  hours?: number;
  benefits?: string[];
  status: OfferStatus;
  sent: string;
  deposit?: { escrow: number; fee: number };
  declineReason?: string;
};

/**
 * TB-072 / IN-084 — after a trial, the Team Builder can hire the talent for a full-time or a
 * part-time role. It rides on the same engagement, and once accepted the contract carries on as that.
 */
export type ConversionOffer = { type: OngoingType; salary: string; start: string; benefits: string[]; hours?: number; status: ConversionStatus; sent: string; accepted?: string; declineReason?: string };

/** A post-trial offer's answer — or none by its start date, when it expires (@/lib/contract/lifecycle). */
export type ConversionStatus = OfferStatus | "expired";

/**
 * A role dispute's hold on pay (a full-time or part-time contract has no escrow): the disputed
 * amount is kept back from paydays while the case is open (`withheld` so far). Once it closes, what
 * was kept back is paid on or refunded; a refund bigger than what was kept back comes off the next
 * pay (`deduct`). @/lib/demo/contract keeps these.
 */
export type RoleHold = { amount: number; reason: string; withheld: number; deduct?: number; closed?: boolean };

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
  /** TB-106 — the Team Builder's answer to each task suggestion, by its id: accepted ones go into the offer. */
  suggestionDecisions?: Record<string, SuggestionDecision>;
  /** TB-106 — the Team Builder's requested changes; cleared when the talent resubmits. */
  revision?: { note: string; date: string };
  /** TB-106 — every version, revision request and note, oldest first (read it through `proposalHistory`). */
  proposalHistory?: ProposalEvent[];
  /** TB-107 — declined, with the reason the talent is shown; cleared if they are undropped. */
  proposalDeclined?: { reason?: string; date: string };
  /** TB-105 / IN-074 — the offer the talent signs (or declines); what the contract starts on. */
  offer?: DealOffer;
  /** Created when the offer is accepted: from then on both trackers read this. */
  contract?: {
    started: string;
    /** A trial's end date. Full-time and part-time contracts have none: they run until ended. */
    ends?: string;
    rate: string;
    /** A part-time contract's hours a week, and a full-time one's exclusive benefits. */
    hours?: number;
    benefits?: string[];
    /** The escrow funded for a trial. Trials made before it was recorded fall back to the rate. */
    deposit?: number;
    /**
     * The shared work list (@/lib/work): an update on one side is what the other side reviews. It
     * only changes through the work repository, which checks who may change what.
     */
    tasks: Task[];
    /** The number the next work item gets ("#12"). */
    nextNumber?: number;
    /** Colours chosen for tags on this contract (see tagColorOf); written only by the work repository. */
    tagColors?: Record<string, string>;
    /** TB-148 — a full-time or part-time role's projects (@/lib/work/projects); written only by the work repository. */
    projects?: WorkProject[];
    /** Legacy tiles; the heatmap and streak are worked out from `logs` (see `activityOf`). */
    activity: number[];
    streak: number;
    /** TB-058 — what the talent worked on each day, keyed yyyy-mm-dd (see `logToken`). */
    logs?: Record<string, string[]>;
    /** TB-067 / TB-117 — every evaluation sent, newest first. `evaluation` is the pre-list record. */
    evaluations?: DealEvaluation[];
    evaluation?: { stars: number; feedback: string; recommendation: string; date: string };
    /**
     * TB-072 / IN-048 — the Trial Fit Score as it stood when the trial's evaluation was sent: final
     * from then on. Nothing after it — a review approved late, work finished after converting, the
     * evaluations of a full-time or part-time role — moves it.
     */
    trialScore?: TrialScore;
    /**
     * IN-051 — pay on a full-time or part-time contract is recorded through this day (yyyy-mm-dd):
     * each month is paid on its last day, the first and last pro rata. Absent until the first payday.
     */
    paidThrough?: string;
    /** Which one-off lifecycle events have fired (the evaluation reminder, the escrow's automatic release). */
    fired?: string[];
    ended?: boolean;
    /** The day it ended; lists read "Ended" with this, not the scheduled end date. */
    endedOn?: string;
    /** Called off before its first day: nothing was worked, so nothing is owed. */
    cancelled?: boolean;
    /** Notice given to end the role (NOTICE_DAYS): it runs, and is paid, through `lastDay`. */
    notice?: Notice;
    /** Role disputes' holds on pay, by dispute id (RoleHold). */
    roleHolds?: Record<string, RoleHold>;
    /**
     * What has left escrow so far. The deposit is held from acceptance; End Contract (TB-071)
     * releases what is still held, and a dispute ruling (AD-034 / AD-035) can release or refund
     * part of it first. Absent means nothing has moved yet.
     */
    escrow?: { released: number; refunded: number };
  };
  /** TB-072 / IN-084 — the full-time or part-time role offered after the trial, and the talent's answer. */
  conversion?: ConversionOffer;
};

/**
 * A role the Team Builder has published. It lives here rather than in their own store because the
 * talent's job board is the other half of it: with nothing seeded, a posting is the only way a
 * role exists at all.
 */
export type Posting = {
  slug: string;
  title: string;
  type: JobType;
  /** A part-time role's hours a week. */
  hours?: number;
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
  /** Notes on the trial or the role, beside its tasks; posts saved before the tasks were all text here. */
  expectation: string;
  /**
   * A trial's tasks, as its job post lists them (TB-024). Like the expectations they're shared with
   * matched and invited candidates rather than on the public listing.
   */
  tasks?: PlannedTask[];
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
const MATCH_THRESHOLD = 80;

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

/** The contract started as a trial (escrow, trial clock, Trial Fit Score) rather than a direct hire. */
export const startedAsTrial = (deal: Deal | null) => (deal?.offer?.type ?? "trial") === "trial";

/** A trial the talent was then hired out of, full-time or part-time (TB-072). */
export const converted = (deal: Deal | null) => deal?.conversion?.status === "accepted";

/**
 * What the contract is now, on both sides: the trial, the full-time or part-time role it converted
 * into, or the full-time / part-time role the talent was hired straight onto.
 */
export function contractTypeOf(deal: Deal | null): JobType {
  if (deal?.conversion?.status === "accepted") return deal.conversion.type;
  return deal?.offer?.type ?? "trial";
}

/**
 * `invites`: the roles the Team Builder has invited the talent to apply to (TB-017), by role slug,
 * with when. An invite reopens a role the talent was turned down for: they can apply to it again.
 */
type State = { deal: Deal | null; postings: Posting[]; invites?: Record<string, number> };
/**
 * `corrupt`: what's saved can't be read. Nothing is written over it — a write would destroy the
 * user's data for good; a copy is kept under BACKUP_KEY and the workspace offers a reset.
 */
export type DealStatus = "ready" | "corrupt";
type Snapshot = State & { status: DealStatus };

const KEY = "hireable.demo.deal";
/** Outside the "hireable.demo." prefix, so Reset demo leaves the copy of unreadable data alone. */
export const BACKUP_KEY = "hireable.backup.deal";
const EMPTY: State = { deal: null, postings: [] };

let snapshot: Snapshot = { ...EMPTY, status: "ready" };
/** The saved string `snapshot` was read from, so an unchanged store isn't parsed again. */
let lastRaw: string | null = null;
let loaded = false;
let listening = false;
const subscribers = new Set<() => void>();
const emit = () => {
  for (const fn of subscribers) fn();
};

/* ------------------------------------------------ runs saved before tasks */

/** An objective as runs saved before the task list recorded it. */
type LegacyObjective = { id?: string; title: string; description?: string; status?: string; progress?: number; meta?: string; activity?: { at: string; text: string }[]; comments?: { side: TaskComment["side"]; name: string; at: string; text: string }[] };
type LegacyDeal = Omit<Deal, "proposal" | "offer" | "contract"> & {
  proposal?: DealProposal & { objectives?: LegacyObjective[] };
  offer?: Omit<DealOffer, "tasks" | "type"> & { type?: JobType; tasks?: OfferTask[]; objectives?: LegacyObjective[] };
  contract?: Omit<NonNullable<Deal["contract"]>, "tasks"> & { tasks?: unknown; objectives?: LegacyObjective[] };
  fullTime?: Omit<ConversionOffer, "type">;
};

const LEGACY_STATUS: Record<string, Task["status"]> = { complete: "done", pending: "review", revision: "doing" };

/**
 * A run saved while contracts still had OKR objectives, read as task lists: achieved objectives are
 * Done, ones pending approval are In review, a revision request is In progress with the note, and
 * anything with progress is In progress. The full-time offer that followed a trial becomes the
 * post-trial conversion. Every list then reads as complete work items (@/lib/work/migrate). Nothing
 * is lost; it just reads the new way — and nothing is written until something actually changes.
 */
function normalizeDeal(raw: LegacyDeal | null | undefined): Deal | null {
  if (!raw) return null;
  const { proposal, offer, contract, fullTime, ...rest } = raw;
  const deal: Deal = { ...rest };
  if (proposal) {
    const { objectives, ...p } = proposal;
    deal.proposal = { ...p, tasks: p.tasks ?? objectives?.map((o) => ({ title: o.title, description: o.description })) };
  }
  if (offer) {
    const { objectives, ...o } = offer;
    deal.offer = { ...o, type: o.type ?? "trial", tasks: o.tasks ?? (objectives ?? []).map((x, i) => ({ id: x.id ?? `task-${i + 1}`, title: x.title, description: x.description })) };
  }
  if (contract) {
    const { objectives, tasks, ...c } = contract;
    const items = migrateItems(
      tasks ??
        (objectives ?? []).map((o, i) => {
          const status = LEGACY_STATUS[o.status ?? ""] ?? ((o.progress ?? 0) > 0 ? "doing" : "todo");
          return {
            id: o.id ?? `task-${i + 1}`,
            title: o.title,
            description: o.description,
            status,
            addedBy: "independent",
            agreed: true,
            trial: true,
            created: dayLabel(c.started),
            changes: o.status === "revision" && o.meta ? { note: o.meta.replace(/^Revision requested · /, ""), at: "", by: "" } : undefined,
            activity: (o.activity ?? []).map((a, k) => ({ ts: -k, at: a.at, text: a.text })),
            comments: (o.comments ?? []).map((m, k): TaskComment => ({ ts: k, at: m.at, side: m.side, name: m.name, text: m.text })),
          };
        }),
      c.nextNumber,
    );
    deal.contract = { ...c, tasks: items.items, nextNumber: items.nextNumber };
  }
  if (fullTime && !deal.conversion) deal.conversion = { type: "full-time", ...fullTime };
  return deal;
}

/* ------------------------------------------------------------------ store */

/** What's saved, read — or null when it can't be (not JSON, or not a record at all). */
function parseState(raw: string | null): State | null {
  if (!raw) return EMPTY;
  try {
    const saved = JSON.parse(raw) as unknown;
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return null;
    const s = saved as { deal?: LegacyDeal | null; postings?: unknown; invites?: unknown };
    const invites = s.invites && typeof s.invites === "object" && !Array.isArray(s.invites) ? Object.fromEntries(Object.entries(s.invites as Record<string, unknown>).filter(([, v]) => typeof v === "number")) : undefined;
    return { deal: normalizeDeal(s.deal), postings: Array.isArray(s.postings) ? (s.postings as Posting[]) : [], ...(invites ? { invites: invites as Record<string, number> } : {}) };
  } catch {
    return null;
  }
}

/**
 * A freshly read state that reuses this tab's objects for every work item that hasn't changed
 * (same version, same place in the order), so a change to one item re-renders one card, not the
 * whole board.
 */
function share(prev: State, next: State): State {
  const before = prev.deal?.contract?.tasks;
  const after = next.deal?.contract;
  if (!before || !after || !next.deal) return next;
  const byId = new Map(before.map((t) => [t.id, t]));
  let unchanged = before.length === after.tasks.length;
  const tasks = after.tasks.map((t, i) => {
    const old = byId.get(t.id);
    const kept = old && old.version === t.version && old.updatedAt === t.updatedAt && old.order === t.order ? old : t;
    if (kept !== before[i]) unchanged = false;
    return kept;
  });
  return { ...next, deal: { ...next.deal, contract: { ...after, tasks: unchanged ? before : tasks } } };
}

/** Keep a copy of data that can't be read before anything could touch it. */
function backup(raw: string | null) {
  try {
    if (raw && localStorage.getItem(BACKUP_KEY) !== raw) localStorage.setItem(BACKUP_KEY, raw);
  } catch {
    /* nothing more can be done in a browser that won't store anything */
  }
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Make `raw` — what's saved now — this tab's snapshot. True when that changed it. */
function adopt(raw: string | null) {
  if (loaded && raw === lastRaw) return false;
  lastRaw = raw;
  const state = parseState(raw);
  if (!state) {
    backup(raw);
    snapshot = { ...EMPTY, status: "corrupt" };
  } else snapshot = { ...share(snapshot, state), status: "ready" };
  return true;
}

/** One listener for the whole tab: another tab saved, so read what it saved. */
function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("storage", (e) => {
    if (e.key !== null && e.key !== KEY) return;
    adopt(e.key === null ? readRaw() : e.newValue);
    emit();
  });
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  adopt(readRaw());
  loaded = true;
  listen();
}

/**
 * The latest saved state, re-read so a write from this tab can't overwrite what another tab saved
 * since. Null while the saved data can't be read — nothing is written over it.
 */
function fresh(): State | null {
  ensureLoaded();
  // Another tab saved and its event hasn't arrived yet: the screens catch up now, so an action this
  // re-read refuses shows why (an offer already accepted) rather than waiting for the next write.
  if (adopt(readRaw())) emit();
  return snapshot.status === "corrupt" ? null : snapshot;
}

function write(next: State) {
  if (snapshot.status === "corrupt") return;
  snapshot = { ...next, status: "ready" };
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

/** The deal as both portals see it — re-renders on either side's move, across tabs. */
export function useDeal(): Deal | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      ensureLoaded();
      return snapshot.deal;
    },
    () => null,
  );
}

/** Whether the saved deal could be read ("loading" before the browser has taken over). */
export function useDealStatus(): DealStatus | "loading" {
  return useSyncExternalStore(
    subscribe,
    () => {
      ensureLoaded();
      return snapshot.status;
    },
    () => "loading" as const,
  );
}

export function getDeal(): Deal | null {
  ensureLoaded();
  return snapshot.deal;
}

/** The deal as saved right now — re-read, not this tab's copy — for anything that moves money. */
export function readDeal(): Deal | null {
  return fresh()?.deal ?? null;
}

/** Every role ever published, newest first — the job board shows the ones still open. */
export function usePostings(): Posting[] {
  return useSyncExternalStore(
    subscribe,
    () => {
      ensureLoaded();
      return snapshot.postings;
    },
    () => EMPTY.postings,
  );
}

/**
 * Run `fn` on the deal as saved right now and save what it returns — all or nothing. Throws a
 * WorkError when the saved data can't be read ("corrupt") or the browser refuses to save
 * ("storage"); either way nothing changes, in storage or on screen. The work repository's port.
 */
export function transactDeal<T>(fn: (deal: Deal | null) => { deal?: Deal; result: T }): T {
  ensureLoaded();
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    throw new WorkError("storage", STORAGE_MESSAGE);
  }
  if (raw !== lastRaw) {
    adopt(raw);
    emit();
  }
  if (snapshot.status === "corrupt") throw new WorkError("corrupt", "The saved work on this contract can't be read, so nothing was changed. A copy has been kept; reset the demo data to carry on.");
  const { deal, result } = fn(snapshot.deal);
  if (deal) {
    const next: State = { deal, postings: snapshot.postings, ...(snapshot.invites ? { invites: snapshot.invites } : {}) };
    const text = JSON.stringify(next);
    try {
      localStorage.setItem(KEY, text);
    } catch {
      throw new WorkError("storage", STORAGE_MESSAGE);
    }
    lastRaw = text;
    snapshot = { ...share(snapshot, next), status: "ready" };
    emit();
  }
  return result;
}

/** Drop saved data that can't be read (its copy is already under BACKUP_KEY) and start from nothing. */
export function resetUnreadableDeal() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  lastRaw = null;
  snapshot = { ...EMPTY, status: "ready" };
  emit();
}

/** A posting still taking applications. */
export const isPostingOpen = (p: Posting) => !p.filled && !p.closed;

/** TB-026 — publishing (or reopening) puts the role in front of the talent. */
export function publishPosting(posting: Posting) {
  const s = fresh();
  if (s) write({ ...s, postings: [posting, ...s.postings.filter((p) => p.slug !== posting.slug)] });
}

/**
 * A hire takes one seat. With one live pair in the demo, a single-seat posting is full after one
 * hire; a multi-seat one stays open for the rest.
 */
export function fillPosting(slug: string) {
  const s = fresh();
  const posting = s?.postings.find((p) => p.slug === slug);
  if (!s || !posting || (posting.hires ?? 1) > 1) return;
  write({ ...s, postings: s.postings.map((p) => (p.slug === slug ? { ...p, filled: true } : p)) });
}

/** A role that is closed, archived or deleted comes off the board — but stays on file. */
export function closePosting(slug: string) {
  const s = fresh();
  if (!s?.postings.some((p) => p.slug === slug)) return;
  write({ ...s, postings: s.postings.map((p) => (p.slug === slug ? { ...p, closed: true } : p)) });
}

/**
 * IN-017 — applying is what starts the deal; there is nothing before it. Refused (false) while an
 * engagement already exists: there is one deal slot, and a second application used to overwrite
 * the first — contract, escrow record and evaluation included.
 */
export function startDeal(deal: Omit<Deal, "stage" | "submitted"> & Partial<Pick<Deal, "stage" | "submitted">>) {
  const s = fresh();
  if (!s || s.deal) return false;
  write({ ...s, deal: { stage: "applied", submitted: today(), ...deal } });
  return true;
}

/**
 * Change the deal outside its work list — its stage, offer, contract terms, evaluations. Work items
 * change through the work repository (transactDeal), which checks who may change what; in
 * development this warns if a caller rewrites them here.
 */
export function updateDeal(patch: (deal: Deal) => Deal) {
  const s = fresh();
  if (!s?.deal) return;
  const next = patch(s.deal);
  if (process.env.NODE_ENV !== "production" && s.deal.contract && next.contract && next.contract.tasks !== s.deal.contract.tasks) console.warn("updateDeal changed the work list; change work items through the work repository (@/lib/work).");
  write({ ...s, deal: next });
}

/** Money leaving the trial's escrow — released to the talent or refunded to the Team Builder. */
export function settleEscrow(delta: { released?: number; refunded?: number }) {
  updateDeal((d) => {
    if (!d.contract) return d;
    const was = d.contract.escrow ?? { released: 0, refunded: 0 };
    return { ...d, contract: { ...d.contract, escrow: { released: was.released + (delta.released ?? 0), refunded: was.refunded + (delta.refunded ?? 0) } } };
  });
}

/**
 * TB-017 — the Team Builder invites the talent to apply to a role. If the talent's application for
 * that same role was turned down (dropped before any hire), the invite starts it over: the old one
 * gives way, so the new application can land — "cannot apply twice" is about applying unasked.
 */
export function recordInvite(roleSlug: string) {
  const s = fresh();
  if (!s) return;
  const stale = s.deal && s.deal.roleSlug === roleSlug && s.deal.dropped && !s.deal.contract;
  write({ ...s, deal: stale ? null : s.deal, invites: { ...s.invites, [roleSlug]: Date.now() } });
}

/** An invite taken up: the talent applied. */
export function consumeInvite(roleSlug: string) {
  const s = fresh();
  if (!s?.invites?.[roleSlug]) return;
  const { [roleSlug]: _used, ...rest } = s.invites;
  write({ ...s, invites: rest });
}

const NO_INVITES: Record<string, number> = {};
/** The roles the talent has an open invite to apply to — now, for an action; `useInvites` in render. */
export function getInvites(): Record<string, number> {
  ensureLoaded();
  return snapshot.invites ?? NO_INVITES;
}

export function useInvites(): Record<string, number> {
  return useSyncExternalStore(subscribe, getInvites, () => NO_INVITES);
}

export function clearDeal() {
  const s = fresh();
  if (s) write({ ...s, deal: null });
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

/* ----------------------------------------------------------------- tasks */

/**
 * TB-058 — the activity heatmap and streak, worked out from what was logged: one tile per weekday
 * since the start (2 when the talent sent a task for review that day, 1 when they only worked on
 * tasks, 0 for nothing), and the streak is the run of logged weekdays up to today — today not
 * logged yet doesn't break it.
 */
export function activityOf(contract: NonNullable<Deal["contract"]>, now = new Date()): { activity: number[]; streak: number } {
  const from = parseDay(contract.started);
  if (!from) return { activity: contract.activity ?? [], streak: contract.streak ?? 0 };
  const logs = contract.logs ?? {};
  const days: number[] = [];
  const d = new Date(from);
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  while (d <= end) {
    if (isWeekday(d)) days.push(dayLevel(logs[isoDay(d)]));
    d.setDate(d.getDate() + 1);
  }
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i] > 0) streak++;
    else if (i < days.length - 1) break;
  }
  return { activity: days, streak };
}

/** Every evaluation on the contract, newest first, including one saved before the list existed. */
export const evaluationsOf = (contract: Deal["contract"]): DealEvaluation[] => contract?.evaluations ?? (contract?.evaluation ? [contract.evaluation] : []);

/**
 * The trial's own evaluation — the first one sent on a contract that began as a trial. Evaluations
 * sent later are the full-time or part-time role's reviews (TB-117), not the trial's.
 */
export const trialEvaluationOf = (deal: Deal | null): DealEvaluation | undefined => (startedAsTrial(deal) ? evaluationsOf(deal?.contract).at(-1) : undefined);

/** The deal's facts, as the lifecycle reads them (@/lib/contract/lifecycle). */
function factsOf(deal: Deal): ContractFacts | null {
  const c = deal.contract;
  if (!c) return null;
  const trial = trialTasks(c.tasks);
  return {
    startedAs: deal.offer?.type ?? "trial",
    started: c.started,
    ends: c.ends,
    ended: !!c.ended,
    endedOn: c.endedOn,
    evaluated: evaluationsOf(c).length > 0,
    trialDone: trial.length > 0 && trial.every((t) => isCompleted(t.status)),
    conversion: deal.conversion ? { type: deal.conversion.type, status: deal.conversion.status, start: deal.conversion.start } : undefined,
    notice: c.notice,
  };
}

/** Where the live contract is in its lifecycle, or null before there is one. */
export function lifecycleOfDeal(deal: Deal | null, now = new Date()): Lifecycle | null {
  const facts = deal ? factsOf(deal) : null;
  return facts ? lifecycleOf(facts, now) : null;
}

/**
 * Where a live trial stands. It closes on its end date, or sooner once every trial task is Done
 * (the rule the evaluation, disputes and Admin's process check all open on) or the Team Builder
 * ends it. A closed trial stops counting down: an early close used to read "Day 1 of 30 · 30 days
 * left" right under "The trial has ended".
 */
export function trialStateOf(contract: NonNullable<Deal["contract"]>, now = new Date()) {
  const clock = trialClock(contract.started, contract.ends ?? contract.started, now);
  const scored = trialTasks(contract.tasks);
  const allDone = scored.length > 0 && scored.every((t) => isCompleted(t.status));
  const over = clock.over || allDone || !!contract.ended;
  const day = clock.over ? clock.label : contract.ended ? "Ended early" : allDone ? "Closed early" : clock.label;
  return { over, left: over ? 0 : clock.left, day, total: clock.total };
}

/**
 * TB-058 / IN-076 — the Trial Fit Score, worked out rather than left at a hard 0%: Performance is
 * the share of the trial's tasks that are Done, Profile and Work Style come from the match the
 * application started on, and once an evaluation is in (phase 4) its stars fold in at the
 * post-trial weights. Only the Independent's own trial work counts — the Team Builder's items and
 * archived ones never do.
 */
export function fitScoreOf(deal: Deal, evaluation: Pick<DealEvaluation, "stars"> | undefined = trialEvaluationOf(deal)): TrialScore {
  const c = deal.contract;
  // Final once the trial was evaluated: frozen as it stood then.
  if (c?.trialScore) return c.trialScore;
  // Scored on the trial's own tasks: ones added after it converted to full-time or part-time
  // would otherwise drag down a score that is final and read-only by then.
  const trial = c ? trialTasks(c.tasks) : [];
  const performance = trial.length ? Math.round((trial.filter((t) => isCompleted(t.status)).length / trial.length) * 100) : 0;
  const profile = deal.match;
  const workStyle = deal.match;
  // The trial's own evaluation — never a later review of the role it became.
  const phase = evaluation ? 4 : 3;
  const w = TFP_WEIGHTS[phase];
  const stars = evaluation ? Math.round((evaluation.stars / 5) * 100) : 0;
  const overall = Math.round((performance * w.performance + profile * w.profile + workStyle * w.workStyle + stars * w.evaluation) / 100);
  return { overall, performance, profile, workStyle, evaluation: evaluation ? stars : undefined, phase };
}
