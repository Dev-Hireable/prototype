import { isIsoDay, MONTH_SHORT } from "./dates";
import { PRIORITIES, PROJECT_NAME_MAX, STATUSES, TAGS_PER_ITEM, WORK_TYPES, type Side, type Subtask, type WorkComment, type WorkEvent, type WorkItem, type WorkProject } from "./model";
import { ORDER_STEP } from "./order";
import { checkEffort, normalizeTag } from "./validate";

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
/** A saved record with an id — the one thing every record needs. */
type WithId = Raw & { id: string };
/** A saved task that can be read: an id and a title, whatever else it has. */
type Rec = WithId & { title: string };

const isObj = (x: unknown): x is Raw => !!x && typeof x === "object" && !Array.isArray(x);
const str = (x: unknown): string | undefined => (typeof x === "string" ? x : undefined);
const num = (x: unknown): number | undefined => (typeof x === "number" && Number.isFinite(x) ? x : undefined);
const side = (x: unknown): Side | undefined => (x === "team" || x === "independent" ? x : undefined);

/** A label every record has, if only an empty one: "" for anything that isn't a string. */
const orEmpty = (x: unknown): string => str(x) ?? "";

/** A saved list; anything else reads as an empty one. */
const listOf = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);

/** `x`, when it's one of `options`; otherwise nothing, and the caller's default applies. */
function oneOf<T>(options: readonly T[], x: unknown): T | undefined {
  return options.includes(x as T) ? (x as T) : undefined;
}

const hasId = (x: unknown): x is WithId => isObj(x) && typeof x.id === "string" && !!x.id;
const isRec = (x: unknown): x is Rec => hasId(x) && typeof x.title === "string";

/** A filter that keeps the first record with each id. */
function firstPerId() {
  const seen = new Set<string>();
  return (x: WithId) => (seen.has(x.id) ? false : (seen.add(x.id), true));
}

/** "25 Sep 2026" as a timestamp (UTC midnight — it only orders and dates records). */
function labelTime(label: string | undefined): number | undefined {
  const m = /(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})/.exec(label ?? "");
  const month = m ? MONTH_SHORT.indexOf(m[2]) : -1;
  return m && month >= 0 ? Date.UTC(Number(m[3]), month, Number(m[1])) : undefined;
}

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** What reading one record needs from the list it's in. */
type ListInfo = {
  /** Every record's id: a dependency on anything else reads as none. */
  ids: ReadonlySet<string>;
  /** Every record's number (numbersOf). */
  numbers: ReadonlyMap<string, number>;
  /** A manual order for each record saved before there was one (legacyOrders). */
  orders: ReadonlyMap<string, number>;
};

export function migrateItems(raw: unknown, prevNext?: number): { items: WorkItem[]; nextNumber: number } {
  // One record per id: a duplicated id (a double write) keeps its first copy.
  const list = listOf(raw).filter(isRec).filter(firstPerId());
  const { numbers, next } = numbersOf(list, prevNext);
  const info: ListInfo = { ids: new Set(list.map((t) => t.id)), numbers, orders: legacyOrders(list) };
  const items = list.map((t) => itemOf(t, info));
  return { items, nextNumber: Math.max(next, ...items.map((t) => t.number + 1), 1) };
}

/** Where the old list put an undated record: after every dated one. */
const dueKey = (t: Rec) => (isIsoDay(t.due) ? t.due : "9999-99-99");

/** High, medium, low, then no priority. */
const priorityRank = (t: Rec) => PRIORITY_RANK[str(t.priority) ?? ""] ?? 3;

/** The old list's order: soonest due first, then by priority, then the order they were added (`i`). */
function oldListOrder(a: { t: Rec; i: number }, b: { t: Rec; i: number }): number {
  const da = dueKey(a.t);
  const db = dueKey(b.t);
  if (da !== db) return da < db ? -1 : 1;
  return priorityRank(a.t) - priorityRank(b.t) || a.i - b.i;
}

/** Order for records saved before it existed: where the old list put them, after every saved order. */
function legacyOrders(list: readonly Rec[]): Map<string, number> {
  const unranked = list
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => num(t.order) === undefined)
    .sort(oldListOrder);
  const ranked = list.map((t) => num(t.order)).filter((n): n is number => n !== undefined);
  const base = ranked.length ? Math.max(...ranked) : 0;
  return new Map(unranked.map(({ t }, k) => [t.id, base + (k + 1) * ORDER_STEP]));
}

/** Numbers: keep valid, unique ones; number the rest after them, in list order. */
function numbersOf(list: readonly Rec[], prevNext?: number): { numbers: Map<string, number>; next: number } {
  const used = new Set<number>();
  const numbers = new Map<string, number>();
  for (const t of list) {
    const n = num(t.number);
    if (n !== undefined && Number.isInteger(n) && n > 0 && !used.has(n)) {
      used.add(n);
      numbers.set(t.id, n);
    }
  }
  let next = Math.max(used.size ? Math.max(...used) + 1 : 1, prevNext && Number.isInteger(prevNext) ? prevNext : 1);
  for (const t of list) if (!numbers.has(t.id)) numbers.set(t.id, next++);
  return { numbers, next };
}

/** One record as a complete work item: the fields every item has, then the optional ones it carries. */
function itemOf(t: Rec, info: ListInfo): WorkItem {
  const { id } = t;
  const created = orEmpty(t.created);
  const createdAt = num(t.createdAt) ?? labelTime(created) ?? 0;
  const activity = activityOf(t.activity);
  const comments = commentsOf(t.comments, id);
  const item: WorkItem = {
    id,
    number: info.numbers.get(id) as number,
    title: t.title,
    status: oneOf(STATUSES, t.status) ?? "todo",
    type: oneOf(WORK_TYPES, t.type) ?? "task",
    assignee: "assignee" in t ? (side(t.assignee) ?? null) : "independent",
    dependsOn: [...new Set(listOf(t.dependsOn).filter((d): d is string => typeof d === "string" && d !== id && info.ids.has(d)))],
    tags: tagsOf(t.tags),
    order: num(t.order) ?? (info.orders.get(id) as number),
    addedBy: side(t.addedBy) ?? "team",
    created,
    createdAt,
    updatedAt: num(t.updatedAt) ?? Math.max(createdAt, ...activity.map((e) => e.ts), ...comments.map((c) => c.ts)),
    version: versionOf(t.version),
    subtasks: subtasksOf(t.subtasks),
    activity,
    comments,
  };
  addPlan(item, t);
  addStamps(item, t);
  addReview(item, t);
  return item;
}

/** A saved record with something to say: an event on the feed, or a comment. */
const hasText = (x: unknown): x is Raw & { text: string } => isObj(x) && typeof x.text === "string";

/** The feed: events with text; a time that can't be read reads as 0 and "". */
const activityOf = (x: unknown): WorkEvent[] => listOf(x).filter(hasText).map((e) => ({ ts: num(e.ts) ?? 0, at: orEmpty(e.at), text: e.text }));

/** The thread: comments with text. One saved without an id is given one from its item and place. */
const commentsOf = (x: unknown, itemId: string): WorkComment[] =>
  listOf(x)
    .filter(hasText)
    .map((c, k) => ({ id: str(c.id) ?? `c-${itemId}-${k + 1}`, ts: num(c.ts) ?? 0, at: orEmpty(c.at), side: side(c.side) ?? "independent", name: orEmpty(c.name), text: c.text }));

/** Subtasks with an id and a title; ticked off only when saved as done. */
const subtasksOf = (x: unknown): Subtask[] =>
  listOf(x)
    .filter((s): s is Raw & { id: string; title: string } => isObj(s) && typeof s.id === "string" && typeof s.title === "string")
    .map((s) => ({ id: s.id, title: s.title, done: s.done === true }));

/** Tags as the workspace writes them (normalizeTag), each once, up to the limit. */
const tagsOf = (x: unknown): string[] => [...new Set(listOf(x).filter((v): v is string => typeof v === "string").map(normalizeTag).filter(Boolean))].slice(0, TAGS_PER_ITEM);

/** The saved version: a whole number, 1 at the least. */
function versionOf(x: unknown): number {
  const v = num(x);
  return v !== undefined && v >= 1 ? Math.floor(v) : 1;
}

/** The plan it carries: description, priority, dates and effort. A milestone is one date, with no effort. */
function addPlan(item: WorkItem, t: Rec) {
  const description = str(t.description);
  if (description) item.description = description;
  const priority = oneOf(PRIORITIES, t.priority);
  if (priority) item.priority = priority;
  if (isIsoDay(t.start) && item.type !== "milestone") item.start = t.start;
  if (isIsoDay(t.due)) item.due = t.due;
  // A start after the due date can't be drawn; keep the due date, which is the commitment.
  if (item.start && item.due && item.start > item.due) delete item.start;
  // An effort only as the workspace would take one (checkEffort): whole, in range, not on a milestone.
  const effort = num(t.effort);
  if (effort !== undefined && !checkEffort(effort, item.type)) item.effort = effort;
}

/** Kept when saved as true. */
const FLAGS = ["agreed", "trial"] as const;
/** Kept when saved as a string that says something: the project it's in, and who did what. */
const REFS = ["project", "createdBy", "updatedBy", "archivedBy", "completedBy"] as const;
/** Kept when saved as a number. */
const TIMES = ["archivedAt", "completedAt"] as const;

/** Its flags, its project and its stamps, in the order they're saved. */
function addStamps(item: WorkItem, t: Rec) {
  for (const k of FLAGS) if (t[k] === true) item[k] = true;
  for (const k of REFS) {
    const v = str(t[k]);
    if (v) item[k] = v;
  }
  for (const k of TIMES) {
    const v = num(t[k]);
    if (v !== undefined) item[k] = v;
  }
}

/** The review trail: the changes asked for, the submission waiting on review, the approval. */
function addReview(item: WorkItem, t: Rec) {
  const { changes, submitted, approved } = t;
  if (isObj(changes) && typeof changes.note === "string") item.changes = { note: changes.note, at: orEmpty(changes.at), by: orEmpty(changes.by) };
  if (isObj(submitted)) item.submitted = { at: orEmpty(submitted.at), ...(str(submitted.note) ? { note: str(submitted.note) } : {}) };
  if (isObj(approved)) item.approved = { at: orEmpty(approved.at), by: orEmpty(approved.by) };
}

/** A saved project that can be read: an id, and a name that says something. */
const isProjectRec = (x: unknown): x is WithId & { name: string } => hasId(x) && typeof x.name === "string" && !!x.name.trim();

/**
 * A contract's projects as saved (TB-148), read the same forgiving way: a record without an id or a
 * name is dropped, a duplicate id keeps its first copy, an unknown status reads as active.
 */
export function migrateProjects(raw: unknown): WorkProject[] {
  const first = firstPerId();
  const out: WorkProject[] = [];
  listOf(raw).forEach((p, i) => {
    if (isProjectRec(p) && first(p)) out.push(projectOf(p, i));
  });
  return out;
}

/** One saved project. One saved without an order is ordered by its place in the saved list (`i`). */
function projectOf(p: WithId & { name: string }, i: number): WorkProject {
  const project: WorkProject = { id: p.id, name: p.name.trim().slice(0, PROJECT_NAME_MAX), status: p.status === "done" ? "done" : "active", order: num(p.order) ?? i + 1, createdAt: num(p.createdAt) ?? 0 };
  const by = str(p.createdBy);
  if (by) project.createdBy = by;
  if (project.status === "done") addFinished(project, p);
  return project;
}

/** When a finished project was finished and by whom — and, only then, when it was archived and by whom. */
function addFinished(project: WorkProject, p: Raw) {
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
