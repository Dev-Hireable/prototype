import type { JobType } from "../demo/job-types";

/**
 * A dispute as a case both parties work through in turns — the way Contra runs them.
 *
 *   - Whoever files states their claim; the other side then has five days to respond.
 *   - Once they have, it's Hireable support's turn to review. Support can put a question to one
 *     side, who then has five days to answer, and can extend a deadline before it runs out.
 *   - A turn that runs out closes the case for the other side, and the money moves as a ruling
 *     for them would.
 *   - At any point the two sides can settle between themselves: one proposes how to split the
 *     amount in question, the other accepts (the case closes and the money moves) or declines.
 *   - Everything lands on one timeline that both sides and support read.
 *
 * Pure — no React, no storage, relative imports only — so the rules run in unit tests. The store
 * (@/lib/demo/disputes) applies these steps, moves the money and sends the notifications.
 */

export const DAY = 86_400_000;
/** How long a party has to respond when it's their turn. */
export const TURN_DAYS = 5;
/** Hireable support's review target, in working days. */
export const SLA_DAYS = 5;
/** The reminder goes out when this little time is left on a turn. */
export const REMIND_BEFORE = DAY;

export type DisputeParty = "team" | "independent";
/** AD-032's statuses. The party lists (TB-091 / IN-080) use the same four. */
export type DisputeStatus = "Pending" | "Resolved" | "Rejected" | "Withdrawn";

/** A file on the case. The bytes live in the browser's file store; the record keeps what names them. */
export type Attachment = { id: string; name: string; type: string; size: number };

/** A party's move, with a hard deadline: `why` is their first response, or support asking them. */
export type PartyTurn = { who: DisputeParty; since: number; due: number; why: "respond" | "asked"; note?: string; reminded?: boolean };
export type Turn = PartyTurn | { who: "support"; since: number };

export type Proposal = {
  id: string;
  by: DisputeParty;
  at: number;
  /** Back to the Team Builder. */
  refund: number;
  /** To the Independent. */
  release: number;
  note?: string;
  /** `replaced` by a newer proposal from either side; `void` when the case closed another way. */
  state: "open" | "accepted" | "declined" | "replaced" | "void";
};

export type EntryKind = "filed" | "response" | "info" | "asked" | "extended" | "proposal" | "accepted" | "declined" | "missed" | "ruling" | "rejected" | "released" | "withdrawn" | "note";

/** One thing that happened on the case. */
export type Entry = {
  id: string;
  at: number;
  by: DisputeParty | "support" | "system";
  /** Who at Hireable, on support's entries. */
  name?: string;
  kind: EntryKind;
  text?: string;
  attachments?: Attachment[];
  link?: string;
  /** The proposal a proposal / accepted / declined entry is about. */
  proposal?: string;
  /** The party an asked / extended / missed / ruling entry is about. */
  to?: DisputeParty;
  due?: number;
};

export type Resolution = {
  /** A support ruling, a turn that ran out, the two sides' agreement, or no breach found. */
  kind: "ruling" | "default" | "agreement" | "rejected";
  favor?: DisputeParty;
  notes: string;
  at: number;
  /** AD-034 / AD-035 — a refund moves at once; a release to the Independent waits on support. */
  payment?: "refunded" | "awaiting release" | "released" | "split";
  /** What actually moved — never more than the escrow still held. */
  moved?: number;
  split?: { refund: number; release: number };
};

/** What the contract looked like when the dispute was filed — Admin's process check reads it. */
export type DisputeFacts = {
  started: string;
  ends: string;
  trialEnded: boolean;
  evaluation: boolean;
  /** Tasks approved (Done) out of the Independent's tasks on the contract. */
  tasksDone: number;
  tasksTotal: number;
  /** The same counts on disputes filed while contracts had objectives. */
  objectivesDone?: number;
  objectivesTotal?: number;
  escrowHeld: number;
  /** What was actually deposited into escrow; absent on disputes filed before it was recorded. */
  escrowFunded?: number;
};

export type Dispute = {
  id: string;
  /** The contract it is about — the same key on both sides. */
  contract: string;
  /** Each portal's own slug for that contract, so a row can open the right tracker. */
  links: { team: string; independent: string };
  title: string;
  type: JobType;
  rate: string;
  /** `slug` is the account's id under Admin → User management. */
  team: { name: string; company: string; slug: string };
  independent: { name: string; slug: string; avatar: string };
  filedBy: DisputeParty;
  at: number;
  reason: string;
  description: string;
  amount: number;
  /** A link given when filing — all that disputes filed before uploads could carry. */
  evidence?: string;
  attachments?: Attachment[];
  status: DisputeStatus;
  facts: DisputeFacts;
  /** Whose move it is, while the case is open. */
  turn?: Turn;
  /** Everything that happened on the case, oldest first. */
  entries: Entry[];
  proposals: Proposal[];
  resolution?: Resolution;
  /** The Hireable support person looking after it, once one has acted on it. */
  handler?: string;
  updated: number;
  /** When Admin last opened it. Anything newer badges the Disputes nav. */
  adminSeen?: number;
};

/* ------------------------------------------------------------- reading */

export const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const otherParty = (p: DisputeParty): DisputeParty => (p === "team" ? "independent" : "team");
/** How each side is named: the Team Builder by company, the Independent by name. */
export const partyName = (d: Pick<Dispute, "team" | "independent">, p: DisputeParty) => (p === "team" ? d.team.company : d.independent.name);
export const isOpen = (d: Pick<Dispute, "status">) => d.status === "Pending";
/** The party whose move it is, with their deadline — null while it's support's turn or closed. */
export const partyTurn = (d: Pick<Dispute, "status" | "turn">): PartyTurn | null => (isOpen(d) && d.turn && d.turn.who !== "support" ? d.turn : null);
/** Who the case is waiting on: a party, Hireable support, or nobody once it's closed. */
export const waitingOn = (d: Pick<Dispute, "status" | "turn">): DisputeParty | "support" | null => (isOpen(d) ? (d.turn?.who ?? "support") : null);
export const openProposal = (d: Pick<Dispute, "proposals">) => d.proposals.find((p) => p.state === "open") ?? null;

/** "5 days left", "1 day left", "7 hours left", "less than an hour left", "Overdue". */
export function leftLabel(due: number, now: number): string {
  const ms = due - now;
  if (ms <= 0) return "Overdue";
  const days = Math.floor(ms / DAY);
  if (days >= 1) return `${days} ${days === 1 ? "day" : "days"} left`;
  const hours = Math.floor(ms / 3_600_000);
  return hours >= 1 ? `${hours} ${hours === 1 ? "hour" : "hours"} left` : "Less than an hour left";
}

/** What each party can do on the case right now. */
export function partyCan(d: Dispute, party: DisputeParty, now: number) {
  const open = isOpen(d);
  const turn = partyTurn(d);
  const mine = !!turn && turn.who === party && now < turn.due;
  const proposal = openProposal(d);
  return {
    /** It's their turn: their answer hands the case to support. */
    respond: open && mine,
    /** Not their turn, but they can still add what support should see. */
    add: open && !mine && !(turn?.who === party),
    propose: open,
    /** A proposal from the other side is waiting on them. */
    answer: open && !!proposal && proposal.by !== party ? proposal : null,
    withdraw: open && d.filedBy === party,
  };
}

/** A proposal's two parts must be real amounts that add up to the amount in question, to the cent. */
export function checkSplit(amount: number, refund: number, release: number): string | null {
  if (![refund, release].every((n) => Number.isFinite(n) && n >= 0)) return "Enter amounts of $0.00 or more.";
  const cents = (n: number) => Math.round(n * 100);
  if (cents(refund) + cents(release) !== cents(amount)) return `The two parts have to add up to ${usd(amount)}, the amount in question.`;
  return null;
}

/** The outcome in one line, or null while there isn't one. */
export function outcomeOf(d: Dispute): string | null {
  const r = d.resolution;
  if (d.status === "Rejected") return "Rejected — the agreed process was followed";
  if (d.status !== "Resolved" || !r) return null;
  if (r.kind === "agreement" && r.split) return `Settled by agreement · ${usd(r.split.refund)} back to ${d.team.company} · ${usd(r.split.release)} to ${d.independent.name}`;
  const winner = r.favor ?? "independent";
  const money =
    r.payment === "refunded"
      ? `${usd(r.moved ?? d.amount)} refunded to ${d.team.company}`
      : r.payment === "released"
        ? `${usd(r.moved ?? d.amount)} released to ${d.independent.name}`
        : `${usd(d.amount)} to be released to ${d.independent.name}`;
  if (r.kind === "default") return `Closed for ${partyName(d, winner)} — ${partyName(d, otherParty(winner))} didn't respond in time · ${money}`;
  return `Resolved in favor of ${partyName(d, winner)} · ${money}`;
}

/* --------------------------------------------------------------- steps */

/** A notification for one party; `from` is who it reads as coming from. */
export type DisputeNotice = { to: DisputeParty; from: DisputeParty | "support" | "system"; title: string; body: string };
export type Money = { refund: number; release: number };
export type Step = { ok: true; next: Dispute; notices: DisputeNotice[]; money?: Money };
export type Refusal = { ok: false; error: string };

export type Ctx = {
  now: number;
  /** How a moment reads in a notice: "Tue 30 Sep 2026, 9:00 AM". */
  when: (ms: number) => string;
  /** The Hireable support person acting. */
  handler?: string;
  /** What the contract's escrow still holds; money never moves beyond it. Absent: no escrow to cap. */
  held?: number;
};

export type Say = { text: string; attachments?: Attachment[]; link?: string };
export type NewDispute = Pick<Dispute, "id" | "contract" | "links" | "title" | "type" | "rate" | "team" | "independent" | "filedBy" | "reason" | "description" | "amount" | "evidence" | "attachments" | "facts">;

const refuse = (error: string): Refusal => ({ ok: false, error });

function withEntry(d: Dispute, e: Omit<Entry, "id">, now: number): Dispute {
  const entry: Entry = { ...e, id: `${e.kind}-${e.at.toString(36)}-${d.entries.length}` };
  return { ...d, entries: [...d.entries, entry], updated: now };
}

/** Every proposal still open is off the table once the case closes another way. */
const voidOpen = (ps: Proposal[]): Proposal[] => ps.map((p) => (p.state === "open" ? { ...p, state: "void" } : p));

/** What a ruling or a lapsed turn for `favor` moves right away: a refund does; a release waits on support. */
function moneyFor(d: Dispute, favor: DisputeParty, held: number | undefined): { money?: Money; payment: Resolution["payment"]; moved?: number } {
  if (favor === "independent") return { payment: "awaiting release" };
  const refund = Math.min(d.amount, held ?? d.amount);
  return { money: { refund, release: 0 }, payment: "refunded", moved: refund };
}

const clean = (s: Say): Say => ({ text: s.text.trim(), attachments: s.attachments?.length ? s.attachments : undefined, link: s.link?.trim() || undefined });

/** TB-073 / TB-118 / IN-059 — a new case: the claim goes on the timeline and the other side's turn starts. */
export function openCase(input: NewDispute, ctx: Ctx): Step {
  const { now } = ctx;
  const them = otherParty(input.filedBy);
  const turn: PartyTurn = { who: them, since: now, due: now + TURN_DAYS * DAY, why: "respond" };
  const base: Dispute = { ...input, attachments: input.attachments?.length ? input.attachments : undefined, at: now, status: "Pending", turn, entries: [], proposals: [], updated: now };
  const next = withEntry(base, { at: now, by: input.filedBy, kind: "filed", text: input.description, attachments: base.attachments, link: input.evidence }, now);
  const by = partyName(next, input.filedBy);
  return {
    ok: true,
    next,
    notices: [
      {
        to: them,
        from: input.filedBy,
        title: `${by} filed a dispute`,
        body: `${by} raised a dispute on the ${input.title} contract over ${usd(input.amount)} (${input.reason}). You have until ${ctx.when(turn.due)} to respond — if you don't, it closes in their favor.`,
      },
    ],
  };
}

/** It's `party`'s turn: their answer goes on the timeline and the case moves to support. */
export function respond(d: Dispute, party: DisputeParty, say: Say, ctx: Ctx): Step | Refusal {
  const t = partyTurn(d);
  if (!t || t.who !== party) return refuse("It isn't your turn to respond.");
  if (ctx.now >= t.due) return refuse("The time to respond has run out.");
  const s = clean(say);
  if (!s.text) return refuse("Write your response before sending it.");
  const next = withEntry({ ...d, turn: { who: "support", since: ctx.now } }, { at: ctx.now, by: party, kind: "response", ...s }, ctx.now);
  const name = partyName(d, party);
  return {
    ok: true,
    next,
    notices: [{ to: otherParty(party), from: party, title: `${name} responded to the dispute`, body: `${name} answered on the ${d.title} dispute. Hireable support is reviewing it now — you can read their response on the case.` }],
  };
}

/** Either side adds what support should see, without it being their turn. */
export function addInfo(d: Dispute, party: DisputeParty, say: Say, ctx: Ctx): Step | Refusal {
  if (!isOpen(d)) return refuse("This dispute is closed.");
  if (partyTurn(d)?.who === party) return refuse("It's your turn — respond instead.");
  const s = clean(say);
  if (!s.text) return refuse("Write something before sending it.");
  const next = withEntry(d, { at: ctx.now, by: party, kind: "info", ...s }, ctx.now);
  const name = partyName(d, party);
  return { ok: true, next, notices: [{ to: otherParty(party), from: party, title: `${name} added to the dispute`, body: `There's something new from ${name} on the ${d.title} dispute.` }] };
}

/** AD-033 — support puts a question to one side, who then has five days to answer. */
export function ask(d: Dispute, party: DisputeParty, note: string, ctx: Ctx): Step | Refusal {
  if (!isOpen(d)) return refuse("This dispute is closed.");
  const t = partyTurn(d);
  if (t) return refuse(`The case is waiting on ${partyName(d, t.who)} until ${ctx.when(t.due)}. Extend their deadline instead, or ask once they've responded.`);
  if (!note.trim()) return refuse("Say what you need.");
  const turn: PartyTurn = { who: party, since: ctx.now, due: ctx.now + TURN_DAYS * DAY, why: "asked", note: note.trim() };
  const next = withEntry({ ...d, turn, handler: d.handler ?? ctx.handler }, { at: ctx.now, by: "support", name: ctx.handler, kind: "asked", to: party, text: note.trim(), due: turn.due }, ctx.now);
  const name = partyName(d, party);
  const other = partyName(d, otherParty(party));
  return {
    ok: true,
    next,
    notices: [
      { to: party, from: "support", title: "Hireable support needs more information", body: `On the ${d.title} dispute: ${note.trim()} Respond by ${ctx.when(turn.due)} — if you don't, it closes in ${other}'s favor.` },
      { to: otherParty(party), from: "support", title: "Hireable support asked for more information", body: `Support asked ${name} for more on the ${d.title} dispute. There's nothing you need to do.` },
    ],
  };
}

/** Support gives the party whose turn it is more time — only before it has run out. */
export function extend(d: Dispute, days: number, ctx: Ctx): Step | Refusal {
  const t = partyTurn(d);
  if (!t) return refuse("Nobody is on a deadline right now.");
  if (ctx.now >= t.due) return refuse("That deadline has already passed.");
  if (!Number.isInteger(days) || days < 1 || days > TURN_DAYS) return refuse(`Extend by 1 to ${TURN_DAYS} days.`);
  const due = t.due + days * DAY;
  const next = withEntry({ ...d, turn: { ...t, due, reminded: false }, handler: d.handler ?? ctx.handler }, { at: ctx.now, by: "support", name: ctx.handler, kind: "extended", to: t.who, due }, ctx.now);
  const name = partyName(d, t.who);
  return {
    ok: true,
    next,
    notices: [
      { to: t.who, from: "support", title: "You have more time to respond", body: `Hireable support gave you until ${ctx.when(due)} to respond on the ${d.title} dispute.` },
      { to: otherParty(t.who), from: "support", title: "A deadline on your dispute moved", body: `Hireable support gave ${name} until ${ctx.when(due)} to respond on the ${d.title} dispute.` },
    ],
  };
}

/** Either side proposes how to split the amount in question. It replaces any proposal still open. */
export function propose(d: Dispute, party: DisputeParty, split: { refund: number; release: number; note?: string }, ctx: Ctx): Step | Refusal {
  if (!isOpen(d)) return refuse("This dispute is closed.");
  const bad = checkSplit(d.amount, split.refund, split.release);
  if (bad) return refuse(bad);
  const p: Proposal = { id: `p-${ctx.now.toString(36)}-${d.proposals.length}`, by: party, at: ctx.now, refund: split.refund, release: split.release, note: split.note?.trim() || undefined, state: "open" };
  const proposals = [...d.proposals.map((x) => (x.state === "open" ? { ...x, state: "replaced" as const } : x)), p];
  const next = withEntry({ ...d, proposals }, { at: ctx.now, by: party, kind: "proposal", proposal: p.id, text: p.note }, ctx.now);
  const name = partyName(d, party);
  return {
    ok: true,
    next,
    notices: [
      {
        to: otherParty(party),
        from: party,
        title: `${name} proposed a settlement`,
        body: `On the ${d.title} dispute: ${usd(p.refund)} back to ${d.team.company} and ${usd(p.release)} to ${d.independent.name}. Accept it to close the dispute, or decline and carry on.`,
      },
    ],
  };
}

/** The other side accepts the open proposal — the case closes and the money moves — or declines it. */
export function answer(d: Dispute, party: DisputeParty, accept: boolean, ctx: Ctx): Step | Refusal {
  const p = openProposal(d);
  if (!isOpen(d) || !p || p.by === party) return refuse("There's no proposal waiting on you.");
  const name = partyName(d, party);
  if (!accept) {
    const next = withEntry({ ...d, proposals: d.proposals.map((x) => (x.id === p.id ? { ...x, state: "declined" as const } : x)) }, { at: ctx.now, by: party, kind: "declined", proposal: p.id }, ctx.now);
    return { ok: true, next, notices: [{ to: p.by, from: party, title: `${name} declined your proposal`, body: `The ${d.title} dispute carries on. You can propose a different split, or wait for Hireable support.` }] };
  }
  // Never more than the escrow still holds: the refund first, then the release from what's left.
  const refund = Math.min(p.refund, ctx.held ?? p.refund);
  const release = Math.min(p.release, Math.max(0, (ctx.held ?? Infinity) - refund));
  const resolution: Resolution = { kind: "agreement", notes: `Both sides agreed to the settlement ${partyName(d, p.by)} proposed.`, at: ctx.now, payment: "split", moved: refund + release, split: { refund, release } };
  const next = withEntry(
    { ...d, status: "Resolved", turn: undefined, resolution, proposals: d.proposals.map((x) => (x.id === p.id ? { ...x, state: "accepted" as const } : x)) },
    { at: ctx.now, by: party, kind: "accepted", proposal: p.id },
    ctx.now,
  );
  const body = `The ${d.title} dispute is settled: ${usd(refund)} goes back to ${d.team.company} and ${usd(release)} to ${d.independent.name}.`;
  return { ok: true, next, money: { refund, release }, notices: (["team", "independent"] as const).map((to) => ({ to, from: party, title: "Dispute settled", body })) };
}

/** TB-093 / IN-082 — only the party who filed it, only while it's open. */
export function withdraw(d: Dispute, party: DisputeParty, ctx: Ctx): Step | Refusal {
  if (!isOpen(d) || d.filedBy !== party) return refuse("Only the party who filed an open dispute can withdraw it.");
  const next = withEntry({ ...d, status: "Withdrawn", turn: undefined, proposals: voidOpen(d.proposals) }, { at: ctx.now, by: party, kind: "withdrawn" }, ctx.now);
  const name = partyName(d, party);
  return { ok: true, next, notices: [{ to: otherParty(party), from: party, title: `${name} withdrew their dispute`, body: `The dispute on the ${d.title} contract is closed and the ${usd(d.amount)} hold is lifted.` }] };
}

/** A party's turn ran out: the case closes for the other side. Null while nothing has lapsed. */
export function expire(d: Dispute, ctx: Ctx): Step | null {
  const t = partyTurn(d);
  if (!t || ctx.now < t.due) return null;
  const loser = t.who;
  const winner = otherParty(loser);
  const { money, payment, moved } = moneyFor(d, winner, ctx.held);
  const lost = partyName(d, loser);
  const won = partyName(d, winner);
  const resolution: Resolution = { kind: "default", favor: winner, notes: `${lost} didn't respond by ${ctx.when(t.due)}, so the dispute closed in ${won}'s favor.`, at: ctx.now, payment, moved };
  const next = withEntry({ ...d, status: "Resolved", turn: undefined, resolution, proposals: voidOpen(d.proposals) }, { at: t.due, by: "system", kind: "missed", to: loser, due: t.due }, ctx.now);
  const line = winner === "team" ? `${usd(moved ?? d.amount)} is refunded to ${d.team.company}.` : `${usd(d.amount)} will be released to ${d.independent.name}.`;
  return {
    ok: true,
    next,
    money,
    notices: [
      { to: loser, from: "system", title: "The dispute closed — no response", body: `You didn't respond on the ${d.title} dispute by ${ctx.when(t.due)}, so it closed in ${won}'s favor. ${line}` },
      { to: winner, from: "system", title: "The dispute closed in your favor", body: `${lost} didn't respond on the ${d.title} dispute by ${ctx.when(t.due)}. ${line}` },
    ],
  };
}

/** A day before a turn runs out, the party whose turn it is hears about it — once. */
export function remind(d: Dispute, ctx: Ctx): Step | null {
  const t = partyTurn(d);
  if (!t || t.reminded || ctx.now >= t.due || t.due - ctx.now > REMIND_BEFORE) return null;
  return {
    ok: true,
    next: { ...d, turn: { ...t, reminded: true } },
    notices: [{ to: t.who, from: "system", title: "One day left to respond", body: `Respond on the ${d.title} dispute by ${ctx.when(t.due)}, or it closes in ${partyName(d, otherParty(t.who))}'s favor.` }],
  };
}

/** AD-034 — support rules for one side, with notes both read. */
export function rule(d: Dispute, favor: DisputeParty, notes: string, ctx: Ctx): Step | Refusal {
  if (!isOpen(d)) return refuse("This dispute is closed.");
  if (!notes.trim()) return refuse("Resolution notes are required.");
  const { money, payment, moved } = moneyFor(d, favor, ctx.held);
  const resolution: Resolution = { kind: "ruling", favor, notes: notes.trim(), at: ctx.now, payment, moved };
  const next = withEntry({ ...d, status: "Resolved", turn: undefined, resolution, handler: d.handler ?? ctx.handler, proposals: voidOpen(d.proposals) }, { at: ctx.now, by: "support", name: ctx.handler, kind: "ruling", to: favor, text: notes.trim() }, ctx.now);
  const line = favor === "team" ? `${usd(moved ?? d.amount)} is refunded to ${d.team.company}.` : `${usd(d.amount)} will be released to ${d.independent.name}.`;
  const body = `Hireable support ruled on the ${d.title} dispute. ${line} Notes: ${notes.trim()}`;
  return { ok: true, next, money, notices: (["team", "independent"] as const).map((to) => ({ to, from: "support" as const, title: `Dispute resolved in favor of ${partyName(d, favor)}`, body })) };
}

/** AD-033 — no breach of the agreed process, so no ruling for either side. The hold is lifted. */
export function reject(d: Dispute, notes: string, ctx: Ctx): Step | Refusal {
  if (!isOpen(d)) return refuse("This dispute is closed.");
  if (!notes.trim()) return refuse("Resolution notes are required.");
  const next = withEntry({ ...d, status: "Rejected", turn: undefined, resolution: { kind: "rejected", notes: notes.trim(), at: ctx.now }, handler: d.handler ?? ctx.handler, proposals: voidOpen(d.proposals) }, { at: ctx.now, by: "support", name: ctx.handler, kind: "rejected", text: notes.trim() }, ctx.now);
  const body = `Hireable support found the agreed process on the ${d.title} contract was followed, so the dispute is closed and the ${usd(d.amount)} hold is lifted. Notes: ${notes.trim()}`;
  return { ok: true, next, notices: (["team", "independent"] as const).map((to) => ({ to, from: "support" as const, title: "Dispute rejected", body })) };
}

/** AD-035 — pay out a case closed for the Independent, by ruling or by a turn the company let run out. */
export function release(d: Dispute, ctx: Ctx): Step | Refusal {
  const r = d.resolution;
  if (d.status !== "Resolved" || !r || r.favor !== "independent" || r.payment !== "awaiting release") return refuse("There's nothing waiting to be released on this dispute.");
  const moved = Math.min(d.amount, ctx.held ?? d.amount);
  const next = withEntry({ ...d, resolution: { ...r, payment: "released", moved } }, { at: ctx.now, by: "support", name: ctx.handler, kind: "released" }, ctx.now);
  return {
    ok: true,
    next,
    money: { refund: 0, release: moved },
    notices: [
      { to: "independent", from: "support", title: "Dispute payment released", body: `${usd(moved)} from the ${d.title} dispute has been released to you. It's in your earnings now.` },
      { to: "team", from: "support", title: "Dispute payment released", body: `${usd(moved)} was released to ${d.independent.name} ${d.type === "trial" ? `from the ${d.title} escrow` : "from the pay held for it"}.` },
    ],
  };
}

/* ------------------------------------------------------------ migration */

type Legacy = Dispute & {
  statements?: { at: number; from: DisputeParty; text: string; evidence?: string }[];
  timeline?: { at: number; event: string; actor: string }[];
  evidenceRequest?: unknown;
};

/** Timeline lines the new entries already say, so they aren't said twice. */
const SAID = /^(Dispute filed|Response added|More information added|.+ notified)$/;

/**
 * Disputes saved before cases had turns: the claim, each side's statements and support's log
 * become one timeline. An open one waits on support — it was filed with no deadline, so nobody
 * loses it by default under a rule that didn't exist yet.
 */
export function migrateDispute(raw: Legacy): Dispute {
  if (Array.isArray(raw.entries) && Array.isArray(raw.proposals)) return raw;
  const { statements = [], timeline = [], evidenceRequest: _gone, ...rest } = raw;
  const filed: Entry = { id: `filed-${raw.at.toString(36)}-0`, at: raw.at, by: raw.filedBy, kind: "filed", text: raw.description, link: raw.evidence };
  const entries: Entry[] = [
    filed,
    ...statements.map((s, i): Entry => ({ id: `said-${s.at.toString(36)}-${i}`, at: s.at, by: s.from, kind: s.from === raw.filedBy ? "info" : "response", text: s.text, link: s.evidence })),
    ...timeline
      .filter((e) => !SAID.test(e.event))
      .map((e, i): Entry => {
        const admin = e.actor.startsWith("admin");
        return { id: `note-${e.at.toString(36)}-${i}`, at: e.at, by: admin ? "support" : "system", name: admin ? e.actor.replace(/^admin:\s*/, "") : undefined, kind: "note", text: e.event };
      }),
  ].sort((a, b) => a.at - b.at);
  const resolution = raw.resolution ? { ...raw.resolution, kind: raw.resolution.kind ?? (raw.status === "Rejected" ? "rejected" : "ruling") } : undefined;
  return { ...rest, entries, proposals: [], resolution, turn: raw.status === "Pending" ? { who: "support", since: raw.updated ?? raw.at } : undefined };
}
