import { refOf, STATUS_META, TYPE_META, type WorkItem, type WorkStatus } from "@/lib/work/model";
import { changeFor, transitionFor, type TransitionKind, type WorkField } from "@/lib/work/permissions";
import type { GroupValue } from "@/lib/work/query";
import type { WorkPatch } from "@/lib/work/repository";
import { movedTo, NO_PROJECT, projectKeyOf } from "@/lib/work/projects";
import type { WorkspaceEnv } from "./context";

/**
 * What dropping an item on a column (or picking it in Move to) does: a status change the rules
 * allow, a new assignee / work type / priority, or just a new place in the manual order. The same
 * plan drives drag and drop, the keyboard moves and the Move to menu.
 */
export type DropPlan = { kind: "status"; to: WorkStatus; transition: TransitionKind; needsNote: boolean } | { kind: "set"; set: WorkPatch; label: string } | { kind: "reorder" };

export function dropPlan(t: WorkItem, target: GroupValue, env: Pick<WorkspaceEnv, "actor" | "access" | "names" | "assigneeLabel" | "projects">): DropPlan | null {
  /** The column sets a field: the same rule as its editor (changeFor) — what the signed offer set stays as agreed. */
  const can = (field: WorkField) => changeFor(t, env.actor, env.access, field, env.names).ok;
  switch (target.field) {
    case "status": {
      if (target.value === t.status) return { kind: "reorder" };
      const tr = transitionFor(t, env.actor, env.access, target.value, env.names);
      return tr.ok ? { kind: "status", to: target.value, transition: tr.kind, needsNote: tr.needsNote } : null;
    }
    case "assignee": {
      const value = target.value === "none" ? null : target.value;
      if (value === t.assignee) return { kind: "reorder" };
      return can("assignee") ? { kind: "set", set: { assignee: value }, label: `assigned to ${env.assigneeLabel(target.value)}` } : null;
    }
    case "type": {
      if (target.value === t.type) return { kind: "reorder" };
      if (!can("type")) return null;
      // A milestone is one date and no effort: clear them in the same save.
      const clears = target.value === "milestone" ? { ...(t.start ? { start: null } : {}), ...(t.effort !== undefined ? { effort: null } : {}) } : {};
      return { kind: "set", set: { type: target.value, ...clears }, label: `now ${TYPE_META[target.value].label}` };
    }
    case "priority": {
      const value = target.value === "none" ? null : target.value;
      if (value === (t.priority ?? null)) return { kind: "reorder" };
      return can("priority") ? { kind: "set", set: { priority: value }, label: value ? `${value} priority` : "no priority" } : null;
    }
    case "project": {
      const { ctx, places, canPlan } = env.projects;
      const here = places.find((p) => p.key === target.value);
      if (!here) return null;
      if (projectOf(t, env) === target.value) return { kind: "reorder" };
      // Out of a project or into an active one — not back into the trial, not into a finished project.
      if (!canPlan || !ctx.split || here.kind === "trial" || here.finished || !can("project")) return null;
      return { kind: "set", set: { project: target.value === NO_PROJECT ? null : target.value }, label: `moved ${movedTo(here)}` };
    }
    case "none":
      return { kind: "reorder" };
  }
}

const projectOf = (t: WorkItem, env: Pick<WorkspaceEnv, "projects">) => projectKeyOf(t, env.projects.ctx);

/**
 * Why a card can't be dropped on a column, for the hint shown while dragging: the status move the
 * rules refuse, or the field the column sets that isn't this person's to change — one the signed
 * offer agreed, say — in the words its editor and the repository use.
 */
export function refusal(t: WorkItem, target: GroupValue, env: Pick<WorkspaceEnv, "actor" | "access" | "names">): string | null {
  if (target.field === "status" && target.value !== t.status) {
    const tr = transitionFor(t, env.actor, env.access, target.value, env.names);
    return tr.ok ? null : tr.reason;
  }
  if (target.field === "assignee" || target.field === "type" || target.field === "priority") {
    const change = changeFor(t, env.actor, env.access, target.field, env.names);
    return change.ok ? null : change.reason;
  }
  return null;
}

/**
 * Carry out a plan: one save for the new value and the place in the order. A move that needs a
 * note (asking for changes) opens the item on the note instead.
 */
export function runPlan(env: WorkspaceEnv, t: WorkItem, plan: DropPlan, place: { after?: string; before?: string } | null) {
  const order = place ?? {};
  if (plan.kind === "status" && plan.needsNote) return env.openTask(t.id, "changes");
  if (plan.kind === "reorder") {
    if (!place) return;
    return void env.actions.move(t, order, { announce: `Moved ${refOf(t)}` });
  }
  if (plan.kind === "status") {
    const msgs =
      plan.transition === "submit"
        ? { success: `Sent ${refOf(t)} to ${env.names.team} for review` }
        : plan.transition === "approve"
          ? { success: `Approved ${refOf(t)} — ${env.names.independent} has been told` }
          : plan.transition === "takeBack"
            ? { success: `Took ${refOf(t)} back — it's no longer in review` }
            : { announce: `${refOf(t)} moved to ${STATUS_META[plan.to].label}` };
    return void env.actions.move(t, { status: plan.to, ...order }, msgs);
  }
  return void env.actions.move(t, { set: plan.set, ...order }, { announce: `${refOf(t)} ${plan.label}` });
}

/** The place between two neighbours in a column's visible order, leaving out the item itself. */
export function placeAt(column: readonly WorkItem[], id: string, index: number): { after?: string; before?: string } {
  const rest = column.filter((x) => x.id !== id);
  const at = Math.max(0, Math.min(index, rest.length));
  return { after: rest[at - 1]?.id, before: rest[at]?.id };
}

/** Whether work can be added to or moved into a place: no project or an active project. */
export function takesWork(env: Pick<WorkspaceEnv, "projects">, key: string): boolean {
  const p = env.projects.places.find((x) => x.key === key);
  return !!p && (p.kind === "none" || (p.kind === "project" && !p.finished));
}

/**
 * The project a new item goes in: the column it's added in when the board is grouped by project,
 * else the project that's showing. Anywhere else — the open work, no project — it's in no project.
 */
export function newItemPlace(env: Pick<WorkspaceEnv, "projects">, target?: GroupValue): { project?: string } {
  if (!env.projects.ctx.split) return {};
  const key = target?.field === "project" ? target.value : env.projects.scope;
  return key !== NO_PROJECT && takesWork(env, key) ? { project: key } : {};
}
