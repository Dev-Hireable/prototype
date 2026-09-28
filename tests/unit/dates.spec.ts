import { expect, test } from "@playwright/test";
import { addMonths, dayOf, daysInMonth, isoOf, longLabel, monthEnd, monthStart, parseMonth, partsOf, rangeLabel, relativeLabel, shortLabel, todayDay, weekdayOf, weekStartOf, workingDays } from "../../src/lib/work/dates";

test.describe("date-only values · days, weeks and months", () => {
  test("round-trips real days and rejects anything else", () => {
    for (const s of ["2026-09-25", "2024-02-29", "1999-12-31", "2027-01-01"]) expect(isoOf(dayOf(s) as number)).toBe(s);
    for (const s of ["2026-02-29", "2026-13-01", "2026-00-10", "2026-09-31", "25 Sep 2026", "", "2026-9-5", null, undefined]) expect(dayOf(s)).toBeNull();
  });

  test("knows leap years and month lengths", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(1900, 2)).toBe(28);
    expect(monthEnd(2026, 12) - monthStart(2026, 12)).toBe(30);
  });

  test("weeks start on Sunday", () => {
    expect(weekdayOf(dayOf("2026-09-27") as number)).toBe(0); // Sunday
    expect(weekdayOf(dayOf("2026-09-21") as number)).toBe(1); // Monday
    expect(weekdayOf(dayOf("2026-09-25") as number)).toBe(5); // Friday
    expect(weekdayOf(dayOf("2026-09-26") as number)).toBe(6); // Saturday
    expect(isoOf(weekStartOf(dayOf("2026-09-26") as number))).toBe("2026-09-20");
    expect(isoOf(weekStartOf(dayOf("2026-09-27") as number))).toBe("2026-09-27");
    expect(isoOf(weekStartOf(dayOf("2027-01-01") as number))).toBe("2026-12-27");
  });

  test("month arithmetic crosses year boundaries", () => {
    expect(addMonths(2026, 12, 1)).toEqual({ y: 2027, m: 1 });
    expect(addMonths(2026, 1, -1)).toEqual({ y: 2025, m: 12 });
    expect(addMonths(2026, 9, 15)).toEqual({ y: 2027, m: 12 });
    expect(parseMonth("2026-09")).toEqual({ y: 2026, m: 9 });
    expect(parseMonth("2026-13")).toBeNull();
    expect(parseMonth("bogus")).toBeNull();
  });

  test("working days skip weekends", () => {
    const fri = dayOf("2026-09-25") as number;
    const tue = dayOf("2026-09-29") as number;
    expect(workingDays(fri, tue).map(isoOf)).toEqual(["2026-09-25", "2026-09-28", "2026-09-29"]);
    const sat = dayOf("2026-09-26") as number;
    expect(workingDays(sat, sat + 1)).toEqual([]);
  });
});

test.describe("date-only values · local time", () => {
  test("today is the device's calendar date whatever the time of day", () => {
    // 23:30 and 00:30 local are different days; neither shifts through UTC.
    expect(isoOf(todayDay(new Date(2026, 8, 25, 23, 30)))).toBe("2026-09-25");
    expect(isoOf(todayDay(new Date(2026, 8, 26, 0, 30)))).toBe("2026-09-26");
  });

  test("a day is the same calendar day across a daylight-saving change", () => {
    // The US clocks change on 8 Mar 2026 and 1 Nov 2026; plain day numbers don't care.
    const before = dayOf("2026-03-07") as number;
    const after = dayOf("2026-03-09") as number;
    expect(after - before).toBe(2);
    expect(workingDays(dayOf("2026-10-30") as number, dayOf("2026-11-02") as number).map(isoOf)).toEqual(["2026-10-30", "2026-11-02"]);
    expect(partsOf(dayOf("2026-11-01") as number)).toEqual({ y: 2026, m: 11, d: 1 });
  });
});

test.describe("date-only values · labels", () => {
  test("labels read like the rest of the app", () => {
    const today = dayOf("2026-09-25") as number;
    expect(relativeLabel(today, today)).toBe("Today");
    expect(relativeLabel(today + 1, today)).toBe("Tomorrow");
    expect(relativeLabel(today - 1, today)).toBe("Yesterday");
    expect(relativeLabel(today + 5, today)).toBe("30 Sep");
    expect(shortLabel(dayOf("2027-01-04") as number, today)).toBe("4 Jan 2027");
    expect(longLabel(today)).toBe("Fri 25 Sep 2026");
    expect(rangeLabel(today, today + 7, today)).toBe("25 Sep – 2 Oct");
    expect(rangeLabel(null, today, today)).toBe("Due 25 Sep");
    expect(rangeLabel(today, null, today)).toBe("Starts 25 Sep");
    expect(rangeLabel(null, null, today)).toBe("No dates");
  });
});
