import { useCallback, type KeyboardEvent } from "react";
import { refOf, type WorkItem } from "@/lib/work/model";
import type { Group } from "@/lib/work/query";
import type { WorkActions } from "@/lib/work/store";
import type { WorkspaceEnv } from "./context";
import type { MenuModel, MenuMove } from "./item-menu";
import { dropPlan, newItemPlace, runPlan, takesWork, type DropPlan } from "./moves";
import { focusItem } from "./util";

/*
 * What the grouped views — the Board's columns and the List's groups — do with a group: add a task
 * straight into it, move an item a step up or down it, and the ⋯ menu's moves to another group or
 * within its own. One set of rules for both views, so they can't drift apart.
 */

type Place = { after?: string; before?: string };

/** Whether a task can be added straight into a group: new work starts To do, and only goes where work can be added. */
export function takesNewWork(env: WorkspaceEnv, g: Group, archived: boolean): boolean {
  return env.canCreate && !archived && (g.value.field !== "status" || g.value.value === "todo") && (g.value.field !== "project" || takesWork(env, g.value.value));
}

/** A group's effort, all its items' together — for its heading. */
export const groupEffort = (g: Group) => g.items.reduce((n, t) => n + (t.effort ?? 0), 0);

/** Adds a task to a group, with the group's assignee, work type, priority or project — at its end when the order is manual. */
export function addToGroup(env: WorkspaceEnv, g: Group, reorderable: boolean, title: string) {
  return env.actions.create(
    {
      title,
      ...(g.value.field === "assignee" ? { assignee: g.value.value === "none" ? null : g.value.value } : {}),
      ...(g.value.field === "type" ? { type: g.value.value } : {}),
      ...(g.value.field === "priority" && g.value.value !== "none" ? { priority: g.value.value } : {}),
      ...newItemPlace(env, g.value),
      ...(reorderable && g.items.length ? { after: g.items.at(-1)?.id } : {}),
    },
    { announce: `Added “${title}”` },
  );
}

/** The place one step up (or down) a group from position `i` — null at that end. */
function stepPlace(column: readonly WorkItem[], i: number, up: boolean): Place | null {
  if (up) return i > 0 ? { after: column[i - 2]?.id, before: column[i - 1].id } : null;
  return i < column.length - 1 ? { after: column[i + 1].id, before: column[i + 2]?.id } : null;
}

/** Alt+Shift+↑ or ↓ on an item: a step up or down its group, read out, with the focus kept on it. */
export function stepByKey(t: WorkItem, column: readonly WorkItem[], e: KeyboardEvent, actions: WorkActions) {
  e.preventDefault();
  const up = e.key === "ArrowUp";
  const place = stepPlace(column, column.findIndex((x) => x.id === t.id), up);
  if (!place) return;
  void actions.move(t, place, { announce: `Moved ${refOf(t)} ${up ? "up" : "down"}` });
  focusItem(t.id);
}

/** The ⋯ menu's model for a grouped view (menuModelOf), the same function while the work and the workspace stay the same. */
export function useMenuModel(byId: ReadonlyMap<string, WorkItem>, groups: readonly Group[], env: WorkspaceEnv, reorderable: boolean) {
  return useCallback((id: string) => menuModelOf(id, byId, groups, env, reorderable), [byId, groups, env, reorderable]);
}

/**
 * The ⋯ menu for an item in a group: the other groups it can go to, and — when the order is
 * manual — up, down, to the top or to the bottom of its own. Nothing for an item that's gone.
 */
function menuModelOf(id: string, byId: ReadonlyMap<string, WorkItem>, groups: readonly Group[], env: WorkspaceEnv, reorderable: boolean): MenuModel | null {
  const t = byId.get(id);
  if (!t) return null;
  const at = groups.findIndex((g) => g.items.some((x) => x.id === id));
  const column = at >= 0 ? groups[at].items : [];
  return { item: t, moves: movesOf(t, groups, at, env, reorderable), order: reorderable ? orderOf(t, column, env.actions) : undefined };
}

/** Move to: every other group the item may go to — a real change there, not just a new place in the order. */
function movesOf(t: WorkItem, groups: readonly Group[], at: number, env: WorkspaceEnv, reorderable: boolean): MenuMove[] {
  return groups
    .filter((_, j) => j !== at)
    .map((g) => ({ g, plan: dropPlan(t, g.value, env) }))
    .filter((x): x is { g: Group; plan: DropPlan } => !!x.plan && x.plan.kind !== "reorder")
    .map(({ g, plan }) => ({ key: g.key, label: g.label, run: () => runPlan(env, t, plan, reorderable ? { after: g.items.at(-1)?.id } : null) }));
}

/** Up, down, to the top and to the bottom of the item's group — each only where there's room that way. */
function orderOf(t: WorkItem, column: readonly WorkItem[], actions: WorkActions): MenuModel["order"] {
  const i = column.findIndex((x) => x.id === t.id);
  if (i < 0) return undefined;
  const move = (place: Place | null, word: string) => (place ? () => void actions.move(t, place, { announce: `Moved ${refOf(t)} ${word}` }) : undefined);
  return {
    up: move(stepPlace(column, i, true), "up"),
    down: move(stepPlace(column, i, false), "down"),
    top: move(i > 0 ? { before: column[0].id } : null, "to the top"),
    bottom: move(i < column.length - 1 ? { after: column.at(-1)?.id } : null, "to the bottom"),
  };
}
