"use client";

import { useSyncExternalStore } from "react";
import { dayStamp, today } from "@/lib/portal/dates";
import type { Deal } from "@/lib/demo/deal";
import { JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import type { JobType } from "@/lib/contract/job-types";
import { notifications as indSeed } from "@/lib/independent/data";
import type { Notification as IndNote } from "@/lib/independent/data";
import { notifications as teamSeed } from "@/lib/team/data";
import type { Notification as TeamNote } from "@/lib/team/data";
import type { Side } from "@/lib/work/model";

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

export type ChatMsg = {
  id: string;
  from: Side;
  text?: string;
  time: string;
  file?: { name: string; meta: string };
  /** TB-011 / IN-011 — a meeting link shared in the thread. */
  call?: { link: string };
  /** Where it was written, when that wasn't the thread itself — the inbox links back to it. */
  source?: ChatSource;
};

/** TB-106 — a note left on a proposal's Activity pane, which both inboxes link back to. */
export type ChatSource = { kind: "proposal"; version: number; roleSlug: string; title: string };

/** Where a note written on the proposal came from, so both inboxes can link back to it. */
export const proposalSource = (deal: Deal | null): ChatSource | undefined => (deal?.proposal ? { kind: "proposal", version: deal.proposal.version, roleSlug: deal.roleSlug, title: deal.title } : undefined);

/* ----------------------------------------------------------- attachments */

/** TB-010 / IN-010 — what the composer accepts. */
export const ACCEPTED_FILES = ".pdf,.doc,.docx,.png,.jpg,.jpeg";
const MAX_FILE_MB = 10;

/**
 * Blob URLs for files attached this session, keyed by message id, so the recipient can download
 * from the thread. Only the name/size/type go into localStorage.
 * ponytail: in-memory, so a download link dies on refresh — fine until there's a real upload API.
 */
const blobs = new Map<string, string>();
export const fileUrl = (msgId: string) => blobs.get(msgId);

/** Returns an error string when the file fails the type/size rules, otherwise null. */
export function checkFile(file: File): string | null {
  const ok = /\.(pdf|docx?|png|jpe?g)$/i.test(file.name);
  if (!ok) return "Only PDF, DOC, DOCX, PNG and JPG files can be attached.";
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `Files must be ${MAX_FILE_MB} MB or smaller.`;
  return null;
}

export const fileMeta = (file: File) => `${file.name.split(".").pop()?.toUpperCase()} · ${(file.size / 1024).toFixed(0)} KB`;

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
    return { ...SEED, ...(JSON.parse(raw) as Live) };
  } catch {
    return SEED;
  }
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
 * Movements the sheet says are silent (TB-018 save, TB-022 unsave, TB-044 drop/undrop) are
 * deliberately absent from this table.
 */
export type MoveKind =
  | "invite" // TB-017 / TB-023 Invite Independent to Apply
  | "interview_invited" // TB-037 Candidate tracker → Interview
  | "interview_rescheduled" // TB-037 Interviews → Reschedule
  | "interview_cancelled" // TB-037 Interviews → Cancel interview
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
  | "interview_declined" // IN-071 Decline an interview invitation
  | "hire_accepted" // IN-084 Accept the post-trial offer
  | "hire_declined" // IN-084 Decline the post-trial offer
  | "withdrawn"; // IN — withdraw application

/** What a movement is about beyond the role: the task, the kind of role offered, the note sent with it. */
export type MoveExtra = { task?: { id: string; title: string }; type?: JobType; note?: string };

/** "Sales Manager full-time role" — the post-trial offer names the kind of role it is. */
const roleKind = (x?: MoveExtra) => (x?.type ? `${JOB_TYPE_LABEL[x.type].toLowerCase()} ` : "");
const taskName = (x?: MoveExtra) => (x?.task ? `“${x.task.title}”` : "a task");

const MOVES: Record<MoveKind, { to: Side; story: string; title: (role: string, x?: MoveExtra) => string; body: (role: string, x?: MoveExtra) => string }> = {
  invite: {
    to: "independent",
    story: "TB-017",
    title: () => `${PAIR.team.company} invited you to apply`,
    body: (r) => `You can now see the trial's tasks for ${r}. Submit an application to be considered.`,
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
    body: (r) => `${PAIR.team.name} moved your ${r} interview to a new time. Accept the new slot to confirm it.`,
  },
  interview_cancelled: {
    to: "independent",
    story: "TB-037",
    title: () => "Interview cancelled",
    body: (r) => `${PAIR.team.name} cancelled the ${r} interview. Your application stays open.`,
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
    body: (r, x) => `${PAIR.team.company} sent you ${x?.type === "trial" ? "a trial offer" : "an offer"} for ${r}. Review the terms and the tasks.`,
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
    body: (r, x) => `${PAIR.team.name} approved ${taskName(x)} on ${r}. It's Done.`,
  },
  task_changes: {
    to: "independent",
    story: "TB-110",
    title: () => "Changes requested on a task",
    body: (r, x) => `${PAIR.team.name} sent ${taskName(x)} on ${r} back. Make the changes and send it for review again.${x?.note ? ` Their note: “${x.note}”` : ""}`,
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
      x?.type && x.type !== "trial" ? `${PAIR.team.name} sent you an evaluation for ${r}. Read it on the contract's Evaluation tab.` : `${PAIR.team.name} submitted the post-trial evaluation for ${r}. Your Trial Fit Score is now final.`,
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
    body: () => `${PAIR.independent.name} applied. Open the tracker to review the match.`,
  },
  interview_accepted: {
    to: "team",
    story: "IN-070",
    title: () => `${PAIR.independent.name} accepted your interview invite`,
    body: (r) => `Interview confirmed for ${r}. The meeting link is on the candidate card.`,
  },
  proposal_sent: {
    to: "team",
    story: "IN-072",
    title: () => `${PAIR.independent.name} submitted a proposal`,
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
    title: () => `${PAIR.independent.name} declined your offer`,
    body: (r) => `The ${r} offer was turned down. The card stays in Sent Offers with a Declined status.`,
  },
  task_submitted: {
    to: "team",
    story: "IN-030",
    title: () => `${PAIR.independent.name} sent a task for review`,
    body: (r, x) => `${x?.task ? `“${x.task.title}”` : "A task"} on ${r} is In review until you approve it or ask for changes.${x?.note ? ` Their note: “${x.note}”` : ""}`,
  },
  interview_declined: {
    to: "team",
    story: "IN-071",
    title: () => `${PAIR.independent.name} declined the interview`,
    body: (r) => `They cannot make that slot for ${r}. Their application stays open — offer another time.`,
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
    title: () => `${PAIR.independent.name} withdrew their application`,
    body: (r) => `They are no longer in the running for ${r}.`,
  },
};

/**
 * IN-051 — record a payment against a contract. The independent is told in-app (and, in a real
 * build, by email — the notification says so), and the row lands in their ledger immediately.
 */
export function recordPayment(p: Omit<LivePayment, "id" | "date" | "at">) {
  recordLedger(p);
  notify("independent", {
    title: "Payment recorded",
    body: `${p.company} recorded ${p.amount} for ${p.title} — ${p.period}. A receipt has been emailed to you; the payment is in your earnings now.`,
    href: "/independent/wallet",
    kind: "payments",
  });
}

/** The ledger row alone — for callers that write their own notification (dispute rulings). */
export function recordLedger(p: Omit<LivePayment, "id" | "date" | "at">) {
  refresh();
  write({ ...snapshot, payments: [{ ...p, id: uid(), date: today(), at: dayStamp() }, ...snapshot.payments] });
}

/**
 * A notification that isn't a pipeline movement, with its own destination — a dispute has to open
 * the dispute, not the hiring tracker that MOVES points at.
 */
export function notify(
  side: Side,
  n: { title: string; body: string; href: string; avatar?: string; kind?: IndNote["kind"] & TeamNote["kind"] },
) {
  refresh();
  const kind = n.kind ?? "payments";
  if (side === "independent") {
    const note: IndNote = { id: uid(), group: "Today", title: n.title, body: n.body, time: clock(), at: Date.now(), unread: true, kind, href: n.href, avatar: n.avatar ?? PAIR.team.avatar };
    write({ ...snapshot, independent: [note, ...snapshot.independent].slice(0, MAX_NOTES) });
    return;
  }
  const note: TeamNote = {
    id: uid(),
    group: "Today",
    title: n.title,
    body: n.body,
    time: clock(),
    at: Date.now(),
    unread: true,
    kind,
    avatar: n.avatar ?? PAIR.independent.avatar,
    href: n.href,
  };
  write({ ...snapshot, team: [note, ...snapshot.team].slice(0, MAX_NOTES) });
}

/** The one engagement's id in both portals (DEAL_ID): its application, its tracker card. */
const DEAL = "deal";

/**
 * Where a movement's notification opens: the thing it is about, not one list for everything. They
 * all used to open My Applications or the role's tracker, so an approved task or a post-trial
 * offer landed on a hiring board with nothing on it to act on.
 */
function independentTarget(kind: MoveKind, slug: string, x?: MoveExtra): { href: string; kind: IndNote["kind"] } {
  const application = `/independent/jobs/applications/${DEAL}`;
  switch (kind) {
    case "invite": // not an application yet — the posting is where they apply
      return { href: `/independent/jobs/${slug}`, kind: "other" };
    case "interview_invited":
    case "interview_rescheduled":
    case "interview_cancelled":
      return { href: application, kind: "interviews" };
    case "proposal_requested":
    case "proposal_revision":
    case "proposal_declined":
      return { href: application, kind: "contracts" };
    case "offer_sent":
      return { href: `${application}/offer`, kind: "offers" };
    case "offer_withdrawn":
      return { href: application, kind: "offers" };
    // The talent's contract lives under the role's slug; callers pass it (see the team store).
    case "hire_offer":
      return { href: `/independent/contracts/${slug}/offer`, kind: "offers" };
    case "hire_withdrawn":
      return { href: `/independent/contracts/${slug}`, kind: "offers" };
    case "evaluation_sent": // it says to read it on the Evaluation tab, so that is where it opens
      return { href: `/independent/contracts/${slug}?tab=evaluation`, kind: "contracts" };
    default: // tasks, the contract ending — all on the contract, a task opened on its panel
      return { href: `/independent/contracts/${slug}${x?.task ? `?task=${x.task.id}` : ""}`, kind: "contracts" };
  }
}

function teamTarget(kind: MoveKind, slug: string, x?: MoveExtra): string {
  const board = `/team/hire/roles/${slug}`;
  const contract = `/team/independents/${PAIR.independent.slug}`;
  switch (kind) {
    case "interview_accepted":
    case "interview_declined":
      return `${board}?stage=interview`;
    case "proposal_sent":
      return `${board}/candidates/${DEAL}`;
    case "offer_declined":
      return "/team/hire/offers";
    case "task_submitted":
      return `${contract}${x?.task ? `?task=${x.task.id}` : ""}`;
    case "offer_accepted":
    case "hire_accepted":
    case "hire_declined":
      return contract;
    default: // applied, withdrawn — the board
      return board;
  }
}

/** Record a movement. Emits the notification the spec says the OTHER side should get. */
export function move(kind: MoveKind, role: { slug: string; title: string }, extra?: MoveExtra) {
  refresh();
  const m = MOVES[kind];
  if (m.to === "independent") {
    const target = independentTarget(kind, role.slug, extra);
    const note: IndNote = {
      id: uid(),
      group: "Today",
      title: m.title(role.title, extra),
      body: m.body(role.title, extra),
      time: clock(),
      at: Date.now(),
      unread: true,
      kind: target.kind,
      href: target.href,
      avatar: PAIR.team.avatar,
    };
    write({ ...snapshot, independent: [note, ...snapshot.independent].slice(0, MAX_NOTES) });
    return;
  }
  const note: TeamNote = {
    id: uid(),
    group: "Today",
    title: m.title(role.title, extra),
    body: m.body(role.title, extra),
    time: clock(),
    at: Date.now(),
    unread: true,
    // A task sent for review is about the person on the contract, not the hiring pipeline.
    kind: kind === "task_submitted" || kind === "hire_accepted" || kind === "hire_declined" ? "independents" : "hiring",
    avatar: PAIR.independent.avatar,
    href: teamTarget(kind, role.slug, extra),
  };
  write({ ...snapshot, team: [note, ...snapshot.team].slice(0, MAX_NOTES) });
}

/** A comment for a notification: one line, cut at a word — the item has the rest. */
const excerpt = (text: string, max = 140) => {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length <= max ? line : `${line.slice(0, max).replace(/\s+\S*$/, "")}…`;
};

/**
 * TB-065 / IN-043 — a comment on a work item tells the side that didn't write it, and opens the
 * item on its comments. Another comment on the same item while that notification is still unread
 * replaces it with the newest, the way messages collapse, so a back-and-forth doesn't flood the feed.
 */
export function noteComment(from: Side, role: { slug: string; title: string }, task: { id: string; title: string }, text: string) {
  refresh();
  const to: Side = from === "team" ? "independent" : "team";
  const at = `?task=${encodeURIComponent(task.id)}&focus=comments`;
  const href = to === "independent" ? `/independent/contracts/${role.slug}${at}` : `/team/independents/${PAIR.independent.slug}${at}`;
  const note = { id: uid(), group: "Today" as const, title: `${PAIR[from].name} commented on a task`, body: `On “${task.title}” for ${role.title}: “${excerpt(text)}”`, time: clock(), at: Date.now(), unread: true, href, avatar: PAIR[from].avatar };
  const fresh = (n: { unread: boolean; href: string }) => !(n.unread && n.href === href);
  if (to === "independent") {
    write({ ...snapshot, independent: [{ ...note, kind: "contracts" } satisfies IndNote, ...snapshot.independent.filter(fresh)].slice(0, MAX_NOTES) });
    return;
  }
  write({ ...snapshot, team: [{ ...note, kind: "independents" } satisfies TeamNote, ...snapshot.team.filter(fresh)].slice(0, MAX_NOTES) });
}

function markRead(side: Side, noteId?: string) {
  refresh();
  const feed = snapshot[side].map((n) => (noteId === undefined || n.id === noteId ? { ...n, unread: false } : n));
  write({ ...snapshot, [side]: feed } as Live);
}

/**
 * TB-006 / IN-006 — empty messages cannot be sent.
 * TB-007 / IN-007 — a new message triggers a notification for the receiver. Consecutive
 * messages collapse into the one unread entry so a back-and-forth doesn't flood the feed.
 */
export function sendChat(from: Side, text: string, source?: ChatSource): string | undefined {
  const body = text.trim();
  if (!body) return;
  refresh();
  const id = uid();
  const chat = [...snapshot.chat, { id, from, text: body, time: clock(), source }];
  write({ ...snapshot, chat, seen: { ...snapshot.seen, [from]: chat.length } });
  noteMessage(from, body);
  return id;
}

/**
 * Raise the "new message" notification for the OTHER side (TB-007 / IN-007). Consecutive
 * messages collapse into the one unread entry so a back-and-forth doesn't flood the feed —
 * except a call, which always announces itself.
 */
function noteMessage(from: Side, body: string, force = false) {
  refresh();
  const to: Side = from === "team" ? "independent" : "team";
  const sender = from === "team" ? PAIR.team.name : PAIR.independent.name;
  if (!force && snapshot[to].some((n) => n.unread && n.title.startsWith("New message"))) return;

  if (to === "independent") {
    const note: IndNote = { id: uid(), group: "Today", title: `New message from ${sender}`, body, time: clock(), at: Date.now(), unread: true, kind: "other", href: "/independent/messages", avatar: PAIR.team.avatar };
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
    kind: "independents",
    avatar: PAIR.independent.avatar,
    href: "/team/messages",
  };
  write({ ...snapshot, team: [note, ...snapshot.team].slice(0, MAX_NOTES) });
}

/** TB-010 / IN-010 — send an attachment; the recipient can download it from the thread. */
export function sendFile(from: Side, file: File, source?: ChatSource): string {
  refresh();
  const msgId = uid();
  try {
    blobs.set(msgId, URL.createObjectURL(file));
  } catch {
    /* ignore — the bubble still renders, just without a live download */
  }
  const chat = [...snapshot.chat, { id: msgId, from, time: clock(), file: { name: file.name, meta: `${fileMeta(file)} · ${clock()}` }, source }];
  write({ ...snapshot, chat, seen: { ...snapshot.seen, [from]: chat.length } });
  noteMessage(from, `Sent an attachment: ${file.name}`);
  return msgId;
}

/** TB-011 / IN-011 — share a meeting link; the other party is notified that the call started. */
export function startCall(from: Side) {
  refresh();
  const link = `https://meet.hireable.ph/${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`;
  const chat = [...snapshot.chat, { id: uid(), from, time: clock(), call: { link } }];
  write({ ...snapshot, chat, seen: { ...snapshot.seen, [from]: chat.length } });
  noteMessage(from, "Started a call — the meeting link is in your thread.", true);
  return link;
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
  return live.chat.slice(live.seen[side] ?? 0).filter((m) => m.from !== side).length;
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

/** A portal's notifications, and marking one read (or all of them, with no id). */
export function useNotifications<S extends Side>(side: S) {
  const notifications: Live[S] = useLive()[side];
  return { notifications, markRead: (id?: string) => markRead(side, id) };
}
