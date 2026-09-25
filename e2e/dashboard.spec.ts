import { expect, panel, test } from "./fixtures";

// IN-090 — the talent's dashboard lists their own open tasks, most pressing first, each one click
// from its sheet in the contract's Work tab.
test.describe("the talent's dashboard", () => {
  test("My tasks: their open work, most pressing first, one click from each sheet", async ({ page }) => {
    await page.goto("/independent");
    const card = page.getByRole("region", { name: "My tasks" });
    await expect(card).toContainText("Brand Designer at Nairobi Solutions Inc. · 3 to do · 2 in progress · 1 in review");
    // Sent back with changes, then under way, then To do by due date with the undated one last.
    // What's with Alex for review comes after those, so it's the one behind "1 more".
    const rows = card.getByRole("list").getByRole("link");
    await expect(rows).toHaveCount(5);
    expect((await rows.allTextContents()).map((t) => t.match(/#\d+/)?.[0])).toEqual(["#10", "#3", "#4", "#5", "#9"]);
    await expect(rows.first()).toContainText("Changes requested");
    await expect(rows.first()).toContainText("Overdue");
    await expect(card.getByRole("link", { name: "1 more in the Work tab" })).toHaveAttribute("href", "/independent/contracts/brand-designer?assignee=independent");
    await expect(card.getByRole("link", { name: "See all my tasks" })).toHaveAttribute("href", "/independent/contracts/brand-designer?assignee=independent");

    // A row opens its task, in its sheet.
    await rows.filter({ hasText: "Pick a typography pairing" }).click();
    await expect(page).toHaveURL(/\/independent\/contracts\/brand-designer\?task=t-type$/);
    await expect(panel(page)).toBeVisible();
    await expect(panel(page).getByText("Pick a typography pairing").first()).toBeVisible();
  });
});

// TB-147 — the client's dashboard: the work waiting on their review first, then their own.
test.describe("the Team Builder's dashboard", () => {
  test("My tasks: work to review first, then their own and unassigned, one click from each sheet", async ({ page }) => {
    await page.goto("/team");
    const card = page.getByRole("region", { name: "My tasks" });
    await expect(card).toContainText("Juan Dela Cruz · Brand Designer · 1 to review · 3 to do");
    // Juan's submission, then Alex's own by due date, then the unassigned one with no date.
    // Juan's other work is his to move, so it isn't here.
    const rows = card.getByRole("list").getByRole("link");
    expect((await rows.allTextContents()).map((t) => t.match(/#\d+/)?.[0])).toEqual(["#2", "#6", "#8", "#7"]);
    await expect(rows.first()).toContainText("Review");
    await expect(rows.last()).toContainText("Unassigned");
    await expect(card.getByRole("link", { name: "Open the Work tab" })).toHaveAttribute("href", "/team/independents/juan-dela-cruz");

    // The submission opens on its review.
    await rows.first().click();
    await expect(page).toHaveURL(/\/team\/independents\/juan-dela-cruz\?task=t-logos$/);
    await expect(panel(page).getByRole("button", { name: "Approve" })).toBeVisible();
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
    await expect(card).toContainText("You're all caught up — nothing is waiting on you.");
    await expect(card.getByRole("list")).toHaveCount(0);
  });
});

// Once the trial is over, its work can't move while it's decided: the cards say what's next instead.
test.describe("the dashboards after the trial's last day", () => {
  test.use({ seedOptions: { contract: { ends: "2026-09-24" } } });
  test("the talent's work is with Alex; Alex is asked for the evaluation first", async ({ page, secondPage }) => {
    await page.goto("/independent");
    const card = page.getByRole("region", { name: "My tasks" });
    await expect(card).toContainText("Your trial ended — your work is with Alex for the evaluation, due 29 Sep 2026.");
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
