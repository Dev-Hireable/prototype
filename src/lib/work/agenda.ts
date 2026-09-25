import { dayOf, type Day } from "./dates";
import { isArchived, isCompleted, isOverdue, type Side, type WorkItem } from "./model";

/** Why an item is on someone's list. */
export type AgendaReason = "changes" | "overdue" | "doing" | "todo" | "review";

export type AgendaRow = { item: WorkItem; reason: AgendaReason; due: Day | null };

/**
 * The order each side's list goes in. The Independent acts on changes first, and a review is the
 * Team Builder's to make, so theirs sits last; for the Team Builder, the reviews come first.
 */
const RANK: Record<Side, Record<AgendaReason, number>> = {
  independent: { changes: 0, overdue: 1, doing: 2, todo: 3, review: 4 },
  team: { review: 0, changes: 1, overdue: 1, doing: 2, todo: 3 },
};

/**
 * What's on each side's list: the Independent's own work; for the Team Builder, the Independent's
 * work once it's waiting on their review, and their own and unassigned work — which only they can
 * move or assign.
 */
const ON_LIST: Record<Side, (t: WorkItem) => boolean> = {
  independent: (t) => t.assignee === "independent",
  team: (t) => (t.assignee === "independent" ? t.status === "review" : true),
};

/**
 * One side's open work, most pressing first. The Independent's: what came back with changes,
 * what's overdue, what's under way, then what's next by due date (undated last), and, at the end,
 * what sits with the Team Builder for review. The Team Builder's: what's waiting on their review,
 * then their own and unassigned work in the same order. Done and archived work isn't on either.
 */
export function agendaOf(items: readonly WorkItem[], today: Day, side: Side = "independent"): AgendaRow[] {
  const rank = RANK[side];
  return items
    .filter((t) => !isArchived(t) && !isCompleted(t.status) && ON_LIST[side](t))
    .map((t) => {
      const reason: AgendaReason = t.status === "review" ? "review" : t.changes ? "changes" : isOverdue(t, today) ? "overdue" : t.status === "doing" ? "doing" : "todo";
      return { item: t, reason, due: dayOf(t.due) };
    })
    .sort((a, b) => rank[a.reason] - rank[b.reason] || (a.due ?? Number.MAX_SAFE_INTEGER) - (b.due ?? Number.MAX_SAFE_INTEGER) || a.item.order - b.item.order);
}
