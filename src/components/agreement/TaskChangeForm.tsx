"use client";

import { useState } from "react";
import { Button, Checkbox, Field, Input, Textarea } from "@/components/independent/ui";
import { DatePicker } from "@/components/portal/DatePicker";
import { fromISODate, isoDay, startOfToday } from "@/lib/demo/dates";
import { DESCRIPTION_MAX, EFFORT_HELP, TITLE_MAX } from "@/lib/work/model";
import type { TaskFields } from "./draft";

/**
 * A contract task's agreed definition as a form: its name, what done means, its due date, its effort
 * and whether it's a milestone. The same form proposes a new task and a change to one; `onSave`
 * checks it against the contract's rules and says why it can't go, or null once it's in.
 */
export function TaskChangeForm({ label, initial, lastDay, saveLabel, onSave, onCancel }: { label: string; initial: TaskFields; lastDay?: string; saveLabel: string; onSave: (f: TaskFields) => string | null; onCancel: () => void }) {
  const [f, setF] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<TaskFields>) => {
    setF((x) => ({ ...x, ...patch }));
    setError(null);
  };
  const last = lastDay ? fromISODate(lastDay) : undefined;
  return (
    <form
      aria-label={label}
      onSubmit={(e) => {
        e.preventDefault();
        setError(onSave(f));
      }}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface-alt p-4"
    >
      <Field label="Name">
        <Input autoFocus value={f.title} onChange={(e) => set({ title: e.target.value })} maxLength={TITLE_MAX} aria-label="Task name" />
      </Field>
      <Field label="Requirements" hint="What done looks like — what the other side accepts it against.">
        <Textarea rows={3} value={f.description} onChange={(e) => set({ description: e.target.value })} maxLength={DESCRIPTION_MAX} aria-label="Requirements" />
      </Field>
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Due date" className="w-48">
          <DatePicker value={f.due ? fromISODate(f.due) : undefined} onChange={(d) => set({ due: d ? isoDay(d) : "" })} disabled={[{ before: startOfToday() }, ...(last ? [{ after: last }] : [])]} aria-label="Due date" clearLabel="Clear due date" />
        </Field>
        {!f.milestone && (
          <Field label="Effort" hint={EFFORT_HELP} className="w-40">
            <Input value={f.effort} onChange={(e) => set({ effort: e.target.value.replace(/[^0-9]/g, "") })} inputMode="numeric" aria-label="Effort" />
          </Field>
        )}
        <Checkbox checked={f.milestone} onChange={(on) => set({ milestone: on })}>
          A milestone — one date, no effort
        </Checkbox>
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" type="submit">
          {saveLabel}
        </Button>
      </div>
    </form>
  );
}
