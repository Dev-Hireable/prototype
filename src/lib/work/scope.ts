import { addMonths, dayOf, isoOf, monthStart, partsOf, stampLabel, type Day } from "./dates";
import { isArchived, isCompleted, NOTE_MAX, refOf, type Side, type WorkItem } from "./model";
import { checkDates, checkDescription, checkEffort, checkTitle, type Invalid } from "./validate";

/**
 * The contract's agreed scope, and the one way it changes.
 *
 *   ContractVersion  what both sides agreed, kept as it was: v1 is the signed offer, and each accepted
 *                    amendment adds the next. A version holds the terms (the pay, the dates, a
 *                    part-time role's hours) and the contract tasks — each one's name, requirements,
 *                    deadline, estimate and whether it's a milestone.
 *   Amendment        a change either side proposes to the version in force: tasks to add, change or
 *                    remove, and the pay. It waits on the other side, who accepts it (the next
 *                    version), rejects it or asks for changes; its proposer can revise or withdraw it.
 *                    One is open at a time.
 *   ScopeEvent       the contract's history: every proposal, answer and version — who, when, and the
 *                    values before and after.
 *
 * Work items flagged `agreed` are the contract tasks: their contractual fields change only through an
 * accepted amendment. How the work is run — status, start, priority, tags, subtasks, comments — stays
 * everyday project management, and anything not in the contract is internal work.
 */

export type ContractKind = "trial" | "full-time" | "part-time";

/** A contract task's agreed definition. */
export type ScopeTask = { id: string; title: string; description?: string; due?: string; effort?: number; milestone?: boolean };

/** The parts of a contract task only an amendment changes. */
export const TASK_FIELDS = ["title", "description", "due", "effort", "milestone"] as const;
export type TaskField = (typeof TASK_FIELDS)[number];

/**
 * The agreed terms. `escrow` is what a trial's escrow holds for it (the rate for each of its months);
 * `rateFrom` is the day a role's amended pay starts (the first of a month), the earlier pay applying
 * until then.
 */
export type ScopeTerms = { type: ContractKind; rate: string; start: string; end?: string; hours?: number; benefits?: string[]; escrow?: number; rateFrom?: string };

/** The terms an amendment can change: the pay, and a part-time role's hours. */
const TERM_FIELDS = ["rate", "hours"] as const;
export type TermField = (typeof TERM_FIELDS)[number];

/** How a version came to be: the signed offer, an accepted amendment, or the post-trial role the talent accepted. */
export type VersionSource = { kind: "offer"; revision: number } | { kind: "amendment"; number: number } | { kind: "conversion" };

export type ContractVersion = { version: number; agreedAt: string; agreedTs: number; source: VersionSource; proposedBy: Side; acceptedBy: Side; terms: ScopeTerms; tasks: ScopeTask[] };

/** A change to a contract task: the fields it sets. null clears one; a name is never cleared. */
export type TaskPatch = { title?: string; description?: string | null; due?: string | null; effort?: number | null; milestone?: boolean };
export type TermsPatch = { rate?: string; hours?: number };

export type ScopeChange =
  | { id: string; kind: "add"; task: ScopeTask }
  | { id: string; kind: "change"; taskId: string; to: TaskPatch }
  | { id: string; kind: "remove"; taskId: string }
  | { id: string; kind: "terms"; to: TermsPatch };

export type AmendmentStatus = "pending" | "changes_requested" | "accepted" | "rejected" | "withdrawn";

/** The latest answer: the note asking for changes, a rejection's reason, or the acceptance. */
export type AmendmentAnswer = { by: Side; name: string; at: string; ts: number; note?: string };

export type Amendment = {
  id: string;
  /** "Amendment 2": its place on this contract. */
  number: number;
  /** The contract version it changes. */
  base: number;
  by: Side;
  byName: string;
  reason: string;
  changes: ScopeChange[];
  status: AmendmentStatus;
  /** Bumped each time its proposer revises it: an answer names the revision it read. */
  revision: number;
  proposedAt: string;
  proposedTs: number;
  answer?: AmendmentAnswer;
  /** The version its acceptance made. */
  version?: number;
};

export type ScopeEventKind = "proposed" | "revised" | "changes_requested" | "rejected" | "withdrawn" | "accepted";

/** A field before and after a change. */
export type FieldDiff = { field: TaskField | TermField; was?: string | number | boolean; to?: string | number | boolean };

/** A change as it reads against the version it changes: the task as it was, and each field before and after. */
export type ResolvedChange =
  | { id: string; kind: "add"; task: ScopeTask }
  | { id: string; kind: "change"; task: ScopeTask; fields: FieldDiff[] }
  | { id: string; kind: "remove"; task: ScopeTask }
  | { id: string; kind: "terms"; fields: FieldDiff[] };

/** One line of the contract's history. `version` is the one in force then — for "accepted", the one it made. */
export type ScopeEvent = { id: string; ts: number; at: string; kind: ScopeEventKind; by: Side; name: string; version: number; amendment?: number; changes?: ResolvedChange[]; note?: string };

export type ContractScope = { versions: ContractVersion[]; amendments: Amendment[]; log: ScopeEvent[] };

export const EMPTY_SCOPE: ContractScope = { versions: [], amendments: [], log: [] };

/** What a person reads when they try to change a contract task directly. */
export const CONTRACT_LOCK = "This task is part of an agreed contract. Changes to its scope require approval from both parties.";

export const REASON_MAX = NOTE_MAX;
/** More than this in one amendment is a new contract, not an amendment. */
const CHANGES_MAX = 30;
export const HOURS_MIN = 1;
export const HOURS_MAX = 40;

/* ---------------------------------------------------------------- reading */

export const currentVersion = (s: ContractScope): ContractVersion | undefined => s.versions.at(-1);

export const stillOpen = (a: Pick<Amendment, "status">) => a.status === "pending" || a.status === "changes_requested";

/**
 * The amendment still open on the version in force — waiting on an answer, or on its proposer's
 * revision. One proposed to an earlier version (the trial's, before it became a role) is superseded.
 */
export const openAmendment = (s: ContractScope): Amendment | undefined => s.amendments.find((a) => stillOpen(a) && a.base === currentVersion(s)?.version);

/** Where an amendment stands for a reader: its status, or why an open one can't go on. */
export type AmendmentState = AmendmentStatus | "superseded" | "closed";

/** `open`: whether the contract takes amendments now. One left open when it stopped (ended, a trial over) is closed. */
export function amendmentState(a: Amendment, s: ContractScope, open: boolean): AmendmentState {
  if (!stillOpen(a)) return a.status;
  if (a.base !== currentVersion(s)?.version) return "superseded";
  return open ? a.status : "closed";
}

/** What went into the first version, and the post-trial role's: the terms and the work items as they stand. */
type Agreed = { terms: ScopeTerms; items: readonly WorkItem[]; at: string; ts: number };

/** v1: the signed offer's terms and its tasks — the contract tasks on the list. */
export function firstVersion({ terms, items, at, ts }: Agreed, revision: number): ContractVersion {
  const tasks = items.filter((t) => t.agreed && !isArchived(t)).map(scopeTaskOf);
  return { version: 1, agreedAt: at, agreedTs: ts, source: { kind: "offer", revision }, proposedBy: "team", acceptedBy: "independent", terms, tasks };
}

/**
 * The version a trial's conversion makes: the role's terms, and the contract tasks still open, which
 * carry over into it — the trial's finished ones stay its own history.
 */
export function conversionVersion(s: ContractScope, { terms, items, at, ts }: Agreed): ContractVersion {
  const byId = new Map(items.map((t) => [t.id, t]));
  const open = (currentVersion(s)?.tasks ?? []).filter((t) => {
    const item = byId.get(t.id);
    return !!item && !isArchived(item) && !isCompleted(item.status);
  });
  return { version: (currentVersion(s)?.version ?? 0) + 1, agreedAt: at, agreedTs: ts, source: { kind: "conversion" }, proposedBy: "team", acceptedBy: "independent", terms, tasks: open };
}

/** A work item's agreed definition, as a version keeps it. */
export function scopeTaskOf(t: Pick<WorkItem, "id" | "title" | "description" | "due" | "effort" | "type">): ScopeTask {
  return {
    id: t.id,
    title: t.title,
    ...(t.description ? { description: t.description } : {}),
    ...(t.due ? { due: t.due } : {}),
    ...(t.effort !== undefined && t.type !== "milestone" ? { effort: t.effort } : {}),
    ...(t.type === "milestone" ? { milestone: true } : {}),
  };
}

/** "$2,500/mo" → 2500. */
export const rateAmount = (rate: string | undefined) => Number((rate ?? "").replace(/[^0-9.]/g, "")) || 0;

/** The first of next month: when a role's amended pay starts, so no month is paid at two rates. */
export function nextMonthStart(today: Day): string {
  const { y, m } = partsOf(today);
  const next = addMonths(y, m, 1);
  return isoOf(monthStart(next.y, next.m));
}

/* ---------------------------------------------------------------- changes */

/** A task with `to` applied: set fields trimmed, cleared ones gone; a milestone carries no effort. */
function patched(t: ScopeTask, to: TaskPatch): ScopeTask {
  const out: Record<string, unknown> = { ...t };
  for (const f of TASK_FIELDS) {
    if (!(f in to)) continue;
    const v = to[f];
    if (v === null || v === undefined || v === "" || v === false) delete out[f];
    else out[f] = typeof v === "string" ? v.trim() : v;
  }
  if (out.milestone) delete out.effort;
  return out as ScopeTask;
}

/** A new task as the contract will hold it. */
const addedTask = (t: ScopeTask): ScopeTask => patched({ id: t.id, title: t.title.trim() }, { description: t.description, due: t.due, effort: t.effort, milestone: t.milestone });

/**
 * The terms with `to` applied. A trial's escrow follows its rate over the same months; a role's new
 * pay starts on `rateFrom`.
 */
function nextTerms(terms: ScopeTerms, to: TermsPatch, rateFrom?: string): ScopeTerms {
  const next: ScopeTerms = { ...terms, ...(to.rate !== undefined ? { rate: to.rate } : {}), ...(to.hours !== undefined ? { hours: to.hours } : {}) };
  if (to.rate === undefined || rateAmount(to.rate) === rateAmount(terms.rate)) return next;
  if (terms.type === "trial") {
    const months = terms.escrow && rateAmount(terms.rate) ? Math.max(1, Math.round(terms.escrow / rateAmount(terms.rate))) : 1;
    return { ...next, escrow: Math.round(rateAmount(to.rate) * months * 100) / 100 };
  }
  return rateFrom ? { ...next, rateFrom } : next;
}

/** What `changes` make of a version: the tasks and terms the next version holds. */
export function applyChanges(v: Pick<ContractVersion, "tasks" | "terms">, changes: readonly ScopeChange[], rateFrom?: string): { tasks: ScopeTask[]; terms: ScopeTerms } {
  const removed = new Set(changes.flatMap((c) => (c.kind === "remove" ? [c.taskId] : [])));
  const edits = new Map(changes.flatMap((c) => (c.kind === "change" ? [[c.taskId, c.to] as const] : [])));
  const kept = v.tasks.filter((t) => !removed.has(t.id)).map((t) => {
    const e = edits.get(t.id);
    return e ? patched(t, e) : t;
  });
  const added = changes.flatMap((c) => (c.kind === "add" ? [addedTask(c.task)] : []));
  const terms = changes.reduce((acc, c) => (c.kind === "terms" ? nextTerms(acc, c.to, rateFrom) : acc), v.terms);
  return { tasks: [...kept, ...added], terms };
}

const valueOf = (t: ScopeTask, f: TaskField) => (f === "milestone" ? !!t.milestone : t[f]);

function taskDiffs(t: ScopeTask, to: TaskPatch): FieldDiff[] {
  const next = patched(t, to);
  return TASK_FIELDS.filter((f) => valueOf(t, f) !== valueOf(next, f)).map((f) => ({ field: f, was: valueOf(t, f), to: valueOf(next, f) }));
}

function termDiffs(was: ScopeTerms, to: TermsPatch): FieldDiff[] {
  const out: FieldDiff[] = [];
  if (to.rate !== undefined && rateAmount(to.rate) !== rateAmount(was.rate)) out.push({ field: "rate", was: was.rate, to: to.rate });
  if (to.hours !== undefined && to.hours !== was.hours) out.push({ field: "hours", was: was.hours, to: to.hours });
  return out;
}

/** Each change against the version it changes: the task as it was, and every field before and after. */
export function resolveChanges(v: Pick<ContractVersion, "tasks" | "terms">, changes: readonly ScopeChange[]): ResolvedChange[] {
  const byId = new Map(v.tasks.map((t) => [t.id, t]));
  return changes.flatMap((c): ResolvedChange[] => {
    if (c.kind === "add") return [{ id: c.id, kind: "add", task: addedTask(c.task) }];
    if (c.kind === "terms") return [{ id: c.id, kind: "terms", fields: termDiffs(v.terms, c.to) }];
    const t = byId.get(c.taskId);
    if (!t) return [];
    return c.kind === "remove" ? [{ id: c.id, kind: "remove", task: t }] : [{ id: c.id, kind: "change", task: t, fields: taskDiffs(t, c.to) }];
  });
}

/**
 * The changes that would bring `current` back to `target` — proposing an earlier version again.
 * Work that's done or in review can't change, so a difference there is left out (`skipped`).
 */
export function restoreChanges(current: Pick<ContractVersion, "tasks" | "terms">, target: Pick<ContractVersion, "tasks" | "terms">, items: ReadonlyMap<string, WorkItem>, newId: () => string): { changes: ScopeChange[]; skipped: ScopeTask[] } {
  const now = new Map(current.tasks.map((t) => [t.id, t]));
  const then = new Map(target.tasks.map((t) => [t.id, t]));
  const changes: ScopeChange[] = [];
  const skipped: ScopeTask[] = [];
  const settled = (id: string) => !!items.get(id) && lockedStatus(items.get(id) as WorkItem) !== null;
  for (const t of current.tasks) {
    if (then.has(t.id)) continue;
    if (settled(t.id)) skipped.push(t);
    else changes.push({ id: newId(), kind: "remove", taskId: t.id });
  }
  for (const t of target.tasks) {
    const was = now.get(t.id);
    if (!was) changes.push({ id: newId(), kind: "add", task: t });
    else if (!taskDiffs(was, fullPatch(t)).length) continue;
    else if (settled(t.id)) skipped.push(was);
    else changes.push({ id: newId(), kind: "change", taskId: t.id, to: fullPatch(t) });
  }
  const terms = termDiffs(current.terms, { rate: target.terms.rate, hours: target.terms.hours });
  if (terms.length) changes.push({ id: newId(), kind: "terms", to: Object.fromEntries(terms.map((d) => [d.field, d.to])) as TermsPatch });
  return { changes, skipped };
}

/** Every contractual field of `t`, as a patch that sets them all (clearing what it doesn't have). */
const fullPatch = (t: ScopeTask): TaskPatch => ({ title: t.title, description: t.description ?? null, due: t.due ?? null, effort: t.effort ?? null, milestone: !!t.milestone });

/* -------------------------------------------------------------- the rules */

/** What checking an amendment needs: the version it changes and the work as it stands now. */
export type AmendmentContext = {
  base: Pick<ContractVersion, "tasks" | "terms">;
  /** Every work item, deleted ones included, by id. */
  items: ReadonlyMap<string, WorkItem>;
  today: Day;
  /** A trial's last day: nothing is due after it. */
  lastDay?: Day | null;
};

/** Why a contract task's scope can't change now, if it can't: it's done, or its work is in review. */
export function lockedStatus(t: Pick<WorkItem, "status" | "number" | "title">): string | null {
  if (isCompleted(t.status)) return `${refOf(t)} “${t.title}” is done, so what was delivered stands.`;
  if (t.status === "review") return `${refOf(t)} “${t.title}” is waiting on review. Once it's reviewed it can't change either — propose this before it's sent.`;
  return null;
}

const bad = (field: string, message: string): Invalid => ({ field, message });

/** The first problem `check` finds in `list`, or null. */
function firstOf<T>(list: readonly T[], check: (x: T) => Invalid | null): Invalid | null {
  for (const x of list) {
    const e = check(x);
    if (e) return e;
  }
  return null;
}

/** One change per task, one to the terms, each id once. */
function checkTargets(changes: readonly ScopeChange[]): Invalid | null {
  const ids = new Set<string>();
  const tasks = new Set<string>();
  let terms = 0;
  for (const c of changes) {
    if (ids.has(c.id)) return bad("changes", "A change is listed twice.");
    ids.add(c.id);
    if (c.kind === "terms" && ++terms > 1) return bad("terms", "Put every change to the pay in one line.");
    const task = c.kind === "add" ? c.task.id : c.kind === "terms" ? null : c.taskId;
    if (task && tasks.has(task)) return bad("changes", "Each task can only be changed once in an amendment. Put everything about it in one change.");
    if (task) tasks.add(task);
  }
  return null;
}

/** A task's fields, as the next version would hold them: a name, requirements, a deadline, an estimate. */
function checkFields(t: ScopeTask, was: ScopeTask | null, ctx: AmendmentContext): Invalid | null {
  const type = t.milestone ? "milestone" : "task";
  if (t.milestone && !t.due) return bad("due", `A milestone is a date. Give “${t.title}” a due date.`);
  return checkTitle(t.title) ?? checkDescription(t.description) ?? checkDates({ due: t.due, type }, was ? { due: was.due } : null, { today: ctx.today, lastDay: ctx.lastDay }) ?? checkEffort(t.effort, type);
}

/** An existing contract task, if `id` is one that can still change. */
function changeable(id: string, ctx: AmendmentContext): { task: ScopeTask } | Invalid {
  const task = ctx.base.tasks.find((t) => t.id === id);
  const item = ctx.items.get(id);
  if (!task || !item || isArchived(item)) return bad("changes", "That task isn't in the contract any more.");
  const locked = lockedStatus(item);
  return locked ? bad("changes", locked) : { task };
}

function checkChange(c: ScopeChange, ctx: AmendmentContext): Invalid | null {
  if (c.kind === "terms") return checkTerms(c.to, ctx.base.terms);
  if (c.kind === "add") {
    const existing = ctx.items.get(c.task.id);
    if (existing && (!isArchived(existing) || !existing.agreed)) return bad("changes", "That task is already on the contract.");
    return checkFields(addedTask(c.task), null, ctx);
  }
  const found = changeable(c.taskId, ctx);
  if ("field" in found) return found;
  if (c.kind === "remove") return null;
  if (!taskDiffs(found.task, c.to).length) return bad("changes", `Change something about “${found.task.title}”, or propose removing it.`);
  return checkFields(patched(found.task, c.to), found.task, ctx);
}

function checkTerms(to: TermsPatch, was: ScopeTerms): Invalid | null {
  if (to.rate !== undefined && rateAmount(to.rate) <= 0) return bad("rate", "Enter pay above $0.");
  if (to.hours !== undefined) {
    if (was.type !== "part-time") return bad("hours", "Only a part-time role has agreed hours.");
    if (!Number.isInteger(to.hours) || to.hours < HOURS_MIN || to.hours > HOURS_MAX) return bad("hours", `Enter whole hours from ${HOURS_MIN} to ${HOURS_MAX}.`);
  }
  if (!termDiffs(was, to).length) return bad("terms", "That's what's agreed already.");
  return null;
}

/** The version the changes make still holds together: no two tasks with one name, and a trial keeps a task to judge. */
function checkResult(changes: readonly ScopeChange[], ctx: AmendmentContext): Invalid | null {
  const { tasks } = applyChanges(ctx.base, changes);
  const seen = new Map<string, string>();
  for (const t of tasks) {
    const key = t.title.trim().toLowerCase();
    const first = seen.get(key);
    if (first) return bad("title", `Two contract tasks would be called “${first}”. Give one of them another name.`);
    seen.set(key, t.title.trim());
  }
  if (ctx.base.terms.type === "trial" && !tasks.length) return bad("changes", "A trial needs at least one task to be judged on.");
  return null;
}

/** Why an amendment can't be proposed (or accepted) as it stands, or null. The form and the save read the same rules. */
export function checkAmendment(input: { reason: string; changes: readonly ScopeChange[] }, ctx: AmendmentContext): Invalid | null {
  const reason = input.reason.trim();
  if (!reason) return bad("reason", "Say why — it's what the other side decides on.");
  if (reason.length > REASON_MAX) return bad("reason", `Keep the reason under ${REASON_MAX.toLocaleString("en-US")} characters.`);
  if (!input.changes.length) return bad("changes", "Add a change first: a task to add, change or remove, or new pay.");
  if (input.changes.length > CHANGES_MAX) return bad("changes", `Keep an amendment to ${CHANGES_MAX} changes or fewer.`);
  return checkTargets(input.changes) ?? firstOf(input.changes, (c) => checkChange(c, ctx)) ?? checkResult(input.changes, ctx);
}

/* ---------------------------------------------------------- who does what */

export type AmendmentMove = "revise" | "withdraw" | "accept" | "reject" | "askChanges";

/**
 * What `side` can do with an amendment while the contract takes amendments (`open`): its proposer
 * revises or withdraws it; the other side answers it while it waits on them. Nobody answers their own.
 */
export function amendmentMoves(a: Pick<Amendment, "by" | "status">, side: Side | null, open: boolean): AmendmentMove[] {
  if (!side || !open || !stillOpen(a)) return [];
  if (a.by === side) return ["revise", "withdraw"];
  return a.status === "pending" ? ["accept", "reject", "askChanges"] : [];
}

/* -------------------------------------------------------------- the words */

const TASK_FIELD_LABEL: Record<TaskField | TermField, string> = { title: "name", description: "requirements", due: "due date", effort: "effort", milestone: "milestone", rate: "pay", hours: "hours a week" };

export const fieldLabel = (f: TaskField | TermField) => TASK_FIELD_LABEL[f];

/** A field's value in words: a date as "03 Oct 2026", a milestone as whether it is one, nothing as "none". */
export function valueText(field: TaskField | TermField, v: FieldDiff["was"]): string {
  if (v === undefined || v === "") return "none";
  if (field === "due" && typeof v === "string") {
    const d = dayOf(v);
    return d === null ? v : stampLabel(d);
  }
  if (field === "milestone") return v ? "a milestone" : "not a milestone";
  if (field === "hours") return `${v} a week`;
  return String(v);
}

/** "due date 03 Oct 2026 → 10 Oct 2026, requirements updated": a change's fields, for a feed line. */
export function diffText(fields: readonly FieldDiff[]): string {
  return fields
    .map((d) => {
      if (d.field === "description") return `requirements ${d.to ? "updated" : "cleared"}`;
      if (d.field === "title") return `renamed “${d.was}” → “${d.to}”`;
      return `${fieldLabel(d.field)} ${valueText(d.field, d.was)} → ${valueText(d.field, d.to)}`;
    })
    .join(", ");
}

/** One line for a change: "Add “Stripe checkout”", "Remove #4 “Docs”", "Change #3 “Landing page”: due date, effort", "Pay: $2,500/mo → $3,000/mo". */
export function changeLine(c: ResolvedChange, refOfTask: (id: string) => string | undefined = () => undefined): string {
  const named = (t: ScopeTask) => `${refOfTask(t.id) ? `${refOfTask(t.id)} ` : ""}“${t.title}”`;
  if (c.kind === "add") return `Add “${c.task.title}”`;
  if (c.kind === "remove") return `Remove ${named(c.task)}`;
  if (c.kind === "change") return `Change ${named(c.task)}: ${c.fields.map((d) => fieldLabel(d.field)).join(", ")}`;
  return c.fields.map((d) => (d.field === "rate" ? `Pay: ${d.was} → ${d.to}` : `Hours: ${d.was ?? "—"} → ${d.to} a week`)).join("; ");
}

/** "adds 1 task, changes 2 and the pay" — what an amendment does, for a notification. */
export function changesSummary(changes: readonly ResolvedChange[]): string {
  const n = (kind: ResolvedChange["kind"]) => changes.filter((c) => c.kind === kind).length;
  const tasks = (k: number) => (k === 1 ? "1 task" : `${k} tasks`);
  const parts = [n("add") && `adds ${tasks(n("add"))}`, n("change") && `changes ${tasks(n("change"))}`, n("remove") && `removes ${tasks(n("remove"))}`, n("terms") && "changes the pay"].filter(Boolean) as string[];
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : (parts[0] ?? "changes nothing");
}
