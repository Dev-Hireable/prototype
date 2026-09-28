import { addDays, addMonths, isoOf, monthEnd, monthStart, weekStartOf, partsOf, type Day } from "./dates";
import { dateKind, datesOf, isArchived, isCompleted, type ById, type WorkItem } from "./model";
import type { Scale } from "./query";

/**
 * The timeline's geometry, worked out without the DOM: the date range to draw, where each item's
 * bar sits at a scale, what a drag or a keyboard nudge does to its dates, and the lines between an
 * item and the work it waits on.
 */

export const PX_PER_DAY: Record<Scale, number> = { day: 36, week: 14, month: 4 };

/** Days of margin either side of the work, and the shortest range worth drawing, per scale. */
const PAD: Record<Scale, number> = { day: 7, week: 14, month: 31 };
const MIN_DAYS: Record<Scale, number> = { day: 35, week: 84, month: 182 };

/** From a little before the earliest date to a little after the latest, today always included. */
export function timelineRange(items: readonly WorkItem[], today: Day, scale: Scale): { from: Day; to: Day } {
  let lo = today;
  let hi = today;
  for (const t of items) {
    const { start, due } = datesOf(t);
    for (const d of [start, due]) {
      if (d === null) continue;
      if (d < lo) lo = d;
      if (d > hi) hi = d;
    }
  }
  let from = lo - PAD[scale];
  let to = hi + PAD[scale];
  if (to - from + 1 < MIN_DAYS[scale]) to = from + MIN_DAYS[scale] - 1;
  if (scale === "month") {
    const a = partsOf(from);
    const b = partsOf(to);
    from = monthStart(a.y, a.m);
    to = monthEnd(b.y, b.m);
  } else {
    from = weekStartOf(from);
    to = addDays(weekStartOf(to), 6);
  }
  return { from, to };
}

/** The header's ticks: one per day, per week (its Sunday) or per month, with where each starts. */
export function ticksOf(from: Day, to: Day, scale: Scale): { day: Day; x: number; days: number }[] {
  const px = PX_PER_DAY[scale];
  const out: { day: Day; x: number; days: number }[] = [];
  if (scale === "day") for (let d = from; d <= to; d++) out.push({ day: d, x: (d - from) * px, days: 1 });
  else if (scale === "week") for (let d = weekStartOf(from); d <= to; d = addDays(d, 7)) out.push({ day: d, x: (d - from) * px, days: 7 });
  else {
    let { y, m } = partsOf(from);
    for (let d = monthStart(y, m); d <= to; ) {
      const end = Math.min(monthEnd(y, m), to);
      out.push({ day: d, x: (d - from) * px, days: end - d + 1 });
      ({ y, m } = addMonths(y, m, 1));
      d = monthStart(y, m);
    }
  }
  return out;
}

export type Bar = { kind: "range" | "due" | "start" | "milestone"; x: number; w: number };

/**
 * Where an item's bar sits, in px from the range's first day. A span covers its days; a due date
 * alone is a one-day marker; a start alone is a one-day stub that fades out, open-ended; a
 * milestone is a point (w 0) at the middle of its day.
 */
export function barOf(t: WorkItem, from: Day, px: number): Bar | null {
  const kind = dateKind(t);
  const { start, due } = datesOf(t);
  switch (kind) {
    case "range":
      return { kind, x: ((start as Day) - from) * px, w: ((due as Day) - (start as Day) + 1) * px };
    case "due":
      return { kind, x: ((due as Day) - from) * px, w: px };
    case "start":
      return { kind, x: ((start as Day) - from) * px, w: px };
    case "milestone":
      return { kind, x: ((due as Day) - from) * px + px / 2, w: 0 };
    case "none":
      return null;
  }
}

export type DragMode = "move" | "start" | "end";

/**
 * An item's dates after dragging (or nudging) by `delta` days. Moving keeps its length. Resizing
 * the left edge moves the start (and gives a due-only item a start); the right edge moves the due
 * (and gives a start-only item a due). An edge can't pass the other one. Milestones only move.
 * Returns the full next dates — undefined means unset.
 */
export function dragDates(t: WorkItem, mode: DragMode, delta: number): { start?: string; due?: string } {
  const kind = dateKind(t);
  const { start, due } = datesOf(t);
  const iso = (d: Day | null) => (d === null ? undefined : isoOf(d));
  if (kind === "none") return { start: t.start, due: t.due };
  if (kind === "milestone" || mode === "move") return { start: iso(start === null ? null : start + delta), due: iso(due === null ? null : due + delta) };
  if (mode === "start") {
    if (kind === "range") return { start: iso(Math.min((start as Day) + delta, due as Day)), due: iso(due) };
    if (kind === "due") return delta < 0 ? { start: iso((due as Day) + delta), due: iso(due) } : { start: undefined, due: iso(due) };
    return { start: iso((start as Day) + delta), due: undefined };
  }
  // mode === "end"
  if (kind === "range") return { start: iso(start), due: iso(Math.max((start as Day), (due as Day) + delta)) };
  if (kind === "start") return delta > 0 ? { start: iso(start), due: iso((start as Day) + delta) } : { start: iso(start), due: undefined };
  return { start: undefined, due: iso((due as Day) + delta) };
}

export type DependencyLink = { from: string; to: string; violated: boolean };

/**
 * Lines from each piece of work to the items waiting on it. A line is flagged when the item waiting
 * starts before the work it depends on is due — unless that work is already done. Links to items
 * not on screen (filtered out) are counted, not drawn.
 */
export function dependencyLinks(visible: readonly WorkItem[], byId: ById): { links: DependencyLink[]; hidden: number } {
  const shown = new Set(visible.map((t) => t.id));
  const links: DependencyLink[] = [];
  let hidden = 0;
  for (const t of visible) {
    for (const id of t.dependsOn) {
      const b = byId.get(id);
      if (!b || isArchived(b)) continue;
      if (!shown.has(id)) {
        hidden++;
        continue;
      }
      const blockerEnd = datesOf(b).due ?? datesOf(b).start;
      const waitingStart = datesOf(t).start ?? datesOf(t).due;
      const violated = !isCompleted(b.status) && blockerEnd !== null && waitingStart !== null && waitingStart < blockerEnd;
      links.push({ from: id, to: t.id, violated });
    }
  }
  return { links, hidden };
}
