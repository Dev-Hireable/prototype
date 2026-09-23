"use client";

import { useSyncExternalStore } from "react";
import { dayLabel, momentLabel, parseDay } from "@/lib/demo/dates";
import { evaluationsOf, getDeal, isFullTime, settleEscrow } from "@/lib/demo/deal";
import type { Deal } from "@/lib/demo/deal";
import { notify, PAIR, recordLedger } from "@/lib/demo/live";

/**
 * Disputes, held where all three portals can see them.
 *
 * They used to be three unconnected lists — the Team Builder's, the Independent's and a static
 * one in Admin — so neither party saw a dispute raised against them, nothing reached Hireable
 * support, and nothing could ever be ruled on. Now there is one record per dispute, keyed by the
 * contract, and every portal reads it:
 *   - the party who filed it lists it under Sent, the other party under Received and on the
 *     contract's Contract & Payment tab (IN-032 / IN-046);
 *   - both can add their side while it is Pending — AD-033's "messages between parties";
 *   - Admin reviews it, asks for evidence, rules on it (AD-034) and releases the money (AD-035);
 *   - while it is open, the amount in question stays in escrow, so End Contract waits (TB-071).
 */

export type DisputeParty = "team" | "independent";
/** AD-032's statuses. The party lists (TB-091 / IN-080) use the same four. */
export type DisputeStatus = "Pending" | "Resolved" | "Rejected" | "Withdrawn";

export const DISPUTE_STATUSES: DisputeStatus[] = ["Pending", "Resolved", "Rejected", "Withdrawn"];
export const STATUS_TONE: Record<DisputeStatus, "warn" | "ok" | "danger" | "neutral"> = { Pending: "warn", Resolved: "ok", Rejected: "danger", Withdrawn: "neutral" };

/**
 * IN-059 — the four reason codes the sheet allows. The Team Builder's form (TB-073 / TB-118) names
 * none, so it uses the same four — the codes TB-111 already uses for revisions — and Admin filters
 * on one vocabulary instead of three.
 */
export const DISPUTE_REASONS = ["Missing Deliverable", "Out-of-Scope Output", "Missed Deadline", "No Report Submitted"];

/** Hireable reviews a dispute within five working days. */
export const SLA_DAYS = 5;
const ADMIN = "admin: Admin Lead";

export type DisputeEvent = { at: number; event: string; actor: string };
export type DisputeStatement = { at: number; from: DisputeParty; text: string; evidence?: string };
/** What the contract looked like when the dispute was filed — Admin's process check reads it. */
export type DisputeFacts = {
  started: string;
  ends: string;
  trialEnded: boolean;
  evaluation: boolean;
  objectivesDone: number;
  objectivesTotal: number;
  escrowHeld: number;
  /** What was actually deposited into escrow; absent on disputes filed before it was recorded. */
  escrowFunded?: number;
};

export type Dispute = {
  id: string;
  /** The contract it is about — the same key on both sides (see dealContract). */
  contract: string;
  /** Each portal's own slug for that contract, so a row can open the right tracker. */
  links: { team: string; independent: string };
  title: string;
  type: "trial" | "full-time";
  rate: string;
  /** `slug` is the account's id under Admin → User management. */
  team: { name: string; company: string; slug: string };
  independent: { name: string; slug: string; avatar: string };
  filedBy: DisputeParty;
  at: number;
  reason: string;
  description: string;
  amount: number;
  evidence?: string;
  status: DisputeStatus;
  facts: DisputeFacts;
  statements: DisputeStatement[];
  /** AD-033 — the last evidence request, shown to whoever it names until the dispute closes. */
  evidenceRequest?: { from: DisputeParty | "both"; note: string; at: number };
  resolution?: {
    /** Resolved in someone's favor; absent when Rejected (no breach of the agreed process). */
    favor?: DisputeParty;
    notes: string;
    at: number;
    /** AD-034 / AD-035 — for the Team Builder it refunds at once; for the independent it waits for Request Payment Release. */
    payment?: "refunded" | "awaiting release" | "released";
    /** What actually moved — never more than the escrow still held. */
    moved?: number;
  };
  timeline: DisputeEvent[];
  updated: number;
  /** When Admin last opened it. Anything newer badges the Disputes nav — TB-093 / IN-082's "admin is notified". */
  adminSeen?: number;
};

/* ------------------------------------------------------------------ store */

const KEY = "hireable.demo.disputes";
const EMPTY: Dispute[] = [];
let snapshot: Dispute[] = EMPTY;
let loaded = false;
const subscribers = new Set<() => void>();
const emit = () => {
  for (const fn of subscribers) fn();
};

function parse(raw: string | null): Dispute[] {
  try {
    const all = raw ? (JSON.parse(raw) as Dispute[]) : EMPTY;
    return Array.isArray(all) ? all : EMPTY;
  } catch {
    return EMPTY;
  }
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  snapshot = parse(localStorage.getItem(KEY));
}

function write(next: Dispute[]) {
  snapshot = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode — the demo still works for this tab */
  }
  emit();
}

function subscribe(fn: () => void) {
  ensureLoaded();
  subscribers.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    snapshot = parse(e.newValue); // the other portal, in another tab, moved it
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    subscribers.delete(fn);
    window.removeEventListener("storage", onStorage);
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
  ensureLoaded();
  return snapshot;
}

function patch(id: string, fn: (d: Dispute) => Dispute) {
  ensureLoaded();
  write(snapshot.map((d) => (d.id === id ? fn(d) : d)));
}

/* ------------------------------------------------------------ contracts */

/** The pair, as a dispute records them. */
const TEAM = { name: PAIR.team.name, company: PAIR.team.company, slug: "nairobi-solutions" };
const IND = { name: PAIR.independent.name, slug: PAIR.independent.slug, avatar: PAIR.independent.avatar };

export type ContractRef = { key: string; links: Dispute["links"]; title: string; type: "trial" | "full-time"; rate: string; started: string; ends: string };

/**
 * The live contract — the deal's trial, or the full-time engagement it became. Both trackers show
 * it, each under its own slug. The key stays the trial's, so a dispute follows the contract across
 * the conversion instead of detaching from it.
 */
export function dealContract(deal: Deal | null): ContractRef | null {
  if (!deal?.contract) return null;
  const fullTime = isFullTime(deal);
  return {
    key: `deal:${deal.roleSlug}:${deal.contract.started}`,
    links: { team: PAIR.independent.slug, independent: deal.roleSlug },
    title: deal.title,
    type: fullTime ? "full-time" : "trial",
    rate: deal.contract.rate,
    started: dayLabel(fullTime && deal.fullTime ? deal.fullTime.start : deal.contract.started),
    ends: fullTime ? "Ongoing" : dayLabel(deal.contract.ends),
  };
}

/* ---------------------------------------------------------------- money */

export const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

/** Pending, or ruled for the independent but not paid out yet — either way the money stays put. */
export const holds = (d: Dispute) => d.status === "Pending" || d.resolution?.payment === "awaiting release";

export type Escrow = { total: number; released: number; refunded: number; held: number; onHold: number };

/**
 * The trial's escrow right now: what was deposited when the offer went out, minus what End
 * Contract or a ruling has moved. `onHold` is the part an open dispute is keeping — End Contract
 * can't touch it. The total used to be the rate string with every non-digit stripped, so a weekly
 * rate funded one week, a 90-day trial one month, and an edited offer "held" money never deposited.
 */
export function escrowOf(deal: Deal | null, all: Dispute[]): Escrow | null {
  const ref = dealContract(deal);
  const c = deal?.contract;
  if (!ref || !c) return null;
  const total = c.deposit ?? rateAmount(c.rate);
  // A contract ended before escrow was tracked released everything when it ended.
  const released = c.escrow?.released ?? (c.ended ? total : 0);
  const refunded = c.escrow?.refunded ?? 0;
  const held = Math.max(0, total - released - refunded);
  const onHold = Math.min(held, all.filter((d) => d.contract === ref.key && holds(d)).reduce((n, d) => n + d.amount, 0));
  return { total, released, refunded, held, onHold };
}

/** One line for the Escrow row on either tracker. */
export function escrowLine(e: Escrow, started: string, names: { releasedTo: string; refundedTo: string }) {
  if (e.held > 0 && e.onHold > 0) return `${usd(e.held)} held since ${started} · ${usd(e.onHold)} on hold for a dispute`;
  if (e.held > 0) return `${usd(e.held)} held since ${started}${e.released + e.refunded > 0 ? ` · ${usd(e.released + e.refunded)} settled` : ""}`;
  const parts = [e.released > 0 && `${usd(e.released)} released to ${names.releasedTo}`, e.refunded > 0 && `${usd(e.refunded)} refunded to ${names.refundedTo}`].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Nothing held";
}

/* ---------------------------------------------------------------- rules */

export type FileBlock = "open" | "filed" | "withdrawn" | "settled";

/**
 * Why `party` can't file on this contract right now, if they can't:
 *   open      one is already open on it, from either side — the other party adds their side to it
 *             instead of filing a second (the old forms let the same contract collect three);
 *   filed     the independent has filed on it before — one per contract (IN-032 / IN-082);
 *   withdrawn the Team Builder withdrew one here, and can't refile (TB-093);
 *   settled   nothing is left in escrow for a ruling to move.
 * Keyed by contract, not by person: the withdrawn check used to match the independent's name,
 * which would have locked disputes on their full-time contract too (TB-118).
 */
export function fileBlock(all: Dispute[], key: string, party: DisputeParty, escrow: Escrow | null): { block: FileBlock | null; dispute?: Dispute } {
  const here = all.filter((d) => d.contract === key);
  const open = here.find(holds);
  if (open) return { block: "open", dispute: open };
  const own = here.find((d) => d.filedBy === "independent");
  if (party === "independent" && own) return { block: "filed", dispute: own };
  const withdrawn = here.find((d) => d.filedBy === "team" && d.status === "Withdrawn");
  if (party === "team" && withdrawn) return { block: "withdrawn", dispute: withdrawn };
  if (escrow && escrow.held <= 0) return { block: "settled" };
  return { block: null };
}

/** Admin's process check, from the live contract where there is one, else as it was when filed. */
export function factsFor(ref: ContractRef, deal: Deal | null, all: Dispute[]): DisputeFacts {
  const c = dealContract(deal)?.key === ref.key ? deal?.contract : undefined;
  const ends = parseDay(ref.ends);
  /** The same rule the evaluation opens on: the end date came, or every objective was approved first. */
  const allApproved = !!c?.objectives.length && c.objectives.every((o) => o.status === "complete");
  return {
    started: ref.started,
    ends: ref.ends,
    trialEnded: ref.type === "trial" ? (!!ends && ends.getTime() <= Date.now()) || !!c?.ended || allApproved : false,
    evaluation: evaluationsOf(c).length > 0,
    objectivesDone: c?.objectives.filter((o) => o.status === "complete").length ?? 0,
    objectivesTotal: c?.objectives.length ?? 0,
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

/** How each side names a party: the Team Builder by company, the independent by name. */
export const partyName = (d: Dispute, p: DisputeParty) => (p === "team" ? d.team.company : d.independent.name);
export const otherParty = (p: DisputeParty): DisputeParty => (p === "team" ? "independent" : "team");
export const contractName = (d: Dispute) => `${d.title} — ${d.type === "trial" ? "trial" : "full-time"}`;

/** The ruling in one line, or null while there isn't one. */
export function outcomeOf(d: Dispute): string | null {
  const r = d.resolution;
  if (d.status === "Rejected") return "Rejected — the agreed process was followed";
  if (d.status !== "Resolved" || !r) return null;
  const who = r.favor === "team" ? d.team.company : d.independent.name;
  const money =
    r.payment === "refunded"
      ? `${usd(r.moved ?? d.amount)} refunded to ${d.team.company}`
      : r.payment === "released"
        ? `${usd(r.moved ?? d.amount)} released to ${d.independent.name}`
        : `${usd(d.amount)} to be released to ${d.independent.name}`;
  return `Resolved in favor of ${who} · ${money}`;
}

export const unseenByAdmin = (all: Dispute[]) => all.filter((d) => (d.adminSeen ?? 0) < d.updated);

/* -------------------------------------------------------------- actions */

/** Tell one party about this dispute; the link opens it in their own Disputes list. */
function tell(d: Dispute, to: DisputeParty, from: DisputeParty | "admin", title: string, body: string) {
  const tab = d.filedBy === to ? "sent" : "received";
  if (to === "team")
    notify("team", {
      title,
      body,
      href: `/team/payments/disputes?tab=${tab}&open=${d.id}`,
      avatar: from === "admin" ? "/admin/avatar.jpg" : d.independent.avatar,
    });
  else notify("independent", { title, body, href: `/independent/wallet/disputes?tab=${tab}&open=${d.id}`, avatar: from === "admin" ? "/admin/avatar.jpg" : undefined });
}

/**
 * TB-073 / TB-118 / IN-059 — file a dispute. It goes straight to Admin's queue, the other party is
 * told, and it lists under Sent as Pending. Returns null when fileBlock says no.
 */
export function fileDispute(input: { ref: ContractRef; filedBy: DisputeParty; reason: string; description: string; amount: number; evidence?: string }): Dispute | null {
  ensureLoaded();
  const deal = getDeal();
  if (fileBlock(snapshot, input.ref.key, input.filedBy, dealContract(deal)?.key === input.ref.key ? escrowOf(deal, snapshot) : null).block) return null;
  const now = Date.now();
  const d: Dispute = {
    id: `dsp-${now.toString(36)}`,
    contract: input.ref.key,
    links: input.ref.links,
    title: input.ref.title,
    type: input.ref.type,
    rate: input.ref.rate,
    team: TEAM,
    independent: IND,
    filedBy: input.filedBy,
    at: now,
    reason: input.reason,
    description: input.description,
    amount: input.amount,
    evidence: input.evidence,
    status: "Pending",
    facts: factsFor(input.ref, deal, snapshot),
    statements: [],
    timeline: [
      { at: now, event: "Dispute filed", actor: input.filedBy === "team" ? TEAM.name : IND.name },
      { at: now, event: `${input.filedBy === "team" ? IND.name : TEAM.company} notified`, actor: "system" },
    ],
    updated: now,
  };
  write([d, ...snapshot]);
  tell(
    d,
    otherParty(d.filedBy),
    d.filedBy,
    `${partyName(d, d.filedBy)} filed a dispute`,
    `${partyName(d, d.filedBy)} raised a dispute on the ${d.title} contract over ${usd(d.amount)} (${d.reason}). Hireable support is reviewing it — you can add your side from Disputes.`,
  );
  return d;
}

/** TB-093 / IN-082 — only the party who filed it, only while it is Pending. Admin sees it as new activity. */
export function withdrawDispute(id: string, by: DisputeParty) {
  const d = getDisputes().find((x) => x.id === id);
  if (!d || d.status !== "Pending" || d.filedBy !== by) return;
  const now = Date.now();
  patch(id, (x) => ({ ...x, status: "Withdrawn", timeline: [...x.timeline, { at: now, event: "Dispute withdrawn", actor: by === "team" ? TEAM.name : IND.name }], updated: now }));
  tell(d, otherParty(by), by, `${partyName(d, by)} withdrew their dispute`, `The dispute on the ${d.title} contract is closed and the ${usd(d.amount)} hold is lifted. Hireable support has stopped the review.`);
}

/** Either party adds their side, or the evidence support asked for, while the dispute is Pending. */
export function addStatement(id: string, from: DisputeParty, text: string, evidence?: string) {
  const d = getDisputes().find((x) => x.id === id);
  if (!d || d.status !== "Pending" || !text.trim()) return;
  const now = Date.now();
  patch(id, (x) => ({
    ...x,
    statements: [...x.statements, { at: now, from, text: text.trim(), evidence: evidence?.trim() || undefined }],
    timeline: [...x.timeline, { at: now, event: from === x.filedBy ? "More information added" : "Response added", actor: from === "team" ? TEAM.name : IND.name }],
    updated: now,
  }));
  tell(d, otherParty(from), from, `${partyName(d, from)} added to the dispute`, `There is a new statement on the ${d.title} dispute. Both sides can read what the other has sent.`);
}

/** AD-033 — ask one side, or both, for more; they see the request on the dispute. */
export function requestEvidence(id: string, from: DisputeParty | "both", note: string) {
  const d = getDisputes().find((x) => x.id === id);
  if (!d || d.status !== "Pending" || !note.trim()) return;
  const now = Date.now();
  const who = from === "both" ? "both parties" : partyName(d, from);
  patch(id, (x) => ({ ...x, evidenceRequest: { from, note: note.trim(), at: now }, timeline: [...x.timeline, { at: now, event: `Evidence requested from ${who}`, actor: ADMIN }], updated: now, adminSeen: now }));
  for (const p of from === "both" ? (["team", "independent"] as const) : [from]) tell(d, p, "admin", "Hireable support needs more information", `On the ${d.title} dispute: ${note.trim()}`);
}

/** AD-033 — no breach of the agreed process, so no ruling for either side. The hold is lifted. */
export function rejectDispute(id: string, notes: string) {
  const d = getDisputes().find((x) => x.id === id);
  if (!d || d.status !== "Pending" || !notes.trim()) return;
  const now = Date.now();
  patch(id, (x) => ({ ...x, status: "Rejected", resolution: { notes: notes.trim(), at: now }, timeline: [...x.timeline, { at: now, event: "Dispute rejected", actor: ADMIN }], updated: now, adminSeen: now }));
  for (const p of ["team", "independent"] as const) tell(d, p, "admin", "Dispute rejected", `Hireable support found the agreed process on the ${d.title} contract was followed, so the dispute is closed and the ${usd(d.amount)} hold is lifted. Notes: ${notes.trim()}`);
}

/** Move up to `amount` out of the trial's escrow (or record it outright on a contract with none). */
function settle(d: Dispute, kind: "released" | "refunded"): number {
  const deal = getDeal();
  const onDeal = dealContract(deal)?.key === d.contract;
  const moved = onDeal ? Math.min(d.amount, escrowOf(deal, getDisputes())?.held ?? 0) : d.amount;
  if (onDeal && moved > 0) settleEscrow(kind === "released" ? { released: moved } : { refunded: moved });
  if (moved > 0) recordLedger({ contract: d.links.independent, title: d.title, company: d.team.company, amount: usd(moved), period: `Dispute ruling · ${d.reason}`, kind });
  return moved;
}

/**
 * AD-034 — rule for one side; notes are required and both sides are told. For the Team Builder
 * the amount is refunded from escrow at once; for the independent it waits on AD-035's release.
 */
export function resolveDispute(id: string, favor: DisputeParty, notes: string) {
  const d = getDisputes().find((x) => x.id === id);
  if (!d || d.status !== "Pending" || !notes.trim()) return;
  const now = Date.now();
  const moved = favor === "team" ? settle(d, "refunded") : undefined;
  const payment = favor === "team" ? "refunded" : "awaiting release";
  patch(id, (x) => ({
    ...x,
    status: "Resolved",
    resolution: { favor, notes: notes.trim(), at: now, payment, moved },
    timeline: [...x.timeline, { at: now, event: `Resolved in favor of ${partyName(x, favor)}`, actor: ADMIN }, ...(favor === "team" ? [{ at: now, event: `${usd(moved ?? 0)} refunded to ${x.team.company}`, actor: "system" }] : [])],
    updated: now,
    adminSeen: now,
  }));
  const money = favor === "team" ? `${usd(moved ?? 0)} is refunded to ${d.team.company}.` : `${usd(d.amount)} will be released to ${d.independent.name}.`;
  for (const p of ["team", "independent"] as const) tell(d, p, "admin", `Dispute resolved in favor of ${partyName(d, favor)}`, `Hireable support ruled on the ${d.title} dispute. ${money} Notes: ${notes.trim()}`);
}

/** AD-035 — release the money on a dispute resolved for the independent. Both sides are told. */
export function releasePayment(id: string) {
  const d = getDisputes().find((x) => x.id === id);
  if (!d || d.status !== "Resolved" || d.resolution?.favor !== "independent" || d.resolution.payment !== "awaiting release") return;
  const now = Date.now();
  const moved = settle(d, "released");
  patch(id, (x) => ({
    ...x,
    resolution: x.resolution && { ...x.resolution, payment: "released", moved },
    timeline: [...x.timeline, { at: now, event: `${usd(moved)} released to ${x.independent.name}`, actor: ADMIN }],
    updated: now,
    adminSeen: now,
  }));
  tell(d, "independent", "admin", "Dispute payment released", `${usd(moved)} from the ${d.title} dispute has been released to you. It is in your earnings now.`);
  tell(d, "team", "admin", "Dispute payment released", `${usd(moved)} was released to ${d.independent.name} from the ${d.title} escrow, as ruled.`);
}

/** Opening a dispute in Admin clears its "new activity" badge. */
export function markAdminSeen(id: string) {
  const d = getDisputes().find((x) => x.id === id);
  if (!d || (d.adminSeen ?? 0) >= d.updated) return;
  patch(id, (x) => ({ ...x, adminSeen: x.updated }));
}
