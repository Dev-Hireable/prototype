"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { ICONS } from "@/components/admin/icons";
import { ICON_BUTTON } from "@/components/portal/styles";
import { StatusCircle } from "@/components/portal/tasks/task-bits";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { layoutWeek, monthWeeks, moveToDay, spanOf, unscheduled } from "@/lib/work/calendar";
import { addMonths, dayOf, isoOf, isWeekend, longLabel, MONTH_LONG, monthKey, parseMonth, partsOf, shortLabel, WEEKDAY_SHORT, type Day } from "@/lib/work/dates";
import { isArchived, refOf, STATUS_META, type WorkItem } from "@/lib/work/model";
import { capsFor } from "@/lib/work/permissions";
import type { WorkQuery } from "@/lib/work/query";
import { checkDates } from "@/lib/work/validate";
import { useWorkspace } from "./context";
import { QuickAdd } from "./QuickAdd";

/**
 * The Calendar: a month, Monday first. An item with a start and a due spans those days (split at
 * week ends, marked where it carries on); one with only a due date sits on it; only a start, on
 * that day as "Starts"; a milestone on its date. Past three lanes a day says "+k more". Items with
 * no dates wait in Unscheduled beside the month. Dragging moves an item — keeping its length — onto
 * another day, or schedules an unscheduled one; days a rule rules out don't take it. The keyboard
 * reaches every item as a button, and its dates are changed in its panel.
 */

const LANES = 3;

const countLabel = (n: number) => (n ? `, ${n} ${n === 1 ? "item" : "items"}` : "");
const LANE_H = 24;
const HEAD_H = 28;

const BAR_TONE: Record<WorkItem["status"], string> = {
  todo: "bg-[#eeeeee] text-ink",
  doing: "bg-[#dff3fd] text-[#004675]",
  review: "bg-[#fff3cc] text-[#6b5208]",
  done: "bg-[#e3f6ea] text-[#1b6b3a]",
};

export function monthOf(query: WorkQuery, today: Day) {
  return parseMonth(query.month) ?? (({ y, m }) => ({ y, m }))(partsOf(today));
}

/**
 * The month and how to move it, as the calendar's own header bar — inside the frame, above the
 * weekdays, the way a calendar reads — rather than out in the workspace toolbar.
 */
function CalendarHeader({ query, setQuery, today, className = "" }: { query: WorkQuery; setQuery: (p: Partial<WorkQuery>) => void; today: Day; className?: string }) {
  const { y, m } = monthOf(query, today);
  const go = (n: number) => {
    const next = addMonths(y, m, n);
    setQuery({ month: monthKey(next.y, next.m) });
  };
  const here = partsOf(today);
  const isThis = y === here.y && m === here.m;
  const step = "flex size-8 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary";
  return (
    <div role="group" aria-label="Month" className={`flex shrink-0 items-center gap-1 ${className}`}>
      <h2 className="mr-auto text-[15px] leading-[1.3] font-semibold text-ink" aria-live="polite">
        {MONTH_LONG[m - 1]} {y}
      </h2>
      <button type="button" disabled={isThis} onClick={() => setQuery({ month: null })} className="mr-1 h-8 rounded-lg border border-border bg-white px-3 text-[13px] font-medium text-ink hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary disabled:text-ink-2 disabled:hover:bg-white">
        Today
      </button>
      <button type="button" onClick={() => go(-1)} aria-label="Previous month" className={step}>
        <ICONS.chevronLeft size={20} aria-hidden />
      </button>
      <button type="button" onClick={() => go(1)} aria-label="Next month" className={step}>
        <ICONS.chevronRight size={20} aria-hidden />
      </button>
    </div>
  );
}

export function CalendarView({ items, query, setQuery, narrow }: { items: readonly WorkItem[]; query: WorkQuery; setQuery: (p: Partial<WorkQuery>) => void; narrow: boolean }) {
  const env = useWorkspace();
  const { today, actions, canCreate, openTask, actor, access } = env;
  const { y, m } = monthOf(query, today);
  const weeks = useMemo(() => monthWeeks(y, m), [y, m]);
  const layouts = useMemo(() => weeks.map((w) => layoutWeek(w, items, LANES)), [weeks, items]);
  const loose = useMemo(() => unscheduled(items), [items]);
  const [drag, setDrag] = useState<{ id: string; offset: number } | null>(null);
  const [over, setOver] = useState<Day | null>(null);
  const [adding, setAdding] = useState<Day | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const dragged = drag ? items.find((t) => t.id === drag.id) : undefined;
  const scheduled = items.length - loose.length;
  const grid = useRef<HTMLDivElement>(null);
  // Open on the week with today in it (it's often below the fold on a laptop), once per month shown.
  const shownMonth = `${y}-${m}`;
  const scrolledFor = useRef<string | null>(null);
  useEffect(() => {
    if (scrolledFor.current === shownMonth) return;
    scrolledFor.current = shownMonth;
    const row = grid.current?.querySelector<HTMLElement>(`[data-day="${isoOf(today)}"]`)?.parentElement;
    const box = grid.current;
    if (row && box) box.scrollTop = Math.max(0, row.offsetTop - 36);
  });

  /** The dates the dragged item would get on `day`, or why it can't go there. */
  const landing = (day: Day) => {
    if (!dragged || !drag) return null;
    const next = moveToDay(dragged, day - drag.offset);
    const bad = checkDates({ start: next.start, due: next.due, type: dragged.type }, dragged, { today, lastDay: dayOf(access.lastDay) });
    return { next, bad };
  };

  const start = (t: WorkItem, e: DragEvent, grabbed: Day) => {
    const span = spanOf(t);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", t.id);
    const offset = span ? Math.max(0, Math.min(grabbed - span.from, span.to - span.from)) : 0;
    setDrag({ id: t.id, offset });
  };
  const end = () => {
    setDrag(null);
    setOver(null);
  };
  const drop = (day: Day) => {
    const t = dragged;
    const l = landing(day);
    end();
    if (!t || !l) return;
    if (l.bad) return setHint(l.bad.message);
    if (l.next.start === t.start && l.next.due === t.due) return;
    void actions.patch(t, { start: l.next.start ?? null, due: l.next.due ?? null }, { announce: `${refOf(t)} moved to ${longLabel(dayOf(l.next.due ?? l.next.start) as Day)}` });
  };

  const header = (className: string) => <CalendarHeader query={query} setQuery={setQuery} today={today} className={className} />;
  if (narrow) return <Agenda items={items} loose={loose} y={y} m={m} header={header("")} />;

  return (
    <div className="flex min-h-0 flex-1 gap-3 px-[var(--ws-gutter,1rem)] pt-3 pb-4">
      {/* Bordered frame, scroller inside: the day cells are positioned, so they painted over an outline on the scroller. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-white">
        {header("border-b border-border px-3 py-2")}
        <div ref={grid} className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-auto" data-testid="calendar">
          {scheduled === 0 && items.length > 0 && (
            <p className="border-b border-border bg-[#fafafa] px-4 py-2.5 text-[13px] leading-[1.4] text-ink-2">Nothing here has dates yet — set a start or due date and it shows on the calendar. Everything else is under Unscheduled.</p>
          )}
          {hint && (
            <p role="alert" className="flex items-center justify-between gap-2 border-b border-border bg-[#fcf2f2] px-4 py-2 text-[13px] text-[#8f1d1d]">
              {hint}
              <button type="button" onClick={() => setHint(null)} aria-label="Dismiss" className="rounded p-1 hover:bg-white/70">
                <ICONS.close size={14} aria-hidden />
              </button>
            </p>
          )}
          <div role="grid" aria-label={`${MONTH_LONG[m - 1]} ${y}`} className="flex min-w-[720px] flex-1 flex-col">
            <div role="row" className="sticky top-0 z-20 grid grid-cols-7 border-b border-border bg-surface-2">
              {WEEKDAY_SHORT.map((d) => (
                <span key={d} role="columnheader" className="px-2 py-1.5 text-[12px] font-medium text-ink-2">
                  {d}
                </span>
              ))}
            </div>
            {layouts.map((layout, w) => (
              <div key={w} role="row" className="relative grid flex-1 grid-cols-7 border-b border-[#eeeeee] last:border-b-0" style={{ minHeight: HEAD_H + LANES * LANE_H + 26 }}>
                {layout.days.map((day, col) => {
                  const inMonth = partsOf(day).m === m;
                  const isToday = day === today;
                  const hidden = layout.hidden.get(day) ?? [];
                  const target = !!drag && over === day;
                  const l = drag && over === day ? landing(day) : null;
                  return (
                    <div
                      key={day}
                      role="gridcell"
                      aria-label={`${longLabel(day)}${isToday ? ", today" : ""}${countLabel(layout.all.get(day)?.length ?? 0)}`}
                      aria-current={isToday ? "date" : undefined}
                      data-day={isoOf(day)}
                      onDragOver={(e) => {
                        if (!drag) return;
                        const ok = !landing(day)?.bad;
                        if (over !== day) setOver(day);
                        if (!ok) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver((o) => (o === day ? null : o));
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        drop(day);
                      }}
                      className={`group/day relative flex flex-col border-r border-[#eeeeee] last:border-r-0 ${isWeekend(day) ? "bg-[#fafafa]" : "bg-white"} ${target ? (l?.bad ? "bg-[#fcf2f2]" : "bg-accent-bg") : ""}`}
                      style={{ gridColumn: col + 1, gridRow: 1 }}
                    >
                      <span className="flex h-7 items-center justify-between px-1.5">
                        <span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12.5px] tabular-nums ${isToday ? "bg-primary font-semibold text-white" : inMonth ? "text-ink" : "text-[#b0b0b0]"}`}>
                          {partsOf(day).d === 1 ? shortLabel(day) : partsOf(day).d}
                          {isToday && <span className="sr-only"> (today)</span>}
                        </span>
                        {canCreate && !query.archived && adding !== day && !checkDates({ due: isoOf(day), type: "task" }, null, { today, lastDay: dayOf(access.lastDay) }) && (
                          <span className="opacity-0 group-hover/day:opacity-100 focus-within:opacity-100">
                            <button type="button" onClick={() => setAdding(day)} aria-label={`Add a task due ${longLabel(day)}`} className={`${ICON_BUTTON} size-6`}>
                              <ICONS.add size={16} aria-hidden />
                            </button>
                          </span>
                        )}
                      </span>
                      {target && l?.bad && <span className="px-1.5 text-[11px] leading-[1.3] text-[#8f1d1d]">{l.bad.message}</span>}
                      {hidden.length > 0 && (
                        <span className="absolute left-1 z-10" style={{ top: HEAD_H + LANES * LANE_H }}>
                          <MorePopover day={day} items={layout.all.get(day) ?? []} count={hidden.length} />
                        </span>
                      )}
                      {adding === day && (
                        <div className="absolute inset-x-1 top-7 z-30">
                          <QuickAdd
                            variant="cell"
                            startOpen
                            placeholder={`Due ${shortLabel(day, today)} — name it`}
                            onClose={() => setAdding(null)}
                            onAdd={(title) => actions.create({ title, due: isoOf(day) }, { announce: `Added “${title}”, due ${longLabel(day)}` })}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                {layout.segments.map((s) => {
                  const t = s.item;
                  const can = capsFor(t, actor, access).plan && !isArchived(t);
                  const label = `${refOf(t)} ${t.title}, ${STATUS_META[t.status].label}, ${s.kind === "range" ? `${shortLabel(spanOf(t)?.from as Day)} to ${shortLabel(spanOf(t)?.to as Day)}` : s.kind === "start" ? `starts ${shortLabel(spanOf(t)?.from as Day)}` : `due ${shortLabel(spanOf(t)?.to as Day)}`}`;
                  return (
                    <button
                      key={`${t.id}-${w}`}
                      type="button"
                      data-item-id={t.id}
                      data-status={t.status}
                      data-start={t.start ?? ""}
                      data-due={t.due ?? ""}
                      draggable={can}
                      onDragStart={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const dayWidth = rect.width / s.cols;
                        const grabbed = layout.days[s.col] + Math.floor((e.clientX - rect.left) / dayWidth);
                        start(t, e, grabbed);
                      }}
                      onDragEnd={end}
                      onClick={() => openTask(t.id)}
                      aria-label={label}
                      className={`absolute z-10 flex items-center gap-1 overflow-hidden px-1.5 text-left text-[12px] leading-none font-medium whitespace-nowrap ${BAR_TONE[t.status]} ${s.before ? "rounded-l-none" : "rounded-l"} ${s.after ? "rounded-r-none" : "rounded-r"} hover:brightness-95 focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-primary ${drag?.id === t.id ? "opacity-40" : ""} ${can ? "cursor-grab active:cursor-grabbing" : ""}`}
                      style={{ left: `calc(${(s.col / 7) * 100}% + 2px)`, width: `calc(${(s.cols / 7) * 100}% - 4px)`, top: HEAD_H + s.lane * LANE_H, height: LANE_H - 3 }}
                    >
                      {s.kind === "milestone" ? <ICONS.typeMilestone size={13} aria-hidden className="shrink-0" /> : <StatusCircle status={t.status} size={12} />}
                      {s.before && <span aria-hidden>…</span>}
                      {s.kind === "start" && <span className="font-normal">Starts</span>}
                      <span className="truncate">{t.title}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <aside className="flex w-64 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-[#fafafa]" aria-label="Unscheduled">
        <h3 className="flex items-center justify-between border-b border-border px-3 py-2.5 text-[13.5px] font-semibold text-ink">
          Unscheduled
          <span className="rounded bg-surface-2 px-1.5 text-[12px] font-medium text-ink-2 tabular-nums">{loose.length}</span>
        </h3>
        <p className="px-3 pt-2 text-[12px] leading-[1.4] text-ink-2">{loose.length ? "No start or due date yet. Drag one onto a day to set its due date." : "Everything here has a date."}</p>
        <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2">
          {loose.map((t) => {
            const can = capsFor(t, actor, access).plan && !isArchived(t);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  data-item-id={t.id}
                  draggable={can}
                  onDragStart={(e) => start(t, e, 0)}
                  onDragEnd={end}
                  onClick={() => openTask(t.id, "dates")}
                  className={`flex w-full items-center gap-2 rounded-md bg-white px-2 py-1.5 text-left text-[13px] outline -outline-offset-1 outline-border hover:outline-[#a6a6a6] focus-visible:outline-2 focus-visible:outline-primary ${can ? "cursor-grab" : ""}`}
                >
                  <StatusCircle status={t.status} size={14} />
                  <span className="shrink-0 text-[12px] text-ink-2 tabular-nums">{refOf(t)}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{t.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}

function MorePopover({ day, items, count }: { day: Day; items: WorkItem[]; count: number }) {
  const { openTask } = useWorkspace();
  return (
    <Popover>
      <PopoverTrigger className="rounded px-1 text-[12px] font-medium text-primary hover:bg-accent-bg focus-visible:outline-2 focus-visible:outline-primary" aria-label={`${count} more on ${longLabel(day)}`}>
        +{count} more
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-72 flex-col gap-1 p-2">
        <p className="px-1 pb-1 text-[12.5px] font-semibold text-ink">{longLabel(day)}</p>
        {items.map((t) => (
          <button key={t.id} type="button" onClick={() => openTask(t.id)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none">
            <StatusCircle status={t.status} size={14} />
            <span className="text-[12px] text-ink-2 tabular-nums">{refOf(t)}</span>
            <span className="min-w-0 flex-1 truncate text-ink">{t.title}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/** A phone-width month: the days that have something on them, as a list, then what's unscheduled. */
function Agenda({ items, loose, y, m, header }: { items: readonly WorkItem[]; loose: WorkItem[]; y: number; m: number; header: ReactNode }) {
  const { openTask, today } = useWorkspace();
  const days = useMemo(() => {
    const byDay = new Map<Day, WorkItem[]>();
    for (const w of monthWeeks(y, m))
      for (const [day, list] of layoutWeek(w, items, 99).all) if (partsOf(day).m === m) byDay.set(day, list);
    return [...byDay.entries()].sort((a, b) => a[0] - b[0]);
  }, [items, y, m]);
  const row = (t: WorkItem) => (
    <li key={t.id}>
      <button type="button" data-item-id={t.id} onClick={() => openTask(t.id)} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[14px] hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary">
        <StatusCircle status={t.status} size={14} />
        <span className="min-w-0 flex-1 truncate text-ink">{t.title}</span>
      </button>
    </li>
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-[var(--ws-gutter,1rem)] pt-3 pb-4" data-testid="calendar">
      {header}
      {days.length === 0 && <p className="text-[13px] text-ink-2">Nothing is scheduled in {MONTH_LONG[m - 1]}.</p>}
      {days.map(([day, list]) => (
        <section key={day} aria-label={longLabel(day)}>
          <h3 className={`text-[13px] font-semibold ${day === today ? "text-primary" : "text-ink"}`}>
            {longLabel(day)}
            {day === today && " · Today"}
          </h3>
          <ul>{list.map(row)}</ul>
        </section>
      ))}
      {loose.length > 0 && (
        <section aria-label="Unscheduled">
          <h3 className="text-[13px] font-semibold text-ink">Unscheduled</h3>
          <ul>{loose.map(row)}</ul>
        </section>
      )}
    </div>
  );
}
