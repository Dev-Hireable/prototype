import { addDays, dayOf, monthEnd, monthStart, weekStartOf, parseMonth, partsOf, type Day } from "./dates";
import {
  ASSIGNEE_KEYS,
  assigneeKey,
  isArchived,
  isBlocked,
  isOverdue,
  PRIORITIES,
  PRIORITY_META,
  STATUS_META,
  STATUSES,
  TYPE_META,
  WORK_TYPES,
  type AssigneeKey,
  type ById,
  type WorkItem,
  type WorkPriority,
  type WorkStatus,
  type WorkType,
} from "./model";
import { byOrder } from "./order";

/**
 * What the workspace is showing: the view, and the search, filters, sort and grouping every view
 * shares. It lives in the URL (see useWorkspaceQuery), so a bookmark or a shared link opens the
 * same thing, and switching views keeps the filters. Anything the URL holds that isn't valid reads
 * as the default rather than breaking the page.
 */

export const VIEWS = ["board", "list", "calendar", "timeline", "workload"] as const;
export type ViewKey = (typeof VIEWS)[number];

export const SORTS = ["manual", "due", "start", "priority", "effort", "name", "created", "updated"] as const;
export type SortKey = (typeof SORTS)[number];
export type SortDir = "asc" | "desc";

export const GROUPS = ["status", "assignee", "type", "priority", "project", "none"] as const;
export type GroupKey = (typeof GROUPS)[number];

/** Due-date lenses. `none` is no due date. */
export const DUE_FILTERS = ["overdue", "today", "week", "month", "none"] as const;
export type DueFilter = (typeof DUE_FILTERS)[number];

export const PRIORITY_FILTERS = [...PRIORITIES, "none"] as const;
export type PriorityFilter = WorkPriority | "none";

export const SCALES = ["day", "week", "month"] as const;
export type Scale = (typeof SCALES)[number];

const METRICS = ["effort", "count"] as const;
export type Metric = (typeof METRICS)[number];

export type Filters = {
  status: WorkStatus[];
  assignee: AssigneeKey[];
  type: WorkType[];
  priority: PriorityFilter[];
  due: DueFilter[];
  tag: string[];
  blocked: boolean;
  /** Show the archive instead of the live list. */
  archived: boolean;
};

export type WorkQuery = Filters & {
  view: ViewKey;
  q: string;
  sort: SortKey;
  dir: SortDir;
  group: GroupKey;
  /** Calendar month, "2026-09". */
  month: string | null;
  scale: Scale;
  /** TB-148 — which work: the open work ("open"), all of it ("all"), or one project's key (./projects). */
  project: string;
  /** Workload: the Sunday its window starts on (yyyy-mm-dd), the weeks shown, the measure, and whether Done counts. */
  week: string | null;
  span: 2 | 4;
  metric: Metric;
  done: boolean;
};

export const DEFAULT_SORT_DIR: Record<SortKey, SortDir> = { manual: "asc", due: "asc", start: "asc", priority: "desc", effort: "desc", name: "asc", created: "desc", updated: "desc" };

export const SORT_LABEL: Record<SortKey, string> = { manual: "Manual", due: "Due date", start: "Start date", priority: "Priority", effort: "Effort", name: "Name", created: "Created", updated: "Last updated" };
export const GROUP_LABEL: Record<GroupKey, string> = { status: "Status", assignee: "Assignee", type: "Work type", priority: "Priority", project: "Project", none: "No grouping" };
export const DUE_LABEL: Record<DueFilter, string> = { overdue: "Overdue", today: "Due today", week: "Due this week", month: "Due this month", none: "No due date" };
export const VIEW_LABEL: Record<ViewKey, string> = { board: "Board", list: "List", calendar: "Calendar", timeline: "Timeline", workload: "Workload" };

export const EMPTY_FILTERS: Filters = { status: [], assignee: [], type: [], priority: [], due: [], tag: [], blocked: false, archived: false };

export const DEFAULT_QUERY: WorkQuery = { ...EMPTY_FILTERS, view: "board", q: "", project: "open", sort: "manual", dir: "asc", group: "status", month: null, scale: "week", week: null, span: 2, metric: "effort", done: false };

/* ------------------------------------------------------------------- URL */

type Params = { get(key: string): string | null };

const pick = <T extends string>(raw: string | null, allowed: readonly T[], fallback: T): T => (allowed.includes(raw as T) ? (raw as T) : fallback);

/** "todo,doing,nope" → ["todo", "doing"]: unknown values are dropped, duplicates removed. */
function list<T extends string>(raw: string | null, allowed?: readonly T[]): T[] {
  if (!raw) return [];
  const known = allowed && new Set<string>(allowed);
  const out = new Set<T>();
  for (const part of raw.split(",")) {
    const v = safeDecode(part).trim() as T;
    if (v && (!known || known.has(v))) out.add(v);
  }
  return [...out];
}

/** A hand-edited URL can hold a malformed escape ("%E0%A4"); read it as typed rather than throw. */
function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function parseQuery(p: Params): WorkQuery {
  const sort = pick(p.get("sort"), SORTS, DEFAULT_QUERY.sort);
  const week = p.get("week");
  const month = p.get("month");
  return {
    view: pick(p.get("view"), VIEWS, DEFAULT_QUERY.view),
    q: (p.get("q") ?? "").slice(0, 200),
    // Checked against the contract's projects where they're known (knownScope); here, only its shape.
    project: /^[\w-]{1,64}$/.test(p.get("project") ?? "") ? (p.get("project") as string) : DEFAULT_QUERY.project,
    status: list(p.get("status"), STATUSES),
    assignee: list(p.get("assignee"), ASSIGNEE_KEYS),
    type: list(p.get("type"), WORK_TYPES),
    priority: list(p.get("priority"), PRIORITY_FILTERS),
    due: list(p.get("due"), DUE_FILTERS),
    tag: list<string>(p.get("tag")).slice(0, 8),
    blocked: p.get("blocked") === "1",
    archived: p.get("archived") === "1",
    sort,
    dir: pick(p.get("dir"), ["asc", "desc"] as const, DEFAULT_SORT_DIR[sort]),
    group: pick(p.get("group"), GROUPS, DEFAULT_QUERY.group),
    month: parseMonth(month) ? month : null,
    scale: pick(p.get("scale"), SCALES, DEFAULT_QUERY.scale),
    week: week && dayOf(week) !== null ? week : null,
    span: p.get("span") === "4" ? 4 : 2,
    metric: pick(p.get("metric"), METRICS, DEFAULT_QUERY.metric),
    done: p.get("done") === "1",
  };
}

/**
 * The URL keys a query writes, with null for each key at its default — so a patch can be applied
 * to the current URL without leaving stale keys behind, and defaults never clutter a link.
 */
export function serializeQuery(q: WorkQuery): Record<string, string | null> {
  const csv = (xs: readonly string[]) => (xs.length ? xs.map(encodeURIComponent).join(",") : null);
  return {
    view: q.view === DEFAULT_QUERY.view ? null : q.view,
    q: q.q.trim() ? q.q : null,
    project: q.project === DEFAULT_QUERY.project ? null : q.project,
    status: csv(q.status),
    assignee: csv(q.assignee),
    type: csv(q.type),
    priority: csv(q.priority),
    due: csv(q.due),
    tag: csv(q.tag),
    blocked: q.blocked ? "1" : null,
    archived: q.archived ? "1" : null,
    sort: q.sort === DEFAULT_QUERY.sort ? null : q.sort,
    dir: q.dir === DEFAULT_SORT_DIR[q.sort] ? null : q.dir,
    group: q.group === DEFAULT_QUERY.group ? null : q.group,
    month: q.month,
    scale: q.scale === DEFAULT_QUERY.scale ? null : q.scale,
    week: q.week,
    span: q.span === DEFAULT_QUERY.span ? null : String(q.span),
    metric: q.metric === DEFAULT_QUERY.metric ? null : q.metric,
    done: q.done ? "1" : null,
  };
}

/** How many filters are narrowing the list (search included) — "Clear all" shows when it's above 0. */
export function activeFilterCount(q: Filters & { q?: string }): number {
  return (q.q?.trim() ? 1 : 0) + q.status.length + q.assignee.length + q.type.length + q.priority.length + q.due.length + q.tag.length + (q.blocked ? 1 : 0) + (q.archived ? 1 : 0);
}

/* ---------------------------------------------------------------- search */

/** Lower case, accents off: "Café" and "cafe" match. */
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const haystacks = new WeakMap<WorkItem, string>();
function haystackOf(t: WorkItem): string {
  let h = haystacks.get(t);
  if (h === undefined) {
    h = fold(`${t.title}\n${t.description ?? ""}\n${t.tags.join(" ")}`);
    haystacks.set(t, h);
  }
  return h;
}

/** Every word has to appear somewhere in the name, description or tags; "#12" finds item 12. */
export function matchesSearch(t: WorkItem, q: string): boolean {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = haystackOf(t);
  return words.every((w) => {
    const ref = /^#(\d+)$/.exec(w);
    if (ref) return t.number === Number(ref[1]);
    // react-doctor-disable-next-line react-doctor/js-set-map-lookups -- `hay` is a string: a substring search, not a list lookup
    return hay.includes(w);
  });
}

/* --------------------------------------------------------------- filters */

function dueMatches(t: WorkItem, lenses: DueFilter[], today: Day): boolean {
  const due = dayOf(t.due);
  return lenses.some((lens) => {
    switch (lens) {
      case "none":
        return due === null;
      case "overdue":
        return isOverdue(t, today);
      case "today":
        return due === today;
      case "week": {
        const from = weekStartOf(today);
        return due !== null && due >= from && due <= addDays(from, 6);
      }
      case "month": {
        const { y, m } = partsOf(today);
        return due !== null && due >= monthStart(y, m) && due <= monthEnd(y, m);
      }
    }
  });
}

/** AND across fields, OR within one: status In progress or In review, and assigned to Juan. */
export function applyFilters(items: readonly WorkItem[], q: Filters & { q: string }, ctx: { today: Day; byId: ById }): WorkItem[] {
  const status = new Set(q.status);
  const assignee = new Set(q.assignee);
  const type = new Set(q.type);
  const priority = new Set(q.priority);
  const tags = new Set(q.tag);
  return items.filter((t) => {
    if (isArchived(t) !== q.archived) return false;
    if (status.size && !status.has(t.status)) return false;
    if (assignee.size && !assignee.has(assigneeKey(t.assignee))) return false;
    if (type.size && !type.has(t.type)) return false;
    if (priority.size && !priority.has(t.priority ?? "none")) return false;
    if (tags.size && !t.tags.some((tag) => tags.has(tag))) return false;
    if (q.due.length && !dueMatches(t, q.due, ctx.today)) return false;
    if (q.blocked && !isBlocked(t, ctx.byId)) return false;
    return matchesSearch(t, q.q);
  });
}

/* ------------------------------------------------------------------ sort */

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

/** A key's value; undefined sorts last in either direction. */
function sortValue(t: WorkItem, key: SortKey): number | string | undefined {
  switch (key) {
    case "manual":
      return t.order;
    case "due":
      return dayOf(t.due) ?? undefined;
    case "start":
      return dayOf(t.start) ?? undefined;
    case "priority":
      return t.priority ? PRIORITY_META[t.priority].rank : undefined;
    case "effort":
      return t.effort;
    case "name":
      return t.title;
    case "created":
      return t.createdAt;
    case "updated":
      return t.updatedAt;
  }
}

/** A stable sort: ties fall back to manual order, then the item number. Missing values go last. */
export function sortItems(items: readonly WorkItem[], key: SortKey, dir: SortDir): WorkItem[] {
  if (key === "manual") return [...items].sort(byOrder);
  const sign = dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    if (va === undefined || vb === undefined) {
      if (va !== vb) return va === undefined ? 1 : -1;
    } else {
      const c = typeof va === "string" ? collator.compare(va, vb as string) : va - (vb as number);
      if (c) return c * sign;
    }
    return byOrder(a, b);
  });
}

/* ----------------------------------------------------------------- group */

export type GroupValue =
  | { field: "status"; value: WorkStatus }
  | { field: "assignee"; value: AssigneeKey }
  | { field: "type"; value: WorkType }
  | { field: "priority"; value: PriorityFilter }
  /** A place's key (./projects): a project's id, no project or the trial. */
  | { field: "project"; value: string }
  | { field: "none"; value: null };

export type Group = { key: string; label: string; value: GroupValue; items: WorkItem[] };

/**
 * Items into groups, each already sorted. Status, assignee and priority always show every group,
 * empty or not — they're where things can be dropped. Work types show only the ones in use.
 */
export function groupItems(items: readonly WorkItem[], group: GroupKey, labels: { assignee: (k: AssigneeKey) => string; project?: { places: readonly { key: string; name: string }[]; keyOf: (t: WorkItem) => string } }): Group[] {
  switch (group) {
    case "project": {
      // Projects are a role's: on a trial there are none, so it groups by status instead.
      const project = labels.project;
      if (!project) return groupItems(items, "status", labels);
      // Every place that has work here, in the picker's order.
      return project.places
        .map((p) => ({ key: p.key, label: p.name, value: { field: "project" as const, value: p.key }, items: items.filter((t) => project.keyOf(t) === p.key) }))
        .filter((g) => g.items.length > 0);
    }
    case "status":
      return STATUSES.map((s) => ({ key: s, label: STATUS_META[s].label, value: { field: "status", value: s }, items: items.filter((t) => t.status === s) }));
    case "assignee":
      return ASSIGNEE_KEYS.map((k) => ({ key: k, label: labels.assignee(k), value: { field: "assignee", value: k }, items: items.filter((t) => assigneeKey(t.assignee) === k) }));
    case "priority":
      return PRIORITY_FILTERS.map((p) => ({ key: p, label: p === "none" ? "No priority" : PRIORITY_META[p].label, value: { field: "priority", value: p }, items: items.filter((t) => (t.priority ?? "none") === p) }));
    case "type":
      return WORK_TYPES.filter((k) => items.some((t) => t.type === k)).map((k) => ({ key: k, label: TYPE_META[k].label, value: { field: "type", value: k }, items: items.filter((t) => t.type === k) }));
    case "none":
      return [{ key: "all", label: "All work", value: { field: "none", value: null }, items: [...items] }];
  }
}

