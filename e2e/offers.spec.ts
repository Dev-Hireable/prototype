import type { Locator, Page } from "@playwright/test";
import { card, entryOf, EVALUATED, expect, notes, savedDeal, test, toast } from "./fixtures";

// Offers, on both sides: the trial offer the Team Builder sends from the proposal — carrying what the
// proposal settled, nothing edited (TB-105) — and the talent signs or declines on their application
// (IN-074 / IN-075), the full-time or part-time offer that follows an evaluated trial (TB-072 /
// IN-084), and a sent offer's one action, withdrawing it, on the candidate's card in the pipeline. Today
// is Fri 25 Sep 2026. A post-trial offer left to run past its start date is after-trial.spec's.

const APPLICATION_OFFER = "/independent/jobs/applications/deal/offer";
const CONTRACT_OFFER = "/independent/contracts/brand-designer/offer";
/** Juan's card in the Brand Designer pipeline: a sent offer is read, and withdrawn, there. */
const CANDIDATE = "/team/hire/roles/brand-designer/candidates/deal";
/** The post-trial offer is withdrawn from the contract it follows. */
const CONTRACT = "/team/independents/juan-dela-cruz?tab=overview";
const REASON = "The start date is too soon.";

/** The tasks the trial offer sets, as the Team Builder wrote them. */
const TASKS = [
  { id: "task-1", title: "Audit the brand assets", week: 1, priority: "high" },
  { id: "task-2", title: "Draft two logo directions", week: 2, priority: "medium" },
];

/** Before the hire: Juan's proposal answered with a trial offer on 22 Sep, not answered yet — and no contract. */
const OFFER_OUT = {
  contract: null,
  stage: "offer_received",
  proposal: { version: 1, sent: "20 Sep 2026", rate: "$1,600.00/mo", letter: "Happy to start with the audit." },
  offer: { type: "trial", rate: "$1,600 /month", start: "2026-10-05", end: "2026-11-13", tasks: TASKS, status: "sent", sent: "22 Sep 2026", deposit: { escrow: 1600, fee: 80 } },
};

/** The role on the Team Builder's side: its title, its trial length and the trial's tasks. */
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
  budget: "$1,600.00 - $2,000.00 /mo",
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
const OFFER_OUT_SEED = { deal: OFFER_OUT, stores: { "team.roles": [ROLE] } };

/** Juan's proposal, in and not yet answered: $1,600 a month, starting on `start`. */
const PROPOSAL_IN = (start: string) => ({
  deal: { contract: null, offer: null, stage: "proposal_sent", proposal: { version: 1, sent: "24 Sep 2026", rate: "$1,600.00/mo", letter: "Happy to start with the audit.", start } },
  stores: { "team.roles": [ROLE] },
});

/** The post-trial offer, sent 22 Sep for a start on Mon 28 Sep: full-time with health cover, unless `over` says otherwise. */
const conversion = (status: string, over: Record<string, unknown> = {}) => ({ conversion: { type: "full-time", salary: "$4,000", start: "2026-09-28", benefits: ["Health Insurance Coverage"], status, sent: "22 Sep 2026", ...over } });

/** A trial offer's terms as the talent reads them. */
const trialTerms = (t: { start: string; end: string; rate: string; total: string }): [string, string][] => [
  ["Role", "Brand Designer"],
  ["Contract type", "Trial"],
  ["Duration", "30 Days"],
  ["Start date", t.start],
  ["End date", t.end],
  ["Rate", t.rate],
  ["Payment", "Held in escrow, released at the end of the trial"],
  ["Total payment at end of trial", t.total],
];
/** A post-trial offer's terms: its pay, and a part-time role's hours. */
const ongoingTerms = (type: string, pay: [string, string], hours?: string): [string, string][] => [
  ["Role", "Brand Designer"],
  ["Contract type", type],
  ["Start date", "Mon 28 Sep 2026"],
  pay,
  ...(hours ? [["Hours", hours] as [string, string]] : []),
  ["Payment", "Monthly, at the end of each month"],
  ["Review", "Quarterly, with evaluations as the work goes on"],
];

/* The signature every offer is signed with, Accept, and the Offer card on the candidate's page. */
const nameField = (page: Page) => page.getByRole("textbox", { name: /^Type your full name to sign/ });
const agreement = (page: Page) => page.getByRole("checkbox", { name: "I agree to the platform contract and terms of service." });
const acceptButton = (page: Page) => page.getByRole("button", { name: "Accept", exact: true });
const offerCard = (page: Page) => page.getByRole("region", { name: "Offer" });
const withdrawButton = (page: Page) => offerCard(page).getByRole("button", { name: "Withdraw offer" });

/** The offer's terms, a row each: every label, then every value, in order. */
async function expectTerms(page: Page, rows: [string, string][]) {
  await expect(page.getByRole("term")).toHaveText(rows.map(([label]) => label));
  await expect(page.getByRole("definition")).toHaveText(rows.map(([, value]) => value));
}

/** Accept stays off until the offer is signed: a typed name of three letters or more, and the tick. */
async function expectSigningGate(page: Page) {
  await expect(acceptButton(page)).toBeDisabled();
  await nameField(page).fill("Juan Dela Cruz");
  await expect(acceptButton(page)).toBeDisabled();
  await agreement(page).check();
  await expect(acceptButton(page)).toBeEnabled();
  await nameField(page).fill("Ju");
  await expect(acceptButton(page)).toBeDisabled();
  await nameField(page).fill("Juan Dela Cruz");
  await agreement(page).uncheck();
  await expect(acceptButton(page)).toBeDisabled();
}

/** Signs with the typed name and the tick, and accepts. */
async function signAndAccept(page: Page) {
  await nameField(page).fill("Juan Dela Cruz");
  await agreement(page).check();
  await acceptButton(page).click();
}

/** Opens Decline and backs out twice — Cancel, then Escape — with the offer still open, then declines with `reason`. */
async function declineAfterBackingOut(page: Page, d: { title: string; description: string; reason: string }) {
  const dialog = page.getByRole("dialog", { name: d.title });
  const decline = page.getByRole("button", { name: "Decline", exact: true });
  await decline.click();
  await expect(dialog).toContainText(d.description);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await decline.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(acceptButton(page)).toBeVisible();
  await decline.click();
  await dialog.getByRole("textbox", { name: "Reason (optional)" }).fill(d.reason);
  await dialog.getByRole("button", { name: "Decline", exact: true }).click();
  await expect(dialog).toBeHidden();
}

/** Juan's card reads the declined offer with nothing left to do on it, and the talent's reason in its notes. */
async function teamSeesTheDecline(alex: Page) {
  await alex.goto(CANDIDATE);
  await expect(offerCard(alex).getByText("Declined", { exact: true })).toBeVisible();
  await expect(alex.getByText(REASON)).toBeVisible();
  await expect(withdrawButton(alex)).toHaveCount(0);
}

/** A sent offer's one action is withdrawing it: what it carries was settled in the proposal, so it isn't edited (TB-105). */
async function expectOnlyWithdraw(alex: Page) {
  await expect(offerCard(alex).getByText("Pending", { exact: true })).toBeVisible();
  await expect(offerCard(alex).getByRole("button")).toHaveText(["Withdraw offer"]);
}

/** From the role's pipeline, Alex opens Juan's proposal and starts the offer from it. Returns the offer dialog. */
async function startTheOffer(alex: Page) {
  await alex.goto("/team/hire/roles/brand-designer");
  await alex.getByRole("button", { name: "Review Proposal" }).click();
  await alex.getByRole("dialog").getByRole("button", { name: "Send offer" }).click();
  return alex.getByRole("dialog", { name: "Send an offer to Juan" });
}

/** The Tasks and dates steps read what the proposal settled: the tasks with their dates, the start and the end — nothing to edit. */
async function settledTermsRead(offer: Locator) {
  await expect(offer).toContainText("Starts");
  await offer.getByRole("button", { name: "Continue" }).click();
  await expect(offer.getByRole("listitem").filter({ hasText: "Audit the brand assets" })).toContainText("Week 1 · 9 Oct");
  await expect(offer.getByRole("listitem").filter({ hasText: "Draft two logo directions" })).toContainText("Week 2 · 16 Oct");
  await expect(offer.getByRole("textbox")).toHaveCount(0);
  await expect(offer.getByRole("button", { name: "Add task" })).toHaveCount(0);
  await offer.getByRole("button", { name: "Continue" }).click();
  await expect(offer).toContainText("05 Oct 2026");
  await expect(offer).toContainText("13 Nov 2026");
  await expect(offer.getByRole("button", { name: /start date/i })).toHaveCount(0);
}

/**
 * Deposit & Sign, the last of four steps: the offer's summary, the deposit and the signature together,
 * with no separate Review & Sign repeating them. The offer goes out as the proposal settled it.
 */
async function depositAndSign(alex: Page, offer: Locator) {
  await offer.getByRole("button", { name: "Continue" }).click();
  await expect(offer.getByRole("list").first().getByRole("listitem")).toHaveText(["Offer Letter", "Tasks", "Start & End Dates", "Deposit & Sign"]);
  for (const row of ["Role", "Candidate", "Contract", "Rate", "Trial", "In escrow", "Platform fee", "Tasks"]) await expect(offer).toContainText(row);
  await expect(offer).toContainText("Juan D.");
  const send = offer.getByRole("button", { name: "Sign & send offer" });
  await offer.getByRole("textbox", { name: "Type your full name to sign" }).fill("Alex Rivera");
  // Signed but not deposited: it can't go out until escrow is funded.
  await expect(send).toBeDisabled();
  await offer.getByRole("checkbox", { name: /^Charge \$1,760\.00/ }).check();
  await send.click();
  await expect(toast(alex, "Offer sent to candidate")).toBeVisible();
}

/** Withdraws the pending offer from its card, once the confirmation has said what that does. */
async function withdrawTheOffer(alex: Page, description: string) {
  await withdrawButton(alex).click();
  const confirm = alex.getByRole("dialog", { name: "Withdraw this offer?" });
  await expect(confirm).toContainText(description);
  await confirm.getByRole("button", { name: "Withdraw offer" }).click();
  await expect(toast(alex, "Offer withdrawn")).toBeVisible();
  await expect(offerCard(alex).getByText("Withdrawn", { exact: true })).toBeVisible();
  await expect(withdrawButton(alex)).toHaveCount(0);
}

test.describe("offers · signing a trial offer", () => {
  test.use({ seedOptions: { deal: OFFER_OUT } });

  test("the offer shows its terms and tasks, and Accept waits for a typed name and the tick", async ({ page }) => {
    await page.goto(APPLICATION_OFFER);
    await expect(page.getByRole("heading", { name: "Offer from Nairobi Solutions Inc." })).toBeVisible();
    await expectTerms(page, trialTerms({ start: "Mon 5 Oct 2026", end: "Fri 13 Nov 2026", rate: "$1,600 /month", total: "$1,600.00" }));
    await expect(page.getByRole("listitem").filter({ hasText: "Audit the brand assets" })).toContainText("Week 1 · 9 Oct");
    await expect(page.getByRole("listitem").filter({ hasText: "Draft two logo directions" })).toContainText("Week 2 · 16 Oct");
    await expect(page.getByText("This offer expires on Tue 29 Sep 2026")).toBeVisible();
    await expectSigningGate(page);
  });

  test("accepting starts the contract from the offer's terms and tasks, and Open contract goes to it", async ({ page }) => {
    await page.goto(APPLICATION_OFFER);
    await signAndAccept(page);
    const accepted = page.getByRole("dialog", { name: "You’ve accepted the offer" });
    await expect(accepted).toContainText("Nairobi Solutions Inc. has been notified. The $1,600.00 escrow they funded is held for the trial");
    const deal = await savedDeal(page);
    expect(deal).toMatchObject({ stage: "hired", offer: { status: "accepted" }, contract: { started: "2026-10-05", ends: "2026-11-13", rate: "$1,600 /month", deposit: 1600 } });
    expect(deal.contract.tasks.map((t: { title: string }) => t.title)).toEqual(["Audit the brand assets", "Draft two logo directions"]);
    expect((await notes(page, "team")).map((n) => n.title)).toContain("Juan Dela Cruz accepted your offer");

    await accepted.getByRole("button", { name: "Open contract" }).click();
    await expect(page).toHaveURL(/\/independent\/contracts\/brand-designer$/);
    await expect(card(page, /Audit the brand assets/)).toBeVisible();
    // Opened again later, the offer reads as answered: nothing left to sign, and the way into the contract.
    await page.goto(APPLICATION_OFFER);
    await expect(page.getByRole("button", { name: "Accepted" })).toBeDisabled();
    await expect(nameField(page)).toBeDisabled();
    await expect(page.getByRole("link", { name: "Open contract" })).toHaveAttribute("href", "/independent/contracts/brand-designer");
  });
});

test.describe("offers · declining a trial offer", () => {
  test.use({ seedOptions: OFFER_OUT_SEED });

  test("it asks first, and the reason reaches the Team Builder, whose offer can't be edited any more", async ({ page, secondPage }) => {
    await page.goto(APPLICATION_OFFER);
    await declineAfterBackingOut(page, {
      title: "Decline this offer?",
      description: "Alex Rivera is told you have declined, with your reason if you give one. The offer stays in My Applications so you can look back at the terms, but you cannot accept it afterwards.",
      reason: REASON,
    });
    await expect(page.getByRole("button", { name: "Offer declined" })).toBeDisabled();
    await expect(acceptButton(page)).toHaveCount(0);
    await expect(nameField(page)).toBeDisabled();
    expect((await savedDeal(page)).offer).toMatchObject({ status: "declined", declineReason: REASON });
    // The notification opens the step in the thread, whose View details opens the candidate.
    const declined = (await notes(page, "team")).find((n) => n.title === "Juan Dela Cruz declined your offer");
    expect((await entryOf(page, declined?.href ?? ""))?.event?.href.team).toBe(CANDIDATE);

    await teamSeesTheDecline(await secondPage());
  });
});

test.describe("offers · a full-time offer after the trial", () => {
  test.use({ seedOptions: { contract: EVALUATED, deal: conversion("sent") } });

  test("it shows the salary, the start date and the benefits picked, and Accept waits for the signature", async ({ page }) => {
    await page.goto(CONTRACT_OFFER);
    await expect(page.getByRole("heading", { name: "Full-time offer from Nairobi Solutions Inc." })).toBeVisible();
    await expect(page.getByText("Sent 22 Sep 2026. Accepting turns your trial into a full-time engagement. Answer by Mon 28 Sep 2026, its start date, or it expires.")).toBeVisible();
    await expectTerms(page, ongoingTerms("Full-time", ["Salary", "$4,000 /month"]));
    const benefits = page.getByRole("list").filter({ hasText: "Health Insurance Coverage" }).getByRole("listitem");
    await expect(benefits).toHaveText([/^Health Insurance Coverage\s*Included$/, /^Government Contribution Coverage\s*Not included$/, /^Internet Allowance\s*Not included$/, /^Learning & Development Allowance\s*Not included$/]);
    await expectSigningGate(page);
  });

  test("accepting makes the contract full-time from its start date", async ({ page }) => {
    await page.goto(CONTRACT_OFFER);
    await signAndAccept(page);
    await expect(toast(page, "You're full-time with Nairobi Solutions Inc.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Accepted" })).toBeDisabled();
    await expect(page.getByText("Sent 22 Sep 2026.", { exact: true })).toBeVisible();
    expect((await savedDeal(page)).conversion).toMatchObject({ status: "accepted", accepted: "25 Sep 2026" });
    expect((await notes(page, "team")).map((n) => n.title)).toContain("Juan Dela Cruz accepted your full-time offer");

    await page.getByRole("link", { name: "Open contract" }).click();
    await expect(page).toHaveURL(/\/independent\/contracts\/brand-designer$/);
    await expect(page.getByText("Full-time from 28 Sep 2026", { exact: true })).toBeVisible();
  });

  test("declining quotes the reason back, tells the Team Builder, and stays declined after a reload", async ({ page }) => {
    await page.goto(CONTRACT_OFFER);
    await declineAfterBackingOut(page, { title: "Decline the full-time offer?", description: "Alex Rivera is told, with your reason if you give one. Your trial record stays on the contract.", reason: REASON });
    await expect(toast(page, "Full-time offer declined")).toBeVisible();
    expect((await savedDeal(page)).conversion).toMatchObject({ status: "declined", declineReason: REASON });
    const told = (await notes(page, "team")).find((n) => n.title === "Juan Dela Cruz declined your full-time offer");
    expect(told?.body).toContain(`Their reason: “${REASON}”`);

    await page.reload();
    await expect(page.getByRole("button", { name: "Declined" })).toBeDisabled();
    await expect(page.getByText(`Your reason: “${REASON}”`)).toBeVisible();
    await expect(acceptButton(page)).toHaveCount(0);
  });
});

test.describe("offers · withdrawing a post-trial offer", () => {
  test.use({ seedOptions: { contract: EVALUATED, deal: conversion("sent") } });

  test("the Team Builder withdraws it rather than editing it, and Juan's open offer can't be signed any more", async ({ page, secondPage }) => {
    await page.goto(CONTRACT_OFFER);
    await expect(acceptButton(page)).toBeVisible();

    const alex = await secondPage();
    await alex.goto(CONTRACT);
    await alex.getByRole("button", { name: "Withdraw offer" }).click();
    await expect(toast(alex, "Offer withdrawn — Juan has been told")).toBeVisible();
    expect((await savedDeal(alex)).conversion.status).toBe("withdrawn");
    expect((await notes(alex, "independent")).map((n) => n.title)).toContain("Offer withdrawn");

    // Juan's page, open all along, takes it in without a reload.
    await expect(page.getByText("Nairobi Solutions Inc. withdrew this offer, so it can no longer be accepted.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Withdrawn" })).toBeDisabled();
    await expect(acceptButton(page)).toHaveCount(0);
  });
});

test.describe("offers · a part-time offer after the trial", () => {
  test.use({ seedOptions: { contract: EVALUATED, deal: conversion("sent", { type: "part-time", salary: "$2,000", hours: 20, benefits: [] }) } });

  test("it shows the rate and the hours a week with no benefits, and accepting makes the contract part-time", async ({ page }) => {
    await page.goto(CONTRACT_OFFER);
    await expect(page.getByRole("heading", { name: "Part-time offer from Nairobi Solutions Inc." })).toBeVisible();
    await expectTerms(page, ongoingTerms("Part-time", ["Rate", "$2,000 /month"], "20 hrs/week"));
    await expect(page.getByRole("heading", { name: "Exclusive benefits" })).toHaveCount(0);

    await signAndAccept(page);
    await expect(toast(page, "You're part-time with Nairobi Solutions Inc.")).toBeVisible();
    expect((await savedDeal(page)).conversion).toMatchObject({ type: "part-time", status: "accepted", hours: 20 });
    await page.getByRole("link", { name: "Open contract" }).click();
    await expect(page.getByText("Part-time from 28 Sep 2026", { exact: true })).toBeVisible();
  });
});

test.describe("offers · sending a trial offer", () => {
  test.use({ seedOptions: PROPOSAL_IN("2026-10-05") });

  test("the offer carries what the proposal settled — the tasks, the start and the end are read, not edited", async ({ page }) => {
    const offer = await startTheOffer(page);
    await settledTermsRead(offer);
    await depositAndSign(page, offer);
    const sent = (await savedDeal(page)).offer;
    expect(sent).toMatchObject({ status: "sent", start: "2026-10-05", end: "2026-11-13", rate: "$1,600.00/mo", deposit: { escrow: 1600, fee: 160 } });
    expect(sent.tasks.map((t: { title: string }) => t.title)).toEqual(["Audit the brand assets", "Draft two logo directions"]);
  });
});

test.describe("offers · a proposed start that has passed", () => {
  test.use({ seedOptions: PROPOSAL_IN("2026-09-21") });

  test("the offer can't start in the past: it waits for a revision with a new start date", async ({ page }) => {
    const offer = await startTheOffer(page);
    await offer.getByRole("button", { name: "Continue" }).click();
    await offer.getByRole("button", { name: "Continue" }).click();
    await expect(offer).toContainText("Juan's proposed start, 21 Sep 2026, has passed. Ask Juan for a revision with a new start date before sending an offer.");
    await expect(offer.getByRole("button", { name: "Continue" })).toBeDisabled();
  });
});

test.describe("offers · no card on file yet", () => {
  test.use({ seedOptions: { ...PROPOSAL_IN("2026-10-05"), stores: { "team.roles": [ROLE], "team.cards": [] } } });

  test("the deposit asks for a card there and then, and the charge opens once it's added", async ({ page }) => {
    const offer = await startTheOffer(page);
    for (let i = 0; i < 3; i++) await offer.getByRole("button", { name: "Continue" }).click();
    const charge = offer.getByRole("checkbox", { name: /^Charge \$1,760\.00/ });
    await expect(charge).toBeDisabled();
    await offer.getByRole("button", { name: "Add a card" }).click();
    const add = page.getByRole("dialog", { name: "Add a card" });
    await add.getByRole("textbox", { name: "Card number" }).fill("4242 4242 4242 4242");
    await add.getByRole("button", { name: "Add card" }).click();
    await expect(add).toBeHidden();
    await expect(offer).toContainText("Visa ending 4242");
    await expect(charge).toBeEnabled();
  });
});

test.describe("offers · a sent offer", () => {
  test.use({ seedOptions: OFFER_OUT_SEED });

  test("Juan's card in the pipeline reads it, and its one action is withdrawing it — a sent offer isn't edited", async ({ page }) => {
    await page.goto("/team/hire/roles/brand-designer?stage=offer");
    await page.getByRole("link", { name: "Review Sent Offer" }).click();
    await expect(page).toHaveURL(CANDIDATE);
    await expect(offerCard(page)).toContainText("$1,600 /month");
    await expectOnlyWithdraw(page);
    await withdrawTheOffer(page, "Juan D. is told the offer was withdrawn and can no longer accept it. Their proposal stays on file, so you can send a new offer from it.");
    expect((await savedDeal(page)).offer.status).toBe("withdrawn");
  });
});
