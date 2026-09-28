import { expect, test } from "@playwright/test";
import { byOrder, orderBetween, orderFirst, orderLast, placeBetween } from "../../src/lib/work/order";
import { item } from "./fixtures";

test.describe("manual order", () => {
  test("midpoints between neighbours", () => {
    expect(orderBetween(undefined, undefined)).toBe(1024);
    expect(orderBetween(1024, undefined)).toBe(2048);
    expect(orderBetween(undefined, 1024)).toBe(0);
    expect(orderBetween(1024, 2048)).toBe(1536);
    expect(orderBetween(1, 1 + 1e-9)).toBeNull();
  });

  test("first and last", () => {
    const xs = [item({ order: 10 }), item({ order: 30 })];
    expect(orderLast(xs)).toBe(30 + 1024);
    expect(orderFirst(xs)).toBe(10 - 1024);
    expect(orderLast([])).toBe(1024);
  });

  test("places between neighbours without touching anything else", () => {
    const a = item({ order: 1024 });
    const b = item({ order: 2048 });
    const c = item({ order: 3072 });
    expect(placeBetween([a, b, c], c.id, a.id, b.id)).toEqual({ order: 1536 });
    expect(placeBetween([a, b, c], a.id, c.id, undefined)).toEqual({ order: 4096 });
    expect(placeBetween([a, b, c], c.id, undefined, a.id)).toEqual({ order: 0 });
  });

  test("renumbers everything when neighbours are too close to split", () => {
    const a = item({ order: 5 });
    const b = item({ order: 5 });
    const c = item({ order: 9 });
    const r = placeBetween([a, b, c], c.id, a.id, b.id);
    expect("renumber" in r).toBe(true);
    if ("renumber" in r) {
      const order = [a, b, c].map((t) => ({ ...t, order: r.renumber.get(t.id) as number })).sort(byOrder).map((t) => t.id);
      expect(order).toEqual([a.id, c.id, b.id]);
    }
  });
});
