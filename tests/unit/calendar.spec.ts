import { expect, test } from "@playwright/test";
import { layoutWeek, monthWeeks, moveToDay, spanOf, unscheduled } from "../../src/lib/work/calendar";
import { dayOf, isoOf } from "../../src/lib/work/dates";
import { item, iso, TODAY } from "./fixtures";

test.describe("calendar", () => {
  test("a month is four to six Sunday-first weeks", () => {
    const sep = monthWeeks(2026, 9);
    expect(isoOf(sep[0][0])).toBe("2026-08-30");
    expect(isoOf(sep[sep.length - 1][6])).toBe("2026-10-03");
    expect(sep).toHaveLength(5);
    expect(monthWeeks(2026, 2)).toHaveLength(4); // Feb 2026 starts on a Sunday
    expect(monthWeeks(2026, 8)).toHaveLength(6); // Aug 2026 starts on a Saturday
    expect(monthWeeks(2026, 9).every((w) => w.length === 7)).toBe(true);
  });

  test("spans for every date combination", () => {
    expect(spanOf(item({ start: iso(0), due: iso(3) }))).toEqual({ from: TODAY, to: TODAY + 3, kind: "range" });
    expect(spanOf(item({ due: iso(3) }))).toEqual({ from: TODAY + 3, to: TODAY + 3, kind: "due" });
    expect(spanOf(item({ start: iso(1) }))).toEqual({ from: TODAY + 1, to: TODAY + 1, kind: "start" });
    expect(spanOf(item({ type: "milestone", due: iso(2) }))?.kind).toBe("milestone");
    expect(spanOf(item({}))).toBeNull();
    expect(unscheduled([item({}), item({ due: iso(1) })])).toHaveLength(1);
  });

  test("bars are clipped to the week and marked as carrying on", () => {
    const week = Array.from({ length: 7 }, (_, i) => (dayOf("2026-09-21") as number) + i);
    const long = item({ start: "2026-09-17", due: "2026-10-02" });
    const [seg] = layoutWeek(week, [long]).segments;
    expect(seg).toMatchObject({ col: 0, cols: 7, before: true, after: true, lane: 0 });
  });

  test("lanes pack, and what doesn't fit is counted per day", () => {
    const week = Array.from({ length: 7 }, (_, i) => (dayOf("2026-09-21") as number) + i);
    const on = (d: string) => item({ due: d });
    const layout = layoutWeek(week, [on("2026-09-22"), on("2026-09-22"), on("2026-09-22"), on("2026-09-22"), on("2026-09-23"), item({ start: "2026-09-21", due: "2026-09-27" })], 3);
    // The week-long item comes first (earliest), then the Tuesday ones.
    expect(layout.segments.filter((s) => s.lane < 3)).toHaveLength(layout.segments.length);
    expect(layout.hidden.get(dayOf("2026-09-22") as number)?.length).toBe(2);
    expect(layout.all.get(dayOf("2026-09-22") as number)?.length).toBe(5);
    // Wednesday's single item still fits in lane 1.
    expect(layout.hidden.get(dayOf("2026-09-23") as number)).toBeUndefined();
  });

  test("moving to a day keeps the length", () => {
    expect(moveToDay(item({ start: "2026-09-21", due: "2026-09-24" }), dayOf("2026-10-05") as number)).toEqual({ start: "2026-10-05", due: "2026-10-08" });
    expect(moveToDay(item({ due: "2026-09-21" }), dayOf("2026-10-05") as number)).toEqual({ start: undefined, due: "2026-10-05" });
    expect(moveToDay(item({ start: "2026-09-21" }), dayOf("2026-10-05") as number)).toEqual({ start: "2026-10-05", due: undefined });
    expect(moveToDay(item({}), dayOf("2026-10-05") as number)).toEqual({ start: undefined, due: "2026-10-05" });
  });
});
