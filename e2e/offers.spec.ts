import type { Page } from "@playwright/test";
import { card, EVALUATED, expect, notes, savedDeal, test, toast } from "./fixtures";

// Offers, on both sides: the trial offer the talent signs or declines on their application (IN-074 /
// IN-075), the full-time or part-time offer that follows an evaluated trial (TB-072 / IN-084), and
// the Team Builder's edit of a sent offer, reached from Offers sent (TB-105). Today is Fri 25 Sep
// 2026. A post-trial offer left to run past its start date is after-trial.spec's.

const APPLICATION_OFFER = "/independent/jobs/applications/deal/offer";
const CONTRACT_OFFER = "/independent/contracts/brand-designer/offer";
const OFFERS_SENT = "/team/hire/offers";
const EDITOR = "/team/hire/offers/deal/edit";
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

/** The role on the Team Builder's side, which the editor reads the title and trial length from. */
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
  tasks: [{ title: "Audit the brand assets", week: 1 }],
  hires: 1,
};
const OFFER_OUT_SEED = { deal: OFFER_OUT, stores: { "team.roles": [ROLE] } };

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

/* The signature every offer is signed with, Accept, and a row's menu on Offers sent. */
const nameField = (page: Page) => page.getByRole("textbox", { name: /^Type your full name to sign/ });
const agreement = (page: Page) => page.getByRole("checkbox", { name: "I agree to the platform contract and terms of service." });
const acceptButton = (page: Page) => page.getByRole("button", { name: "Accept", exact: true });
const offerActions = (page: Page) => page.getByRole("button", { name: "Actions for the offer to Juan Dela Cruz" });

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

/** Offers sent reads the declined offer with the talent's reason and nothing left to do; its editor says it can't be changed. */
async function teamSeesTheDecline(alex: Page) {
  await alex.goto(OFFERS_SENT);
  await expect(alex.getByText("1 offer · 0 pending")).toBeVisible();
  await expect(alex.getByText("Declined", { exact: true })).toBeVisible();
  await expect(alex.getByText(`“${REASON}”`)).toBeVisible();
  await expect(offerActions(alex)).toHaveCount(0);
  await alex.goto(EDITOR);
  await expect(alex.getByText("This offer was declined and can't be edited. Send Juan a new offer from their candidate profile instead.")).toBeVisible();
  await expect(alex.getByRole("link", { name: "Open Juan's profile" })).toHaveAttribute("href", "/team/hire/roles/brand-designer/candidates/deal");
}

/** A post-trial offer's Edit offer is off in its menu, and its tip says to withdraw it and send a new one. */
async function expectEditRefused(alex: Page) {
  await offerActions(alex).click();
  const edit = alex.getByRole("menuitem", { name: "Edit offer" });
  await expect(edit).toBeDisabled();
  // A disabled item takes no pointer events: the tip hangs on the span around it.
  await edit.locator("..").hover();
  await expect(alex.locator('[data-slot="tooltip-content"]').filter({ hasText: "Withdraw it and send a new one to change a post-trial offer" })).toBeVisible();
  await alex.keyboard.press("Escape");
  await expect(alex.getByRole("menu")).toBeHidden();
}

/** Withdraws the one pending offer from its menu, once the confirmation has said what that does. */
async function withdrawTheOffer(alex: Page, description: string) {
  await offerActions(alex).click();
  await alex.getByRole("menuitem", { name: "Withdraw offer" }).click();
  const confirm = alex.getByRole("dialog", { name: "Withdraw this offer?" });
  await expect(confirm).toContainText(description);
  await confirm.getByRole("button", { name: "Withdraw offer" }).click();
  await expect(toast(alex, "Offer withdrawn")).toBeVisible();
  await expect(alex.getByText("Withdrawn", { exact: true })).toBeVisible();
  await expect(offerActions(alex)).toHaveCount(0);
}

/** In the editor: moves the start to Mon 12 Oct and the rate to $1,800, adds a task and signs — the note, end date and escrow follow. */
async function editTheTerms(alex: Page) {
  await expect(alex.getByText("Sent on 22 Sep 2026, not signed yet. Edit the rate, start date or tasks to send an updated version.")).toBeVisible();
  await alex.getByRole("textbox", { name: "Rate" }).fill("1800");
  await alex.getByRole("button", { name: "Start date" }).click();
  await alex.getByRole("button", { name: /October 12th, 2026/ }).click();
  await alex.getByRole("button", { name: "Add task" }).click();
  await alex.getByRole("textbox", { name: "Task 3" }).fill("Present the brand book");
  await expect(alex.getByText("Sent on 22 Sep 2026, not signed yet. Changing rate $1,600 /month → $1,800.00/mo · start to 12 Oct 2026 · the tasks (3).")).toBeVisible();
  // Thirty working days from the new start, and one more month's difference in escrow.
  await expect(alex.getByText("20 Nov 2026", { exact: true })).toBeVisible();
  await expect(alex.getByText("The escrow goes from $1,600.00 to $1,800.00: $200.00 more, plus its $20.00 fee, is charged to your card.")).toBeVisible();
  const send = alex.getByRole("button", { name: "Send updated offer" });
  await expect(send).toBeDisabled();
  await nameField(alex).fill("Alex Rivera");
  await agreement(alex).check();
  await expect(send).toBeEnabled();
}

/** Juan's offer after the edit: the updated heading, the new terms and task, and a fresh week to answer it. */
async function talentReadsTheUpdate(juan: Page) {
  await expect(juan.getByRole("heading", { name: "Updated offer from Nairobi Solutions Inc." })).toBeVisible();
  await expect(juan.getByText("Nairobi Solutions Inc. changed the terms on 25 Sep 2026. Review and sign the new version; the earlier offer no longer applies.")).toBeVisible();
  await expectTerms(juan, trialTerms({ start: "Mon 12 Oct 2026", end: "Fri 20 Nov 2026", rate: "$1,800.00/mo", total: "$1,800.00" }));
  await expect(juan.getByRole("listitem").filter({ hasText: "Present the brand book" })).toBeVisible();
  await expect(juan.getByText("This updated offer expires on Fri 2 Oct 2026")).toBeVisible();
}

/** Deletes the first task in the editor's plan, from its ⋯ menu. */
async function deleteFirstTask(alex: Page) {
  await alex.getByRole("button", { name: "Options for task 1" }).click();
  await alex.getByRole("menuitem", { name: "Delete task" }).click();
}

/** Opens the editor on a new rate, $1,800, signed and ready to send. */
async function readyToSend(alex: Page) {
  await alex.goto(EDITOR);
  await alex.getByRole("textbox", { name: "Rate" }).fill("1800");
  await nameField(alex).fill("Alex Rivera");
  await agreement(alex).check();
  await expect(alex.getByRole("button", { name: "Send updated offer" })).toBeEnabled();
}

/**
 * Saves Juan's acceptance as his tab would — the offer accepted, the contract started — but from this
 * page: a write from the page itself raises no storage event, so this tab keeps its older copy, as it
 * does in the moment before the other tab's event arrives.
 */
async function acceptUnheard(alex: Page) {
  await alex.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("hireable.demo.deal") ?? "{}");
    const offer = { ...saved.deal.offer, status: "accepted" };
    saved.deal = { ...saved.deal, stage: "hired", offer, contract: { started: offer.start, ends: offer.end, rate: offer.rate, deposit: 1600, tasks: [], activity: [], streak: 0 } };
    localStorage.setItem("hireable.demo.deal", JSON.stringify(saved));
  });
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
    expect((await notes(page, "team")).find((n) => n.title === "Juan Dela Cruz declined your offer")).toMatchObject({ href: OFFERS_SENT });

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
    await alex.goto(OFFERS_SENT);
    await expect(alex.getByText("After the trial", { exact: true })).toBeVisible();
    await expectEditRefused(alex);
    await withdrawTheOffer(alex, "Juan Dela Cruz is told the offer was withdrawn and can no longer accept it. Their contract is unchanged.");
    await expect(alex.getByText("2 offers · 0 pending")).toBeVisible();
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

test.describe("offers · editing a sent offer", () => {
  test.use({ seedOptions: OFFER_OUT_SEED });

  test("Edit offer opens it from Offers sent, and new terms and tasks reach Juan as an updated offer", async ({ page, secondPage }) => {
    await page.goto(OFFERS_SENT);
    await expect(page.getByText("1 offer · 1 pending")).toBeVisible();
    await offerActions(page).click();
    await page.getByRole("menuitem", { name: "Edit offer" }).click();
    await expect(page).toHaveURL(/\/team\/hire\/offers\/deal\/edit$/);
    await expect(page.getByRole("heading", { name: "Edit the offer to Juan Dela Cruz" })).toBeVisible();
    await editTheTerms(page);
    await page.getByRole("button", { name: "Send updated offer" }).click();

    // Back on Offers sent: still pending, with the new pay and dates, sent today.
    await expect(page).toHaveURL(/\/team\/hire\/offers$/);
    await expect(page.getByText("12 Oct – 20 Nov 2026", { exact: true })).toBeVisible();
    await expect(page.getByText("Sent 25 Sep 2026", { exact: true })).toBeVisible();
    expect((await savedDeal(page)).offer).toMatchObject({ status: "sent", updated: "25 Sep 2026", rate: "$1,800.00/mo", start: "2026-10-12", end: "2026-11-20", deposit: { escrow: 1800, fee: 180 } });
    const [told] = await notes(page, "independent");
    expect(told).toMatchObject({ title: "Your offer was updated", href: `${APPLICATION_OFFER}?updated=1` });

    const juan = await secondPage();
    await juan.goto(told.href);
    await talentReadsTheUpdate(juan);
  });

  test("Send updated offer waits for a real change, a signature, a rate and a trial task, and the start can't go back in time", async ({ page }) => {
    await page.goto(EDITOR);
    const send = page.getByRole("button", { name: "Send updated offer" });
    const rate = page.getByRole("textbox", { name: "Rate" });
    await nameField(page).fill("Alex Rivera");
    await agreement(page).check();
    await expect(send).toBeDisabled();
    await rate.fill("");
    await expect(send).toBeDisabled();
    await rate.fill("1800");
    await expect(send).toBeEnabled();

    // A trial is judged on its tasks: with none left it can't go out.
    await deleteFirstTask(page);
    await deleteFirstTask(page);
    await expect(page.getByText("A trial needs at least one task.")).toBeVisible();
    await expect(send).toBeDisabled();
    await page.getByRole("textbox", { name: "Task 1" }).fill("Audit the brand assets");
    await expect(send).toBeEnabled();

    await page.getByRole("button", { name: "Start date" }).click();
    await page.getByRole("button", { name: "Go to the Previous Month" }).click();
    await expect(page.getByRole("button", { name: /September 24th, 2026/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: /September 25th, 2026/ })).toBeEnabled();
  });
});

test.describe("offers · an offer answered while it's being edited", () => {
  test.use({ seedOptions: OFFER_OUT_SEED });

  test("the editor closes and says why, and the terms Juan accepted stand", async ({ page, secondPage }) => {
    await readyToSend(page);
    const juan = await secondPage();
    await juan.goto(APPLICATION_OFFER);
    await signAndAccept(juan);
    await expect(juan.getByRole("dialog", { name: "You’ve accepted the offer" })).toBeVisible();

    // The editor, open all along, takes the answer in: there's nothing left to send.
    await expect(page.getByText("This offer was accepted and can't be edited.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send updated offer" })).toHaveCount(0);
    expect((await savedDeal(page)).offer).toMatchObject({ status: "accepted", rate: "$1,600 /month" });
  });

  // BUG: updateOffer (src/lib/team/offers.ts) checks the offer is still open on this tab's copy of the
  // deal (getDeal), then writes the new terms over what's saved without checking again. An edit sent
  // before the tab has heard of Juan's answer reopens his accepted offer — status back to "sent", the
  // stage back to "offer_received" — with the contract already started. withdrawOffer, the talent's
  // setStage and declineOffer (src/lib/independent/applications.ts) and declineConversion
  // (src/lib/independent/contracts.ts) check the same way; acceptConversion re-reads first (readDeal).
  test.fixme("an edit sent before the editor has heard Juan accepted leaves his accepted offer alone", async ({ page }) => {
    await readyToSend(page);
    await acceptUnheard(page);
    await page.getByRole("button", { name: "Send updated offer" }).click();
    await expect(page).toHaveURL(/\/team\/hire\/offers$/);
    expect(await savedDeal(page)).toMatchObject({ stage: "hired", offer: { status: "accepted", rate: "$1,600 /month" } });
  });
});
