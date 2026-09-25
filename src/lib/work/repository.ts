import { dayOf, isoOf, stampLabel, type Day } from "./dates";
import { WorkError } from "./errors";
import { datesOf, hearsComments, indexById, isArchived, isCompleted, isTagColor, PRIORITY_META, refOf, STATUS_META, TAG_COLORS, TYPE_META, type Assignee, type Side, type TagColor, type WorkItem, type WorkPriority, type WorkProject, type WorkStatus, type WorkType } from "./model";
import { orderLast, placeBetween } from "./order";
import { canCreate, canPlanProjects, canReorder, capsFor, lockedReason, sideOf, transitionFor, type Actor, type Caps, type Names, type TransitionKind, type WorkAccess } from "./permissions";
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
export type PatchField = keyof WorkPatch;
/** The values the caller saw for the fields it's changing. */
export type PatchBase = Partial<Record<PatchField, unknown>>;

export type MoveInput = {
  status?: WorkStatus;
  /** The status the caller saw — a precondition, so a move made on a stale screen is refused. */
  from?: WorkStatus;
  note?: string;
  set?: WorkPatch;
  base?: PatchBase;
  after?: string;
  before?: string;
};

export type WorkRepository = ReturnType<typeof createWorkRepository>;

const FIELD_LABEL: Record<PatchField, string> = { title: "name", description: "description", type: "work type", priority: "priority", assignee: "assignee", start: "start date", due: "due date", effort: "effort", project: "project" };

/** "2026-10-03" → "03 Oct 2026" for the feed. */
const dateText = (iso: string) => {
  const d = dayOf(iso);
  return d === null ? iso : stampLabel(d);
};

const norm = (v: unknown) => (v === null || v === undefined || v === "" ? undefined : v);
const same = (a: unknown, b: unknown) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));

const PROJECTS_LATER = "Projects start once the trial becomes a full-time or part-time role.";

export function createWorkRepository(opts: { actor: Actor; port: WorkPort; clock: Clock; names?: Names; notify?: (n: WorkNotice) => void; hook?: Hook }) {
  const { actor, port, clock } = opts;
  const names: Names = opts.names ?? { team: "the Team Builder", independent: "the Independent" };
  const side = sideOf(actor);

  type Result = { item: WorkItem; notices?: WorkNotice[] };
  type Step = (state: WorkState, ctx: WorkContext, now: ReturnType<Clock>) => { next?: WorkState; result: Result };

  async function run(op: string, itemId: string | null, step: Step): Promise<WorkItem> {
    await opts.hook?.(op, itemId);
    const now = clock();
    const { item, notices } = port.transact((state, ctx) => step(state, ctx, now));
    for (const n of notices ?? []) {
      try {
        opts.notify?.(n);
      } catch {
        // The change is saved; a notification that fails to send doesn't undo it.
      }
    }
    return item;
  }

  /** A change to the contract's projects rather than to one item: the same steps, returning the project. */
  async function runProject(op: string, step: (state: WorkState, ctx: WorkContext, now: ReturnType<Clock>) => { next?: WorkState; result: WorkProject }): Promise<WorkProject> {
    await opts.hook?.(op, null);
    const now = clock();
    return port.transact((state, ctx) => step(state, ctx, now));
  }

  function findProject(state: WorkState, id: string): WorkProject {
    const p = (state.projects ?? []).find((x) => x.id === id);
    if (!p) throw new WorkError("not_found", "That project doesn't exist any more.");
    return p;
  }

  const projectDenied = (access: WorkAccess) => (access.trial ? PROJECTS_LATER : !access.open ? (access.closedReason ?? "This contract isn't taking new work.") : `${names.team} runs the projects.`);
  const withProject = (state: WorkState, p: WorkProject): WorkState => ({ ...state, projects: (state.projects ?? []).map((x) => (x.id === p.id ? p : x)) });

  const viewerOnly = () => new WorkError("forbidden", "Admins can see this workspace but can't change it.");

  function find(state: WorkState, id: string, { archived = false } = {}): WorkItem {
    const t = state.items.find((x) => x.id === id);
    if (!t) throw new WorkError("not_found", "That item doesn't exist any more.");
    if (isArchived(t) && !archived) throw new WorkError("not_found", `${refOf(t)} has been deleted, so it can't be changed. Restore it first.`);
    return t;
  }

  /** The item with `change` applied and the save stamped on it, in the list. */
  function save(state: WorkState, t: WorkItem, now: ReturnType<Clock>, lines: string[], extra?: Partial<WorkState>): { next: WorkState; item: WorkItem } {
    const events = lines.map((text) => ({ ts: now.ms, at: now.moment, text }));
    const item: WorkItem = { ...t, version: t.version + 1, updatedAt: now.ms, updatedBy: actor.name, activity: [...events.reverse(), ...t.activity] };
    return { next: { ...state, ...extra, items: (extra?.items ?? state.items).map((x) => (x.id === t.id ? item : x)) }, item };
  }

  /** The Independent's work goes on the heatmap: `done:` marks a submission. */
  function logged(state: WorkState, now: ReturnType<Clock>, token: string): Record<string, string[]> {
    if (side !== "independent") return state.logs;
    const key = isoOf(now.today);
    const day = state.logs[key] ?? [];
    return day.includes(token) ? state.logs : { ...state.logs, [key]: [...day, token] };
  }

  /** Finished work — a finished project's, or the trial's chapter — is read-only (lockedReason). */
  function unlocked(t: WorkItem, access: WorkAccess) {
    if (actor.role === "viewer") throw viewerOnly();
    const lock = lockedReason(t, access);
    if (lock) throw new WorkError("forbidden", lock);
  }

  function invalid(e: Invalid | null) {
    if (e) throw new WorkError("validation", e.message, { field: e.field });
  }

  function need(ok: boolean, message: () => string) {
    if (actor.role === "viewer") throw viewerOnly();
    if (!ok) throw new WorkError("forbidden", message());
  }

  /** Why a field can't be changed, in the reader's terms. */
  function fieldDenied(t: WorkItem, field: PatchField, access: WorkAccess): string {
    if (!access.open) return access.closedReason ?? "This contract isn't taking new work.";
    if (field === "project" && access.trial) return PROJECTS_LATER;
    if (field === "title" || field === "description") {
      if (t.agreed) return "It was agreed in the signed offer, so its wording stays as agreed.";
      if (t.status === "review" || t.status === "done") return "It can't be reworded once it's been sent for review.";
      return "Only whoever added it can reword it.";
    }
    if (actor.role === "contributor" && field === "start") {
      if (t.assignee !== "independent") return `It isn't yours to work on, so ${names.team} sets when it starts.`;
      return "Its start is set once it's been sent for review.";
    }
    if (actor.role === "contributor") return `${names.team} plans the work — the due dates, effort, priority and who does it.`;
    if (field === "assignee" && t.agreed) return "It was agreed in the signed offer, so it stays assigned as agreed.";
    if (field === "assignee") return "It can only be reassigned while it's To do or In progress.";
    return "It's done, so its plan is final. Reopen it to change it.";
  }

  /** Why what an item waits on can't be changed. */
  function dependDenied(t: WorkItem, access: WorkAccess): string {
    if (!access.open) return access.closedReason ?? "This contract isn't taking new work.";
    if (actor.role === "contributor" && t.assignee !== "independent") return `It isn't yours to work on, so ${names.team} says what it waits on.`;
    return "It's done, so its plan is final. Reopen it to change it.";
  }

  const capFor = (caps: Caps, field: PatchField, access: WorkAccess) =>
    field === "title" || field === "description" ? caps.editText : field === "assignee" ? caps.assign : field === "start" ? caps.start : field === "project" ? caps.plan && !access.trial : caps.plan;

  /** Where work can go: an active project on this contract, or no project (null). */
  function checkTarget(projects: readonly WorkProject[] | undefined, id: string | null | undefined) {
    if (!id) return null;
    const p = (projects ?? []).find((x) => x.id === id);
    if (!p) throw new WorkError("not_found", "That project doesn't exist any more.", { field: "project" });
    if (p.status === "done") throw new WorkError("validation", `“${p.name}” is finished. Reopen it to add work to it.`, { field: "project" });
    return p;
  }

  /**
   * `changes` checked against the item as it is now, and the merged result — or nothing to do.
   * Throws when a field isn't this person's to change, another person changed it first, or the
   * result breaks a rule.
   */
  function applyPatch(t: WorkItem, changes: WorkPatch, base: PatchBase | undefined, access: WorkAccess, today: Day, projects?: readonly WorkProject[]): { merged: WorkItem; lines: string[]; notices: WorkNotice[] } {
    const caps = capsFor(t, actor, access);
    const fields = Object.keys(changes) as PatchField[];
    for (const f of fields) need(capFor(caps, f, access), () => fieldDenied(t, f, access));
    for (const f of fields) {
      if (!base || !(f in base)) continue;
      if (!same(t[f], base[f]) && !same(t[f], changes[f]))
        throw new WorkError("conflict", `${t.updatedBy ?? "Someone"} changed the ${FIELD_LABEL[f]} while you were editing, so yours wasn't saved.`, { field: f, conflict: { field: f, yours: changes[f], theirs: t[f], by: t.updatedBy } });
    }
    const merged: WorkItem = { ...t };
    const lines: string[] = [];
    const notices: WorkNotice[] = [];
    const by = ` by ${actor.name}`;
    for (const f of fields) {
      const raw = changes[f];
      const value = typeof raw === "string" ? raw.trim() : raw;
      if (same(t[f], value)) continue;
      // A name is never cleared, only replaced: an empty one fails validation below.
      if (f === "title") merged.title = String(value ?? "");
      // Unassigned is a value (null), not a missing field — a missing one reads as the Independent's.
      else if (f === "assignee") merged.assignee = (value as WorkItem["assignee"] | undefined) ?? null;
      else if (value === null || value === undefined || value === "") delete (merged as Record<string, unknown>)[f];
      else (merged as Record<string, unknown>)[f] = value;
      switch (f) {
        case "title":
          lines.push(`Renamed to “${merged.title}”${by}`);
          break;
        case "description":
          lines.push(`${merged.description ? "Description updated" : "Description cleared"}${by}`);
          break;
        case "type":
          lines.push(`Work type set to ${TYPE_META[merged.type].label}${by}`);
          break;
        case "priority":
          lines.push(`${merged.priority ? `Priority set to ${PRIORITY_META[merged.priority].label}` : "Priority cleared"}${by}`);
          break;
        case "assignee":
          lines.push(`${merged.assignee ? `Assigned to ${merged.assignee === "team" ? names.team : names.independent}` : "Unassigned"}${by}`);
          if (merged.assignee === "independent") notices.push({ kind: "task_added", task: { id: t.id, title: merged.title } });
          break;
        case "start":
          lines.push(`${merged.start ? `Start date set to ${dateText(merged.start)}` : "Start date cleared"}${by}`);
          break;
        case "due":
          lines.push(`${merged.due ? `Due date set to ${dateText(merged.due)}` : "Due date cleared"}${by}`);
          break;
        case "effort":
          lines.push(`${merged.effort !== undefined ? `Effort set to ${merged.effort}` : "Effort cleared"}${by}`);
          break;
        case "project": {
          const to = checkTarget(projects, merged.project);
          const from = (projects ?? []).find((x) => x.id === t.project);
          lines.push(`${to ? `Moved to “${to.name}”` : from ? `Moved out of “${from.name}”` : "Moved out of its project"}${by}`);
          break;
        }
      }
    }
    if (!lines.length) return { merged: t, lines, notices };
    if (fields.includes("title")) invalid(checkTitle(merged.title));
    if (fields.includes("description")) invalid(checkDescription(merged.description));
    if (fields.some((f) => f === "start" || f === "due" || f === "type")) invalid(checkDates(merged, t, { today, lastDay: dayOf(access.lastDay) }));
    if (fields.some((f) => f === "effort" || f === "type")) invalid(checkEffort(merged.effort, merged.type));
    return { merged, lines, notices };
  }

  /**
   * The dates follow the work. Starting it starts it today — unless it already has an earlier start
   * (planned, or from before a pause), or is overdue, where a start today would come after its due
   * date. Finishing it (approved, or the Team Builder's own marked Done) ends it today; the feed
   * keeps the due date it had. Milestones are a planned date, so they keep theirs.
   */
  function startedDates(t: WorkItem, today: Day): { item: WorkItem; line?: string } {
    const { start, due } = datesOf(t);
    if (t.type === "milestone" || (start !== null && start <= today) || (due !== null && due < today)) return { item: t };
    return { item: { ...t, start: isoOf(today) }, line: `Start date set to ${stampLabel(today)} as the work began` };
  }
  function finishedDates(t: WorkItem, today: Day): { item: WorkItem; line?: string } {
    const { start, due } = datesOf(t);
    if (t.type === "milestone" || (due === today && (start === null || start <= today))) return { item: t };
    return {
      item: { ...t, due: isoOf(today), ...(start !== null && start > today ? { start: isoOf(today) } : {}) },
      line: `Finished on ${stampLabel(today)}${t.due && due !== today ? ` (was due ${dateText(t.due)})` : ""}`,
    };
  }

  /** What a status change does to the item, its feed line, and who hears about it. */
  function applyTransition(t: WorkItem, to: WorkStatus, kind: TransitionKind, note: string | undefined, now: ReturnType<Clock>): { item: WorkItem; lines: string[]; notice?: WorkNotice; token?: string } {
    const r = statusChange(t, to, kind, note, now);
    const dated = kind === "start" ? startedDates(r.item, now.today) : kind === "approve" || kind === "complete" ? finishedDates(r.item, now.today) : { item: r.item };
    return { ...r, item: dated.item, lines: dated.line ? [r.line, dated.line] : [r.line] };
  }

  function statusChange(t: WorkItem, to: WorkStatus, kind: TransitionKind, note: string | undefined, now: ReturnType<Clock>): { item: WorkItem; line: string; notice?: WorkNotice; token?: string } {
    const task = { id: t.id, title: t.title };
    const text = note?.trim() || undefined;
    const label = STATUS_META[to].label;
    const by = actor.name;
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
  function checkedTransition(t: WorkItem, to: WorkStatus, from: WorkStatus | undefined, note: string | undefined, access: WorkAccess) {
    if (actor.role === "viewer") throw viewerOnly();
    if (from !== undefined && t.status !== from) throw new WorkError("conflict", `${t.updatedBy ?? "Someone"} moved it to ${STATUS_META[t.status].label} first, so your change wasn't saved.`, { field: "status", conflict: { field: "status", yours: to, theirs: t.status, by: t.updatedBy } });
    const tr = transitionFor(t, actor, access, to, names);
    if (!tr.ok) throw new WorkError("forbidden", tr.reason);
    if (tr.needsNote) invalid(checkNote(note, true));
    else invalid(checkNote(note, false));
    return tr.kind;
  }

  return {
    actor,

    /** TB-148 — a new project, at the end of the list. A retry with the same id and name is harmless. */
    createProject: (input: { id: string; name: string }) =>
      runProject("createProject", (state, { access }, now) => {
        need(canPlanProjects(actor, access), () => projectDenied(access));
        const list = state.projects ?? [];
        const existing = list.find((p) => p.id === input.id);
        if (existing) {
          if (existing.name === input.name.trim()) return { result: existing };
          throw new WorkError("conflict", "A project with that id already exists.");
        }
        invalid(checkProjectName(input.name, list));
        const p: WorkProject = { id: input.id, name: input.name.trim(), status: "active", order: Math.max(0, ...list.map((x) => x.order)) + 1, createdAt: now.ms, createdBy: actor.name };
        return { next: { ...state, projects: [...list, p] }, result: p };
      }),

    renameProject: (id: string, name: string) =>
      runProject("renameProject", (state, { access }) => {
        need(canPlanProjects(actor, access), () => projectDenied(access));
        const p = findProject(state, id);
        if (p.name === name.trim()) return { result: p };
        invalid(checkProjectName(name, state.projects ?? [], id));
        const next = { ...p, name: name.trim() };
        return { next: withProject(state, next), result: next };
      }),

    /**
     * Finished: out of the open work, its items kept. Only once everything in it is done — open
     * work is finished or moved first, so nothing still being worked on drops out of sight.
     */
    finishProject: (id: string) =>
      runProject("finishProject", (state, { access }, now) => {
        need(canPlanProjects(actor, access), () => projectDenied(access));
        const p = findProject(state, id);
        if (p.status === "done") return { result: p };
        const open = state.items.filter((t) => !isArchived(t) && t.project === id && !isCompleted(t.status));
        const n = open.length;
        if (n) throw new WorkError("validation", `${n === 1 ? "1 item" : `${n} items`} in “${p.name}” ${n === 1 ? "is" : "are"} still open. Finish ${n === 1 ? "it" : "them"} or move ${n === 1 ? "it" : "them"} to another project first.`, { field: "project" });
        const next: WorkProject = { ...p, status: "done", completedAt: now.ms, completedBy: actor.name };
        return { next: withProject(state, next), result: next };
      }),

    /** TB-148 — a finished project put away: out of the project list, kept under Archived. */
    archiveProject: (id: string) =>
      runProject("archiveProject", (state, { access }, now) => {
        need(canPlanProjects(actor, access), () => projectDenied(access));
        const p = findProject(state, id);
        if (p.archivedAt !== undefined) return { result: p };
        if (p.status !== "done") throw new WorkError("validation", `“${p.name}” is still active. Mark it finished before archiving it.`, { field: "project" });
        const next: WorkProject = { ...p, archivedAt: now.ms, archivedBy: actor.name };
        return { next: withProject(state, next), result: next };
      }),

    unarchiveProject: (id: string) =>
      runProject("unarchiveProject", (state, { access }) => {
        need(canPlanProjects(actor, access), () => projectDenied(access));
        const p = findProject(state, id);
        if (p.archivedAt === undefined) return { result: p };
        const { archivedAt: _at, archivedBy: _by, ...rest } = p;
        return { next: withProject(state, rest), result: rest };
      }),

    /**
     * TB-148 — the project goes for good; its work doesn't. A finished project (or one with nothing
     * in it) can be deleted, and whatever was in it stays, outside a project, with its history — approved
     * work is the contract's record (the score, payments, disputes), so deleting a project never
     * deletes it. An active project with work in it is finished (or emptied) first.
     */
    deleteProject: (id: string) =>
      runProject("deleteProject", (state, { access }, now) => {
        need(canPlanProjects(actor, access), () => projectDenied(access));
        const p = findProject(state, id);
        const inIt = state.items.filter((t) => t.project === id);
        if (p.status !== "done" && inIt.some((t) => !isArchived(t))) throw new WorkError("validation", `“${p.name}” still has work in it. Finish it, or move its work out, before deleting it.`, { field: "project" });
        const line = { ts: now.ms, at: now.moment, text: `Moved out of “${p.name}” — the project was deleted by ${actor.name}` };
        const items = state.items.map((t) => {
          if (t.project !== id) return t;
          const { project: _gone, ...rest } = t;
          return { ...rest, version: t.version + 1, updatedAt: now.ms, updatedBy: actor.name, activity: [line, ...t.activity] };
        });
        return { next: { ...state, items, projects: (state.projects ?? []).filter((x) => x.id !== id) }, result: p };
      }),

    reopenProject: (id: string) =>
      runProject("reopenProject", (state, { access }) => {
        need(canPlanProjects(actor, access), () => projectDenied(access));
        const p = findProject(state, id);
        if (p.status === "active") return { result: p };
        const next: WorkProject = { id: p.id, name: p.name, status: "active", order: p.order, createdAt: p.createdAt, ...(p.createdBy ? { createdBy: p.createdBy } : {}) };
        return { next: withProject(state, next), result: next };
      }),

    create: (input: CreateInput) =>
      run("create", input.id, (state, { access }, now) => {
        need(canCreate(actor, access), () => (!access.open ? (access.closedReason ?? "This contract isn't taking new work.") : `Only ${names.team} adds work to this contract.`));
        const existing = state.items.find((t) => t.id === input.id);
        if (existing) {
          if (existing.title === input.title.trim()) return { result: { item: existing } };
          throw new WorkError("conflict", "An item with that id already exists.");
        }
        invalid(checkTitle(input.title));
        invalid(checkDescription(input.description));
        const type = input.type ?? "task";
        invalid(checkDates({ start: input.start, due: input.due, type }, null, { today: now.today, lastDay: dayOf(access.lastDay) }));
        invalid(checkEffort(input.effort, type));
        const tags: string[] = [];
        for (const raw of input.tags ?? []) {
          const tag = normalizeTag(raw);
          invalid(checkTag(tag, tags));
          if (!tags.includes(tag)) tags.push(tag);
        }
        const assignee = input.assignee === undefined ? "independent" : input.assignee;
        if (input.project) need(!access.trial, () => PROJECTS_LATER);
        const project = checkTarget(state.projects, input.project);
        const item: WorkItem = {
          id: input.id,
          number: state.nextNumber,
          title: input.title.trim(),
          ...(input.description?.trim() ? { description: input.description.trim() } : {}),
          status: "todo",
          ...(input.priority ? { priority: input.priority } : {}),
          type,
          assignee,
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
          createdBy: actor.name,
          updatedAt: now.ms,
          updatedBy: actor.name,
          version: 1,
          subtasks: [],
          activity: [{ ts: now.ms, at: now.moment, text: `Added by ${actor.name}${project ? ` to “${project.name}”` : ""}` }],
          comments: [],
        };
        let items = state.items;
        if (input.after || input.before) {
          const place = placeBetween([...state.items.filter((t) => !isArchived(t)), item], item.id, input.after, input.before);
          if ("order" in place) item.order = place.order;
          else {
            item.order = place.renumber.get(item.id) ?? item.order;
            items = state.items.map((t) => (place.renumber.has(t.id) ? { ...t, order: place.renumber.get(t.id) as number } : t));
          }
        }
        items = [...items, item];
        return {
          next: { ...state, items, nextNumber: state.nextNumber + 1 },
          result: { item, notices: assignee === "independent" ? [{ kind: "task_added", task: { id: item.id, title: item.title } }] : [] },
        };
      }),

    patch: (id: string, changes: WorkPatch, base?: PatchBase) =>
      run("patch", id, (state, { access }, now) => {
        const t = find(state, id);
        unlocked(t, access);
        const { merged, lines, notices } = applyPatch(t, changes, base, access, now.today, state.projects);
        if (!lines.length) return { result: { item: t } };
        const { next, item } = save(state, merged, now, lines);
        return { next, result: { item, notices } };
      }),

    transition: (id: string, input: { to: WorkStatus; from?: WorkStatus; note?: string }) =>
      run("transition", id, (state, { access }, now) => {
        const t = find(state, id);
        unlocked(t, access);
        if (t.status === input.to) return { result: { item: t } };
        const kind = checkedTransition(t, input.to, input.from, input.note, access);
        const { item: changed, lines, notice, token } = applyTransition(t, input.to, kind, input.note, now);
        const { next, item } = save(state, changed, now, lines, { logs: token ? logged(state, now, token) : state.logs });
        return { next, result: { item, notices: notice ? [notice] : [] } };
      }),

    /** A board drop in one write: a new status or group value, and a place in manual order. */
    move: (id: string, input: MoveInput) =>
      run("move", id, (state, { access }, now) => {
        const t = find(state, id);
        unlocked(t, access);
        let current = t;
        const lines: string[] = [];
        const notices: WorkNotice[] = [];
        let logs = state.logs;
        if (input.status && input.status !== t.status) {
          const kind = checkedTransition(t, input.status, input.from, input.note, access);
          const r = applyTransition(t, input.status, kind, input.note, now);
          current = r.item;
          lines.push(...r.lines);
          if (r.notice) notices.push(r.notice);
          if (r.token) logs = logged(state, now, r.token);
        }
        if (input.set) {
          const p = applyPatch(current, input.set, input.base, access, now.today, state.projects);
          current = p.merged;
          lines.push(...p.lines);
          notices.push(...p.notices);
        }
        let items = state.items;
        if (input.after !== undefined || input.before !== undefined) {
          need(canReorder(actor, access), () => (!access.open ? (access.closedReason ?? "This contract isn't taking new work.") : `${names.team} sets the order of the work.`));
          const live = state.items.filter((x) => !isArchived(x));
          const place = placeBetween(live, id, input.after, input.before);
          if ("order" in place) {
            if (place.order !== current.order) current = { ...current, order: place.order };
          } else {
            items = state.items.map((x) => (place.renumber.has(x.id) ? { ...x, order: place.renumber.get(x.id) as number } : x));
            current = { ...current, order: place.renumber.get(id) ?? current.order };
          }
        }
        if (current === t && items === state.items) return { result: { item: t } };
        // A reorder alone isn't worth a line on the feed.
        const { next, item } = save({ ...state, items }, current, now, lines, { logs });
        return { next, result: { item, notices } };
      }),

    archive: (id: string) =>
      run("archive", id, (state, { access }, now) => {
        const t = find(state, id, { archived: true });
        unlocked(t, access);
        if (isArchived(t)) return { result: { item: t } };
        need(capsFor(t, actor, access).archive, () =>
          !access.open ? (access.closedReason ?? "This contract isn't taking new work.") : t.agreed ? "It was agreed in the signed offer, so it stays on the list." : t.addedBy !== side ? "Only whoever added it can delete it." : "It's been sent for review or approved, so it stays on the list.",
        );
        const { next, item } = save(state, { ...t, archivedAt: now.ms, archivedBy: actor.name }, now, [`Deleted by ${actor.name}`]);
        return { next, result: { item } };
      }),

    restore: (id: string) =>
      run("restore", id, (state, { access }, now) => {
        const t = find(state, id, { archived: true });
        unlocked(t, access);
        if (!isArchived(t)) return { result: { item: t } };
        need(capsFor(t, actor, access).restore, () => (!access.open ? (access.closedReason ?? "This contract isn't taking new work.") : "Only whoever deleted it can restore it."));
        const { next, item } = save(state, { ...t, archivedAt: undefined, archivedBy: undefined }, now, [`Restored by ${actor.name}`]);
        return { next, result: { item } };
      }),

    addDependency: (id: string, onId: string) =>
      run("addDependency", id, (state, { access }, now) => {
        const t = find(state, id);
        unlocked(t, access);
        need(capsFor(t, actor, access).depend, () => dependDenied(t, access));
        if (t.dependsOn.includes(onId)) return { result: { item: t } };
        invalid(checkDependency(id, onId, indexById(state.items)));
        const on = state.items.find((x) => x.id === onId) as WorkItem;
        const { next, item } = save(state, { ...t, dependsOn: [...t.dependsOn, onId] }, now, [`Now waits on ${refOf(on)} “${on.title}” — set by ${actor.name}`]);
        return { next, result: { item } };
      }),

    removeDependency: (id: string, onId: string) =>
      run("removeDependency", id, (state, { access }, now) => {
        const t = find(state, id);
        unlocked(t, access);
        need(capsFor(t, actor, access).depend, () => dependDenied(t, access));
        if (!t.dependsOn.includes(onId)) return { result: { item: t } };
        const on = state.items.find((x) => x.id === onId);
        const { next, item } = save(state, { ...t, dependsOn: t.dependsOn.filter((x) => x !== onId) }, now, [`No longer waits on ${on ? refOf(on) : "an item"} — removed by ${actor.name}`]);
        return { next, result: { item } };
      }),

    addTag: (id: string, raw: string) =>
      run("addTag", id, (state, { access }, now) => {
        const t = find(state, id);
        unlocked(t, access);
        need(capsFor(t, actor, access).plan, () => fieldDenied(t, "due", access));
        const tag = normalizeTag(raw);
        if (tag && t.tags.includes(tag)) return { result: { item: t } };
        invalid(checkTag(tag, t.tags));
        const { next, item } = save(state, { ...t, tags: [...t.tags, tag] }, now, [`Tagged “${tag}” by ${actor.name}`]);
        return { next, result: { item } };
      }),

    removeTag: (id: string, tag: string) =>
      run("removeTag", id, (state, { access }, now) => {
        const t = find(state, id);
        unlocked(t, access);
        need(capsFor(t, actor, access).plan, () => fieldDenied(t, "due", access));
        if (!t.tags.includes(tag)) return { result: { item: t } };
        const { next, item } = save(state, { ...t, tags: t.tags.filter((x) => x !== tag) }, now, [`Tag “${tag}” removed by ${actor.name}`]);
        return { next, result: { item } };
      }),

    /**
     * The colour of one of this item's tags — for the whole contract, so the tag reads the same on
     * every item. Whoever may tag the item may colour its tags. It changes no item, so nothing is
     * logged on one and no version moves; asking for the colour it already has writes nothing.
     */
    setTagColor: (id: string, tag: string, color: TagColor) =>
      run("setTagColor", id, (state, { access }) => {
        const t = find(state, id);
        unlocked(t, access);
        need(capsFor(t, actor, access).plan, () => fieldDenied(t, "due", access));
        if (!t.tags.includes(tag)) throw new WorkError("not_found", `${refOf(t)} isn't tagged “${tag}” any more.`);
        if (!isTagColor(color)) throw new WorkError("validation", `Pick one of the tag colours: ${Object.values(TAG_COLORS).map((c) => c.label.toLowerCase()).join(", ")}.`, { field: "tags" });
        if (state.tagColors?.[tag] === color) return { result: { item: t } };
        return { next: { ...state, tagColors: { ...state.tagColors, [tag]: color } }, result: { item: t } };
      }),

    addSubtask: (id: string, sub: { id: string; title: string }) =>
      run("addSubtask", id, (state, { access }, now) => {
        const t = find(state, id);
        unlocked(t, access);
        need(capsFor(t, actor, access).subtasks, () => (!access.open ? (access.closedReason ?? "This contract isn't taking new work.") : t.status === "done" ? "It's done, so its subtasks are final." : `Subtasks are added by whoever does the work.`));
        if (t.subtasks.some((s) => s.id === sub.id)) return { result: { item: t } };
        invalid(checkSubtaskTitle(sub.title));
        const title = sub.title.trim();
        const { next, item } = save(state, { ...t, subtasks: [...t.subtasks, { id: sub.id, title, done: false }] }, now, [`Subtask “${title}” added by ${actor.name}`], { logs: logged(state, now, t.id) });
        return { next, result: { item } };
      }),

    toggleSubtask: (id: string, subId: string, done: boolean) =>
      run("toggleSubtask", id, (state, { access }, now) => {
        const t = find(state, id);
        unlocked(t, access);
        need(capsFor(t, actor, access).tick, () => (!access.open ? (access.closedReason ?? "This contract isn't taking new work.") : t.status === "review" || t.status === "done" ? "Its subtasks are locked while it's in review or done." : `Whoever does the work ticks its subtasks off.`));
        const sub = t.subtasks.find((s) => s.id === subId);
        if (!sub) throw new WorkError("not_found", "That subtask was removed.");
        if (sub.done === done) return { result: { item: t } };
        const { next, item } = save(state, { ...t, subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done } : s)) }, now, [`Subtask “${sub.title}” ${done ? "done" : "reopened"} by ${actor.name}`], { logs: logged(state, now, t.id) });
        return { next, result: { item } };
      }),

    removeSubtask: (id: string, subId: string) =>
      run("removeSubtask", id, (state, { access }, now) => {
        const t = find(state, id);
        unlocked(t, access);
        need(capsFor(t, actor, access).subtasks, () => (!access.open ? (access.closedReason ?? "This contract isn't taking new work.") : "Its subtasks are final."));
        const sub = t.subtasks.find((s) => s.id === subId);
        if (!sub) return { result: { item: t } };
        const { next, item } = save(state, { ...t, subtasks: t.subtasks.filter((s) => s.id !== subId) }, now, [`Subtask “${sub.title}” removed by ${actor.name}`]);
        return { next, result: { item } };
      }),

    comment: (id: string, c: { id: string; text: string }) =>
      run("comment", id, (state, { access }, now) => {
        const t = find(state, id);
        unlocked(t, access);
        need(capsFor(t, actor, access).comment, () => access.closedReason ?? "This contract has ended, so comments are closed.");
        if (t.comments.some((x) => x.id === c.id)) return { result: { item: t } };
        invalid(checkComment(c.text));
        const from = side as Side;
        const text = c.text.trim();
        const { next, item } = save(state, { ...t, comments: [...t.comments, { id: c.id, ts: now.ms, at: now.moment, side: from, name: actor.name, text }] }, now, []);
        // Said to the other side, so they hear it if it's theirs to follow (hearsComments) — a retry
        // of the same comment (above) says nothing twice.
        const to: Side = from === "team" ? "independent" : "team";
        return { next, result: { item, notices: hearsComments(t, to) ? [{ kind: "task_comment", from, task: { id: t.id, title: t.title }, note: text }] : [] } };
      }),
  };
}
