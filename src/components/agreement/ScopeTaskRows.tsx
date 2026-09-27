"use client";

import { ICONS } from "@/components/admin/icons";
import { Button } from "@/components/independent/ui";
import { Badge } from "@/components/portal/Badge";
import { STATUS_META, refOf, type WorkItem } from "@/lib/work/model";
import { applyChanges, fieldLabel, lockedStatus, resolveChanges, valueText, type ContractVersion, type ScopeChange, type ScopeTask } from "@/lib/work/scope";
import { fieldsOf, newChangeId, newTaskId, patchFrom, taskFrom, type AmendmentDraft, type TaskFields } from "./draft";
import { TaskChangeForm } from "./TaskChangeForm";

/** "Due 03 Oct 2026 · effort 3 · milestone": a task's agreed definition, in one line. */
const facts = (t: ScopeTask) => [t.due ? `Due ${valueText("due", t.due)}` : "No due date", t.effort !== undefined && `effort ${t.effort}`, t.milestone && "milestone"].filter(Boolean).join(" · ");

type RowsProps = { base: ContractVersion; items: ReadonlyMap<string, WorkItem>; draft: AmendmentDraft; lastDay?: string; check: (c: ScopeChange) => string | null };

/** What a proposed change to one task says on its row: which fields, or that it's to be removed. */
function pendingLabel(base: ContractVersion, c: ScopeChange): string {
  if (c.kind === "remove") return "To be removed";
  const [r] = resolveChanges(base, [c]);
  return r?.kind === "change" ? `Changing ${r.fields.map((d) => fieldLabel(d.field)).join(", ")}` : "Changing";
}

/** One contract task: its number and definition, where its work stands, and what's proposed for it — or why nothing can be. */
function TaskRow({ t, item, base, draft, lastDay, check }: { t: ScopeTask; item?: WorkItem } & Omit<RowsProps, "items">) {
  const change = draft.forTask(t.id);
  const locked = item ? lockedStatus(item) : "It's no longer on the work list.";
  const editing = draft.editing?.kind === "task" && draft.editing.id === t.id;
  const now = change?.kind === "change" ? applyChanges({ tasks: [t], terms: base.terms }, [change]).tasks[0] : t;
  const save = (f: TaskFields) => {
    const to = patchFrom(t, f);
    if (!Object.keys(to).length) return "Change something first — or cancel.";
    const c: ScopeChange = { id: change?.id ?? newChangeId(), kind: "change", taskId: t.id, to };
    const e = check(c);
    if (!e) draft.put(c);
    return e;
  };
  return (
    <li className="flex flex-col gap-2 border-t border-[#eeeeee] py-3 first:border-t-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className={`block text-[14px] leading-[1.35] font-medium ${change?.kind === "remove" ? "text-ink-2 line-through" : "text-ink"}`}>
            {item ? `${refOf(item)} ` : ""}
            {t.title}
          </span>
          <span className="block text-[12.5px] leading-[1.4] text-ink-2">{facts(now)}</span>
        </span>
        {item && <Badge tone={STATUS_META[item.status].tone}>{STATUS_META[item.status].label}</Badge>}
        <RowActions t={t} change={change} locked={!change ? locked : null} base={base} draft={draft} />
      </div>
      {editing && <TaskChangeForm label={`Change ${t.title}`} initial={fieldsOf(now)} lastDay={lastDay} saveLabel="Save change" onSave={save} onCancel={() => draft.setEditing(null)} />}
    </li>
  );
}

/** A task's buttons: what's proposed for it and how to take that back, or Change and Remove — or why it stays as agreed. */
function RowActions({ t, change, locked, base, draft }: { t: ScopeTask; change?: ScopeChange; locked: string | null; base: ContractVersion; draft: AmendmentDraft }) {
  if (change)
    return (
      <span className="flex items-center gap-2">
        <Badge tone={change.kind === "remove" ? "danger" : "info"}>{pendingLabel(base, change)}</Badge>
        {change.kind === "change" && (
          <Button size="sm" variant="ghost" onClick={() => draft.setEditing({ kind: "task", id: t.id })}>
            Edit<span className="sr-only"> the change to {t.title}</span>
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => draft.drop(change.id)}>
          Undo<span className="sr-only"> the change to {t.title}</span>
        </Button>
      </span>
    );
  if (locked) return <span className="max-w-64 text-[12px] leading-[1.35] text-ink-2">{locked}</span>;
  return (
    <span className="flex items-center gap-2">
      <Button size="sm" onClick={() => draft.setEditing({ kind: "task", id: t.id })}>
        Change<span className="sr-only"> {t.title}</span>
      </Button>
      <Button size="sm" variant="ghost" onClick={() => draft.put({ id: newChangeId(), kind: "remove", taskId: t.id })}>
        Remove<span className="sr-only"> {t.title}</span>
      </Button>
    </span>
  );
}

/** A task the amendment adds: its definition, with Edit and Remove — or its form while it's written. */
function AddedRow({ c, draft, lastDay, check }: { c: Extract<ScopeChange, { kind: "add" }> } & Pick<RowsProps, "draft" | "lastDay" | "check">) {
  const editing = draft.editing?.kind === "add" && draft.editing.id === c.task.id;
  const save = (f: TaskFields) => {
    const next: ScopeChange = { ...c, task: taskFrom(f, c.task.id) };
    const e = check(next);
    if (!e) draft.put(next);
    return e;
  };
  return (
    <li className="flex flex-col gap-2 border-t border-[#eeeeee] py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] leading-[1.35] font-medium text-ink">{c.task.title}</span>
          <span className="block text-[12.5px] leading-[1.4] text-ink-2">{facts(c.task)}</span>
        </span>
        <Badge tone="ok">New task</Badge>
        <Button size="sm" variant="ghost" onClick={() => draft.setEditing({ kind: "add", id: c.task.id })}>
          Edit<span className="sr-only"> {c.task.title}</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => draft.drop(c.id)}>
          Remove<span className="sr-only"> {c.task.title}</span>
        </Button>
      </div>
      {editing && <TaskChangeForm label={`Edit ${c.task.title}`} initial={fieldsOf(c.task)} lastDay={lastDay} saveLabel="Save task" onSave={save} onCancel={() => draft.setEditing(null)} />}
    </li>
  );
}

/**
 * The contract's tasks as an amendment writes to them: each agreed task with Change and Remove (or
 * why it can't change — done, or in review), the new tasks it adds, and a way to add another.
 */
export function ScopeTaskRows({ base, items, draft, lastDay, check }: RowsProps) {
  const added = draft.changes.filter((c): c is Extract<ScopeChange, { kind: "add" }> => c.kind === "add");
  const adding = draft.editing?.kind === "add" && !draft.editing.id;
  const saveNew = (f: TaskFields) => {
    const c: ScopeChange = { id: newChangeId(), kind: "add", task: taskFrom(f, newTaskId()) };
    const e = check(c);
    if (!e) draft.put(c);
    return e;
  };
  return (
    <div className="flex flex-col gap-2">
      <ul aria-label="Contract tasks" className="flex flex-col rounded-lg border border-border bg-white px-4">
        {base.tasks.map((t) => (
          <TaskRow key={t.id} t={t} item={items.get(t.id)} base={base} draft={draft} lastDay={lastDay} check={check} />
        ))}
        {added.map((c) => (
          <AddedRow key={c.id} c={c} draft={draft} lastDay={lastDay} check={check} />
        ))}
        {base.tasks.length === 0 && added.length === 0 && <li className="py-3 text-[13px] text-ink-2">No contract tasks yet.</li>}
      </ul>
      {adding ? (
        <TaskChangeForm label="Add a contract task" initial={fieldsOf(undefined)} lastDay={lastDay} saveLabel="Add task" onSave={saveNew} onCancel={() => draft.setEditing(null)} />
      ) : (
        <Button size="sm" className="self-start" onClick={() => draft.setEditing({ kind: "add" })}>
          <ICONS.add size={16} aria-hidden /> Add a contract task
        </Button>
      )}
    </div>
  );
}
