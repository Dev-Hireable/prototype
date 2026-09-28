import { expect, test } from "@playwright/test";
import { migrateItems, migrateProjects } from "../../src/lib/work/migrate";
import type { WorkProject } from "../../src/lib/work/model";
import { ALL, inScope, NO_PROJECT, OPEN as OPEN_WORK, projectCtx, projectKeyOf, RECENT_DONE_DAYS, summarize, TRIAL as TRIAL_KEY } from "../../src/lib/work/projects";
import { capsFor, lockedReason } from "../../src/lib/work/permissions";
import { createWorkRepository } from "../../src/lib/work/repository";
import { clock, ENDED, item, memoryStore, OPEN, rejection, TRIAL } from "./fixtures";

// TB-148 — a role's work in the projects the Team Builder makes, so a contract that runs for years
// doesn't pile up: finished projects and the trial's chapter leave the open work.

const project = (over: Partial<WorkProject> = {}): WorkProject => ({ id: "p1", name: "Brand refresh", status: "active", order: 1, createdAt: 1, ...over });
const DAY = 86_400_000;
const NOW = 100 * DAY;

function setup(items = [item({ id: "a" }), item({ id: "b", assignee: "team" })], access = OPEN, projects: WorkProject[] = []) {
  const store = memoryStore({ items, nextNumber: 50, projects }, access);
  const repo = (role: "manager" | "contributor" | "viewer") => createWorkRepository({ actor: { role, name: role === "manager" ? "Alex Rivera" : "Juan Dela Cruz" }, port: store.port, clock: clock(), names: { team: "Alex", independent: "Juan" } });
  return { store, alex: repo("manager"), juan: repo("contributor"), admin: repo("viewer") };
}

test.describe("where work sits", () => {
  test("no project, a project, or — once a trial becomes a role — the trial's finished chapter", () => {
    const ctx = projectCtx(true, [project()], NOW);
    const places = summarize([item({ id: "x", project: "p1", status: "done" }), item({ id: "y", project: "p1" }), item({ id: "z" }), item({ id: "t", trial: true, status: "done" })], [project()], ctx);
    expect(places.map((p) => [p.key, p.done, p.total, p.finished])).toEqual([
      [NO_PROJECT, 0, 1, false],
      ["p1", 1, 2, false],
      // The trial's chapter is always finished: listed after what's open.
      [TRIAL_KEY, 1, 1, true],
    ]);
    // On a trial there are no projects: the trial is the plan, and nothing is split out.
    expect(summarize([item({ id: "t", trial: true })], [], projectCtx(false, [])).map((p) => p.key)).toEqual([NO_PROJECT]);
  });

  test("the trial closes when the role begins: what it left unfinished carries on outside a project", () => {
    const ctx = projectCtx(true, [], NOW);
    expect(projectKeyOf(item({ trial: true, status: "done", completedAt: NOW - DAY }), ctx)).toBe(TRIAL_KEY);
    // Done before finishing was dated: the trial's.
    expect(projectKeyOf(item({ trial: true, status: "done" }), ctx)).toBe(TRIAL_KEY);
    expect(projectKeyOf(item({ trial: true, status: "doing" }), ctx)).toBe(NO_PROJECT);
    // Finished once the role had begun: role work.
    expect(projectKeyOf(item({ trial: true, status: "done", completedAt: NOW + DAY }), ctx)).toBe(NO_PROJECT);
    // Filed into a project, it's the project's.
    expect(projectKeyOf(item({ trial: true, status: "doing", project: "p1" }), projectCtx(true, [project()], NOW))).toBe("p1");
  });

  test("the open work leaves out finished projects, the finished trial and backlog work done a while ago", () => {
    const projects = [project(), project({ id: "p2", name: "Launch", status: "done" })];
    const ctx = { ...projectCtx(true, projects, NOW - 30 * DAY), now: NOW };
    const open = (t: Parameters<typeof inScope>[0]) => inScope(t, OPEN_WORK, ctx);
    expect(open(item({ project: "p1", status: "done" }))).toBe(true);
    expect(open(item({ project: "p2", status: "done" }))).toBe(false);
    expect(open(item({ trial: true, status: "done" }))).toBe(false);
    expect(open(item({ status: "doing" }))).toBe(true);
    expect(open(item({ status: "done", completedAt: NOW - 2 * DAY }))).toBe(true);
    expect(open(item({ status: "done", completedAt: NOW - (RECENT_DONE_DAYS + 1) * DAY }))).toBe(false);
    // Nothing is lost: All work and the project itself still have it.
    expect(inScope(item({ project: "p2", status: "done" }), ALL, ctx)).toBe(true);
    expect(inScope(item({ project: "p2", status: "done" }), "p2", ctx)).toBe(true);
  });

  test("the trial's chapter is never open work, but its carried-over work is", () => {
    const ctx = { ...projectCtx(true, [], NOW), now: NOW };
    expect(inScope(item({ trial: true, status: "done", completedAt: NOW - 2 * DAY }), OPEN_WORK, ctx)).toBe(false);
    expect(inScope(item({ trial: true, status: "todo" }), OPEN_WORK, ctx)).toBe(true);
  });
});

test.describe("running projects", () => {
  test("the Team Builder adds, renames, finishes and reopens them", async () => {
    const { store, alex } = setup();
    const p = await alex.createProject({ id: "p1", name: "  Brand refresh " });
    expect(p).toMatchObject({ id: "p1", name: "Brand refresh", status: "active", createdBy: "Alex Rivera" });
    // A retry of the same request is harmless.
    expect(await alex.createProject({ id: "p1", name: "Brand refresh" })).toEqual(p);
    expect((await alex.renameProject("p1", "Brand system")).name).toBe("Brand system");
    expect((await alex.finishProject("p1")).status).toBe("done");
    expect((await alex.reopenProject("p1")).status).toBe("active");
    expect(store.read().projects).toHaveLength(1);
  });

  test("names are needed, short and their own", async () => {
    const { alex } = setup(undefined, OPEN, [project()]);
    expect((await rejection(alex.createProject({ id: "p2", name: " " }))).message).toBe("Give the project a name.");
    expect((await rejection(alex.createProject({ id: "p2", name: "brand REFRESH" }))).message).toBe("There's already a project called “brand REFRESH”.");
    expect((await rejection(alex.createProject({ id: "p2", name: "No project" }))).code).toBe("validation");
    // None is built in: a routine list is one the Team Builder makes.
    expect(await alex.createProject({ id: "p3", name: "Day-to-day" })).toMatchObject({ name: "Day-to-day" });
    expect((await rejection(alex.createProject({ id: "p2", name: "x".repeat(61) }))).message).toBe("Keep the name under 60 characters.");
  });

  test("only the Team Builder, only on a role that's running", async () => {
    expect((await rejection(setup().juan.createProject({ id: "p1", name: "Mine" }))).message).toBe("Alex runs the projects.");
    expect((await rejection(setup().admin.createProject({ id: "p1", name: "Mine" }))).code).toBe("forbidden");
    expect((await rejection(setup(undefined, TRIAL).alex.createProject({ id: "p1", name: "Mine" }))).message).toBe("Projects start once the trial becomes a full-time or part-time role.");
    expect((await rejection(setup(undefined, ENDED).alex.createProject({ id: "p1", name: "Mine" }))).message).toBe("This contract has ended.");
  });

  test("a project finishes only once its work is done — nothing open drops out of sight", async () => {
    const { store, alex } = setup([item({ id: "a", project: "p1" }), item({ id: "b", project: "p1", assignee: "team", status: "done" })], OPEN, [project()]);
    expect((await rejection(alex.finishProject("p1"))).message).toBe("1 item in “Brand refresh” is still open. Finish it or move it to another project first.");
    await alex.patch("a", { project: null });
    await alex.finishProject("p1");
    expect(store.read().projects?.[0]).toMatchObject({ status: "done", completedBy: "Alex Rivera" });
  });
});

test.describe("archiving and deleting projects", () => {
  test("a finished project can be archived — kept, and listed after the finished ones — and unarchived", async () => {
    const { store, alex } = setup([item({ id: "a", project: "p1", status: "done" })], OPEN, [project()]);
    expect((await rejection(alex.archiveProject("p1"))).message).toBe("“Brand refresh” is still active. Mark it finished before archiving it.");
    await alex.finishProject("p1");
    expect(await alex.archiveProject("p1")).toMatchObject({ status: "done", archivedBy: "Alex Rivera" });
    const places = summarize(store.read().items, store.read().projects ?? [], projectCtx(true, store.read().projects ?? [], NOW));
    expect(places.find((p) => p.key === "p1")).toMatchObject({ finished: true, archived: true });
    expect((await alex.unarchiveProject("p1")).archivedAt).toBeUndefined();
    // Reopening a project that was archived takes it out of the archive too.
    await alex.archiveProject("p1");
    expect(await alex.reopenProject("p1")).not.toHaveProperty("archivedAt");
  });

  test("deleting a project never deletes its work: it stays, outside a project, with the move on its feed", async () => {
    const { store, alex } = setup([item({ id: "a", project: "p1", assignee: "team", status: "done" }), item({ id: "b" })], OPEN, [project({ status: "done" })]);
    await alex.deleteProject("p1");
    expect(store.read().projects).toEqual([]);
    expect(store.get("a").project).toBeUndefined();
    expect(store.get("a")).toMatchObject({ status: "done", version: 2 });
    expect(store.get("a").activity[0].text).toBe("Moved out of “Brand refresh” — the project was deleted by Alex Rivera");
    expect(store.get("b").version).toBe(1);
  });

  test("an active project is deleted only while it's empty; only the Team Builder deletes, never on a trial", async () => {
    expect((await rejection(setup([item({ id: "a", project: "p1" })], OPEN, [project()]).alex.deleteProject("p1"))).message).toBe("“Brand refresh” still has work in it. Finish it, or move its work out, before deleting it.");
    const empty = setup([], OPEN, [project()]);
    await empty.alex.deleteProject("p1");
    expect(empty.store.read().projects).toEqual([]);
    expect((await rejection(setup([], OPEN, [project({ status: "done" })]).juan.deleteProject("p1"))).code).toBe("forbidden");
    expect((await rejection(setup([], TRIAL, [project({ status: "done" })]).alex.archiveProject("p1"))).message).toBe("Projects start once the trial becomes a full-time or part-time role.");
  });
});

test.describe("moving work between projects", () => {
  test("the Team Builder files work into an active project or out of it, and the feed says so", async () => {
    const { store, alex } = setup(undefined, OPEN, [project()]);
    await alex.patch("a", { project: "p1" });
    expect(store.get("a")).toMatchObject({ project: "p1" });
    expect(store.get("a").activity[0].text).toBe("Moved to “Brand refresh” by Alex Rivera");
    await alex.patch("a", { project: null });
    expect(store.get("a").project).toBeUndefined();
    expect(store.get("a").activity[0].text).toBe("Moved out of “Brand refresh” by Alex Rivera");
  });

  test("new work can start in a project", async () => {
    const { store, alex } = setup([], OPEN, [project()]);
    await alex.create({ id: "n1", title: "Logo sizes", project: "p1" });
    expect(store.get("n1")).toMatchObject({ project: "p1" });
    expect(store.get("n1").activity[0].text).toBe("Added by Alex Rivera to “Brand refresh”");
  });

  test("not into a finished or missing project, not by the Independent, and not on a trial", async () => {
    const done = project({ status: "done" });
    expect((await rejection(setup(undefined, OPEN, [done]).alex.patch("a", { project: "p1" }))).message).toBe("“Brand refresh” is finished. Reopen it to add work to it.");
    expect((await rejection(setup(undefined, OPEN, [done]).alex.create({ id: "n1", title: "Late", project: "p1" }))).code).toBe("validation");
    expect((await rejection(setup().alex.patch("a", { project: "nope" }))).code).toBe("not_found");
    expect((await rejection(setup(undefined, OPEN, [project()]).juan.patch("a", { project: "p1" }))).code).toBe("forbidden");
    expect((await rejection(setup(undefined, TRIAL, [project()]).alex.patch("a", { project: "p1" }))).message).toBe("Projects start once the trial becomes a full-time or part-time role.");
  });
});

test.describe("saved projects", () => {
  test("read forgivingly: bad records dropped, duplicates once, unknown status active", () => {
    expect(migrateProjects([{ id: "p1", name: " A " }, { id: "p1", name: "Again" }, { name: "No id" }, { id: "p2", name: "B", status: "weird", order: 3 }, "junk"])).toEqual([
      { id: "p1", name: "A", status: "active", order: 1, createdAt: 0 },
      { id: "p2", name: "B", status: "active", order: 3, createdAt: 0 },
    ]);
    expect(migrateProjects(undefined)).toEqual([]);
  });

  test("work saved as the old “Project” work type reads as a Task — projects are their own thing now", () => {
    expect(migrateItems([{ id: "a", title: "Big one", type: "project" }]).items[0].type).toBe("task");
  });
});

test.describe("finished work is read-only", () => {
  const ROLE_SINCE = "2026-09-21";
  const since = new Date(`${ROLE_SINCE}T00:00:00`).getTime();

  test("a finished or archived project's work: no edits, moves, status changes or comments — until it's reopened", async () => {
    const access = { ...OPEN, finishedProjects: ["p1"], roleSince: ROLE_SINCE };
    const { store, alex, juan } = setup([item({ id: "a", project: "p1", status: "done", assignee: "team" }), item({ id: "b", project: "p1", status: "done" })], access, [project({ status: "done" })]);
    const reason = "Its project is finished, so its work is read-only. Reopen the project to change it.";
    expect(lockedReason(store.get("a"), access)).toBe(reason);
    expect(Object.values(capsFor(store.get("a"), { role: "manager" }, access)).some(Boolean)).toBe(false);
    expect((await rejection(alex.patch("a", { title: "Renamed" }))).message).toBe(reason);
    expect((await rejection(alex.patch("a", { project: null }))).message).toBe(reason);
    expect((await rejection(alex.transition("a", { to: "todo" }))).message).toBe(reason);
    expect((await rejection(alex.comment("a", { id: "c1", text: "Hi" }))).message).toBe(reason);
    expect((await rejection(juan.comment("b", { id: "c2", text: "Hi" }))).message).toBe(reason);
    expect((await rejection(alex.archive("a"))).message).toBe(reason);
    // Reopened, it's open to change again.
    await alex.reopenProject("p1");
    store.access = { ...access, finishedProjects: undefined };
    await alex.comment("a", { id: "c3", text: "Back on it" });
    expect(store.get("a").comments).toHaveLength(1);
  });

  test("the trial's chapter stays as it was; trial work finished after the role began is the role's", async () => {
    const access = { ...OPEN, roleSince: ROLE_SINCE };
    const { alex } = setup([item({ id: "a", trial: true, status: "done", assignee: "team", completedAt: since - 86_400_000 }), item({ id: "b", trial: true, status: "done", assignee: "team", completedAt: since + 86_400_000 })], access);
    expect((await rejection(alex.transition("a", { to: "todo" }))).message).toBe("It's part of the finished trial, so it stays as it was.");
    expect((await rejection(alex.comment("a", { id: "c1", text: "Hi" }))).message).toBe("It's part of the finished trial, so it stays as it was.");
    await alex.transition("b", { to: "todo" });
  });

  test("nothing is locked while the contract is still a trial", () => {
    expect(lockedReason(item({ trial: true, status: "done" }), TRIAL)).toBeNull();
  });
});

