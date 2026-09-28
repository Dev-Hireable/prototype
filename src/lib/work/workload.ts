import { addDays, workingDays, type Day } from "./dates";
import { ASSIGNEE_KEYS, assigneeKey, dateKind, datesOf, isArchived, isCompleted, type AssigneeKey, type WorkItem } from "./model";
import type { Metric } from "./query";

/**
 * Who has how much work on which days. Effort is a relative estimate, not hours, and nobody's
 * capacity is recorded, so this compares the people on the contract with each other and over time
 * — it never says anyone is over capacity. How an item's effort is placed:
 *
 *   start and due    spread evenly over the working days (Mon–Fri) from start to due; if that span
 *                    has no working day, all of it sits on the due date
 *   due only         all of it on the due date
 *   start only       all of it on the start date
 *   no dates         listed as unscheduled, outside the grid
 *
 * The Count measure places a 1 on each of those days instead, so a cell reads "items in flight".
 * Milestones mark dates, not work, so they're left out. Completed items are left out unless
 * `includeDone`. Parts that fall before or after the window are totalled at its edges, so nothing
 * is dropped silently.
 */
export const WORKLOAD_RULE =
  "Effort is spread evenly across the working days between an item's start and due dates. An item with only a due date counts on that day, and one with only a start date on its start. Items without dates are listed as unscheduled. Effort is relative, not hours, so there's no capacity line — use it to compare who has more on, and when.";

export type Share = { item: WorkItem; value: number };
export type Bucket = { value: number; items: Share[] };

export type WorkloadRow = {
  key: AssigneeKey;
  cells: Bucket[];
  before: Bucket;
  after: Bucket;
  unscheduled: WorkItem[];
  /** Dated items with no effort estimate (Effort measure only). */
  unestimated: WorkItem[];
  total: number;
};

const empty = (): Bucket => ({ value: 0, items: [] });

function add(b: Bucket, item: WorkItem, value: number) {
  b.value += value;
  const at = b.items.find((s) => s.item === item);
  if (at) at.value += value;
  else b.items.push({ item, value });
}

/** Each day an item counts on, and how much. Null when it has no dates. */
export function placementOf(t: WorkItem, metric: Metric): { day: Day; value: number }[] | null {
  const kind = dateKind(t);
  const { start, due } = datesOf(t);
  const amount = metric === "count" ? 1 : (t.effort ?? 0);
  switch (kind) {
    case "none":
      return null;
    case "milestone":
      return [];
    case "due":
      return [{ day: due as Day, value: amount }];
    case "start":
      return [{ day: start as Day, value: amount }];
    case "range": {
      const days = workingDays(start as Day, due as Day);
      if (!days.length) return [{ day: due as Day, value: amount }];
      const each = metric === "count" ? 1 : amount / days.length;
      return days.map((day) => ({ day, value: each }));
    }
  }
}

export function workload(items: readonly WorkItem[], opts: { from: Day; days: number; metric: Metric; includeDone: boolean }): { days: Day[]; rows: WorkloadRow[] } {
  const days = Array.from({ length: opts.days }, (_, i) => addDays(opts.from, i));
  const last = days[days.length - 1];
  const rows: WorkloadRow[] = ASSIGNEE_KEYS.map((key) => ({ key, cells: days.map(empty), before: empty(), after: empty(), unscheduled: [], unestimated: [], total: 0 }));
  const rowOf = new Map(rows.map((r) => [r.key, r]));
  for (const t of items) {
    if (isArchived(t) || t.type === "milestone") continue;
    if (!opts.includeDone && isCompleted(t.status)) continue;
    const row = rowOf.get(assigneeKey(t.assignee)) as WorkloadRow;
    const placed = placementOf(t, opts.metric);
    if (placed === null) {
      row.unscheduled.push(t);
      continue;
    }
    if (opts.metric === "effort" && t.effort === undefined) {
      row.unestimated.push(t);
      continue;
    }
    for (const { day, value } of placed) {
      if (value === 0) continue;
      if (day < opts.from) add(row.before, t, value);
      else if (day > last) add(row.after, t, value);
      else {
        add(row.cells[day - opts.from], t, value);
        row.total += value;
      }
    }
  }
  return { days, rows };
}

/** 2.5 → "2.5", 1.3333 → "1.3", 4 → "4". */
export const formatAmount = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ""));
