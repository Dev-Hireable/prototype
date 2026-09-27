import type { Page } from "@playwright/test";
import { api, card, closePanel, expect, open, PATH, panel, projectPicker, saved, test, toast } from "./fixtures";

// TB-148 — a full-time or part-time role's work in the projects the Team Builder makes, so it
// doesn't pile up: the trial closes as a chapter when the role begins, the workspace opens on the
// open work, and a finished project leaves it with its items kept.

/** A trial that ran 10 Aug – 18 Sep and was evaluated, then hired full-time from 21 Sep. */
const HIRED = {
  contract: { started: "2026-08-10", ends: "2026-09-18", evaluations: [{ stars: 4, scores: [{ label: "Quality of work", value: 4 }], feedback: "A strong trial.", recommendation: "Hire full-time", date: "21 Sep 2026", tfp: 80 }], escrow: { released: 1600, refunded: 0 } },
  deal: { conversion: { type: "full-time", salary: "$4,000", start: "2026-09-21", benefits: [], status: "accepted", sent: "22 Sep 2026", accepted: "22 Sep 2026" } },
};

/** Checks the trial's unfinished work is outside a project, none is built in and the trial is a finished chapter, then adds “Brand refresh”. */
async function addBrandRefresh(page: Page) {
  // What the trial left unfinished carries on outside a project, on the board. No project is built in.
  await expect(card(page, /Build the colour palette/)).toBeVisible();
  await expect(card(page, /Audit the current brand assets/)).toHaveCount(0);
  await projectPicker(page, "Open work").click();
  await expect(page.getByRole("menuitemradio", { name: /^No project \d+ open$/ })).toBeVisible();
  await expect(page.getByRole("menuitemradio", { name: /^Day-to-day/ })).toHaveCount(0);
  // The trial itself is a finished chapter: what was done during it.
  await expect(page.getByRole("group").filter({ hasText: "Finished" }).getByRole("menuitemradio", { name: /^Trial/ })).toBeVisible();
  await page.getByRole("menuitem", { name: "New project…" }).click();
  const dialog = page.getByRole("dialog", { name: "New project" });
  await dialog.getByRole("textbox", { name: "Project name" }).fill("Brand refresh");
  await dialog.getByRole("button", { name: "Add project" }).click();
  await expect(toast(page, "Added the project “Brand refresh”")).toBeVisible();
}

/** Adds “Logo size sheet” for Alex from the new project's empty state, checks it's filed there, and returns it as saved. */
async function addLogoSizeSheet(page: Page) {
  // It opens on the new project, empty, with the way to fill it.
  await expect(projectPicker(page, "Brand refresh")).toBeVisible();
  await expect(page.getByText("Nothing in “Brand refresh” yet")).toBeVisible();
  await page.getByRole("button", { name: "Add task" }).last().click();
  const add = page.getByRole("dialog", { name: "Add task" });
  await add.getByRole("textbox", { name: "Name" }).fill("Logo size sheet");
  await add.getByRole("button", { name: "Assignee" }).click();
  await page.getByRole("option", { name: /Alex/ }).click();
  await add.getByRole("button", { name: "Add task" }).click();
  // It opens on the new item, filed in the project that was showing.
  await expect(panel(page).getByRole("button", { name: "Project: Brand refresh. Move to another project" })).toBeVisible();
  await closePanel(page);
  await expect(card(page, /Logo size sheet/)).toBeVisible();
  const made = Object.values(await saved(page)).find((t) => t.title === "Logo size sheet") as { id: string; project: string };
  expect(made.project).toBeTruthy();
  return made;
}

/** Finish is disabled while the item is open; once the seam marks it done, marks the project finished. */
async function finishBrandRefresh(page: Page, made: { id: string }) {
  // Nothing open can drop out of sight: finishing waits on the work.
  await page.getByRole("button", { name: "Actions for the project Brand refresh" }).click();
  await expect(page.getByRole("menuitem", { name: "Finish — 1 still open" })).toBeDisabled();
  await page.keyboard.press("Escape");
  expect(await api(page, "transition", made.id, { to: "done" })).toMatchObject({ ok: true });
  await page.getByRole("button", { name: "Actions for the project Brand refresh" }).click();
  await page.getByRole("menuitem", { name: "Mark finished" }).click();
  await expect(toast(page, /Finished “Brand refresh”/)).toBeVisible();
}

/** Shows Open work, where the finished project's item is gone, then All work, where it's back. */
async function showOpenThenAllWork(page: Page) {
  // Out of the open work; still in All work.
  await projectPicker(page, "Brand refresh").click();
  await page.getByRole("menuitemradio", { name: /^Open work/ }).click();
  await expect(card(page, /Logo size sheet/)).toHaveCount(0);
  await projectPicker(page, "Open work").click();
  await page.getByRole("menuitemradio", { name: /^All work/ }).click();
  await expect(card(page, /Logo size sheet/)).toBeVisible();
  await expect(page).toHaveURL(/project=all/);
}

/** Archives the project, and the picker lists it under Archived, not Finished. */
async function archiveBrandRefresh(page: Page) {
  // Put away: archived, it moves from Finished to Archived in the list.
  await projectPicker(page, "All work").click();
  await page.getByRole("menuitemradio", { name: /^Brand refresh/ }).click();
  await page.getByRole("button", { name: "Actions for the project Brand refresh" }).click();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  await expect(toast(page, /Archived “Brand refresh”/)).toBeVisible();
  await projectPicker(page, "Brand refresh").click();
  await expect(page.getByRole("group").filter({ hasText: "Archived" }).getByRole("menuitemradio", { name: /^Brand refresh/ })).toBeVisible();
  await expect(page.getByRole("group").filter({ hasText: "Finished" }).getByRole("menuitemradio", { name: /^Brand refresh/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
}

/** In Juan's own tab: he sees the project but can't add one, and his carried-over item shows no project, with no way to move it. */
async function juanReadsTheProjects(juan: Page) {
  // Juan reads the projects but doesn't run them, and sees where his work sits.
  await juan.goto(PATH.independent);
  await projectPicker(juan, "Open work").click();
  await expect(juan.getByRole("menuitemradio", { name: /^Brand refresh/ })).toBeVisible();
  await expect(juan.getByRole("menuitem", { name: "New project…" })).toHaveCount(0);
  await juan.keyboard.press("Escape");
  await card(juan, /Build the colour palette/).click();
  await expect(panel(juan).getByText("No project", { exact: true })).toBeVisible();
  await expect(panel(juan).getByRole("button", { name: /^Project:/ })).toHaveCount(0);
}

/** Back in the Team Builder's tab, deletes the project; its item is kept, done, outside any project. */
async function deleteBrandRefresh(page: Page, made: { id: string }) {
  // Deleted: the project goes, its work stays — outside a project, with its history.
  await page.bringToFront();
  await page.getByRole("button", { name: "Actions for the project Brand refresh" }).click();
  await page.getByRole("menuitem", { name: "Delete…" }).click();
  const confirm = page.getByRole("dialog", { name: "Delete “Brand refresh”?" });
  await expect(confirm).toContainText("Its item stays on the contract, outside a project");
  await confirm.getByRole("button", { name: "Delete project" }).click();
  await expect(toast(page, "Deleted “Brand refresh” — its item is kept, outside a project")).toBeVisible();
  await expect(projectPicker(page, "Open work")).toBeVisible();
  await expect.poll(async () => (await saved(page))[made.id]?.project).toBeUndefined();
  expect((await saved(page))[made.id]).toMatchObject({ status: "done" });
}

test.describe("on a trial", () => {
  test("there are no projects — the trial is the plan", async ({ page }) => {
    await open(page, "team");
    await expect(page.getByTestId("workspace")).toBeVisible();
    await expect(page.getByRole("button", { name: /Change project$/ })).toHaveCount(0);
    // Not through the back door either: the repository refuses a project while it's a trial.
    expect(await api(page, "createProject", { id: "p1", name: "Launch" })).toMatchObject({ ok: false, code: "forbidden", message: "Projects start once the trial becomes a full-time or part-time role." });
    await page.getByRole("button", { name: /^Group by/ }).click();
    await expect(page.getByRole("menuitemradio", { name: "Project" })).toHaveCount(0);
  });
});

test.describe("on a role", () => {
  test.use({ seedOptions: HIRED });

  test("the Team Builder runs a project to finished, and it leaves the open work with its items kept", async ({ page, secondPage }) => {
    await open(page, "team");
    await addBrandRefresh(page);
    const made = await addLogoSizeSheet(page);
    await finishBrandRefresh(page, made);
    await showOpenThenAllWork(page);
    await archiveBrandRefresh(page);
    await juanReadsTheProjects(await secondPage());
    await deleteBrandRefresh(page, made);
  });

  test("the Team Builder moves work between projects from its sheet", async ({ page }) => {
    await open(page, "team");
    expect(await api(page, "createProject", { id: "p-launch", name: "Launch" })).toMatchObject({ ok: true });
    await card(page, /Pick a typography pairing/).click();
    await panel(page).getByRole("button", { name: "Project: No project. Move to another project" }).click();
    await page.getByRole("menuitemradio", { name: "Launch" }).click();
    await expect(panel(page).getByRole("button", { name: "Project: Launch. Move to another project" })).toBeVisible();
    await expect.poll(async () => (await saved(page))["t-type"]?.project).toBe("p-launch");
  });
});
