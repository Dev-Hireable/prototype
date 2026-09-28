import { expect, notes, test, toast } from "./fixtures";

// TB-037 — hiring's pipeline: an interview is for someone who has applied. A match the Team Builder
// invited to apply hasn't yet, so it waits on them.

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
  updated: "25 Sep 2026",
  description: "Brand work for a B2B agency.",
  budget: "$1,600.00 - $2,000.00 /mo",
  duration: "30 Days",
  experience: "Advanced (5–8 years)",
  skills: ["Branding"],
  expectation: "",
  attachment: "",
};
const candidate = (stage: string, over: Record<string, unknown> = {}) => ({ id: "c1", independent: "juan-dela-cruz", role: ROLE.slug, stage, status: stage === "matched" ? { label: "Awaiting application", tone: "neutral" } : { label: "Applied", tone: "info" }, submitted: "Today", ...(stage === "matched" ? { invitedToApply: true } : {}), ...over });

/** Puts a posted role and one candidate at `stage` in the Team Builder's saved demo, then reloads. */
async function pipeline(page: import("@playwright/test").Page, stage: string | null, over: Record<string, unknown> = {}) {
  await page.goto("/team/hire/roles");
  await page.evaluate(({ role, cands }) => {
    localStorage.setItem("hireable.demo.team.roles", JSON.stringify([role]));
    localStorage.setItem("hireable.demo.team.candidates", JSON.stringify(cands));
  }, { role: ROLE, cands: stage ? [candidate(stage, over)] : [] });
}

/** Deletes the only dropped card on the board, through its confirmation. */
async function deleteDropped(page: import("@playwright/test").Page) {
  await page.goto(`/team/hire/roles/${ROLE.slug}`);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  const confirm = page.getByRole("dialog", { name: "Delete Juan Dela Cruz from this role?" });
  await expect(confirm).toContainText("Nothing is sent to Juan");
  await confirm.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(toast(page, "Deleted Juan Dela Cruz from Brand Designer")).toBeVisible();
  await expect(page.getByRole("button", { name: "Undrop" })).toHaveCount(0);
}

test.describe("inviting to interview", () => {
  test.use({ seedOptions: { empty: true } });

  test("a match who hasn't applied can't be invited to interview yet — and is told why", async ({ page }) => {
    await pipeline(page, "matched");
    await page.goto(`/team/hire/roles/${ROLE.slug}`);
    const invite = page.getByRole("button", { name: "Invite to interview" });
    await expect(invite).toBeDisabled();
    await invite.locator("..").hover();
    await expect(page.getByText("Juan hasn't applied yet — you can invite them to interview once they do")).toBeVisible();

    await page.goto(`/team/hire/roles/${ROLE.slug}/candidates/c1`);
    await expect(page.getByRole("button", { name: "Invite to interview" })).toBeDisabled();
  });

  test("an applicant the system matched on fit is in Matched too — and has applied, so can be interviewed", async ({ page }) => {
    await pipeline(page, "matched", { invitedToApply: undefined, status: { label: "New application", tone: "info" } });
    await page.goto(`/team/hire/roles/${ROLE.slug}`);
    await expect(page.getByRole("button", { name: "Invite to interview" })).toBeEnabled();
  });

  test("once they've applied, the invite opens", async ({ page }) => {
    await pipeline(page, "applied");
    await page.goto(`/team/hire/roles/${ROLE.slug}`);
    await page.getByRole("button", { name: "Invite to interview" }).click();
    await expect(page.getByRole("dialog", { name: /Invite .* to interview/ })).toBeVisible();
  });
});

test.describe("deleting from Dropped, so it doesn't pile up", () => {
  test.use({ seedOptions: { empty: true } });

  test("a dropped card can be deleted for good, and only a dropped one", async ({ page }) => {
    await pipeline(page, "applied");
    await page.goto(`/team/hire/roles/${ROLE.slug}`);
    // Still in the running: drop first.
    await expect(page.getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);
    await pipeline(page, "applied", { dropped: true });
    await deleteDropped(page);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("hireable.demo.team.candidates") ?? "[]"))).toEqual([]);
    await page.reload();
    await expect(page.getByText("Juan Dela Cruz")).toHaveCount(0);
  });
});

test.describe("deleting the live pair's dropped application", () => {
  test.use({ seedOptions: { deal: { stage: "applied", dropped: true, contract: null, offer: null, proposal: null } } });

  test("it leaves this tracker, and Juan's own application record stays", async ({ page }) => {
    await pipeline(page, null);
    await deleteDropped(page);
    await page.reload();
    await expect(page.getByRole("button", { name: "Undrop" })).toHaveCount(0);
    // His side still has the application: nothing was sent or wiped.
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("hireable.demo.deal") ?? "null")?.deal?.roleSlug)).toBe("brand-designer");
  });
});

test.describe("inviting to apply", () => {
  test.use({ seedOptions: { empty: true } });

  test("the card waits on their application, saying so", async ({ page }) => {
    await pipeline(page, null);
    await page.goto("/team/discover/juan-dela-cruz");
    await page.getByRole("button", { name: "Invite to apply" }).click();
    await page.getByRole("dialog", { name: "Invite Juan Dela Cruz to apply" }).getByRole("button", { name: "Send invite" }).click();
    await page.goto(`/team/hire/roles/${ROLE.slug}`);
    await expect(page.getByText("Awaiting application")).toBeVisible();
    await expect(page.getByRole("button", { name: "Invite to interview" })).toBeDisabled();
  });
});

test.describe("dropped, deleted, invited again", () => {
  test.use({ seedOptions: { deal: { stage: "applied", dropped: true, contract: null, offer: null, proposal: null } } });

  test("the new invite reopens the role: Juan applies, and the card moves on so he can be interviewed", async ({ page, secondPage }) => {
    await pipeline(page, null);
    // The role is posted, so Juan can find it.
    await page.evaluate((role) => {
      const s = JSON.parse(localStorage.getItem("hireable.demo.deal") ?? "{}");
      s.postings = [{ slug: role.slug, title: role.title, type: role.type, company: "Nairobi Solutions Inc.", rate: role.budget, rateRange: role.budget, level: role.experience, description: [role.description], skills: role.skills, expectation: "", duration: role.duration, posted: "Posted today", closes: "Open until filled" }];
      localStorage.setItem("hireable.demo.deal", JSON.stringify(s));
    }, ROLE);
    await deleteDropped(page);

    await page.goto("/team/discover/juan-dela-cruz");
    await page.getByRole("button", { name: "Invite to apply" }).click();
    await page.getByRole("dialog", { name: "Invite Juan Dela Cruz to apply" }).getByRole("button", { name: "Send invite" }).click();
    await page.goto(`/team/hire/roles/${ROLE.slug}`);
    await expect(page.getByText("Awaiting application")).toBeVisible();

    const juan = await secondPage();
    await juan.goto(`/independent/jobs/${ROLE.slug}`);
    await juan.getByRole("button", { name: "Apply now" }).first().click();
    await juan.getByRole("dialog", { name: "Apply to Brand Designer at Nairobi Solutions Inc." }).getByRole("button", { name: "Send application" }).click();
    await expect(toast(juan, "Application sent to Nairobi Solutions Inc.")).toBeVisible();

    // His application is on the board now, and it can go to interview.
    // A reload of the board — allowed longer, since it's the heaviest page on a loaded test machine.
    await page.reload();
    await expect(page.getByRole("button", { name: "Invite to interview" })).toBeEnabled({ timeout: 15_000 });
    await expect(page.getByText("Awaiting application")).toHaveCount(0);
  });
});


test.describe("dropping at the proposal stage", () => {
  test.use({ seedOptions: { deal: { stage: "proposal_sent", contract: null, offer: null, proposal: { version: 1, sent: "24 Sep 2026", rate: "$1,600 /month", letter: "Hi" } } } });

  test("Juan's side says it isn't moving forward — not notified, but not left reading 'in review' — and undropping restores it", async ({ page, secondPage }) => {
    await pipeline(page, null);
    await page.goto(`/team/hire/roles/${ROLE.slug}`);
    // A decision, confirmed first: nothing happens on the click alone.
    await page.getByRole("button", { name: "Drop", exact: true }).click();
    const drop = page.getByRole("dialog", { name: "Drop Juan from Brand Designer?" });
    await expect(drop).toContainText("They aren't notified, but their application shows you're not moving forward");
    await drop.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("button", { name: "Undrop" })).toHaveCount(0);
    await page.getByRole("button", { name: "Drop", exact: true }).click();
    await drop.getByRole("button", { name: "Drop candidate" }).click();
    await expect(toast(page, "Dropped Juan Dela Cruz from Brand Designer")).toBeVisible();
    await expect(page.getByRole("button", { name: "Undrop" })).toBeVisible();

    const juan = await secondPage();
    await juan.goto("/independent/jobs/applications");
    await expect(juan.getByText("Not moving forward")).toBeVisible();
    await expect(juan.getByText("Proposal submitted")).toHaveCount(0);
    await juan.goto("/independent/jobs/applications/deal");
    await expect(juan.getByText("Nairobi Solutions Inc. isn't moving forward")).toBeVisible();
    await expect(juan.getByText(/is reviewing your proposal/)).toHaveCount(0);
    // No notification: dropping is quiet (TB-044).
    expect((await notes(juan, "independent")).filter((n) => /drop|not moving|declin/i.test(`${n.title} ${n.body}`))).toEqual([]);

    await page.bringToFront();
    await page.getByRole("button", { name: "Undrop" }).click();
    await page.getByRole("dialog", { name: "Undrop Juan?" }).getByRole("button", { name: "Undrop candidate" }).click();
    await juan.goto("/independent/jobs/applications");
    await expect(juan.getByText("Proposal submitted")).toBeVisible();
  });
});
