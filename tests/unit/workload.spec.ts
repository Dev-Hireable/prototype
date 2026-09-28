import { expect, test } from "@playwright/test";
import { dayOf } from "../../src/lib/work/dates";
import { placementOf, workload } from "../../src/lib/work/workload";
import { item } from "./fixtures";

const MON = dayOf("2026-09-21") as number;
const at = (iso: string) => (dayOf(iso) as number) - MON;

test.describe("workload", () => {
  test("effort spreads evenly over the working days between start and due", () => {
    const t = item({ start: "2026-09-24", due: "2026-09-29", effort: 8 }); // Thu, Fri, Mon, Tue
    const p = placementOf(t, "effort");
    expect(p?.map((x) => x.value)).toEqual([2, 2, 2, 2]);
    expect(p?.map((x) => x.day - MON)).toEqual([3, 4, 7, 8]);
  });

  test("single dates, weekends-only spans and no dates", () => {
    expect(placementOf(item({ due: "2026-09-23", effort: 5 }), "effort")).toEqual([{ day: MON + 2, value: 5 }]);
    expect(placementOf(item({ start: "2026-09-22", effort: 3 }), "effort")).toEqual([{ day: MON + 1, value: 3 }]);
    expect(placementOf(item({ start: "2026-09-26", due: "2026-09-27", effort: 4 }), "effort")).toEqual([{ day: MON + 6, value: 4 }]);
    expect(placementOf(item({}), "effort")).toBeNull();
    expect(placementOf(item({ start: "2026-09-21", due: "2026-09-23", effort: 9 }), "count")?.map((x) => x.value)).toEqual([1, 1, 1]);
  });

  test("rows per person, with the edges of the window totalled", () => {
    const items = [
      item({ assignee: "independent", start: "2026-09-17", due: "2026-09-22", effort: 4 }), // Thu 17, Fri 18, Mon 21, Tue 22 → 1 each
      item({ assignee: "team", due: "2026-09-23", effort: 3 }),
      item({ assignee: null, due: "2026-10-20", effort: 2 }),
      item({ assignee: "independent" }), // no dates
      item({ assignee: "independent", due: "2026-09-24" }), // no effort
      item({ assignee: "independent", due: "2026-09-24", effort: 6, status: "done" }),
      item({ assignee: "team", due: "2026-09-25", effort: 6, archivedAt: 1 }),
      item({ assignee: "team", type: "milestone", due: "2026-09-25" }),
    ];
    const { days, rows } = workload(items, { from: MON, days: 14, metric: "effort", includeDone: false });
    expect(days).toHaveLength(14);
    const [juan, alex, nobody] = rows;
    expect(juan.key).toBe("independent");
    expect(juan.before.value).toBe(2);
    expect(juan.cells[at("2026-09-21")].value).toBe(1);
    expect(juan.cells[at("2026-09-22")].value).toBe(1);
    expect(juan.total).toBe(2);
    expect(juan.unscheduled).toHaveLength(1);
    expect(juan.unestimated).toHaveLength(1);
    expect(alex.cells[at("2026-09-23")]).toMatchObject({ value: 3 });
    expect(alex.total).toBe(3);
    expect(nobody.after.value).toBe(2);
    // Done items count once asked to.
    const withDone = workload(items, { from: MON, days: 14, metric: "effort", includeDone: true });
    expect(withDone.rows[0].cells[at("2026-09-24")].value).toBe(6);
  });

  test("count measures items in flight", () => {
    const items = [item({ start: "2026-09-21", due: "2026-09-22" }), item({ due: "2026-09-22" })];
    const { rows } = workload(items, { from: MON, days: 7, metric: "count", includeDone: false });
    expect(rows[0].cells[1].value).toBe(2);
    expect(rows[0].cells[1].items).toHaveLength(2);
  });
});
