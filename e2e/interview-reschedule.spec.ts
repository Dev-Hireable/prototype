import type { Page } from "@playwright/test";
import { expect, notes, savedDeal, test, toast } from "./fixtures";

// IN-092 / IN-093 / TB-041 — an interview the talent can't make: declining it stops the hire until a
// new slot is agreed, and asking for a new time lets the Team Builder confirm the slot asked for.

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
  budget: "$1,600.00 - $2,000.00",
  duration: "30 Days",
  experience: "Advanced (5–8 years)",
  skills: ["Branding"],
  expectation: "",
  attachment: "",
};

/** Juan has accepted an interview for Tue 29 Sep: the point where declining used to leave it Confirmed. */
const CONFIRMED = {
  deal: {
    stage: "invite_accepted",
    contract: null,
    offer: null,
    proposal: null,
    interview: { when: "Tue 29 Sep 2026, 10:00 AM (PHT)", format: "Google Meet", link: "https://meet.google.com/yxw-vuts-rqp", accepted: true },
  },
  stores: { "team.roles": [ROLE] },
};

const APPLICATION = "/independent/jobs/applications/deal";
const CANDIDATE = `/team/hire/roles/${ROLE.slug}/candidates/deal`;
/** The slot Juan asks for, as it's saved: picked in his own clock, so no zone in the text. */
const ASKED = "Wed 30 Sep 2026, 02:00 PM";
/** The same slot as Alex reads it: both are on Manila's clock here, so one time serves both. */
const ASKED_FOR_ALEX = "Wed 30 Sep, 2:00 PM, your time and Juan's";
/** And as Juan reads it back, on his application. */
const ASKED_FOR_JUAN = "Wed 30 Sep, 2:00 PM, your time and Alex's";

/** Juan asks for Wed 30 Sep at 2 PM, with a note, from whichever button opened the dialog. */
async function askForNewTime(juan: Page) {
  const dialog = juan.getByRole("dialog", { name: "Ask for a new time" });
  await expect(dialog).toContainText("Can't make Tue 29 Sep, 10:00 AM?");
  await expect(dialog.getByRole("button", { name: "Send request" })).toBeDisabled();
  await dialog.getByRole("button", { name: /Date|Pick a date/ }).click();
  await juan.getByRole("button", { name: /September 30th, 2026/ }).click();
  await dialog.getByRole("button", { name: /Time|Pick a time/ }).click();
  await juan.getByRole("option", { name: "02:00 PM" }).click();
  await dialog.getByRole("textbox", { name: "Note (optional)" }).fill("I have a client call that morning.");
  await dialog.getByRole("button", { name: "Send request" }).click();
  await expect(dialog).toHaveCount(0);
}

test.describe("an interview the talent can't make · declining", () => {
  test.use({ seedOptions: CONFIRMED });

  test("declining a confirmed interview stops the hire: the Team Builder can only offer a new time", async ({ page, secondPage }) => {
    const juan = await secondPage();
    await juan.goto(APPLICATION);
    await juan.getByRole("button", { name: "Decline", exact: true }).click();
    const confirm = juan.getByRole("dialog", { name: "Decline this invitation?" });
    await expect(confirm.getByRole("button", { name: "Ask for a new time" })).toBeVisible();
    await confirm.getByRole("button", { name: "Decline", exact: true }).click();
    await expect(juan.getByText("You declined this interview")).toBeVisible();
    const deal = await savedDeal(juan);
    expect(deal.stage).toBe("invited");
    expect(deal.interview).toMatchObject({ outcome: "declined", accepted: false, past: true });

    // Alex: no way on to the proposal or the contract, only a new slot.
    await page.goto(CANDIDATE);
    await expect(page.getByText("Juan declined the interview. Offer a new time to keep going.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Offer a new time" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark interview done" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Request proposal" })).toHaveCount(0);
    await page.goto(`/team/hire/roles/${ROLE.slug}`);
    await expect(page.getByRole("button", { name: "Offer a new time" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark interview done" })).toHaveCount(0);

    // Declining isn't the end of it: Juan can still ask for a time that works.
    await juan.getByRole("button", { name: "Ask for a new time" }).click();
    await askForNewTime(juan);
    await expect(juan.getByText(`You asked Nairobi Solutions Inc. for ${ASKED_FOR_JUAN}.`, { exact: false })).toBeVisible();
  });
});

test.describe("an interview the talent can't make · asking for a new time", () => {
  test.use({ seedOptions: CONFIRMED });

  test("asking for a new time: the Team Builder confirms the slot asked for, and it's booked as confirmed", async ({ page, secondPage }) => {
    const juan = await secondPage();
    await juan.goto(APPLICATION);
    await juan.getByRole("button", { name: "Ask for a new time" }).click();
    await askForNewTime(juan);
    await expect(juan.getByText("New time requested")).toBeVisible();
    expect((await savedDeal(juan)).interview).toMatchObject({ outcome: "reschedule", requested: { when: ASKED, note: "I have a client call that morning." } });
    expect((await notes(juan, "team")).some((n) => n.title === "Juan D. asked for a new interview time" && n.body.includes(ASKED))).toBe(true);

    // Alex sees the slot asked for, and the interview can't be marked done meanwhile.
    await page.goto(CANDIDATE);
    await expect(page.getByText(`Juan can't make the slot and asked for ${ASKED_FOR_ALEX}.`, { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark interview done" })).toHaveCount(0);
    await page.getByRole("button", { name: "Review new time" }).click();
    const dialog = page.getByRole("dialog", { name: "Juan asked for a new time" });
    await expect(dialog).toContainText(`Juan asked for ${ASKED_FOR_ALEX}.`);
    await expect(dialog).toContainText("I have a client call that morning.");
    await dialog.getByRole("button", { name: "Confirm this time" }).click();
    await expect(toast(page, "Interview invitation sent to Juan")).toBeVisible();

    // Booked as confirmed straight away: no second yes from Juan, and the interview can be held.
    const deal = await savedDeal(page);
    expect(deal.stage).toBe("invite_accepted");
    expect(deal.interview).toMatchObject({ when: ASKED, accepted: true });
    await expect(page.getByRole("button", { name: "Mark interview done" })).toBeEnabled();
    await juan.reload();
    await expect(juan.getByRole("button", { name: "Join call" })).toBeVisible();
    await expect(juan.getByText(ASKED_FOR_JUAN)).toBeVisible();
    expect((await notes(juan, "independent")).some((n) => n.title === "New interview time confirmed")).toBe(true);
  });
});
