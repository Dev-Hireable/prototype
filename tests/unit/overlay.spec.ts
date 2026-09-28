import { expect, test } from "@playwright/test";
import { applyOps } from "../../src/lib/work/overlay";
import { item } from "./fixtures";

test.describe("pending changes", () => {
  const a = item({ status: "todo" });
  const b = item({ status: "doing" });

  test("no changes returns the same list", () => {
    const list = [a, b];
    expect(applyOps(list, [])).toBe(list);
  });

  test("changed items are copies; the rest keep their identity", () => {
    const out = applyOps([a, b], [{ opId: "1", itemId: a.id, set: { status: "doing" } }]);
    expect(out[0]).not.toBe(a);
    expect(out[0].status).toBe("doing");
    expect(out[1]).toBe(b);
    expect(a.status).toBe("todo");
  });

  test("later changes win, and repeating one is harmless", () => {
    const out = applyOps([a], [
      { opId: "1", itemId: a.id, set: { status: "doing" } },
      { opId: "2", itemId: a.id, set: { status: "review", due: "2026-10-01" } },
      { opId: "3", itemId: a.id, set: { status: "review" } },
    ]);
    expect(out[0]).toMatchObject({ status: "review", due: "2026-10-01" });
  });

  test("an item being created shows until the saved list has it", () => {
    const fresh = item({ title: "New" });
    const pending = [{ opId: "1", itemId: fresh.id, create: fresh }];
    expect(applyOps([a], pending).map((t) => t.id)).toEqual([a.id, fresh.id]);
    const saved = { ...fresh, version: 1, title: "New (saved)" };
    const out = applyOps([a, saved], pending);
    expect(out).toHaveLength(2);
    expect(out[1]).toBe(saved);
  });

  test("dropping a failed change rolls it back", () => {
    const ops = [{ opId: "1", itemId: a.id, set: { status: "done" as const } }];
    expect(applyOps([a], ops)[0].status).toBe("done");
    expect(applyOps([a], ops.filter((o) => o.opId !== "1"))[0]).toBe(a);
  });
});
