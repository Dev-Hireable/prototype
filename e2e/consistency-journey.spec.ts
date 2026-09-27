import type { Page } from "@playwright/test";
import { card, closePanel, column, drag, expect, open, panel, ROLE, saved, test, toast, view } from "./fixtures";

// Spec §48 — one item, end to end: create it, assign it, give it effort and dates, have the
// Independent move it, and find it the same in every view, before and after a reload. On a role:
// a trial takes no new work.
test.use({ seedOptions: ROLE });

/** On the Team Builder's board, adds "Journey item" to To do with the column's quick add, and opens it. */
async function addJourneyItem(page: Page) {
  await open(page, "team");
  const todo = column(page, "To do");
  await todo.getByRole("button", { name: "Add task" }).click();
  await todo.getByRole("textbox", { name: "New task name" }).fill("Journey item");
  await todo.getByRole("textbox", { name: "New task name" }).press("Enter");
  await page.keyboard.press("Escape");
  await card(page, /Journey item/).click();
}

/** Gives the open item effort and dates in its sheet, checks they're saved with Juan as the assignee, and closes it. */
async function giveItEffortAndDates(page: Page) {
  const p = panel(page);
  // Effort and dates: 29 Sep – 1 Oct, effort 6 → 2 a working day. It's Juan's by default.
  await p.getByRole("button", { name: "Set effort" }).click();
  await page.getByRole("textbox", { name: "Effort, a whole number" }).fill("6");
  await page.getByRole("button", { name: "Set", exact: true }).click();
  await p.getByRole("button", { name: "Set start date" }).click();
  await page.getByRole("button", { name: /September 29th, 2026/ }).last().click();
  await p.getByRole("button", { name: "Set due date" }).click();
  await page.getByRole("button", { name: /October 1st, 2026/ }).last().click();
  await expect.poll(async () => Object.values(await saved(page)).find((t) => t.title === "Journey item")).toMatchObject({ assignee: "independent", effort: 6, start: "2026-09-29", due: "2026-10-01" });
  await closePanel(page);
}

/** Juan drags the item to In progress on his own board: it's saved as doing, and its start moves up to today. */
async function juanPicksItUp(juan: Page) {
  // The Independent picks it up in their own tab.
  await open(juan, "independent");
  await drag(juan, card(juan, /Journey item/), column(juan, "In progress"));
  await expect.poll(async () => Object.values(await saved(juan)).find((t) => t.title === "Journey item")?.status).toBe("doing");
  // Started today, ahead of its planned 29 Sep: the start follows the work.
  expect(Object.values(await saved(juan)).find((t) => t.title === "Journey item")?.start).toBe("2026-09-25");
}

/** Juan's Tue 29 Sep cell in the Workload view, named by his load that day and how many items make it up. */
const juanOn29 = (page: Page, value: string, count: number) => page.getByTestId("workload").getByLabel(new RegExp(`^Juan, Tue 29 Sep 2026: ${value.replace(".", "\\.")}\\. ${count} items$`));

/** Checks the item shows in progress on the Board, List, Calendar and Timeline, and in Juan's Tue 29 Sep load. */
async function findItInEveryView(page: Page) {
  await view(page, "Board").click();
  await expect(column(page, "In progress").getByRole("group", { name: /Journey item/ })).toBeVisible();
  await view(page, "List").click();
  await expect(page.getByTestId("list").getByRole("row", { name: /Journey item/ }).getByText("In progress")).toBeVisible();
  await view(page, "Calendar").click();
  // Started today, it's a bar from Fri 25 Sep that carries on into the next week.
  await expect(page.getByTestId("calendar").getByRole("button", { name: /Journey item, In progress, 25 Sep to 1 Oct/ }).first()).toBeVisible();
  await view(page, "Timeline").click();
  await expect(page.getByTestId("timeline").getByRole("button", { name: /Journey item, In progress, 25 Sep – 1 Oct/ })).toBeVisible();
  await view(page, "Workload").click();
  // Juan on Tue 29 Sep: the logo draft 0.7, the palette 0.5, the typography pairing 0.3 and the journey item 1.2 (6 over five working days from today).
  await expect(juanOn29(page, "2.7", 4)).toBeVisible();
}

/** Deletes the item (#13) from its menu on the board, and checks its card is gone. */
async function deleteFromBoard(page: Page) {
  await view(page, "Board").click();
  await page.getByRole("button", { name: /More actions for #13/ }).click();
  await page.getByRole("menuitem", { name: "Delete task" }).click();
  await expect(card(page, /Journey item/)).toHaveCount(0);
}

/** Deletes the item and undoes it from the toast: its card and its share of Juan's workload come back. */
async function deleteAndUndo(page: Page) {
  // Deleted, it leaves every view; undone, it's back. Undo is clicked while its toast is certainly up —
  // switching views first raced the toast's countdown on a loaded machine.
  await deleteFromBoard(page);
  await toast(page, "Deleted #13").getByRole("button", { name: "Undo" }).click();
  await expect(card(page, /Journey item/)).toBeVisible();
  await view(page, "Workload").click();
  await expect(juanOn29(page, "2.7", 4)).toBeVisible();
}

/** Deletes the item again, for good: Juan's Tue 29 Sep load drops back to his other three items. */
async function deleteForGood(page: Page) {
  // And deleted, it's out of the workload too.
  await deleteFromBoard(page);
  await view(page, "Workload").click();
  await expect(juanOn29(page, "1.5", 3)).toBeVisible();
}

test("one item stays the same in every view, before and after a reload", async ({ page, secondPage }) => {
  await addJourneyItem(page);
  await giveItEffortAndDates(page);
  await juanPicksItUp(await secondPage());
  await findItInEveryView(page);
  await page.reload();
  await findItInEveryView(page);
  await deleteAndUndo(page);
  await deleteForGood(page);
});
