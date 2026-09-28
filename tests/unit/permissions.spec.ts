import { expect, test } from "@playwright/test";
import { taskFromOffer, type PlannedTask } from "../../src/lib/demo/tasks";
import type { WorkStatus } from "../../src/lib/work/model";
import { AGREED, AGREED_FIELDS, canCreate, canReorder, capsFor, changeFor, readOnlyReason, targetsFor, tickRefusal, transitionFor, type Role, type WorkField } from "../../src/lib/work/permissions";
import { ENDED, item, iso, OPEN, REVIEW_ONLY, TRIAL } from "./fixtures";

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

  test("a trial takes no new work: its tasks are the ones its signed offer agreed", () => {
    expect(canCreate(manager, TRIAL)).toBe(false);
    expect(canCreate(contributor, TRIAL)).toBe(false);
    expect(canCreate(manager, { ...TRIAL, startsOn: "28 Sep 2026" })).toBe(false);
    // The agreed tasks are still planned, and still keep their wording.
    expect(capsFor(item({ agreed: true, trial: true }), manager, TRIAL)).toMatchObject({ plan: true, editText: false, archive: false });
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

// TB-075 / IN-041 — whoever does the work ticks its subtasks off; a box anyone else sees says why,
// in the words the repository refuses with.
test.describe("subtasks · who ticks them off", () => {
  const WORKER = "Whoever does the work ticks its subtasks off.";
  const LOCKED = "Its subtasks are locked while it's in review or done.";

  test("whoever does the work, while they work it; anyone else hears why", () => {
    expect(tickRefusal(item({ status: "doing" }), contributor, OPEN)).toBeNull();
    expect(tickRefusal(item({ status: "doing", assignee: "team" }), manager, OPEN)).toBeNull();
    expect(tickRefusal(item({ status: "doing" }), manager, OPEN)).toBe(WORKER);
    expect(tickRefusal(item({ assignee: "team" }), contributor, OPEN)).toBe(WORKER);
    expect(tickRefusal(item({ assignee: null }), contributor, OPEN)).toBe(WORKER);
    for (const status of ["review", "done"] as const) {
      expect(tickRefusal(item({ status }), contributor, OPEN), status).toBe(LOCKED);
      expect(tickRefusal(item({ status }), manager, OPEN), status).toBe(LOCKED);
    }
    expect(tickRefusal(item({ status: "done", assignee: "team" }), manager, OPEN)).toBe(LOCKED);
  });

  test("an admin, a deleted item and a closed contract say that instead", () => {
    expect(tickRefusal(item(), viewer, OPEN)).toBe("Admins can see this workspace but can't change it.");
    expect(tickRefusal(item({ archivedAt: 1 }), contributor, OPEN)).toBe("It's deleted. Restore it to change it.");
    expect(tickRefusal(item(), contributor, REVIEW_ONLY)).toBe("The trial has closed.");
    expect(tickRefusal(item(), contributor, ENDED)).toBe("This contract has ended.");
  });

  test("there's a reason exactly when capsFor won't let them tick", () => {
    for (const actor of [manager, contributor, viewer])
      for (const access of [OPEN, TRIAL, REVIEW_ONLY, ENDED])
        for (const status of ["todo", "doing", "review", "done"] as const)
          for (const assignee of ["independent", "team", null] as const) {
            const t = item({ status, assignee });
            expect(tickRefusal(t, actor, access) === null, `${actor.role} · ${status} · ${assignee}`).toBe(capsFor(t, actor, access).tick);
          }
  });
});

/** Every field a person changes on an item, and whether the signed offer sets it. */
const FIELDS: WorkField[] = ["title", "description", "type", "priority", "assignee", "start", "due", "effort", "project", "tags"];
const offerSets = (f: WorkField) => (AGREED_FIELDS as readonly WorkField[]).includes(f);

// TB-077 — a task from the signed offer is an ordinary task minus what the offer set.
test.describe("fields · what the signed offer agreed", () => {
  test("what the trial post sets of a task is exactly what its signed offer locks", () => {
    const signed = (plan: PlannedTask) => taskFromOffer({ id: "t1", ...plan }, 0, "2026-09-21", { trialEnd: "2026-10-30", created: "21 Sep 2026", name: "Alex" });
    const bare = signed({ title: "Draft two logo directions" });
    const full = signed({ title: "Draft two logo directions", description: "On light and dark", priority: "high", week: 2 });
    // What a plan sets: the fields filling it in changes, and the name every task has…
    const set = FIELDS.filter((f) => f === "title" || JSON.stringify(bare[f]) !== JSON.stringify(full[f]));
    // …and who does it: the offer is made to the Independent. A field added to the plan fails here until it's locked.
    expect([...set, "assignee"].sort()).toEqual([...AGREED_FIELDS].sort());
    expect(full).toMatchObject({ agreed: true, trial: true, assignee: "independent" });
  });

  test("agreement takes away exactly the agreed fields — for both sides, on a trial and on a role", () => {
    for (const actor of [manager, contributor]) {
      for (const access of [TRIAL, OPEN]) {
        for (const f of FIELDS) {
          // A role's own offer is agreed without being a trial's (a trial's lets go once it converts).
          const base = item({ start: iso(1), due: iso(5) });
          const was = changeFor(base, actor, access, f).ok;
          const now = changeFor({ ...base, agreed: true }, actor, access, f);
          expect(now.ok, `${actor.role} · ${access.trial ? "trial" : "role"} · ${f}`).toBe(was && !offerSets(f));
          if (offerSets(f)) expect(now).toEqual({ ok: false, reason: AGREED, agreed: true });
        }
      }
    }
  });

  test("the Team Builder plans what the offer didn't set; the Independent still doesn't, and hears why", () => {
    const t = item({ agreed: true, trial: true });
    for (const f of ["effort", "type", "tags", "start"] as const) expect(changeFor(t, manager, TRIAL, f).ok, f).toBe(true);
    for (const f of ["effort", "type", "tags"] as const) expect(changeFor(t, contributor, TRIAL, f, { team: "Alex", independent: "Juan" })).toEqual({ ok: false, reason: "Alex plans the work — the due dates, effort, work type, priority, tags and who does it.", agreed: false });
    // When their own work starts is theirs, agreed or not.
    expect(changeFor(t, contributor, TRIAL, "start").ok).toBe(true);
  });

  test("a trial's agreement ends when it converts: what it left open is the role's work", () => {
    const t = item({ agreed: true, trial: true });
    expect(capsFor(t, manager, TRIAL)).toMatchObject({ editText: false, assign: false, archive: false });
    // Converted, the contract isn't a trial any more.
    expect(capsFor(t, manager, OPEN)).toMatchObject({ editText: true, assign: true, archive: true });
    for (const f of AGREED_FIELDS) expect(changeFor(t, manager, OPEN, f).ok, f).toBe(true);
    // A role's own offer keeps its terms for as long as the role runs.
    expect(changeFor({ ...t, trial: undefined }, manager, OPEN, "due")).toEqual({ ok: false, reason: AGREED, agreed: true });
  });

  test("an admin, a deleted item and a closed trial say why — never that it was agreed", () => {
    const t = item({ agreed: true, trial: true });
    expect(changeFor(t, viewer, TRIAL, "due")).toEqual({ ok: false, reason: "Admins can see this workspace but can't change it.", agreed: false });
    expect(changeFor({ ...t, archivedAt: 1 }, manager, TRIAL, "effort")).toMatchObject({ ok: false, agreed: false });
    expect(changeFor(t, manager, REVIEW_ONLY, "due")).toEqual({ ok: false, reason: "The trial has closed.", agreed: false });
  });
});
