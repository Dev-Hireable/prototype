import { expect, test } from "./fixtures";

// IN-073 / TB-106 — in a revision the talent can suggest changes to the trial's tasks; the Team
// Builder accepts or ignores each, and the offer's tasks start from what they accepted.

const TASKS = [
  { title: "Take over inbox triage", week: 1, priority: "high" },
  { title: "Run both calendars", week: 2, priority: "high" },
  { title: "Clean up the contact sheet", week: 2, priority: "medium" },
];
const ROLE = { slug: "brand-designer", title: "Brand Designer", type: "trial", status: "Active", candidates: null, matched: null, interviews: null, offers: null, hired: null, updated: "25 Sep 2026", description: "Brand work.", budget: "$1,600.00 - $2,000.00 /mo", duration: "30 Days", experience: "Advanced (5–8 years)", skills: ["Branding"], expectation: "", attachment: "", tasks: TASKS };

test.describe("suggesting task changes in a revision", () => {
  test.use({
    seedOptions: {
      deal: { stage: "proposal_requested", contract: null, offer: null, proposal: { version: 1, sent: "24 Sep 2026", rate: "$1,600 /month", letter: "Happy to help." }, revision: { note: "Can you look at the timeline?", date: "25 Sep 2026" } },
    },
  });

  test("Juan suggests, Alex accepts one and ignores one, and the offer starts from what was accepted", async ({ page, secondPage }) => {
    // The role and its posting, with the trial's tasks, on both sides.
    await page.goto("/team/hire/roles");
    await page.evaluate(({ role, tasks }) => {
      localStorage.setItem("hireable.demo.team.roles", JSON.stringify([role]));
      const s = JSON.parse(localStorage.getItem("hireable.demo.deal") ?? "{}");
      s.postings = [{ slug: role.slug, title: role.title, type: role.type, company: "Nairobi Solutions Inc.", rate: role.budget, rateRange: role.budget, level: role.experience, description: [role.description], skills: role.skills, expectation: "", duration: role.duration, posted: "Posted today", closes: "Open until filled", tasks }];
      localStorage.setItem("hireable.demo.deal", JSON.stringify(s));
    }, { role: ROLE, tasks: TASKS });

    // Juan revises, suggesting a later week for one task and removing another.
    const juan = await secondPage();
    await juan.goto("/independent/jobs/applications/deal/proposal?revise=1");
    await juan.getByRole("button", { name: "Suggest a change to “Take over inbox triage”" }).click();
    const first = juan.getByRole("form", { name: "Suggest a change to “Take over inbox triage”" });
    await first.getByRole("button", { name: "Week" }).click();
    await juan.getByRole("option", { name: "Week 2" }).click();
    await first.getByRole("button", { name: "Add suggestion" }).click();
    await expect(first.getByRole("alert")).toHaveText("Say why — it's what the company decides on.");
    await first.getByRole("textbox", { name: "Why" }).fill("I need inbox access before I can start.");
    await first.getByRole("button", { name: "Add suggestion" }).click();
    await expect(juan.getByText("You suggest: “Take over inbox triage”: move it to Week 2")).toBeVisible();

    await juan.getByRole("button", { name: "Suggest a change to “Clean up the contact sheet”" }).click();
    const second = juan.getByRole("form", { name: "Suggest a change to “Clean up the contact sheet”" });
    await second.getByRole("radio", { name: "Remove it" }).click();
    await second.getByRole("textbox", { name: "Why" }).fill("Your last assistant already did it.");
    await second.getByRole("button", { name: "Add suggestion" }).click();
    await expect(juan.getByText("2 suggestions goes with your revision.", { exact: false })).toBeVisible();

    await juan.getByRole("button", { name: "Continue" }).click();
    await juan.getByRole("button", { name: "Review & send" }).click();
    await expect(juan.getByText("Suggested task changes")).toBeVisible();
    await juan.getByRole("button", { name: "Send revised proposal" }).click();

    // Alex reviews: accepts the week change, ignores the removal.
    await page.goto(`/team/hire/roles/${ROLE.slug}`);
    await page.getByRole("button", { name: "Review Proposal" }).click();
    const review = page.getByRole("dialog");
    await expect(review.getByText("Juan suggested 2 changes to the tasks.", { exact: false })).toBeVisible();
    const rows = review.getByRole("listitem").filter({ hasText: /Take over inbox triage|Clean up the contact sheet/ });
    await rows.filter({ hasText: "move it to Week 2" }).getByRole("button", { name: "Accept" }).click();
    await rows.filter({ hasText: "Remove “Clean up the contact sheet”" }).getByRole("button", { name: "Ignore" }).click();
    await expect(rows.filter({ hasText: "move it to Week 2" })).toContainText("Accepted");
    await expect(rows.filter({ hasText: "Remove" })).toContainText("Ignored");

    // The offer's tasks start from the accepted change: triage in week 2, the contact sheet kept.
    await review.getByRole("button", { name: "Send offer" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("textbox", { name: "Task 1" })).toHaveValue("Take over inbox triage");
    await expect(page.getByRole("textbox", { name: "Task 3" })).toHaveValue("Clean up the contact sheet");
    const firstRow = page.getByRole("textbox", { name: "Task 1" }).locator("xpath=ancestor::div[contains(@class,'items-center')][1]");
    await expect(firstRow).toContainText("Week 2");

    // What Juan's own proposal reads from: one accepted, one not taken.
    const saved = await juan.evaluate(() => JSON.parse(localStorage.getItem("hireable.demo.deal") ?? "{}").deal);
    const byKind = Object.fromEntries((saved.proposal.suggestions as { id: string; kind: string }[]).map((x) => [x.kind, saved.suggestionDecisions[x.id]]));
    expect(byKind).toEqual({ change: "accepted", remove: "ignored" });
  });
});
