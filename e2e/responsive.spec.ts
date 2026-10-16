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

// Phone navigation: the rail gives way to a tab bar along the bottom edge, and the open section's
// pages and everything else to the Menu sheet. The page carries no nav strip of its own.
test.describe("on a phone · navigation", () => {
  test("the tab bar and the Menu sheet reach every page", async ({ page }) => {
    await page.goto("/team");
    const tabs = page.getByRole("navigation", { name: "Sections" });
    await expect(tabs.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    // It sits along the bottom edge, in reach of the thumb.
    const box = (await tabs.boundingBox())!;
    expect(box.y + box.height).toBeGreaterThan((page.viewportSize()?.height ?? 0) - 2);
    await expect(page.getByRole("navigation", { name: "Home" })).toHaveCount(0);

    const menu = page.getByRole("dialog", { name: "Menu" });
    await tabs.getByRole("button", { name: "Menu" }).click();
    await menu.getByRole("link", { name: "Messages" }).click();
    await expect(page).toHaveURL(/\/team\/messages/);
    await expect(menu).toBeHidden();

    await tabs.getByRole("link", { name: "Hire" }).click();
    await expect(page).toHaveURL(/\/team\/hire$/);

    // A section with several pages opens to list them; one with a single page is a plain link.
    await tabs.getByRole("button", { name: "Menu" }).click();
    const payments = menu.getByRole("button", { name: "Payments" });
    await expect(payments).toHaveAttribute("aria-expanded", "false");
    await payments.click();
    await menu.getByRole("link", { name: "Disputes" }).click();
    await expect(page).toHaveURL(/\/team\/payments\/disputes$/);
    await expect(menu).toBeHidden();
    // Back in Menu, the open section is open already.
    await tabs.getByRole("button", { name: "Menu" }).click();
    await expect(menu.getByRole("button", { name: "Payments" })).toHaveAttribute("aria-expanded", "true");
    await menu.getByRole("link", { name: "Notifications" }).click();
    await expect(page).toHaveURL(/\/team\/notifications$/);

    // Help's tours are folded under its row until it's opened.
    await tabs.getByRole("button", { name: "Menu" }).click();
    const help = menu.getByRole("button", { name: /Need a hand/ });
    await expect(help).toHaveAttribute("aria-expanded", "false");
    await expect(menu.getByRole("button", { name: /Restart|Start/ })).toHaveCount(0);
    await help.click();
    await expect(menu.getByRole("button", { name: /Restart|Start/ }).first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();

    await tabs.getByRole("button", { name: "Menu" }).click();
    await menu.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("dialog", { name: "Log out?" })).toBeVisible();
  });
});

test.describe("on a phone · sheets", () => {
  test("a side sheet comes up from the bottom and a swipe down closes it", async ({ page }) => {
    await open(page, "team");
    await page.getByTestId("board").getByRole("group", { name: /^#4/ }).click();
    const sheet = page.locator("[data-slot=sheet-content]");
    await expect(sheet).toHaveAttribute("data-side", "bottom");
    const box = (await sheet.boundingBox())!;
    // A finger on the sheet's grab bar, dragged most of the way down the screen.
    const touch = await page.context().newCDPSession(page);
    const x = box.x + box.width / 2;
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: box.y + 8 }] });
    for (let i = 1; i <= 12; i++) await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: box.y + 8 + 40 * i }] });
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(sheet).toHaveCount(0);
  });
});
