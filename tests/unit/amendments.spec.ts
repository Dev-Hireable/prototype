import { expect, test } from "@playwright/test";
import { createAgreementRepository, type AgreementNotice } from "../../src/lib/work/amendments";
import type { Role, WorkAccess } from "../../src/lib/work/permissions";
import { createWorkRepository } from "../../src/lib/work/repository";
import { firstVersion, type ContractScope, type ScopeChange } from "../../src/lib/work/scope";
import { clock, ENDED, item, iso, memoryStore, OPEN, rejection, REVIEW_ONLY, TRIAL } from "./fixtures";

const NAMES = { team: "Alex", independent: "Juan" };
const FULL = { team: "Alex Rivera", independent: "Juan Dela Cruz" };

/** A trial with three contract tasks agreed in v1, and one internal item of the Team Builder's. */
function setup(access: WorkAccess = TRIAL) {
  const items = [
    item({ id: "a", number: 1, title: "Landing page", description: "Build responsive landing page", due: iso(5), effort: 3, agreed: true, trial: true }),
    item({ id: "b", number: 2, title: "Brand kit", due: iso(10), agreed: true, trial: true }),
    item({ id: "c", number: 3, title: "Launch", type: "milestone", due: iso(20), agreed: true, trial: true }),
    item({ id: "own", number: 4, title: "Send the brand assets", assignee: "team" }),
  ];
  const v1 = firstVersion({ terms: { type: "trial", rate: "$2,000/mo", start: iso(0), end: iso(29), escrow: 2000 }, items, at: "24 Sep 2026, 9:00 AM", ts: 1 }, 2);
  const scope: ContractScope = { versions: [v1], amendments: [], log: [] };
  const store = memoryStore({ items, nextNumber: 5, scope }, access);
  const notices: { role: Role; n: AgreementNotice }[] = [];
  const as = (role: Role) => createAgreementRepository({ actor: { role, name: role === "manager" ? FULL.team : role === "contributor" ? FULL.independent : "Admin" }, port: store.port, clock: clock(), names: NAMES, notify: (n) => notices.push({ role, n }) });
  const work = (role: Role) => createWorkRepository({ actor: { role, name: role === "manager" ? FULL.team : FULL.independent }, port: store.port, clock: clock(), names: NAMES });
  return { store, notices, alex: as("manager"), juan: as("contributor"), admin: as("viewer"), work, scope: () => store.read().scope as ContractScope };
}

const stripe: ScopeChange = { id: "c1", kind: "add", task: { id: "t-stripe", title: "Integrate Stripe payment processing", due: iso(12), effort: 5 } };
const cms: ScopeChange = { id: "c2", kind: "change", taskId: "a", to: { description: "Build responsive landing page with CMS integration", due: iso(8) } };
const dropKit: ScopeChange = { id: "c3", kind: "remove", taskId: "b" };

test.describe("amendments · proposing", () => {
  test("either side proposes; the other is told, and nothing on the contract changes yet", async () => {
    const { store, notices, juan, scope } = setup();
    const a = await juan.propose({ id: "am1", reason: "The launch needs payments", changes: [stripe, cms] });
    expect(a).toMatchObject({ number: 1, base: 1, by: "independent", byName: "Juan Dela Cruz", status: "pending", revision: 1 });
    expect(store.read().items.map((t) => t.id)).toEqual(["a", "b", "c", "own"]);
    expect(store.get("a").description).toBe("Build responsive landing page");
    expect(scope().log.map((e) => [e.kind, e.name, e.version, e.amendment])).toEqual([["proposed", "Juan Dela Cruz", 1, 1]]);
    expect(scope().log[0].changes?.[1]).toMatchObject({ kind: "change", fields: [{ field: "description", was: "Build responsive landing page" }, { field: "due", was: iso(5), to: iso(8) }] });
    expect(notices).toEqual([{ role: "contributor", n: { kind: "proposed", to: "team", number: 1, by: "Juan Dela Cruz", summary: "adds 1 task and changes 1 task", note: "The launch needs payments" } }]);
  });

  test("one open at a time, a retry is harmless, and admins change nothing", async () => {
    const { store, alex, juan, admin } = setup();
    await alex.propose({ id: "am1", reason: "Scope", changes: [dropKit] });
    await alex.propose({ id: "am1", reason: "Scope", changes: [dropKit] });
    expect(store.writes()).toBe(1);
    expect((await rejection(juan.propose({ id: "am2", reason: "Mine", changes: [stripe] }))).message).toMatch(/^Amendment 1 is still open\. Answer Alex Rivera's first/);
    expect((await rejection(admin.propose({ id: "am3", reason: "x", changes: [stripe] }))).code).toBe("forbidden");
  });

  test("the rules are the backend's too: a closed trial, an ended contract, done work", async () => {
    for (const access of [REVIEW_ONLY, ENDED]) expect((await rejection(setup(access).juan.propose({ id: "x", reason: "Late", changes: [stripe] }))).code).toBe("forbidden");
    const { store, alex } = setup();
    store.port.transact((s) => ({ next: { ...s, items: s.items.map((t) => (t.id === "b" ? { ...t, status: "done" as const } : t)) }, result: null }));
    expect((await rejection(alex.propose({ id: "x", reason: "Drop it", changes: [dropKit] }))).message).toBe("#2 “Brand kit” is done, so what was delivered stands.");
  });
});

test.describe("amendments · answering", () => {
  test("accepting makes the next version, and the contract tasks change with it", async () => {
    const { store, notices, alex, juan, scope } = setup();
    const a = await juan.propose({ id: "am1", reason: "Payments and a lighter kit", changes: [stripe, cms, dropKit] });
    await alex.accept(a.id, { revision: 1 });
    const s = scope();
    expect(s.versions.map((v) => [v.version, v.source])).toEqual([[1, { kind: "offer", revision: 2 }], [2, { kind: "amendment", number: 1 }]]);
    expect(s.versions[1]).toMatchObject({ proposedBy: "independent", acceptedBy: "team", terms: { rate: "$2,000/mo" } });
    expect(s.versions[1].tasks.map((t) => t.title)).toEqual(["Landing page", "Launch", "Integrate Stripe payment processing"]);
    expect(s.versions[0].tasks.map((t) => t.title)).toEqual(["Landing page", "Brand kit", "Launch"]);
    expect(s.amendments[0]).toMatchObject({ status: "accepted", version: 2, answer: { by: "team", name: "Alex Rivera" } });
    expect(store.get("a")).toMatchObject({ description: "Build responsive landing page with CMS integration", due: iso(8), version: 2 });
    expect(store.get("a").activity[0].text).toBe(`Changed by Amendment 1 (contract v2): requirements updated, due date 30 Sep 2026 → 03 Oct 2026`);
    expect(store.get("b")).toMatchObject({ archivedBy: "Alex Rivera" });
    expect(store.get("t-stripe")).toMatchObject({ number: 5, agreed: true, trial: true, assignee: "independent", addedBy: "independent", status: "todo", due: iso(12), effort: 5 });
    expect(store.read().nextNumber).toBe(6);
    expect(notices.at(-1)).toEqual({ role: "manager", n: { kind: "accepted", to: "independent", number: 1, by: "Alex Rivera", summary: "adds 1 task, changes 1 task and removes 1 task", version: 2 } });
  });

  test("nobody answers their own; an answer names the revision it read", async () => {
    const { alex, juan } = setup();
    const a = await juan.propose({ id: "am1", reason: "Payments", changes: [stripe] });
    expect((await rejection(juan.accept(a.id, { revision: 1 }))).message).toBe("You proposed Amendment 1, so it's Alex's to answer.");
    await juan.revise(a.id, { reason: "Payments, sooner", changes: [{ ...stripe, task: { ...stripe.task, due: iso(9) } }], revision: 1 });
    const stale = await rejection(alex.accept(a.id, { revision: 1 }));
    expect(stale).toMatchObject({ code: "conflict", message: "Juan Dela Cruz revised Amendment 1 while you were reading it. Read the new version before you answer." });
    await alex.accept(a.id, { revision: 2 });
  });
});

test.describe("amendments · the other outcomes", () => {
  test("asking for changes sends it back to its proposer; they revise it and it waits again", async () => {
    const { alex, juan, scope } = setup();
    const a = await alex.propose({ id: "am1", reason: "Payments", changes: [stripe] });
    expect((await rejection(juan.askChanges(a.id, { revision: 1, note: " " }))).field).toBe("note");
    await juan.askChanges(a.id, { revision: 1, note: "Give it until week 3" });
    expect(scope().amendments[0]).toMatchObject({ status: "changes_requested", answer: { note: "Give it until week 3" } });
    expect((await rejection(juan.accept(a.id, { revision: 1 }))).message).toBe("Amendment 1 is back with Alex Rivera to revise.");
    const revised = await alex.revise(a.id, { reason: "Payments by week 3", changes: [{ ...stripe, task: { ...stripe.task, due: iso(15) } }], revision: 1 });
    expect(revised).toMatchObject({ status: "pending", revision: 2 });
    expect(revised).not.toHaveProperty("answer");
    expect(scope().log.map((e) => e.kind)).toEqual(["proposed", "changes_requested", "revised"]);
  });

  test("a rejection needs a reason; a withdrawn one is settled; the next can be proposed", async () => {
    const { alex, juan, scope } = setup();
    const a = await alex.propose({ id: "am1", reason: "Payments", changes: [stripe] });
    await juan.reject(a.id, { revision: 1, note: "Out of scope for a trial" });
    expect((await rejection(alex.withdraw(a.id, 1))).message).toBe("Amendment 1 was rejected.");
    const b = await alex.propose({ id: "am2", reason: "Just the CMS", changes: [cms] });
    await alex.withdraw(b.id, 1);
    expect(scope().amendments.map((x) => [x.number, x.status])).toEqual([[1, "rejected"], [2, "withdrawn"]]);
    expect(scope().versions).toHaveLength(1);
  });

  test("work finished while it waited can't change: accepting says why and changes nothing", async () => {
    const { store, alex, juan, scope } = setup();
    const a = await juan.propose({ id: "am1", reason: "A lighter kit", changes: [dropKit] });
    store.port.transact((s) => ({ next: { ...s, items: s.items.map((t) => (t.id === "b" ? { ...t, status: "review" as const } : t)) }, result: null }));
    expect((await rejection(alex.accept(a.id, { revision: 1 }))).message).toMatch(/^#2 “Brand kit” is waiting on review/);
    expect(scope().versions).toHaveLength(1);
    expect(store.get("b").archivedAt).toBeUndefined();
  });
});

test.describe("amendments · contract tasks on the list", () => {
  test("a contract task's agreed fields and its place on the list are locked; running the work isn't", async () => {
    const { work } = setup(OPEN);
    const alex = work("manager");
    for (const change of [{ title: "Home page" }, { due: iso(9) }, { effort: 8 }, { type: "design" as const }, { assignee: "team" as const }]) {
      expect((await rejection(alex.patch("a", change))).message).toBe("This task is part of an agreed contract. Changes to its scope require approval from both parties.");
    }
    expect((await rejection(alex.archive("a"))).message).toMatch(/part of an agreed contract/);
    await alex.patch("a", { priority: "high", start: iso(1) });
    await alex.addTag("a", "launch");
    await work("contributor").addSubtask("a", { id: "s1", title: "Hero section" });
  });

  test("on a trial the Team Builder adds internal items of their own, never the Independent's work", async () => {
    const { store, work } = setup();
    const alex = work("manager");
    const own = await alex.createInternal({ id: "n1", title: "Book the kickoff call" });
    expect(own).toMatchObject({ assignee: "team", trial: true });
    expect(own).not.toHaveProperty("agreed");
    expect((await rejection(alex.createInternal({ id: "n2", title: "More work", assignee: "independent" }))).message).toBe("On a trial, Juan's work is the tasks in the contract. Propose an amendment to add work for them.");
    expect((await rejection(alex.patch("own", { assignee: "independent" }))).message).toMatch(/On a trial, Juan's work/);
    await alex.patch("own", { assignee: null });
    expect((await rejection(work("contributor").createInternal({ id: "n3", title: "Mine" }))).code).toBe("forbidden");
    expect((await rejection(setup(OPEN).work("manager").createInternal({ id: "n4", title: "Role" }))).message).toMatch(/Add task/);
    expect(store.get("own").assignee).toBeNull();
  });

  test("a contract task keeps its agreed due date when it's finished", async () => {
    const { store, work } = setup(OPEN);
    store.port.transact((s) => ({ next: { ...s, items: s.items.map((t) => (t.id === "a" ? { ...t, status: "review" as const } : t)) }, result: null }));
    await work("manager").transition("a", { to: "done", from: "review" });
    expect(store.get("a")).toMatchObject({ status: "done", due: iso(5) });
    expect(store.get("a").activity[0].text).toBe("Finished on 25 Sep 2026 — the agreed due date was 30 Sep 2026");
  });
});
