import { dayOf, isoOf, stampLabel, type Day } from "./dates";
import { WorkError } from "./errors";
import { datesOf, hearsComments, indexById, isArchived, isCompleted, isTagColor, PRIORITY_META, refOf, STATUS_META, TAG_COLORS, TYPE_META, type Assignee, type Side, type TagColor, type WorkItem, type WorkPriority, type WorkProject, type WorkStatus, type WorkType } from "./model";
import { orderLast, placeBetween } from "./order";
import { AGREED, agreedNow, canCreate, canPlanProjects, canReorder, capsFor, changeFor, lockedReason, PROJECTS_LATER, sideOf, tickRefusal, transitionFor, VIEWER_ONLY, type Actor, type Names, type TransitionKind, type WorkAccess, type WorkField } from "./permissions";
import { checkComment, checkDates, checkDependency, checkDescription, checkEffort, checkNote, checkProjectName, checkSubtaskTitle, checkTag, checkTitle, normalizeTag, type Invalid } from "./validate";

/**
 * The one way work items change — the prototype's backend. Every view, menu, drag and keyboard
 * shortcut calls these, and so does the test seam; none writes the store directly.
 *
 * Each operation, all or nothing:
 *   1. runs the test hook (latency or a forced failure, in E2E builds only);
 *   2. reads the latest saved state through the port — not what this tab last saw;
 *   3. finds the item (an archived one reads as gone for everything but Restore);
 *   4. checks the actor may make this change to it, as it is now;
 *   5. checks nobody changed the same field since the caller read it (`base`) — a field another
 *      person changed is a conflict and nothing is written; fields they didn't touch merge;
 *   6. validates the result;
 *   7. applies it, bumping `version`, `updatedAt` and `updatedBy`, and logs it on the item's feed;
 *   8. saves it through the port, which throws if the browser refuses — leaving nothing half-saved;
 *   9. only then tells the other side (notifications), so nobody hears about a change that failed.
 * Asking for what's already true (a status it already has, a tag it already carries) succeeds
 * without writing, so a retried request is harmless.
 */

export type WorkState = {
  items: WorkItem[];
  nextNumber: number;
  /** The Independent's work by day, for the activity heatmap (see @/lib/demo/tasks logToken). */
  logs: Record<string, string[]>;
  /** Colours chosen for tags on this contract, by tag; a tag without one takes its default (tagColorOf). */
  tagColors?: Record<string, TagColor>;
  /** TB-148 — the role's projects (./projects); none while it's a trial. */
  projects?: WorkProject[];
};

export type WorkContext = { access: WorkAccess };

export interface WorkPort {
  transact<T>(fn: (state: WorkState, ctx: WorkContext) => { next?: WorkState; result: T }): T;
}

export type WorkNotice =
  | { kind: "task_added" | "task_submitted" | "task_approved" | "task_changes"; task: { id: string; title: string }; note?: string }
  /** A comment, for the side that didn't write it. */
  | { kind: "task_comment"; from: Side; task: { id: string; title: string }; note: string };

export type Clock = () => { ms: number; today: Day; moment: string; stamp: string };

export type Hook = (op: string, itemId: string | null) => void | Promise<void>;

export type CreateInput = {
  id: string;
  title: string;
  description?: string;
  assignee?: Assignee | null;
  type?: WorkType;
  priority?: WorkPriority;
  start?: string;
  due?: string;
  effort?: number;
  tags?: string[];
  /** The project it goes in (an active one's id); none is no project. */
  project?: string;
  /** Place it under this item / above that one in manual order; otherwise it goes last. */
  after?: string;
  before?: string;
};

export type WorkPatch = Partial<{
  title: string;
  description: string | null;
  type: WorkType;
  priority: WorkPriority | null;
  assignee: Assignee | null;
  start: string | null;
  due: string | null;
  effort: number | null;
  /** Move it to a project, or out of one (null). */
  project: string | null;
}>;
/** A field a patch sets: each is a WorkField, so changeFor rules on it; the tags have operations of their own. */
export type PatchField = keyof WorkPatch;
/** The values the caller saw for the fields it's changing. */
type PatchBase = Partial<Record<PatchField, unknown>>;

type MoveInput = {
  status?: WorkStatus;
  /** The status the caller saw — a precondition, so a move made on a stale screen is refused. */
  from?: WorkStatus;
  note?: string;
  set?: WorkPatch;
  base?: PatchBase;
  after?: string;
  before?: string;
};

type TransitionInput = { to: WorkStatus; from?: WorkStatus; note?: string };

export type WorkRepository = ReturnType<typeof createWorkRepository>;

const FIELD_LABEL: Record<PatchField, string> = { title: "name", description: "description", type: "work type", priority: "priority", assignee: "assignee", start: "start date", due: "due date", effort: "effort", project: "project" };

/** "2026-10-03" → "03 Oct 2026" for the feed. */
const dateText = (iso: string) => {
  const d = dayOf(iso);
  return d === null ? iso : stampLabel(d);
};

const norm = (v: unknown) => (v === null || v === undefined || v === "" ? undefined : v);
const same = (a: unknown, b: unknown) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));

const TRIAL_AGREED = "The trial's tasks were agreed in the signed offer, so no more can be added.";

/* ------------------------------------------------------------- plumbing */

/** What every operation works with: the person changing the work, on which side, and where it's saved. */
type Repo = {
  actor: Actor;
  /** The actor's side of the contract; none for an admin. */
  side: Side | null;
  /** First names, for reasons a person reads. */
  names: Names;
  port: WorkPort;
  clock: Clock;
  notify?: (n: WorkNotice) => void;
  hook?: Hook;
};

type Now = ReturnType<Clock>;
type Result = { item: WorkItem; notices?: WorkNotice[] };
type Step = (state: WorkState, ctx: WorkContext, now: Now) => { next?: WorkState; result: Result };
/** A change to one live item, given the item as it is now. */
type ItemStep = (t: WorkItem, state: WorkState, access: WorkAccess, now: Now) => { next?: WorkState; result: Result };
/** A change to the contract's projects, once it's known the person may plan them. */
type ProjectStep = (state: WorkState, now: Now) => { next?: WorkState; result: WorkProject };

async function run(r: Repo, op: string, itemId: string | null, step: Step): Promise<WorkItem> {
  await r.hook?.(op, itemId);
  const now = r.clock();
  const { item, notices } = r.port.transact((state, ctx) => step(state, ctx, now));
  for (const n of notices ?? []) {
    try {
      r.notify?.(n);
    } catch {
      // The change is saved; a notification that fails to send doesn't undo it.
    }
  }
  return item;
}

/** A change to one live item: found as it is now (an archived one reads as gone), and only while it's open to change. */
function runOnItem(r: Repo, op: string, id: string, step: ItemStep): Promise<WorkItem> {
  return run(r, op, id, (state, { access }, now) => {
    const t = find(state, id);
    unlocked(r, t, access);
    return step(t, state, access, now);
  });
}

/**
 * A change to the contract's projects rather than to one item: the same steps, returning the project.
 * Only whoever plans the projects makes one (canPlanProjects).
 */
async function runProject(r: Repo, op: string, step: ProjectStep): Promise<WorkProject> {
  await r.hook?.(op, null);
  const now = r.clock();
  return r.port.transact((state, { access }) => {
    need(r, canPlanProjects(r.actor, access), () => projectDenied(r, access));
    return step(state, now);
  });
}

function findProject(state: WorkState, id: string): WorkProject {
  const p = (state.projects ?? []).find((x) => x.id === id);
  if (!p) throw new WorkError("not_found", "That project doesn't exist any more.");
  return p;
}

const withProject = (state: WorkState, p: WorkProject): WorkState => ({ ...state, projects: (state.projects ?? []).map((x) => (x.id === p.id ? p : x)) });

function find(state: WorkState, id: string, { archived = false } = {}): WorkItem {
  const t = state.items.find((x) => x.id === id);
  if (!t) throw new WorkError("not_found", "That item doesn't exist any more.");
  if (isArchived(t) && !archived) throw new WorkError("not_found", `${refOf(t)} has been deleted, so it can't be changed. Restore it first.`);
  return t;
}

/** The item with `change` applied and the save stamped on it, in the list. */
function save(r: Repo, state: WorkState, t: WorkItem, now: Now, lines: string[], extra?: Partial<WorkState>): { next: WorkState; item: WorkItem } {
  const events = lines.map((text) => ({ ts: now.ms, at: now.moment, text }));
  const item: WorkItem = { ...t, version: t.version + 1, updatedAt: now.ms, updatedBy: r.actor.name, activity: [...events.reverse(), ...t.activity] };
  return { next: { ...state, ...extra, items: (extra?.items ?? state.items).map((x) => (x.id === t.id ? item : x)) }, item };
}

/** The Independent's work goes on the heatmap: `done:` marks a submission. */
function logged(r: Repo, state: WorkState, now: Now, token: string): Record<string, string[]> {
  if (r.side !== "independent") return state.logs;
  const key = isoOf(now.today);
  const day = state.logs[key] ?? [];
  return day.includes(token) ? state.logs : { ...state.logs, [key]: [...day, token] };
}

/** Every item with the rank a renumbering gave it; the rest as they were. */
const renumbered = (items: WorkItem[], renumber: ReadonlyMap<string, number>) => items.map((x) => (renumber.has(x.id) ? { ...x, order: renumber.get(x.id) as number } : x));

/* ---------------------------------------------------------------- rules */

const viewerOnly = () => new WorkError("forbidden", VIEWER_ONLY);

/** Why a contract that's closed takes no new work. */
const whyClosed = (access: WorkAccess) => access.closedReason ?? "This contract isn't taking new work.";

/** Why a change was refused: the contract is closed, or else `reason`. */
const refusal = (access: WorkAccess, reason: string) => (access.open ? reason : whyClosed(access));

const projectDenied = (r: Repo, access: WorkAccess) => (access.trial ? PROJECTS_LATER : refusal(access, `${r.names.team} runs the projects.`));

/** Finished work — a finished project's, or the trial's chapter — is read-only (lockedReason). */
function unlocked(r: Repo, t: WorkItem, access: WorkAccess) {
  if (r.actor.role === "viewer") throw viewerOnly();
  const lock = lockedReason(t, access);
  if (lock) throw new WorkError("forbidden", lock);
}

function invalid(e: Invalid | null) {
  if (e) throw new WorkError("validation", e.message, { field: e.field });
}

function need(r: Repo, ok: boolean, message: () => string) {
  if (r.actor.role === "viewer") throw viewerOnly();
  if (!ok) throw new WorkError("forbidden", message());
}

/**
 * A field is this person's to change on this item as it is now — the same answer every control got
 * (changeFor): a field the signed offer set stays as agreed, and the rest follows who they are.
 */
function needField(r: Repo, t: WorkItem, field: WorkField, access: WorkAccess) {
  const change = changeFor(t, r.actor, access, field, r.names);
  if (!change.ok) throw new WorkError("forbidden", change.reason);
}

/** Why what an item waits on can't be changed. */
function dependDenied(r: Repo, t: WorkItem, access: WorkAccess): string {
  if (!access.open) return whyClosed(access);
  if (r.actor.role === "contributor" && t.assignee !== "independent") return `It isn't yours to work on, so ${r.names.team} says what it waits on.`;
  return "It's done, so its plan is final. Reopen it to change it.";
}

/** Where work can go: an active project on this contract, or no project (null). */
function checkTarget(projects: readonly WorkProject[] | undefined, id: string | null | undefined) {
  if (!id) return null;
  const p = (projects ?? []).find((x) => x.id === id);
  if (!p) throw new WorkError("not_found", "That project doesn't exist any more.", { field: "project" });
  if (p.status === "done") throw new WorkError("validation", `“${p.name}” is finished. Reopen it to add work to it.`, { field: "project" });
  return p;
}

/* ---------------------------------------------------------------- patch */

/** A field's line on the feed, from the item with the change applied (`merged`) and as it was (`was`). */
type FieldLine = (merged: WorkItem, r: Repo, was: WorkItem, projects?: readonly WorkProject[]) => string;

/** What the feed says once each field has changed; the line then ends " by <name>". */
const FIELD_LINE: Record<PatchField, FieldLine> = {
  title: (m) => `Renamed to “${m.title}”`,
  description: (m) => (m.description ? "Description updated" : "Description cleared"),
  type: (m) => `Work type set to ${TYPE_META[m.type].label}`,
  priority: (m) => (m.priority ? `Priority set to ${PRIORITY_META[m.priority].label}` : "Priority cleared"),
  assignee: (m, r) => (m.assignee ? `Assigned to ${m.assignee === "team" ? r.names.team : r.names.independent}` : "Unassigned"),
  start: (m) => (m.start ? `Start date set to ${dateText(m.start)}` : "Start date cleared"),
  due: (m) => (m.due ? `Due date set to ${dateText(m.due)}` : "Due date cleared"),
  effort: (m) => (m.effort !== undefined ? `Effort set to ${m.effort}` : "Effort cleared"),
  project: (m, _r, was, projects) => {
    const to = checkTarget(projects, m.project);
    const from = (projects ?? []).find((x) => x.id === was.project);
    return to ? `Moved to “${to.name}”` : from ? `Moved out of “${from.name}”` : "Moved out of its project";
  },
};

/** Each field is this person's to change, on this item as it is now. */
function checkAllowed(r: Repo, t: WorkItem, fields: readonly PatchField[], access: WorkAccess) {
  for (const f of fields) needField(r, t, f, access);
}

/** Nobody else changed a field since the caller read it (`base`) — unless they changed it to what the caller wants. */
function checkUnchanged(t: WorkItem, fields: readonly PatchField[], changes: WorkPatch, base: PatchBase | undefined) {
  for (const f of fields) {
    if (!base || !(f in base)) continue;
    if (!same(t[f], base[f]) && !same(t[f], changes[f]))
      throw new WorkError("conflict", `${t.updatedBy ?? "Someone"} changed the ${FIELD_LABEL[f]} while you were editing, so yours wasn't saved.`, { field: f, conflict: { field: f, yours: changes[f], theirs: t[f], by: t.updatedBy } });
  }
}

/** A field's new value written on the item; a cleared field is removed. */
function setField(merged: WorkItem, f: PatchField, value: unknown) {
  // A name is never cleared, only replaced: an empty one fails validation (checkPatched).
  if (f === "title") merged.title = String(value ?? "");
  // Unassigned is a value (null), not a missing field — a missing one reads as the Independent's.
  else if (f === "assignee") merged.assignee = (value as WorkItem["assignee"] | undefined) ?? null;
  else if (value === null || value === undefined || value === "") delete (merged as Record<string, unknown>)[f];
  else (merged as Record<string, unknown>)[f] = value;
}

/** The merged item keeps the rules for the fields that changed: its name, description, dates and effort. */
function checkPatched(merged: WorkItem, t: WorkItem, fields: readonly PatchField[], access: WorkAccess, today: Day) {
  if (fields.includes("title")) invalid(checkTitle(merged.title));
  if (fields.includes("description")) invalid(checkDescription(merged.description));
  if (fields.some((f) => f === "start" || f === "due" || f === "type")) invalid(checkDates(merged, t, { today, lastDay: dayOf(access.lastDay) }));
  if (fields.some((f) => f === "effort" || f === "type")) invalid(checkEffort(merged.effort, merged.type));
}

/**
 * `changes` checked against the item as it is now, and the merged result — or nothing to do.
 * Throws when a field isn't this person's to change, another person changed it first, or the
 * result breaks a rule.
 */
function applyPatch(r: Repo, t: WorkItem, changes: WorkPatch, base: PatchBase | undefined, access: WorkAccess, today: Day, projects?: readonly WorkProject[]): { merged: WorkItem; lines: string[]; notices: WorkNotice[] } {
  const fields = Object.keys(changes) as PatchField[];
  checkAllowed(r, t, fields, access);
  checkUnchanged(t, fields, changes, base);
  const merged: WorkItem = { ...t };
  const lines: string[] = [];
  const notices: WorkNotice[] = [];
  for (const f of fields) {
    const raw = changes[f];
    const value = typeof raw === "string" ? raw.trim() : raw;
    if (same(t[f], value)) continue;
    setField(merged, f, value);
    // Only the fields the feed knows get a line; anything else a caller sends goes unlogged.
    if (Object.hasOwn(FIELD_LINE, f)) lines.push(`${FIELD_LINE[f](merged, r, t, projects)} by ${r.actor.name}`);
    if (f === "assignee" && merged.assignee === "independent") notices.push({ kind: "task_added", task: { id: t.id, title: merged.title } });
  }
  if (!lines.length) return { merged: t, lines, notices };
  checkPatched(merged, t, fields, access, today);
  return { merged, lines, notices };
}

/* --------------------------------------------------------------- status */

/**
 * The dates follow the work. Starting it starts it today — unless it already has an earlier start
 * (planned, or from before a pause), or is overdue, where a start today would come after its due
 * date. Finishing it (approved, or the Team Builder's own marked Done) ends it today; the feed
 * keeps the due date it had. Milestones are a planned date, so they keep theirs — and so does a
 * task from the signed offer while its terms hold (`agreed`): its due date is the one agreed, which
 * finishing doesn't rewrite.
 */
function startedDates(t: WorkItem, today: Day): { item: WorkItem; line?: string } {
  const { start, due } = datesOf(t);
  if (t.type === "milestone" || (start !== null && start <= today) || (due !== null && due < today)) return { item: t };
  return { item: { ...t, start: isoOf(today) }, line: `Start date set to ${stampLabel(today)} as the work began` };
}
function finishedDates(t: WorkItem, today: Day, agreed: boolean): { item: WorkItem; line?: string } {
  const { start, due } = datesOf(t);
  if (t.type === "milestone" || (due === today && (start === null || start <= today))) return { item: t };
  if (agreed) return { item: start !== null && start > today ? { ...t, start: isoOf(today) } : t, line: t.due && due !== today ? `Finished on ${stampLabel(today)} — the agreed due date was ${dateText(t.due)}` : undefined };
  return {
    item: { ...t, due: isoOf(today), ...(start !== null && start > today ? { start: isoOf(today) } : {}) },
    line: `Finished on ${stampLabel(today)}${t.due && due !== today ? ` (was due ${dateText(t.due)})` : ""}`,
  };
}

/** What a status change does to the item, its feed line, and who hears about it. */
function applyTransition(r: Repo, t: WorkItem, to: WorkStatus, kind: TransitionKind, note: string | undefined, now: Now, access: WorkAccess): { item: WorkItem; lines: string[]; notice?: WorkNotice; token?: string } {
  const s = statusChange(r, t, to, kind, note, now);
  const dated = kind === "start" ? startedDates(s.item, now.today) : kind === "approve" || kind === "complete" ? finishedDates(s.item, now.today, agreedNow(t, access)) : { item: s.item };
  return { ...s, item: dated.item, lines: dated.line ? [s.line, dated.line] : [s.line] };
}

function statusChange(r: Repo, t: WorkItem, to: WorkStatus, kind: TransitionKind, note: string | undefined, now: Now): { item: WorkItem; line: string; notice?: WorkNotice; token?: string } {
  const task = { id: t.id, title: t.title };
  const text = note?.trim() || undefined;
  const label = STATUS_META[to].label;
  const by = r.actor.name;
  switch (kind) {
    case "start":
    case "pause":
      return { item: { ...t, status: to }, line: `Moved to ${label} by ${by}`, token: t.id };
    case "submit":
      return {
        item: { ...t, status: "review", submitted: { at: now.moment, ...(text ? { note: text } : {}) }, changes: undefined },
        line: `Sent for review by ${by}${text ? ` — “${text}”` : ""}`,
        notice: { kind: "task_submitted", task, note: text },
        token: `done:${t.id}`,
      };
    case "takeBack":
      return { item: { ...t, status: to, submitted: undefined }, line: `Submission taken back by ${by}`, token: t.id };
    case "approve":
      return { item: { ...t, status: "done", approved: { at: now.moment, by }, completedAt: now.ms, completedBy: by }, line: `Approved by ${by}`, notice: { kind: "task_approved", task } };
    case "requestChanges":
      return {
        item: { ...t, status: "doing", submitted: undefined, changes: { note: text ?? "", at: now.moment, by } },
        line: `Changes requested by ${by} — “${text ?? ""}”`,
        notice: { kind: "task_changes", task, note: text },
      };
    case "complete":
      return { item: { ...t, status: "done", completedAt: now.ms, completedBy: by }, line: `Marked Done by ${by}` };
    case "reopen":
      return { item: { ...t, status: to, completedAt: undefined, completedBy: undefined, approved: undefined }, line: `Reopened by ${by}` };
  }
}

/** A status change checked against the item as it is now: its precondition, the rules, the note. */
function checkedTransition(r: Repo, t: WorkItem, to: WorkStatus, from: WorkStatus | undefined, note: string | undefined, access: WorkAccess) {
  if (r.actor.role === "viewer") throw viewerOnly();
  if (from !== undefined && t.status !== from) throw new WorkError("conflict", `${t.updatedBy ?? "Someone"} moved it to ${STATUS_META[t.status].label} first, so your change wasn't saved.`, { field: "status", conflict: { field: "status", yours: to, theirs: t.status, by: t.updatedBy } });
  const tr = transitionFor(t, r.actor, access, to, r.names);
  if (!tr.ok) throw new WorkError("forbidden", tr.reason);
  if (tr.needsNote) invalid(checkNote(note, true));
  else invalid(checkNote(note, false));
  return tr.kind;
}

/* ------------------------------------------------------------- projects */

/** TB-148 — a new project, at the end of the list. A retry with the same id and name is harmless. */
function createProject(r: Repo, input: { id: string; name: string }) {
  return runProject(r, "createProject", (state, now) => {
    const list = state.projects ?? [];
    const existing = list.find((p) => p.id === input.id);
    if (existing) {
      if (existing.name === input.name.trim()) return { result: existing };
      throw new WorkError("conflict", "A project with that id already exists.");
    }
    invalid(checkProjectName(input.name, list));
    const p: WorkProject = { id: input.id, name: input.name.trim(), status: "active", order: Math.max(0, ...list.map((x) => x.order)) + 1, createdAt: now.ms, createdBy: r.actor.name };
    return { next: { ...state, projects: [...list, p] }, result: p };
  });
}

function renameProject(r: Repo, id: string, name: string) {
  return runProject(r, "renameProject", (state) => {
    const p = findProject(state, id);
    if (p.name === name.trim()) return { result: p };
    invalid(checkProjectName(name, state.projects ?? [], id));
    const next = { ...p, name: name.trim() };
    return { next: withProject(state, next), result: next };
  });
}

/**
 * Finished: out of the open work, its items kept. Only once everything in it is done — open
 * work is finished or moved first, so nothing still being worked on drops out of sight.
 */
function finishProject(r: Repo, id: string) {
  return runProject(r, "finishProject", (state, now) => {
    const p = findProject(state, id);
    if (p.status === "done") return { result: p };
    const open = state.items.filter((t) => !isArchived(t) && t.project === id && !isCompleted(t.status));
    const n = open.length;
    if (n) throw new WorkError("validation", `${n === 1 ? "1 item" : `${n} items`} in “${p.name}” ${n === 1 ? "is" : "are"} still open. Finish ${n === 1 ? "it" : "them"} or move ${n === 1 ? "it" : "them"} to another project first.`, { field: "project" });
    const next: WorkProject = { ...p, status: "done", completedAt: now.ms, completedBy: r.actor.name };
    return { next: withProject(state, next), result: next };
  });
}

/** TB-148 — a finished project put away: out of the project list, kept under Archived. */
function archiveProject(r: Repo, id: string) {
  return runProject(r, "archiveProject", (state, now) => {
    const p = findProject(state, id);
    if (p.archivedAt !== undefined) return { result: p };
    if (p.status !== "done") throw new WorkError("validation", `“${p.name}” is still active. Mark it finished before archiving it.`, { field: "project" });
    const next: WorkProject = { ...p, archivedAt: now.ms, archivedBy: r.actor.name };
    return { next: withProject(state, next), result: next };
  });
}

function unarchiveProject(r: Repo, id: string) {
  return runProject(r, "unarchiveProject", (state) => {
    const p = findProject(state, id);
    if (p.archivedAt === undefined) return { result: p };
    const { archivedAt: _at, archivedBy: _by, ...rest } = p;
    return { next: withProject(state, rest), result: rest };
  });
}

/**
 * TB-148 — the project goes for good; its work doesn't. A finished project (or one with nothing
 * in it) can be deleted, and whatever was in it stays, outside a project, with its history — approved
 * work is the contract's record (the score, payments, disputes), so deleting a project never
 * deletes it. An active project with work in it is finished (or emptied) first.
 */
function deleteProject(r: Repo, id: string) {
  return runProject(r, "deleteProject", (state, now) => {
    const p = findProject(state, id);
    const inIt = state.items.filter((t) => t.project === id);
    if (p.status !== "done" && inIt.some((t) => !isArchived(t))) throw new WorkError("validation", `“${p.name}” still has work in it. Finish it, or move its work out, before deleting it.`, { field: "project" });
    const line = { ts: now.ms, at: now.moment, text: `Moved out of “${p.name}” — the project was deleted by ${r.actor.name}` };
    const items = state.items.map((t) => {
      if (t.project !== id) return t;
      const { project: _gone, ...rest } = t;
      return { ...rest, version: t.version + 1, updatedAt: now.ms, updatedBy: r.actor.name, activity: [line, ...t.activity] };
    });
    return { next: { ...state, items, projects: (state.projects ?? []).filter((x) => x.id !== id) }, result: p };
  });
}

function reopenProject(r: Repo, id: string) {
  return runProject(r, "reopenProject", (state) => {
    const p = findProject(state, id);
    if (p.status === "active") return { result: p };
    const next: WorkProject = { id: p.id, name: p.name, status: "active", order: p.order, createdAt: p.createdAt, ...(p.createdBy ? { createdBy: p.createdBy } : {}) };
    return { next: withProject(state, next), result: next };
  });
}

/* ---------------------------------------------------------------- items */

/** A new item's fields, checked in turn: its wording, dates, effort and tags, and the project it goes in. */
function checkNew(r: Repo, input: CreateInput, state: WorkState, access: WorkAccess, today: Day): { type: WorkType; tags: string[]; project: WorkProject | null } {
  invalid(checkTitle(input.title));
  invalid(checkDescription(input.description));
  const type = input.type ?? "task";
  invalid(checkDates({ start: input.start, due: input.due, type }, null, { today, lastDay: dayOf(access.lastDay) }));
  invalid(checkEffort(input.effort, type));
  const tags: string[] = [];
  for (const tag of new Set((input.tags ?? []).map(normalizeTag))) {
    invalid(checkTag(tag, tags));
    tags.push(tag);
  }
  if (input.project) need(r, !access.trial, () => PROJECTS_LATER);
  return { type, tags, project: checkTarget(state.projects, input.project) };
}

/** A new item as it's first saved (checkNew): numbered next, last in manual order, its first line on the feed. */
function newItem(r: Repo, input: CreateInput, state: WorkState, access: WorkAccess, now: Now): WorkItem {
  const { type, tags, project } = checkNew(r, input, state, access, now.today);
  return {
    id: input.id,
    number: state.nextNumber,
    title: input.title.trim(),
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    status: "todo",
    ...(input.priority ? { priority: input.priority } : {}),
    type,
    assignee: input.assignee === undefined ? "independent" : input.assignee,
    ...(input.start ? { start: input.start } : {}),
    ...(input.due ? { due: input.due } : {}),
    ...(input.effort !== undefined ? { effort: input.effort } : {}),
    dependsOn: [],
    tags,
    order: orderLast(state.items),
    addedBy: "team",
    ...(access.trial ? { trial: true } : {}),
    ...(project ? { project: project.id } : {}),
    created: now.stamp,
    createdAt: now.ms,
    createdBy: r.actor.name,
    updatedAt: now.ms,
    updatedBy: r.actor.name,
    version: 1,
    subtasks: [],
    activity: [{ ts: now.ms, at: now.moment, text: `Added by ${r.actor.name}${project ? ` to “${project.name}”` : ""}` }],
    comments: [],
  };
}

/** A new item — added by the Team Builder to a role, never a trial (TB-064). A retry with the same id and title is harmless. */
function create(r: Repo, input: CreateInput) {
  return run(r, "create", input.id, (state, { access }, now) => {
    need(r, canCreate(r.actor, access), () => refusal(access, access.trial ? TRIAL_AGREED : `Only ${r.names.team} adds work to this contract.`));
    const existing = state.items.find((t) => t.id === input.id);
    if (existing) {
      if (existing.title === input.title.trim()) return { result: { item: existing } };
      throw new WorkError("conflict", "An item with that id already exists.");
    }
    const item = newItem(r, input, state, access, now);
    let items = state.items;
    if (input.after || input.before) {
      const place = placeBetween([...state.items.filter((t) => !isArchived(t)), item], item.id, input.after, input.before);
      if ("order" in place) item.order = place.order;
      else {
        item.order = place.renumber.get(item.id) ?? item.order;
        items = renumbered(state.items, place.renumber);
      }
    }
    items = [...items, item];
    return {
      next: { ...state, items, nextNumber: state.nextNumber + 1 },
      result: { item, notices: item.assignee === "independent" ? [{ kind: "task_added", task: { id: item.id, title: item.title } }] : [] },
    };
  });
}

function patch(r: Repo, id: string, changes: WorkPatch, base?: PatchBase) {
  return runOnItem(r, "patch", id, (t, state, access, now) => {
    const { merged, lines, notices } = applyPatch(r, t, changes, base, access, now.today, state.projects);
    if (!lines.length) return { result: { item: t } };
    const { next, item } = save(r, state, merged, now, lines);
    return { next, result: { item, notices } };
  });
}

function transition(r: Repo, id: string, input: TransitionInput) {
  return runOnItem(r, "transition", id, (t, state, access, now) => {
    if (t.status === input.to) return { result: { item: t } };
    const kind = checkedTransition(r, t, input.to, input.from, input.note, access);
    const { item: changed, lines, notice, token } = applyTransition(r, t, input.to, kind, input.note, now, access);
    const { next, item } = save(r, state, changed, now, lines, { logs: token ? logged(r, state, now, token) : state.logs });
    return { next, result: { item, notices: notice ? [notice] : [] } };
  });
}

/** A board drop in one write: a new status or group value, and a place in manual order. */
function move(r: Repo, id: string, input: MoveInput) {
  return runOnItem(r, "move", id, (t, state, access, now) => {
    let current = t;
    const lines: string[] = [];
    const notices: WorkNotice[] = [];
    let logs = state.logs;
    if (input.status && input.status !== t.status) {
      const kind = checkedTransition(r, t, input.status, input.from, input.note, access);
      const s = applyTransition(r, t, input.status, kind, input.note, now, access);
      current = s.item;
      lines.push(...s.lines);
      if (s.notice) notices.push(s.notice);
      if (s.token) logs = logged(r, state, now, s.token);
    }
    if (input.set) {
      const p = applyPatch(r, current, input.set, input.base, access, now.today, state.projects);
      current = p.merged;
      lines.push(...p.lines);
      notices.push(...p.notices);
    }
    let items = state.items;
    if (input.after !== undefined || input.before !== undefined) {
      need(r, canReorder(r.actor, access), () => refusal(access, `${r.names.team} sets the order of the work.`));
      const live = state.items.filter((x) => !isArchived(x));
      const place = placeBetween(live, id, input.after, input.before);
      if ("order" in place) {
        if (place.order !== current.order) current = { ...current, order: place.order };
      } else {
        items = renumbered(state.items, place.renumber);
        current = { ...current, order: place.renumber.get(id) ?? current.order };
      }
    }
    if (current === t && items === state.items) return { result: { item: t } };
    // A reorder alone isn't worth a line on the feed.
    const { next, item } = save(r, { ...state, items }, current, now, lines, { logs });
    return { next, result: { item, notices } };
  });
}

/** Deleting, to the user: the item is archived, so Restore can bring it back. */
function archive(r: Repo, id: string) {
  return run(r, "archive", id, (state, { access }, now) => {
    const t = find(state, id, { archived: true });
    unlocked(r, t, access);
    if (isArchived(t)) return { result: { item: t } };
    need(r, capsFor(t, r.actor, access).archive, () =>
      refusal(access, agreedNow(t, access) ? AGREED : t.addedBy !== r.side ? "Only whoever added it can delete it." : "It's been sent for review or approved, so it stays on the list."),
    );
    const { next, item } = save(r, state, { ...t, archivedAt: now.ms, archivedBy: r.actor.name }, now, [`Deleted by ${r.actor.name}`]);
    return { next, result: { item } };
  });
}

function restore(r: Repo, id: string) {
  return run(r, "restore", id, (state, { access }, now) => {
    const t = find(state, id, { archived: true });
    unlocked(r, t, access);
    if (!isArchived(t)) return { result: { item: t } };
    need(r, capsFor(t, r.actor, access).restore, () => refusal(access, "Only whoever deleted it can restore it."));
    const { next, item } = save(r, state, { ...t, archivedAt: undefined, archivedBy: undefined }, now, [`Restored by ${r.actor.name}`]);
    return { next, result: { item } };
  });
}

/* ------------------------------------------------------ an item's parts */

function addDependency(r: Repo, id: string, onId: string) {
  return runOnItem(r, "addDependency", id, (t, state, access, now) => {
    need(r, capsFor(t, r.actor, access).depend, () => dependDenied(r, t, access));
    if (t.dependsOn.includes(onId)) return { result: { item: t } };
    invalid(checkDependency(id, onId, indexById(state.items)));
    const on = state.items.find((x) => x.id === onId) as WorkItem;
    const { next, item } = save(r, state, { ...t, dependsOn: [...t.dependsOn, onId] }, now, [`Now waits on ${refOf(on)} “${on.title}” — set by ${r.actor.name}`]);
    return { next, result: { item } };
  });
}

function removeDependency(r: Repo, id: string, onId: string) {
  return runOnItem(r, "removeDependency", id, (t, state, access, now) => {
    need(r, capsFor(t, r.actor, access).depend, () => dependDenied(r, t, access));
    if (!t.dependsOn.includes(onId)) return { result: { item: t } };
    const on = state.items.find((x) => x.id === onId);
    const { next, item } = save(r, state, { ...t, dependsOn: t.dependsOn.filter((x) => x !== onId) }, now, [`No longer waits on ${on ? refOf(on) : "an item"} — removed by ${r.actor.name}`]);
    return { next, result: { item } };
  });
}

function addTag(r: Repo, id: string, raw: string) {
  return runOnItem(r, "addTag", id, (t, state, access, now) => {
    needField(r, t, "tags", access);
    const tag = normalizeTag(raw);
    if (tag && t.tags.includes(tag)) return { result: { item: t } };
    invalid(checkTag(tag, t.tags));
    const { next, item } = save(r, state, { ...t, tags: [...t.tags, tag] }, now, [`Tagged “${tag}” by ${r.actor.name}`]);
    return { next, result: { item } };
  });
}

function removeTag(r: Repo, id: string, tag: string) {
  return runOnItem(r, "removeTag", id, (t, state, access, now) => {
    needField(r, t, "tags", access);
    if (!t.tags.includes(tag)) return { result: { item: t } };
    const { next, item } = save(r, state, { ...t, tags: t.tags.filter((x) => x !== tag) }, now, [`Tag “${tag}” removed by ${r.actor.name}`]);
    return { next, result: { item } };
  });
}

/**
 * The colour of one of this item's tags — for the whole contract, so the tag reads the same on
 * every item. Whoever may tag the item may colour its tags. It changes no item, so nothing is
 * logged on one and no version moves; asking for the colour it already has writes nothing.
 */
function setTagColor(r: Repo, id: string, tag: string, color: TagColor) {
  return runOnItem(r, "setTagColor", id, (t, state, access) => {
    needField(r, t, "tags", access);
    if (!t.tags.includes(tag)) throw new WorkError("not_found", `${refOf(t)} isn't tagged “${tag}” any more.`);
    if (!isTagColor(color)) throw new WorkError("validation", `Pick one of the tag colours: ${Object.values(TAG_COLORS).map((c) => c.label.toLowerCase()).join(", ")}.`, { field: "tags" });
    if (state.tagColors?.[tag] === color) return { result: { item: t } };
    return { next: { ...state, tagColors: { ...state.tagColors, [tag]: color } }, result: { item: t } };
  });
}

function addSubtask(r: Repo, id: string, sub: { id: string; title: string }) {
  return runOnItem(r, "addSubtask", id, (t, state, access, now) => {
    need(r, capsFor(t, r.actor, access).subtasks, () => refusal(access, t.status === "done" ? "It's done, so its subtasks are final." : `Subtasks are added by whoever does the work.`));
    if (t.subtasks.some((s) => s.id === sub.id)) return { result: { item: t } };
    invalid(checkSubtaskTitle(sub.title));
    const title = sub.title.trim();
    const { next, item } = save(r, state, { ...t, subtasks: [...t.subtasks, { id: sub.id, title, done: false }] }, now, [`Subtask “${title}” added by ${r.actor.name}`], { logs: logged(r, state, now, t.id) });
    return { next, result: { item } };
  });
}

function toggleSubtask(r: Repo, id: string, subId: string, done: boolean) {
  return runOnItem(r, "toggleSubtask", id, (t, state, access, now) => {
    // The reason the sheet's checkboxes give, so a refusal here reads the same.
    const refused = tickRefusal(t, r.actor, access);
    if (refused) throw new WorkError("forbidden", refused);
    const sub = t.subtasks.find((s) => s.id === subId);
    if (!sub) throw new WorkError("not_found", "That subtask was removed.");
    if (sub.done === done) return { result: { item: t } };
    const { next, item } = save(r, state, { ...t, subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done } : s)) }, now, [`Subtask “${sub.title}” ${done ? "done" : "reopened"} by ${r.actor.name}`], { logs: logged(r, state, now, t.id) });
    return { next, result: { item } };
  });
}

function removeSubtask(r: Repo, id: string, subId: string) {
  return runOnItem(r, "removeSubtask", id, (t, state, access, now) => {
    need(r, capsFor(t, r.actor, access).subtasks, () => refusal(access, "Its subtasks are final."));
    const sub = t.subtasks.find((s) => s.id === subId);
    if (!sub) return { result: { item: t } };
    const { next, item } = save(r, state, { ...t, subtasks: t.subtasks.filter((s) => s.id !== subId) }, now, [`Subtask “${sub.title}” removed by ${r.actor.name}`]);
    return { next, result: { item } };
  });
}

function comment(r: Repo, id: string, c: { id: string; text: string }) {
  return runOnItem(r, "comment", id, (t, state, access, now) => {
    need(r, capsFor(t, r.actor, access).comment, () => access.closedReason ?? "This contract has ended, so comments are closed.");
    if (t.comments.some((x) => x.id === c.id)) return { result: { item: t } };
    invalid(checkComment(c.text));
    const from = r.side as Side;
    const text = c.text.trim();
    const { next, item } = save(r, state, { ...t, comments: [...t.comments, { id: c.id, ts: now.ms, at: now.moment, side: from, name: r.actor.name, text }] }, now, []);
    // Said to the other side, so they hear it if it's theirs to follow (hearsComments) — a retry
    // of the same comment (above) says nothing twice.
    const to: Side = from === "team" ? "independent" : "team";
    return { next, result: { item, notices: hearsComments(t, to) ? [{ kind: "task_comment", from, task: { id: t.id, title: t.title }, note: text }] : [] } };
  });
}

/* ----------------------------------------------------------- repository */

/** The repository for one person: every operation above, run as them. */
export function createWorkRepository(opts: { actor: Actor; port: WorkPort; clock: Clock; names?: Names; notify?: (n: WorkNotice) => void; hook?: Hook }) {
  const r: Repo = { ...opts, names: opts.names ?? { team: "the Team Builder", independent: "the Independent" }, side: sideOf(opts.actor) };
  return {
    actor: r.actor,
    createProject: (input: { id: string; name: string }) => createProject(r, input),
    renameProject: (id: string, name: string) => renameProject(r, id, name),
    finishProject: (id: string) => finishProject(r, id),
    archiveProject: (id: string) => archiveProject(r, id),
    unarchiveProject: (id: string) => unarchiveProject(r, id),
    deleteProject: (id: string) => deleteProject(r, id),
    reopenProject: (id: string) => reopenProject(r, id),
    create: (input: CreateInput) => create(r, input),
    patch: (id: string, changes: WorkPatch, base?: PatchBase) => patch(r, id, changes, base),
    transition: (id: string, input: TransitionInput) => transition(r, id, input),
    move: (id: string, input: MoveInput) => move(r, id, input),
    archive: (id: string) => archive(r, id),
    restore: (id: string) => restore(r, id),
    addDependency: (id: string, onId: string) => addDependency(r, id, onId),
    removeDependency: (id: string, onId: string) => removeDependency(r, id, onId),
    addTag: (id: string, raw: string) => addTag(r, id, raw),
    removeTag: (id: string, tag: string) => removeTag(r, id, tag),
    setTagColor: (id: string, tag: string, color: TagColor) => setTagColor(r, id, tag, color),
    addSubtask: (id: string, sub: { id: string; title: string }) => addSubtask(r, id, sub),
    toggleSubtask: (id: string, subId: string, done: boolean) => toggleSubtask(r, id, subId, done),
    removeSubtask: (id: string, subId: string) => removeSubtask(r, id, subId),
    comment: (id: string, c: { id: string; text: string }) => comment(r, id, c),
  };
}
