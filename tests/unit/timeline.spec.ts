import { expect, test } from "@playwright/test";
import { dayOf, isoOf, weekdayOf } from "../../src/lib/work/dates";
import { indexById } from "../../src/lib/work/model";
import { barOf, dependencyLinks, dragDates, PX_PER_DAY, ticksOf, timelineRange } from "../../src/lib/work/timeline";
import { item, iso, TODAY } from "./fixtures";

test.describe("timeline · range and ticks", () => {
  test("the range covers the work and today, snapped to weeks or months", () => {
    const r = timelineRange([item({ start: iso(-20), due: iso(40) })], TODAY, "week");
    expect(r.from).toBeLessThanOrEqual(TODAY - 20);
    expect(r.to).toBeGreaterThanOrEqual(TODAY + 40);
    expect(weekdayOf(r.from)).toBe(0);
    expect(weekdayOf(r.to)).toBe(6);
    const empty = timelineRange([], TODAY, "day");
    expect(empty.from).toBeLessThanOrEqual(TODAY);
    expect(empty.to - empty.from + 1).toBeGreaterThanOrEqual(35);
    const m = timelineRange([], TODAY, "month");
    expect(isoOf(m.from).endsWith("-01")).toBe(true);
  });

  test("ticks per scale", () => {
    const from = dayOf("2026-09-20") as number; // a Sunday, where a week's tick falls
    expect(ticksOf(from, from + 6, "day")).toHaveLength(7);
    expect(ticksOf(from, from + 27, "week").map((t) => t.days)).toEqual([7, 7, 7, 7]);
    const months = ticksOf(dayOf("2026-09-01") as number, dayOf("2026-11-30") as number, "month");
    expect(months.map((t) => t.days)).toEqual([30, 31, 30]);
  });
});

test.describe("timeline · bars and dragging", () => {
  test("bars for each date kind", () => {
    const px = PX_PER_DAY.day;
    expect(barOf(item({ start: iso(2), due: iso(4) }), TODAY, px)).toEqual({ kind: "range", x: 2 * px, w: 3 * px });
    expect(barOf(item({ due: iso(1) }), TODAY, px)).toEqual({ kind: "due", x: px, w: px });
    expect(barOf(item({ start: iso(1) }), TODAY, px)).toEqual({ kind: "start", x: px, w: px });
    expect(barOf(item({ type: "milestone", due: iso(1) }), TODAY, px)).toEqual({ kind: "milestone", x: 1.5 * px, w: 0 });
    expect(barOf(item({}), TODAY, px)).toBeNull();
  });

  test("dragging moves, resizing moves one edge, and edges never cross", () => {
    const span = item({ start: "2026-09-21", due: "2026-09-24" });
    expect(dragDates(span, "move", 7)).toEqual({ start: "2026-09-28", due: "2026-10-01" });
    expect(dragDates(span, "start", -2)).toEqual({ start: "2026-09-19", due: "2026-09-24" });
    expect(dragDates(span, "start", 10)).toEqual({ start: "2026-09-24", due: "2026-09-24" });
    expect(dragDates(span, "end", 3)).toEqual({ start: "2026-09-21", due: "2026-09-27" });
    expect(dragDates(span, "end", -10)).toEqual({ start: "2026-09-21", due: "2026-09-21" });
  });

  test("resizing gives a one-date item its other date", () => {
    expect(dragDates(item({ due: "2026-09-24" }), "start", -3)).toEqual({ start: "2026-09-21", due: "2026-09-24" });
    expect(dragDates(item({ start: "2026-09-21" }), "end", 4)).toEqual({ start: "2026-09-21", due: "2026-09-25" });
    expect(dragDates(item({ type: "milestone", due: "2026-09-24" }), "end", 2)).toEqual({ start: undefined, due: "2026-09-26" });
  });
});

test.describe("timeline · dependency lines", () => {
  test("dependency lines, flagged when work starts before what it waits on is due", () => {
    const a = item({ start: "2026-09-21", due: "2026-09-25" });
    const early = item({ start: "2026-09-23", due: "2026-09-30", dependsOn: [a.id] });
    const fine = item({ start: "2026-09-28", dependsOn: [a.id] });
    const hiddenBlocker = item({ due: "2026-09-22" });
    const c = item({ due: "2026-10-02", dependsOn: [hiddenBlocker.id] });
    const all = [a, early, fine, hiddenBlocker, c];
    const { links, hidden } = dependencyLinks([a, early, fine, c], indexById(all));
    expect(links).toEqual([
      { from: a.id, to: early.id, violated: true },
      { from: a.id, to: fine.id, violated: false },
    ]);
    expect(hidden).toBe(1);
    // Once the blocker is done, starting early is no longer a problem.
    const done = { ...a, status: "done" as const };
    expect(dependencyLinks([done, early], indexById([done, early])).links[0].violated).toBe(false);
  });
});
