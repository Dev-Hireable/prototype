import { card, closePanel, column, expect, notes, open, panel, ROLE, saved, savedItem, test, toast, view } from "./fixtures";

// Scenario C — creating work: quick add in a column, the full dialog, and who can. On a role: a
// trial takes no new work (phases.spec).
test.use({ seedOptions: ROLE });

test.describe("creating work · quick add", () => {
  test("quick add: Enter adds and stays open for the next; Enter on nothing closes", async ({ page }) => {
    await open(page, "team");
    const todo = column(page, "To do");
    await todo.getByRole("button", { name: "Add task" }).click();
    const input = todo.getByRole("textbox", { name: "New task name" });
    await input.fill("Write the tagline");
    await input.press("Enter");
    await expect(card(page, /Write the tagline/)).toBeVisible();
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("");
    await input.fill("Draft the FAQ");
    await input.press("Enter");
    await expect(card(page, /Draft the FAQ/)).toBeVisible();
    await input.press("Enter");
    await expect(input).toBeHidden();

    const items = Object.values(await saved(page)).filter((t) => t.title === "Write the tagline" || t.title === "Draft the FAQ");
    expect(items.map((t) => [t.number, t.status, t.assignee, t.addedBy])).toEqual([
      [13, "todo", "independent", "team"],
      [14, "todo", "independent", "team"],
    ]);
    // Juan is told about work assigned to him.
    expect((await notes(page, "independent")).filter((n) => n.title === "New task added")).toHaveLength(2);
  });

  test("Escape throws the draft away; clicking elsewhere keeps what was typed", async ({ page }) => {
    await open(page, "team");
    const todo = column(page, "To do");
    await todo.getByRole("button", { name: "Add task" }).click();
    await todo.getByRole("textbox", { name: "New task name" }).fill("Throwaway");
    await page.keyboard.press("Escape");
    await expect(card(page, /Throwaway/)).toHaveCount(0);
    await todo.getByRole("button", { name: "Add task" }).click();
    await todo.getByRole("textbox", { name: "New task name" }).fill("Kept on blur");
    await page.getByLabel("Summary").click();
    await expect(card(page, /Kept on blur/)).toBeVisible();
    expect(Object.values(await saved(page)).some((t) => t.title === "Kept on blur")).toBe(true);
    expect(Object.values(await saved(page)).some((t) => t.title === "Throwaway")).toBe(false);
  });

  test("quick add in a group inherits the group's value", async ({ page }) => {
    await open(page, "team", "?group=assignee");
    const alex = column(page, "Alex");
    await alex.getByRole("button", { name: "Add task" }).click();
    await alex.getByRole("textbox", { name: "New task name" }).fill("Book the photographer");
    await alex.getByRole("textbox", { name: "New task name" }).press("Enter");
    await expect(alex.getByRole("group", { name: /Book the photographer/ })).toBeVisible();
    const item = Object.values(await saved(page)).find((t) => t.title === "Book the photographer");
    expect(item?.assignee).toBe("team");
  });
});

test.describe("creating work · the Add task dialog", () => {
  test("the Add task dialog sets everything at once, and the item shows in every view", async ({ page }) => {
    await open(page, "team");
    await page.getByRole("button", { name: "Add task" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Add task" });
    await dialog.getByRole("textbox", { name: "Name" }).fill("Launch plan");
    await dialog.getByRole("button", { name: "Assignee" }).click();
    await page.getByRole("option", { name: "Alex" }).click();
    await dialog.getByRole("textbox", { name: /Effort/ }).fill("5");
    await dialog.getByRole("button", { name: "Due date" }).click();
    await page.getByRole("button", { name: /September 29th, 2026/ }).click();
    await dialog.getByRole("button", { name: "Add task" }).click();
    await expect(toast(page, "Added “Launch plan”")).toBeVisible();
    const item = Object.values(await saved(page)).find((t) => t.title === "Launch plan");
    expect(item).toMatchObject({ assignee: "team", effort: 5, due: "2026-09-29", status: "todo" });
    // It opens, to carry on with a description or subtasks.
    await expect(panel(page)).toBeVisible();
    await closePanel(page);

    await view(page, "List").click();
    await expect(page.getByTestId("list").getByRole("row", { name: /Launch plan/ })).toBeVisible();
    await view(page, "Calendar").click();
    // The 29th already has three lanes, so it's listed under "+2 more" with the kickoff call.
    await page.getByTestId("calendar").getByRole("button", { name: "2 more on Tue 29 Sep 2026" }).click();
    await expect(page.getByRole("button", { name: /Launch plan/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await view(page, "Timeline").click();
    await expect(page.getByTestId("timeline").getByRole("button", { name: "Launch plan", exact: true })).toBeVisible();
    await view(page, "Workload").click();
    // Alex's day: the kickoff call (1) and the launch plan (5).
    await expect(page.getByTestId("workload").getByLabel(/^Alex, Tue 29 Sep 2026: 6\. /)).toBeVisible();
  });
});

test.describe("creating work · persistence", () => {
  test("a new item survives a reload", async ({ page }) => {
    await open(page, "team");
    const todo = column(page, "To do");
    await todo.getByRole("button", { name: "Add task" }).click();
    await todo.getByRole("textbox", { name: "New task name" }).fill("Still here after reload");
    await todo.getByRole("textbox", { name: "New task name" }).press("Enter");
    await expect(card(page, /Still here after reload/)).toBeVisible();
    await page.reload();
    await expect(card(page, /Still here after reload/)).toBeVisible();
  });
});

test.describe("creating work · who can", () => {
  test("the Independent and admin can't add work", async ({ page }) => {
    await open(page, "independent");
    await expect(page.getByRole("button", { name: "Add task" })).toHaveCount(0);
    await open(page, "admin");
    await expect(page.getByRole("button", { name: "Add task" })).toHaveCount(0);
    expect(await savedItem(page, "t-type")).toBeTruthy();
  });
});
