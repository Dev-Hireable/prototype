import { dayOf, type Day } from "./dates";
import { isArchived, isCompleted, isOverdue, type Side, type WorkItem } from "./model";
import { byOrder } from "./order";

/** Why an item is on someone's list: what its row says beside it. */
export type AgendaReason = "changes" | "overdue" | "doing" | "todo" | "review";

export type AgendaRow = { item: WorkItem; reason: AgendaReason; due: Day | null };

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
 * One side's open work in the manual order (TB-142): the one order every view's Manual sort shares,
 * which they set by dragging a row here or in the Work tab. Each row keeps why it's on the list
 * (sent back with changes, overdue, under way, next, or waiting on a review) for the chip beside
 * it, so what's pressing still shows wherever it's placed. Done and archived work isn't on either.
 */
export function agendaOf(items: readonly WorkItem[], today: Day, side: Side = "independent"): AgendaRow[] {
  return items
    .filter((t) => !isArchived(t) && !isCompleted(t.status) && ON_LIST[side](t))
    .sort(byOrder)
    .map((t) => {
      const reason: AgendaReason = t.status === "review" ? "review" : t.changes ? "changes" : isOverdue(t, today) ? "overdue" : t.status === "doing" ? "doing" : "todo";
      return { item: t, reason, due: dayOf(t.due) };
    });
}
