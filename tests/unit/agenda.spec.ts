import { expect, test } from "@playwright/test";
import { agendaOf } from "../../src/lib/work/agenda";
import { item, iso, TODAY } from "./fixtures";

test.describe("the Independent's agenda", () => {
  test("in the manual order, whatever is most pressing, each row saying why it's on the list", () => {
    const rows = agendaOf(
      [
        item({ id: "later", due: iso(10), order: 1 }),
        item({ id: "review", status: "review", due: iso(-3), order: 6 }),
        item({ id: "undated", order: 2 }),
        item({ id: "doing", status: "doing", due: iso(4), order: 5 }),
        item({ id: "soon", due: iso(2), order: 3 }),
        item({ id: "late", due: iso(-1), order: 7 }),
        item({ id: "sent-back", status: "doing", due: iso(-2), order: 4, changes: { note: "Tighten the grid", at: "24 Sep 2026, 9:00 AM", by: "Alex Rivera" } }),
      ],
      TODAY,
    );
    expect(rows.map((r) => [r.item.id, r.reason])).toEqual([
      ["later", "todo"],
      ["undated", "todo"],
      ["soon", "todo"],
      ["sent-back", "changes"],
      ["doing", "doing"],
      ["review", "review"],
      ["late", "overdue"],
    ]);
    expect(rows[3].due).toBe(TODAY - 2);
    expect(rows[1].due).toBeNull();
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

  test("the same place in the order goes by number", () => {
    const rows = agendaOf([item({ id: "b", number: 9, order: 1024 }), item({ id: "a", number: 4, order: 1024 })], TODAY);
    expect(rows.map((r) => r.item.id)).toEqual(["a", "b"]);
  });
});

test.describe("the Team Builder's agenda", () => {
  test("their own and unassigned work, and the Independent's once it waits on review, in the manual order", () => {
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
    // The Independent's work is theirs to move until it's sent for review. The fixture orders items as
    // they're made, so this is the order above.
    expect(rows.map((r) => [r.item.id, r.reason])).toEqual([
      ["mine-later", "todo"],
      ["unassigned", "todo"],
      ["to-review", "review"],
      ["mine-late", "overdue"],
      ["mine-doing", "doing"],
    ]);
  });
});
