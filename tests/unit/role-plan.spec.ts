import { expect, test } from "@playwright/test";
import { EXPERIENCE_LEVELS } from "../../src/lib/contract/job-types";
import { fitPlan, highInWeek, highTaken, type DraftTask } from "../../src/lib/demo/tasks";
import { proRata, rangeText, rateAt } from "../../src/lib/team/rates";

// TB-025 / TB-024 / TB-130 — a trial's task plan takes one High task per due week and fits a
// shortened trial; the pay a role is suggested reads the catalogue's published market rates.

const row = (key: string, week: number | undefined, priority?: DraftTask["priority"]): DraftTask => ({ key, title: `Task ${key}`, week, priority });

const [BEGINNER, INTERMEDIATE, ADVANCED, EXPERT] = EXPERIENCE_LEVELS;

test.describe("task plan · one High task a week", () => {
  test("names the row already High in that week, never the row asking", () => {
    const rows = [row("a", 2, "high"), row("b", 2, "medium"), row("c", 3, "high")];
    expect(highInWeek(rows, 2, "b")).toBe(1);
    expect(highInWeek(rows, 2, "a")).toBeNull();
    expect(highInWeek(rows, 4, "b")).toBeNull();
    expect(highInWeek(rows, 3, "a")).toBe(3);
    expect(highTaken(1, 2)).toBe("#1 is already High in Week 2");
    expect(highTaken(3, undefined)).toBe("#3 is already High with no due week");
  });

  test("tasks with no due week share one bucket", () => {
    expect(highInWeek([row("a", undefined, "high"), row("b", undefined)], undefined, "b")).toBe(1);
  });
});

test.describe("task plan · a shortened trial", () => {
  test("moves due weeks past the end onto the last week and leaves the rest", () => {
    const rows = [row("a", 2, "high"), row("b", 9, "medium"), row("c", undefined, "low")];
    const fitted = fitPlan(rows, 6);
    expect(fitted.map((r) => r.week)).toEqual([2, 6, undefined]);
    expect(fitted[0]).toBe(rows[0]);
    expect(fitted.map((r) => r.priority)).toEqual(["high", "medium", "low"]);
  });

  test("a High landing beside another High drops to Medium, whichever comes first in the list", () => {
    expect(fitPlan([row("a", 12, "high"), row("b", 6, "high")], 6).map((r) => [r.week, r.priority])).toEqual([
      [6, "medium"],
      [6, "high"],
    ]);
    expect(fitPlan([row("a", 9, "high"), row("b", 12, "high")], 6).map((r) => [r.week, r.priority])).toEqual([
      [6, "high"],
      [6, "medium"],
    ]);
  });
});

test.describe("suggested pay · published market rates", () => {
  const full = { entry: { min: 480, max: 900 }, mid: { min: 800, max: 1100 }, senior: { min: 1200, max: 2000 }, all: { min: 880, max: 1267 } };

  test("a level reads its own band", () => {
    expect(rateAt(full, INTERMEDIATE)).toEqual({ range: full.mid, basis: { range: full.mid, level: INTERMEDIATE } });
    expect(rateAt(full, ADVANCED)?.range).toEqual(full.senior);
  });

  test("Expert scales up from the senior band", () => {
    expect(rateAt(full, EXPERT)).toEqual({ range: { min: 1500, max: 2500 }, basis: { range: full.senior, level: ADVANCED }, scaledTo: EXPERT });
  });

  test("with one figure for every level, every level reads it as that", () => {
    const all = { all: { min: 1360, max: 2320 } };
    for (const level of [BEGINNER, ADVANCED, EXPERT]) expect(rateAt(all, level)).toEqual({ range: all.all, basis: { range: all.all, level: null } });
  });

  test("a level with no band and no all-levels figure scales the nearest band; none at all is null", () => {
    const senior = { senior: { min: 3700, max: 5700 } };
    expect(rateAt(senior, BEGINNER)).toEqual({ range: { min: 2050, max: 3150 }, basis: { range: senior.senior, level: ADVANCED }, scaledTo: BEGINNER });
    expect(rateAt({}, INTERMEDIATE)).toBeNull();
  });

  test("a part-time role gets its share of a 40-hour week, and says so", () => {
    const range = { min: 1360, max: 2320 };
    expect(proRata(range, 20)).toEqual({ min: 680, max: 1160 });
    expect(proRata(range, 10)).toEqual({ min: 340, max: 580 });
    expect(proRata(range)).toBe(range);
    expect(rangeText(proRata(range, 20), 20)).toBe("$680 to $1,160 a month for 20 hrs/week");
    expect(rangeText(range)).toBe("$1,360 to $2,320 /month");
    expect(rangeText({ min: 1849, max: 1849 })).toBe("$1,849 /month");
  });
});
