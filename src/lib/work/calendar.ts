import { addDays, isoOf, monthEnd, monthStart, weekStartOf, type Day } from "./dates";
import { dateKind, datesOf, type DateKind, type WorkItem } from "./model";
import { byOrder } from "./order";

/**
 * The month view's layout, worked out without the DOM: which weeks the month spans (Sunday first),
 * where each item's bar sits in each week, and what doesn't fit.
 *
 * An item with a start and a due spans those days; one with only a due date sits on it; one with
 * only a start sits on its start ("Starts"); a milestone sits on its date. Items with neither are
 * unscheduled and listed beside the month instead.
 */

export type Span = { from: Day; to: Day; kind: Exclude<DateKind, "none"> };

export function spanOf(t: WorkItem): Span | null {
  const kind = dateKind(t);
  const { start, due } = datesOf(t);
  switch (kind) {
    case "range":
      return { from: start as Day, to: due as Day, kind };
    case "due":
    case "milestone":
      return { from: due as Day, to: due as Day, kind };
    case "start":
      return { from: start as Day, to: start as Day, kind };
    case "none":
      return null;
  }
}

/** The Sundays-to-Saturdays that cover the month: four to six rows of seven days. */
export function monthWeeks(y: number, m: number): Day[][] {
  const first = weekStartOf(monthStart(y, m));
  const last = monthEnd(y, m);
  const weeks: Day[][] = [];
  for (let w = first; w <= last; w = addDays(w, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDays(w, i)));
  return weeks;
}

export type Segment = {
  item: WorkItem;
  kind: Span["kind"];
  /** Columns 0 (Sunday) to 6 the bar covers in this week. */
  col: number;
  cols: number;
  lane: number;
  /** The item carries on into the previous / next week. */
  before: boolean;
  after: boolean;
};

export type WeekLayout = {
  days: Day[];
  /** Bars that fit, in lanes 0 … maxLanes-1. */
  segments: Segment[];
  /** Per day: the items there that didn't fit, for "+k more". */
  hidden: Map<Day, WorkItem[]>;
  /** Per day: everything on that day, shown and hidden. */
  all: Map<Day, WorkItem[]>;
};

/**
 * One week's bars, packed into lanes: earliest first, longer ones first on the same day, each into
 * the lowest lane it fits. Anything that would need a lane past `maxLanes` is counted on the days
 * it covers instead.
 */
export function layoutWeek(days: Day[], items: readonly WorkItem[], maxLanes = 3): WeekLayout {
  const from = days[0];
  const to = days[days.length - 1];
  const within = items
    .map((item) => ({ item, span: spanOf(item) }))
    .filter((x): x is { item: WorkItem; span: Span } => !!x.span && x.span.to >= from && x.span.from <= to)
    .map(({ item, span }) => ({ item, kind: span.kind, a: Math.max(span.from, from), b: Math.min(span.to, to), before: span.from < from, after: span.to > to }))
    .sort((x, y) => x.a - y.a || y.b - y.a - (x.b - x.a) || byOrder(x.item, y.item));

  const lanes: [number, number][][] = [];
  const segments: Segment[] = [];
  const hidden = new Map<Day, WorkItem[]>();
  const all = new Map<Day, WorkItem[]>();
  for (const s of within) {
    for (let d = s.a; d <= s.b; d++) all.set(d, [...(all.get(d) ?? []), s.item]);
    let lane = lanes.findIndex((taken) => taken.every(([a, b]) => s.b < a || s.a > b));
    if (lane === -1) lane = lanes.length;
    if (lane >= maxLanes) {
      for (let d = s.a; d <= s.b; d++) hidden.set(d, [...(hidden.get(d) ?? []), s.item]);
      continue;
    }
    (lanes[lane] ??= []).push([s.a, s.b]);
    segments.push({ item: s.item, kind: s.kind, col: s.a - from, cols: s.b - s.a + 1, lane, before: s.before, after: s.after });
  }
  return { days, segments, hidden, all };
}

export const unscheduled = (items: readonly WorkItem[]) => items.filter((t) => dateKind(t) === "none");

/**
 * Its dates once moved so its first day lands on `to`, keeping its length. An unscheduled item
 * dropped on a day becomes due that day.
 */
export function moveToDay(t: WorkItem, to: Day): { start?: string; due?: string } {
  const span = spanOf(t);
  if (!span) return { start: t.start, due: isoOf(to) };
  const delta = to - span.from;
  const { start, due } = datesOf(t);
  return { start: start === null ? undefined : isoOf(start + delta), due: due === null ? undefined : isoOf(due + delta) };
}
