import { expect, test } from "@playwright/test";
import { agendaOf } from "../../src/lib/work/agenda";
import { item, iso, TODAY } from "./fixtures";

test.describe("the Independent's agenda", () => {
  test("most pressing first: changes, overdue, under way, next due, undated, then in review", () => {
    const rows = agendaOf(
      [
        item({ id: "later", due: iso(10), order: 1 }),
        item({ id: "review", status: "review", due: iso(-3) }),
        item({ id: "undated", order: 2 }),
        item({ id: "doing", status: "doing", due: iso(4) }),
        item({ id: "soon", due: iso(2), order: 3 }),
        item({ id: "late", due: iso(-1) }),
        item({ id: "sent-back", status: "doing", due: iso(-2), changes: { note: "Tighten the grid", at: "24 Sep 2026, 9:00 AM", by: "Alex Rivera" } }),
      ],
      TODAY,
    );
    expect(rows.map((r) => [r.item.id, r.reason])).toEqual([
      ["sent-back", "changes"],
      ["late", "overdue"],
      ["doing", "doing"],
      ["soon", "todo"],
      ["later", "todo"],
      ["undated", "todo"],
      ["review", "review"],
    ]);
    expect(rows[0].due).toBe(TODAY - 2);
    expect(rows[5].due).toBeNull();
  });

  test("only the Independent's own open work", () => {
    const rows = agendaOf(
      [
        item({ id: "mine" }),
        item({ id: "theirs", assignee: "team" }),
        item({ id: "nobody", assignee: null }),
        item({ id: "done", status: "done" }),
        item({ id: "archived", archivedAt: 1, archivedBy: "Alex Rivera" }),
      ],
      TODAY,
    );
    expect(rows.map((r) => r.item.id)).toEqual(["mine"]);
  });

  test("a tie keeps the manual order", () => {
    const rows = agendaOf([item({ id: "b", due: iso(3), order: 2048 }), item({ id: "a", due: iso(3), order: 1024 })], TODAY);
    expect(rows.map((r) => r.item.id)).toEqual(["a", "b"]);
  });
});

test.describe("the Team Builder's agenda", () => {
  test("reviews first, then their own and unassigned work, most pressing first", () => {
    const rows = agendaOf(
      [
        item({ id: "juan-todo" }),
        item({ id: "juan-doing", status: "doing", due: iso(-2) }),
        item({ id: "mine-later", assignee: "team", due: iso(9) }),
        item({ id: "unassigned", assignee: null }),
        item({ id: "to-review", status: "review", submitted: { at: "24 Sep 2026, 5:30 PM" } }),
        item({ id: "mine-late", assignee: "team", due: iso(-1) }),
        item({ id: "mine-doing", assignee: "team", status: "doing" }),
        item({ id: "mine-done", assignee: "team", status: "done" }),
      ],
      TODAY,
      "team",
    );
    // The Independent's work is theirs to move until it's sent for review.
    expect(rows.map((r) => [r.item.id, r.reason])).toEqual([
      ["to-review", "review"],
      ["mine-late", "overdue"],
      ["mine-doing", "doing"],
      ["mine-later", "todo"],
      ["unassigned", "todo"],
    ]);
  });
});
