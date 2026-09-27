import { dayOf } from "./dates";
import { WorkError } from "./errors";
import { indexById, type Side, type WorkItem } from "./model";
import { orderLast } from "./order";
import { sideOf, type Actor, type Names, type WorkAccess } from "./permissions";
import type { Clock, Hook, WorkPort, WorkState } from "./repository";
import {
  applyChanges,
  changesSummary,
  checkAmendment,
  currentVersion,
  diffText,
  EMPTY_SCOPE,
  stillOpen,
  nextMonthStart,
  openAmendment,
  REASON_MAX,
  resolveChanges,
  type Amendment,
  type AmendmentAnswer,
  type ContractScope,
  type ContractVersion,
  type ResolvedChange,
  type ScopeChange,
  type ScopeEvent,
  type ScopeTask,
} from "./scope";

/**
 * The one way the agreed scope changes (./scope): amendments, run through the same port as the work
 * repository — the latest saved state, checked, saved all or nothing, and only then told to the
 * other side. Each operation checks who's asking and where the amendment and the contract stand, so
 * a button that should have been hidden still can't change anything:
 *
 *   propose       either side, while the contract takes work, and only one open at a time
 *   revise        its proposer, while it's open — the other side reads it again
 *   withdraw      its proposer, while it's open
 *   askChanges    the other side, while it waits on them, with a note
 *   reject        the other side, while it waits on them, with a reason
 *   accept        the other side, on the revision they read and the version it changes: the next
 *                 version is recorded, and the contract tasks on the list change with it
 *
 * Every step goes on the contract's history with who, when, and the values before and after.
 */

export type AgreementNoticeKind = "proposed" | "revised" | "withdrawn" | "changes_requested" | "rejected" | "accepted";

/** What the other side hears: the amendment, who did it, what it does, and the note if there is one. */
export type AgreementNotice = { kind: AgreementNoticeKind; to: Side; number: number; by: string; summary: string; note?: string; version?: number };

export type AmendmentInput = { id: string; reason: string; changes: ScopeChange[] };
/** An answer names the revision it read, so a revision made meanwhile isn't answered unread. */
export type AnswerInput = { revision: number; note?: string };

type Kit = { actor: Actor; side: Side | null; names: Names; port: WorkPort; clock: Clock; notify?: (n: AgreementNotice) => void; hook?: Hook };
type Now = ReturnType<Clock>;
type Out<T> = { next?: WorkState; result: T; notices?: AgreementNotice[] };

async function run<T>(k: Kit, op: string, id: string, step: (state: WorkState, access: WorkAccess, now: Now) => Out<T>): Promise<T> {
  await k.hook?.(op, id);
  const now = k.clock();
  const { result, notices } = k.port.transact((state, { access }) => {
    const out = step(state, access, now);
    return { next: out.next, result: { result: out.result, notices: out.notices ?? [] } };
  });
  for (const n of notices) {
    try {
      k.notify?.(n);
    } catch {
      // Saved; a notification that fails to send doesn't undo it.
    }
  }
  return result;
}

/* ---------------------------------------------------------------- checks */

const scopeOf = (s: WorkState): ContractScope => s.scope ?? EMPTY_SCOPE;
const forbidden = (message: string) => new WorkError("forbidden", message);
const other = (side: Side): Side => (side === "team" ? "independent" : "team");
const nameOf = (k: Kit, side: Side) => (side === "team" ? k.names.team : k.names.independent);

function actingSide(k: Kit): Side {
  if (!k.side) throw forbidden("Admins can see the contract but can't change it.");
  return k.side;
}

/** The contract takes amendments while its work is open: not before it's signed, not once a trial is over or it has ended. */
function needOpen(access: WorkAccess) {
  if (access.open) return;
  throw forbidden(access.trialClosed ? "The trial is over, so what was agreed for it is final." : (access.closedReason ?? "This contract isn't open, so what was agreed can't change."));
}

function versionIn(scope: ContractScope): ContractVersion {
  const v = currentVersion(scope);
  if (!v) throw new WorkError("not_found", "This contract has no agreed version to amend.");
  return v;
}

function find(scope: ContractScope, id: string): Amendment {
  const a = scope.amendments.find((x) => x.id === id);
  if (!a) throw new WorkError("not_found", "That amendment doesn't exist any more.");
  return a;
}

/** Why a settled amendment can't be acted on. */
function settled(a: Amendment): string {
  if (a.status === "accepted") return `Amendment ${a.number} was accepted — it's contract v${a.version ?? "?"} now.`;
  if (a.status === "rejected") return `Amendment ${a.number} was rejected.`;
  return `Amendment ${a.number} was withdrawn.`;
}

function checked(input: Pick<AmendmentInput, "reason" | "changes">, state: WorkState, base: ContractVersion, access: WorkAccess, now: Now) {
  const e = checkAmendment(input, { base, items: indexById(state.items), today: now.today, lastDay: dayOf(access.lastDay) });
  if (e) throw new WorkError("validation", e.message, { field: e.field });
}

/** The proposer's amendment, open, on the revision they read. */
function ownOpen(k: Kit, a: Amendment, revision: number) {
  const side = actingSide(k);
  if (a.by !== side) throw forbidden(`Only ${a.byName} can change the amendment they proposed.`);
  if (!stillOpen(a)) throw forbidden(settled(a));
  if (revision !== a.revision) throw new WorkError("conflict", `Amendment ${a.number} changed since you opened it. Open it again to see where it stands.`);
  return side;
}

/** The other side's amendment, waiting on them, on the revision they read. */
function answerable(k: Kit, a: Amendment, revision: number): Side {
  const side = actingSide(k);
  if (a.by === side) throw forbidden(`You proposed Amendment ${a.number}, so it's ${nameOf(k, other(side))}'s to answer.`);
  if (!stillOpen(a)) throw forbidden(settled(a));
  if (a.status !== "pending") throw forbidden(`Amendment ${a.number} is back with ${a.byName} to revise.`);
  if (revision !== a.revision) throw new WorkError("conflict", `${a.byName} revised Amendment ${a.number} while you were reading it. Read the new version before you answer.`);
  return side;
}

/** The note an answer carries: `missing` says what it should say, when there's none. */
function noteOf(note: string | undefined, missing: string): string {
  const t = (note ?? "").trim();
  if (!t) throw new WorkError("validation", missing, { field: "note" });
  if (t.length > REASON_MAX) throw new WorkError("validation", `Keep it under ${REASON_MAX.toLocaleString("en-US")} characters.`, { field: "note" });
  return t;
}

/* --------------------------------------------------------------- records */

function event(k: Kit, now: Now, scope: ContractScope, e: Omit<ScopeEvent, "id" | "ts" | "at" | "by" | "name">): ScopeEvent {
  return { id: `ev-${now.ms}-${scope.log.length + 1}`, ts: now.ms, at: now.moment, by: k.side as Side, name: k.actor.name, ...e };
}

/** The state with the amendment saved over its old self, a line on the history, and anything else the step changed. */
function recorded(state: WorkState, scope: ContractScope, a: Amendment, line: ScopeEvent, extra?: Partial<WorkState> & { versions?: ContractVersion[] }): WorkState {
  const { versions, ...rest } = extra ?? {};
  const amendments = scope.amendments.some((x) => x.id === a.id) ? scope.amendments.map((x) => (x.id === a.id ? a : x)) : [...scope.amendments, a];
  return { ...state, ...rest, scope: { versions: versions ?? scope.versions, amendments, log: [...scope.log, line] } };
}

function tell(k: Kit, kind: AgreementNotice["kind"], a: Amendment, to: Side, extra: Partial<AgreementNotice> = {}): AgreementNotice {
  return { kind, to, number: a.number, by: k.actor.name, summary: "", ...extra };
}

/** Only the fields an amendment keeps: a change arrives from a form, and nothing else rides in with it. */
function clean(c: ScopeChange): ScopeChange {
  if (c.kind === "add") return { id: c.id, kind: "add", task: { id: c.task.id, title: c.task.title, description: c.task.description, due: c.task.due, effort: c.task.effort, milestone: c.task.milestone } };
  if (c.kind === "remove") return { id: c.id, kind: "remove", taskId: c.taskId };
  if (c.kind === "terms") return { id: c.id, kind: "terms", to: { rate: c.to.rate, hours: c.to.hours } };
  const { title, description, due, effort, milestone } = c.to;
  return { id: c.id, kind: "change", taskId: c.taskId, to: Object.fromEntries(Object.entries({ title, description, due, effort, milestone }).filter(([, v]) => v !== undefined)) };
}

/* ------------------------------------------------------------- proposing */

function propose(k: Kit, input: AmendmentInput) {
  return run(k, "proposeAmendment", input.id, (state, access, now): Out<Amendment> => {
    const side = actingSide(k);
    needOpen(access);
    const scope = scopeOf(state);
    const retry = scope.amendments.find((a) => a.id === input.id);
    if (retry) return { result: retry };
    const open = openAmendment(scope);
    if (open) throw new WorkError("conflict", `Amendment ${open.number} is still open. ${open.by === side ? "Withdraw it, or wait for the answer," : `Answer ${open.byName}'s first,`} before proposing another — one change to the contract is settled at a time.`);
    const base = versionIn(scope);
    const changes = input.changes.map(clean);
    checked({ reason: input.reason, changes }, state, base, access, now);
    const a: Amendment = { id: input.id, number: scope.amendments.length + 1, base: base.version, by: side, byName: k.actor.name, reason: input.reason.trim(), changes, status: "pending", revision: 1, proposedAt: now.moment, proposedTs: now.ms };
    const resolved = resolveChanges(base, changes);
    const next = recorded(state, scope, a, event(k, now, scope, { kind: "proposed", version: base.version, amendment: a.number, changes: resolved, note: a.reason }));
    return { next, result: a, notices: [tell(k, "proposed", a, other(side), { summary: changesSummary(resolved), note: a.reason })] };
  });
}

function revise(k: Kit, id: string, input: Omit<AmendmentInput, "id"> & { revision: number }) {
  return run(k, "reviseAmendment", id, (state, access, now): Out<Amendment> => {
    needOpen(access);
    const scope = scopeOf(state);
    const was = find(scope, id);
    const side = ownOpen(k, was, input.revision);
    const base = versionIn(scope);
    const changes = input.changes.map(clean);
    checked({ reason: input.reason, changes }, state, base, access, now);
    // The note it answers stays on the history; the amendment waits on an answer to this revision.
    const { answer: _answered, ...rest } = was;
    const a: Amendment = { ...rest, reason: input.reason.trim(), changes, revision: was.revision + 1, status: "pending" };
    const resolved = resolveChanges(base, changes);
    const next = recorded(state, scope, a, event(k, now, scope, { kind: "revised", version: base.version, amendment: a.number, changes: resolved, note: a.reason }));
    return { next, result: a, notices: [tell(k, "revised", a, other(side), { summary: changesSummary(resolved), note: a.reason })] };
  });
}

function withdraw(k: Kit, id: string, revision: number) {
  return run(k, "withdrawAmendment", id, (state, _access, now): Out<Amendment> => {
    const scope = scopeOf(state);
    const was = find(scope, id);
    if (was.status === "withdrawn") return { result: was };
    const side = ownOpen(k, was, revision);
    const a: Amendment = { ...was, status: "withdrawn" };
    const next = recorded(state, scope, a, event(k, now, scope, { kind: "withdrawn", version: was.base, amendment: a.number }));
    return { next, result: a, notices: [tell(k, "withdrawn", a, other(side))] };
  });
}

/* ------------------------------------------------------------- answering */

function answerWith(k: Kit, side: Side, now: Now, note?: string): AmendmentAnswer {
  return { by: side, name: k.actor.name, at: now.moment, ts: now.ms, ...(note ? { note } : {}) };
}

/** The amendment being answered, and the side answering it — while the contract takes changes and on the revision they read. */
function answering(k: Kit, state: WorkState, access: WorkAccess, id: string, revision: number) {
  needOpen(access);
  const scope = scopeOf(state);
  const was = find(scope, id);
  return { scope, was, side: answerable(k, was, revision) };
}

/** Asking its proposer for changes, or rejecting it: a note either way, and the amendment moves on. */
function decline(k: Kit, id: string, input: AnswerInput, kind: "changes_requested" | "rejected") {
  return run(k, kind === "rejected" ? "rejectAmendment" : "askAmendmentChanges", id, (state, access, now): Out<Amendment> => {
    const { scope, was, side } = answering(k, state, access, id, input.revision);
    const note = noteOf(input.note, kind === "rejected" ? `Say why you're rejecting it, so ${was.byName} knows.` : `Say what should change, so ${was.byName} can revise it.`);
    const a: Amendment = { ...was, status: kind, answer: answerWith(k, side, now, note) };
    const next = recorded(state, scope, a, event(k, now, scope, { kind, version: was.base, amendment: a.number, note }));
    return { next, result: a, notices: [tell(k, kind, a, was.by, { note })] };
  });
}

function accept(k: Kit, id: string, input: AnswerInput) {
  return run(k, "acceptAmendment", id, (state, access, now): Out<Amendment> => {
    const { scope, was, side } = answering(k, state, access, id, input.revision);
    const base = versionIn(scope);
    if (was.base !== base.version) throw new WorkError("conflict", `The contract is at v${base.version} now, and Amendment ${was.number} was proposed to v${was.base}. ${was.byName} can propose it again.`);
    // Checked again against the work as it is now: a task finished since can't change any more.
    checked(was, state, base, access, now);
    const { tasks, terms } = applyChanges(base, was.changes, base.terms.type === "trial" ? undefined : nextMonthStart(now.today));
    const version: ContractVersion = { version: base.version + 1, agreedAt: now.moment, agreedTs: now.ms, source: { kind: "amendment", number: was.number }, proposedBy: was.by, acceptedBy: side, terms, tasks };
    const resolved = resolveChanges(base, was.changes);
    const work = applyToWork(k, state, was, version, resolved, access, now);
    const a: Amendment = { ...was, status: "accepted", answer: answerWith(k, side, now), version: version.version };
    const line = event(k, now, scope, { kind: "accepted", version: version.version, amendment: a.number, changes: resolved });
    const next = recorded(state, scope, a, line, { ...work, versions: [...scope.versions, version] });
    return { next, result: a, notices: [tell(k, "accepted", a, was.by, { summary: changesSummary(resolved), version: version.version })] };
  });
}

/* ------------------------------------------------- the work, as agreed now */

/** The item with a save stamped on it and `lines` on its feed, newest first. */
function stamped(k: Kit, t: WorkItem, now: Now, lines: string[]): WorkItem {
  const events = lines.map((text) => ({ ts: now.ms, at: now.moment, text }));
  return { ...t, version: t.version + 1, updatedAt: now.ms, updatedBy: k.actor.name, activity: [...events.reverse(), ...t.activity] };
}

/** A field set on the item, or taken off it when the agreed task has none. */
function put<K extends "description" | "due" | "effort">(t: WorkItem, key: K, value: WorkItem[K] | undefined) {
  if (value === undefined) delete t[key];
  else t[key] = value;
}

/** The item carrying the agreed definition: its name, requirements, deadline, estimate and kind. The start goes if it no longer fits. */
function agreedFields(t: WorkItem, s: ScopeTask): { item: WorkItem; lines: string[] } {
  const type = s.milestone ? "milestone" : t.type === "milestone" ? "task" : t.type;
  const item: WorkItem = { ...t, title: s.title, type };
  put(item, "description", s.description);
  put(item, "due", s.due);
  put(item, "effort", s.milestone ? undefined : s.effort);
  const lines: string[] = [];
  if (item.start && (type === "milestone" || (item.due && item.start > item.due))) {
    delete item.start;
    lines.push("Start date cleared — the agreed due date now comes first");
  }
  return { item, lines };
}

/** A new contract task, as the amendment agreed it: the Independent's, numbered next, last in the order. */
function contractItem(k: Kit, s: ScopeTask, a: Amendment, label: string, place: { number: number; order: number; trial: boolean }, now: Now): WorkItem {
  const base: WorkItem = { id: s.id, number: place.number, title: s.title, status: "todo", type: "task", assignee: "independent", dependsOn: [], tags: [], order: place.order, addedBy: a.by, agreed: true, ...(place.trial ? { trial: true } : {}), created: now.stamp, createdAt: now.ms, createdBy: a.byName, updatedAt: now.ms, updatedBy: k.actor.name, version: 1, subtasks: [], activity: [], comments: [] };
  const { item } = agreedFields(base, s);
  return { ...item, activity: [{ ts: now.ms, at: now.moment, text: `Agreed in ${label} — proposed by ${a.byName}, accepted by ${k.actor.name}` }] };
}

/** One change's effect on one item that's already on the list. */
function changedItem(k: Kit, t: WorkItem, c: ResolvedChange, s: ScopeTask | undefined, label: string, now: Now): WorkItem {
  if (c.kind === "remove") return stamped(k, { ...t, archivedAt: now.ms, archivedBy: k.actor.name }, now, [`Removed from the contract by ${label}`]);
  if (!s || c.kind === "terms") return t;
  const { item, lines } = agreedFields(t, s);
  if (c.kind === "add") {
    const { archivedAt: _at, archivedBy: _by, ...back } = item;
    return stamped(k, back, now, [`Back in the contract — ${label}`, ...lines]);
  }
  return stamped(k, item, now, [`Changed by ${label}: ${diffText(c.fields)}`, ...lines]);
}

/**
 * The work list as the new version has it: contract tasks added (a removed one comes back as itself),
 * changed to their new definition, or removed — deleted from the list with a line on their feed,
 * their history kept. What isn't in the amendment isn't touched.
 */
function applyToWork(k: Kit, state: WorkState, a: Amendment, v: ContractVersion, resolved: readonly ResolvedChange[], access: WorkAccess, now: Now): Pick<WorkState, "items" | "nextNumber"> {
  const label = `Amendment ${a.number} (contract v${v.version})`;
  const agreed = new Map(v.tasks.map((t) => [t.id, t]));
  let items = [...state.items];
  let nextNumber = state.nextNumber;
  for (const c of resolved) {
    if (c.kind === "terms") continue;
    const id = c.task.id;
    const existing = items.find((t) => t.id === id);
    if (existing) items = items.map((t) => (t.id === id ? changedItem(k, t, c, agreed.get(id), label, now) : t));
    else if (c.kind === "add") items.push(contractItem(k, agreed.get(id) ?? c.task, a, label, { number: nextNumber++, order: orderLast(items), trial: access.trial }, now));
  }
  return { items, nextNumber };
}

/* ------------------------------------------------------------ repository */

/** The amendments for one person: every operation above, run as them. */
export function createAgreementRepository(opts: { actor: Actor; port: WorkPort; clock: Clock; names?: Names; notify?: (n: AgreementNotice) => void; hook?: Hook }) {
  const k: Kit = { ...opts, names: opts.names ?? { team: "the Team Builder", independent: "the Independent" }, side: sideOf(opts.actor) };
  return {
    actor: k.actor,
    propose: (input: AmendmentInput) => propose(k, input),
    revise: (id: string, input: Omit<AmendmentInput, "id"> & { revision: number }) => revise(k, id, input),
    withdraw: (id: string, revision: number) => withdraw(k, id, revision),
    askChanges: (id: string, input: AnswerInput) => decline(k, id, input, "changes_requested"),
    reject: (id: string, input: AnswerInput) => decline(k, id, input, "rejected"),
    accept: (id: string, input: AnswerInput) => accept(k, id, input),
  };
}

export type AgreementRepository = ReturnType<typeof createAgreementRepository>;
