import type { Page } from "@playwright/test";
import { closePanel, expect, panel, test } from "./fixtures";

// The guided tours (src/lib/portal/tours.ts). Every other spec starts with all of them seen; these
// start with none, as a new account does.

const card = (page: Page) => page.locator('[role="dialog"][aria-modal="true"]');
const progress = (page: Page) => card(page).getByText(/^Step \d+ of \d+$/);
const overlay = (page: Page) => page.locator("[data-tour-overlay]");
const record = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("hireable.demo.tours") ?? "{}"));

test.describe("guided tours · the dashboard tour", () => {
  test.use({ seedOptions: { stores: { tours: {} } } });

  test("Hiro's tour starts on a first visit, steps by button and keyboard, and once finished doesn't start again", async ({ page }) => {
    await page.goto("/team");
    await expect(card(page)).toContainText("Hiro");
    await expect(card(page).getByRole("heading", { name: "Hey, I'm Hiro" })).toBeVisible();
    await expect(progress(page)).toHaveText("Step 1 of 8");
    // The first step has no Back, and its main button has the keyboard.
    await expect(card(page).getByRole("button", { name: "Back" })).toHaveCount(0);
    await expect(card(page).getByRole("button", { name: "Next" })).toBeFocused();
    await expect(overlay(page)).toHaveAttribute("data-tour-overlay", "centred");

    await card(page).getByRole("button", { name: "Next" }).click();
    await expect(progress(page)).toHaveText("Step 2 of 8");
    await expect(overlay(page)).toHaveAttribute("data-tour-overlay", "highlight");
    await page.keyboard.press("ArrowRight");
    await expect(progress(page)).toHaveText("Step 3 of 8");
    await page.keyboard.press("ArrowLeft");
    await expect(progress(page)).toHaveText("Step 2 of 8");
    // Every step on the dashboard finds what it points at.
    for (let n = 2; n < 8; n++) {
      await expect(overlay(page)).toHaveAttribute("data-tour-overlay", "highlight");
      await page.keyboard.press("ArrowRight");
    }
    await expect(progress(page)).toHaveText("Step 8 of 8");
    await expect(card(page).getByRole("button", { name: "Skip tour" })).toHaveCount(0);
    await card(page).getByRole("button", { name: "Finish" }).click();
    await expect(card(page)).toHaveCount(0);
    expect((await record(page))["team.home"]).toEqual({ status: "done", step: 7 });

    await page.reload();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await page.waitForTimeout(1200);
    await expect(card(page)).toHaveCount(0);
  });
});

test.describe("guided tours · skipping and Help", () => {
  test.use({ seedOptions: { stores: { tours: {} } } });

  test("skipping keeps the step, and Help resumes there or restarts from the top", async ({ page }) => {
    await page.goto("/team");
    await expect(progress(page)).toHaveText("Step 1 of 8");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Escape");
    await expect(card(page)).toHaveCount(0);
    expect((await record(page))["team.home"]).toEqual({ status: "skipped", step: 2 });

    await page.getByRole("button", { name: "Help and tours" }).click();
    await expect(page.getByText("Stopped at step 3 of 8")).toBeVisible();
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(progress(page)).toHaveText("Step 3 of 8");
    await card(page).getByRole("button", { name: "Skip tour" }).click();
    // Focus goes back to Help, where the tour was started from.
    await expect(page.getByRole("button", { name: "Help and tours" })).toBeFocused();

    await page.getByRole("button", { name: "Help and tours" }).click();
    await page.getByRole("button", { name: "Restart" }).click();
    await expect(progress(page)).toHaveText("Step 1 of 8");
  });

  test("a screen's own tour starts there, and Help on a screen without one opens getting started on the dashboard", async ({ page }) => {
    await page.goto("/team/hire");
    await expect(card(page).getByRole("heading", { name: "A paid trial" })).toBeVisible();
    await expect(progress(page)).toHaveText("Step 1 of 2");
    await page.keyboard.press("Escape");

    await page.goto("/team/settings");
    await page.waitForTimeout(1200);
    await expect(card(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Help and tours" }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page).toHaveURL(/\/team$/);
    await expect(progress(page)).toHaveText("Step 1 of 8");
  });
});

test.describe("guided tours · other screens", () => {
  test.use({ seedOptions: { stores: { tours: {} } } });

  test("Hira's tour on the Independent dashboard ends on its first key action", async ({ page }) => {
    await page.goto("/independent");
    await expect(card(page)).toContainText("Hira");
    await expect(card(page).getByRole("heading", { name: "Hey! I'm Hira" })).toBeVisible();
    for (let n = 1; n < 8; n++) await page.keyboard.press("ArrowRight");
    await expect(progress(page)).toHaveText("Step 8 of 8");
    await card(page).getByRole("button", { name: "Find a role" }).click();
    await expect(page).toHaveURL(/\/independent\/jobs$/);
    expect((await record(page))["independent.home"]).toEqual({ status: "done", step: 7 });
  });

  test("the contract workspace and Messages have their own tours on both sides, each step on its element", async ({ page }) => {
    const screens = [
      ["/team/independents/juan-dela-cruz", "Hiro", 5],
      ["/team/messages", "Hiro", 2],
      ["/independent/contracts/brand-designer", "Hira", 5],
      ["/independent/messages", "Hira", 2],
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

/** Steps 1 to n, for a tour whose every step points at something. */
const all = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

/**
 * Walks a screen's tour to its end. A renamed selector doesn't fail a tour, it just drops the step
 * to the middle of the screen, so `pointing` lists the steps that point at something and the rest
 * must be in the middle.
 */
async function walkTour(page: Page, path: string, guide: string, steps: number, pointing: number[]) {
  await page.goto(path);
  await expect(card(page)).toContainText(guide);
  for (let n = 1; n <= steps; n++) {
    await expect(progress(page)).toHaveText(`Step ${n} of ${steps}`);
    await expect(overlay(page), `${path} step ${n}`).toHaveAttribute("data-tour-overlay", pointing.includes(n) ? "highlight" : "centred");
    await page.keyboard.press("ArrowRight");
  }
  await expect(card(page)).toHaveCount(0);
}

test.describe("guided tours · every step finds its element", () => {
  test.use({ seedOptions: { stores: { tours: {} } } });

  // The dashboard's first step greets in the middle, and the seeded Job Board has no open role to point at.
  test("the Independent dashboard, Discover, Create Role, the Job Board and My applications", async ({ page }) => {
    await walkTour(page, "/independent", "Hira", 8, [2, 3, 4, 5, 6, 7, 8]);
    await walkTour(page, "/team/discover", "Hiro", 3, all(3));
    await walkTour(page, "/team/hire", "Hiro", 2, all(2));
    await walkTour(page, "/independent/jobs", "Hira", 3, [1, 2]);
    await walkTour(page, "/independent/jobs/applications", "Hira", 2, all(2));
  });

  test("Payments, an application and Earnings", async ({ page }) => {
    await walkTour(page, "/team/payments", "Hiro", 4, all(4));
    await walkTour(page, "/independent/jobs/applications/deal", "Hira", 2, all(2));
    await walkTour(page, "/independent/wallet", "Hira", 3, all(3));
  });
});

/** The live deal's role, as the Team Builder posted it: what the pipeline and a candidate's page need. */
const ROLE = { slug: "brand-designer", title: "Brand Designer", type: "trial", status: "Active", candidates: null, matched: null, interviews: null, offers: null, hired: null, updated: "2026-09-18", description: "Brand work for a B2B agency.", budget: "$1,600.00 - $2,000.00", duration: "30 Days", experience: "Advanced (5–8 years)", skills: ["Branding"], expectation: "", attachment: "", tasks: [{ title: "Audit the brand assets", week: 1, priority: "high" }], hires: 1 };

test.describe("guided tours · a role and its candidates", () => {
  test.use({ seedOptions: { stores: { tours: {}, "team.roles": [ROLE] } } });

  test("the pipeline, a candidate, and the role on the Job Board", async ({ page }) => {
    await walkTour(page, "/team/hire/roles/brand-designer", "Hiro", 4, all(4));
    await walkTour(page, "/team/hire/roles/brand-designer/candidates/deal", "Hiro", 4, all(4));
    // The Job Board lists what's been posted, which the seed leaves empty: post the role first.
    await page.evaluate((role) => {
      const saved = JSON.parse(localStorage.getItem("hireable.demo.deal") ?? "{}");
      saved.postings = [{ slug: role.slug, title: role.title, type: role.type, company: "Nairobi Solutions Inc.", rate: role.budget, rateRange: role.budget, level: role.experience, description: [role.description], skills: role.skills, expectation: "", duration: role.duration, posted: "Posted today", closes: "Open until filled", tasks: role.tasks }];
      localStorage.setItem("hireable.demo.deal", JSON.stringify(saved));
    }, ROLE);
    await walkTour(page, "/independent/jobs/brand-designer", "Hira", 3, all(3));
  });
});

test.describe("guided tours · the guide", () => {
  test.use({ seedOptions: { stores: { tours: {} } } });

  test("the guide peeks over the card with their name, and the card stays inside the window", async ({ page }) => {
    await page.goto("/independent");
    const guide = card(page).locator('img[src*="guide-hira"]');
    await expect(guide).toBeVisible();
    await expect(card(page).getByText("Hira", { exact: true })).toBeVisible();
    for (let n = 1; n <= 8; n++) {
      // The whole card, the guide above it included, is on screen at every step.
      const box = (await card(page).boundingBox())!;
      const view = page.viewportSize()!;
      expect(box.y, `step ${n}`).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height, `step ${n}`).toBeLessThanOrEqual(view.height);
      await page.keyboard.press("ArrowRight");
    }
  });
});
