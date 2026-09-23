"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { dayStamp, today } from "@/lib/demo/dates";
import { notifications as indSeed } from "@/lib/independent/data";
import type { Notification as IndNote } from "@/lib/independent/data";
import { notifications as teamSeed } from "@/lib/team/data";
import type { Notification as TeamNote } from "@/lib/team/data";

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

export type Side = "team" | "independent";

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
};

/* ----------------------------------------------------------- attachments */

/** TB-010 / IN-010 — what the composer accepts. */
export const ACCEPTED_FILES = ".pdf,.doc,.docx,.png,.jpg,.jpeg";
export const MAX_FILE_MB = 10;

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
let loaded = false;
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

function write(next: Live) {
  snapshot = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode / quota — the demo still works for this tab.
  }
  emit();
}

function subscribe(fn: () => void) {
  if (!loaded) {
    loaded = true;
    snapshot = parse(localStorage.getItem(KEY));
    emit();
  }
  subscribers.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    snapshot = parse(e.newValue); // the other tab moved — mirror it here
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    subscribers.delete(fn);
    window.removeEventListener("storage", onStorage);
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
  | "offer_sent" // TB-105 Send Trial Offer
  | "offer_updated" // TB-105 Edit a sent offer
  | "offer_withdrawn" // TB-105 Withdraw a sent offer
  | "objective_approved" // TB-109 Approve Completed Objective
  | "objective_rejected" // TB-110 Reject Completed Objective
  | "objective_revision" // TB-111 Request Objective Revision
  | "evaluation_sent" // TB-067 Send Evaluation
  | "contract_ended" // TB-071 End Contract
  | "fulltime_offer" // TB-072 Hire for Full-Time
  | "fulltime_withdrawn" // TB-072 Withdraw the full-time offer
  | "objective_assigned" // TB-075 Create Objective
  // Disputes (TB-073/093, IN-059/082) notify from @/lib/demo/disputes, which links to the dispute itself.
  | "applied" // IN-017 Apply to Role
  | "interview_accepted" // IN-070 Accept Interview Invitation
  | "proposal_sent" // IN-072 / IN-073 Submit or revise proposal
  | "offer_accepted" // IN-074 Accept Offer
  | "offer_declined" // IN-075 Decline Offer
  | "objective_update" // IN-026 Update Progress on an objective
  | "objective_done" // IN-077 Mark a default objective as done
  | "interview_declined" // IN-071 Decline an interview invitation
  | "fulltime_accepted" // IN-046 Accept the full-time offer
  | "fulltime_declined" // IN-046 Decline the full-time offer
  | "withdrawn"; // IN — withdraw application

const MOVES: Record<MoveKind, { to: Side; story: string; title: (role: string) => string; body: (role: string) => string }> = {
  invite: {
    to: "independent",
    story: "TB-017",
    title: () => `${PAIR.team.company} invited you to apply`,
    body: (r) => `You can now see the trial expectations for ${r}. Submit an application to be considered.`,
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
    body: (r) => `${PAIR.team.name} asked for your objectives, rate and timeline for ${r}.`,
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
    title: () => "Trial offer received",
    body: (r) => `${PAIR.team.company} sent you a trial offer for ${r}. Review the rate, duration and objectives.`,
  },
  offer_updated: {
    to: "independent",
    story: "TB-105",
    title: () => "Your offer was updated",
    body: (r) => `${PAIR.team.company} changed the terms of your ${r} offer. Review and sign the new version — the earlier one no longer applies.`,
  },
  offer_withdrawn: {
    to: "independent",
    story: "TB-105",
    title: () => "Offer withdrawn",
    body: (r) => `${PAIR.team.company} withdrew the ${r} offer. Your proposal stays with them and they can send a new one.`,
  },
  objective_approved: {
    to: "independent",
    story: "TB-109",
    title: () => "Objective approved",
    body: (r) => `${PAIR.team.name} approved your objective on ${r}. It is retired from the activity tracker and counts as achieved — your streak keeps running.`,
  },
  objective_rejected: {
    to: "independent",
    story: "TB-110",
    title: () => "Objective sent back",
    body: (r) => `${PAIR.team.name} rejected your submission on ${r} and left a reason. It is active again — revise and resubmit.`,
  },
  objective_revision: {
    to: "independent",
    story: "TB-111",
    title: () => "Revision requested on your update",
    body: (r) => `${PAIR.team.name} flagged your ${r} progress update with a reason code. Correct it and resubmit.`,
  },
  evaluation_sent: {
    to: "independent",
    story: "TB-067",
    title: () => "Your trial evaluation is in",
    body: (r) => `${PAIR.team.name} submitted the post-trial evaluation for ${r}. Your Trial Fit Score is now final.`,
  },
  contract_ended: {
    to: "independent",
    story: "TB-071",
    title: () => "Contract ended",
    body: (r) => `${PAIR.team.company} closed the ${r} engagement. The escrowed payment has been released to your payout method.`,
  },
  fulltime_offer: {
    to: "independent",
    story: "TB-072",
    title: () => "Full-time offer received",
    body: (r) => `${PAIR.team.company} wants to take you on full-time for ${r}. Review the salary, benefits and start date.`,
  },
  fulltime_withdrawn: {
    to: "independent",
    story: "TB-072",
    title: () => "Full-time offer withdrawn",
    body: (r) => `${PAIR.team.company} withdrew the full-time offer for ${r}. Your contract and its history are unchanged.`,
  },
  objective_assigned: {
    to: "independent",
    story: "TB-075",
    title: () => "New objective assigned",
    body: (r) => PAIR.team.name + " added an objective to your " + r + " contract. Commit to it from your tracker.",
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
    body: (r) => `Objectives, rate and timeline for ${r} are ready for review.`,
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
  objective_update: {
    to: "team",
    story: "IN-026",
    title: () => `${PAIR.independent.name} logged progress`,
    body: (r) => `A progress update on ${r} is waiting for your review.`,
  },
  objective_done: {
    to: "team",
    story: "IN-077",
    title: () => `${PAIR.independent.name} marked an objective as done`,
    body: (r) => `It sits at Pending approval on ${r} until you approve it or send it back.`,
  },
  interview_declined: {
    to: "team",
    story: "IN-071",
    title: () => `${PAIR.independent.name} declined the interview`,
    body: (r) => `They cannot make that slot for ${r}. Their application stays open — offer another time.`,
  },
  fulltime_accepted: {
    to: "team",
    story: "IN-046",
    title: () => `${PAIR.independent.name} accepted your full-time offer`,
    body: (r) => `${r} is now a full-time engagement. Assign objectives from the contract as the work goes on.`,
  },
  fulltime_declined: {
    to: "team",
    story: "IN-046",
    title: () => `${PAIR.independent.name} declined your full-time offer`,
    body: (r) => `The full-time offer for ${r} was turned down. The trial record stays on the contract.`,
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
 * all used to open My Applications or the role's tracker, so an approved objective or a full-time
 * offer landed on a hiring board with nothing on it to act on.
 */
function independentTarget(kind: MoveKind, slug: string): { href: string; kind: IndNote["kind"] } {
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
    case "offer_updated":
      return { href: `${application}/offer?updated=1`, kind: "offers" };
    case "offer_withdrawn":
      return { href: application, kind: "offers" };
    // The talent's contract lives under the role's slug; callers pass it (see the team store).
    case "fulltime_offer":
      return { href: `/independent/contracts/${slug}/offer`, kind: "offers" };
    case "fulltime_withdrawn":
      return { href: `/independent/contracts/${slug}`, kind: "offers" };
    default: // objectives, the evaluation, the contract ending — all on the contract
      return { href: `/independent/contracts/${slug}`, kind: "contracts" };
  }
}

function teamTarget(kind: MoveKind, slug: string): string {
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
    case "offer_accepted":
    case "fulltime_accepted":
    case "fulltime_declined":
    case "objective_update":
    case "objective_done":
      return contract;
    default: // applied, withdrawn — the board
      return board;
  }
}

/** Record a movement. Emits the notification the spec says the OTHER side should get. */
export function move(kind: MoveKind, role: { slug: string; title: string }) {
  const m = MOVES[kind];
  if (m.to === "independent") {
    const target = independentTarget(kind, role.slug);
    const note: IndNote = {
      id: uid(),
      group: "Today",
      title: m.title(role.title),
      body: m.body(role.title),
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
    title: m.title(role.title),
    body: m.body(role.title),
    time: clock(),
    at: Date.now(),
    unread: true,
    kind: "hiring",
    avatar: PAIR.independent.avatar,
    href: teamTarget(kind, role.slug),
  };
  write({ ...snapshot, team: [note, ...snapshot.team].slice(0, MAX_NOTES) });
}

export function markRead(side: Side, noteId?: string) {
  const feed = snapshot[side].map((n) => (noteId === undefined || n.id === noteId ? { ...n, unread: false } : n));
  write({ ...snapshot, [side]: feed } as Live);
}

/**
 * TB-006 / IN-006 — empty messages cannot be sent.
 * TB-007 / IN-007 — a new message triggers a notification for the receiver. Consecutive
 * messages collapse into the one unread entry so a back-and-forth doesn't flood the feed.
 */
export function sendChat(from: Side, text: string) {
  const body = text.trim();
  if (!body) return;
  const chat = [...snapshot.chat, { id: uid(), from, text: body, time: clock() }];
  write({ ...snapshot, chat, seen: { ...snapshot.seen, [from]: chat.length } });
  noteMessage(from, body);
}

/**
 * Raise the "new message" notification for the OTHER side (TB-007 / IN-007). Consecutive
 * messages collapse into the one unread entry so a back-and-forth doesn't flood the feed —
 * except a call, which always announces itself.
 */
function noteMessage(from: Side, body: string, force = false) {
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
export function sendFile(from: Side, file: File) {
  const msgId = uid();
  try {
    blobs.set(msgId, URL.createObjectURL(file));
  } catch {
    /* ignore — the bubble still renders, just without a live download */
  }
  const chat = [...snapshot.chat, { id: msgId, from, time: clock(), file: { name: file.name, meta: `${fileMeta(file)} · ${clock()}` } }];
  write({ ...snapshot, chat, seen: { ...snapshot.seen, [from]: chat.length } });
  noteMessage(from, `Sent an attachment: ${file.name}`);
}

/** TB-011 / IN-011 — share a meeting link; the other party is notified that the call started. */
export function startCall(from: Side) {
  const link = `https://meet.hireable.ph/${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`;
  const chat = [...snapshot.chat, { id: uid(), from, time: clock(), call: { link } }];
  write({ ...snapshot, chat, seen: { ...snapshot.seen, [from]: chat.length } });
  noteMessage(from, "Started a call — the meeting link is in your thread.", true);
  return link;
}

/** TB-008 / IN-008 — the count clears when the conversation is opened, along with its notification. */
export function openChat(side: Side) {
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

/**
 * `useState` that survives a refresh. Used for state only one portal cares about (roles,
 * applications, cards, payouts) — no cross-tab sync, that's what `useLive` is for.
 */
export function usePersisted<T>(key: string, seed: T) {
  const storeKey = PREFIX + key;
  const [value, setValue] = useState<T>(seed);

  // Hydration: the server renders the seed, so the stored value can only be adopted after mount.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore */
    }
  }, [storeKey]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) =>
      setValue((prev) => {
        const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          localStorage.setItem(storeKey, JSON.stringify(v));
        } catch {
          /* ignore */
        }
        return v;
      }),
    [storeKey],
  );

  return [value, update] as const;
}
