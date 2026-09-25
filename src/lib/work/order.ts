import type { WorkItem } from "./model";

/**
 * Manual order: one rank per item, shared by every view's Manual sort. A move places an item
 * between two neighbours by giving it the midpoint of their ranks, so nothing else is rewritten.
 * When two ranks get too close to split, the whole list is renumbered in its current order.
 */

export const ORDER_STEP = 1024;
const MIN_GAP = 1e-6;

/** A rank between `prev` (above) and `next` (below); null when they're too close to split. */
export function orderBetween(prev: number | undefined, next: number | undefined): number | null {
  if (prev === undefined && next === undefined) return ORDER_STEP;
  if (prev === undefined) return (next as number) - ORDER_STEP;
  if (next === undefined) return prev + ORDER_STEP;
  if (next - prev < MIN_GAP) return null;
  return (prev + next) / 2;
}

/** Below everything. */
export const orderLast = (items: readonly Pick<WorkItem, "order">[]) => (items.length ? Math.max(...items.map((t) => t.order)) : 0) + ORDER_STEP;

/** Above everything. */
export const orderFirst = (items: readonly Pick<WorkItem, "order">[]) => (items.length ? Math.min(...items.map((t) => t.order)) : 2 * ORDER_STEP) - ORDER_STEP;

export const byOrder = (a: Pick<WorkItem, "order" | "number">, b: Pick<WorkItem, "order" | "number">) => a.order - b.order || a.number - b.number;

/**
 * Where `id` goes: under `after` and above `before` (either may be missing). Returns the new rank,
 * or — when the neighbours are too close — every item's new rank with `id` placed between them.
 */
export function placeBetween(items: readonly WorkItem[], id: string, after: string | undefined, before: string | undefined): { order: number } | { renumber: Map<string, number> } {
  const prev = after ? items.find((t) => t.id === after)?.order : undefined;
  const next = before ? items.find((t) => t.id === before)?.order : undefined;
  const between = orderBetween(prev, next);
  if (between !== null && (prev === undefined || next === undefined || prev < next)) return { order: between };
  const rest = [...items].filter((t) => t.id !== id).sort(byOrder);
  const at = before ? rest.findIndex((t) => t.id === before) : after ? rest.findIndex((t) => t.id === after) + 1 : rest.length;
  const moved = items.find((t) => t.id === id);
  const list = moved ? [...rest.slice(0, Math.max(0, at)), moved, ...rest.slice(Math.max(0, at))] : rest;
  return { renumber: new Map(list.map((t, i) => [t.id, (i + 1) * ORDER_STEP])) };
}
