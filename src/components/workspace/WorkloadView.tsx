"use client";

import { useMemo } from "react";
import { ICONS } from "@/components/admin/icons";
import { Checkbox } from "@/components/independent/ui";
import { StatusCircle } from "@/components/portal/tasks/task-bits";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, dayOf, isoOf, isWeekend, longLabel, weekStartOf, partsOf, shortLabel, WEEKDAY_SHORT, weekdayOf, type Day } from "@/lib/work/dates";
import { refOf, type WorkItem } from "@/lib/work/model";
import type { WorkQuery } from "@/lib/work/query";
import { formatAmount, workload, WORKLOAD_RULE, type Bucket, type WorkloadRow } from "@/lib/work/workload";
import { useWorkspace } from "./context";
import { AssigneeChip } from "./meta";

/**
 * Workload: for each person on the contract (and what's unassigned), how much work falls on each
 * day of the window — in Effort, or as a count of items in flight. Effort is a relative estimate,
 * not hours, and nobody's capacity is recorded, so the grid compares people and days with each
 * other and never calls anyone overloaded. How an item's effort is spread is written out beside
 * the grid (WORKLOAD_RULE), and every cell opens the items that make it up.
 */
export function WorkloadView({ items, query, setQuery }: { items: readonly WorkItem[]; query: WorkQuery; setQuery: (p: Partial<WorkQuery>) => void }) {
  const { today } = useWorkspace();
  const from = weekStartOf(dayOf(query.week) ?? today);
  const days = query.span * 7;
  const result = useMemo(() => workload(items, { from, days, metric: query.metric, includeDone: query.done }), [items, from, days, query.metric, query.done]);
  const max = Math.max(0, ...result.rows.flatMap((r) => r.cells.map((c) => c.value)));
  const unit = query.metric === "effort" ? "effort" : "items";
  const last = addDays(from, days - 1);
  const grid: WorkloadGrid = { days: result.days, from, last, max, unit, metric: query.metric };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-[var(--ws-gutter,1rem)] pt-3 pb-4" data-testid="workload">
      <WindowBar query={query} setQuery={setQuery} from={from} last={last} />

      <details className="rounded-lg bg-[#f5f9fc] px-3 py-2 text-[12.5px] leading-[1.5] text-[#1d3a52] open:pb-3">
        <summary className="flex cursor-pointer items-center gap-1.5 font-medium">
          <ICONS.info size={15} aria-hidden /> How this is worked out — effort is relative, so there's no capacity line
        </summary>
        <p className="mt-1.5">{WORKLOAD_RULE}</p>
      </details>

      {/* Bordered frame, scroller inside (an outline on the scroller sat under its pinned cells). As
          tall as its three rows, not the whole pane. Positioned, like the List's, so what its cells
          place absolutely (sr-only text) stays inside it instead of stretching the page. */}
      <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-white">
        <div className="relative min-h-0 overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-[13px]" aria-label={`Workload by person, ${shortLabel(from)} to ${shortLabel(last)}, in ${unit}`}>
            <WorkloadHead days={result.days} from={from} />
            <tbody>
              {result.rows.map((r) => (
                <PersonRow key={r.key} row={r} grid={grid} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** What every row is drawn against: the window's days, its first and last, the busiest cell on screen, and the measure. */
type WorkloadGrid = { days: Day[]; from: Day; last: Day; max: number; unit: string; metric: WorkQuery["metric"] };

/** Above the grid: the weeks showing and how to move them, how many, what's measured, and whether done work counts. */
function WindowBar({ query, setQuery, from, last }: { query: WorkQuery; setQuery: (p: Partial<WorkQuery>) => void; from: Day; last: Day }) {
  const { today } = useWorkspace();
  const shift = (weeks: number) => setQuery({ week: isoOf(addDays(from, weeks * 7)) });
  const isThisWeek = from === weekStartOf(today);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1" role="group" aria-label="Window">
        <button type="button" onClick={() => shift(-query.span)} aria-label="Earlier" className="flex size-9 items-center justify-center rounded-lg border border-border bg-white hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary">
          <ICONS.chevronLeft size={18} aria-hidden />
        </button>
        <span className="min-w-[150px] text-center text-[13.5px] font-semibold text-ink" aria-live="polite">
          {shortLabel(from, today)} – {shortLabel(last, today)}
        </span>
        <button type="button" onClick={() => shift(query.span)} aria-label="Later" className="flex size-9 items-center justify-center rounded-lg border border-border bg-white hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary">
          <ICONS.chevronRight size={18} aria-hidden />
        </button>
        <button type="button" disabled={isThisWeek} onClick={() => setQuery({ week: null })} className="h-9 rounded-lg border border-border bg-white px-3 text-[13px] font-medium text-ink hover:bg-surface-alt disabled:text-ink-2 disabled:hover:bg-white">
          This week
        </button>
      </span>
      <Segmented label="Weeks shown" value={String(query.span)} options={[["2", "2 weeks"], ["4", "4 weeks"]]} onChange={(v) => setQuery({ span: v === "4" ? 4 : 2 })} />
      <Segmented label="Measure" value={query.metric} options={[["effort", "Effort"], ["count", "Items"]]} onChange={(v) => setQuery({ metric: v as WorkQuery["metric"] })} />
      <Checkbox checked={query.done} onChange={(v) => setQuery({ done: v })} className="text-[13px]">
        Include done
      </Checkbox>
    </div>
  );
}

/** The grid's pinned header: Person, Before, a column per day — today's marked, the 1st and the window's first day with their month — then After, In window and No dates. */
function WorkloadHead({ days, from }: { days: Day[]; from: Day }) {
  const { today } = useWorkspace();
  return (
    <thead>
      <tr>
        <th scope="col" className="sticky top-0 left-0 z-30 w-[160px] min-w-[160px] border-b border-border bg-surface-2 px-3 py-2 text-left text-[12.5px] font-medium text-ink-2">
          Person
        </th>
        <th scope="col" className="sticky top-0 z-20 min-w-[56px] border-b border-l border-border bg-surface-2 px-2 py-2 text-center text-[12px] font-medium text-ink-2">
          Before
        </th>
        {days.map((d) => (
          <th key={d} scope="col" aria-current={d === today ? "date" : undefined} className={`sticky top-0 z-20 min-w-[42px] border-b border-border px-1 py-1.5 text-center text-[11.5px] font-medium ${isWeekend(d) ? "bg-[#ececec] text-ink-2" : "bg-surface-2 text-ink-2"} ${d === today ? "!text-primary" : ""} ${weekdayOf(d) === 0 ? "border-l border-[#d6d6d6]" : ""}`}>
            <span className="block">{WEEKDAY_SHORT[weekdayOf(d)]}</span>
            <span className="block tabular-nums">{partsOf(d).d === 1 || d === from ? shortLabel(d, today) : partsOf(d).d}</span>
            {d === today && <span className="sr-only">(today)</span>}
          </th>
        ))}
        <th scope="col" className="sticky top-0 z-20 min-w-[56px] border-b border-l border-border bg-surface-2 px-2 py-2 text-center text-[12px] font-medium text-ink-2">
          After
        </th>
        <th scope="col" className="sticky top-0 z-20 min-w-[72px] border-b border-l border-border bg-surface-2 px-2 py-2 text-center text-[12px] font-medium text-ink-2">
          In window
        </th>
        <th scope="col" className="sticky top-0 z-20 min-w-[84px] border-b border-l border-border bg-surface-2 px-2 py-2 text-center text-[12px] font-medium text-ink-2">
          No dates
        </th>
      </tr>
    </thead>
  );
}

/** One person's row: who (and, measuring effort, how much has no estimate), before the window, each day, after it, the total in the window, and what has no dates. */
function PersonRow({ row: r, grid }: { row: WorkloadRow; grid: WorkloadGrid }) {
  const { today, people, assigneeLabel } = useWorkspace();
  const { days, from, last, max, unit, metric } = grid;
  return (
    <tr data-row={r.key}>
      <th scope="row" className="sticky left-0 z-10 border-b border-[#eeeeee] bg-white px-3 py-2 text-left font-normal">
        <AssigneeChip assignee={r.key === "none" ? null : r.key} people={people} />
        {metric === "effort" && r.unestimated.length > 0 && (
          <ItemsPopover title={`${assigneeLabel(r.key)} · no effort estimate`} items={r.unestimated.map((item) => ({ item, value: 0 }))} showValues={false}>
            <span className="mt-0.5 block text-left text-[11.5px] text-ink-2 underline decoration-dotted underline-offset-2">
              {r.unestimated.length} without an estimate
            </span>
          </ItemsPopover>
        )}
      </th>
      <Cell bucket={r.before} max={max} label={`${assigneeLabel(r.key)}, before ${shortLabel(from)}`} edge />
      {days.map((day, i) => (
        <Cell key={day} bucket={r.cells[i]} max={max} weekend={isWeekend(day)} today={day === today} weekStart={weekdayOf(day) === 0} label={`${assigneeLabel(r.key)}, ${longLabel(day)}`} day={day} />
      ))}
      <Cell bucket={r.after} max={max} label={`${assigneeLabel(r.key)}, after ${shortLabel(last)}`} edge />
      <td className="border-b border-l border-[#eeeeee] px-2 text-center font-semibold text-ink tabular-nums" aria-label={`${assigneeLabel(r.key)} total in window: ${formatAmount(r.total)} ${unit}`}>
        {formatAmount(r.total)}
      </td>
      <NoDatesCell row={r} metric={metric} />
    </tr>
  );
}

/** A person's work with no dates: how many items, opening the list — or a dash. */
function NoDatesCell({ row: r, metric }: { row: WorkloadRow; metric: WorkQuery["metric"] }) {
  const { assigneeLabel } = useWorkspace();
  return (
    <td className="border-b border-l border-[#eeeeee] p-1 text-center">
      {r.unscheduled.length ? (
        <ItemsPopover title={`${assigneeLabel(r.key)} · no dates`} items={r.unscheduled.map((item) => ({ item, value: metric === "count" ? 1 : (item.effort ?? 0) }))} showValues={metric === "effort"}>
          <span className="inline-flex h-8 min-w-12 items-center justify-center rounded-md px-2 text-[12.5px] text-ink-2 hover:bg-surface-2" aria-label={`${r.unscheduled.length} ${r.unscheduled.length === 1 ? "item" : "items"} with no dates for ${assigneeLabel(r.key)}`}>
            {r.unscheduled.length} {r.unscheduled.length === 1 ? "item" : "items"}
          </span>
        </ItemsPopover>
      ) : (
        <span className="text-ink-2">—</span>
      )}
    </td>
  );
}

function Segmented({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <span role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-surface-2 p-[3px]">
      {options.map(([v, text]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)} className={`h-7 rounded-md px-3 text-[13px] font-medium ${value === v ? "bg-white text-ink shadow-sm" : "text-ink-2 hover:text-ink"}`}>
          {text}
        </button>
      ))}
    </span>
  );
}

/**
 * One person-day: the amount written out, on a tint that deepens with it relative to the busiest
 * cell on screen — a comparison, not a limit. Opens the items that make it up.
 */
function Cell({ bucket, max, label, weekend, today, weekStart, edge, day }: { bucket: Bucket; max: number; label: string; weekend?: boolean; today?: boolean; weekStart?: boolean; edge?: boolean; day?: Day }) {
  const { value, items } = bucket;
  const alpha = max > 0 && value > 0 ? 0.08 + 0.42 * (value / max) : 0;
  const base = `border-b border-[#eeeeee] p-1 text-center ${weekend ? "bg-[#fafafa]" : ""} ${weekStart || edge ? "border-l border-l-[#d6d6d6]" : ""} ${today ? "bg-[#f1f8fd]" : ""}`;
  if (!value) return <td className={base} aria-label={`${label}: nothing`} data-day={day !== undefined ? isoOf(day) : undefined} data-value="0" />;
  return (
    <td className={base} data-day={day !== undefined ? isoOf(day) : undefined} data-value={formatAmount(value)}>
      <ItemsPopover title={label} items={items} showValues>
        <span className="flex h-8 min-w-11 items-center justify-center rounded-md text-[12.5px] font-semibold text-[#0b3553] tabular-nums outline-offset-1 hover:outline hover:outline-primary" style={{ background: `rgba(0, 122, 204, ${alpha})` }} aria-label={`${label}: ${formatAmount(value)}. ${items.length} ${items.length === 1 ? "item" : "items"}`}>
          {formatAmount(value)}
        </span>
      </ItemsPopover>
    </td>
  );
}

function ItemsPopover({ title, items, showValues, children }: { title: string; items: { item: WorkItem; value: number }[]; showValues: boolean; children: React.ReactNode }) {
  const { openTask } = useWorkspace();
  return (
    <Popover>
      <PopoverTrigger className="rounded-md focus-visible:outline-2 focus-visible:outline-primary">{children}</PopoverTrigger>
      <PopoverContent align="start" className="flex w-80 flex-col gap-1 p-2">
        <p className="px-1 pb-1 text-[12.5px] font-semibold text-ink">{title}</p>
        {items.map(({ item, value }) => (
          <button key={item.id} type="button" onClick={() => openTask(item.id)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none">
            <StatusCircle status={item.status} size={14} />
            <span className="text-[12px] text-ink-2 tabular-nums">{refOf(item)}</span>
            <span className="min-w-0 flex-1 truncate text-ink">{item.title}</span>
            {showValues && <span className="shrink-0 text-[12px] font-medium text-ink-2 tabular-nums">{formatAmount(value)}</span>}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
