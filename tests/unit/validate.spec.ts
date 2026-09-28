import { expect, test } from "@playwright/test";
import { dayOf } from "../../src/lib/work/dates";
import { indexById, isOverdue } from "../../src/lib/work/model";
import { anyDateAllowed, checkComment, checkDates, checkDependency, checkEffort, checkNote, checkTag, checkTitle, dateAllowed, normalizeTag } from "../../src/lib/work/validate";
import { item, iso, TODAY } from "./fixtures";

const rules = { today: TODAY };

test.describe("validation · text", () => {
  test("titles are required, trimmed and bounded", () => {
    expect(checkTitle("  ")?.message).toMatch(/name/i);
    expect(checkTitle("Ship it")).toBeNull();
    expect(checkTitle("x".repeat(201))?.field).toBe("title");
    // Non-Latin and emoji titles are fine.
    expect(checkTitle("Überprüfung · 検証 🚀")).toBeNull();
  });

  test("notes and comments", () => {
    expect(checkNote("", true)?.message).toMatch(/what should change/);
    expect(checkNote("", false)).toBeNull();
    expect(checkNote("x".repeat(1001), false)?.field).toBe("note");
    expect(checkComment("  ")?.field).toBe("comment");
    expect(checkComment("Looks good")).toBeNull();
  });
});

test.describe("validation · dates", () => {
  test("every start/due combination", () => {
    const t = { type: "task" as const };
    expect(checkDates({ ...t }, null, rules)).toBeNull();
    expect(checkDates({ ...t, due: iso(3) }, null, rules)).toBeNull();
    expect(checkDates({ ...t, start: iso(0) }, null, rules)).toBeNull();
    expect(checkDates({ ...t, start: iso(0), due: iso(3) }, null, rules)).toBeNull();
    expect(checkDates({ ...t, start: iso(2), due: iso(2) }, null, rules)).toBeNull();
    expect(checkDates({ ...t, start: iso(4), due: iso(3) }, null, rules)?.message).toBe("The due date can't be before the start date.");
    expect(checkDates({ ...t, due: "2026-02-30" }, null, rules)?.field).toBe("due");
  });

  test("a new due date can't be in the past, but an old one doesn't block other edits", () => {
    expect(checkDates({ type: "task", due: iso(-1) }, null, rules)?.message).toMatch(/past/);
    expect(checkDates({ type: "task", due: iso(-1), start: iso(-5) }, { due: iso(-1), start: iso(-5) }, rules)).toBeNull();
  });

  test("a new start date can't be in the past; work already under way keeps its start and can move later", () => {
    expect(checkDates({ type: "task", start: iso(-3), due: iso(2) }, null, rules)?.message).toBe("The start date can't be in the past.");
    expect(checkDates({ type: "task", start: iso(-1) }, { start: iso(2) }, rules)?.field).toBe("start");
    expect(checkDates({ type: "task", start: iso(0) }, null, rules)).toBeNull();
    // Started last week: other edits aren't blocked, and a timeline drag can move it later…
    expect(checkDates({ type: "task", start: iso(-5), due: iso(4) }, { start: iso(-5), due: iso(3) }, rules)).toBeNull();
    expect(checkDates({ type: "task", start: iso(-3), due: iso(6) }, { start: iso(-5), due: iso(4) }, rules)).toBeNull();
    // …but not earlier.
    expect(checkDates({ type: "task", start: iso(-7) }, { start: iso(-5) }, rules)?.field).toBe("start");
  });

  test("nothing is scheduled after a trial's last day", () => {
    const trial = { today: TODAY, lastDay: dayOf(iso(10)) };
    expect(checkDates({ type: "task", due: iso(11) }, null, trial)?.message).toMatch(/trial ends on/);
    expect(checkDates({ type: "task", start: iso(12), due: undefined }, null, trial)?.field).toBe("start");
    expect(checkDates({ type: "task", due: iso(10) }, null, trial)).toBeNull();
  });

  test("milestones have one date and no effort", () => {
    expect(checkDates({ type: "milestone", start: iso(0), due: iso(2) }, null, rules)?.field).toBe("start");
    expect(checkDates({ type: "milestone", due: iso(2) }, null, rules)).toBeNull();
    expect(checkEffort(3, "milestone")?.field).toBe("effort");
  });
});

test.describe("validation · the days a date picker offers", () => {
  test("each day is checkDates's call: a start from today to the due date, or later than one already under way", () => {
    const t = { type: "task" as const, due: iso(3) };
    expect(dateAllowed(t, "start", iso(-1), rules)).toBe(false);
    expect(dateAllowed(t, "start", iso(0), rules)).toBe(true);
    expect(dateAllowed(t, "start", iso(3), rules)).toBe(true);
    expect(dateAllowed(t, "start", iso(4), rules)).toBe(false);
    expect(dateAllowed(t, "due", iso(-1), rules)).toBe(false);
    // Started five days ago: the start can move later, even while that's still in the past — not earlier.
    const underWay = { type: "task" as const, start: iso(-5), due: iso(3) };
    expect(dateAllowed(underWay, "start", iso(-3), rules)).toBe(true);
    expect(dateAllowed(underWay, "start", iso(-6), rules)).toBe(false);
    expect(dateAllowed({ type: "milestone", due: iso(3) }, "start", iso(1), rules)).toBe(false);
  });

  test("an overdue item with no start has no day left for one, until its due date moves", () => {
    const overdue = { type: "task" as const, due: iso(-2) };
    expect(anyDateAllowed(overdue, "start", rules)).toBe(false);
    // Its due date can still move, to today or later — and then there are days for a start again.
    expect(anyDateAllowed(overdue, "due", rules)).toBe(true);
    expect(anyDateAllowed({ ...overdue, due: iso(0) }, "start", rules)).toBe(true);
    // The start it already has isn't a day to pick: a one-day item left overdue has no other…
    expect(anyDateAllowed({ ...overdue, start: iso(-2) }, "start", rules)).toBe(false);
    // …while one started before that can still move later, up to its due date.
    expect(anyDateAllowed({ ...overdue, start: iso(-4) }, "start", rules)).toBe(true);
  });

  test("with no start, only a due date that has passed leaves no day for one", () => {
    for (const due of [undefined, -3, -1, 0, 1, 5])
      for (const lastDay of [null, TODAY, TODAY + 10]) {
        const t = item({ due: due === undefined ? undefined : iso(due) });
        expect(anyDateAllowed(t, "start", { today: TODAY, lastDay }), `due ${t.due}, last day ${lastDay}`).toBe(!isOverdue(t, TODAY));
      }
  });

  test("it finds a day whenever trying every day would", () => {
    const days = [undefined, -4, -3, -2, -1, 0, 1, 2, 3, 4];
    const at = (d: number | undefined) => (d === undefined ? undefined : iso(d));
    for (const type of ["task", "milestone"] as const)
      for (const start of days)
        for (const due of days)
          for (const lastDay of [null, TODAY + 2, TODAY + 6])
            for (const which of ["start", "due"] as const) {
              const t = { type, start: at(start), due: at(due) };
              const r = { today: TODAY, lastDay };
              const tried = Array.from({ length: 41 }, (_, i) => iso(i - 20)).some((d) => d !== t[which] && dateAllowed(t, which, d, r));
              expect(anyDateAllowed(t, which, r), JSON.stringify({ ...t, lastDay, which })).toBe(tried);
            }
  });
});

test.describe("validation · effort and tags", () => {
  test("effort is a whole number from 0 to 999", () => {
    for (const ok of [undefined, 0, 1, 13, 999]) expect(checkEffort(ok, "task")).toBeNull();
    for (const bad of [-1, 1.5, 1000, Number.NaN]) expect(checkEffort(bad, "task")?.field).toBe("effort");
  });

  test("tags are normalised and limited", () => {
    expect(normalizeTag("  Q3 Launch ")).toBe("q3-launch");
    expect(normalizeTag("#hot!!")).toBe("hot");
    expect(normalizeTag("Café")).toBe("café");
    expect(checkTag("", [])?.field).toBe("tags");
    expect(checkTag("x".repeat(25), [])?.field).toBe("tags");
    expect(checkTag("nine", ["a", "b", "c", "d", "e", "f", "g", "h"])?.message).toMatch(/up to 8/);
  });
});

test.describe("validation · dependencies", () => {
  test("dependencies refuse self, duplicates, archived items and loops", () => {
    const a = item();
    const b = item({ dependsOn: [a.id] });
    const c = item({ dependsOn: [b.id] });
    const gone = item({ archivedAt: 1 });
    const byId = indexById([a, b, c, gone]);
    expect(checkDependency(a.id, a.id, byId)?.message).toBe("An item can't depend on itself.");
    expect(checkDependency(b.id, a.id, byId)?.message).toMatch(/already waits on/);
    expect(checkDependency(a.id, gone.id, byId)?.message).toMatch(/deleted/);
    expect(checkDependency(a.id, "nope", byId)?.message).toMatch(/no longer exists/);
    // a → c would close c → b → a.
    const loop = checkDependency(a.id, c.id, byId);
    expect(loop?.message).toContain(`#${a.number} → #${c.number} → #${b.number} → #${a.number}`);
    expect(checkDependency(c.id, a.id, byId)).toBeNull();
  });

  test("nothing waits on done work — it blocks nothing", () => {
    const done = item({ status: "done" });
    const open = item();
    const byId = indexById([done, open]);
    expect(checkDependency(open.id, done.id, byId)?.message).toBe(`#${done.number} is already done, so there's nothing to wait on.`);
    expect(checkDependency(done.id, open.id, byId)).toBeNull();
  });
});
