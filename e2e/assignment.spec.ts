import { card, column, drag, expect, notes, open, savedItem, test } from "./fixtures";

// Scenario E — who does the work: assigning, the Team Builder's own items, and the trial score.
test.describe("assignment", () => {
  test("an item assigned to the Team Builder is theirs to finish, and doesn't touch the trial score", async ({ page }) => {
    await open(page, "team", "?view=list");
    const score = await page.getByLabel("Summary").getByText(/Trial Fit Score/).textContent();
    const row = page.getByTestId("list").getByRole("row", { name: /#7 Share the style tiles/ });
    await row.getByRole("button", { name: /Assignee: Unassigned/ }).click();
    await page.getByRole("menuitemradio", { name: "Alex" }).click();
    await expect.poll(async () => (await savedItem(page, "t-share")).assignee).toBe("team");
    await row.getByRole("button", { name: /Change status/ }).click();
    await page.getByRole("menuitem", { name: "Done" }).click();
    await expect.poll(async () => (await savedItem(page, "t-share")).status).toBe("done");
    await expect(page.getByLabel("Summary").getByText(/Trial Fit Score/)).toHaveText(score as string);
    // Nobody was told about the Team Builder's own work.
    expect((await notes(page, "independent")).some((n) => /Share the style tiles/.test(n.title))).toBe(false);
  });

  test("grouped by assignee, dropping on a person reassigns", async ({ page }) => {
    await open(page, "team", "?group=assignee");
    await drag(page, card(page, /#9 Social media templates/), column(page, "Alex"));
    await expect(column(page, "Alex").getByRole("group", { name: /#9/ })).toBeVisible();
    expect((await savedItem(page, "t-social")).assignee).toBe("team");
    await drag(page, card(page, /#9 Social media templates/), column(page, "Unassigned"));
    expect((await savedItem(page, "t-social")).assignee).toBe(null);
    await drag(page, card(page, /#9 Social media templates/), column(page, "Juan"));
    expect((await savedItem(page, "t-social")).assignee).toBe("independent");
    expect((await notes(page, "independent"))[0].title).toBe("New task added");
  });

  test("work agreed in the offer stays with the Independent", async ({ page }) => {
    await open(page, "team", "?view=list");
    const row = page.getByTestId("list").getByRole("row", { name: /#4 Pick a typography pairing/ });
    await expect(row.getByText("Juan")).toBeVisible();
    await expect(row.getByRole("button", { name: /Change assignee/ })).toHaveCount(0);
  });
});
