import { expect, test } from "@playwright/test";
import { migrateItems } from "../../src/lib/work/migrate";
import { byOrder } from "../../src/lib/work/order";

/** Tasks exactly as the pre-workspace list saved them. */
const legacy = [
  { id: "a", title: "Write the brief", status: "done", addedBy: "team", agreed: true, trial: true, created: "21 Sep 2026", activity: [{ ts: Date.UTC(2026, 8, 24, 10), at: "x", text: "Approved" }] },
  { id: "b", title: "Draft two logos", status: "doing", priority: "high", due: "2026-10-01", addedBy: "team", trial: true, created: "22 Sep 2026", subtasks: [{ id: "s1", title: "Sketch", done: true }] },
  { id: "c", title: "Brand colours", status: "todo", priority: "low", due: "2026-09-28", addedBy: "team", trial: true, created: "22 Sep 2026", comments: [{ ts: 5, at: "y", side: "independent", name: "Juan", text: "On it" }] },
  { id: "d", title: "Moodboard", status: "review", addedBy: "independent", created: "23 Sep 2026", submitted: { at: "z", note: "Have a look" } },
];

test.describe("migration of saved task lists · the pre-workspace list", () => {
  test("older tasks become complete work items", () => {
    const { items, nextNumber } = migrateItems(legacy);
    expect(items.map((t) => t.number)).toEqual([1, 2, 3, 4]);
    expect(nextNumber).toBe(5);
    for (const t of items) {
      expect(t.assignee).toBe("independent");
      expect(t.type).toBe("task");
      expect(t.version).toBe(1);
      expect(t.dependsOn).toEqual([]);
      expect(t.tags).toEqual([]);
      expect(Array.isArray(t.activity) && Array.isArray(t.comments) && Array.isArray(t.subtasks)).toBe(true);
    }
    expect(items[0].createdAt).toBe(Date.UTC(2026, 8, 21));
    expect(items[0].updatedAt).toBe(Date.UTC(2026, 8, 24, 10));
    expect(items[2].comments[0].id).toBe("c-c-1");
    expect(items[3].submitted).toEqual({ at: "z", note: "Have a look" });
  });

  test("manual order is the order the old list showed", () => {
    const { items } = migrateItems(legacy);
    // Soonest due first (c, then b), then the ones without a date in the order they were added.
    expect([...items].sort(byOrder).map((t) => t.id)).toEqual(["c", "b", "a", "d"]);
  });

  test("running it again changes nothing", () => {
    const once = migrateItems(legacy);
    // A save and a reload — what the migration really gets back from localStorage.
    // react-doctor-disable-next-line react-doctor/no-json-parse-stringify-clone
    const twice = migrateItems(JSON.parse(JSON.stringify(once.items)), once.nextNumber);
    expect(twice).toEqual(once);
  });
});

test.describe("migration of saved task lists · hand-edited and half-written data", () => {
  test("bad values are dropped, not guessed at", () => {
    const { items } = migrateItems([
      { id: "x", title: "Odd one", status: "sideways", type: "spaceship", priority: "urgent", start: "2026-10-05", due: "2026-10-01", effort: 2.5, dependsOn: ["x", "ghost", "y", "y"], tags: ["  Big Deal ", "big-deal", 5], assignee: "someone" },
      { id: "y", title: "Fine", assignee: null, type: "milestone", start: "2026-10-01", due: "2026-10-02", effort: 3 },
      { id: "y", title: "Duplicate id" },
      { title: "No id" },
      "garbage",
    ]);
    expect(items).toHaveLength(2);
    const [x, y] = items;
    expect(x).toMatchObject({ status: "todo", type: "task", due: "2026-10-01", dependsOn: ["y"], tags: ["big-deal"], assignee: null });
    expect(x.priority).toBeUndefined();
    expect(x.start).toBeUndefined();
    expect(x.effort).toBeUndefined();
    expect(y).toMatchObject({ assignee: null, type: "milestone", due: "2026-10-02" });
    expect(y.start).toBeUndefined();
    expect(y.effort).toBeUndefined();
  });

  test("keeps existing numbers and fills gaps after them", () => {
    const { items, nextNumber } = migrateItems([{ id: "a", title: "A", number: 7 }, { id: "b", title: "B", number: 7 }, { id: "c", title: "C" }], 3);
    expect(items.map((t) => t.number)).toEqual([7, 8, 9]);
    expect(nextNumber).toBe(10);
  });

  test("anything that isn't a list reads as empty", () => {
    expect(migrateItems(undefined).items).toEqual([]);
    expect(migrateItems({}).items).toEqual([]);
  });
});
