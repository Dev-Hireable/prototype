import { expect, NOW, test } from "./fixtures";

/** The trial offer and the proposal before it, logged in the thread as move() logs them. */
const ENTRIES = [
  {
    id: "proposal-entry",
    from: "independent",
    time: "8:00 AM",
    at: NOW.getTime() - 2 * 3_600_000,
    event: { text: "Juan D. sent a proposal for Brand Designer", href: { team: "/team/hire/roles/brand-designer/candidates/deal?proposal=1", independent: "/independent/jobs/applications/deal?proposal=1" } },
  },
  {
    id: "offer-entry",
    from: "team",
    time: "9:00 AM",
    at: NOW.getTime() - 3_600_000,
    event: { text: "Trial offer sent for Brand Designer", href: { team: "/team/hire/roles/brand-designer/candidates/deal?offer=1", independent: "/independent/jobs/applications/deal?offer=1" } },
  },
];
const PROPOSAL = { version: 1, sent: "24 Sep 2026", rate: "$1,600", letter: "I'd like to run this trial with you.", start: "2026-10-05" };
/** The role the proposal is for, as `team.roles` keeps it: the Team Builder's proposal dialog reads it. */
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
  tasks: [{ title: "Audit the brand assets", week: 1, priority: "high" }],
};

test.describe("Messages · a logged proposal or offer opens over the chat", () => {
  test.use({ seedOptions: { deal: { proposal: PROPOSAL }, stores: { live: { chat: ENTRIES }, "team.roles": [ROLE] } } });

  test("the Team Builder reads the sent offer and the proposal without leaving Messages", async ({ page }) => {
    await page.goto("/team/messages");
    await page.locator("#msg-offer-entry").getByRole("button", { name: "View details" }).click();
    await expect(page.getByRole("dialog", { name: /^Your offer to / })).toBeVisible();
    await expect(page).toHaveURL(/\/team\/messages/);
    await page.getByRole("dialog", { name: /^Your offer to / }).getByRole("button", { name: "Close" }).click();
    await page.locator("#msg-proposal-entry").getByRole("button", { name: "View details" }).click();
    await expect(page.getByRole("dialog", { name: /proposal for Brand Designer$/ })).toBeVisible();
    await expect(page).toHaveURL(/\/team\/messages/);
  });

  test("the Independent opens the offer to sign in its dialog, over the thread", async ({ page }) => {
    await page.goto("/independent/messages");
    await page.locator("#msg-offer-entry").getByRole("button", { name: "View details" }).click();
    await expect(page.getByRole("dialog", { name: /^Offer from / })).toBeVisible();
    await expect(page).toHaveURL(/\/independent\/messages/);
  });

  test("an entry for anything else still opens its page", async ({ page }) => {
    await page.goto("/team/messages");
    // The trial's first day is logged by the app itself; its View details goes to the contract.
    const started = page.locator('[id^="msg-"]').filter({ hasText: /^Brand Designer trial started, / });
    await expect(started.getByRole("link", { name: "View details" })).toBeVisible();
  });
});
