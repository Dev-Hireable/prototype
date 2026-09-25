import { isIsoDay, MONTH_SHORT } from "./dates";
import { EFFORT_MAX, PRIORITIES, PROJECT_NAME_MAX, STATUSES, TAGS_PER_ITEM, WORK_TYPES, type Side, type Subtask, type WorkComment, type WorkEvent, type WorkItem, type WorkPriority, type WorkProject, type WorkStatus, type WorkType } from "./model";
import { ORDER_STEP } from "./order";
import { normalizeTag } from "./validate";

/**
 * Task lists saved before the workspace — and anything hand-edited or half-written — read as
 * complete work items. It runs on every read, never writes (the next real change saves the
 * upgraded list), and running it on its own output changes nothing.
 *
 * Older tasks were all the Independent's work, so they're assigned to them; they're Tasks; and
 * their manual order is the order the old list showed them in (soonest due, then priority, then
 * the order they were added). Anything unreadable is dropped rather than guessed at: a bad date
 * reads as no date, an unknown status as To do, a dependency on a missing item as none.
 */

type Raw = Record<string, unknown>;

const isObj = (x: unknown): x is Raw => !!x && typeof x === "object" && !Array.isArray(x);
const str = (x: unknown): string | undefined => (typeof x === "string" ? x : undefined);
const num = (x: unknown): number | undefined => (typeof x === "number" && Number.isFinite(x) ? x : undefined);
const side = (x: unknown): Side | undefined => (x === "team" || x === "independent" ? x : undefined);

/** "25 Sep 2026" as a timestamp (UTC midnight — it only orders and dates records). */
function labelTime(label: string | undefined): number | undefined {
  const m = /(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})/.exec(label ?? "");
  const month = m ? MONTH_SHORT.indexOf(m[2]) : -1;
  return m && month >= 0 ? Date.UTC(Number(m[3]), month, Number(m[1])) : undefined;
}

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function migrateItems(raw: unknown, prevNext?: number): { items: WorkItem[]; nextNumber: number } {
  const input = Array.isArray(raw) ? raw.filter((t): t is Raw => isObj(t) && typeof t.id === "string" && !!t.id && typeof t.title === "string") : [];
  // One record per id: a duplicated id (a double write) keeps its first copy.
  const seen = new Set<string>();
  const list = input.filter((t) => (seen.has(t.id as string) ? false : (seen.add(t.id as string), true)));
  const ids = new Set(list.map((t) => t.id as string));

  // Order for records saved before it existed: where the old list put them.
  const unranked = list
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => num(t.order) === undefined)
    .sort((a, b) => {
      const da = isIsoDay(a.t.due) ? (a.t.due as string) : "9999-99-99";
      const db = isIsoDay(b.t.due) ? (b.t.due as string) : "9999-99-99";
      if (da !== db) return da < db ? -1 : 1;
      const pa = PRIORITY_RANK[str(a.t.priority) ?? ""] ?? 3;
      const pb = PRIORITY_RANK[str(b.t.priority) ?? ""] ?? 3;
      return pa - pb || a.i - b.i;
    });
  const ranked = list.map((t) => num(t.order)).filter((n): n is number => n !== undefined);
  const base = ranked.length ? Math.max(...ranked) : 0;
  const orderOf = new Map(unranked.map(({ t }, k) => [t.id as string, base + (k + 1) * ORDER_STEP]));

  // Numbers: keep valid, unique ones; number the rest after them, in list order.
  const used = new Set<number>();
  const numbered = new Map<string, number>();
  for (const t of list) {
    const n = num(t.number);
    if (n !== undefined && Number.isInteger(n) && n > 0 && !used.has(n)) {
      used.add(n);
      numbered.set(t.id as string, n);
    }
  }
  let next = Math.max(used.size ? Math.max(...used) + 1 : 1, prevNext && Number.isInteger(prevNext) ? prevNext : 1);
  for (const t of list) if (!numbered.has(t.id as string)) numbered.set(t.id as string, next++);

  const items = list.map((t): WorkItem => {
    const id = t.id as string;
    const status: WorkStatus = STATUSES.includes(t.status as WorkStatus) ? (t.status as WorkStatus) : "todo";
    const created = str(t.created) ?? "";
    const createdAt = num(t.createdAt) ?? labelTime(created) ?? 0;
    const activity: WorkEvent[] = Array.isArray(t.activity) ? t.activity.filter((e): e is WorkEvent => isObj(e) && typeof e.text === "string").map((e) => ({ ts: num(e.ts) ?? 0, at: str(e.at) ?? "", text: e.text })) : [];
    const comments: WorkComment[] = Array.isArray(t.comments)
      ? t.comments
          .filter((c): c is Raw => isObj(c) && typeof c.text === "string")
          .map((c, k) => ({ id: str(c.id) ?? `c-${id}-${k + 1}`, ts: num(c.ts) ?? 0, at: str(c.at) ?? "", side: side(c.side) ?? "independent", name: str(c.name) ?? "", text: c.text as string }))
      : [];
    const subtasks: Subtask[] = Array.isArray(t.subtasks) ? t.subtasks.filter((s): s is Raw => isObj(s) && typeof s.id === "string" && typeof s.title === "string").map((s) => ({ id: s.id as string, title: s.title as string, done: s.done === true })) : [];
    const stamps = [createdAt, ...activity.map((e) => e.ts), ...comments.map((c) => c.ts)];
    const effort = num(t.effort);
    const type: WorkType = WORK_TYPES.includes(t.type as WorkType) ? (t.type as WorkType) : "task";
    const dependsOn = Array.isArray(t.dependsOn) ? [...new Set(t.dependsOn.filter((d): d is string => typeof d === "string" && d !== id && ids.has(d)))] : [];
    const tags = Array.isArray(t.tags) ? [...new Set(t.tags.filter((x): x is string => typeof x === "string").map(normalizeTag).filter(Boolean))].slice(0, TAGS_PER_ITEM) : [];
    const item: WorkItem = {
      id,
      number: numbered.get(id) as number,
      title: t.title as string,
      status,
      type,
      assignee: "assignee" in t ? (side(t.assignee) ?? null) : "independent",
      dependsOn,
      tags,
      order: num(t.order) ?? (orderOf.get(id) as number),
      addedBy: side(t.addedBy) ?? "team",
      created,
      createdAt,
      updatedAt: num(t.updatedAt) ?? Math.max(...stamps),
      version: num(t.version) !== undefined && (t.version as number) >= 1 ? Math.floor(t.version as number) : 1,
      subtasks,
      activity,
      comments,
    };
    const description = str(t.description);
    if (description) item.description = description;
    if (PRIORITIES.includes(t.priority as WorkPriority)) item.priority = t.priority as WorkPriority;
    if (isIsoDay(t.start) && type !== "milestone") item.start = t.start;
    if (isIsoDay(t.due)) item.due = t.due;
    // A start after the due date can't be drawn; keep the due date, which is the commitment.
    if (item.start && item.due && item.start > item.due) delete item.start;
    if (effort !== undefined && Number.isInteger(effort) && effort >= 0 && effort <= EFFORT_MAX && type !== "milestone") item.effort = effort;
    if (t.agreed === true) item.agreed = true;
    if (t.trial === true) item.trial = true;
    const project = str(t.project);
    if (project) item.project = project;
    for (const k of ["createdBy", "updatedBy", "archivedBy", "completedBy"] as const) {
      const v = str(t[k]);
      if (v) item[k] = v;
    }
    for (const k of ["archivedAt", "completedAt"] as const) {
      const v = num(t[k]);
      if (v !== undefined) item[k] = v;
    }
    if (isObj(t.changes) && typeof t.changes.note === "string") item.changes = { note: t.changes.note, at: str(t.changes.at) ?? "", by: str(t.changes.by) ?? "" };
    if (isObj(t.submitted)) item.submitted = { at: str(t.submitted.at) ?? "", ...(str(t.submitted.note) ? { note: str(t.submitted.note) } : {}) };
    if (isObj(t.approved)) item.approved = { at: str(t.approved.at) ?? "", by: str(t.approved.by) ?? "" };
    return item;
  });
  return { items, nextNumber: Math.max(next, ...items.map((t) => t.number + 1), 1) };
}

/**
 * A contract's projects as saved (TB-148), read the same forgiving way: a record without an id or a
 * name is dropped, a duplicate id keeps its first copy, an unknown status reads as active.
 */
export function migrateProjects(raw: unknown): WorkProject[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: WorkProject[] = [];
  raw.forEach((p, i) => {
    if (!isObj(p) || typeof p.id !== "string" || !p.id || typeof p.name !== "string" || !p.name.trim() || seen.has(p.id)) return;
    seen.add(p.id);
    const project: WorkProject = { id: p.id, name: p.name.trim().slice(0, PROJECT_NAME_MAX), status: p.status === "done" ? "done" : "active", order: num(p.order) ?? i + 1, createdAt: num(p.createdAt) ?? 0 };
    const by = str(p.createdBy);
    if (by) project.createdBy = by;
    if (project.status === "done") {
      const at = num(p.completedAt);
      if (at !== undefined) project.completedAt = at;
      const who = str(p.completedBy);
      if (who) project.completedBy = who;
      // Only a finished project is ever archived.
      const archived = num(p.archivedAt);
      if (archived !== undefined) project.archivedAt = archived;
      const archiver = str(p.archivedBy);
      if (archived !== undefined && archiver) project.archivedBy = archiver;
    }
    out.push(project);
  });
  return out;
}
