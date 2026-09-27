import { expect, test } from "@playwright/test";
import { indexById } from "../../src/lib/work/model";
import { amendmentMoves, applyChanges, changeLine, changesSummary, checkAmendment, nextMonthStart, resolveChanges, restoreChanges, scopeTaskOf, type AmendmentContext, type ContractVersion, type ScopeChange, type ScopeTask } from "../../src/lib/work/scope";
import { wordDiff } from "../../src/lib/work/word-diff";
import { item, iso, TODAY } from "./fixtures";

const V1: ContractVersion = {
  version: 1,
  agreedAt: "25 Sep 2026, 9:00 AM",
  agreedTs: 1,
  source: { kind: "offer", revision: 2 },
  proposedBy: "team",
  acceptedBy: "independent",
  terms: { type: "trial", rate: "$2,000/mo", start: iso(0), end: iso(29), escrow: 2000 },
  tasks: [
    { id: "a", title: "Landing page", description: "Build responsive landing page", due: iso(5), effort: 3 },
    { id: "b", title: "Brand kit", due: iso(10) },
    { id: "c", title: "Launch", due: iso(20), milestone: true },
  ],
};

const items = (over: Record<string, Parameters<typeof item>[0]> = {}) =>
  indexById(V1.tasks.map((t, i) => item({ id: t.id, number: i + 1, title: t.title, agreed: true, trial: true, ...(t.milestone ? { type: "milestone" } : {}), ...over[t.id] })));

const ctx = (over: Partial<AmendmentContext> = {}): AmendmentContext => ({ base: V1, items: items(), today: TODAY, lastDay: TODAY + 29, ...over });
const add = (title: string, extra: Omit<ScopeTask, "id" | "title"> = {}): ScopeChange => ({ id: `add-${title}`, kind: "add", task: { id: `t-${title}`, title, ...extra } });

test.describe("scope · applying changes", () => {
  test("adds, changes and removes make the next version's tasks; the rest stay as agreed", () => {
    const next = applyChanges(V1, [add("Stripe checkout", { due: iso(12), effort: 5 }), { id: "x", kind: "change", taskId: "a", to: { description: "Build responsive landing page with CMS integration", effort: null } }, { id: "y", kind: "remove", taskId: "b" }]);
    expect(next.tasks).toEqual([
      { id: "a", title: "Landing page", description: "Build responsive landing page with CMS integration", due: iso(5) },
      { id: "c", title: "Launch", due: iso(20), milestone: true },
      { id: "t-Stripe checkout", title: "Stripe checkout", due: iso(12), effort: 5 },
    ]);
    expect(V1.tasks[0].effort).toBe(3);
  });

  test("a trial's escrow follows its rate over the same months; a role's pay starts on the date given", () => {
    const trial = applyChanges({ ...V1, terms: { ...V1.terms, rate: "$2,000/mo", escrow: 4000 } }, [{ id: "p", kind: "terms", to: { rate: "$2,500/mo" } }]);
    expect(trial.terms).toMatchObject({ rate: "$2,500/mo", escrow: 5000 });
    const role = applyChanges({ ...V1, terms: { type: "part-time", rate: "$3,000/mo", start: iso(0), hours: 20 } }, [{ id: "p", kind: "terms", to: { rate: "$3,300/mo", hours: 25 } }], "2026-10-01");
    expect(role.terms).toMatchObject({ rate: "$3,300/mo", hours: 25, rateFrom: "2026-10-01" });
  });

  test("a milestone carries no effort, and the next month's first day is when new pay starts", () => {
    expect(applyChanges(V1, [{ id: "m", kind: "change", taskId: "a", to: { milestone: true } }]).tasks[0]).not.toHaveProperty("effort");
    expect(nextMonthStart(TODAY)).toBe("2026-10-01");
  });

  test("a work item's agreed definition", () => {
    expect(scopeTaskOf(item({ id: "q", title: "Q", description: "d", due: iso(2), effort: 2 }))).toEqual({ id: "q", title: "Q", description: "d", due: iso(2), effort: 2 });
    expect(scopeTaskOf(item({ id: "m", title: "M", type: "milestone", due: iso(2), effort: 2 }))).toEqual({ id: "m", title: "M", due: iso(2), milestone: true });
  });
});

test.describe("scope · reading changes", () => {
  test("each change reads against the version: the task as it was, each field before and after", () => {
    const resolved = resolveChanges(V1, [{ id: "x", kind: "change", taskId: "a", to: { description: "Build responsive landing page with CMS integration" } }, { id: "p", kind: "terms", to: { rate: "$2,400/mo" } }]);
    expect(resolved).toEqual([
      { id: "x", kind: "change", task: V1.tasks[0], fields: [{ field: "description", was: "Build responsive landing page", to: "Build responsive landing page with CMS integration" }] },
      { id: "p", kind: "terms", fields: [{ field: "rate", was: "$2,000/mo", to: "$2,400/mo" }] },
    ]);
    const refOf = (id: string) => ({ a: "#1", b: "#2" })[id];
    expect(resolved.map((c) => changeLine(c, refOf))).toEqual(["Change #1 “Landing page”: requirements", "Pay: $2,000/mo → $2,400/mo"]);
    expect(changesSummary(resolveChanges(V1, [add("X"), add("Y"), { id: "r", kind: "remove", taskId: "b" }, { id: "p", kind: "terms", to: { rate: "$1/mo" } }]))).toBe("adds 2 tasks, removes 1 task and changes the pay");
  });

  test("restoring an earlier version proposes what differs, leaving out work that's settled", () => {
    const v2: ContractVersion = { ...V1, version: 2, terms: { ...V1.terms, rate: "$2,500/mo" }, tasks: [{ ...V1.tasks[0], title: "Home page" }, V1.tasks[2], { id: "d", title: "Docs" }] };
    let n = 0;
    const { changes, skipped } = restoreChanges(v2, V1, items({ c: { status: "done" }, d: { status: "todo" } }), () => `r${++n}`);
    expect(changes).toEqual([
      { id: "r1", kind: "remove", taskId: "d" },
      { id: "r2", kind: "change", taskId: "a", to: { title: "Landing page", description: "Build responsive landing page", due: iso(5), effort: 3, milestone: false } },
      { id: "r3", kind: "add", task: V1.tasks[1] },
      { id: "r4", kind: "terms", to: { rate: "$2,000/mo" } },
    ]);
    expect(skipped).toEqual([]);
  });
});

test.describe("scope · the rules", () => {
  test("a reason and a change are needed; each task changes once", () => {
    expect(checkAmendment({ reason: " ", changes: [add("X")] }, ctx())?.field).toBe("reason");
    expect(checkAmendment({ reason: "Why", changes: [] }, ctx())?.field).toBe("changes");
    const twice: ScopeChange[] = [{ id: "1", kind: "remove", taskId: "a" }, { id: "2", kind: "change", taskId: "a", to: { title: "A2" } }];
    expect(checkAmendment({ reason: "Why", changes: twice }, ctx())?.message).toMatch(/once/);
    expect(checkAmendment({ reason: "Why", changes: [add("Stripe", { due: iso(3) })] }, ctx())).toBeNull();
  });

  test("done work and work in review keep their scope; deleted or unknown tasks can't change", () => {
    const done = ctx({ items: items({ a: { status: "done" }, b: { status: "review" } }) });
    expect(checkAmendment({ reason: "Why", changes: [{ id: "1", kind: "remove", taskId: "a" }] }, done)?.message).toBe("#1 “Landing page” is done, so what was delivered stands.");
    expect(checkAmendment({ reason: "Why", changes: [{ id: "1", kind: "change", taskId: "b", to: { title: "Kit" } }] }, done)?.message).toMatch(/waiting on review/);
    expect(checkAmendment({ reason: "Why", changes: [{ id: "1", kind: "remove", taskId: "zz" }] }, ctx())?.message).toBe("That task isn't in the contract any more.");
  });

  test("duplicate names, dates after the trial, past dates and no-op changes are refused", () => {
    expect(checkAmendment({ reason: "Why", changes: [add("brand KIT")] }, ctx())?.message).toBe("Two contract tasks would be called “Brand kit”. Give one of them another name.");
    expect(checkAmendment({ reason: "Why", changes: [add("Late", { due: iso(40) })] }, ctx())?.message).toMatch(/trial ends/);
    expect(checkAmendment({ reason: "Why", changes: [add("Past", { due: iso(-2) })] }, ctx())?.message).toMatch(/past/);
    expect(checkAmendment({ reason: "Why", changes: [{ id: "1", kind: "change", taskId: "a", to: { title: "Landing page" } }] }, ctx())?.message).toMatch(/Change something/);
    expect(checkAmendment({ reason: "Why", changes: [add("Flag", { milestone: true })] }, ctx())?.field).toBe("due");
  });

  test("a trial keeps a task to judge, and pay stays above zero and a part-time role's hours in range", () => {
    const all: ScopeChange[] = V1.tasks.map((t) => ({ id: t.id, kind: "remove", taskId: t.id }));
    expect(checkAmendment({ reason: "Why", changes: all }, ctx())?.message).toBe("A trial needs at least one task to be judged on.");
    expect(checkAmendment({ reason: "Why", changes: [{ id: "p", kind: "terms", to: { rate: "$0" } }] }, ctx())?.field).toBe("rate");
    expect(checkAmendment({ reason: "Why", changes: [{ id: "p", kind: "terms", to: { hours: 20 } }] }, ctx())?.message).toBe("Only a part-time role has agreed hours.");
    expect(checkAmendment({ reason: "Why", changes: [{ id: "p", kind: "terms", to: { rate: "$2,000.00/mo" } }] }, ctx())?.message).toBe("That's what's agreed already.");
  });

  test("its proposer revises or withdraws; the other side answers while it waits on them", () => {
    expect(amendmentMoves({ by: "team", status: "pending" }, "team", true)).toEqual(["revise", "withdraw"]);
    expect(amendmentMoves({ by: "team", status: "pending" }, "independent", true)).toEqual(["accept", "reject", "askChanges"]);
    expect(amendmentMoves({ by: "team", status: "changes_requested" }, "independent", true)).toEqual([]);
    expect(amendmentMoves({ by: "team", status: "pending" }, "independent", false)).toEqual([]);
    expect(amendmentMoves({ by: "team", status: "accepted" }, "team", true)).toEqual([]);
    expect(amendmentMoves({ by: "team", status: "pending" }, null, true)).toEqual([]);
  });
});

test.describe("scope · word diff", () => {
  test("words kept, taken out and put in, in order", () => {
    expect(wordDiff("Build responsive landing page", "Build responsive landing page with CMS integration")).toEqual([
      { op: "same", text: "Build responsive landing page" },
      { op: "add", text: " with CMS integration" },
    ]);
    expect(wordDiff("Ship the old logo", "Ship the new logo")).toEqual([
      { op: "same", text: "Ship the" },
      { op: "del", text: " old" },
      { op: "add", text: " new" },
      { op: "same", text: " logo" },
    ]);
    expect(wordDiff("", "")).toEqual([]);
    expect(wordDiff("same", "same")).toEqual([{ op: "same", text: "same" }]);
  });
});
