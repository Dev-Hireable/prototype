import { expect, test } from "@playwright/test";
import { dayOf } from "../../src/lib/work/dates";
import { indexById } from "../../src/lib/work/model";
import { checkComment, checkDates, checkDependency, checkEffort, checkNote, checkTag, checkTitle, normalizeTag } from "../../src/lib/work/validate";
import { item, iso, TODAY } from "./fixtures";

const rules = { today: TODAY };

test.describe("validation", () => {
  test("titles are required, trimmed and bounded", () => {
    expect(checkTitle("  ")?.message).toMatch(/name/i);
    expect(checkTitle("Ship it")).toBeNull();
    expect(checkTitle("x".repeat(201))?.field).toBe("title");
    // Non-Latin and emoji titles are fine.
    expect(checkTitle("Überprüfung · 検証 🚀")).toBeNull();
  });

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

  test("notes and comments", () => {
    expect(checkNote("", true)?.message).toMatch(/what should change/);
    expect(checkNote("", false)).toBeNull();
    expect(checkNote("x".repeat(1001), false)?.field).toBe("note");
    expect(checkComment("  ")?.field).toBe("comment");
    expect(checkComment("Looks good")).toBeNull();
  });
});
