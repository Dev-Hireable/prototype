import type { WorkItem } from "@/lib/work/model";

/**
 * The data-* attributes a board card and a list row both carry: the item's id (focusItem finds it
 * by that), status, assignee, dates and effort, and whether a change to it is still saving.
 */
export function itemData(t: WorkItem, pending: boolean) {
  return {
    "data-item-id": t.id,
    "data-status": t.status,
    "data-assignee": t.assignee ?? "none",
    "data-due": t.due ?? "",
    "data-start": t.start ?? "",
    "data-effort": t.effort ?? "",
    "data-pending": pending ? "true" : undefined,
  };
}
