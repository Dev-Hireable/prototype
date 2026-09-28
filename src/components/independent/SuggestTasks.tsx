"use client";

import { useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, Input, Select, Textarea } from "@/components/independent/ui";
import { PriorityPill, StatusCircle } from "@/components/portal/tasks/task-bits";
import { checkSuggestion, describeSuggestion, SUGGESTION_NOTE_MAX, type TaskSuggestion } from "@/lib/demo/suggestions";
import { weekLabel, type PlannedTask } from "@/lib/demo/tasks";
import { keyed } from "@/lib/portal/keys";

/**
 * IN-073 — the trial's tasks in a revision, with a way to push back on them: suggest a change to a
 * task (its name or its week), suggest removing it, or suggest one that's missing — each with a
 * reason. The tasks stay the company's; it accepts or ignores each suggestion (TB-106).
 */
export function SuggestTasks({ tasks, weeks, company, value, onChange }: { tasks: PlannedTask[]; weeks: number; company: string; value: TaskSuggestion[]; onChange: (next: TaskSuggestion[]) => void }) {
  /** The task a suggestion is being written for, "new" for a missing one, or null. */
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const forTask = (i: number) => value.find((s) => s.kind !== "add" && s.task === i);
  const added = value.filter((s) => s.kind === "add");
  const save = (s: TaskSuggestion) => {
    onChange([...value.filter((x) => x.id !== s.id && !(s.kind !== "add" && x.kind !== "add" && x.task === s.task)), s]);
    setEditing(null);
  };
  const drop = (id: string) => onChange(value.filter((x) => x.id !== id));

  return (
    <div className="flex flex-col gap-2">
      <ol className="overflow-hidden rounded-lg bg-white outline -outline-offset-1 outline-border">
        {keyed(tasks, (t) => t.title).map(({ item: t, key }, i) => {
          const s = forTask(i);
          return (
            <li key={key} className="flex flex-col gap-2 border-t border-[#eeeeee] px-3 py-2.5 first:border-t-0">
              <div className="flex items-center gap-2.5">
                <StatusCircle status="todo" />
                <span className={`min-w-0 flex-1 text-[14px] leading-[1.35] ${s?.kind === "remove" ? "text-ink-2 line-through" : "text-ink"}`}>{t.title}</span>
                <span className="w-16 shrink-0 text-[12.5px] whitespace-nowrap text-ink-2">{t.week && weekLabel(t.week)}</span>
                <span className="flex w-20 shrink-0">{t.priority && <PriorityPill priority={t.priority} />}</span>
                {!s && editing !== i && (
                  <button type="button" onClick={() => setEditing(i)} className="shrink-0 text-[12.5px] font-medium text-accent-ink hover:underline" aria-label={`Suggest a change to “${t.title}”`}>
                    Suggest a change
                  </button>
                )}
              </div>
              {s && <Suggested s={s} onEdit={() => setEditing(i)} onRemove={() => drop(s.id)} />}
              {editing === i && <SuggestionForm tasks={tasks} weeks={weeks} task={i} initial={s} onSave={save} onCancel={() => setEditing(null)} />}
            </li>
          );
        })}
        {added.map((s) => (
          <li key={s.id} className="flex flex-col gap-2 border-t border-[#eeeeee] px-3 py-2.5">
            <Suggested s={s} onRemove={() => drop(s.id)} />
          </li>
        ))}
        <li className="border-t border-[#eeeeee]">
          {editing === "new" ? (
            <div className="px-3 py-2.5">
              <SuggestionForm tasks={tasks} weeks={weeks} onSave={save} onCancel={() => setEditing(null)} />
            </div>
          ) : (
            <button type="button" onClick={() => setEditing("new")} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13.5px] text-ink-2 hover:bg-surface-alt hover:text-ink">
              <ICONS.add size={18} aria-hidden /> Suggest a task
            </button>
          )}
        </li>
      </ol>
      <p className="text-[12px] leading-[1.4] text-ink-2">
        {value.length ? `${value.length === 1 ? "1 suggestion" : `${value.length} suggestions`} goes with your revision.` : "Something off with a task?"} {company} decides on each one, and what it accepts goes into the offer.
      </p>
    </div>
  );
}

/** A suggestion as it'll be sent: what, and why. */
function Suggested({ s, onEdit, onRemove }: { s: TaskSuggestion; onEdit?: () => void; onRemove: () => void }) {
  return (
    <div className="ml-7 flex items-start gap-3 rounded-md bg-accent-bg px-3 py-2 text-[13px] leading-[1.4]">
      <ICONS.edit size={15} aria-hidden className="mt-0.5 shrink-0 text-accent-ink" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-medium text-ink">You suggest: {describeSuggestion(s)}</span>
        <span className="text-ink-2 [overflow-wrap:anywhere]">“{s.note}”</span>
      </div>
      <span className="flex shrink-0 gap-3">
        {onEdit && (
          <button type="button" onClick={onEdit} className="font-medium text-accent-ink hover:underline">
            Edit
          </button>
        )}
        <button type="button" onClick={onRemove} className="font-medium text-danger hover:underline">
          Remove
        </button>
      </span>
    </div>
  );
}

/** What a suggestion for one of the tasks asks for. */
type Kind = "change" | "remove";

/** What the form edits: change or remove (for a task), the new name and week, and the reason. */
type Fields = { kind: Kind; title: string; week: number | undefined; note: string };

/** The form's fields, starting from the suggestion being edited — a removal brings only its reason — or blank. */
function useSuggestionFields(initial: TaskSuggestion | undefined) {
  const [kind, setKind] = useState<Kind>(initial?.kind === "remove" ? "remove" : "change");
  const [title, setTitle] = useState(initial && initial.kind !== "remove" ? (initial.title ?? "") : "");
  const [week, setWeek] = useState<number | undefined>(initial && initial.kind !== "remove" ? initial.week : undefined);
  const [note, setNote] = useState(initial?.note ?? "");
  return { kind, setKind, title, setTitle, week, setWeek, note, setNote };
}

/** The suggestion as the form stands: a missing task, or a change to — or the removal of — the one it's for. */
function suggestionOf(initial: TaskSuggestion | undefined, task: number | undefined, t: PlannedTask | undefined, { kind, title, week, note }: Fields): TaskSuggestion {
  const id = initial?.id ?? `sg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  return task === undefined || !t
    ? { id, kind: "add", title, week, note }
    : kind === "remove"
      ? { id, kind: "remove", task, was: t.title, note }
      : { id, kind: "change", task, was: t.title, ...(title.trim() ? { title } : {}), ...(week !== undefined ? { week } : {}), note };
}

/** Writing one suggestion: for a task (change it or remove it), or a new one. */
function SuggestionForm({ tasks, weeks, task, initial, onSave, onCancel }: { tasks: PlannedTask[]; weeks: number; task?: number; initial?: TaskSuggestion; onSave: (s: TaskSuggestion) => void; onCancel: () => void }) {
  const t = task !== undefined ? tasks[task] : undefined;
  const { kind, setKind, title, setTitle, week, setWeek, note, setNote } = useSuggestionFields(initial);
  const [tried, setTried] = useState(false);
  const draft = suggestionOf(initial, task, t, { kind, title, week, note });
  const problem = checkSuggestion(draft, tasks);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (!problem) onSave({ ...draft, note: draft.note.trim(), ...(draft.kind !== "remove" && draft.title ? { title: draft.title.trim() } : {}) } as TaskSuggestion);
      }}
      className={`flex flex-col gap-3 ${t ? "ml-7" : ""} rounded-md border border-border bg-surface-alt p-3`}
      aria-label={t ? `Suggest a change to “${t.title}”` : "Suggest a task"}
    >
      {t && <KindPicker kind={kind} onKind={setKind} />}
      {(!t || kind === "change") && <NameAndWeek t={t} weeks={weeks} title={title} onTitle={setTitle} week={week} onWeek={setWeek} />}
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-medium text-ink-2">Why</span>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={SUGGESTION_NOTE_MAX} placeholder={t && kind === "remove" ? "e.g. Your last assistant already did this" : "e.g. I need calendar access before I can start this"} aria-label="Why" />
      </label>
      {tried && problem && (
        <p role="alert" className="text-[12.5px] text-danger">
          {problem}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" type="submit">
          {initial ? "Save suggestion" : "Add suggestion"}
        </Button>
      </div>
    </form>
  );
}

/** For a task: whether to suggest changing it or removing it. */
function KindPicker({ kind, onKind }: { kind: Kind; onKind: (kind: Kind) => void }) {
  return (
    <div role="radiogroup" aria-label="What to suggest" className="flex gap-2">
      {(["change", "remove"] as const).map((k) => (
        <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => onKind(k)} className={`h-8 rounded-full px-3 text-[13px] font-medium ${kind === k ? "bg-primary text-white" : "bg-white text-ink outline -outline-offset-1 outline-border hover:bg-surface-2"}`}>
          {k === "change" ? "Change it" : "Remove it"}
        </button>
      ))}
    </div>
  );
}

/** The name and the due week: optional changes to a task, or what a missing one is called and when it's due. */
function NameAndWeek({ t, weeks, title, onTitle, week, onWeek }: { t: PlannedTask | undefined; weeks: number; title: string; onTitle: (title: string) => void; week: number | undefined; onWeek: (week: number | undefined) => void }) {
  const weekOptions = ["No change", ...Array.from({ length: weeks }, (_, i) => weekLabel(i + 1))];
  const addOptions = ["No due week", ...Array.from({ length: weeks }, (_, i) => weekLabel(i + 1))];
  const label = (w: number | undefined, none: string) => (w ? weekLabel(w) : none);
  const pickWeek = (v: string) => {
    const n = Number(v.replace(/\D/g, ""));
    onWeek(n > 0 ? n : undefined);
  };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-medium text-ink-2">{t ? "New name (optional)" : "Task"}</span>
        <Input value={title} onChange={(e) => onTitle(e.target.value)} placeholder={t ? t.title : "What's missing?"} maxLength={200} aria-label={t ? "New name" : "Task name"} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-medium text-ink-2">Week</span>
        <Select aria-label="Week" options={t ? weekOptions : addOptions} value={label(week, t ? "No change" : "No due week")} onChange={(e) => pickWeek(e.target.value)} />
      </label>
    </div>
  );
}
