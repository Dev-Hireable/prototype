import { card, column, drag, expect, notes, open, panel, ROLE, savedItem, test, toast, view } from "./fixtures";

// Scenario N — everything saved survives a hard reload; a notification opens the item.
test.describe("persistence · on a role, where work is added", () => {
  test.use({ seedOptions: ROLE });

  test("a run of changes, then a reload: all of it is still there", async ({ page }) => {
    await open(page, "team");
    const todo = column(page, "To do");
    await todo.getByRole("button", { name: "Add task" }).click();
    await todo.getByRole("textbox", { name: "New task name" }).fill("Persist me");
    await todo.getByRole("textbox", { name: "New task name" }).press("Enter");
    await page.keyboard.press("Escape");
    await drag(page, card(page, /#6 Kickoff call/), column(page, "In progress"));
    await page.getByRole("button", { name: /More actions for #9/ }).click();
    await page.getByRole("menuitem", { name: "Delete task" }).click();
    await expect(card(page, /#9 Social media templates/)).toHaveCount(0);
    await view(page, "List").click();
    const row = page.getByTestId("list").getByRole("row", { name: /Persist me/ });
    await row.getByRole("button", { name: "Set priority" }).click();
    await page.getByRole("menuitem", { name: "High" }).click();
    await expect.poll(async () => (await savedItem(page, "t-kickoff")).status).toBe("doing");

    await page.reload();
    await expect(page.getByTestId("list").getByRole("row", { name: /Persist me/ }).getByText("High")).toBeVisible();
    await expect(page.getByTestId("list").getByRole("row", { name: /#6 Kickoff/ }).getByText("In progress")).toBeVisible();
    await expect(page.getByTestId("list").getByRole("row", { name: /#9 Social media/ })).toHaveCount(0);
    await page.goto("/team/independents/juan-dela-cruz?view=list&archived=1");
    await expect(page.getByTestId("list").getByRole("row", { name: /#9 Social media templates/ })).toBeVisible();
  });
});

test.describe("persistence · notifications", () => {
  test("a notification links straight to the item", async ({ page, secondPage }) => {
    await open(page, "team", "?task=t-logos");
    await panel(page).getByRole("button", { name: "Approve" }).click();
    await expect(toast(page, "Approved #2 — Juan has been told")).toBeVisible();
    const [note] = await notes(page, "independent");
    expect(note.href).toBe("/independent/contracts/brand-designer?task=t-logos");
    const juan = await secondPage();
    await juan.goto(note.href);
    await expect(panel(juan).getByText(/Approved by Alex Rivera/).first()).toBeVisible();
    await expect(panel(juan).getByRole("heading", { name: "Activity" })).toBeVisible();
  });
});
