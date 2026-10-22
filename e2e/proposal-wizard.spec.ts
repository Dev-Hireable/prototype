import type { Page } from "@playwright/test";
import { expect, savedDeal, test } from "./fixtures";

// IN-072 / IN-073 — the Independent's proposal: the pay and the day they'd start, a cover letter,
// then the proposal as the Team Builder will read it. A first one waits on a payout method and the
// ID check, said up front on the application; a revision starts from the version sent, under the
// change the Team Builder asked for. No tasks are proposed: a trial's are shared with the offer.
// Today is Fri 25 Sep 2026.

const APPLICATION = "/independent/jobs/applications/deal";
/** One payout method on file and the ID not checked yet, so the ID is all a first proposal waits on. */
const PAYOUT = { id: "maya", brand: "Maya", last4: "4471", holder: "Juan Dela Cruz", verified: "Verified 8 Sep 2026", detail: "E-wallet", isDefault: true };
const REQUESTED = { stage: "proposal_requested", contract: null, offer: null, proposal: null, proposalRequest: { note: "Send your pay and the day you'd start.", date: "24 Sep 2026" } };
const NOTE = "Could you look at the timing of the logo work again?";
const REVISION = { stage: "proposal_requested", contract: null, offer: null, proposal: { version: 1, sent: "24 Sep 2026", rate: "$1,600", letter: "Happy to help.", start: "2026-10-05" }, revision: { note: NOTE, date: "25 Sep 2026" } };

const step = (page: Page) => page.locator("li[aria-current=step]");

/** Step one: the pay, and the start the offer will use, with where the trial's working days end. Leaves it on step two. */
async function payAndStart(page: Page, end: string) {
  await expect(step(page)).toHaveText("Pay and start date");
  await expect(page.getByText(`Your offer will use this start date. The trial runs 30 working days, to ${end}.`)).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(step(page)).toHaveText("Cover letter");
}

/** The ID check from the proposal's own Payout and ID check, then Submit opens. */
async function verifyId(page: Page) {
  const checks = page.getByRole("region", { name: "Payout and ID check" });
  await checks.getByRole("button", { name: "Verify ID" }).click();
  const verify = page.getByRole("dialog", { name: "Verify your ID" });
  await verify.getByRole("checkbox", { name: /is mine and in my legal name/ }).check();
  await verify.getByRole("button", { name: "Verify ID" }).click();
  await expect(verify).toBeHidden();
}

/** The confirmation once it's sent: the company told, the proposal linked from the thread. */
async function expectSent(page: Page) {
  const sent = page.getByRole("dialog", { name: "Proposal sent" });
  await expect(sent).toContainText("Nairobi Solutions Inc. has been notified. You can open it any time from your Messages thread.");
  await expect(sent.getByRole("link", { name: "Open messages" })).toHaveAttribute("href", "/independent/messages");
  await expect(sent.getByRole("link", { name: "Back to application" })).toHaveAttribute("href", APPLICATION);
}

test.describe("proposal wizard · a first proposal", () => {
  test.use({ seedOptions: { deal: REQUESTED, stores: { "ind.payouts": [PAYOUT] } } });

  test("pay and start, a cover letter, then the ID check before it can go", async ({ page }) => {
    // Said early, on the application: what's still to set up before a first proposal.
    await page.goto(APPLICATION);
    await expect(page.getByText("You'll need to verify your ID before sending your first proposal.")).toBeVisible();
    await page.getByRole("link", { name: "Submit proposal" }).click();
    await expect(page.getByRole("heading", { name: "Proposal for Brand Designer" })).toBeVisible();

    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
    await page.getByRole("textbox", { name: "Your pay for the trial", exact: true }).fill("1600");
    await payAndStart(page, "05 Nov 2026");
    await expect(page.getByRole("button", { name: "Review & send" })).toBeDisabled();
    await page.getByRole("textbox", { name: "Cover letter" }).fill("Eight years of brand work for SaaS teams.");
    await page.getByRole("button", { name: "Review & send" }).click();

    // As the Team Builder will read it: "Juan D." before any hire.
    await expect(page.getByText("Preview", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Proposal from Juan D." })).toBeVisible();
    const submit = page.getByRole("button", { name: "Submit proposal" });
    await expect(submit).toBeDisabled();
    await verifyId(page);
    await submit.click();
    await expectSent(page);
    expect(await savedDeal(page)).toMatchObject({ stage: "proposal_sent", proposal: { version: 1, rate: "$1,600", start: "2026-09-25", letter: "Eight years of brand work for SaaS teams." } });
  });
});

test.describe("proposal wizard · a revision", () => {
  test.use({ seedOptions: { deal: REVISION } });

  test("it opens under the change asked for, starts from the version sent, and goes back as v2", async ({ page }) => {
    await page.goto(APPLICATION);
    await page.getByRole("link", { name: "Revise proposal" }).click();
    await expect(page.getByRole("heading", { name: "Revise proposal: Brand Designer" })).toBeVisible();
    await expect(page.getByText("Proposal v1 · sent 24 Sep 2026")).toBeVisible();
    await expect(page.getByText("Nairobi Solutions Inc. asked for a change:")).toBeVisible();
    await expect(page.getByText(NOTE)).toBeVisible();

    await expect(page.getByRole("textbox", { name: "Your pay for the trial", exact: true })).toHaveValue("1600");
    await payAndStart(page, "13 Nov 2026");
    await expect(page.getByRole("textbox", { name: "Cover letter" })).toHaveValue("Happy to help.");
    await page.getByRole("button", { name: "Review & send" }).click();
    // A revision has been through the payout and ID check already.
    await expect(page.getByRole("region", { name: "Payout and ID check" })).toHaveCount(0);
    await page.getByRole("button", { name: "Send revised proposal" }).click();
    await expectSent(page);
    const deal = await savedDeal(page);
    expect(deal).toMatchObject({ stage: "proposal_sent", proposal: { version: 2, start: "2026-10-05" } });
    expect(deal.revision).toBeUndefined();
  });
});
