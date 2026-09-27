import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// IN-073 / TB-106 — in a revision the talent can suggest changes to the trial's tasks and propose
// another start; the Team Builder accepts or ignores each suggestion, and the offer carries what the
// proposal settled — the tasks as accepted and the start proposed, read, not edited (TB-105).

const TASKS = [
  { title: "Take over inbox triage", week: 1, priority: "high" },
  { title: "Run both calendars", week: 2, priority: "high" },
  { title: "Clean up the contact sheet", week: 2, priority: "medium" },
];
const ROLE = { slug: "brand-designer", title: "Brand Designer", type: "trial", status: "Active", candidates: null, matched: null, interviews: null, offers: null, hired: null, updated: "25 Sep 2026", description: "Brand work.", budget: "$1,600.00 - $2,000.00 /mo", duration: "30 Days", experience: "Advanced (5–8 years)", skills: ["Branding"], expectation: "", attachment: "", tasks: TASKS };

/** Saves the role and its posting where both portals read them, with the trial's three tasks. */
async function postTheRole(page: Page) {
  // The role and its posting, with the trial's tasks, on both sides.
  await page.goto("/team/hire/roles");
  await page.evaluate(({ role, tasks }) => {
    localStorage.setItem("hireable.demo.team.roles", JSON.stringify([role]));
    const s = JSON.parse(localStorage.getItem("hireable.demo.deal") ?? "{}");
    s.postings = [{ slug: role.slug, title: role.title, type: role.type, company: "Nairobi Solutions Inc.", rate: role.budget, rateRange: role.budget, level: role.experience, description: [role.description], skills: role.skills, expectation: "", duration: role.duration, posted: "Posted today", closes: "Open until filled", tasks }];
    localStorage.setItem("hireable.demo.deal", JSON.stringify(s));
  }, { role: ROLE, tasks: TASKS });
}

/** Juan suggests Week 2 for the triage (only once he says why) and removing the contact sheet, starts on Mon 5 Oct, and sends the revision. */
async function suggestChanges(juan: Page) {
  // Juan revises, suggesting a later week for one task and removing another.
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

  // A later start: the trial's end follows from it, and the offer will carry both.
  await juan.getByRole("button", { name: "Start date" }).click();
  await juan.getByRole("button", { name: "Go to the Next Month" }).click();
  await juan.getByRole("button", { name: /October 5th, 2026/ }).click();
  await expect(juan.getByText("The trial runs 30 working days from it, to 13 Nov 2026.")).toBeVisible();
  await juan.getByRole("button", { name: "Continue" }).click();
  await juan.getByRole("button", { name: "Review & send" }).click();
  await expect(juan.getByText("Suggested task changes")).toBeVisible();
  await juan.getByRole("button", { name: "Send revised proposal" }).click();
}

/** Alex reads the proposed dates, then accepts the week change and ignores the removal — Send offer waits for both. Returns the review, still open. */
async function acceptOneIgnoreOne(page: Page) {
  // Alex reviews: the dates Juan proposed, then each suggestion — no offer until both are answered.
  await page.goto(`/team/hire/roles/${ROLE.slug}`);
  await page.getByRole("button", { name: "Review Proposal" }).click();
  const review = page.getByRole("dialog");
  await expect(review.getByText("Juan suggested 2 changes to the tasks.", { exact: false })).toBeVisible();
  await expect(review).toContainText("05 Oct 2026 → 13 Nov 2026");
  await expect(review.getByRole("button", { name: "Send offer" })).toBeDisabled();
  const rows = review.getByRole("listitem").filter({ hasText: /Take over inbox triage|Clean up the contact sheet/ });
  await rows.filter({ hasText: "move it to Week 2" }).getByRole("button", { name: "Accept" }).click();
  await rows.filter({ hasText: "Remove “Clean up the contact sheet”" }).getByRole("button", { name: "Ignore" }).click();
  await expect(rows.filter({ hasText: "move it to Week 2" })).toContainText("Accepted");
  await expect(rows.filter({ hasText: "Remove" })).toContainText("Ignored");
  await expect(review.getByRole("button", { name: "Send offer" })).toBeEnabled();
  return review;
}

/** From the review, Alex starts the offer: its tasks keep the triage, now in Week 2, and the contact sheet — read-only — and it starts on Juan's date. */
async function offerStartsFromAccepted(page: Page, review: Locator) {
  // The offer carries the accepted change — triage in week 2, the contact sheet kept — and Juan's start.
  await review.getByRole("button", { name: "Send offer" }).click();
  const offer = page.getByRole("dialog", { name: "Send an offer to Juan" });
  await offer.getByRole("button", { name: "Continue" }).click();
  // The task rows — the stepper above is a list too.
  const items = offer.getByRole("listitem").filter({ hasText: /Take over inbox triage|Run both calendars|Clean up the contact sheet/ });
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText("Take over inbox triage");
  await expect(items.nth(0)).toContainText("Week 2");
  await expect(items.nth(2)).toContainText("Clean up the contact sheet");
  await expect(offer.getByRole("textbox")).toHaveCount(0);
  await offer.getByRole("button", { name: "Continue" }).click();
  await expect(offer).toContainText("05 Oct 2026");
}

/** Juan's saved proposal records the week change as accepted and the removal as ignored. */
async function decisionsReachJuan(juan: Page) {
  // What Juan's own proposal reads from: one accepted, one not taken.
  const saved = await juan.evaluate(() => JSON.parse(localStorage.getItem("hireable.demo.deal") ?? "{}").deal);
  const byKind = Object.fromEntries((saved.proposal.suggestions as { id: string; kind: string }[]).map((x) => [x.kind, saved.suggestionDecisions[x.id]]));
  expect(byKind).toEqual({ change: "accepted", remove: "ignored" });
}

test.describe("suggesting task changes in a revision", () => {
  test.use({
    seedOptions: {
      deal: { stage: "proposal_requested", contract: null, offer: null, proposal: { version: 1, sent: "24 Sep 2026", rate: "$1,600 /month", letter: "Happy to help." }, revision: { note: "Can you look at the timeline?", date: "25 Sep 2026" } },
    },
  });

  test("Juan suggests, Alex accepts one and ignores one, and the offer starts from what was accepted", async ({ page, secondPage }) => {
    // Two tabs through the whole round trip, the suite's longest journey: allowed longer, since on
    // a loaded test machine it runs many times its usual 5–15 s and used to hit the 60 s default.
    test.setTimeout(180_000);
    await postTheRole(page);
    const juan = await secondPage();
    await suggestChanges(juan);
    const review = await acceptOneIgnoreOne(page);
    await offerStartsFromAccepted(page, review);
    await decisionsReachJuan(juan);
  });
});
