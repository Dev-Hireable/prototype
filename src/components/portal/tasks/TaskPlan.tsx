"use client";

import { useRef, useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { KebabMenu, Textarea } from "@/components/independent/ui";
import { MenuAction } from "@/components/portal/controls";
import { Tip } from "@/components/portal/Tip";
import { dueFromWeek, dueLabel, taskId, weekLabel } from "@/lib/demo/tasks";
import type { PlannedTask } from "@/lib/demo/tasks";
import { PriorityMenu, PriorityPill, StatusCircle, WeekMenu } from "./task-bits";

/** A row being written in a task plan: a planned task with a key the list tracks it by. */
export type DraftTask = PlannedTask & { key: string };

export const blankDraft = (): DraftTask => ({ key: taskId("d"), title: "" });
export const toDrafts = (tasks: PlannedTask[]): DraftTask[] => tasks.map((t) => ({ ...t, key: taskId("d") }));

/** What the plan keeps: rows with a real title (two characters or more), trimmed. */
export const fromDrafts = (rows: DraftTask[]): PlannedTask[] =>
  rows.filter((r) => r.title.trim().length > 1).map((r) => ({ title: r.title.trim(), description: r.description?.trim() || undefined, priority: r.priority, week: r.week }));

/**
 * The Team Builder's task plan — a trial's tasks in its job post (TB-024), the tasks on an offer
 * (TB-105) — written the way Notion takes a list: type a task, Enter starts the next row, Backspace
 * on an empty row removes it, the arrow keys move between rows. Each task can have a due week and a
 * priority, and details under it.
 */
export function TaskPlanEditor({ rows, onChange, weeks, placeholder = "Name a task" }: { rows: DraftTask[]; onChange: (rows: DraftTask[]) => void; weeks: number; placeholder?: string }) {
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

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg bg-white outline -outline-offset-1 outline-border">
        {rows.map((row, i) => (
          <div key={row.key} className="border-t border-[#eeeeee] first:border-t-0">
            <div className="flex items-center gap-2 py-1 pr-2 pl-3 hover:bg-surface-alt focus-within:bg-surface-alt">
              <StatusCircle status="todo" />
              <input
                ref={(el) => {
                  if (el) inputs.current.set(row.key, el);
                  else inputs.current.delete(row.key);
                }}
                autoFocus={focusKey === row.key}
                value={row.title}
                onChange={(e) => patch(row.key, { title: e.target.value })}
                onKeyDown={(e) => {
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
                }}
                aria-label={`Task ${i + 1}`}
                placeholder={i === 0 ? placeholder : "Next task"}
                className="h-9 min-w-0 flex-1 bg-transparent text-[14px] leading-[1.2] text-ink outline-none placeholder:text-ink-2"
              />
              {row.description?.trim() && !details.has(row.key) && (
                <Tip label="Show details">
                  <button type="button" aria-label={`Show details for task ${i + 1}`} onClick={() => toggleDetails(row.key)} className="flex size-7 shrink-0 items-center justify-center rounded-md text-ink-2 hover:bg-white hover:text-ink">
                    <ICONS.notes size={16} aria-hidden />
                  </button>
                </Tip>
              )}
              {/* Fixed, left-aligned columns so the weeks and pills line up from row to row. */}
              <div className="flex w-24 shrink-0">
                <WeekMenu week={row.week} weeks={weeks} onChange={(week) => patch(row.key, { week })} />
              </div>
              <div className="flex w-24 shrink-0">
                <PriorityMenu priority={row.priority} onChange={(p) => patch(row.key, { priority: p ?? undefined })} />
              </div>
              <KebabMenu label={`Options for task ${i + 1}`} icon="horizontal" menuWidth={184} buttonClassName="!size-7">
                <MenuAction onClick={() => toggleDetails(row.key)} icon={<ICONS.notes size={18} aria-hidden />}>
                  {details.has(row.key) ? "Hide details" : row.description?.trim() ? "Show details" : "Add details"}
                </MenuAction>
                <MenuAction destructive disabled={rows.length === 1 && !row.title} onClick={() => (rows.length === 1 ? onChange([blankDraft()]) : remove(row.key))} icon={<ICONS.trash size={18} aria-hidden />}>
                  Delete task
                </MenuAction>
              </KebabMenu>
            </div>
            {details.has(row.key) && (
              <div className="pr-3 pb-3 pl-[42px]">
                <Textarea rows={2} value={row.description ?? ""} onChange={(e) => patch(row.key, { description: e.target.value })} aria-label={`Details for task ${i + 1}`} placeholder="What done looks like, links, anything to check" />
              </div>
            )}
          </div>
        ))}
        <button type="button" onClick={() => insertAfter(null)} className="flex w-full items-center gap-2.5 border-t border-[#eeeeee] px-3 py-2.5 text-left text-[13.5px] leading-[1.2] text-ink-2 hover:bg-surface-alt hover:text-ink">
          <ICONS.add size={18} aria-hidden /> Add task
        </button>
      </div>
      <p className="text-[12px] leading-[1.4] text-ink-2">Enter starts the next task · Backspace on an empty one removes it · due weeks count from the start date</p>
    </div>
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
      {tasks.map((t, i) => {
        const due = start ? dueFromWeek(start, t.week, lastDay) : undefined;
        return (
          <li key={`${t.title}-${i}`} className="flex flex-col gap-1 border-t border-[#eeeeee] px-3 py-2.5 first:border-t-0">
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
