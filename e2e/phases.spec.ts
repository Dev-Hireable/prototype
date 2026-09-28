import { api, card, closePanel, EVALUATED, expect, open, PATH, panel, projectPicker, ROLE, test, tickFilter, toast } from "./fixtures";

// What each side can do to the work, at every point in a contract's life and in every state a
// project can be in — the edge cases a Monday, Asana, Jira or Notion board would have to get right.
// Checked on screen (the controls offered) and against the repository (what a save accepts), so a
// button that's hidden is also a change that's refused. Today is Fri 25 Sep 2026.

const conversion = (status: "sent" | "accepted", start: string) => ({ conversion: { type: "full-time", salary: "$4,000", start, benefits: [], status, sent: "22 Sep 2026", ...(status === "accepted" ? { accepted: "22 Sep 2026" } : {}) } });

/** The header's Add task — the board's per-column quick add is named the same, so this counts them all. */
const addTask = (page: import("@playwright/test").Page) => page.getByRole("button", { name: "Add task" });

test.describe("while the trial runs", () => {
  test("its tasks are the ones the offer agreed: nobody adds work, the Independent works it, and there are no projects yet", async ({ page, secondPage }) => {
    await open(page, "team");
    await expect(card(page, /#4 Pick a typography pairing/)).toBeVisible();
    await expect(addTask(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Change project$/ })).toHaveCount(0);
    const agreed = "The trial's tasks were agreed in the signed offer, so no more can be added.";
    expect(await api(page, "create", { id: "n1", title: "Mood board" })).toMatchObject({ ok: false, code: "forbidden", message: agreed });
    expect(await api(page, "create", { id: "n2", title: "Kickoff notes", assignee: "team" })).toMatchObject({ ok: false, code: "forbidden", message: agreed });
    // The agreed tasks are still planned — all but what their offer set (TB-077).
    expect(await api(page, "patch", "t-type", { effort: 3 })).toMatchObject({ ok: true });
    expect(await api(page, "patch", "t-type", { priority: "high" })).toMatchObject({ ok: false, code: "forbidden", message: "It was agreed in the signed offer, so it stays as agreed." });

    const juan = await secondPage();
    await open(juan, "independent");
    await expect(card(juan, /#4 Pick a typography pairing/)).toBeVisible();
    await expect(addTask(juan)).toHaveCount(0);
    expect(await api(juan, "create", { id: "n3", title: "Mine" })).toMatchObject({ ok: false, code: "forbidden" });
    expect(await api(juan, "transition", "t-type", { to: "doing" })).toMatchObject({ ok: true });
  });
});

test.describe("on the trial's last day", () => {
  test.use({ seedOptions: { contract: { ends: "2026-09-25" } } });

  test("it still runs through the day: the work moves on, though nothing is added", async ({ page }) => {
    await open(page, "independent");
    await expect(card(page, /#4 Pick a typography pairing/)).toBeVisible();
    await expect(addTask(page)).toHaveCount(0);
    expect(await api(page, "transition", "t-type", { to: "doing" })).toMatchObject({ ok: true });
  });
});

test.describe("once the trial is over, before it's evaluated", () => {
  test.use({ seedOptions: { contract: { ends: "2026-09-24" } } });

  test("it's closed: nothing is added or moved on, only what's in review is approved", async ({ page, secondPage }) => {
    await open(page, "team");
    await expect(page.getByText("The trial ended on 24 Sep 2026. Approve what's still in review, then send your evaluation by 29 Sep 2026.")).toBeVisible();
    await expect(addTask(page)).toHaveCount(0);
    expect(await api(page, "create", { id: "n1", title: "Late addition" })).toMatchObject({ ok: false, code: "forbidden" });
    expect(await api(page, "transition", "t-logos", { to: "done" })).toMatchObject({ ok: true });

    const juan = await secondPage();
    await open(juan, "independent");
    expect(await api(juan, "transition", "t-type", { to: "doing" })).toMatchObject({ ok: false, code: "forbidden" });
  });
});

test.describe("an offer out after the evaluation", () => {
  test.use({ seedOptions: { contract: EVALUATED, deal: conversion("sent", "2026-09-28") } });

  test("the trial's work stays closed while the offer is decided", async ({ page }) => {
    await open(page, "team");
    await expect(addTask(page)).toHaveCount(0);
    expect(await api(page, "create", { id: "n1", title: "Too early" })).toMatchObject({ ok: false, code: "forbidden" });
  });
});

test.describe("hired, before the role's first day", () => {
  test.use({ seedOptions: { contract: EVALUATED, deal: conversion("accepted", "2026-09-28") } });

  test("the Team Builder plans ahead, outside any project; the Independent's work opens on the day", async ({ page, secondPage }) => {
    await open(page, "team");
    await expect(addTask(page).first()).toBeVisible();
    const made = await api(page, "create", { id: "n1", title: "Week one checklist", assignee: "team" });
    expect(made).toMatchObject({ ok: true });
    expect((made as { value: { trial?: boolean; project?: string } }).value).not.toHaveProperty("trial");

    const juan = await secondPage();
    await open(juan, "independent");
    expect(await api(juan, "transition", "t-type", { to: "doing" })).toMatchObject({ ok: false, code: "forbidden", message: "The contract starts on 28 Sep 2026, so work opens then." });
  });
});

test.describe("a running role · finished work", () => {
  test.use({ seedOptions: { contract: EVALUATED, deal: conversion("accepted", "2026-09-21") } });

  test("the trial is a finished chapter — read-only, with nothing to add — while what it left open carries on", async ({ page }) => {
    await open(page, "team");
    // What it left open is ordinary work now, even what the trial's offer set of it.
    expect(await api(page, "patch", "t-type", { priority: "high" })).toMatchObject({ ok: true });
    expect(await api(page, "patch", "t-type", { title: "Pick a typography pairing, for the site", due: "2026-10-09" })).toMatchObject({ ok: true });
    // What it finished stays as it was.
    expect(await api(page, "transition", "t-invoice", { to: "todo" })).toMatchObject({ ok: false, code: "forbidden", message: "It's part of the finished trial, so it stays as it was." });
    expect(await api(page, "comment", "t-audit", { id: "c1", text: "Noting this" })).toMatchObject({ ok: false, code: "forbidden" });

    // All work mixes places, so each card says where it sits — and finished work says it's read-only.
    await projectPicker(page, "Open work").click();
    await page.getByRole("menuitemradio", { name: /^All work/ }).click();
    await expect(card(page, /Audit the current brand assets/)).toContainText("Trial");
    await expect(card(page, /Audit the current brand assets/)).toContainText("Read-only");
    await expect(card(page, /Build the colour palette/)).not.toContainText("Read-only");

    await projectPicker(page, "All work").click();
    await page.getByRole("menuitemradio", { name: /^Trial/ }).click();
    await expect(page.getByText("The trial is over. Its work stays as it was finished, for the record.")).toBeVisible();
    await expect(addTask(page)).toHaveCount(0);
    // Its items open read-only: no status menu, no delete.
    await card(page, /Audit the current brand assets/).click();
    await expect(panel(page).getByRole("button", { name: /Change status/ })).toHaveCount(0);
    await expect(panel(page).getByRole("button", { name: "Item actions" })).toHaveCount(0);
    await closePanel(page);
  });

  test("a finished project is read-only until it's reopened — and nothing added while it shows lands elsewhere", async ({ page }) => {
    await open(page, "team");
    expect(await api(page, "createProject", { id: "p1", name: "Launch" })).toMatchObject({ ok: true });
    expect(await api(page, "create", { id: "n1", title: "Launch checklist", assignee: "team", project: "p1" })).toMatchObject({ ok: true });
    expect(await api(page, "transition", "n1", { to: "done" })).toMatchObject({ ok: true });
    expect(await api(page, "finishProject", "p1")).toMatchObject({ ok: true });
    // Nothing more goes into it.
    expect(await api(page, "create", { id: "n2", title: "One more", project: "p1" })).toMatchObject({ ok: false, message: "“Launch” is finished. Reopen it to add work to it." });

    await page.reload();
    await projectPicker(page, "Open work").click();
    await page.getByRole("menuitemradio", { name: /^Launch/ }).click();
    await expect(page.getByText("“Launch” is finished, so its work is read-only. Reopen it to change anything.")).toBeVisible();
    await expect(addTask(page)).toHaveCount(0);
    expect(await api(page, "comment", "n1", { id: "c1", text: "One more thing" })).toMatchObject({ ok: false, message: "Its project is finished, so its work is read-only. Reopen the project to change it." });
    expect(await api(page, "patch", "n1", { project: null })).toMatchObject({ ok: false, code: "forbidden" });

    // Reopened, it takes work again.
    await page.getByRole("button", { name: "Actions for the project Launch" }).click();
    await page.getByRole("menuitem", { name: "Reopen" }).click();
    await expect(toast(page, "Reopened “Launch”")).toBeVisible();
    await expect(addTask(page).first()).toBeVisible();
    expect(await api(page, "comment", "n1", { id: "c2", text: "Back on it" })).toMatchObject({ ok: true });
  });
});

test.describe("a running role · the Independent", () => {
  test.use({ seedOptions: { contract: EVALUATED, deal: conversion("accepted", "2026-09-21") } });

  test("the Independent never adds work or runs projects, but works what's theirs", async ({ page, secondPage }) => {
    await open(page, "team");
    const juan = await secondPage();
    await open(juan, "independent");
    await expect(addTask(juan)).toHaveCount(0);
    expect(await api(juan, "createProject", { id: "p1", name: "Mine" })).toMatchObject({ ok: false, code: "forbidden" });
    expect(await api(juan, "transition", "t-type", { to: "doing" })).toMatchObject({ ok: true });
  });
});

test.describe("an ended contract", () => {
  test.use({ seedOptions: { contract: { ...EVALUATED, ended: true, endedOn: "24 Sep 2026" }, deal: conversion("accepted", "2026-09-01") } });

  test("everything is read-only, on both sides", async ({ page, secondPage }) => {
    await open(page, "team");
    await expect(page.getByText("This contract has ended, so its work is read-only.")).toBeVisible();
    await expect(addTask(page)).toHaveCount(0);
    expect(await api(page, "create", { id: "n1", title: "After the end" })).toMatchObject({ ok: false, code: "forbidden" });
    expect(await api(page, "createProject", { id: "p1", name: "After" })).toMatchObject({ ok: false, code: "forbidden" });
    const juan = await secondPage();
    await open(juan, "independent");
    expect(await api(juan, "comment", "t-type", { id: "c1", text: "Hi" })).toMatchObject({ ok: false, code: "forbidden" });
  });
});

test.describe("dependencies", () => {
  test("only open work can be waited on: done work — the trial's, a finished project's — isn't offered or accepted", async ({ page }) => {
    await open(page, "team");
    // #1 is done; #4 is open.
    expect(await api(page, "addDependency", "t-type", "t-audit")).toMatchObject({ ok: false, code: "validation", message: "#1 is already done, so there's nothing to wait on." });
    await card(page, /Pick a typography pairing/).click();
    await panel(page).getByRole("button", { name: "Add a dependency" }).click();
    const find = page.getByRole("textbox", { name: "Find an item it waits on" });
    await find.fill("Audit");
    await expect(page.getByRole("option", { name: /#1 Audit the current brand assets/ })).toHaveCount(0);
    await find.fill("Social");
    await expect(page.getByRole("option", { name: /#9 Social media templates/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await closePanel(page);
  });
});

test.describe("deleting a task", () => {
  test.use({ seedOptions: ROLE });

  test("it's called Delete, can be undone, and a deleted task can be found and restored", async ({ page }) => {
    await open(page, "team");
    expect(await api(page, "create", { id: "n1", title: "Scratch idea", assignee: "team" })).toMatchObject({ ok: true });
    await page.reload();
    await page.getByRole("button", { name: /More actions for #13/ }).click();
    await page.getByRole("menuitem", { name: "Delete task" }).click();
    await expect(toast(page, "Deleted #13 “Scratch idea”")).toBeVisible();
    await expect(card(page, /Scratch idea/)).toHaveCount(0);

    await tickFilter(page, "Show deleted instead");
    await expect(card(page, /Scratch idea/)).toContainText("Deleted");
    await card(page, /Scratch idea/).click();
    await expect(panel(page).getByText(/Deleted by Alex Rivera\. It's out of every view and count until it's restored\./)).toBeVisible();
    await panel(page).getByRole("button", { name: "Restore" }).click();
    await expect(toast(page, "Restored #13 “Scratch idea”")).toBeVisible();
  });
});

void PATH;
