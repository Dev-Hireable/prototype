import type { Page } from "@playwright/test";
import { closePanel, expect, panel, test } from "./fixtures";

// The guided tours (src/lib/portal/tours.ts). Every other spec starts with all of them seen; these
// start with none, as a new account does.

const card = (page: Page) => page.locator('[role="dialog"][aria-modal="true"]');
const progress = (page: Page) => card(page).getByText(/^Step \d+ of \d+$/);
const overlay = (page: Page) => page.locator("[data-tour-overlay]");
const record = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("hireable.demo.tours") ?? "{}"));

test.describe("guided tours", () => {
  test.use({ seedOptions: { stores: { tours: {} } } });

  test("Hiro's tour starts on a first visit, steps by button and keyboard, and once finished doesn't start again", async ({ page }) => {
    await page.goto("/team");
    await expect(card(page)).toContainText("Hiro");
    await expect(card(page).getByRole("heading", { name: "Hey, I'm Hiro" })).toBeVisible();
    await expect(progress(page)).toHaveText("Step 1 of 7");
    // The first step has no Back, and its main button has the keyboard.
    await expect(card(page).getByRole("button", { name: "Back" })).toHaveCount(0);
    await expect(card(page).getByRole("button", { name: "Next" })).toBeFocused();
    await expect(overlay(page)).toHaveAttribute("data-tour-overlay", "centred");

    await card(page).getByRole("button", { name: "Next" }).click();
    await expect(progress(page)).toHaveText("Step 2 of 7");
    await expect(overlay(page)).toHaveAttribute("data-tour-overlay", "highlight");
    await page.keyboard.press("ArrowRight");
    await expect(progress(page)).toHaveText("Step 3 of 7");
    await page.keyboard.press("ArrowLeft");
    await expect(progress(page)).toHaveText("Step 2 of 7");
    // Every step on the dashboard finds what it points at.
    for (let n = 2; n < 7; n++) {
      await expect(overlay(page)).toHaveAttribute("data-tour-overlay", "highlight");
      await page.keyboard.press("ArrowRight");
    }
    await expect(progress(page)).toHaveText("Step 7 of 7");
    await expect(card(page).getByRole("button", { name: "Skip tour" })).toHaveCount(0);
    await card(page).getByRole("button", { name: "Finish" }).click();
    await expect(card(page)).toHaveCount(0);
    expect((await record(page))["team.home"]).toEqual({ status: "done", step: 6 });

    await page.reload();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await page.waitForTimeout(1200);
    await expect(card(page)).toHaveCount(0);
  });

  test("skipping keeps the step, and Help resumes there or restarts from the top", async ({ page }) => {
    await page.goto("/team");
    await expect(progress(page)).toHaveText("Step 1 of 7");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Escape");
    await expect(card(page)).toHaveCount(0);
    expect((await record(page))["team.home"]).toEqual({ status: "skipped", step: 2 });

    await page.getByRole("button", { name: "Help and tours" }).click();
    await expect(page.getByText("Stopped at step 3 of 7")).toBeVisible();
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(progress(page)).toHaveText("Step 3 of 7");
    await card(page).getByRole("button", { name: "Skip tour" }).click();
    // Focus goes back to Help, where the tour was started from.
    await expect(page.getByRole("button", { name: "Help and tours" })).toBeFocused();

    await page.getByRole("button", { name: "Help and tours" }).click();
    await page.getByRole("button", { name: "Restart" }).click();
    await expect(progress(page)).toHaveText("Step 1 of 7");
  });

  test("a screen's own tour starts there, and Help on a screen without one opens getting started on the dashboard", async ({ page }) => {
    await page.goto("/team/hire");
    await expect(card(page).getByRole("heading", { name: "A paid trial" })).toBeVisible();
    await expect(progress(page)).toHaveText("Step 1 of 2");
    await page.keyboard.press("Escape");

    await page.goto("/team/payments");
    await page.waitForTimeout(1200);
    await expect(card(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Help and tours" }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page).toHaveURL(/\/team$/);
    await expect(progress(page)).toHaveText("Step 1 of 7");
  });

  test("Hira's tour on the Independent dashboard ends on its first key action", async ({ page }) => {
    await page.goto("/independent");
    await expect(card(page)).toContainText("Hira");
    await expect(card(page).getByRole("heading", { name: "Hey! I'm Hira" })).toBeVisible();
    for (let n = 1; n < 7; n++) await page.keyboard.press("ArrowRight");
    await expect(progress(page)).toHaveText("Step 7 of 7");
    await card(page).getByRole("button", { name: "Find a role" }).click();
    await expect(page).toHaveURL(/\/independent\/jobs$/);
    expect((await record(page))["independent.home"]).toEqual({ status: "done", step: 6 });
  });
  test("the contract workspace and Messages have their own tours on both sides, each step on its element", async ({ page }) => {
    const screens = [
      ["/team/independents/juan-dela-cruz", "Hiro", 5],
      ["/team/messages", "Hiro", 3],
      ["/independent/contracts/brand-designer", "Hira", 5],
      ["/independent/messages", "Hira", 3],
    ] as const;
    for (const [path, guide, steps] of screens) {
      await page.goto(path);
      await expect(card(page)).toContainText(guide);
      for (let n = 1; n <= steps; n++) {
        await expect(progress(page)).toHaveText(`Step ${n} of ${steps}`);
        await expect(overlay(page), `${path} step ${n}`).toHaveAttribute("data-tour-overlay", "highlight");
        await page.keyboard.press("ArrowRight");
      }
      await expect(card(page)).toHaveCount(0);
    }
    const seen = await record(page);
    for (const id of ["team.contract", "team.messages", "independent.contract", "independent.messages"]) expect(seen[id]?.status, id).toBe("done");
  });

  test("a task a notification opened keeps the screen: the tour waits for its sheet to close", async ({ page }) => {
    await page.goto("/team/independents/juan-dela-cruz?task=t-logos&focus=comments");
    await expect(panel(page)).toBeVisible();
    await page.waitForTimeout(1200);
    await expect(overlay(page)).toHaveCount(0);
    await closePanel(page);
    await expect(progress(page)).toHaveText("Step 1 of 5");
    await expect(overlay(page)).toHaveAttribute("data-tour-overlay", "highlight");
  });
});
