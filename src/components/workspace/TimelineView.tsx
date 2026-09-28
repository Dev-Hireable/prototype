"use client";

import { uiZoom } from "@/lib/portal/zoom";
import { memo, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ICONS } from "@/components/admin/icons";
import { StatusCircle } from "@/components/portal/tasks/task-bits";
import { Tip } from "@/components/portal/Tip";
import { dayOf, isWeekend, MONTH_SHORT, partsOf, rangeLabel, shortLabel, WEEKDAY_SHORT, weekdayOf, type Day } from "@/lib/work/dates";
import { dateKind, datesOf, refOf, STATUS_META, type WorkItem } from "@/lib/work/model";
import { changeFor } from "@/lib/work/permissions";
import { SCALES, type Group, type Scale, type WorkQuery } from "@/lib/work/query";
import { barOf, dependencyLinks, dragDates, PX_PER_DAY, ticksOf, timelineRange, type Bar, type DependencyLink, type DragMode } from "@/lib/work/timeline";
import { checkDates } from "@/lib/work/validate";
import { useWorkspace, type WorkspaceEnv } from "./context";
import { GroupLabel } from "./meta";
import { useTimedMessage } from "./timed-message";
import { useProgressive } from "./util";
import { groupColors } from "./labels";

/**
 * The Timeline: every item as a bar across the days it spans, at a day, week or month scale, with
 * today marked and weekends shaded. Drag a bar to move it (its length kept), or an end to change
 * its start or due date; a change that would break a rule turns red and isn't saved. With the
 * keyboard, focus a bar and use ← → to move it, Shift+← → for the due date and Alt+Shift+← → for
 * the start; it saves when you pause, press Enter or leave the bar, and Escape undoes it. The
 * Independent sets when their own open work starts — its left edge, or Alt+Shift+← → — and the
 * rest of the plan stays the Team Builder's. Lines run from each item to the work that waits on
 * it, dashed red where the waiting work starts too soon.
 */

/** The item column: wide enough that most titles fit in the two lines a row allows. */
const LEFT = 340;
const ROW_H = 38;
const GROUP_H = 32;
const HEAD_H = 52;

const BAR_TONE: Record<WorkItem["status"], string> = {
  todo: "bg-[#d9d9d9] text-ink",
  doing: "bg-[#8fd3f5] text-[#003049]",
  review: "bg-[#ffd966] text-[#4d3b05]",
  done: "bg-[#9ddcb4] text-[#0f4424]",
};

type Row = { kind: "group"; group: Group } | { kind: "item"; item: WorkItem };

/** How far a line leaves its bar before turning, the straight run into the arrowhead, and the corner radius. */
const LINK_OUT = 12;
const LINK_NECK = 16;
const LINK_R = 6;

/**
 * A dependency line from the end of one bar (x1, ya) to the start of the next (x2, yb): out, down
 * (or up) and in, with rounded corners and a straight neck before the arrow so the head never sits
 * on a bend. When the next bar starts too soon to turn in front of it, the line drops to the edge
 * of the first bar's row, runs back, and comes in from the left.
 */
function linkPath(x1: number, ya: number, x2: number, yb: number): string {
  const turn = Math.min(x1 + LINK_OUT, x2 - LINK_NECK);
  const pts: [number, number][] =
    turn >= x1 + 6
      ? [[x1, ya], [turn, ya], [turn, yb], [x2, yb]]
      : (() => {
          const edge = ya + (yb > ya ? ROW_H / 2 : -ROW_H / 2);
          return [[x1, ya], [x1 + LINK_OUT, ya], [x1 + LINK_OUT, edge], [x2 - LINK_NECK, edge], [x2 - LINK_NECK, yb], [x2, yb]];
        })();
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];
    const inLen = Math.hypot(cx - px, cy - py);
    const outLen = Math.hypot(nx - cx, ny - cy);
    if (!inLen || !outLen) continue;
    const k = Math.min(LINK_R, inLen / 2, outLen / 2);
    d += ` L${cx - ((cx - px) / inLen) * k},${cy - ((cy - py) / inLen) * k} Q${cx},${cy} ${cx + ((nx - cx) / outLen) * k},${cy + ((ny - cy) / outLen) * k}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  return `${d} L${lx},${ly}`;
}

/**
 * How this person can move bars, said beside the scale — from what the rules let them change on the
 * work showing (planRights): whole bars and either end, only when work starts (the Independent's own,
 * or a task whose due date the signed offer agreed), or nothing — for a viewer, or once work is closed.
 */
function dragHint(items: readonly WorkItem[], env: Pick<WorkspaceEnv, "actor" | "access" | "names">) {
  const rights = items.map((t) => planRights(t, env));
  if (rights.some((r) => r.can)) return "Drag a bar, or focus one and use the arrow keys (Shift for the due date, Alt+Shift for the start).";
  if (!rights.some((r) => r.canStart)) return null;
  return env.actor.role === "contributor" ? "Drag the left edge of your own bar to change when it starts, or focus it and use Alt+Shift with the arrow keys." : "Drag the left edge of a bar to change when it starts, or focus it and use Alt+Shift with the arrow keys.";
}

export function TimelineView({ groups, byId, query, setQuery }: { groups: Group[]; byId: ReadonlyMap<string, WorkItem>; query: WorkQuery; setQuery: (p: Partial<WorkQuery>) => void }) {
  const env = useWorkspace();
  const { today } = env;
  const scale = query.scale;
  const px = PX_PER_DAY[scale];
  const all = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const hint = useMemo(() => dragHint(all, env), [all, env]);
  const range = useMemo(() => timelineRange(all, today, scale), [all, today, scale]);
  const from = range.from;
  const { scroller, frameW, scrollToToday } = useChartScroller(today, from, px, scale);
  // Whole days up to the edge, then the width to the exact pixel — a part-day more would scroll.
  const to = Math.max(range.to, from + Math.floor((frameW - LEFT) / px) - 1);
  const width = Math.max((to - from + 1) * px, frameW - LEFT);
  const { rows, visibleRows, sentinel, rowY, links } = useTimelineRows(groups, byId);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-[var(--ws-gutter,1rem)] pt-3 pb-4">
      <ScaleBar scale={scale} setQuery={setQuery} onToday={scrollToToday} hidden={links.hidden} hint={hint} />
      {/* Bordered frame, scroller inside: an outline on the scroller sat under its pinned header and item column. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-white">
        <div ref={scroller} className="relative min-h-0 flex-1 overflow-auto" data-testid="timeline">
          <div className="relative" style={{ width: LEFT + width }}>
            <TimelineHead from={from} to={to} px={px} width={width} scale={scale} today={today} />
            <div className="relative">
              <DayMarks from={from} to={to} px={px} width={width} scale={scale} today={today} />
              <DependencyLines links={links.links} byId={byId} rowY={rowY} from={from} px={px} width={width} />
              {visibleRows.map((r) =>
                r.kind === "group" ? (
                  <GroupBand key={`g-${r.group.key}`} group={r.group} width={width} />
                ) : (
                  <TimelineRow key={r.item.id} item={r.item} from={from} px={px} width={width} scale={scale} violated={links.links.some((l) => l.to === r.item.id && l.violated)} />
                ),
              )}
              {sentinel && <ul className="sticky left-0 h-px">{sentinel}</ul>}
              {rows.length === 0 && <p className="sticky left-0 px-4 py-6 text-[13px] text-ink-2">Nothing to show.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The chart's scroller: how wide it is inside, kept current as it resizes, and a scroll back to today. */
function useChartScroller(today: Day, from: Day, px: number, scale: Scale) {
  const scroller = useRef<HTMLDivElement>(null);
  /** The frame's inner width. The grid runs at least that far, so its header, bands and row rules reach the
   *  frame's right edge instead of stopping where the items' dates run out. */
  const [frameW, setFrameW] = useState(0);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFrameW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scrollToToday = () => {
    const el = scroller.current;
    if (el) el.scrollLeft = Math.max(0, (today - from) * px - (el.clientWidth - LEFT) / 3);
  };
  // Open on today, and again when the scale changes — not every time the range grows under a drag.
  const scrolledFor = useRef<Scale | null>(null);
  useEffect(() => {
    if (scrolledFor.current === scale) return;
    scrolledFor.current = scale;
    scrollToToday();
  });
  return { scroller, frameW, scrollToToday };
}

/** Where each item's row sits, down from the top of the rows, and how tall they are together. */
function rowPositions(rows: readonly Row[]) {
  const map = new Map<string, number>();
  let y = 0;
  for (const r of rows) {
    if (r.kind === "group") y += GROUP_H;
    else {
      map.set(r.item.id, y + ROW_H / 2);
      y += ROW_H;
    }
  }
  return { map, height: y };
}

/**
 * The chart's rows — a band per group (unless it isn't grouped), then the group's items — mounted a
 * slice at a time; where each shown item's row sits; and the dependency lines between the shown items.
 */
function useTimelineRows(groups: Group[], byId: ReadonlyMap<string, WorkItem>) {
  const single = groups.length === 1 && groups[0].value.field === "none";
  const rows: Row[] = useMemo(() => groups.flatMap((g): Row[] => [...(single ? [] : [{ kind: "group" as const, group: g }]), ...g.items.map((item) => ({ kind: "item" as const, item }))]), [groups, single]);
  const { shown, sentinel } = useProgressive(rows.length, 80);
  const visibleRows = rows.slice(0, shown);
  /** Where each rendered item's row sits, for the dependency lines. */
  const rowY = useMemo(() => rowPositions(visibleRows), [visibleRows]);
  const links = useMemo(() => dependencyLinks(visibleRows.filter((r): r is Extract<Row, { kind: "item" }> => r.kind === "item").map((r) => r.item), byId), [visibleRows, byId]);
  return { rows, visibleRows, sentinel, rowY, links };
}

/** Above the chart: the scale, a jump back to today, what the filters leave out, and how to move a bar. */
function ScaleBar({ scale, setQuery, onToday, hidden, hint }: { scale: Scale; setQuery: (p: Partial<WorkQuery>) => void; onToday: () => void; hidden: number; hint: string | null }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <span role="radiogroup" aria-label="Timeline scale" className="inline-flex rounded-lg bg-surface-2 p-[3px]">
        {SCALES.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={scale === s} onClick={() => setQuery({ scale: s })} className={`h-7 rounded-md px-3 text-[13px] font-medium capitalize ${scale === s ? "bg-white text-ink shadow-sm" : "text-ink-2 hover:text-ink"}`}>
            {s}
          </button>
        ))}
      </span>
      <button type="button" onClick={onToday} className="h-9 rounded-lg border border-border bg-white px-3 text-[13px] font-medium text-ink hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary">
        Today
      </button>
      {hidden > 0 && <span className="text-[12.5px] text-ink-2">{hidden} {hidden === 1 ? "dependency is" : "dependencies are"} on items hidden by the filters.</span>}
      {hint && <span className="ml-auto hidden text-[12px] text-ink-2 lg:inline">{hint}</span>}
    </div>
  );
}

/** The pinned header: the item column's heading, then the months over the scale's ticks, today's in bold. */
function TimelineHead({ from, to, px, width, scale, today }: { from: Day; to: Day; px: number; width: number; scale: Scale; today: Day }) {
  const ticks = ticksOf(from, to, scale);
  const months = scale === "month" ? [] : ticksOf(from, to, "month");
  return (
    <div className="sticky top-0 z-30 flex border-b border-border bg-surface-2" style={{ height: HEAD_H }}>
      <div className="sticky left-0 z-40 flex shrink-0 items-end border-r border-border bg-surface-2 px-4 pb-2 text-[12.5px] font-medium text-ink-2" style={{ width: LEFT }}>
        Item
      </div>
      {/* Clipped: a week tick is always 7 days, so the last one would run past the grid and scroll it sideways. */}
      <div className="relative overflow-hidden" style={{ width }} aria-hidden>
        {months.map((t) => (
          <span key={`m${t.day}`} className="absolute top-1 truncate border-l border-[#d6d6d6] px-1.5 text-[11.5px] font-semibold text-ink" style={{ left: (t.day - from) * px, width: t.days * px }}>
            {MONTH_SHORT[partsOf(t.day).m - 1]} {partsOf(t.day).y}
          </span>
        ))}
        {ticks.map((t) => (
          <span key={t.day} className={`absolute bottom-0 flex h-6 items-center justify-center truncate border-l border-[#e3e3e3] text-[11px] tabular-nums ${t.day <= today && today < t.day + t.days ? "font-semibold text-primary" : "text-ink-2"}`} style={{ left: t.x, width: t.days * px }}>
            {scale === "day" ? `${WEEKDAY_SHORT[weekdayOf(t.day)][0]} ${partsOf(t.day).d}` : scale === "week" ? shortLabel(t.day, today) : MONTH_SHORT[partsOf(t.day).m - 1]}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Behind the rows: the weekends shaded (not at a month's scale), and today's line with its label at the top. */
function DayMarks({ from, to, px, width, scale, today }: { from: Day; to: Day; px: number; width: number; scale: Scale; today: Day }) {
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute top-0 bottom-0" style={{ left: LEFT, width }}>
        {scale !== "month" &&
          Array.from({ length: to - from + 1 }, (_, i) => from + i)
            .filter(isWeekend)
            .map((d) => <span key={d} className="absolute top-0 bottom-0 bg-[#f6f6f6]" style={{ left: (d - from) * px, width: px }} />)}
        {today >= from && today <= to && <span className="absolute top-0 bottom-0 z-10 w-0.5 bg-primary/70" style={{ left: (today - from) * px + px / 2 }} />}
      </div>
      {today >= from && today <= to && (
        <span className="pointer-events-none absolute z-20 -translate-x-1/2 rounded bg-primary px-1.5 py-0.5 text-[10.5px] font-semibold text-white" style={{ left: LEFT + (today - from) * px + px / 2, top: 2 }}>
          Today
        </span>
      )}
    </>
  );
}

/** The lines from each shown item to the shown work that waits on it; `rowY` is where each row sits. */
function DependencyLines({ links, byId, rowY, from, px, width }: { links: DependencyLink[]; byId: ReadonlyMap<string, WorkItem>; rowY: { map: Map<string, number>; height: number }; from: Day; px: number; width: number }) {
  return (
    <svg aria-hidden className="pointer-events-none absolute top-0 z-10 overflow-visible" style={{ left: LEFT, width, height: rowY.height }}>
      <defs>
        <marker id="dep-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="#8a8f98" />
        </marker>
        <marker id="dep-arrow-bad" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="#dc2626" />
        </marker>
      </defs>
      {links.map((l) => {
        const a = byId.get(l.from);
        const b = byId.get(l.to);
        const ya = rowY.map.get(l.from);
        const yb = rowY.map.get(l.to);
        const ba = a && barOf(a, from, px);
        const bb = b && barOf(b, from, px);
        if (!ba || !bb || ya === undefined || yb === undefined) return null;
        const d = linkPath(ba.x + ba.w, ya, bb.x, yb);
        return <path key={`${l.from}-${l.to}`} d={d} fill="none" stroke={l.violated ? "#dc2626" : "#8a8f98"} strokeWidth={1.5} strokeDasharray={l.violated ? "4 3" : undefined} markerEnd={`url(#${l.violated ? "dep-arrow-bad" : "dep-arrow"})`} />;
      })}
    </svg>
  );
}

/**
 * A group's heading as a band across the whole chart, in the board's column colours (To do grey,
 * In progress blue, In review yellow, Done green) so the groups read apart at a glance. Positioned,
 * so it paints over the weekend stripes; the today line and dependency lines stay on top.
 */
function GroupBand({ group, width }: { group: Group; width: number }) {
  const colors = groupColors(group);
  // The rule is an inset shadow on the band and a border on the pinned label, which covers its own
  // full height — a border on the band alone left a 1px slit the today line showed through.
  return (
    <div className="relative flex shadow-[inset_0_-1px_0_#e3e3e3]" style={{ height: GROUP_H, width: LEFT + width, background: colors.bg }}>
      <span className="sticky left-0 z-[25] flex items-center border-r border-b border-r-black/[0.07] border-b-[#e3e3e3] px-4" style={{ width: LEFT, background: colors.bg }}>
        <GroupLabel group={group} colors={colors} />
      </span>
    </div>
  );
}

type Preview = { mode: DragMode; delta: number };

/**
 * Moving one bar, by pointer or keyboard. `preview` is where the move has it, not saved yet; it saves
 * on release, when the keys pause, on Enter or when the bar loses focus, and Escape drops it. A move
 * that breaks a rule says why (`error`) and isn't saved. A press that doesn't move opens the item.
 */
function useBarDrag(t: WorkItem, px: number, allowed: (mode: DragMode) => boolean) {
  const { openTask } = useWorkspace();
  const move = usePendingMove(t);
  const { grab, cancel, ...pointer } = useBarPointer(t, px, allowed, move);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape" && move.preview) {
      e.preventDefault();
      e.stopPropagation();
      return cancel();
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (move.preview) return move.commit();
      return openTask(t.id);
    }
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const mode: DragMode = e.shiftKey && e.altKey ? "start" : e.shiftKey ? "end" : "move";
    if (!allowed(mode)) return;
    e.preventDefault();
    move.nudge(mode, e.key === "ArrowLeft" ? -1 : 1);
  };

  return {
    preview: move.preview,
    error: move.error,
    /** Press handlers for the bar (`move`) and its ends (`start`, `end`). */
    grab,
    handlers: { ...pointer, onPointerCancel: cancel, onKeyDown, onBlur: move.flush },
  };
}

/**
 * A bar's move before it's saved: `preview`. `commit` saves it — checked against the rules first,
 * and only what moved — `cancel` drops it, and `nudge` adds an arrow key's day, saving once the keys
 * pause. A move that breaks a rule says why (`error`) for a few seconds and isn't saved.
 */
function usePendingMove(t: WorkItem) {
  const { access, actions, today } = useWorkspace();
  const [preview, setPreviewState] = useState<Preview | null>(null);
  /** The same, readable from a timer or a blur without waiting for a render. */
  const latest = useRef<Preview | null>(null);
  const setPreview = (p: Preview | null) => {
    latest.current = p;
    setPreviewState(p);
  };
  const [error, setError] = useTimedMessage();
  const keyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = () => {
    if (keyTimer.current) clearTimeout(keyTimer.current);
    const p = latest.current;
    setPreview(null);
    if (!p || p.delta === 0) return;
    const n = dragDates(t, p.mode, p.delta);
    const invalid = checkDates({ start: n.start, due: n.due, type: t.type }, t, { today, lastDay: dayOf(access.lastDay) });
    if (invalid) return setError(invalid.message);
    if (n.start === t.start && n.due === t.due) return;
    setError(null);
    // Only what moved: the Independent may change a start, never a due date, so an unchanged due isn't sent.
    const change = { ...(n.start !== t.start ? { start: n.start ?? null } : {}), ...(n.due !== t.due ? { due: n.due ?? null } : {}) };
    void actions.patch(t, change, { announce: `${refOf(t)}: ${rangeLabel(dayOf(n.start), dayOf(n.due), today)}` });
  };
  const cancel = () => {
    if (keyTimer.current) clearTimeout(keyTimer.current);
    setPreview(null);
  };
  const nudge = (mode: DragMode, step: number) => {
    const p = latest.current;
    setPreview({ mode, delta: (p && p.mode === mode ? p.delta : 0) + step });
    // Saves once the keys stop — focus stays on the bar.
    if (keyTimer.current) clearTimeout(keyTimer.current);
    keyTimer.current = setTimeout(commit, 900);
  };

  return { preview, error, setPreview, commit, cancel, nudge, flush: () => latest.current && commit() };
}

type PendingMove = ReturnType<typeof usePendingMove>;

/** A press on a bar or one of its ends: dragged, it moves the preview a day at a time and saves on release; a press that doesn't move opens the item. */
function useBarPointer(t: WorkItem, px: number, allowed: (mode: DragMode) => boolean, move: PendingMove) {
  const { openTask } = useWorkspace();
  /** `locked`: a press on a bar this person can't move — it still opens the item. */
  const drag = useRef<{ x: number; mode: DragMode; moved: boolean; pointer: number; locked: boolean } | null>(null);

  const onPointerDown = (mode: DragMode) => (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    drag.current = { x: e.clientX, mode, moved: false, pointer: e.pointerId, locked: !allowed(mode) };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.locked) return;
    // The pointer moves in screen pixels; a day is `px` CSS pixels, drawn at the page's UI scale.
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 4) return;
    d.moved = true;
    const delta = Math.round(dx / uiZoom() / px);
    if (move.preview?.delta !== delta || move.preview.mode !== d.mode) move.setPreview({ mode: d.mode, delta });
  };
  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (e.currentTarget.hasPointerCapture(d.pointer)) e.currentTarget.releasePointerCapture(d.pointer);
    if (!d.moved) return openTask(t.id);
    move.commit();
  };
  /** Dropping the move — a cancelled pointer, or Escape — forgets the press as well. */
  const cancel = () => {
    drag.current = null;
    move.cancel();
  };

  return { grab: onPointerDown, onPointerMove, onPointerUp, cancel };
}

/** What the keyboard does to a bar, for its label: whatever of the plan this person may change. */
function keysHint(can: boolean, canStart: boolean, grabbable: boolean) {
  if (can) return " Arrow keys move it; Shift changes the due date; Alt+Shift the start.";
  if (!canStart) return "";
  return grabbable ? " Arrow keys change its start." : " Alt+Shift with the arrow keys changes its start.";
}

/** A bar's look: its status's tone (red while a move breaks a rule), and a start-only stub fading out. */
function barClass(bar: Bar, status: WorkItem["status"], bad: boolean, grabbable: boolean) {
  const grip = grabbable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer";
  const body = bar.kind === "milestone" ? "" : `h-6 rounded-md ${bad ? "bg-[#fca5a5] text-[#7f1d1d] outline-2 outline-danger" : BAR_TONE[status]}`;
  const fade = bar.kind === "start" ? "[mask-image:linear-gradient(to_right,black_40%,transparent)]" : "";
  return `absolute top-1/2 -translate-y-1/2 touch-none text-left select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${grip} ${body} ${fade}`;
}

/** Inside a bar: a milestone's diamond, or the grips on the ends this person may drag and the name when it fits. */
function BarInside({ bar, bad, title, grabStart, grabEnd }: { bar: Bar; bad: boolean; title?: string; grabStart?: (e: PointerEvent<HTMLElement>) => void; grabEnd?: (e: PointerEvent<HTMLElement>) => void }) {
  if (bar.kind === "milestone") return <span aria-hidden className={`absolute top-0.5 left-0.5 size-3 rotate-45 rounded-[2px] ${bad ? "bg-danger" : "bg-[#6e0e52]"}`} />;
  return (
    <>
      {grabStart && <span aria-hidden onPointerDown={grabStart} className="absolute inset-y-0 left-0 w-2 cursor-ew-resize rounded-l-md hover:bg-black/15" />}
      {grabEnd && <span aria-hidden onPointerDown={grabEnd} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize rounded-r-md hover:bg-black/15" />}
      {title && <span className="pointer-events-none block truncate px-2.5 text-[11.5px] leading-6 font-medium">{title}</span>}
    </>
  );
}

/** Above a bar while it moves: the dates it would get — or, in red, why it can't go there. */
function BarTag({ id, x, problem, dates }: { id: string; x: number; problem?: string; dates: string }) {
  return (
    <span id={id} role={problem ? "alert" : "status"} className={`absolute z-30 rounded-md px-2 py-1 text-[11.5px] leading-[1.3] whitespace-nowrap shadow ${problem ? "bg-[#fcf2f2] text-[#8f1d1d]" : "bg-ink text-white"}`} style={{ left: x, top: -2, transform: "translateY(-100%)" }}>
      {problem ?? dates}
    </span>
  );
}

/** The item column of a row: its status, number and name, and a mark when it starts too soon. */
function RowLabel({ item: t, violated }: { item: WorkItem; violated: boolean }) {
  const { openTask } = useWorkspace();
  return (
    <div className="sticky left-0 z-[25] flex shrink-0 items-center gap-2 border-r border-b border-r-[#eeeeee] border-b-[#f0f0f0] bg-white px-4" style={{ width: LEFT }}>
      <StatusCircle status={t.status} size={14} label={STATUS_META[t.status].label} />
      <span className="shrink-0 text-[12px] text-ink-2 tabular-nums">{refOf(t)}</span>
      {/* Two lines hold most titles; one longer than that shows whole on hover. */}
      <Tip label={t.title} off={t.title.length < 70}>
        <button type="button" onClick={() => openTask(t.id)} className="line-clamp-2 min-w-0 flex-1 text-left text-[13px] leading-[1.25] break-words text-ink hover:underline focus-visible:underline focus-visible:outline-none">
          {t.title}
        </button>
      </Tip>
      {violated && (
        <span className="shrink-0 text-danger" aria-label="Starts before the work it waits on is due">
          <ICONS.warning size={15} aria-hidden />
        </span>
      )}
    </div>
  );
}

/** Where a bar would be for an item with no dates: it says so, and offers to schedule it to whoever may. */
function Unscheduled({ item: t, left, schedulable }: { item: WorkItem; left: number; schedulable: boolean }) {
  const { openTask } = useWorkspace();
  return (
    <span className="absolute inset-y-0 flex items-center gap-2 pl-3" style={{ left }}>
      <span className="text-[12px] text-ink-2">No dates</span>
      {schedulable && (
        <button type="button" onClick={() => openTask(t.id, "dates")} className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-white px-2 text-[12px] font-medium text-ink hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary">
          <ICONS.schedule size={13} aria-hidden /> Schedule
        </button>
      )}
    </span>
  );
}

/**
 * What of an item's plan this person may change (changeFor, as its date fields): `can`, all of it —
 * move it, either end; `canStart`, its start alone — the Independent, on their own open work, and
 * anyone on a task from the signed offer, whose due date was agreed. A start-only bar is all start,
 * so it moves.
 */
function planRights(t: WorkItem, { actor, access, names }: Pick<WorkspaceEnv, "actor" | "access" | "names">) {
  const canStart = changeFor(t, actor, access, "start", names).ok && t.type !== "milestone";
  const can = changeFor(t, actor, access, "due", names).ok && (canStart || t.type === "milestone");
  const allowed = (mode: DragMode) => can || (canStart && (mode === "start" || (mode === "move" && dateKind(t) === "start")));
  return { can, canStart, allowed };
}

/** Where a bar shows while it moves, and the rule it would break there (`bad`) — or the item as saved. */
function shownBar(t: WorkItem, preview: Preview | null, from: Day, px: number, rules: { today: Day; lastDay: Day | null }) {
  const next = preview ? dragDates(t, preview.mode, preview.delta) : null;
  const shown = next ? { ...t, start: next.start, due: next.due } : t;
  return { bar: barOf(shown, from, px), bad: next ? checkDates({ start: next.start, due: next.due, type: t.type }, t, rules) : null, ...datesOf(shown) };
}

const TimelineRow = memo(function TimelineRow({ item: t, from, px, width, scale, violated }: { item: WorkItem; from: Day; px: number; width: number; scale: Scale; violated: boolean }) {
  const env = useWorkspace();
  const { access, today } = env;
  const { can, canStart, allowed } = planRights(t, env);
  const grabbable = allowed("move");
  const { preview, error, grab, handlers } = useBarDrag(t, px, allowed);
  const { bar, bad, start, due } = shownBar(t, preview, from, px, { today, lastDay: dayOf(access.lastDay) });
  const label = `${refOf(t)} ${t.title}, ${STATUS_META[t.status].label}, ${rangeLabel(start, due, today)}`;

  return (
    <div className="flex" style={{ height: ROW_H }} data-item-id={t.id} data-status={t.status} data-start={t.start ?? ""} data-due={t.due ?? ""}>
      <RowLabel item={t} violated={violated} />
      <div className="relative border-b border-[#f0f0f0]" style={{ width }}>
        {!bar ? (
          <Unscheduled item={t} left={Math.max(0, (today - from) * px - 40)} schedulable={can || canStart} />
        ) : (
          <>
            <BarButton item={t} bar={bar} bad={!!bad} label={label} can={can} canStart={canStart} grabbable={grabbable} scale={scale} grab={grab} handlers={handlers} />
            {/* The name beside a bar too short to hold it, or a month's worth of bars. */}
            {(bar.w < 90 || scale === "month" || bar.kind === "milestone") && (
              <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 truncate pl-2 text-[11.5px] text-ink-2" style={{ left: bar.x + Math.max(bar.w, 8) + 4, maxWidth: 240 }}>
                {t.title}
              </span>
            )}
            {(preview || error) && <BarTag id={`tl-err-${t.id}`} x={bar.x} problem={error ?? bad?.message} dates={rangeLabel(start, due, today)} />}
          </>
        )}
      </div>
    </div>
  );
});

type BarDrag = ReturnType<typeof useBarDrag>;

/**
 * The bar: a button that opens the item and moves by pointer or keys, with grips on the ends this
 * person may drag. Its name says what the keys do; `bad` points it at the tag saying why a move can't land.
 */
function BarButton({ item: t, bar, bad, label, can, canStart, grabbable, scale, grab, handlers }: { item: WorkItem; bar: Bar; bad: boolean; label: string; can: boolean; canStart: boolean; grabbable: boolean; scale: Scale; grab: BarDrag["grab"]; handlers: BarDrag["handlers"] }) {
  return (
    <button
      type="button"
      aria-label={`${label}.${keysHint(can, canStart, grabbable)}`}
      aria-describedby={bad ? `tl-err-${t.id}` : undefined}
      data-bar={t.id}
      onPointerDown={grab("move")}
      {...handlers}
      className={barClass(bar, t.status, bad, grabbable)}
      style={bar.kind === "milestone" ? { left: bar.x - 8, width: 16, height: 16 } : { left: bar.x + 1, width: Math.max(bar.w - 2, 6) }}
    >
      <BarInside bar={bar} bad={bad} title={bar.w >= 90 && scale !== "month" ? t.title : undefined} grabStart={(can || canStart) && bar.kind !== "start" ? grab("start") : undefined} grabEnd={can && bar.kind !== "due" ? grab("end") : undefined} />
    </button>
  );
}

