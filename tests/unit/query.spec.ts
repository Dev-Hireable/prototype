import { expect, test } from "@playwright/test";
import { indexById } from "../../src/lib/work/model";
import { activeFilterCount, applyFilters, DEFAULT_QUERY, EMPTY_FILTERS, groupItems, matchesSearch, parseQuery, serializeQuery, sortItems } from "../../src/lib/work/query";
import { item, iso, TODAY } from "./fixtures";

const params = (s: string) => new URLSearchParams(s);

test.describe("URL state", () => {
  test("missing or invalid values read as defaults", () => {
    expect(parseQuery(params(""))).toEqual(DEFAULT_QUERY);
    const q = parseQuery(params("view=gantt&sort=zzz&group=owner&scale=year&month=2026-13&week=nope&span=9&metric=hours"));
    expect(q).toEqual(DEFAULT_QUERY);
  });

  test("each view key is kept", () => {
    for (const v of ["board", "list", "calendar", "timeline", "workload"]) expect(parseQuery(params(`view=${v}`)).view).toBe(v);
  });

  test("lists drop unknown values and duplicates", () => {
    const q = parseQuery(params("status=todo,bogus,doing,todo&assignee=none,team&type=design,spaceship&priority=high,none&due=overdue,later"));
    expect(q.status).toEqual(["todo", "doing"]);
    expect(q.assignee).toEqual(["none", "team"]);
    expect(q.type).toEqual(["design"]);
    expect(q.priority).toEqual(["high", "none"]);
    expect(q.due).toEqual(["overdue"]);
  });

  test("a query survives a round trip, and defaults stay out of the URL", () => {
    const q = { ...DEFAULT_QUERY, view: "calendar" as const, q: "logo café", status: ["doing" as const], tag: ["q3-launch"], blocked: true, sort: "due" as const, dir: "desc" as const, month: "2026-10", done: true, span: 4 as const };
    const url = new URLSearchParams();
    for (const [k, v] of Object.entries(serializeQuery(q))) if (v !== null) url.set(k, v);
    expect(parseQuery(url)).toEqual(q);
    expect(Object.values(serializeQuery(DEFAULT_QUERY)).every((v) => v === null)).toBe(true);
    // The default direction for a sort isn't written.
    expect(serializeQuery({ ...DEFAULT_QUERY, sort: "due", dir: "asc" }).dir).toBeNull();
  });

  test("a malformed escape doesn't throw", () => {
    expect(() => parseQuery(params("tag=%E0%A4%A"))).not.toThrow();
  });

  test("counts what's narrowing the list", () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, q: "" })).toBe(0);
    expect(activeFilterCount({ ...EMPTY_FILTERS, q: "x", status: ["todo", "doing"], blocked: true })).toBe(4);
  });
});

test.describe("search", () => {
  const t = item({ number: 42, title: "Design the Café logo", description: "Two options", tags: ["brand"] });
  test("case- and accent-insensitive, every word", () => {
    expect(matchesSearch(t, "cafe")).toBe(true);
    expect(matchesSearch(t, "LOGO design")).toBe(true);
    expect(matchesSearch(t, "logo website")).toBe(false);
    expect(matchesSearch(t, "options")).toBe(true);
    expect(matchesSearch(t, "brand")).toBe(true);
    expect(matchesSearch(t, "#42")).toBe(true);
    expect(matchesSearch(t, "#4")).toBe(false);
    expect(matchesSearch(t, "   ")).toBe(true);
  });
});

test.describe("filters", () => {
  const blocker = item({ status: "doing", assignee: "team", priority: "high", due: iso(-1) });
  const a = item({ status: "todo", assignee: "independent", type: "design", tags: ["brand"], due: iso(0) });
  const b = item({ status: "review", assignee: "independent", dependsOn: [blocker.id], due: iso(3) });
  const c = item({ status: "done", assignee: null, priority: "low" });
  const archived = item({ archivedAt: 1 });
  const all = [blocker, a, b, c, archived];
  const ctx = { today: TODAY, byId: indexById(all) };
  const run = (f: Partial<typeof EMPTY_FILTERS> & { q?: string }) => applyFilters(all, { ...EMPTY_FILTERS, q: "", ...f }, ctx).map((t) => t.id);

  test("AND across fields, OR within one", () => {
    expect(run({})).toEqual([blocker.id, a.id, b.id, c.id]);
    expect(run({ status: ["todo", "review"] })).toEqual([a.id, b.id]);
    expect(run({ status: ["todo", "review"], assignee: ["independent"], type: ["design"] })).toEqual([a.id]);
    expect(run({ assignee: ["none"] })).toEqual([c.id]);
    expect(run({ priority: ["none"] })).toEqual([a.id, b.id]);
    expect(run({ tag: ["brand"] })).toEqual([a.id]);
    expect(run({ blocked: true })).toEqual([b.id]);
    expect(run({ due: ["overdue"] })).toEqual([blocker.id]);
    expect(run({ due: ["today", "none"] })).toEqual([a.id, c.id]);
    expect(run({ due: ["week"] })).toEqual([blocker.id, a.id]);
    expect(run({ archived: true })).toEqual([archived.id]);
    expect(run({ status: ["todo"], q: "nothing like this" })).toEqual([]);
  });
});

test.describe("sorting and grouping", () => {
  const x = item({ title: "beta", due: iso(5), priority: "low", effort: 3, order: 3000, createdAt: 3 });
  const y = item({ title: "Alpha", priority: "high", effort: 8, order: 1000, createdAt: 1 });
  const z = item({ title: "gamma", due: iso(1), order: 2000, createdAt: 2 });
  const ids = (xs: { id: string }[]) => xs.map((t) => t.id);

  test("each key, missing values last in either direction", () => {
    expect(ids(sortItems([x, y, z], "manual", "asc"))).toEqual([y.id, z.id, x.id]);
    expect(ids(sortItems([x, y, z], "due", "asc"))).toEqual([z.id, x.id, y.id]);
    expect(ids(sortItems([x, y, z], "due", "desc"))).toEqual([x.id, z.id, y.id]);
    expect(ids(sortItems([x, y, z], "priority", "desc"))).toEqual([y.id, x.id, z.id]);
    expect(ids(sortItems([x, y, z], "effort", "desc"))).toEqual([y.id, x.id, z.id]);
    expect(ids(sortItems([x, y, z], "name", "asc"))).toEqual([y.id, x.id, z.id]);
    expect(ids(sortItems([x, y, z], "created", "desc"))).toEqual([x.id, z.id, y.id]);
  });

  test("status and assignee groups are always all there", () => {
    const groups = groupItems([x, y], "status", { assignee: (k) => k });
    expect(groups.map((g) => g.key)).toEqual(["todo", "doing", "review", "done"]);
    expect(groupItems([], "assignee", { assignee: (k) => `@${k}` }).map((g) => g.label)).toEqual(["@independent", "@team", "@none"]);
    expect(groupItems([x, item({ type: "design" })], "type", { assignee: (k) => k }).map((g) => g.key)).toEqual(["task", "design"]);
    expect(groupItems([x, y, z], "none", { assignee: (k) => k })[0].items).toHaveLength(3);
  });
});
