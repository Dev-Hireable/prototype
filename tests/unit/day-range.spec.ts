import { expect, test } from "@playwright/test";
import { dayRangeLabel } from "../../src/lib/portal/dates";

test.describe("day ranges · how a span of days reads", () => {
  test("says the year once when both ends share it, and both years when they don't", () => {
    expect(dayRangeLabel("2026-09-25", "2026-11-05")).toBe("25 Sep to 05 Nov 2026");
    expect(dayRangeLabel(new Date(2026, 9, 5), "13 Nov 2026")).toBe("05 Oct to 13 Nov 2026");
    expect(dayRangeLabel("2026-12-28", "2027-02-08")).toBe("28 Dec 2026 to 08 Feb 2027");
  });

  test("passes an end it can't read through", () => {
    expect(dayRangeLabel("2026-09-25", "soon")).toBe("25 Sep 2026 to soon");
  });
});
