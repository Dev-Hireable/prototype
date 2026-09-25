import type { WorkItem } from "./model";

/**
 * Changes on their way to being saved, laid over the saved list so the screen moves at once. Each
 * is an absolute value ("status is In progress"), not a step ("move one column right"), so laying
 * it over a list that already has it — the save landed, or another tab made the same change — is
 * harmless. Items no change touches keep their identity, so memoised cards don't re-render.
 */
export type PendingOp = {
  opId: string;
  itemId: string;
  /** Field values to show until the save settles. */
  set?: Partial<WorkItem>;
  /** An item being created. Once the saved list has it, the saved copy wins. */
  create?: WorkItem;
};

export function applyOps(items: readonly WorkItem[], ops: readonly PendingOp[]): readonly WorkItem[] {
  if (!ops.length) return items;
  const sets = new Map<string, Partial<WorkItem>[]>();
  for (const op of ops) if (op.set) sets.set(op.itemId, [...(sets.get(op.itemId) ?? []), op.set]);
  const present = new Set<string>();
  const out = items.map((t) => {
    present.add(t.id);
    const patches = sets.get(t.id);
    return patches ? (Object.assign({}, t, ...patches) as WorkItem) : t;
  });
  for (const op of ops) {
    if (!op.create || present.has(op.create.id)) continue;
    present.add(op.create.id);
    const patches = sets.get(op.create.id);
    out.push(patches ? (Object.assign({}, op.create, ...patches) as WorkItem) : op.create);
  }
  return out;
}
