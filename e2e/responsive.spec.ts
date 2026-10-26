import { expect, open, PATH, savedDeal, test, toast, view } from "./fixtures";

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

// Phone navigation: the rail gives way to a tab bar along the bottom edge, and everything else to
// the Menu sheet; a section's own pages also sit in a row over each of them.
test.describe("on a phone · navigation", () => {
  test("the tab bar and the Menu sheet reach every page", async ({ page }) => {
    await page.goto("/team");
    const tabs = page.getByRole("navigation", { name: "Sections" });
    await expect(tabs.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    // It sits along the bottom edge, in reach of the thumb.
    const box = (await tabs.boundingBox())!;
    expect(box.y + box.height).toBeGreaterThan((page.viewportSize()?.height ?? 0) - 2);
    // No section panel and no row of its pages over the page: they're in the Menu sheet, once.
    await expect(page.getByRole("navigation", { name: "Home", exact: true })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Home pages" })).toHaveCount(0);

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

test.describe("on a phone · section pages", () => {
  test("a section's pages are in the Menu sheet, not repeated over the page, and the role wizard has the whole screen", async ({ page }) => {
    await page.goto("/independent/jobs");
    await expect(page.getByRole("navigation", { name: "Job Board pages" })).toHaveCount(0);
    await page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: "Menu" }).click();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "My applications" }).click();
    await expect(page).toHaveURL(/\/independent\/jobs\/applications$/);

    await page.goto("/team/hire/new?type=trial");
    await expect(page.getByRole("button", { name: "Save as draft" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Sections" })).toBeHidden();
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

// Cancelling a contract before its first day on a phone: the reason, the note and the typed name
// all fit, the keyboard can't hide what's being typed into, and 16px fields keep the page from
// zooming in on focus.
test.describe("on a phone · cancelling a contract", () => {
  test.use({ seedOptions: { contract: { started: "2026-10-05", ends: "2026-11-13" } } });

  test("the dialog fits the screen, and every field and the confirm can be reached", async ({ page }) => {
    await page.goto(`${PATH.independent}?tab=contract`);
    await page.getByRole("button", { name: "Cancel contract" }).click();
    const dialog = page.getByRole("dialog", { name: "Cancel the Brand Designer contract?" });
    await expect(dialog).toBeVisible();
    const screen = page.viewportSize()!;
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(screen.width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

    const typed = dialog.getByRole("textbox", { name: "Type Brand Designer to confirm" });
    const note = dialog.getByRole("textbox", { name: /Anything else/ });
    for (const field of [note, typed]) expect(await field.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);

    await dialog.getByRole("button", { name: "Reason" }).click();
    await page.getByRole("option", { name: "Plans changed" }).click();
    await typed.tap();
    await typed.fill("Brand Designer");
    await expect(typed).toBeInViewport();
    const confirm = dialog.getByRole("button", { name: "Cancel contract" });
    await confirm.scrollIntoViewIfNeeded();
    await expect(confirm).toBeInViewport();
    await confirm.tap();
    await expect(toast(page, "Contract cancelled")).toBeVisible();
    expect((await savedDeal(page)).contract.cancelReason).toEqual({ by: "independent", reason: "Plans changed" });
  });
});
