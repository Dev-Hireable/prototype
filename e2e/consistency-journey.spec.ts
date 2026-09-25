import { card, closePanel, column, drag, expect, open, panel, saved, test, toast, view } from "./fixtures";

// Spec §48 — one item, end to end: create it, assign it, give it effort and dates, have the
// Independent move it, and find it the same in every view, before and after a reload.
test("one item stays the same in every view, before and after a reload", async ({ page, secondPage }) => {
  await open(page, "team");
  const todo = column(page, "To do");
  await todo.getByRole("button", { name: "Add task" }).click();
  await todo.getByRole("textbox", { name: "New task name" }).fill("Journey item");
  await todo.getByRole("textbox", { name: "New task name" }).press("Enter");
  await page.keyboard.press("Escape");
  await card(page, /Journey item/).click();
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

  // The Independent picks it up in their own tab.
  const juan = await secondPage();
  await open(juan, "independent");
  await drag(juan, card(juan, /Journey item/), column(juan, "In progress"));
  await expect.poll(async () => Object.values(await saved(juan)).find((t) => t.title === "Journey item")?.status).toBe("doing");
  // Started today, ahead of its planned 29 Sep: the start follows the work.
  expect(Object.values(await saved(juan)).find((t) => t.title === "Journey item")?.start).toBe("2026-09-25");

  const juanOn29 = (value: string, count: number) => page.getByTestId("workload").getByLabel(new RegExp(`^Juan, Tue 29 Sep 2026: ${value.replace(".", "\\.")}\\. ${count} items$`));

  const check = async () => {
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
    await expect(juanOn29("2.7", 4)).toBeVisible();
  };
  await check();
  await page.reload();
  await check();

  // Deleted, it leaves every view; undone, it's back. Undo is clicked while its toast is certainly up —
  // switching views first raced the toast's countdown on a loaded machine.
  const remove = async () => {
    await view(page, "Board").click();
    await page.getByRole("button", { name: /More actions for #13/ }).click();
    await page.getByRole("menuitem", { name: "Delete task" }).click();
    await expect(card(page, /Journey item/)).toHaveCount(0);
  };
  await remove();
  await toast(page, "Deleted #13").getByRole("button", { name: "Undo" }).click();
  await expect(card(page, /Journey item/)).toBeVisible();
  await view(page, "Workload").click();
  await expect(juanOn29("2.7", 4)).toBeVisible();
  // And deleted, it's out of the workload too.
  await remove();
  await view(page, "Workload").click();
  await expect(juanOn29("1.5", 3)).toBeVisible();
});
