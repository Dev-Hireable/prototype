import type { Locator } from "@playwright/test";
import { drag, expect, panel, savedItem, test } from "./fixtures";

/** The task numbers My tasks lists, top to bottom. */
const numbersIn = async (card: Locator) => (await card.getByRole("list").getByRole("link").allTextContents()).map((t) => t.match(/#\d+/)?.[0]);

// IN-090 — the talent's dashboard lists their own open tasks in the order they put them in (the
// Work tab's manual order), each one click from its sheet in the contract's Work tab.
test.describe("the talent's dashboard", () => {
  test("My tasks: their open work in their own order, one click from each sheet", async ({ page }) => {
    await page.goto("/independent");
    const card = page.getByRole("region", { name: "My tasks" });
    await expect(card).toContainText("Brand Designer at Nairobi Solutions Inc. · 3 to do · 2 in progress · 1 in review");
    // The manual order, not most pressing first: #10, sent back with changes, sits last, so it's
    // the one behind "1 more" until it's moved up.
    const rows = card.getByRole("list").getByRole("link");
    await expect(rows).toHaveCount(5);
    expect(await numbersIn(card)).toEqual(["#2", "#3", "#4", "#5", "#9"]);
    await expect(rows.first()).toContainText("With Alex for review");
    await expect(card.getByRole("link", { name: "1 more in the Work tab" })).toHaveAttribute("href", "/independent/contracts/brand-designer?assignee=independent");
    await expect(card.getByRole("link", { name: "See all my tasks" })).toHaveAttribute("href", "/independent/contracts/brand-designer?assignee=independent");

    // A row opens its task, in its sheet.
    await rows.filter({ hasText: "Pick a typography pairing" }).click();
    await expect(page).toHaveURL(/\/independent\/contracts\/brand-designer\?task=t-type$/);
    await expect(panel(page)).toBeVisible();
    await expect(panel(page).getByText("Pick a typography pairing").first()).toBeVisible();
  });
});

// TB-147 — the client's dashboard: the work waiting on their review and their own, in their order.
test.describe("the Team Builder's dashboard", () => {
  test("My tasks: work to review, their own and unassigned, in the manual order, one click from each sheet", async ({ page }) => {
    await page.goto("/team");
    const card = page.getByRole("region", { name: "My tasks" });
    await expect(card).toContainText("Juan Dela Cruz · Brand Designer · 1 to review · 3 to do");
    // Juan's submission, Alex's own and the unassigned one, as they're placed in the manual order.
    // Juan's other work is his to move, so it isn't here.
    const rows = card.getByRole("list").getByRole("link");
    expect(await numbersIn(card)).toEqual(["#2", "#6", "#7", "#8"]);
    await expect(rows.first()).toContainText("Review");
    await expect(rows.nth(2)).toContainText("Unassigned");
    await expect(card.getByRole("link", { name: "Open the Work tab" })).toHaveAttribute("href", "/team/independents/juan-dela-cruz");

    // The submission opens on its review.
    await rows.first().click();
    await expect(page).toHaveURL(/\/team\/independents\/juan-dela-cruz\?task=t-logos$/);
    await expect(panel(page).getByRole("button", { name: "Approve" })).toBeVisible();
  });
});

// IN-090 / TB-147 with TB-142 — My tasks is put in order where it's read: a row dragged, or moved a
// step with Alt+Shift+Up and Down, takes its new place in the one manual order the Work tab shares.
test.describe("the dashboards' My tasks · putting it in order", () => {
  test("a row dragged onto another takes its place, here and in the Work tab's order", async ({ page }) => {
    await page.goto("/independent");
    const card = page.getByRole("region", { name: "My tasks" });
    const row = (n: string) => card.getByRole("list").getByRole("link", { name: new RegExp(`${n}\\b`) });
    await expect(row("#9")).toBeVisible();
    await drag(page, row("#9"), row("#2"), { targetY: 8 });
    await expect.poll(() => numbersIn(card)).toEqual(["#9", "#2", "#3", "#4", "#5"]);
    expect((await savedItem(page, "t-social")).order as number).toBeLessThan((await savedItem(page, "t-logos")).order as number);
    await expect(page.getByTestId("announcer")).toHaveText("Moved #9");
  });

  test("Alt+Shift+Up and Down move the focused row a step, keep the focus on it and say so", async ({ page }) => {
    await page.goto("/team");
    const card = page.getByRole("region", { name: "My tasks" });
    const midpoint = card.getByRole("link", { name: /#8\b/ });
    await midpoint.focus();
    await page.keyboard.press("Alt+Shift+ArrowUp");
    await expect.poll(() => numbersIn(card)).toEqual(["#2", "#6", "#8", "#7"]);
    await expect(midpoint).toBeFocused();
    await expect(page.getByTestId("announcer")).toHaveText("Moved #8 up");
    expect((await savedItem(page, "t-midpoint")).order as number).toBeLessThan((await savedItem(page, "t-share")).order as number);
  });
});

test.describe("the talent's dashboard, all caught up", () => {
  // A full-time role that grew out of an evaluated trial, with everything on it done.
  test.use({
    seedOptions: {
      tasks: [{ id: "t-done", number: 1, title: "Audit the brand", status: "done", type: "task", assignee: "independent", addedBy: "team", created: "21 Sep 2026", order: 1024, trial: true }],
      contract: { started: "2026-08-10", ends: "2026-09-18", evaluations: [{ stars: 4, feedback: "A strong trial.", recommendation: "Hire full-time", date: "21 Sep 2026" }], escrow: { released: 1600, refunded: 0 } },
      deal: { conversion: { type: "full-time", salary: "$4,000", start: "2026-09-21", benefits: [], status: "accepted", sent: "19 Sep 2026", accepted: "19 Sep 2026" } },
    },
  });
  test("with nothing open, it says so", async ({ page }) => {
    await page.goto("/independent");
    const card = page.getByRole("region", { name: "My tasks" });
    await expect(card).toContainText("You're all caught up. Nothing is waiting on you.");
    await expect(card.getByRole("list")).toHaveCount(0);
  });
});

// Once the trial is over, its work can't move while it's decided: the cards say what's next instead.
test.describe("the dashboards after the trial's last day", () => {
  test.use({ seedOptions: { contract: { ends: "2026-09-24" } } });
  test("the talent's work is with Alex; Alex is asked for the evaluation first", async ({ page, secondPage }) => {
    await page.goto("/independent");
    const card = page.getByRole("region", { name: "My tasks" });
    await expect(card).toContainText("Your trial ended. Your work is with Alex for the evaluation, due 29 Sep 2026.");
    await expect(card.getByRole("list")).toHaveCount(0);

    const alex = await secondPage();
    await alex.goto("/team");
    const lead = alex.getByRole("region", { name: "My tasks" }).getByRole("link", { name: /Send Juan's trial evaluation/ });
    await expect(lead).toContainText("Due 29 Sep 2026");
    await expect(lead).toHaveAttribute("href", "/team/independents/juan-dela-cruz?tab=evaluation");
  });
});

test.describe("the talent's dashboard, before any contract", () => {
  test.use({ seedOptions: { empty: true } });
  test("without a live contract there's no task card", async ({ page }) => {
    await page.goto("/independent");
    await expect(page.getByRole("region", { name: "Active contracts" })).toBeVisible();
    await expect(page.getByRole("region", { name: "My tasks" })).toHaveCount(0);
  });
});

/** The tags the seeded quiz answers earn each side (fixtures.ts seeds both). */
const TAGS = {
  team: ["Decisive", "Strategic", "Balanced", "Methodical", "Assertive", "Consistent"],
  independent: ["Collaborative", "Adaptive", "Scheduled", "Structured", "Receptive", "Responsive"],
};

/** The Team Builder's setup finished too: the company profile filled in (the seed leaves its size empty) and a role posted. */
const TEAM_SET_UP = {
  "team.company": { name: "Nairobi Solutions Inc.", description: "B2B SaaS agency based in New York.", url: "www.nairobisolutions.com", industry: "Sales and marketing services", location: "New York, USA", remote: true, size: "11-50", logo: null },
  "team.roles": [{ slug: "sdr-lead", title: "SDR Lead", type: "trial", status: "Active", candidates: null, matched: null, interviews: null, offers: null, hired: null, updated: "25 Sep 2026", description: "Outbound calling for a fintech.", budget: "$1,600.00 - $2,000.00", duration: "30 Days", experience: "Advanced (5–8 years)", skills: ["Cold calling"], expectation: "", attachment: "", tasks: [{ title: "Call the warm leads", week: 1, priority: "high" }] }],
};

// TB-001 / IN-003 — once setup is done the card holds the work style the quiz gave: the tags under
// who is matched on them, the way to the profile, and Retake quiz while the yearly retake is open.
test.describe("the dashboards' work style card", () => {
  test.use({ seedOptions: { stores: TEAM_SET_UP } });

  test("the talent's: their tags under who matches on them, with no progress left to show", async ({ page }) => {
    await page.goto("/independent");
    const card = page.getByRole("region", { name: "Your work style" });
    await expect(card).toContainText("Companies match you on these tags.");
    for (const tag of TAGS.independent) await expect(card.getByText(tag, { exact: true })).toBeVisible();
    // Nothing is left to do, so there's no bar and no percentage.
    await expect(card.getByRole("img")).toHaveCount(0);
    await expect(card).not.toContainText("%");
    await expect(card.getByRole("link", { name: "See your profile" })).toHaveAttribute("href", "/independent/profile");
    await card.getByRole("button", { name: "Retake quiz" }).click();
    await page.getByRole("dialog", { name: "Retake the work-style quiz?" }).getByRole("button", { name: "Start quiz" }).click();
    await expect(page).toHaveURL(/\/onboarding\/talent$/);
  });

  test("the Team Builder's: Independents are matched to their tags, and Retake quiz asks first", async ({ page }) => {
    await page.goto("/team");
    const card = page.getByRole("region", { name: "Your work style" });
    await expect(card).toContainText("Independents are matched to these tags.");
    for (const tag of TAGS.team) await expect(card.getByText(tag, { exact: true })).toBeVisible();
    await expect(card.getByRole("link", { name: "See your profile" })).toHaveAttribute("href", "/team/profile");
    await card.getByRole("button", { name: "Retake quiz" }).click();
    const ask = page.getByRole("dialog", { name: "Retake the quiz?" });
    await expect(ask).toContainText("Your new results replace the current ones. You can retake once a year.");
    await ask.getByRole("button", { name: "Cancel" }).click();
    await expect(ask).toBeHidden();
    await expect(page).toHaveURL(/\/team$/);
  });
});

test.describe("the work style card within a year of the quiz", () => {
  // Taken five days before the pinned today (25 Sep 2026), so the next retake is a year on.
  test.use({ seedOptions: { stores: { "ind.workStyleAt": Date.parse("2026-09-20T09:00:00Z") } } });

  test("has no Retake quiz until the year is up", async ({ page }) => {
    await page.goto("/independent");
    const card = page.getByRole("region", { name: "Your work style" });
    await expect(card.getByRole("link", { name: "See your profile" })).toBeVisible();
    await expect(card.getByRole("button", { name: "Retake quiz" })).toHaveCount(0);
  });
});

// TB-001 — the seed's company has no size and nothing is posted yet: two of the four steps are done.
test.describe("the setup card while steps are open", () => {
  test("its meter says how far along, over the steps left, and the tags wait until it's done", async ({ page }) => {
    await page.goto("/team");
    const card = page.getByRole("region", { name: "Finish setting up your account" });
    await expect(card.getByRole("img", { name: "Account setup: 2 of 4 steps done" })).toContainText("50%");
    await expect(card.getByRole("listitem").filter({ hasText: "Company profile" }).getByRole("link", { name: "Complete" })).toHaveAttribute("href", "/team/profile/company");
    await expect(page.getByRole("region", { name: "Your work style" })).toHaveCount(0);
  });
});
