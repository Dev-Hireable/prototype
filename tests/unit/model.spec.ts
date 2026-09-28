import { expect, test } from "@playwright/test";
import { countsOf, dateKind, effortOf, indexById, isBlocked, isCompleted, isOverdue, openBlockers, progressOf, scoredItems, STATUS_META, STATUSES, TAG_COLOR_KEYS, tagColorOf } from "../../src/lib/work/model";
import { item, iso, TODAY } from "./fixtures";

test.describe("work item model", () => {
  test("only Done counts as completed, by metadata", () => {
    expect(STATUSES.filter(isCompleted)).toEqual(["done"]);
    expect(Object.values(STATUS_META).every((m) => typeof m.isCompleted === "boolean")).toBe(true);
  });

  test("overdue means due before today and not completed", () => {
    expect(isOverdue(item({ due: iso(-1) }), TODAY)).toBe(true);
    expect(isOverdue(item({ due: iso(0) }), TODAY)).toBe(false);
    expect(isOverdue(item({ due: iso(-1), status: "review" }), TODAY)).toBe(true);
    expect(isOverdue(item({ due: iso(-1), status: "done" }), TODAY)).toBe(false);
    expect(isOverdue(item({ due: iso(-1), archivedAt: 1 }), TODAY)).toBe(false);
    expect(isOverdue(item({}), TODAY)).toBe(false);
    expect(isOverdue(item({ due: "not a date" }), TODAY)).toBe(false);
  });

  test("progress comes from subtasks only, or is absent", () => {
    expect(progressOf(item())).toBeNull();
    expect(progressOf(item({ subtasks: [{ id: "a", title: "a", done: true }, { id: "b", title: "b", done: false }] }))).toBe(0.5);
    expect(progressOf(item({ status: "done" }))).toBeNull();
  });

  test("blocked while an open, unarchived dependency remains", () => {
    const a = item({ status: "doing" });
    const b = item({ status: "done" });
    const c = item({ archivedAt: 5 });
    const waiting = item({ dependsOn: [a.id, b.id, c.id, "gone"] });
    const byId = indexById([a, b, c, waiting]);
    expect(isBlocked(waiting, byId)).toBe(true);
    expect(openBlockers(waiting, byId).map((x) => x.id)).toEqual([a.id]);
    expect(isBlocked(item({ dependsOn: [b.id, c.id] }), byId)).toBe(false);
  });

  test("date kinds cover every start/due combination", () => {
    expect(dateKind(item({ start: iso(0), due: iso(3) }))).toBe("range");
    expect(dateKind(item({ due: iso(3) }))).toBe("due");
    expect(dateKind(item({ start: iso(0) }))).toBe("start");
    expect(dateKind(item({}))).toBe("none");
    expect(dateKind(item({ type: "milestone", due: iso(3) }))).toBe("milestone");
    expect(dateKind(item({ type: "milestone" }))).toBe("none");
  });

  test("the trial scores only the Independent's live trial items", () => {
    const scored = item({ trial: true });
    const mine = item({ trial: true, assignee: "team" });
    const nobody = item({ trial: true, assignee: null });
    const archived = item({ trial: true, archivedAt: 1 });
    const later = item({ trial: false });
    expect(scoredItems([scored, mine, nobody, archived, later]).map((t) => t.id)).toEqual([scored.id]);
    // Lists saved before the flag existed count whole — the Independent's part of it.
    const old = [item(), item(), item({ assignee: "team" })];
    expect(scoredItems(old)).toHaveLength(2);
  });

  test("counts and effort leave archived items and milestones out", () => {
    const items = [item({ status: "done" }), item({ status: "review", due: iso(-2) }), item({ archivedAt: 1 }), item({ effort: 3 }), item({ effort: 5 }), item({ type: "milestone", due: iso(2) })];
    expect(countsOf(items, TODAY)).toEqual({ total: 5, todo: 3, doing: 0, review: 1, done: 1, overdue: 1 });
    expect(effortOf(items.filter((t) => !t.archivedAt))).toEqual({ total: 8, unestimated: 2 });
  });
});

test.describe("tag colours", () => {
  test("a tag takes the colour chosen for it, else a steady one from its name", () => {
    expect(tagColorOf("design", { design: "teal" })).toBe("teal");
    // No choice (or one that isn't a colour): the same name always lands on the same colour, never grey.
    const fromName = tagColorOf("design");
    expect(tagColorOf("design", { design: "chartreuse" })).toBe(fromName);
    expect(tagColorOf("design", {})).toBe(fromName);
    expect(fromName).not.toBe("grey");
    expect(TAG_COLOR_KEYS).toContain(fromName);
    // Different tags spread over the palette rather than all sharing one colour.
    const spread = new Set(["design", "launch", "q3", "research", "bug", "copy", "urgent", "ux"].map((t) => tagColorOf(t)));
    expect(spread.size).toBeGreaterThan(3);
  });
});
