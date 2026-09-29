import type { Page } from "@playwright/test";
import { expect, PATH, test } from "./fixtures";

// The proposal and the Trial Fit Score look the same to both sides, but each explains its score in
// the reader's own words: the Team Builder evaluates, and the talent is the one evaluated.

const tip = (page: Page) => page.locator('[data-slot="tooltip-content"]');

/** Points at the Trial Fit Score's ring, whose tooltip says when the final score lands. */
async function hoverTrialFitScore(page: Page) {
  const card = page.locator("section").filter({ has: page.getByRole("heading", { name: "Trial Fit Score" }) });
  await card.locator('[data-slot="tooltip-trigger"]').first().hover();
}

test("the Trial Fit Score's tooltip is in each side's own words", async ({ page, secondPage }) => {
  await page.goto(`${PATH.independent}?tab=overview`);
  await hoverTrialFitScore(page);
  await expect(tip(page)).toHaveText("Work Style, Profile and Performance are scored continuously during the trial. The Team Builder's evaluation is added once the trial ends, and the final score is available after they submit it.");

  const alex = await secondPage();
  await alex.goto(`${PATH.team}?tab=overview`);
  await hoverTrialFitScore(alex);
  await expect(tip(alex)).toHaveText("Work Style, Profile and Performance are scored continuously during the trial. Your evaluation is added once the trial ends, and the final score is available after you submit it.");
});

test.describe("a proposal's match", () => {
  test.use({ seedOptions: { deal: { stage: "proposal_sent", contract: null, offer: null, proposal: { version: 1, sent: "24 Sep 2026", rate: "$1,600 /month", letter: "Hi" } } } });

  test("the talent's own proposal explains the match in the talent's words", async ({ page }) => {
    await page.goto("/independent/jobs/applications/deal");
    await page.getByRole("button", { name: "View proposal & history" }).click();
    await page.getByRole("dialog").getByText(/^\d+% match$/).hover();
    await expect(tip(page)).toHaveText("Work Style fit against your quiz answers. Once your profile is complete it also weighs your skills and rate against the role; trial performance and the Team Builder's evaluation fold in later.");
  });
});
