import { card, column, drag, expect, notes, open, savedItem, test, toast, view } from "./fixtures";

// Scenario D — status changes on the board, by drag, menu and keyboard, within the rules.
test.describe("moving work through statuses · by drag", () => {
  test("the Team Builder works their own item straight to Done", async ({ page }) => {
    await open(page, "team");
    const kickoff = card(page, /#6 Kickoff call with marketing/);
    await drag(page, kickoff, column(page, "In progress"));
    await expect(column(page, "In progress").getByRole("group", { name: /#6 Kickoff/ })).toBeVisible();
    expect((await savedItem(page, "t-kickoff")).status).toBe("doing");
    await drag(page, card(page, /#6 Kickoff/), column(page, "Done"));
    await expect(column(page, "Done").getByRole("group", { name: /#6 Kickoff/ })).toBeVisible();
    expect(await savedItem(page, "t-kickoff")).toMatchObject({ status: "done", completedBy: "Alex Rivera" });
    // The list reads the same record.
    await view(page, "List").click();
    await expect(page.getByTestId("list").getByRole("row", { name: /#6 Kickoff/ }).getByText("Done")).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("list").getByRole("row", { name: /#6 Kickoff/ }).getByText("Done")).toBeVisible();
  });

  test("the Independent submits work; the Team Builder approves it by dropping on Done", async ({ page, secondPage }) => {
    await open(page, "independent");
    await drag(page, card(page, /#4 Pick a typography pairing/), column(page, "In progress"));
    await expect(column(page, "In progress").getByRole("group", { name: /#4/ })).toBeVisible();
    await drag(page, card(page, /#4 Pick a typography pairing/), column(page, "In review"));
    await expect(toast(page, "Sent #4 to Alex for review")).toBeVisible();
    expect(await savedItem(page, "t-type")).toMatchObject({ status: "review" });
    expect((await notes(page, "team"))[0].title).toBe("Juan Dela Cruz sent a task for review");

    const alex = await secondPage();
    await open(alex, "team");
    await drag(alex, card(alex, /#4 Pick a typography pairing/), column(alex, "Done"));
    await expect(toast(alex, "Approved #4 — Juan has been told")).toBeVisible();
    expect(await savedItem(alex, "t-type")).toMatchObject({ status: "done", approved: { by: "Alex Rivera" } });
    expect((await notes(alex, "independent"))[0].title).toBe("Task approved");
  });

  test("dropping submitted work back on In progress asks for a note first", async ({ page }) => {
    await open(page, "team");
    await drag(page, card(page, /#2 Draft two logo directions/), column(page, "In progress"));
    const note = page.getByRole("textbox", { name: "What should change" });
    await expect(note).toBeFocused();
    expect((await savedItem(page, "t-logos")).status).toBe("review");
    await expect(page.getByRole("button", { name: "Request changes" })).toBeDisabled();
    await note.fill("Try a heavier weight on the wordmark");
    await page.getByRole("button", { name: "Request changes" }).click();
    await expect(toast(page, "Sent #2 back to Juan with your note")).toBeVisible();
    expect(await savedItem(page, "t-logos")).toMatchObject({ status: "doing", changes: { note: "Try a heavier weight on the wordmark" } });
    expect((await notes(page, "independent"))[0].title).toBe("Changes requested on a task");
  });
});

test.describe("moving work through statuses · within the rules", () => {
  test("columns a card can't go to don't take it", async ({ page }) => {
    await open(page, "independent");
    await drag(page, card(page, /#4 Pick a typography pairing/), column(page, "Done"));
    expect((await savedItem(page, "t-type")).status).toBe("todo");
    await expect(column(page, "To do").getByRole("group", { name: /#4/ })).toBeVisible();
    // Someone else's work isn't draggable at all.
    await expect(card(page, /#6 Kickoff/)).toHaveAttribute("draggable", "false");
    await open(page, "team");
    await expect(card(page, /#4 Pick a typography pairing/)).toHaveAttribute("draggable", "true"); // reorderable
    await drag(page, card(page, /#4 Pick a typography pairing/), column(page, "In progress"));
    expect((await savedItem(page, "t-type")).status).toBe("todo");
  });
});

test.describe("moving work through statuses · by keyboard and menu", () => {
  test("the keyboard moves a card: Alt+Shift+arrows and the Move to menu", async ({ page }) => {
    await open(page, "team");
    const kickoff = card(page, /#6 Kickoff/);
    await kickoff.focus();
    await page.keyboard.press("Alt+Shift+ArrowRight");
    await expect(column(page, "In progress").getByRole("group", { name: /#6 Kickoff/ })).toBeVisible();
    expect((await savedItem(page, "t-kickoff")).status).toBe("doing");
    await expect(column(page, "In progress").getByRole("group", { name: /#6 Kickoff/ })).toBeFocused();
    await page.getByRole("button", { name: /More actions for #6/ }).click();
    await page.getByRole("menuitem", { name: "Done" }).click();
    await expect(column(page, "Done").getByRole("group", { name: /#6 Kickoff/ })).toBeVisible();
    expect((await savedItem(page, "t-kickoff")).status).toBe("done");
  });
});

test.describe("moving work through statuses · order within a column", () => {
  test("reordering within a column is saved", async ({ page }) => {
    await open(page, "team");
    const todo = column(page, "To do");
    const first = todo.getByRole("group").first();
    await expect(first).toHaveAccessibleName(/#4/);
    // Both on screen: #6, third in the column, dropped on top of #4.
    await drag(page, card(page, /#6 Kickoff call/), card(page, /#4 Pick a typography pairing/), { targetY: 4 });
    await expect(todo.getByRole("group").first()).toHaveAccessibleName(/#6/);
    const [kickoff, type] = [await savedItem(page, "t-kickoff"), await savedItem(page, "t-type")];
    expect(kickoff.order as number).toBeLessThan(type.order as number);
    expect(kickoff.status).toBe("todo");
    await page.reload();
    await expect(column(page, "To do").getByRole("group").first()).toHaveAccessibleName(/#6/);
  });
});
