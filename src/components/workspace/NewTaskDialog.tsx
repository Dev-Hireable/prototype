"use client";

import { useState } from "react";
import { Button, Field, Input, Modal, Select, Textarea } from "@/components/independent/ui";
import { DatePicker } from "@/components/portal/DatePicker";
import { dayOf, isoOf } from "@/lib/work/dates";
import { ASSIGNEE_KEYS, assigneeOf, EFFORT_HELP, TYPE_META, WORK_TYPES, type AssigneeKey, type WorkType } from "@/lib/work/model";
import { checkDates, checkEffort, checkTitle } from "@/lib/work/validate";
import { useWorkspace } from "./context";
import { newItemPlace } from "./moves";
import { fromISODate, isoDay } from "@/lib/demo/dates";

/**
 * "Add task" with everything at once — name, who does it, what kind of work, when it's due and how
 * big it is. The same rules as a save: the name is required, a due date can't be in the past (or
 * after a trial's last day), effort is a whole number. `internal` is a trial's own kind (canAddInternal):
 * the Team Builder's to-do, theirs or nobody's — the Independent's trial work is the contract's tasks.
 */
export function NewTaskDialog({ open, internal = false, onClose }: { open: boolean; internal?: boolean; onClose: () => void }) {
  const { names } = useWorkspace();
  const { draft, set, errors, reset, create } = useNewTask(onClose, internal);
  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={internal ? "Add internal task" : "Add task"}
      description={internal ? `Your own to-do beside the contract tasks. It isn't part of the agreement or ${names.independent}'s work — new work for them is proposed as a change to the contract.` : undefined}
      closeButton
      footer={
        <>
          <Button size="lg" onClick={() => (reset(), onClose())}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" onClick={() => void create()}>
            {internal ? "Add internal task" : "Add task"}
          </Button>
        </>
      }
    >
      <NewTaskForm draft={draft} set={set} errors={errors} internal={internal} onSubmit={() => void create()} />
    </Modal>
  );
}

/** The dialog's fields as typed: effort and the due date as the text in their boxes. */
type Draft = { title: string; assignee: AssigneeKey; type: WorkType; due: string; effort: string; description: string };

const BLANK: Draft = { title: "", assignee: "independent", type: "task", due: "", effort: "", description: "" };
/** An internal item on a trial starts as the Team Builder's own. */
const BLANK_INTERNAL: Draft = { ...BLANK, assignee: "team" };

/** What's wrong with the fields, each said under its own. */
type DraftErrors = { title?: string; date?: string; effort?: string };

/**
 * The task being filled in and what's wrong with it — the name only once Add has been tried — and
 * adding it: checked like a save, then the dialog is cleared and closed, and the task opened once it's saved.
 */
function useNewTask(onClose: () => void, internal: boolean) {
  const env = useWorkspace();
  const { actions, access, today, assigneeLabel, openTask } = env;
  const blank = internal ? BLANK_INTERNAL : BLANK;
  const [draft, setDraft] = useState(blank);
  const [tried, setTried] = useState(false);
  const { title, type, due, effort } = draft;
  const errors: DraftErrors = {
    title: tried ? checkTitle(title)?.message : undefined,
    date: due ? checkDates({ due, type }, null, { today, lastDay: dayOf(access.lastDay) })?.message : undefined,
    effort: effort.trim() ? checkEffort(Number(effort), type)?.message : undefined,
  };
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const reset = () => {
    setDraft(blank);
    setTried(false);
  };

  const create = async () => {
    setTried(true);
    if (checkTitle(title) || errors.date || errors.effort) return;
    const input = { title, assignee: assigneeOf(draft.assignee), type, due: due || undefined, effort: effort.trim() && type !== "milestone" ? Number(effort) : undefined, description: draft.description.trim() || undefined };
    reset();
    onClose();
    const id = internal
      ? await actions.createInternal(input, { success: `Added the internal task “${input.title.trim()}”` })
      : await actions.create({ ...input, ...newItemPlace(env) }, { success: `Added “${input.title.trim()}”${input.assignee === "independent" ? ` — ${assigneeLabel("independent")} has been told` : ""}` });
    if (id) openTask(id);
  };

  return { draft, set, errors, reset, create };
}

/** The form: name; who does it and what kind of work; the due date (a milestone's date) and effort; a description. Enter submits it. */
function NewTaskForm({ draft, set, errors, internal, onSubmit }: { draft: Draft; set: (patch: Partial<Draft>) => void; errors: DraftErrors; internal: boolean; onSubmit: () => void }) {
  const { access, today, assigneeLabel } = useWorkspace();
  const { type } = draft;
  const last = dayOf(access.lastDay);
  // On a trial an internal item isn't the Independent's to do (canAddInternal).
  const keys = internal ? ASSIGNEE_KEYS.filter((k) => k !== "independent") : ASSIGNEE_KEYS;
  const assigneeOptions = keys.map((k) => assigneeLabel(k));
  const typeOptions = WORK_TYPES.map((k) => TYPE_META[k].label);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Field label="Name" error={errors.title}>
        <Input autoFocus value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="What needs doing" maxLength={400} aria-invalid={!!errors.title} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Assignee">
          <Select aria-label="Assignee" options={assigneeOptions} value={assigneeLabel(draft.assignee)} onChange={(e) => set({ assignee: keys[assigneeOptions.indexOf(e.target.value)] ?? keys[0] })} />
        </Field>
        <Field label="Work type">
          <Select aria-label="Work type" options={typeOptions} value={TYPE_META[type].label} onChange={(e) => set({ type: WORK_TYPES[typeOptions.indexOf(e.target.value)] ?? "task" })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={type === "milestone" ? "Date" : "Due date (optional)"} error={errors.date}>
          <DatePicker
            value={draft.due ? fromISODate(draft.due) : undefined}
            onChange={(d) => set({ due: d ? isoDay(d) : "" })}
            disabled={[{ before: fromISODate(isoOf(today)) as Date }, ...(last !== null ? [{ after: fromISODate(isoOf(last)) as Date }] : [])]}
            aria-label="Due date"
            clearLabel="Clear due date"
          />
        </Field>
        {type !== "milestone" && (
          <Field label="Effort (optional)" hint={EFFORT_HELP} error={errors.effort}>
            <Input value={draft.effort} onChange={(e) => set({ effort: e.target.value.replace(/[^0-9]/g, "").slice(0, 3) })} inputMode="numeric" placeholder="1, 2, 3, 5, 8, 13…" aria-invalid={!!errors.effort} />
          </Field>
        )}
      </div>
      <Field label="Description (optional)">
        <Textarea rows={3} value={draft.description} onChange={(e) => set({ description: e.target.value })} placeholder="What done looks like, links, anything to check" maxLength={5000} />
      </Field>
      <button type="submit" hidden />
    </form>
  );
}
