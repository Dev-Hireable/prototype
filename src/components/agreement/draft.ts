"use client";

import { useState } from "react";
import { newId } from "@/lib/work/model";
import { TASK_FIELDS, type ScopeChange, type ScopeTask, type TaskPatch } from "@/lib/work/scope";

/** What the builder's form is writing: a change to a contract task (by id), a new task (by its id once it has one), the pay — or nothing. */
export type Editing = { kind: "task"; id: string } | { kind: "add"; id?: string } | { kind: "terms" } | null;

/** Where an amendment builder opens: on a task's change, with changes already in it (a removal, a restore), and its reason. */
export type DraftStart = { editing?: Editing; changes?: ScopeChange[]; reason?: string };

/** The one change a target can have in an amendment: each task once, the pay once. */
export const targetOf = (c: ScopeChange) => (c.kind === "add" ? `add:${c.task.id}` : c.kind === "terms" ? "terms" : `task:${c.taskId}`);

/**
 * An amendment as it's written: its changes (one per task, one to the pay), its reason, and which
 * change the form is on. A change saved over another to the same target replaces it.
 */
export function useAmendmentDraft(start: DraftStart = {}) {
  const [reason, setReason] = useState(start.reason ?? "");
  const [changes, setChanges] = useState<ScopeChange[]>(start.changes ?? []);
  const [editing, setEditing] = useState<Editing>(start.editing ?? null);
  const put = (c: ScopeChange) => {
    setChanges((all) => {
      const at = all.findIndex((x) => targetOf(x) === targetOf(c));
      return at < 0 ? [...all, c] : all.map((x, i) => (i === at ? c : x));
    });
    setEditing(null);
  };
  const drop = (id: string) => setChanges((all) => all.filter((x) => x.id !== id));
  const forTask = (taskId: string) => changes.find((c) => (c.kind === "change" || c.kind === "remove") && c.taskId === taskId);
  return { reason, setReason, changes, editing, setEditing, put, drop, forTask, terms: changes.find((c) => c.kind === "terms") };
}

export type AmendmentDraft = ReturnType<typeof useAmendmentDraft>;

/** A task as the form holds it: every agreed field, as text where the form types it. */
export type TaskFields = { title: string; description: string; due: string; effort: string; milestone: boolean };

export const fieldsOf = (t: ScopeTask | undefined): TaskFields => ({ title: t?.title ?? "", description: t?.description ?? "", due: t?.due ?? "", effort: t?.effort !== undefined ? String(t.effort) : "", milestone: !!t?.milestone });

/** The form's fields as a task: typed text trimmed, empties left out, no effort on a milestone. */
export function taskFrom(f: TaskFields, id: string): ScopeTask {
  const effort = f.effort.trim() === "" || f.milestone ? undefined : Number(f.effort);
  return { id, title: f.title.trim(), ...(f.description.trim() ? { description: f.description.trim() } : {}), ...(f.due ? { due: f.due } : {}), ...(effort !== undefined ? { effort } : {}), ...(f.milestone ? { milestone: true } : {}) };
}

/** Only what differs from the task as agreed: set to the new value, or null where it was cleared. */
export function patchFrom(was: ScopeTask, f: TaskFields): TaskPatch {
  const next = taskFrom(f, was.id);
  const patch: TaskPatch = {};
  for (const k of TASK_FIELDS) {
    const before = k === "milestone" ? !!was.milestone : was[k];
    const after = k === "milestone" ? !!next.milestone : next[k];
    if (before === after) continue;
    if (k === "milestone") patch.milestone = !!after;
    else if (k === "title") patch.title = next.title;
    else (patch as Record<string, unknown>)[k] = after ?? null;
  }
  return patch;
}

/** A new task's id, made once when it's first saved, so editing it keeps the same one. */
export const newTaskId = () => newId("t");

/** A new change's id. */
export const newChangeId = () => newId("ch");
