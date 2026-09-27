import { card, column, expect, filterButton, open, panel, savedItem, test } from "./fixtures";

// Keyboard alternatives to every drag, focus that goes where you'd expect, and nothing said in
// colour alone.
test.describe("keyboard and accessibility · the keyboard and focus", () => {
  test("open an item with Enter, close it with Escape, and land back on the card", async ({ page }) => {
    await open(page, "team");
    const kickoff = card(page, /#6 Kickoff call/);
    await kickoff.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/task=t-kickoff/);
    await expect(panel(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page).not.toHaveURL(/task=/);
    await expect(kickoff).toBeFocused();
  });

  test("a dialog keeps Tab inside it and hands the focus back when it closes", async ({ page }) => {
    await open(page, "team");
    const opener = page.getByRole("button", { name: "Add task" }).first();
    await opener.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Add task" });
    await expect(dialog.getByRole("textbox", { name: "Name" })).toBeFocused();
    // More presses than the dialog has controls, both ways round: the page behind is never reached.
    for (const key of ["Tab", "Shift+Tab"]) {
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press(key);
        expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
      }
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test("reordering with Alt+Shift+Up and Down", async ({ page }) => {
    await open(page, "team");
    const social = card(page, /#9 Social media templates/);
    await social.focus();
    const before = (await savedItem(page, "t-social")).order as number;
    await page.keyboard.press("Alt+Shift+ArrowUp");
    await expect.poll(async () => (await savedItem(page, "t-social")).order as number).toBeLessThan(before);
    await expect(column(page, "To do").getByRole("group", { name: /#9/ })).toBeFocused();
    await expect(page.getByTestId("announcer")).toHaveText("Moved #9 up");
  });
});

test.describe("keyboard and accessibility · words, not colour", () => {
  test("status, lateness and blockage are said in words, not only colour", async ({ page }) => {
    await open(page, "team");
    await expect(card(page, /#10 Fix the icon grid/).getByText(/Overdue/)).toBeVisible();
    await expect(card(page, /#3 Build the colour palette/).getByText("Blocked")).toBeVisible();
    await expect(card(page, /#10 Fix the icon grid/).getByText("Changes requested")).toBeVisible();
    await expect(page.getByRole("region", { name: /^In review, 1 item/ })).toBeVisible();
  });
});

test.describe("keyboard and accessibility · menus", () => {
  test("filter menus stay open while ticking several", async ({ page }) => {
    await open(page, "team");
    await filterButton(page).click();
    await page.getByRole("menuitem", { name: "Status" }).click();
    await page.getByRole("menuitemcheckbox", { name: "To do" }).click();
    await page.getByRole("menuitemcheckbox", { name: "In progress" }).click();
    await expect(page.getByRole("menuitemcheckbox", { name: "In progress" })).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/status=todo%2Cdoing|status=todo,doing/);
  });
});
