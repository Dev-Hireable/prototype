import { expect, open, test, view } from "./fixtures";

// Phone width (the mobile project): the workspace still works — views, the board scrolling
// sideways inside itself, the calendar as an agenda, an item opening full width.
test.describe("on a phone", () => {
  test("the workspace is usable and the page doesn't scroll sideways", async ({ page }) => {
    await open(page, "team");
    await expect(page.getByTestId("board")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await view(page, "Calendar").click();
    await expect(page.getByTestId("calendar").getByRole("heading", { name: /Fri 25 Sep 2026 · Today/ })).toBeVisible();
    await page.getByTestId("calendar").getByRole("button", { name: "Kickoff call with marketing" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
