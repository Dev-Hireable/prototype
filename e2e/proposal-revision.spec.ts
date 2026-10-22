import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// TB-104 / TB-106 — the Team Builder reviews a proposal: the pay, the start and a cover letter, read
// beside the role's trial tasks (the talent first reads those with the offer), with nothing to accept
// or ignore. Asking for a revision sends its note to the talent in Messages, linked to the proposal,
// and Send offer says why it waits until they resubmit. Today is Fri 25 Sep 2026.

const ROLE = {
  slug: "brand-designer",
  title: "Brand Designer",
  type: "trial",
  status: "Active",
  candidates: null,
  matched: null,
  interviews: null,
  offers: null,
  hired: null,
  updated: "2026-09-18",
  description: "Brand work for a B2B agency.",
  budget: "$1,600.00 - $2,000.00",
  duration: "30 Days",
  experience: "Advanced (5–8 years)",
  skills: ["Branding"],
  expectation: "",
  attachment: "",
  tasks: [
    { title: "Audit the brand assets", week: 1, priority: "high" },
    { title: "Draft two logo directions", week: 2, priority: "medium" },
  ],
  hires: 1,
};

/** Juan's proposal, in and not yet answered: $1,600 for the trial from Mon 5 Oct. */
const PROPOSAL_IN = {
  deal: { contract: null, offer: null, stage: "proposal_sent", proposal: { version: 1, sent: "24 Sep 2026", rate: "$1,600", letter: "Happy to start with the audit.", start: "2026-10-05" } },
  stores: { "team.roles": [ROLE] },
};

const NOTE = "Could you start a week later, at the same rate?";

/** Alex opens Juan's proposal from the role's pipeline. Returns the review. */
async function openReview(page: Page) {
  await page.goto(`/team/hire/roles/${ROLE.slug}`);
  await page.getByRole("button", { name: "Review Proposal" }).click();
  return page.getByRole("dialog", { name: "Juan's proposal for Brand Designer" });
}

test.describe("proposal review · what a proposal carries", () => {
  test.use({ seedOptions: PROPOSAL_IN });

  test("the role's trial tasks sit beside the pay and the dates, with nothing to accept or ignore, and Send offer is open", async ({ page }) => {
    const review = await openReview(page);
    await expect(review).toContainText("Proposal from Juan D.");
    await expect(review).toContainText("05 Oct to 13 Nov 2026");
    await expect(review).toContainText("Your trial tasks. Juan sees them with your offer.");
    await expect(review.getByText("Suggested task changes")).toHaveCount(0);
    await expect(review.getByRole("button", { name: "Accept" })).toHaveCount(0);
    await expect(review.getByRole("button", { name: "Send offer" })).toBeEnabled();
  });
});

test.describe("proposal review · asking for a revision", () => {
  test.use({ seedOptions: PROPOSAL_IN });

  test("the note reaches Juan in Messages, linked to the proposal, and Send offer waits for his resubmission", async ({ page, secondPage }) => {
    const review = await openReview(page);
    await review.getByRole("button", { name: "Request revision" }).click();
    const ask = page.getByRole("dialog", { name: "Request a revision" });
    await expect(ask).toContainText("Juan gets your note in Messages and can resubmit.");
    await ask.getByRole("textbox", { name: "What should change?" }).fill(NOTE);
    await ask.getByRole("button", { name: "Send request" }).click();
    await expect(review).toContainText("Send offer opens when Juan resubmits.");
    await expect(review.getByRole("button", { name: "Send offer" })).toBeDisabled();

    // In the thread itself: the conversation list previews the note too.
    const juan = await secondPage();
    await juan.goto("/independent/messages");
    const thread = juan.locator("section");
    await expect(thread.getByText("Alex Rivera asked for changes to the Brand Designer proposal")).toBeVisible();
    await expect(thread.getByText(NOTE)).toBeVisible();
    await expect(thread.getByRole("button", { name: "On Proposal v1 · Brand Designer" })).toBeVisible();
  });
});
