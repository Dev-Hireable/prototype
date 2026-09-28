import { addWorkingDays, isoDay, MONTHS, parseDay } from "@/lib/demo/dates";
import { todayDay } from "@/lib/work/dates";
import { countsOf, isArchived, isCompleted, PRIORITIES as WORK_PRIORITIES, PRIORITY_META, scoredItems, STATUS_META, STATUSES } from "@/lib/work/model";
import type { Side, WorkComment, WorkItem, WorkPriority, WorkStatus } from "@/lib/work/model";
import { ORDER_STEP } from "@/lib/work/order";

/**
 * The contract's work list as the rest of the demo reads it — the stats, contract cards, the trial's
 * close and its score. The items themselves are the workspace's work items (@/lib/work/model), and
 * every change to them goes through its repository (@/lib/work/repository); this module keeps the
 * planning types (a job post's and an offer's tasks) and the summaries other screens show.
 *
 * One flow for the Independent's work: To do → In progress → In review → Done. The Team Builder
 * plans it — writes the tasks (a trial's in its job post, settled with the proposal), adds more as
 * a full-time or part-time role goes on (a trial keeps the list its offer agreed), sets dates,
 * effort and priority — and approves each or asks for changes.
 */

export type TaskSide = Side;
export type TaskStatus = WorkStatus;
export type TaskPriority = WorkPriority;
export type Task = WorkItem;
export type TaskComment = WorkComment;

export const TASK_STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s, STATUS_META[s].label])) as Record<TaskStatus, string>;

export const PRIORITY_LABEL = Object.fromEntries(WORK_PRIORITIES.map((p) => [p, PRIORITY_META[p].label])) as Record<TaskPriority, string>;

/**
 * A task as the Team Builder plans it before the contract starts: a trial's tasks in its job post,
 * which the offer carries as the proposal settled them. Due dates are due weeks — the start is the
 * one the proposal agreed — so "Week 2" becomes a date once the contract starts. Every field here is
 * one the signed offer agrees, set or left blank (@/lib/work/permissions AGREED_FIELDS), and a unit
 * test holds the two together: a field added here is locked on the task it becomes.
 */
export type PlannedTask = { title: string; description?: string; priority?: TaskPriority; week?: number };

/** A planned task on an offer, with the id it keeps on the contract. */
export type OfferTask = PlannedTask & { id: string };

/* ------------------------------------------------------------------ dates */

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/**
 * "Week 2" as a date: the last working day of that week, counting the start date as day one. A
 * trial's due dates stop at its last day, so nothing is due after the trial has closed.
 */
export function dueFromWeek(start: string, week: number | undefined, lastDay?: string): string | undefined {
  const from = parseDay(start);
  if (!from || !week) return undefined;
  let due = addWorkingDays(from, Math.max(1, week) * 5 - 1);
  const cap = parseDay(lastDay);
  if (cap && due > cap) due = cap;
  return isoDay(due);
}

/** Weeks a task plan can span: the trial's own length, or a quarter on an ongoing role. */
export const planWeeks = (trialDays: number | null) => (trialDays ? Math.max(1, Math.ceil(trialDays / 5)) : 12);

export const weekLabel = (week: number | undefined) => (week ? `Week ${week}` : "No due week");

/** "Today", "Tomorrow", "Yesterday" or "25 Sep" — "25 Sep 2027" once it isn't this year. */
export function dueLabel(due: string, now = new Date()) {
  const d = parseDay(due);
  if (!d) return due;
  const days = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() === now.getFullYear() ? "" : ` ${d.getFullYear()}`}`;
}

/* ------------------------------------------------------------ the list */

/** How many tasks sit where, for the stats bar, the contract cards and the progress bar. Archived ones don't count. */
export const taskCounts = (tasks: Task[], now = new Date()) => countsOf(tasks, todayDay(now));

/** Share of the live list that is completed, as a whole percentage. */
export function donePercent(tasks: Task[]) {
  const live = tasks.filter((t) => !isArchived(t));
  return live.length ? Math.round((live.filter((t) => isCompleted(t.status)).length / live.length) * 100) : 0;
}

/** The tasks a trial is scored and closed on: the Independent's own trial work, not archived. */
export const trialTasks = (tasks: Task[]) => scoredItems(tasks);

/**
 * TB-109 — why the activity tracker has stopped, or undefined while it runs: a contract that has
 * ended, or a trial that is over (early, once every trial task is approved). A full-time or
 * part-time contract with nothing open keeps running, since the Team Builder can add the next task.
 */
export function trackerClosed(tasks: Task[], { ended, trialOver }: { ended: boolean; trialOver: boolean }) {
  if (ended) return "The contract has ended";
  if (!trialOver) return undefined;
  const trial = trialTasks(tasks);
  return trial.length > 0 && trial.every((t) => isCompleted(t.status)) ? "Every trial task has been approved" : "The trial has ended";
}

/** A new id, unique enough for one browser's demo data. */
const taskId = (prefix = "t") => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** A row being written in a task plan (TaskPlanEditor): a planned task with a key the list tracks it by. */
export type DraftTask = PlannedTask & { key: string };

export const blankDraft = (): DraftTask => ({ key: taskId("d"), title: "" });
export const toDrafts = (tasks: PlannedTask[]): DraftTask[] => tasks.map((t) => ({ ...t, key: taskId("d") }));

/** What the plan keeps: rows with a real title (two characters or more), trimmed. */
export const fromDrafts = (rows: DraftTask[]): PlannedTask[] =>
  rows.filter((r) => r.title.trim().length > 1).map((r) => ({ title: r.title.trim(), description: r.description?.trim() || undefined, priority: r.priority, week: r.week }));

/**
 * An agreed task as the contract starts it: from the offer the Team Builder wrote it into, with its
 * due week turned into a date, numbered and ordered as the offer listed it, for the Independent the
 * offer was made to. What the offer didn't set — the work type, effort, start and tags — is left for
 * the workspace, where it's planned like any other task's.
 */
export function taskFromOffer(t: OfferTask, index: number, start: string, opts: { trialEnd?: string; created: string; name: string }): Task {
  const now = Date.now();
  return {
    id: t.id,
    number: index + 1,
    title: t.title,
    ...(t.description ? { description: t.description } : {}),
    ...(t.priority ? { priority: t.priority } : {}),
    ...(dueFromWeek(start, t.week, opts.trialEnd) ? { due: dueFromWeek(start, t.week, opts.trialEnd) } : {}),
    status: "todo",
    type: "task",
    assignee: "independent",
    dependsOn: [],
    tags: [],
    order: (index + 1) * ORDER_STEP,
    addedBy: "team",
    agreed: true,
    ...(opts.trialEnd ? { trial: true } : {}),
    created: opts.created,
    createdAt: now,
    createdBy: opts.name,
    updatedAt: now,
    updatedBy: opts.name,
    version: 1,
    subtasks: [],
    activity: [{ ts: now, at: opts.created, text: "Agreed in the signed offer" }],
    comments: [],
  };
}

/* ------------------------------------------------------------ activity */

/** A day's tile: 2 when a task was sent for review, 1 when tasks were worked on, 0 for nothing. */
export const dayLevel = (tokens: string[] | undefined) => (!tokens?.length ? 0 : tokens.some((t) => t.startsWith("done:")) ? 2 : 1);
