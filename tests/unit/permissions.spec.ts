import { expect, test } from "@playwright/test";
import type { WorkStatus } from "../../src/lib/work/model";
import { canCreate, canReorder, capsFor, readOnlyReason, targetsFor, transitionFor, type Role } from "../../src/lib/work/permissions";
import { ENDED, item, OPEN, REVIEW_ONLY } from "./fixtures";

const manager = { role: "manager" as Role };
const contributor = { role: "contributor" as Role };
const viewer = { role: "viewer" as Role };

// [role, assignee, from, to, allowed kind or null]
const table: [Role, "independent" | "team" | null, WorkStatus, WorkStatus, string | null][] = [
  // The Independent on their own work.
  ["contributor", "independent", "todo", "doing", "start"],
  ["contributor", "independent", "doing", "todo", "pause"],
  ["contributor", "independent", "todo", "review", "submit"],
  ["contributor", "independent", "doing", "review", "submit"],
  ["contributor", "independent", "review", "doing", "takeBack"],
  ["contributor", "independent", "review", "todo", "takeBack"],
  ["contributor", "independent", "doing", "done", null],
  ["contributor", "independent", "review", "done", null],
  ["contributor", "independent", "done", "doing", null],
  // …never on anyone else's.
  ["contributor", "team", "todo", "doing", null],
  ["contributor", null, "todo", "doing", null],
  // The Team Builder reviews the Independent's work…
  ["manager", "independent", "review", "done", "approve"],
  ["manager", "independent", "review", "doing", "requestChanges"],
  ["manager", "independent", "review", "todo", null],
  ["manager", "independent", "todo", "doing", null],
  ["manager", "independent", "doing", "review", null],
  ["manager", "independent", "done", "doing", null],
  // …and works their own, and unassigned items, straight to Done.
  ["manager", "team", "todo", "doing", "start"],
  ["manager", "team", "doing", "done", "complete"],
  ["manager", "team", "todo", "done", "complete"],
  ["manager", "team", "done", "todo", "reopen"],
  ["manager", "team", "doing", "review", null],
  ["manager", null, "todo", "done", "complete"],
  // Admin reads only.
  ["viewer", "independent", "todo", "doing", null],
  ["viewer", "team", "doing", "done", null],
];

test.describe("status transitions", () => {
  for (const [role, assignee, from, to, kind] of table) {
    test(`${role} · ${assignee ?? "unassigned"} · ${from} → ${to}: ${kind ?? "refused"}`, () => {
      const t = transitionFor(item({ assignee, status: from }), { role }, OPEN, to);
      if (kind) expect(t).toEqual({ ok: true, kind, needsNote: kind === "requestChanges" });
      else {
        expect(t.ok).toBe(false);
        if (!t.ok) expect(t.reason.length).toBeGreaterThan(10);
      }
    });
  }

  test("a closed trial is wrapped up, not reopened: approve, but nothing goes back to the Independent", () => {
    const names = { team: "Alex", independent: "Juan" };
    expect(transitionFor(item({ status: "review" }), manager, REVIEW_ONLY, "done").ok).toBe(true);
    // Sent back now, it could never come back — they can't work it any more.
    expect(transitionFor(item({ status: "review" }), manager, REVIEW_ONLY, "doing", names)).toEqual({ ok: false, reason: "The trial is over, so Juan can't make changes now. Approve it, or leave it for your evaluation." });
    expect(transitionFor(item({ status: "todo" }), contributor, REVIEW_ONLY, "doing", names)).toEqual({ ok: false, reason: "The trial is over, so its work is with Alex for the evaluation." });
    // The Team Builder can still finish their own and unassigned items.
    expect(transitionFor(item({ status: "todo", assignee: "team" }), manager, REVIEW_ONLY, "done").ok).toBe(true);
    expect(transitionFor(item({ status: "todo", assignee: null }), manager, REVIEW_ONLY, "done").ok).toBe(true);
    expect(canCreate(manager, REVIEW_ONLY)).toBe(false);
    expect(transitionFor(item({ status: "review" }), manager, ENDED, "done").ok).toBe(false);
  });

  test("before the first day, the Independent's work waits while the Team Builder plans", () => {
    const soon = { ...OPEN, startsOn: "28 Sep 2026" };
    expect(transitionFor(item(), contributor, soon, "doing")).toEqual({ ok: false, reason: "The contract starts on 28 Sep 2026, so work opens then." });
    expect(canCreate(manager, soon)).toBe(true);
    expect(transitionFor(item({ assignee: "team" }), manager, soon, "doing").ok).toBe(true);
  });

  test("archived items and same-status moves are refused", () => {
    expect(transitionFor(item({ archivedAt: 1, assignee: "team" }), manager, OPEN, "done").ok).toBe(false);
    expect(transitionFor(item({ status: "doing" }), contributor, OPEN, "doing").ok).toBe(false);
  });

  test("drop targets follow the same rules", () => {
    expect(targetsFor(item({ status: "todo" }), contributor, OPEN)).toEqual(["doing", "review"]);
    expect(targetsFor(item({ status: "review" }), manager, OPEN)).toEqual(["doing", "done"]);
    expect(targetsFor(item({ status: "todo", assignee: "team" }), manager, OPEN)).toEqual(["doing", "done"]);
    expect(targetsFor(item(), viewer, OPEN)).toEqual([]);
  });
});

test.describe("capabilities · roles and contracts", () => {
  test("the Team Builder plans; the Independent doesn't", () => {
    const t = item();
    expect(capsFor(t, manager, OPEN)).toMatchObject({ plan: true, assign: true, editText: true, archive: true, comment: true });
    expect(capsFor(t, contributor, OPEN)).toMatchObject({ plan: false, assign: false, editText: false, archive: false, subtasks: true, tick: true, comment: true });
  });

  test("admins and ended contracts change nothing", () => {
    for (const caps of [capsFor(item(), viewer, OPEN), capsFor(item(), manager, ENDED), capsFor(item(), contributor, ENDED)]) expect(Object.values(caps).some(Boolean)).toBe(false);
    expect(canCreate(viewer, OPEN)).toBe(false);
    expect(canCreate(contributor, OPEN)).toBe(false);
    expect(canCreate(manager, OPEN)).toBe(true);
    expect(canCreate(manager, REVIEW_ONLY)).toBe(false);
    expect(canReorder(contributor, OPEN)).toBe(false);
    expect(readOnlyReason(viewer, OPEN)).toMatch(/read-only/);
    expect(readOnlyReason(manager, OPEN)).toBeNull();
  });
});

test.describe("capabilities · the item's state", () => {
  test("agreed items keep their wording and assignee", () => {
    const t = item({ agreed: true });
    expect(capsFor(t, manager, OPEN)).toMatchObject({ editText: false, assign: false, archive: false, plan: true });
  });

  test("the Independent's submitted or approved work can't be archived", () => {
    expect(capsFor(item({ status: "review" }), manager, OPEN).archive).toBe(false);
    expect(capsFor(item({ status: "done" }), manager, OPEN).archive).toBe(false);
    expect(capsFor(item({ status: "done", assignee: "team" }), manager, OPEN).archive).toBe(true);
  });

  test("Done items have a final plan", () => {
    expect(capsFor(item({ status: "done", assignee: "team" }), manager, OPEN).plan).toBe(false);
    expect(capsFor(item({ status: "done", assignee: "team" }), manager, OPEN).depend).toBe(false);
  });

  test("only whoever archived an item can restore it", () => {
    const t = item({ archivedAt: 1, addedBy: "team" });
    expect(capsFor(t, manager, OPEN).restore).toBe(true);
    expect(capsFor(t, contributor, OPEN).restore).toBe(false);
    expect(capsFor(t, manager, OPEN).plan).toBe(false);
  });
});

test.describe("capabilities · dependencies and start dates", () => {
  test("what work waits on: the Team Builder's on any item, the Independent's on their own", () => {
    expect(capsFor(item(), manager, OPEN).depend).toBe(true);
    expect(capsFor(item({ assignee: "team" }), manager, OPEN).depend).toBe(true);
    expect(capsFor(item(), contributor, OPEN).depend).toBe(true);
    expect(capsFor(item({ status: "review" }), contributor, OPEN).depend).toBe(true);
    // Someone else's item, finished work, or a closed contract: no.
    expect(capsFor(item({ assignee: "team" }), contributor, OPEN).depend).toBe(false);
    expect(capsFor(item({ assignee: null }), contributor, OPEN).depend).toBe(false);
    expect(capsFor(item({ status: "done" }), contributor, OPEN).depend).toBe(false);
    expect(capsFor(item(), contributor, REVIEW_ONLY).depend).toBe(false);
    // The rest of the plan stays the Team Builder's.
    expect(capsFor(item(), contributor, OPEN).plan).toBe(false);
  });

  test("when work starts: the Team Builder's on any open item, the Independent's on their own while they work it", () => {
    expect(capsFor(item({ assignee: "team" }), manager, OPEN).start).toBe(true);
    expect(capsFor(item({ status: "review" }), manager, OPEN).start).toBe(true);
    expect(capsFor(item(), contributor, OPEN).start).toBe(true);
    expect(capsFor(item({ status: "doing" }), contributor, OPEN).start).toBe(true);
    // Sent for review or done, someone else's, or a closed contract: no.
    expect(capsFor(item({ status: "review" }), contributor, OPEN).start).toBe(false);
    expect(capsFor(item({ status: "done" }), contributor, OPEN).start).toBe(false);
    expect(capsFor(item({ assignee: "team" }), contributor, OPEN).start).toBe(false);
    expect(capsFor(item(), contributor, REVIEW_ONLY).start).toBe(false);
    expect(capsFor(item({ status: "done", assignee: "team" }), manager, OPEN).start).toBe(false);
  });
});
