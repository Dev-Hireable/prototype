import { card, closePanel, expect, open, panel, savedItem, test } from "./fixtures";

// Scenario G — effort, and how it adds up per person per day.
test.describe("effort and workload · an item's effort", () => {
  test("effort: a preset, any whole number, or none — relative, not hours", async ({ page }) => {
    await open(page, "team", "?task=t-share");
    const p = panel(page);
    await p.getByRole("button", { name: "Set effort" }).click();
    await expect(page.getByText("Relative estimate of the amount of work required.").first()).toBeVisible();
    await page.getByRole("button", { name: "8", exact: true }).click();
    await expect.poll(async () => (await savedItem(page, "t-share")).effort).toBe(8);
    // The card says it too, behind the sheet.
    await closePanel(page);
    await expect(card(page, /#7 Share the style tiles/).getByLabel("Effort 8")).toBeVisible();
    await card(page, /#7 Share the style tiles/).click();
    await p.getByRole("button", { name: "Effort: 8. Change effort" }).click();
    await page.getByRole("textbox", { name: "Effort, a whole number" }).fill("21");
    await page.getByRole("button", { name: "Set", exact: true }).click();
    await expect.poll(async () => (await savedItem(page, "t-share")).effort).toBe(21);
    await p.getByRole("button", { name: "Effort: 21. Change effort" }).click();
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await expect.poll(async () => (await savedItem(page, "t-share")).effort).toBeUndefined();
  });
});

// Juan's open work in the window, from the seed: the logo draft (5 over the seven working days
// 22–30 Sep, 0.71 a day), the icon grid (1, due Wed 23), the palette (3 over the six working days
// 25 Sep – 2 Oct, 0.5 a day) and the typography pairing (2 over the six working days 28 Sep –
// 5 Oct, 0.33 a day). Alex has the kickoff call (1, due Tue 29).
test.describe("effort and workload · the workload view", () => {
  test("workload spreads effort across the working days between start and due", async ({ page }) => {
    await open(page, "team", "?view=workload");
    const grid = page.getByTestId("workload");
    await expect(grid.getByLabel(/^Juan, Tue 22 Sep 2026: 0\.7\. 1 item$/)).toBeVisible();
    await expect(grid.getByLabel(/^Juan, Wed 23 Sep 2026: 1\.7\. 2 items$/)).toBeVisible();
    await expect(grid.getByLabel(/^Juan, Fri 25 Sep 2026: 1\.2\. 2 items$/)).toBeVisible();
    await expect(grid.getByLabel(/^Juan, Mon 28 Sep 2026: 1\.5\. 3 items$/)).toBeVisible();
    // A weekend: nothing is spread onto it.
    await expect(grid.getByLabel("Juan, Sat 26 Sep 2026: nothing")).toBeVisible();
    // Alex's due-only call, all on its day.
    await expect(grid.getByLabel(/^Alex, Tue 29 Sep 2026: 1\. 1 item$/)).toBeVisible();
    // Undated work is listed apart, not spread anywhere.
    await expect(grid.getByLabel("1 item with no dates for Unassigned")).toBeVisible();
    await expect(grid.getByLabel("1 item with no dates for Juan")).toBeVisible();
    // A cell opens the items behind it, with each one's share.
    await grid.getByLabel(/^Juan, Mon 28 Sep 2026/).first().click();
    await expect(page.getByRole("button", { name: /#3 Build the colour palette 0\.5$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /#4 Pick a typography pairing 0\.3$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /#2 Draft two logo directions 0\.7$/ })).toBeVisible();
  });

  test("done work counts only when asked; the Items measure counts what's in flight", async ({ page }) => {
    await open(page, "team", "?view=workload");
    const grid = page.getByTestId("workload");
    await expect(grid.getByLabel(/^Juan, Thu 24 Sep 2026: 0\.7\. 1 item$/)).toBeVisible();
    await page.getByText("Include done").click();
    // The approved brand audit (3, due Thu 24) joins in.
    await expect(grid.getByLabel(/^Juan, Thu 24 Sep 2026: 3\.7\. 2 items$/)).toBeVisible();
    await expect(page).toHaveURL(/done=1/);
    await page.getByRole("radio", { name: "Items" }).click();
    await expect(grid.getByLabel(/^Juan, Mon 28 Sep 2026: 3\. 3 items$/)).toBeVisible();
    await expect(page).toHaveURL(/metric=count/);
  });

  test("the window moves, and says there's no capacity line", async ({ page }) => {
    // Weeks start on Sunday: two of them from the one today (Fri 25 Sep) is in.
    await open(page, "team", "?view=workload");
    await expect(page.getByText("20 Sep – 3 Oct")).toBeVisible();
    await page.getByRole("button", { name: "Later" }).click();
    await expect(page.getByText("4 Oct – 17 Oct")).toBeVisible();
    await expect(page.getByTestId("workload").getByLabel(/^Juan, Fri 16 Oct 2026: 8\. 1 item$/)).toBeVisible();
    await page.getByRole("button", { name: "This week" }).click();
    await expect(page.getByText("20 Sep – 3 Oct")).toBeVisible();
    await page.getByText(/How this is worked out/).click();
    await expect(page.getByText(/Effort is relative, not hours, so there's no capacity line/)).toBeVisible();
  });
});
