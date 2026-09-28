import { expect, test } from "@playwright/test";
import { WorkError } from "../../src/lib/work/errors";
import { migrateItems } from "../../src/lib/work/migrate";
import type { Role } from "../../src/lib/work/permissions";
import { createWorkRepository, type WorkNotice } from "../../src/lib/work/repository";
import { clock, ENDED, item, iso, memoryStore, OPEN, rejection, REVIEW_ONLY, TRIAL } from "./fixtures";

const NAMES = { team: "Alex Rivera", independent: "Juan Dela Cruz" };

function setup(items = [item({ id: "a" }), item({ id: "b", assignee: "team" })], access = OPEN) {
  const store = memoryStore({ items, nextNumber: 50 }, access);
  const notices: { role: Role; n: WorkNotice }[] = [];
  const repo = (role: Role, name = role === "manager" ? NAMES.team : role === "contributor" ? NAMES.independent : "Admin") =>
    createWorkRepository({ actor: { role, name }, port: store.port, clock: clock(), names: { team: "Alex", independent: "Juan" }, notify: (n) => notices.push({ role, n }) });
  return { store, notices, alex: repo("manager"), juan: repo("contributor"), admin: repo("viewer"), repo };
}

test.describe("create", () => {
  test("the Team Builder adds work, numbered and assigned to the Independent by default", async () => {
    const { store, notices, alex } = setup([]);
    const t = await alex.create({ id: "n1", title: "  Draft the FAQ ", due: iso(5), effort: 3 });
    expect(t).toMatchObject({ id: "n1", number: 50, title: "Draft the FAQ", status: "todo", assignee: "independent", type: "task", version: 1, createdBy: "Alex Rivera", addedBy: "team" });
    expect(t).not.toHaveProperty("trial");
    expect(t.activity[0].text).toBe("Added by Alex Rivera");
    expect(store.read().nextNumber).toBe(51);
    expect(notices).toEqual([{ role: "manager", n: { kind: "task_added", task: { id: "n1", title: "Draft the FAQ" } } }]);
  });

  test("a retry with the same id doesn't make a second item", async () => {
    const { store, alex } = setup([]);
    await alex.create({ id: "n1", title: "Once" });
    await alex.create({ id: "n1", title: "Once" });
    expect(store.read().items).toHaveLength(1);
    expect(store.writes()).toBe(1);
  });

  test("the Team Builder's own items don't notify anyone", async () => {
    const { notices, alex } = setup([]);
    await alex.create({ id: "n1", title: "Prepare the kickoff", assignee: "team" });
    await alex.create({ id: "n2", title: "Someone should", assignee: null });
    expect(notices).toEqual([]);
  });

  test("only the Team Builder, only while the contract is open, only valid work", async () => {
    const { store, juan, admin, alex } = setup([]);
    expect((await rejection(juan.create({ id: "x", title: "Mine" }))).code).toBe("forbidden");
    expect((await rejection(admin.create({ id: "x", title: "Mine" }))).code).toBe("forbidden");
    expect((await rejection(alex.create({ id: "x", title: "   " }))).code).toBe("validation");
    expect((await rejection(alex.create({ id: "x", title: "Late", due: iso(-1) }))).message).toMatch(/past/);
    expect((await rejection(alex.create({ id: "x", title: "Backwards", start: iso(4), due: iso(2) }))).field).toBe("due");
    expect(store.read().items).toEqual([]);
    const closed = setup([], REVIEW_ONLY);
    expect((await rejection(closed.alex.create({ id: "x", title: "After the trial" }))).message).toBe("The trial has closed.");
  });

  test("a trial takes no new work — its tasks were agreed in the signed offer", async () => {
    const { store, notices, alex, juan } = setup([item({ id: "a", agreed: true, trial: true })], TRIAL);
    for (const input of [{ id: "x", title: "One more logo" }, { id: "y", title: "Kickoff call", assignee: "team" as const }]) {
      const e = await rejection(alex.create(input));
      expect(e).toMatchObject({ code: "forbidden", message: "The trial's tasks were agreed in the signed offer, so no more can be added." });
    }
    expect((await rejection(juan.create({ id: "z", title: "Mine" }))).code).toBe("forbidden");
    expect(store.read().items.map((t) => t.id)).toEqual(["a"]);
    expect(store.writes()).toBe(0);
    expect(notices).toEqual([]);
  });

  test("can be placed between two items", async () => {
    const { store, alex } = setup([item({ id: "p", order: 1024 }), item({ id: "q", order: 2048 })]);
    await alex.create({ id: "n", title: "Between", after: "p", before: "q" });
    expect(store.get("n").order).toBe(1536);
  });
});

test.describe("patch · what gets saved", () => {
  test("stamps the change and bumps the version", async () => {
    const { store, alex } = setup();
    const t = await alex.patch("a", { due: iso(3), priority: "high", effort: 5 }, { due: undefined, priority: undefined, effort: undefined });
    expect(t).toMatchObject({ due: iso(3), priority: "high", effort: 5, version: 2, updatedBy: "Alex Rivera", updatedAt: 1_000_000 });
    // Newest first; one save's lines share a timestamp, so the feed shows them in the order they were made.
    expect(t.activity.map((e) => e.text)).toEqual(["Effort set to 5 by Alex Rivera", "Priority set to High by Alex Rivera", "Due date set to 28 Sep 2026 by Alex Rivera"]);
    expect(store.get("a").version).toBe(2);
  });

  test("clearing a field removes it", async () => {
    const { store, alex } = setup([item({ id: "a", due: iso(3), effort: 2 })]);
    await alex.patch("a", { due: null, effort: null });
    expect(store.get("a").due).toBeUndefined();
    expect(store.get("a").effort).toBeUndefined();
  });

  test("a change to the same value writes nothing", async () => {
    const { store, alex } = setup([item({ id: "a", priority: "low" })]);
    await alex.patch("a", { priority: "low" });
    expect(store.writes()).toBe(0);
  });

  test("two people editing: different fields merge, the same field conflicts", async () => {
    const { store, repo } = setup();
    const tabA = repo("manager", "Alex Rivera");
    const tabB = repo("manager", "Alex (laptop)");
    const seen = store.get("a"); // both tabs loaded the same version
    await tabA.patch("a", { due: iso(3) }, { due: seen.due });
    // B changes the priority it saw — nobody else touched it, so it merges.
    await tabB.patch("a", { priority: "high" }, { priority: seen.priority });
    expect(store.get("a")).toMatchObject({ due: iso(3), priority: "high", version: 3 });
    // B changes the due date from a stale screen — A changed it, so it's refused, nothing written.
    const e = await rejection(tabB.patch("a", { due: iso(7) }, { due: seen.due }));
    expect(e.code).toBe("conflict");
    expect(e.conflict).toMatchObject({ field: "due", yours: iso(7), theirs: iso(3), by: "Alex (laptop)" });
    expect(store.get("a").due).toBe(iso(3));
    // "Use mine": resend against what's saved now.
    await tabB.patch("a", { due: iso(7) }, { due: store.get("a").due });
    expect(store.get("a").due).toBe(iso(7));
  });
});

test.describe("patch · who may change what", () => {
  test("the Independent can't change the plan, even calling the API directly", async () => {
    const { store, juan } = setup();
    const before = JSON.stringify(store.read());
    const e = await rejection(juan.patch("a", { due: iso(3) }));
    expect(e).toBeInstanceOf(WorkError);
    expect(e.code).toBe("forbidden");
    expect(e.message).toMatch(/plans the work/);
    expect(JSON.stringify(store.read())).toBe(before);
  });

  test("the Independent sets when their own open work starts, and nothing else", async () => {
    const { store, juan } = setup([item({ id: "a", start: iso(2), due: iso(8) }), item({ id: "b", assignee: "team" }), item({ id: "r", status: "review", start: iso(1) })]);
    await juan.patch("a", { start: iso(4) });
    expect(store.get("a")).toMatchObject({ start: iso(4), due: iso(8) });
    expect(store.get("a").activity[0].text).toBe("Start date set to 29 Sep 2026 by Juan Dela Cruz");
    expect((await rejection(juan.patch("a", { start: iso(3), due: iso(9) }))).message).toMatch(/plans the work/);
    expect((await rejection(juan.patch("a", { start: iso(9) }))).field).toBe("due");
    expect((await rejection(juan.patch("b", { start: iso(1) }))).message).toMatch(/isn't yours/);
    expect((await rejection(juan.patch("r", { start: iso(2) }))).message).toMatch(/sent for review/);
  });

  test("nothing changes on an ended contract or for an admin", async () => {
    const ended = setup(undefined, ENDED);
    expect((await rejection(ended.alex.patch("a", { priority: "high" }))).code).toBe("forbidden");
    const { admin } = setup();
    expect((await rejection(admin.patch("a", { priority: "high" }))).message).toMatch(/Admins/);
  });

  test("agreed items keep their wording", async () => {
    const { alex } = setup([item({ id: "a", agreed: true })]);
    expect((await rejection(alex.patch("a", { title: "Renamed" }))).message).toMatch(/agreed/);
  });
});

// TB-077 — a task from the signed offer keeps what the offer set, and is otherwise planned like any other.
test.describe("patch · a task from the signed offer", () => {
  const AGREED = "It was agreed in the signed offer, so it stays as agreed.";

  test("what the offer set stays; effort, work type and tags are planned as on any task", async () => {
    const { store, alex, juan } = setup([item({ id: "a", title: "Pick a pairing", agreed: true, trial: true, due: iso(5), priority: "high" })], TRIAL);
    for (const change of [{ title: "Renamed" }, { description: "More to do" }, { due: iso(6) }, { priority: "low" as const }, { assignee: "team" as const }]) expect((await rejection(alex.patch("a", change))).message).toBe(AGREED);
    expect((await rejection(alex.archive("a"))).message).toBe(AGREED);
    await alex.patch("a", { effort: 5, type: "design" });
    await alex.addTag("a", "brand");
    expect(store.get("a")).toMatchObject({ title: "Pick a pairing", due: iso(5), priority: "high", effort: 5, type: "design", tags: ["brand"] });
    // The Independent still doesn't plan, and is told so — not that the tags were agreed.
    expect((await rejection(juan.addTag("a", "mine"))).message).toMatch(/plans the work/);
  });

  test("finishing keeps the agreed due date while the trial runs, and not once it has converted", async () => {
    const agreed = () => [item({ id: "a", agreed: true, trial: true, status: "review", due: iso(5) })];
    const onTrial = setup(agreed(), TRIAL);
    await onTrial.alex.transition("a", { to: "done" });
    expect(onTrial.store.get("a").due).toBe(iso(5));
    expect(onTrial.store.get("a").activity[0].text).toBe("Finished on 25 Sep 2026 — the agreed due date was 30 Sep 2026");
    // Converted, it's the role's work: its due date moves, and finishing ends it today.
    const converted = setup(agreed(), OPEN);
    await converted.alex.patch("a", { due: iso(7) });
    await converted.alex.transition("a", { to: "done" });
    expect(converted.store.get("a").due).toBe(iso(0));
  });
});

test.describe("patch · type and assignee", () => {
  test("milestones need their start and effort cleared in the same change", async () => {
    const { store, alex } = setup([item({ id: "a", start: iso(1), due: iso(4), effort: 3 })]);
    expect((await rejection(alex.patch("a", { type: "milestone" }))).code).toBe("validation");
    await alex.patch("a", { type: "milestone", start: null, effort: null });
    expect(store.get("a")).toMatchObject({ type: "milestone", due: iso(4) });
  });

  test("unassigning saves null, which reads back as unassigned — not as the Independent", async () => {
    const { store, alex } = setup();
    await alex.patch("a", { assignee: null });
    expect(store.get("a")).toHaveProperty("assignee", null);
    expect(migrateItems(store.read().items).items.find((t) => t.id === "a")?.assignee).toBeNull();
  });

  test("reassigning to the Independent tells them", async () => {
    const { notices, alex } = setup();
    await alex.patch("b", { assignee: "independent" });
    expect(notices.map((x) => x.n.kind)).toEqual(["task_added"]);
  });
});

test.describe("status · the review loop", () => {
  test("the Independent submits; the Team Builder approves; each hears about it", async () => {
    const { store, notices, alex, juan } = setup([item({ id: "a", status: "doing" })]);
    const sent = await juan.transition("a", { to: "review", from: "doing", note: "Two options inside" });
    expect(sent).toMatchObject({ status: "review", submitted: { at: "25 Sep 2026, 9:00 AM", note: "Two options inside" } });
    expect(store.read().logs["2026-09-25"]).toEqual(["done:a"]);
    const done = await alex.transition("a", { to: "done", from: "review" });
    expect(done).toMatchObject({ status: "done", approved: { by: "Alex Rivera" }, completedBy: "Alex Rivera" });
    expect(notices.map((x) => [x.role, x.n.kind])).toEqual([
      ["contributor", "task_submitted"],
      ["manager", "task_approved"],
    ]);
  });

  test("asking for changes needs a note", async () => {
    const { store, alex } = setup([item({ id: "a", status: "review" })]);
    expect((await rejection(alex.transition("a", { to: "doing", from: "review" }))).code).toBe("validation");
    await alex.transition("a", { to: "doing", from: "review", note: "Use the brand blue" });
    expect(store.get("a")).toMatchObject({ status: "doing", changes: { note: "Use the brand blue", by: "Alex Rivera" } });
    expect(store.get("a").submitted).toBeUndefined();
  });
});

test.describe("status · stale and repeated moves", () => {
  test("a move made on a stale screen is refused", async () => {
    const { store, alex, juan } = setup([item({ id: "a", status: "review" })]);
    await juan.transition("a", { to: "doing", from: "review" }); // Juan takes it back
    const e = await rejection(alex.transition("a", { to: "done", from: "review" }));
    expect(e.code).toBe("conflict");
    expect(e.message).toMatch(/In progress/);
    expect(store.get("a").status).toBe("doing");
  });

  test("asking for the status it already has succeeds without writing", async () => {
    const { store, juan } = setup([item({ id: "a", status: "doing" })]);
    await juan.transition("a", { to: "doing", from: "todo" });
    expect(store.writes()).toBe(0);
  });
});

test.describe("status · who moves what", () => {
  test("the Team Builder's own items go straight to Done, and reopen", async () => {
    const { store, alex } = setup();
    await alex.transition("b", { to: "done", from: "todo" });
    expect(store.get("b")).toMatchObject({ status: "done", completedBy: "Alex Rivera" });
    await alex.transition("b", { to: "todo", from: "done" });
    expect(store.get("b").completedAt).toBeUndefined();
    expect((await rejection(alex.transition("b", { to: "review" }))).code).toBe("forbidden");
  });

  test("nobody else moves the Independent's work, and they can't approve it", async () => {
    const { alex, juan, admin } = setup([item({ id: "a", status: "todo" }), item({ id: "r", status: "review" })]);
    expect((await rejection(alex.transition("a", { to: "doing" }))).message).toMatch(/Juan moves their own work/);
    expect((await rejection(juan.transition("r", { to: "done" }))).message).toMatch(/Only Alex/);
    expect((await rejection(admin.transition("a", { to: "doing" }))).code).toBe("forbidden");
  });
});

test.describe("status · start and finish dates", () => {
  test("starting the work starts it today, unless it already started earlier", async () => {
    const { store, juan } = setup([item({ id: "a", start: iso(4), due: iso(9) }), item({ id: "b", start: iso(-3), due: iso(9) }), item({ id: "c" }), item({ id: "late", due: iso(-2) }), item({ id: "m", type: "milestone", due: iso(5) })]);
    await juan.transition("a", { to: "doing", from: "todo" });
    expect(store.get("a")).toMatchObject({ start: iso(0), due: iso(9) });
    expect(store.get("a").activity.map((e) => e.text)).toEqual(["Start date set to 25 Sep 2026 as the work began", "Moved to In progress by Juan Dela Cruz"]);
    await juan.transition("b", { to: "doing", from: "todo" });
    expect(store.get("b").start).toBe(iso(-3));
    await juan.transition("c", { to: "doing", from: "todo" });
    expect(store.get("c").start).toBe(iso(0));
    // Overdue: a start today would come after its due date. A milestone is one planned date.
    await juan.transition("late", { to: "doing", from: "todo" });
    expect(store.get("late").start).toBeUndefined();
    await juan.transition("m", { to: "doing", from: "todo" });
    expect(store.get("m").start).toBeUndefined();
  });

  test("approving the work ends it today, and the feed keeps the due date it had", async () => {
    const { store, alex } = setup([item({ id: "a", status: "review", start: iso(-6), due: iso(3) }), item({ id: "b", assignee: "team", start: iso(2), due: iso(5) }), item({ id: "m", status: "review", type: "milestone", due: iso(4) })]);
    await alex.transition("a", { to: "done", from: "review" });
    expect(store.get("a")).toMatchObject({ status: "done", start: iso(-6), due: iso(0) });
    expect(store.get("a").activity[0].text).toBe("Finished on 25 Sep 2026 (was due 28 Sep 2026)");
    // Done before it was due to start: it started and ended today.
    await alex.transition("b", { to: "done", from: "todo" });
    expect(store.get("b")).toMatchObject({ start: iso(0), due: iso(0) });
    await alex.transition("m", { to: "done", from: "review" });
    expect(store.get("m").due).toBe(iso(4));
  });
});

test.describe("move", () => {
  test("a board drop changes status and place in one write", async () => {
    const { store, alex } = setup([item({ id: "x", order: 1024 }), item({ id: "r", status: "review", order: 2048 }), item({ id: "y", order: 3072 })]);
    await alex.move("r", { status: "done", from: "review", after: undefined, before: "x" });
    expect(store.get("r")).toMatchObject({ status: "done", order: 0 });
    expect(store.writes()).toBe(1);
  });

  test("dropping on another group sets that field", async () => {
    const { store, alex } = setup();
    await alex.move("a", { set: { assignee: "team" }, base: { assignee: "independent" } });
    expect(store.get("a").assignee).toBe("team");
  });

  test("only the Team Builder reorders", async () => {
    const { juan } = setup([item({ id: "x", order: 1 }), item({ id: "y", order: 2 })]);
    expect((await rejection(juan.move("y", { before: "x" }))).message).toMatch(/order/);
  });
});

test.describe("archive", () => {
  test("archive over delete: gone from changes until restored", async () => {
    const { store, alex } = setup();
    await alex.archive("a");
    expect(store.get("a").archivedAt).toBe(1_000_000);
    expect((await rejection(alex.patch("a", { priority: "high" }))).code).toBe("not_found");
    await alex.restore("a");
    expect(store.get("a").archivedAt).toBeUndefined();
    expect(store.get("a").activity.map((e) => e.text)).toEqual(["Restored by Alex Rivera", "Deleted by Alex Rivera"]);
  });

  test("the Independent's submitted work, and other people's items, can't be archived", async () => {
    const { alex, juan } = setup([item({ id: "r", status: "review" }), item({ id: "m", addedBy: "team" })]);
    expect((await rejection(alex.archive("r"))).code).toBe("forbidden");
    expect((await rejection(juan.archive("m"))).code).toBe("forbidden");
  });
});

test.describe("dependencies and tags · dependencies", () => {
  test("dependencies add, refuse loops, and remove", async () => {
    const { store, alex } = setup([item({ id: "a" }), item({ id: "b" }), item({ id: "c" })]);
    await alex.addDependency("b", "a");
    await alex.addDependency("c", "b");
    const loop = await rejection(alex.addDependency("a", "c"));
    expect(loop.code).toBe("validation");
    expect(loop.message).toMatch(/loop/);
    expect((await rejection(alex.addDependency("a", "a"))).message).toMatch(/itself/);
    await alex.addDependency("b", "a"); // already there — fine, no write
    await alex.removeDependency("c", "b");
    expect(store.get("c").dependsOn).toEqual([]);
    expect(store.get("b").dependsOn).toEqual(["a"]);
  });

  test("the Independent says what their own work waits on — not anyone else's", async () => {
    const { store, juan } = setup([item({ id: "a" }), item({ id: "b" }), item({ id: "k", assignee: "team" })]);
    await juan.addDependency("a", "k");
    expect(store.get("a").dependsOn).toEqual(["k"]);
    expect(store.get("a").activity[0].text).toMatch(/— set by Juan Dela Cruz$/);
    await juan.removeDependency("a", "k");
    expect(store.get("a").dependsOn).toEqual([]);
    const theirs = await rejection(juan.addDependency("k", "a"));
    expect(theirs.code).toBe("forbidden");
    expect(theirs.message).toBe("It isn't yours to work on, so Alex says what it waits on.");
    expect(store.get("k").dependsOn).toEqual([]);
    // Loops are refused for them as for anyone.
    await juan.addDependency("a", "b");
    expect((await rejection(juan.addDependency("b", "a"))).message).toMatch(/loop/);
  });
});

test.describe("dependencies and tags · tags", () => {
  test("tags are normalised and limited", async () => {
    const { store, alex } = setup();
    await alex.addTag("a", " Q3 Launch ");
    await alex.addTag("a", "q3-launch");
    expect(store.get("a").tags).toEqual(["q3-launch"]);
    for (const t of ["b", "c", "d", "e", "f", "g", "h"]) await alex.addTag("a", t);
    expect((await rejection(alex.addTag("a", "one-too-many"))).message).toMatch(/up to 8/);
    await alex.removeTag("a", "q3-launch");
    expect(store.get("a").tags).not.toContain("q3-launch");
  });

  test("a tag's colour is set once for the contract, by whoever may tag the item — the Team Builder", async () => {
    const { store, alex, juan, admin } = setup([item({ id: "a", tags: ["design"] }), item({ id: "k", assignee: "team", tags: ["design"] })]);
    const writes = store.writes();
    const before = store.get("a").version;
    await alex.setTagColor("a", "design", "teal");
    expect(store.read().tagColors).toEqual({ design: "teal" });
    // It's the contract's, not the item's: nothing logged on it, no version bump.
    expect(store.get("a").version).toBe(before);
    await alex.setTagColor("a", "design", "teal"); // already teal — no write
    expect(store.writes()).toBe(writes + 1);
    // Tags are planning, like dates and priority: the Independent and the admin can't colour them.
    expect((await rejection(juan.setTagColor("a", "design", "red"))).code).toBe("forbidden");
    expect((await rejection(admin.setTagColor("a", "design", "red"))).code).toBe("forbidden");
    // From any item that carries it — here the Team Builder's own.
    await alex.setTagColor("k", "design", "orange");
    expect(store.read().tagColors).toEqual({ design: "orange" });
    // Only a tag the item carries, only a colour from the palette.
    expect((await rejection(alex.setTagColor("a", "missing", "red"))).code).toBe("not_found");
    expect((await rejection(alex.setTagColor("a", "design", "chartreuse" as never))).code).toBe("validation");
    expect(store.read().tagColors).toEqual({ design: "orange" });
  });
});

test.describe("subtasks and comments", () => {
  test("the Independent breaks their work down and ticks it off", async () => {
    const { store, alex, juan } = setup();
    await juan.addSubtask("a", { id: "s1", title: "Sketch" });
    await juan.toggleSubtask("a", "s1", true);
    await juan.toggleSubtask("a", "s1", true); // already done — no write
    expect(store.get("a").subtasks).toEqual([{ id: "s1", title: "Sketch", done: true }]);
    expect(await rejection(alex.toggleSubtask("a", "s1", false))).toMatchObject({ code: "forbidden", message: "Whoever does the work ticks its subtasks off." });
    expect((await rejection(juan.addSubtask("b", { id: "s2", title: "Not mine" }))).code).toBe("forbidden");
    expect(store.read().logs["2026-09-25"]).toEqual(["a"]);
  });

  test("both sides comment while the contract runs; admins don't", async () => {
    const { store, alex, juan, admin } = setup();
    await juan.comment("a", { id: "c1", text: "Question about the brief" });
    await alex.comment("a", { id: "c2", text: "Answered in the doc" });
    await alex.comment("a", { id: "c2", text: "Answered in the doc" });
    expect(store.get("a").comments.map((c) => [c.side, c.text])).toEqual([
      ["independent", "Question about the brief"],
      ["team", "Answered in the doc"],
    ]);
    expect((await rejection(admin.comment("a", { id: "c3", text: "Hi" }))).code).toBe("forbidden");
  });

  test("a comment tells the other side, once, and only once it's saved", async () => {
    const { store, notices, alex, juan } = setup([item({ id: "a", title: "Logo" }), item({ id: "b", title: "Kickoff", assignee: "team" }), item({ id: "d", title: "Moodboard", assignee: null })]);
    await juan.comment("a", { id: "c1", text: "  Question about the brief  " });
    // Juan's own item: he hears about it.
    await alex.comment("a", { id: "c2", text: "Answered in the doc" });
    await alex.comment("a", { id: "c2", text: "Answered in the doc" }); // a retry of a saved comment says nothing twice
    // Not assigned to Juan — the Team Builder's own item, or nobody's: he can read it, but isn't told.
    await alex.comment("b", { id: "c3", text: "Moved to Tuesday" });
    await alex.comment("d", { id: "c4", text: "Parking this" });
    // The Team Builder hears about every comment Juan leaves, on any item.
    await juan.comment("b", { id: "c5", text: "Tuesday works" });
    expect(notices).toEqual([
      { role: "contributor", n: { kind: "task_comment", from: "independent", task: { id: "a", title: "Logo" }, note: "Question about the brief" } },
      { role: "manager", n: { kind: "task_comment", from: "team", task: { id: "a", title: "Logo" }, note: "Answered in the doc" } },
      { role: "contributor", n: { kind: "task_comment", from: "independent", task: { id: "b", title: "Kickoff" }, note: "Tuesday works" } },
    ]);
    store.failNextSave();
    expect((await rejection(juan.comment("a", { id: "c6", text: "Lost" }))).code).toBe("storage");
    expect(notices).toHaveLength(3);
    expect(store.get("a").comments.map((c) => c.id)).toEqual(["c1", "c2"]);
  });
});

test.describe("failures", () => {
  test("a failed save leaves nothing behind and tells nobody", async () => {
    const { store, notices, juan } = setup([item({ id: "a", status: "doing" })]);
    store.failNextSave();
    const e = await rejection(juan.transition("a", { to: "review" }));
    expect(e.code).toBe("storage");
    expect(store.get("a").status).toBe("doing");
    expect(notices).toEqual([]);
    // The same request goes through once saving works again.
    await juan.transition("a", { to: "review" });
    expect(store.get("a").status).toBe("review");
  });

  test("the test hook runs first, and a failure there writes nothing", async () => {
    const store = memoryStore({ items: [item({ id: "a" })] });
    const repo = createWorkRepository({
      actor: { role: "manager", name: "Alex" },
      port: store.port,
      clock: clock(),
      hook: () => {
        throw new WorkError("storage", "Injected failure");
      },
    });
    expect((await rejection(repo.patch("a", { priority: "high" }))).message).toBe("Injected failure");
    expect(store.writes()).toBe(0);
  });

  test("missing items read as not found", async () => {
    const { alex } = setup();
    expect((await rejection(alex.patch("nope", { priority: "high" }))).code).toBe("not_found");
  });
});
