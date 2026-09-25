"use client";

import { useState } from "react";
import { Button, Field, Input, Modal, Select, Textarea } from "@/components/independent/ui";
import { DatePicker, fromISODate, toISODate } from "@/components/portal/DatePicker";
import { dayOf, isoOf } from "@/lib/work/dates";
import { ASSIGNEE_KEYS, assigneeOf, EFFORT_HELP, TYPE_META, WORK_TYPES, type AssigneeKey, type WorkType } from "@/lib/work/model";
import { checkDates, checkEffort, checkTitle } from "@/lib/work/validate";
import { useWorkspace } from "./context";
import { newItemPlace } from "./moves";

/**
 * "Add task" with everything at once — name, who does it, what kind of work, when it's due and how
 * big it is. The same rules as a save: the name is required, a due date can't be in the past (or
 * after a trial's last day), effort is a whole number.
 */
export function NewTaskDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const env = useWorkspace();
  const { actions, access, today, assigneeLabel, openTask } = env;
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<AssigneeKey>("independent");
  const [type, setType] = useState<WorkType>("task");
  const [due, setDue] = useState("");
  const [effort, setEffort] = useState("");
  const [description, setDescription] = useState("");
  const [tried, setTried] = useState(false);
  const titleError = tried ? checkTitle(title)?.message : undefined;
  const dateError = due ? checkDates({ due, type }, null, { today, lastDay: dayOf(access.lastDay) })?.message : undefined;
  const effortError = effort.trim() ? checkEffort(Number(effort), type)?.message : undefined;
  const last = dayOf(access.lastDay);

  const reset = () => {
    setTitle("");
    setAssignee("independent");
    setType("task");
    setDue("");
    setEffort("");
    setDescription("");
    setTried(false);
  };

  const create = async () => {
    setTried(true);
    if (checkTitle(title) || dateError || effortError) return;
    const input = { title, assignee: assigneeOf(assignee), type, due: due || undefined, effort: effort.trim() && type !== "milestone" ? Number(effort) : undefined, description: description.trim() || undefined };
    reset();
    onClose();
    const id = await actions.create({ ...input, ...newItemPlace(env) }, { success: `Added “${input.title.trim()}”${input.assignee === "independent" ? ` — ${assigneeLabel("independent")} has been told` : ""}` });
    if (id) openTask(id);
  };

  const assigneeOptions = ASSIGNEE_KEYS.map((k) => assigneeLabel(k));
  const typeOptions = WORK_TYPES.map((k) => TYPE_META[k].label);

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add task"
      closeButton
      footer={
        <>
          <Button size="lg" onClick={() => (reset(), onClose())}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" onClick={() => void create()}>
            Add task
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <Field label="Name" error={titleError}>
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing" maxLength={400} aria-invalid={!!titleError} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Assignee">
            <Select aria-label="Assignee" options={assigneeOptions} value={assigneeLabel(assignee)} onChange={(e) => setAssignee(ASSIGNEE_KEYS[assigneeOptions.indexOf(e.target.value)] ?? "independent")} />
          </Field>
          <Field label="Work type">
            <Select aria-label="Work type" options={typeOptions} value={TYPE_META[type].label} onChange={(e) => setType(WORK_TYPES[typeOptions.indexOf(e.target.value)] ?? "task")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={type === "milestone" ? "Date" : "Due date (optional)"} error={dateError}>
            <DatePicker
              value={due ? fromISODate(due) : undefined}
              onChange={(d) => setDue(d ? toISODate(d) : "")}
              disabled={[{ before: fromISODate(isoOf(today)) as Date }, ...(last !== null ? [{ after: fromISODate(isoOf(last)) as Date }] : [])]}
              aria-label="Due date"
              clearLabel="Clear due date"
            />
          </Field>
          {type !== "milestone" && (
            <Field label="Effort (optional)" hint={EFFORT_HELP} error={effortError}>
              <Input value={effort} onChange={(e) => setEffort(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))} inputMode="numeric" placeholder="1, 2, 3, 5, 8, 13…" aria-invalid={!!effortError} />
            </Field>
          )}
        </div>
        <Field label="Description (optional)">
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What done looks like, links, anything to check" maxLength={5000} />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
