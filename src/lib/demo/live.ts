"use client";

import { useSyncExternalStore } from "react";
import { dayStamp, today } from "@/lib/portal/dates";
import { shortName } from "@/lib/portal/names";
import { readDeal, type Deal } from "@/lib/demo/deal";
import { JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import type { JobType } from "@/lib/contract/job-types";
import { notifications as indSeed } from "@/lib/independent/data";
import type { Notification as IndNote } from "@/lib/independent/data";
import { notifications as teamSeed } from "@/lib/team/data";
import type { Notification as TeamNote } from "@/lib/team/data";
import { filesNote, type Side } from "@/lib/work/model";
import { readableRefs } from "@/lib/work/refs";
import type { Attachment } from "@/lib/disputes/case";
import type { NoteCategory } from "@/lib/portal/notification-categories";

/**
 * The one demo loop that crosses portals.
 *
 * Everything else is per-portal state (roles, cards, payouts). This module holds what BOTH
 * sides can see — each side's notification feed and the single chat thread between them — in
 * one localStorage key, so a movement in /team lands in /independent and the other way round,
 * live across two browser tabs.
 *
 * Exactly two users take part so the feeds stay readable (see MOVES for who hears what):
 *   Team Builder  Alex Rivera @ Nairobi Solutions Inc.
 *   Independent   Juan Dela Cruz
 * Other names in the seed data are static background for the list screens.
 */

export const PAIR = {
  team: { name: "Alex Rivera", company: "Nairobi Solutions Inc.", avatar: "/team/alex.jpg", initials: "NS" },
  independent: { name: "Juan Dela Cruz", slug: "juan-dela-cruz", avatar: "/team/juan.jpg" },
} as const;

/**
 * The Independent as the Team Builder reads them until the offer is signed: "Juan D." Every step
 * before the hire names them so, in the thread and in the Team Builder's feed; the full name comes
 * with the hire (its own notice is the first to carry it).
 */
const BEFORE_HIRE = shortName(PAIR.independent.name);
/** The Independent's name for a notice raised now: in full once a contract exists, "Juan D." before. */
const independentNow = () => (readDeal()?.contract ? PAIR.independent.name : BEFORE_HIRE);

export type ChatMsg = {
  id: string;
  from: Side;
  text?: string;
  time: string;
  /** When it was sent (epoch ms), for the thread's day dividers. Older messages carry only `time`. */
  at?: number;
  /** TB-007 / IN-007 — something that happened rather than something said: logged in the thread, with where to see it. */
  event?: ChatEvent;
  /** Files sent with it, kept in the browser's file store (@/lib/demo/files). */
  files?: Attachment[];
  /** A file sent before messages kept theirs: its name and size, which this browser no longer has. */
  file?: { name: string; meta: string };
  /** Where it was written, when that wasn't the thread itself — the inbox links back to it. */
  source?: ChatSource;
};

/**
 * A hiring, task or payment step logged in the thread, so the history of the engagement reads in
 * one place: one line, and where each side opens it ("View details"). `only` is set when just one
 * side is told (a payment, a reminder); the other side doesn't see it.
 */
export type ChatEvent = { text: string; href: Partial<Record<Side, string>>; only?: Side; /** #153 — an interview's time, read in each viewer's own clock. */ slot?: InterviewSlot };

/** An interview time as booked: the slot in the booker's clock, that clock's offset from UTC in minutes, and which side booked it. */
export type InterviewSlot = { when: string; offset: number; by: Side };

/** TB-106 — a note left on a proposal's Activity pane, which both inboxes link back to. */
export type ChatSource = { kind: "proposal"; version: number; roleSlug: string; title: string };

/** Where a note written on the proposal came from, so both inboxes can link back to it. */
export const proposalSource = (deal: Deal | null): ChatSource | undefined => (deal?.proposal ? { kind: "proposal", version: deal.proposal.version, roleSlug: deal.roleSlug, title: deal.title } : undefined);

/**
 * IN-051 — a payment recorded against a contract. It crosses portals: the Team Builder (or the
 * platform, on a schedule) records it, and it has to appear in the independent's ledger straight
 * away, so it lives here rather than in either portal's own state.
 */
export type LivePayment = {
  id: string;
  /** The contract's slug on the independent's side — their contract tab lists its own rows. */
  contract: string;
  title: string;
  company: string;
  amount: string;
  period: string;
  date: string;
  /** yyyymmdd, so the ledger can sort and filter by date. */
  at: number;
  /** Released to the independent (the default) or refunded to the Team Builder after a dispute ruling. */
  kind?: "released" | "refunded";
  /**
   * What the money was for: the trial (its escrow) or the full-time / part-time role it became (its
   * pay). The ledger names the row by it, so trial money isn't relabelled once the contract converts.
   */
  chapter?: JobType;
};

export type Live = {
  team: TeamNote[];
  independent: IndNote[];
  payments: LivePayment[];
  chat: ChatMsg[];
  /** How many chat messages each side has seen — drives the Messages nav badge (TB-008 / IN-008). */
  seen: Record<Side, number>;
};

/** Nothing has been said yet — the thread starts when one side messages the other. */
const SEED_CHAT: ChatMsg[] = [];

const SEED: Live = { team: teamSeed, independent: indSeed, payments: [], chat: SEED_CHAT, seen: { team: 0, independent: 0 } };

/* ------------------------------------------------------------------ store */

const PREFIX = "hireable.demo.";
const KEY = PREFIX + "live";
/** Keep feeds short — a demo that scrolls forever stops reading as a story. */
const MAX_NOTES = 30;

let snapshot: Live = SEED;
/** The saved string `snapshot` was read from, so an unchanged store isn't parsed again. */
let lastRaw: string | null = null;
let loaded = false;
let listening = false;
const subscribers = new Set<() => void>();

const emit = () => {
  for (const fn of subscribers) fn();
};

function parse(raw: string | null): Live {
  if (!raw) return SEED;
  try {
    return toItems({ ...SEED, ...(JSON.parse(raw) as Live) });
  } catch {
    return SEED;
  }
}

/**
 * Notifications saved when they opened their step in Messages (`/messages?msg=<id>`) open the item
 * the step is about instead, as new ones do: the entry's link for that side.
 */
function toItems(live: Live): Live {
  const item = (side: Side, href: string) => {
    const id = /\/messages\?msg=([^&#]+)/.exec(href)?.[1];
    return (id && live.chat.find((m) => m.id === id)?.event?.href[side]) || href;
  };
  return {
    ...live,
    team: live.team.map((n) => (n.href ? { ...n, href: item("team", n.href) } : n)),
    independent: live.independent.map((n) => (n.href ? { ...n, href: item("independent", n.href) } : n)),
  };
}

/**
 * Read what's saved now. Every writer calls this first, so a change made from a tab that hadn't
 * loaded the feed yet — or had an older copy — adds to what's there instead of replacing it.
 */
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
  listen();
}

/** One listener for the whole tab: another tab moved, so mirror it here. */
function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener("storage", (e) => {
    if (e.key !== null && e.key !== KEY) return;
    refresh();
    emit();
  });
}

function write(next: Live) {
  snapshot = next;
  try {
    lastRaw = JSON.stringify(next);
    localStorage.setItem(KEY, lastRaw);
  } catch {
    // Private mode / quota — the demo still works for this tab.
  }
  emit();
}

function subscribe(fn: () => void) {
  if (!loaded) {
    refresh();
    emit();
  }
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

/** The shared feed + thread. Re-renders when either side moves, in this tab or another. */
export function useLive(): Live {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => SEED,
  );
}

const uid = () => `x${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const clock = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/* --------------------------------------------------------------- movements */

/**
 * Who hears about what, lifted from the user-story sheet (see docs/user-stories.json).
 * `to` is the side that gets the notification — the side that MOVED never notifies itself.
 * Movements the sheet says are silent (TB-018 save, TB-022 unsave, TB-044 decline/restore) are
 * deliberately absent from this table; a decline or restore is still logged in the thread, with no
 * notification (logStep, from @/lib/team/pipeline).
 */
export type MoveKind =
  | "invite" // TB-017 / TB-023 Invite Independent to Apply
  | "interview_invited" // TB-037 Candidate tracker → Interview
  | "interview_rescheduled" // TB-037 Interviews → Reschedule
  | "interview_cancelled" // TB-037 Interviews → Cancel interview
  | "interview_moved" // TB-037 Confirm the new time the talent asked for
  | "proposal_requested" // TB-103 Request Proposal from Candidate
  | "proposal_revision" // TB-106 Request Changes to Proposal
  | "proposal_declined" // TB-107 Decline Proposal
  | "offer_sent" // TB-105 Send Offer
  | "offer_withdrawn" // TB-105 Withdraw a sent offer
  | "task_approved" // TB-109 / TB-114 Approve Task
  | "task_changes" // TB-110 / TB-115 Request Changes on a Task
  | "task_added" // TB-064 Add a Task
  | "evaluation_sent" // TB-067 Send Evaluation
  | "contract_ended" // TB-071 End Contract
  | "hire_offer" // TB-072 Hire After the Trial (full-time or part-time)
  | "hire_withdrawn" // TB-072 Withdraw the post-trial offer
  // Disputes (TB-073/093, IN-059/082) notify from @/lib/demo/disputes, which links to the dispute itself.
  | "applied" // IN-017 Apply to Role
  | "interview_accepted" // IN-070 Accept Interview Invitation
  | "proposal_sent" // IN-072 / IN-073 Submit or revise proposal
  | "offer_accepted" // IN-074 Accept Offer
  | "offer_declined" // IN-075 Decline Offer
  | "task_submitted" // IN-030 Submit a Task for Review
  | "interview_declined" // IN-092 Decline an interview invitation
  | "interview_reschedule" // IN-093 Ask for a new interview time
  | "hire_accepted" // IN-084 Accept the post-trial offer
  | "hire_declined" // IN-084 Decline the post-trial offer
  | "withdrawn"; // IN — withdraw application

/** What a movement is about beyond the role: the task, the kind of role offered, the note sent with it. */
export type MoveExtra = {
  task?: { id: string; /** Its number on the list, "#1". */ number?: number; title: string };
  type?: JobType;
  note?: string;
  /** A trial offer's escrow, in dollars. */
  escrow?: number;
  /** The interview time a booking or a move is for. */
  slot?: InterviewSlot;
  /** What the mover wrote with it (an invite's note): posted in the thread as their own message, after the entry. */
  message?: string;
  /** Where that message was written, when it's about a proposal (a revision's note): the thread links back to it. */
  source?: ChatSource;
  /** The proposal's version a submission sent: past the first, it's a resubmission. */
  version?: number;
};

const dollars = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const managerFirst = PAIR.team.name.split(" ")[0];

/** "Sales Manager full-time role" — the post-trial offer names the kind of role it is. */
const roleKind = (x?: MoveExtra) => (x?.type ? `${JOB_TYPE_LABEL[x.type].toLowerCase()} ` : "");
/** "#1 Audit the current brand assets", the way the work list names an item (a task saved without its number keeps its title in quotes). */
const taskName = (x?: MoveExtra) => (!x?.task ? "a task" : x.task.number ? `#${x.task.number} ${x.task.title}` : `“${x.task.title}”`);

const MOVES: Record<MoveKind, { to: Side; story: string; title: (role: string, x?: MoveExtra) => string; body: (role: string, x?: MoveExtra) => string }> = {
  invite: {
    to: "independent",
    story: "TB-017",
    title: (r) => `${PAIR.team.company} invited you to apply for ${r}`,
    body: (_r, x) => `Send an application to be considered.${x?.message ? ` Their note: “${x.message}”` : ""}`,
  },
  interview_invited: {
    to: "independent",
    story: "TB-037",
    title: () => "Interview invitation received",
    body: (r) => `${PAIR.team.name} wants to interview you for ${r}. Accept to confirm your availability.`,
  },
  interview_rescheduled: {
    to: "independent",
    story: "TB-037",
    title: () => "Interview rescheduled",
    body: (r, x) => `${PAIR.team.name} moved your ${r} interview to a new time. Accept the new slot to confirm it.${x?.note ? ` Their note: “${x.note}”` : ""}`,
  },
  interview_moved: {
    to: "independent",
    story: "TB-037",
    title: () => "New interview time confirmed",
    body: (r) => `${PAIR.team.name} agreed to the time you asked for on ${r}.`,
  },
  interview_cancelled: {
    to: "independent",
    story: "TB-037",
    title: () => "Interview cancelled",
    body: (r, x) => `${PAIR.team.name} cancelled the ${r} interview.${x?.note ? ` Their reason: “${x.note}”` : ""} Your application stays open.`,
  },
  proposal_requested: {
    to: "independent",
    story: "TB-103",
    title: () => "Proposal requested",
    body: (r) => `${PAIR.team.name} asked for your task list, rate and cover letter for ${r}.`,
  },
  proposal_revision: {
    to: "independent",
    story: "TB-106",
    title: () => "Revision requested on your proposal",
    body: (r) => `${PAIR.team.name} left notes on your ${r} proposal. Revise and resubmit.`,
  },
  proposal_declined: {
    to: "independent",
    story: "TB-107",
    title: () => "Proposal declined",
    body: (r) => `${PAIR.team.company} is not moving forward with your ${r} proposal.`,
  },
  offer_sent: {
    to: "independent",
    story: "TB-105",
    title: (_r, x) => (x?.type ? `${JOB_TYPE_LABEL[x.type]} offer received` : "Offer received"),
    // IN-074 — a trial offer comes with its escrow already funded, and says when it's paid out.
    body: (r, x) =>
      x?.type === "trial" && x.escrow
        ? `${PAIR.team.company} put ${dollars(x.escrow)} in escrow for your ${r} trial. You get paid when the trial ends and ${managerFirst} submits the evaluation.`
        : `${PAIR.team.company} sent you an offer for ${r}. Review the terms and the tasks.`,
  },
  offer_withdrawn: {
    to: "independent",
    story: "TB-105",
    title: () => "Offer withdrawn",
    body: (r) => `${PAIR.team.company} withdrew the ${r} offer. Your proposal stays with them and they can send a new one.`,
  },
  task_approved: {
    to: "independent",
    story: "TB-109",
    title: () => "Task approved",
    body: (_r, x) => `${PAIR.team.name} approved ${taskName(x)}.`,
  },
  task_changes: {
    to: "independent",
    story: "TB-110",
    title: () => "Changes requested on a task",
    body: (_r, x) => `${PAIR.team.name} asked for changes on ${taskName(x)}.${x?.note ? ` Their note: “${x.note}”` : ""}`,
  },
  task_added: {
    to: "independent",
    story: "TB-064",
    title: () => "New task added",
    body: (r, x) => `${PAIR.team.name} added ${taskName(x)} to your ${r} task list.`,
  },
  evaluation_sent: {
    to: "independent",
    story: "TB-067",
    title: (_r, x) => (x?.type && x.type !== "trial" ? "You have a new evaluation" : "Your trial evaluation is in"),
    body: (r, x) =>
      x?.type && x.type !== "trial" ? `${PAIR.team.name} sent you an evaluation for ${r}. Read it on the contract's Evaluation tab.` : `${PAIR.team.name} submitted the post-trial evaluation for ${r}. Your trial fit score is now final.`,
  },
  contract_ended: {
    to: "independent",
    story: "TB-071",
    title: () => "Contract ended",
    // What money moved, when some did: the escrow still held on a trial, the last pay on a full-time or part-time role.
    body: (r, x) => `${PAIR.team.company} closed the ${r} engagement.${x?.note ? ` ${x.note}` : ""}`,
  },
  hire_offer: {
    to: "independent",
    story: "TB-072",
    title: (_r, x) => `${x?.type ? JOB_TYPE_LABEL[x.type] : "Full-time"} offer received`,
    body: (r, x) => `${PAIR.team.company} wants to hire you ${x?.type === "part-time" ? "part-time" : "full-time"} for ${r} after your trial. Review the pay, ${x?.type === "part-time" ? "hours" : "benefits"} and start date.`,
  },
  hire_withdrawn: {
    to: "independent",
    story: "TB-072",
    title: () => "Offer withdrawn",
    body: (r, x) => `${PAIR.team.company} withdrew the ${roleKind(x)}offer for ${r}. Your contract and its history are unchanged.`,
  },
  applied: {
    to: "team",
    story: "IN-017",
    title: (r) => `New application for ${r}`,
    body: () => `${BEFORE_HIRE} applied.`,
  },
  interview_accepted: {
    to: "team",
    story: "IN-070",
    title: () => `${BEFORE_HIRE} accepted your interview invite`,
    body: (r) => `Interview confirmed for ${r}.`,
  },
  proposal_sent: {
    to: "team",
    story: "IN-072",
    title: () => `${BEFORE_HIRE} submitted a proposal`,
    body: (r) => `A task list, rate and cover letter for ${r} are ready for review.`,
  },
  offer_accepted: {
    to: "team",
    story: "IN-074",
    title: () => `${PAIR.independent.name} accepted your offer`,
    body: (r) => `The ${r} contract is created and waiting to start.`,
  },
  offer_declined: {
    to: "team",
    story: "IN-075",
    title: () => `${BEFORE_HIRE} declined your offer`,
    body: (r) => `The ${r} offer was turned down. Their card in the pipeline shows it as Declined.`,
  },
  task_submitted: {
    to: "team",
    story: "IN-030",
    title: () => `${PAIR.independent.name} sent a task for review`,
    body: (r, x) => `${x?.task ? taskName(x) : "A task"} on ${r} is In review until you approve it or ask for changes.${x?.note ? ` Their note: “${x.note}”` : ""}`,
  },
  interview_declined: {
    to: "team",
    story: "IN-092",
    title: () => `${BEFORE_HIRE} declined the interview`,
    body: (r) => `They can't make that slot for ${r}. Their application stays open, so offer another time.`,
  },
  interview_reschedule: {
    to: "team",
    story: "IN-093",
    title: () => `${BEFORE_HIRE} asked for a new interview time`,
    // `note` carries the slot they asked for.
    body: (r, x) => `They cannot make the ${r} slot and asked for ${x?.note ?? "another time"}. Confirm it or offer a different one.`,
  },
  hire_accepted: {
    to: "team",
    story: "IN-084",
    title: (_r, x) => `${PAIR.independent.name} accepted your ${roleKind(x)}offer`,
    body: (r, x) => `${r} is now a ${x?.type === "part-time" ? "part-time" : "full-time"} engagement. Add tasks to the shared list as the work goes on.`,
  },
  hire_declined: {
    to: "team",
    story: "IN-084",
    title: (_r, x) => `${PAIR.independent.name} declined your ${roleKind(x)}offer`,
    body: (r, x) => `The ${roleKind(x)}offer for ${r} was turned down.${x?.note ? ` Their reason: “${x.note}”` : ""} The trial record stays on the contract, and you can send a new offer or close the trial.`,
  },
  withdrawn: {
    to: "team",
    story: "IN",
    title: () => `${BEFORE_HIRE} withdrew their application`,
    body: (r) => `They are no longer in the running for ${r}.`,
  },
};

/**
 * TB-007 / IN-007 — each movement as the thread logs it: one line both sides read, naming who did
 * it, so the engagement's history is in the conversation rather than only in two notification feeds.
 */
const LOG: Record<MoveKind, (role: string, x?: MoveExtra) => string> = {
  invite: (r) => `${PAIR.team.company} invited ${BEFORE_HIRE} to apply for ${r}`,
  interview_invited: (r) => `${PAIR.team.name} sent an interview invite for ${r}`,
  interview_rescheduled: (r, x) => `${PAIR.team.name} moved the ${r} interview to a new time${x?.note ? `: ${x.note}` : ""}`,
  interview_moved: (r) => `${PAIR.team.name} confirmed the new interview time for ${r}`,
  interview_cancelled: (r, x) => `${PAIR.team.name} cancelled the ${r} interview${x?.note ? `: ${x.note}` : ""}`,
  proposal_requested: (r) => `${PAIR.team.name} asked for a proposal for ${r}`,
  proposal_revision: (r) => `${PAIR.team.name} asked for changes to the ${r} proposal`,
  proposal_declined: (r) => `${PAIR.team.company} declined the ${r} proposal`,
  offer_sent: (r, x) => (x?.type === "trial" && x.escrow ? `Trial offer sent for ${r}, with ${dollars(x.escrow)} in escrow` : `${PAIR.team.company} sent an offer for ${r}`),
  offer_withdrawn: (r) => `${PAIR.team.company} withdrew the ${r} offer`,
  task_approved: (_r, x) => `${PAIR.team.name} approved ${taskName(x)}`,
  task_changes: (_r, x) => `${PAIR.team.name} requested changes on ${taskName(x)}`,
  task_added: (r, x) => `${PAIR.team.name} added ${taskName(x)} to ${r}`,
  evaluation_sent: (r) => `${PAIR.team.name} sent the ${r} evaluation`,
  contract_ended: (r) => `${PAIR.team.company} ended the ${r} contract`,
  hire_offer: (r, x) => `${PAIR.team.company} sent a ${roleKind(x)}offer for ${r}`,
  hire_withdrawn: (r, x) => `${PAIR.team.company} withdrew the ${roleKind(x)}offer for ${r}`,
  applied: (r) => `${BEFORE_HIRE} applied for ${r}`,
  interview_accepted: (r) => `${BEFORE_HIRE} accepted the ${r} interview`,
  proposal_sent: (r, x) => (x?.version && x.version > 1 ? `${BEFORE_HIRE} resubmitted v${x.version} of the ${r} proposal` : `${BEFORE_HIRE} sent a proposal for ${r}`),
  offer_accepted: (r) => `${PAIR.independent.name} accepted the ${r} offer`,
  offer_declined: (r) => `${BEFORE_HIRE} declined the ${r} offer`,
  task_submitted: (_r, x) => `${PAIR.independent.name} sent ${taskName(x)} for review`,
  interview_declined: (r) => `${BEFORE_HIRE} declined the ${r} interview`,
  interview_reschedule: (_r, x) => `${BEFORE_HIRE} asked for a new interview time${x?.note ? `: ${x.note}` : ""}`,
  hire_accepted: (r, x) => `${PAIR.independent.name} accepted the ${roleKind(x)}offer for ${r}`,
  hire_declined: (r, x) => `${PAIR.independent.name} declined the ${roleKind(x)}offer for ${r}`,
  withdrawn: (r) => `${BEFORE_HIRE} withdrew their application for ${r}`,
};

/** The thread with `event` logged at the end: its id, and the new chat (written by the caller with the notification). */
function withEvent(from: Side, event: ChatEvent): { id: string; chat: ChatMsg[] } {
  const id = uid();
  return { id, chat: [...snapshot.chat, { id, from, time: clock(), at: Date.now(), event }] };
}

/** A step logged in the thread with no notification of its own (the trial starting on its day): both sides see it. */
export function logStep(text: string, href: Partial<Record<Side, string>>) {
  refresh();
  write({ ...snapshot, chat: withEvent("team", { text, href }).chat });
}

/**
 * IN-051 — record a payment against a contract. The independent is told in-app (and, in a real
 * build, by email — the notification says so), and the row lands in their ledger immediately.
 */
export function recordPayment(p: Omit<LivePayment, "id" | "date" | "at">) {
  recordLedger(p);
  notify("independent", {
    title: "Payment recorded",
    body: `${p.company} recorded ${p.amount} for ${p.title}, ${p.period}. It's in your earnings now, and a receipt is in your email.`,
    href: "/independent/wallet",
    kind: "payments",
  });
}

/** The ledger row alone — for callers that write their own notification (dispute rulings). */
export function recordLedger(p: Omit<LivePayment, "id" | "date" | "at">) {
  refresh();
  write({ ...snapshot, payments: [{ ...p, id: uid(), date: today(), at: dayStamp() }, ...snapshot.payments] });
}

/** A notification, before it's stamped and filed. */
type NoteDraft = { title: string; body: string; href: string; kind: NoteCategory; avatar?: string; initials?: string; system?: boolean };

/** `draft` at the top of `side`'s feed, unread, stamped now. */
function withNote(side: Side, draft: NoteDraft): Pick<Live, "team" | "independent"> {
  const note = { id: uid(), group: "Today" as const, time: clock(), at: Date.now(), unread: true, ...draft };
  if (side === "independent") return { team: snapshot.team, independent: [note satisfies IndNote, ...snapshot.independent].slice(0, MAX_NOTES) };
  // Anything that isn't Hireable's own notice is the Independent's doing, unless it says whose.
  const face = note.system ? note : { ...note, avatar: note.avatar ?? PAIR.independent.avatar };
  return { team: [face satisfies TeamNote, ...snapshot.team].slice(0, MAX_NOTES), independent: snapshot.independent };
}

/**
 * Whose face a notice wears: Hireable's own (a reminder, an expiry, a ruling) its category's icon; on
 * the talent's side the Team Builder's are the company's (its logo, or its initials until it has one);
 * anyone else's, their photo (Hireable support's).
 */
const faceOf = (side: Side, n: { avatar?: string; system?: boolean }) =>
  n.system ? { system: true } : side === "independent" && (!n.avatar || n.avatar === PAIR.team.avatar) ? { initials: PAIR.team.initials } : { avatar: n.avatar };

/**
 * A notification that isn't a pipeline movement (a payment, a dispute, a contract reminder). It's
 * logged in the thread for `side` only, and the notification, like the entry's View details, opens `href`.
 * `system` marks Hireable's own notices, which show their type's icon rather than a face (faceOf).
 */
export function notify(side: Side, n: { title: string; body: string; href: string; avatar?: string; kind?: NoteCategory; system?: boolean }) {
  refresh();
  const other: Side = side === "team" ? "independent" : "team";
  const { chat } = withEvent(other, { text: n.title, href: { [side]: n.href }, only: side });
  write({ ...snapshot, chat, ...withNote(side, { title: n.title, body: n.body, href: n.href, kind: n.kind ?? "payments", ...faceOf(side, n) }) });
}

/** The saved company profile `savedLogo` was read from, so an unchanged one isn't parsed again. */
let companyRaw: string | null | undefined;
let savedLogo: string | null = null;

/**
 * The company's uploaded logo (a data URL), read from the Team Builder's saved company profile, or
 * null until it has one: the talent's feed shows it on the company's notices. Null on the server.
 */
export function storedCompanyLogo(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}team.company`);
    if (raw !== companyRaw) {
      companyRaw = raw;
      const logo = raw ? (JSON.parse(raw) as { logo?: unknown }).logo : null;
      savedLogo = typeof logo === "string" && logo ? logo : null;
    }
    return savedLogo;
  } catch {
    return null;
  }
}

/** The one engagement's id in both portals (DEAL_ID): its application, its tracker card. */
const DEAL = "deal";

/** What a movement is filed under in both feeds, by what the person does next. */
function categoryOfMove(kind: MoveKind): NoteCategory {
  if (kind.startsWith("interview")) return "interviews";
  if (kind.startsWith("task") || kind === "evaluation_sent" || kind === "contract_ended") return "tasks";
  return "applications";
}

/**
 * Where a movement opens on each side, from its thread entry's View details: the thing it is about,
 * not one list for everything.
 */
function independentTarget(kind: MoveKind, slug: string, x?: MoveExtra): string {
  const application = `/independent/jobs/applications/${DEAL}`;
  switch (kind) {
    case "invite": // not an application yet — the posting is where they apply
      return `/independent/jobs/${slug}`;
    // An offer opens in its dialog: over the application, or over the contract for a post-trial one.
    case "offer_sent":
      return `${application}?offer=1`;
    // The talent's contract lives under the role's slug; callers pass it (see the team store).
    case "hire_offer":
      return `/independent/contracts/${slug}?offer=open`;
    // The talent's own answer to it, and its withdrawal, open the contract it was about, not the trial's application.
    case "hire_withdrawn":
    case "hire_accepted":
    case "hire_declined":
      return `/independent/contracts/${slug}`;
    case "evaluation_sent": // it says to read it on the Evaluation tab, so that is where it opens
      return `/independent/contracts/${slug}?tab=evaluation`;
    // A proposal's steps open the proposal itself, over the application.
    case "proposal_sent":
    case "proposal_revision":
    case "proposal_declined":
      return `${application}?proposal=1`;
    default:
      // Interviews, proposals and offers are on the application; tasks and the contract ending on the contract.
      return categoryOfMove(kind) === "tasks" ? `/independent/contracts/${slug}${x?.task ? `?task=${x.task.id}` : ""}` : application;
  }
}

function teamTarget(kind: MoveKind, slug: string, x?: MoveExtra): string {
  const board = `/team/hire/roles/${slug}`;
  const contract = `/team/independents/${PAIR.independent.slug}`;
  switch (kind) {
    // The candidate's page: their application, and the interview card with its meeting link and Join call.
    case "applied":
    case "interview_accepted":
    case "interview_declined":
    case "interview_reschedule":
    case "offer_declined": // the offer is on the candidate's page now (#393)
      return `${board}/candidates/${DEAL}`;
    // A proposal's steps open the proposal itself, over the candidate's page.
    case "proposal_sent":
    case "proposal_revision":
    case "proposal_declined":
      return `${board}/candidates/${DEAL}?proposal=1`;
    // The offer as it was sent, in its dialog over the candidate's page (#317).
    case "offer_sent":
    case "offer_withdrawn":
      return `${board}/candidates/${DEAL}?offer=1`;
    case "task_submitted":
      return `${contract}${x?.task ? `?task=${x.task.id}` : ""}`;
    case "offer_accepted":
    case "hire_accepted":
    case "hire_declined":
      return contract;
    default: // withdrawn: they've left the pipeline, so the board
      return board;
  }
}

/** Movements the company makes as a company, which the talent's feed shows with its initials rather than a person's photo. */
const FROM_COMPANY = new Set<MoveKind>(["invite", "proposal_declined", "offer_sent", "offer_withdrawn", "contract_ended", "hire_offer", "hire_withdrawn"]);

/**
 * Record a movement: it's logged in the thread both sides share, with where each side opens it, and
 * the OTHER side gets the notification the spec says, which opens the item itself (TB-007 / IN-007).
 */
export function move(kind: MoveKind, role: { slug: string; title: string }, extra?: MoveExtra) {
  refresh();
  const m = MOVES[kind];
  const from: Side = m.to === "team" ? "independent" : "team";
  const href = { team: teamTarget(kind, role.slug, extra), independent: independentTarget(kind, role.slug, extra) };
  const logged = withEvent(from, { text: LOG[kind](role.title, extra), href, slot: extra?.slot }).chat;
  // What the mover wrote with it follows the entry as their message; the notification already quotes it.
  const chat = extra?.message ? [...logged, { id: uid(), from, text: extra.message, time: clock(), at: Date.now(), source: extra.source }] : logged;
  const face = m.to === "team" ? { avatar: PAIR.independent.avatar } : FROM_COMPANY.has(kind) ? { initials: PAIR.team.initials } : { avatar: PAIR.team.avatar };
  write({ ...snapshot, chat, ...withNote(m.to, { title: m.title(role.title, extra), body: m.body(role.title, extra), href: href[m.to], kind: categoryOfMove(kind), ...face }) });
}

/** A comment for a notification: one line, cut at a word — the item has the rest. */
const excerpt = (text: string, max = 140) => {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length <= max ? line : `${line.slice(0, max).replace(/\s+\S*$/, "")}…`;
};

/** Where a work item opens on each side: its contract's Work tab, with the item's sheet open. */
export const taskHref = (side: Side, roleSlug: string, taskId: string) => `${side === "independent" ? `/independent/contracts/${roleSlug}` : `/team/independents/${PAIR.independent.slug}`}?task=${encodeURIComponent(taskId)}`;

/**
 * TB-065 / IN-043 — a comment on a work item tells the side that didn't write it, and opens the
 * item on its comments. Another comment on the same item while that notification is still unread
 * replaces it with the newest, the way messages collapse, so a back-and-forth doesn't flood the feed.
 */
export function noteComment(from: Side, role: { slug: string; title: string }, task: { id: string; title: string }, text: string) {
  refresh();
  const to: Side = from === "team" ? "independent" : "team";
  const href = `${taskHref(to, role.slug, task.id)}&focus=comments`;
  const note = { id: uid(), group: "Today" as const, title: `${PAIR[from].name} commented on a task`, body: `On “${task.title}” for ${role.title}: “${excerpt(text)}”`, time: clock(), at: Date.now(), unread: true, href, avatar: PAIR[from].avatar };
  const fresh = (n: { unread: boolean; href: string }) => !(n.unread && n.href === href);
  if (to === "independent") {
    write({ ...snapshot, independent: [{ ...note, kind: "tasks" } satisfies IndNote, ...snapshot.independent.filter(fresh)].slice(0, MAX_NOTES) });
    return;
  }
  write({ ...snapshot, team: [{ ...note, kind: "tasks" } satisfies TeamNote, ...snapshot.team.filter(fresh)].slice(0, MAX_NOTES) });
}

function markRead(side: Side, noteId?: string) {
  refresh();
  const feed = snapshot[side].map((n) => (noteId === undefined || n.id === noteId ? { ...n, unread: false } : n));
  write({ ...snapshot, [side]: feed } as Live);
}

/** These notifications read, or unread again, on `side`'s feed: from a row's menu, or the ones picked in Select. */
function markNotes(side: Side, ids: string[], unread: boolean) {
  refresh();
  const these = new Set(ids);
  const feed = snapshot[side].map((n) => (these.has(n.id) && n.unread !== unread ? { ...n, unread } : n));
  write({ ...snapshot, [side]: feed } as Live);
}

/** One notification, as either side's feed keeps it. */
type Note = Live[Side][number];

/** Notifications taken out of a feed, each with where it was, for an Undo. */
type Deleted = { note: Note; index: number }[];

/**
 * Deleting takes these notifications out of `side`'s feed only (each side keeps its own), their unread
 * with them, so the counts drop at once. It hands back how many went, and how to put them back for the
 * toast's Undo; nothing when none of them was there.
 */
function deleteNotes(side: Side, ids: string[]): { count: number; undo: () => void } | undefined {
  refresh();
  const these = new Set(ids);
  const feed: Note[] = snapshot[side];
  const gone: Deleted = feed.flatMap((note, index) => (these.has(note.id) ? [{ note, index }] : []));
  if (!gone.length) return;
  write({ ...snapshot, [side]: feed.filter((n) => !these.has(n.id)) } as Live);
  return { count: gone.length, undo: () => restoreNotes(side, gone) };
}

/**
 * Undo: the notifications back as they were, each in its place by when it happened, since newer ones
 * may have come in meanwhile. A record without a time goes back where it was.
 */
function restoreNotes(side: Side, gone: Deleted) {
  refresh();
  let feed: Note[] = snapshot[side];
  for (const { note, index } of gone) {
    if (feed.some((n) => n.id === note.id)) continue;
    const when = note.at;
    const older = when === undefined ? -1 : feed.findIndex((n) => n.at !== undefined && n.at < when);
    const at = when === undefined ? Math.min(index, feed.length) : older < 0 ? feed.length : older;
    feed = [...feed.slice(0, at), note, ...feed.slice(at)];
  }
  write({ ...snapshot, [side]: feed.slice(0, MAX_NOTES) } as Live);
}

/**
 * TB-006 / IN-006 — empty messages cannot be sent.
 * TB-007 / IN-007 — a new message triggers a notification for the receiver. Consecutive
 * messages collapse into the one unread entry so a back-and-forth doesn't flood the feed.
 */
export function sendChat(from: Side, text: string, source?: ChatSource, files: Attachment[] = []): string | undefined {
  const body = text.trim();
  if (!body && !files.length) return;
  refresh();
  const id = uid();
  const chat = [...snapshot.chat, { id, from, ...(body ? { text: body } : {}), ...(files.length ? { files } : {}), time: clock(), at: Date.now(), source }];
  write({ ...snapshot, chat, seen: { ...snapshot.seen, [from]: chat.length } });
  // A task's link pasted in reads there as the task's number and name, not its address.
  noteMessage(from, body ? readableRefs(body, readDeal()?.contract?.tasks ?? []) : filesNote(files));
  return id;
}

/**
 * Raise the "new message" notification for the OTHER side (TB-007 / IN-007). Consecutive
 * messages collapse into the one unread entry so a back-and-forth doesn't flood the feed.
 */
function noteMessage(from: Side, body: string) {
  refresh();
  const to: Side = from === "team" ? "independent" : "team";
  const sender = from === "team" ? PAIR.team.name : independentNow();
  if (snapshot[to].some((n) => n.unread && n.title.startsWith("New message"))) return;

  if (to === "independent") {
    const note: IndNote = { id: uid(), group: "Today", title: `New message from ${sender}`, body, time: clock(), at: Date.now(), unread: true, kind: "messages", href: "/independent/messages", avatar: PAIR.team.avatar };
    write({ ...snapshot, independent: [note, ...snapshot.independent].slice(0, MAX_NOTES) });
    return;
  }
  const note: TeamNote = {
    id: uid(),
    group: "Today",
    title: `New message from ${sender}`,
    body,
    time: clock(),
    at: Date.now(),
    unread: true,
    kind: "messages",
    avatar: PAIR.independent.avatar,
    href: "/team/messages",
  };
  write({ ...snapshot, team: [note, ...snapshot.team].slice(0, MAX_NOTES) });
}

/** TB-008 / IN-008 — the count clears when the conversation is opened, along with its notification. */
export function openChat(side: Side) {
  refresh();
  const feed = snapshot[side].map((n) => (n.unread && n.title.startsWith("New message") ? { ...n, unread: false } : n));
  const stale = feed.some((n, i) => n !== snapshot[side][i]);
  if (snapshot.seen[side] === snapshot.chat.length && !stale) return;
  write({ ...snapshot, seen: { ...snapshot.seen, [side]: snapshot.chat.length }, [side]: feed } as Live);
}

/**
 * TB-008 / IN-008 — has `other` seen the message at `index`? Drives the read tick, which is a
 * receipt for your own message, not decoration on every row.
 */
export function readBy(live: Live, other: Side, index: number) {
  return (live.seen[other] ?? 0) > index;
}

/** Unread messages waiting for `side`. */
export function unreadChat(live: Live, side: Side) {
  return live.chat.slice(live.seen[side] ?? 0).filter((m) => m.from !== side && !m.event).length;
}

/**
 * Wipe every demo key and start over — the escape hatch once localStorage holds a messy run.
 * Lands on `to` when given (a portal's dashboard); otherwise the page just reloads.
 */
export function resetDemo(to?: string) {
  try {
    for (const k of Object.keys(localStorage).filter((k) => k.startsWith(PREFIX))) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
  if (to) location.assign(to);
  else location.reload();
}

/* ------------------------------------------------- per-portal persistence */

/** A value kept by `persisted`: `get` and `set` anywhere, `useStored` in render. */
export type Stored<T> = { get: () => T; set: (next: T | ((prev: T) => T)) => void; subscribe: (fn: () => void) => () => void; seed: () => T };

/**
 * A value one portal keeps in this browser (its roles, cards, applications): one copy for the tab,
 * shared by every page that reads it, so an action can run anywhere and every reader sees it. The
 * server and the hydrating render get the seed, then the saved value.
 *
 * Storage is read again whenever the portal takes the value up afresh — its first reader
 * subscribing — because other pages write these keys directly: the quiz its answers, sign-up the
 * profile. That is when a portal's provider used to remount and read them. No cross-tab sync;
 * that's what `useLive` is for.
 */
export function persisted<T>(key: string, seed: T): Stored<T> {
  const storeKey = PREFIX + key;
  const subscribers = new Set<() => void>();
  let value = seed;
  let raw: string | null = null;
  let loaded = false;
  const get = () => {
    if (loaded || typeof window === "undefined") return value;
    loaded = true;
    try {
      const now = localStorage.getItem(storeKey);
      // The same text keeps the same object, so an unchanged value doesn't redraw its readers.
      if (now !== raw) {
        raw = now;
        value = now ? (JSON.parse(now) as T) : seed;
      }
    } catch {
      /* private mode: the tab keeps what it has */
    }
    return value;
  };
  const set = (next: T | ((prev: T) => T)) => {
    value = typeof next === "function" ? (next as (prev: T) => T)(get()) : next;
    try {
      raw = JSON.stringify(value);
      localStorage.setItem(storeKey, raw);
    } catch {
      /* ignore */
    }
    for (const fn of subscribers) fn();
  };
  const subscribe = (fn: () => void) => {
    if (!subscribers.size) loaded = false;
    subscribers.add(fn);
    return () => void subscribers.delete(fn);
  };
  return { get, set, subscribe, seed: () => seed };
}

export function useStored<T>(store: Stored<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.seed);
}

/**
 * A portal's notifications: marking one read (or all of them, with no id), marking some read or unread
 * again, and deleting some, which hands back how many went and their Undo.
 */
export function useNotifications<S extends Side>(side: S) {
  const notifications: Live[S] = useLive()[side];
  return {
    notifications,
    markRead: (id?: string) => markRead(side, id),
    mark: (ids: string[], unread: boolean) => markNotes(side, ids, unread),
    remove: (ids: string[]) => deleteNotes(side, ids),
  };
}
