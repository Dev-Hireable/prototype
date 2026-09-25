import { card, column, drag, expect, open, panel, savedItem, test } from "./fixtures";

// Two people — or one person in two tabs — on the same contract.
test.describe("two tabs on one contract", () => {
  test("a change in one tab shows in the other without a reload", async ({ page, secondPage }) => {
    await open(page, "team");
    const juan = await secondPage();
    await open(juan, "independent");
    await drag(juan, card(juan, /#4 Pick a typography pairing/), column(juan, "In progress"));
    await expect(column(page, "In progress").getByRole("group", { name: /#4 Pick a typography pairing/ })).toBeVisible();
  });

  test("edits to different fields both land", async ({ page, secondPage }) => {
    await open(page, "team", "?view=list");
    const other = await secondPage();
    await open(other, "team", "?view=list");
    await page.getByTestId("list").getByRole("row", { name: /#7 Share/ }).getByRole("button", { name: /Assignee: Unassigned/ }).click();
    await page.getByRole("menuitemradio", { name: "Alex" }).click();
    await other.getByTestId("list").getByRole("row", { name: /#7 Share/ }).getByRole("button", { name: "Set priority" }).click();
    await other.getByRole("menuitem", { name: "High" }).click();
    await expect.poll(async () => savedItem(page, "t-share").then((t) => [t.assignee, t.priority])).toEqual(["team", "high"]);
  });

  test("the same field edited in both: the second is told, and can keep theirs", async ({ page, secondPage }) => {
    await open(page, "team", "?task=t-share");
    const other = await secondPage();
    await open(other, "team", "?task=t-share");
    const mine = panel(other).getByRole("textbox", { name: "Name" });
    await mine.click();
    await mine.fill("Share the style tiles — second draft");
    // Meanwhile, the first tab renames it and saves.
    const theirs = panel(page).getByRole("textbox", { name: "Name" });
    await theirs.click();
    await theirs.fill("Share the style tiles with marketing");
    await theirs.press("Enter");
    await expect.poll(async () => (await savedItem(page, "t-share")).title).toBe("Share the style tiles with marketing");
    // The second tab keeps its draft and says someone else changed it.
    await expect(panel(other).getByText(/changed this while you were editing/)).toBeVisible();
    await expect(mine).toHaveValue("Share the style tiles — second draft");
    await mine.press("Enter");
    const alert = other.getByRole("alert").filter({ hasText: "changed the name while you were editing" });
    await expect(alert).toBeVisible();
    expect((await savedItem(other, "t-share")).title).toBe("Share the style tiles with marketing");
    await alert.getByRole("button", { name: "Use mine" }).click();
    await expect.poll(async () => (await savedItem(other, "t-share")).title).toBe("Share the style tiles — second draft");
  });
});
