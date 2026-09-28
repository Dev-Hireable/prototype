import type { Locator, Page } from "@playwright/test";
import { api, closePanel, expect, notes, open, panel, savedItem, test } from "./fixtures";

// The item's sheet: its name heads it; subtasks go in one after another from the keyboard, and a
// box that can't be ticked says why; the Independent says what their own work waits on; and
// comments read as a thread and tell the other side, whose notification opens the item on its comments.

/** The tip on a disabled control: it takes no pointer, so the tip hangs on the wrapper Tip puts around it. */
async function tipOn(page: Page, control: Locator) {
  await control.locator('xpath=ancestor::*[@data-slot="tooltip-trigger"]').hover();
  return page.locator('[data-slot="tooltip-content"]');
}

test.describe("task sheet · the name", () => {
  test("the name heads the sheet, edited in place; Escape leaves the field before the sheet", async ({ page }) => {
    await open(page, "team", "?task=t-kickoff");
    const p = panel(page);
    const name = p.getByRole("textbox", { name: "Name" });
    await expect(name).toHaveValue("Kickoff call with marketing");
    // It opens on the close button, not halfway into editing the name.
    await expect(p.getByRole("button", { name: "Close" })).toBeFocused();
    await name.fill("Kickoff call with the marketing team");
    await name.press("Enter");
    await expect.poll(async () => (await savedItem(page, "t-kickoff")).title).toBe("Kickoff call with the marketing team");
    await name.click();
    await name.press("Escape");
    await expect(name).not.toBeFocused();
    await expect(p).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(p).toHaveCount(0);
  });
});

test.describe("task sheet · subtasks", () => {
  test("Add subtask opens a row with the cursor in it; Enter adds one and starts the next", async ({ page }) => {
    await open(page, "independent", "?task=t-type");
    const p = panel(page);
    await p.getByRole("button", { name: "Add subtask" }).click();
    const entry = p.getByRole("textbox", { name: "New subtask" });
    await expect(entry).toBeFocused();
    await entry.fill("Shortlist three pairings");
    await entry.press("Enter");
    await expect(entry).toBeFocused();
    await expect(entry).toHaveValue("");
    await entry.fill("Try them on the logo");
    await entry.press("Enter");
    await expect.poll(async () => ((await savedItem(page, "t-type")).subtasks as { title: string }[]).map((s) => s.title)).toEqual(["Shortlist three pairings", "Try them on the logo"]);
    await expect(p.getByRole("checkbox", { name: "Shortlist three pairings" })).toBeVisible();
    // The same rules as adding a task: Enter on nothing closes, and the cursor goes back to "+".
    await entry.press("Enter");
    await expect(entry).toHaveCount(0);
    const add = p.getByRole("button", { name: "Add subtask" });
    await expect(add).toBeFocused();
    // Escape throws a draft away and closes the row — not the sheet.
    await add.press("Enter");
    await entry.fill("Throwaway");
    await entry.press("Escape");
    await expect(entry).toHaveCount(0);
    await expect(add).toBeFocused();
    await expect(p).toBeVisible();
    expect((await savedItem(page, "t-type")).subtasks).toHaveLength(2);
  });
});

test.describe("task sheet · ticking subtasks", () => {
  test("a box this person can't tick says why, in the words the repository refuses with", async ({ page }) => {
    // Alex adds and removes subtasks on Juan's work, but only Juan ticks them off.
    await open(page, "team", "?task=t-palette");
    const box = panel(page).getByRole("checkbox", { name: "Accessible contrast pairs" });
    await expect(panel(page).getByRole("button", { name: "Add subtask" })).toBeVisible();
    await expect(box).toBeDisabled();
    await expect(await tipOn(page, box)).toHaveText("Whoever does the work ticks its subtasks off.");
    expect(await api(page, "toggleSubtask", "t-palette", "s-2", true)).toMatchObject({ ok: false, code: "forbidden", message: "Whoever does the work ticks its subtasks off." });
    await closePanel(page);

    // Juan's boxes tick while the work is under way, and lock once it's sent for review.
    await open(page, "independent", "?task=t-palette");
    const mine = panel(page).getByRole("checkbox", { name: "Accessible contrast pairs" });
    await expect(mine).toBeEnabled();
    await panel(page).getByRole("button", { name: "Send for review" }).click();
    await expect(mine).toBeDisabled();
    await expect(await tipOn(page, mine)).toHaveText("Its subtasks are locked while it's in review or done.");
    await expect.poll(async () => (await savedItem(page, "t-palette")).status).toBe("review");
    expect(await api(page, "toggleSubtask", "t-palette", "s-2", true)).toMatchObject({ ok: false, code: "forbidden", message: "Its subtasks are locked while it's in review or done." });
    expect(((await savedItem(page, "t-palette")).subtasks as { done: boolean }[]).map((s) => s.done)).toEqual([true, false]);
  });
});

test.describe("task sheet · dependencies", () => {
  test("the Independent says what their own work waits on — and only their own", async ({ page }) => {
    await open(page, "independent", "?task=t-type");
    const p = panel(page);
    await p.getByRole("button", { name: "Add a dependency" }).click();
    await page.getByRole("textbox", { name: "Find an item it waits on" }).fill("#6");
    await page.getByRole("option", { name: /#6 Kickoff call with marketing/ }).click();
    await expect.poll(async () => (await savedItem(page, "t-type")).dependsOn).toEqual(["t-kickoff"]);
    await expect(p.getByText("Blocked", { exact: true })).toBeVisible();
    await p.getByRole("button", { name: "Stop waiting on #6" }).click();
    await expect.poll(async () => (await savedItem(page, "t-type")).dependsOn).toEqual([]);
    await closePanel(page);

    // Alex's item: nothing to add from the sheet, and the repository refuses it too.
    await open(page, "independent", "?task=t-kickoff");
    await expect(panel(page).getByRole("button", { name: "Add a dependency" })).toHaveCount(0);
    expect(await api(page, "addDependency", "t-kickoff", "t-type")).toMatchObject({ ok: false, code: "forbidden", message: "It isn't yours to work on, so Alex says what it waits on." });
    expect((await savedItem(page, "t-kickoff")).dependsOn).toEqual([]);
  });
});

test.describe("task sheet · comments", () => {
  test("a comment reads as a thread entry, and the other side is told — their notification opens it", async ({ page, secondPage }) => {
    await open(page, "team", "?task=t-type");
    const p = panel(page);
    const box = p.getByRole("textbox", { name: "Add a comment" });
    await box.fill("Could you try a serif for the headings?");
    await p.getByRole("button", { name: "Send", exact: true }).click();
    const alex = p.getByRole("article", { name: "Comment from Alex Rivera" });
    await expect(alex).toContainText("Could you try a serif for the headings?");
    await expect(alex).toContainText("25 Sep 2026");

    const [note] = await notes(page, "independent");
    expect(note).toMatchObject({ title: "Alex Rivera commented on a task", href: "/independent/contracts/brand-designer?task=t-type&focus=comments", unread: true });
    expect(note.body).toContain("Could you try a serif for the headings?");
    // Another while that one is unread updates it, rather than stacking a second.
    await box.fill("Or a slab — your call.");
    await p.getByRole("button", { name: "Send", exact: true }).click();
    await expect.poll(async () => (await notes(page, "independent")).filter((n) => n.title === "Alex Rivera commented on a task").length).toBe(1);
    expect((await notes(page, "independent"))[0].body).toContain("Or a slab — your call.");

    // Juan follows it: the item opens on its comments, and his reply tells Alex.
    const juan = await secondPage();
    await juan.goto(note.href);
    await expect(panel(juan).getByRole("article", { name: "Comment from Alex Rivera" })).toHaveCount(2);
    await expect(panel(juan).getByRole("region", { name: "Activity" })).toBeInViewport();
    await panel(juan).getByRole("textbox", { name: "Add a comment" }).fill("Trying one now.");
    await panel(juan).getByRole("button", { name: "Send", exact: true }).click();
    await expect(panel(juan).getByRole("article", { name: "Comment from Juan Dela Cruz" })).toContainText("Trying one now.");
    await expect.poll(async () => (await notes(juan, "team"))[0]?.title).toBe("Juan Dela Cruz commented on a task");
    expect((await notes(juan, "team"))[0].href).toBe("/team/independents/juan-dela-cruz?task=t-type&focus=comments");
  });
});
