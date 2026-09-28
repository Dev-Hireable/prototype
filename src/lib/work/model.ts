import { dayOf, type Day } from "./dates";

/**
 * A contract's work items — the one dataset behind the workspace's Board, List, Calendar, Timeline
 * and Workload. Every view reads these same records; none keeps a copy.
 *
 * The contract has two people on it: the Team Builder who plans and reviews the work, and the
 * Independent who does most of it. An item is assigned to one of them, or to nobody yet. The
 * Independent's items go through review (To do → In progress → In review → Done); the Team
 * Builder's own items don't — they mark them done themselves — and they are never part of the
 * Trial Fit Score.
 */

export type Side = "team" | "independent";
export type Assignee = Side;
export type WorkStatus = "todo" | "doing" | "review" | "done";
export type WorkPriority = "high" | "medium" | "low";
export type WorkType = "task" | "milestone" | "design" | "development" | "marketing" | "content" | "research" | "review" | "meeting" | "admin" | "operations" | "other";

export type Subtask = { id: string; title: string; done: boolean };
/** Something that happened on an item. `ts` orders it against the comments in one feed. */
export type WorkEvent = { ts: number; at: string; text: string };
export type WorkComment = { id?: string; ts: number; at: string; side: Side; name: string; text: string };

export type WorkItem = {
  id: string;
  /** "#12" — a short, stable reference that survives renames. */
  number: number;
  title: string;
  description?: string;
  status: WorkStatus;
  priority?: WorkPriority;
  type: WorkType;
  /** Who does it; null while nobody is assigned. */
  assignee: Assignee | null;
  /** yyyy-mm-dd calendar days (see ./dates). Either, both or neither may be set. */
  start?: string;
  due?: string;
  /** A relative estimate of the work — not hours. */
  effort?: number;
  /** Items that have to be completed before this one: it is blocked while any is still open. */
  dependsOn: string[];
  tags: string[];
  /** Manual rank, shared by every view's Manual sort. */
  order: number;
  /** Who created it. */
  addedBy: Side;
  /** From the signed offer: what the offer set of it stays as agreed, and it can't be deleted, while its terms hold (./permissions agreedNow). */
  agreed?: boolean;
  /** Created while the contract was a trial — what the Trial Fit Score's Performance counts. */
  trial?: boolean;
  /** The project it belongs to (a WorkProject's id); none is work outside a project. See ./projects. */
  project?: string;
  /** "25 Sep 2026" — the day it was added, as the rest of the demo stamps records. */
  created: string;
  createdAt: number;
  createdBy?: string;
  updatedAt: number;
  updatedBy?: string;
  /** Bumped on every saved change. */
  version: number;
  archivedAt?: number;
  archivedBy?: string;
  completedAt?: number;
  completedBy?: string;
  subtasks: Subtask[];
  /** Sent back by the Team Builder; shown until it is resubmitted. */
  changes?: { note: string; at: string; by: string };
  /** The submission waiting on review, with the note for the reviewer. */
  submitted?: { at: string; note?: string };
  approved?: { at: string; by: string };
  /** Newest first. */
  activity: WorkEvent[];
  /** Oldest first, like a thread. */
  comments: WorkComment[];
};

export type WorkTone = "ok" | "warn" | "danger" | "info" | "neutral" | "trial";

/* ---------------------------------------------------------------- status */

export const STATUSES: WorkStatus[] = ["todo", "doing", "review", "done"];

/**
 * What each status means. Overdue, the trial's early close and every "done" count read
 * `isCompleted`, never the literal status, so a new completed status only needs a row here.
 */
export const STATUS_META: Record<WorkStatus, { label: string; isCompleted: boolean; tone: WorkTone }> = {
  todo: { label: "To do", isCompleted: false, tone: "neutral" },
  doing: { label: "In progress", isCompleted: false, tone: "info" },
  review: { label: "In review", isCompleted: false, tone: "warn" },
  done: { label: "Done", isCompleted: true, tone: "ok" },
};

export const isCompleted = (s: WorkStatus) => STATUS_META[s].isCompleted;

/* -------------------------------------------------------------- priority */

export const PRIORITIES: WorkPriority[] = ["high", "medium", "low"];

export const PRIORITY_META: Record<WorkPriority, { label: string; rank: number; tone: WorkTone }> = {
  high: { label: "High", rank: 3, tone: "danger" },
  medium: { label: "Medium", rank: 2, tone: "warn" },
  low: { label: "Low", rank: 1, tone: "info" },
};

/* ------------------------------------------------------------ work types */

export const WORK_TYPES: WorkType[] = ["task", "milestone", "design", "development", "marketing", "content", "research", "review", "meeting", "admin", "operations", "other"];

/**
 * The kinds of work an item can be. Generic on purpose — a contract can be any role. A milestone
 * is a point in time: it has a due date and no start or effort. (There's no "Project" kind: a
 * role's bigger bodies of work are projects of their own, ./projects — TB-148.) Add a kind here (and its look in
 * the workspace's meta table) and every view, filter and menu picks it up.
 */
export const TYPE_META: Record<WorkType, { label: string; hint: string }> = {
  task: { label: "Task", hint: "A piece of work" },
  milestone: { label: "Milestone", hint: "A checkpoint on a single date" },
  design: { label: "Design", hint: "Visual or product design" },
  development: { label: "Development", hint: "Building or engineering" },
  marketing: { label: "Marketing", hint: "Campaigns and promotion" },
  content: { label: "Content", hint: "Writing and media" },
  research: { label: "Research", hint: "Finding things out" },
  review: { label: "Review", hint: "Checking someone's work" },
  meeting: { label: "Meeting", hint: "A call or session" },
  admin: { label: "Admin", hint: "Paperwork and upkeep" },
  operations: { label: "Operations", hint: "Keeping things running" },
  other: { label: "Other", hint: "Anything else" },
};

/* ---------------------------------------------------------------- effort */

/** Effort is relative: a 2 is about twice a 1. It is not hours, and no capacity is assumed. */
export const EFFORT_PRESETS = [1, 2, 3, 5, 8, 13];
export const EFFORT_MAX = 999;
export const EFFORT_HELP = "Relative estimate of the amount of work required.";

/* ------------------------------------------------------------- assignees */

/** How an assignee is keyed in filters and the URL: the side, or "none" for unassigned. */
export type AssigneeKey = Side | "none";
export const ASSIGNEE_KEYS: AssigneeKey[] = ["independent", "team", "none"];
export const assigneeKey = (a: Assignee | null): AssigneeKey => a ?? "none";
export const assigneeOf = (k: AssigneeKey): Assignee | null => (k === "none" ? null : k);

/**
 * Whether a comment on the item notifies this side. The Team Builder runs the plan, so hears about
 * every one; the Independent only about their own work — on anything else they can read it, unasked.
 */
export const hearsComments = (t: Pick<WorkItem, "assignee">, side: Side) => side === "team" || t.assignee === side;

/* ---------------------------------------------------------------- limits */

export const TITLE_MAX = 200;
export const DESCRIPTION_MAX = 5000;
export const COMMENT_MAX = 2000;
export const TAG_MAX = 24;
export const TAGS_PER_ITEM = 8;
export const NOTE_MAX = 1000;
export const PROJECT_NAME_MAX = 60;

/* -------------------------------------------------------------- projects */

/**
 * A body of work on a full-time or part-time contract — "Brand refresh", "Q4 campaign" — with its
 * own progress. Finished, it leaves the open work, so a role's list doesn't pile up forever: what's
 * open is work outside a project and the active projects. The Team Builder runs them, like the rest of the plan.
 */
export type WorkProject = {
  id: string;
  name: string;
  status: "active" | "done";
  /** Its place in the project list. */
  order: number;
  createdAt: number;
  createdBy?: string;
  completedAt?: number;
  completedBy?: string;
  /** Put away once it's finished: out of the project list, into its Archived section. */
  archivedAt?: number;
  archivedBy?: string;
};

/* ------------------------------------------------------------ tag colours */

/**
 * The colours a tag can take: soft fills with dark text, the same tints as the app's badges. A tag
 * starts on one picked from its name, so different tags look different from the start; a colour
 * chosen for it is kept per contract and applies to that tag on every item.
 */
export const TAG_COLORS = {
  purple: { label: "Purple", bg: "#f3f0fb", text: "#4b3a8c" },
  blue: { label: "Blue", bg: "#e6f3fc", text: "#004675" },
  teal: { label: "Teal", bg: "#e3f6f4", text: "#0f5b54" },
  green: { label: "Green", bg: "#eef9f2", text: "#1b6b3a" },
  yellow: { label: "Yellow", bg: "#fff6d6", text: "#6b5200" },
  orange: { label: "Orange", bg: "#fff0e3", text: "#8a4200" },
  red: { label: "Red", bg: "#fcf2f2", text: "#8f1d1d" },
  pink: { label: "Pink", bg: "#fdeef8", text: "#7d1d63" },
  grey: { label: "Grey", bg: "#f2f2f2", text: "#424242" },
} as const;
export type TagColor = keyof typeof TAG_COLORS;
export const TAG_COLOR_KEYS = Object.keys(TAG_COLORS) as TagColor[];
/** The colours a name can land on by default: grey is left for choosing. */
const DEFAULT_TAG_COLORS = TAG_COLOR_KEYS.filter((c) => c !== "grey");

export const isTagColor = (v: unknown): v is TagColor => typeof v === "string" && v in TAG_COLORS;

/** A tag's colour: the one chosen for it on this contract, else one picked from its name (the same name, the same colour). */
export function tagColorOf(tag: string, chosen?: Readonly<Record<string, string>>): TagColor {
  const set = chosen?.[tag];
  if (isTagColor(set)) return set;
  let h = 0;
  for (const ch of tag) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return DEFAULT_TAG_COLORS[h % DEFAULT_TAG_COLORS.length];
}

/* --------------------------------------------------------------- helpers */

export const isArchived = (t: Pick<WorkItem, "archivedAt">) => t.archivedAt !== undefined;

/** A new id, unique enough for one browser's demo data. Callers make it, so a retry reuses it. */
export const newId = (prefix = "t") => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Its start and due as Days; an unreadable date reads as unset. */
export function datesOf(t: Pick<WorkItem, "start" | "due">): { start: Day | null; due: Day | null } {
  return { start: dayOf(t.start), due: dayOf(t.due) };
}

/** How an item sits in time: a span, a due date alone, a start alone, a milestone, or unscheduled. */
export type DateKind = "range" | "due" | "start" | "milestone" | "none";

export function dateKind(t: Pick<WorkItem, "start" | "due" | "type">): DateKind {
  const { start, due } = datesOf(t);
  if (t.type === "milestone" && due !== null) return "milestone";
  if (start !== null && due !== null) return "range";
  if (due !== null) return "due";
  if (start !== null) return "start";
  return "none";
}

/** Share of the subtasks done, 0–1, or null when there are none — nothing is made up. */
export function progressOf(t: Pick<WorkItem, "subtasks">): number | null {
  const subs = t.subtasks ?? [];
  return subs.length ? subs.filter((s) => s.done).length / subs.length : null;
}

/** Due before today and not completed. A due-today item isn't late yet. */
export function isOverdue(t: Pick<WorkItem, "due" | "status" | "archivedAt">, today: Day): boolean {
  if (isArchived(t) || isCompleted(t.status)) return false;
  const due = dayOf(t.due);
  return due !== null && due < today;
}

export type ById = ReadonlyMap<string, WorkItem>;

export const indexById = (items: readonly WorkItem[]): Map<string, WorkItem> => new Map(items.map((t) => [t.id, t]));

/** The items this one waits on that are still open (archived ones don't block). */
export function openBlockers(t: Pick<WorkItem, "dependsOn">, byId: ById): WorkItem[] {
  const out: WorkItem[] = [];
  for (const id of t.dependsOn ?? []) {
    const b = byId.get(id);
    if (b && !isArchived(b) && !isCompleted(b.status)) out.push(b);
  }
  return out;
}

export const isBlocked = (t: Pick<WorkItem, "dependsOn">, byId: ById) => openBlockers(t, byId).length > 0;

/**
 * What the trial is scored and closed on: the Independent's own items that aren't archived and were
 * set during the trial. The Team Builder's items and unassigned ones never count. Lists saved
 * before the trial flag existed count whole.
 */
export function scoredItems<T extends Pick<WorkItem, "archivedAt" | "assignee" | "trial">>(items: readonly T[]): T[] {
  const theirs = items.filter((t) => !isArchived(t) && t.assignee === "independent");
  return theirs.some((t) => t.trial) ? theirs.filter((t) => t.trial) : theirs;
}

/** The counts the summary line, stats and contract cards show — archived items left out. */
export function countsOf(items: readonly WorkItem[], today: Day) {
  const live = items.filter((t) => !isArchived(t));
  const by = (s: WorkStatus) => live.filter((t) => t.status === s).length;
  return { total: live.length, todo: by("todo"), doing: by("doing"), review: by("review"), done: live.filter((t) => isCompleted(t.status)).length, overdue: live.filter((t) => isOverdue(t, today)).length };
}

/** Total effort, and how many items have no estimate. */
export function effortOf(items: readonly WorkItem[]): { total: number; unestimated: number } {
  let total = 0;
  let unestimated = 0;
  for (const t of items) {
    if (t.type === "milestone") continue;
    if (typeof t.effort === "number") total += t.effort;
    else unestimated++;
  }
  return { total, unestimated };
}

export const refOf = (t: Pick<WorkItem, "number">) => `#${t.number}`;
