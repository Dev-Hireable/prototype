"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ICONS } from "@/components/icons";
import { KebabMenu, Textarea } from "@/components/portal/ui";
import { MenuAction } from "@/components/portal/controls";
import { Tip } from "@/components/portal/tip";
import { blankDraft, dueFromWeek, dueLabel, weekLabel } from "@/lib/demo/tasks";
import type { DraftTask, PlannedTask } from "@/lib/demo/tasks";
import { keyed } from "@/lib/portal/keys";
import { PriorityMenu, PriorityPill, StatusCircle, WeekMenu } from "./task-bits";

/**
 * The Team Builder's task plan — a trial's tasks in its job post (TB-024) — written the way Notion
 * takes a list: type a task, Enter starts the next row, Backspace on an empty row removes it, the
 * arrow keys move between rows. Each task can have a due week and a priority, and details under it:
 * what the offer carries, read-only (TB-105), and what stays as agreed once it's signed (TB-077).
 */
export function TaskPlanEditor({ rows, onChange, weeks, placeholder = "Name a task" }: { rows: DraftTask[]; onChange: (rows: DraftTask[]) => void; weeks: number; placeholder?: string }) {
  const plan = usePlanRows(rows, onChange);

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg bg-white outline -outline-offset-1 outline-border">
        {rows.map((row, i) => (
          <div key={row.key} className="border-t border-[#eeeeee] first:border-t-0">
            <div className="flex items-center gap-2 py-1 pr-2 pl-3 hover:bg-surface-alt focus-within:bg-surface-alt">
              <StatusCircle status="todo" />
              <input
                ref={plan.inputRef(row.key)}
                autoFocus={plan.focusKey === row.key}
                value={row.title}
                onChange={(e) => plan.patch(row.key, { title: e.target.value })}
                onKeyDown={(e) => plan.onKeyDown(e, i)}
                aria-label={`Task ${i + 1}`}
                placeholder={i === 0 ? placeholder : "Next task"}
                className="h-9 min-w-0 flex-1 bg-transparent text-[14px] leading-[1.2] text-ink outline-none placeholder:text-ink-2"
              />
              {row.description?.trim() && !plan.details.has(row.key) && <ShowDetails index={i} onClick={() => plan.toggleDetails(row.key)} />}
              {/* Fixed, left-aligned columns so the weeks and pills line up from row to row. */}
              <div className="flex w-24 shrink-0">
                <WeekMenu week={row.week} weeks={weeks} onChange={(week) => plan.patch(row.key, { week })} />
              </div>
              <div className="flex w-24 shrink-0">
                <PriorityMenu priority={row.priority} onChange={(p) => plan.patch(row.key, { priority: p ?? undefined })} />
              </div>
              <RowMenu index={i} open={plan.details.has(row.key)} described={!!row.description?.trim()} deletable={rows.length > 1 || !!row.title} onDetails={() => plan.toggleDetails(row.key)} onDelete={() => plan.deleteRow(row.key)} />
            </div>
            {plan.details.has(row.key) && (
              <div className="pr-3 pb-3 pl-[42px]">
                <Textarea rows={2} value={row.description ?? ""} onChange={(e) => plan.patch(row.key, { description: e.target.value })} aria-label={`Details for task ${i + 1}`} placeholder="What done looks like, links, anything to check" />
              </div>
            )}
          </div>
        ))}
        <button type="button" onClick={() => plan.insertAfter(null)} className="flex w-full items-center gap-2.5 border-t border-[#eeeeee] px-3 py-2.5 text-left text-[13.5px] leading-[1.2] text-ink-2 hover:bg-surface-alt hover:text-ink">
          <ICONS.add size={18} aria-hidden /> Add task
        </button>
      </div>
      <p className="text-[12px] leading-[1.4] text-ink-2">Enter starts the next task · Backspace on an empty one removes it · due weeks count from the start date</p>
    </div>
  );
}

/**
 * The plan's rows as a list you type into: the row a keystroke creates takes the focus as it mounts,
 * each row's keys add, remove and move between rows, and each row's details open on their own.
 */
function usePlanRows(rows: DraftTask[], onChange: (rows: DraftTask[]) => void) {
  /** The row a keystroke just created, which takes the focus when it mounts. */
  const [focusKey, setFocusKey] = useState<string | null>(null);
  /** Rows with their details open. All closed to start, so the list reads as a list; a row with details says so with its notes icon. */
  const [details, setDetails] = useState<Set<string>>(() => new Set());
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const focus = (key: string | undefined) => key && inputs.current.get(key)?.focus();

  const patch = (key: string, p: Partial<PlannedTask>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const insertAfter = (key: string | null) => {
    const row = blankDraft();
    const at = key ? rows.findIndex((r) => r.key === key) + 1 : rows.length;
    onChange([...rows.slice(0, at), row, ...rows.slice(at)]);
    setFocusKey(row.key);
  };
  const remove = (key: string) => {
    const i = rows.findIndex((r) => r.key === key);
    onChange(rows.filter((r) => r.key !== key));
    focus((rows[i - 1] ?? rows[i + 1])?.key);
  };
  const toggleDetails = (key: string) =>
    setDetails((all) => {
      const next = new Set(all);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  /** Delete task: the only row left is emptied rather than removed, so there's always one to type in. */
  const deleteRow = (key: string) => (rows.length === 1 ? onChange([blankDraft()]) : remove(key));
  /** Keeps each row's input by its key, for the arrow keys and a removal to move the focus to. */
  const inputRef = (key: string) => (el: HTMLInputElement | null) => {
    if (el) inputs.current.set(key, el);
    else inputs.current.delete(key);
  };
  /** Enter starts the next row, Backspace on an empty row removes it, the arrow keys move between rows. */
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>, i: number) => {
    const row = rows[i];
    if (e.key === "Enter") {
      e.preventDefault();
      insertAfter(row.key);
    } else if (e.key === "Backspace" && !row.title && rows.length > 1) {
      e.preventDefault();
      remove(row.key);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      focus(rows[i + 1]?.key);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focus(rows[i - 1]?.key);
    }
  };
  return { focusKey, details, patch, insertAfter, toggleDetails, deleteRow, inputRef, onKeyDown };
}

/** Beside a task whose details are closed: says it has some, and opens them. */
function ShowDetails({ index, onClick }: { index: number; onClick: () => void }) {
  return (
    <Tip label="Show details">
      <button type="button" aria-label={`Show details for task ${index + 1}`} onClick={onClick} className="flex size-7 shrink-0 items-center justify-center rounded-md text-ink-2 hover:bg-white hover:text-ink">
        <ICONS.notes size={16} aria-hidden />
      </button>
    </Tip>
  );
}

/** A task's ⋯ menu: show, hide or add its details, and delete it (not the only row while it's still empty). */
function RowMenu({ index, open, described, deletable, onDetails, onDelete }: { index: number; open: boolean; described: boolean; deletable: boolean; onDetails: () => void; onDelete: () => void }) {
  return (
    <KebabMenu label={`Options for task ${index + 1}`} icon="horizontal" menuWidth={184} buttonClassName="!size-7">
      <MenuAction onClick={onDetails} icon={<ICONS.notes size={18} aria-hidden />}>
        {open ? "Hide details" : described ? "Show details" : "Add details"}
      </MenuAction>
      <MenuAction destructive disabled={!deletable} onClick={onDelete} icon={<ICONS.trash size={18} aria-hidden />}>
        Delete task
      </MenuAction>
    </KebabMenu>
  );
}

/**
 * A planned task list, read-only — the job page, the proposal and its review, the offer. Given the
 * start date, each due week also shows the date it becomes.
 */
export function TaskPlanList({ tasks, start, lastDay, empty = "No tasks yet." }: { tasks: PlannedTask[]; start?: string; lastDay?: string; empty?: string }) {
  if (!tasks.length) return <p className="text-[13px] leading-[1.4] text-ink-2">{empty}</p>;
  return (
    <ol className="overflow-hidden rounded-lg bg-white outline -outline-offset-1 outline-border">
      {keyed(tasks, (t) => t.title).map(({ item: t, key }) => {
        const due = start ? dueFromWeek(start, t.week, lastDay) : undefined;
        return (
          <li key={key} className="flex flex-col gap-1 border-t border-[#eeeeee] px-3 py-2.5 first:border-t-0">
            <div className="flex items-center gap-2.5">
              <StatusCircle status="todo" />
              <span className="min-w-0 flex-1 text-[14px] leading-[1.35] text-ink">{t.title}</span>
              <span className={`${start ? "w-32" : "w-16"} shrink-0 text-[12.5px] leading-[1.2] whitespace-nowrap text-ink-2`}>
                {t.week && weekLabel(t.week)}
                {t.week && due ? ` · ${dueLabel(due)}` : ""}
              </span>
              <span className="flex w-20 shrink-0">{t.priority && <PriorityPill priority={t.priority} />}</span>
            </div>
            {t.description && <p className="pl-7 text-[13px] leading-[1.45] whitespace-pre-line text-ink-2">{t.description}</p>}
          </li>
        );
      })}
    </ol>
  );
}
