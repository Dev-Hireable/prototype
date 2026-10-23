import { EVALUATED, expect, NOW, notes, open, PATH, savedDeal, stored, test, toast } from "./fixtures";

// After the trial (user rules 2026-09-26, @/lib/contract/lifecycle and @/lib/demo/contract): a
// post-trial offer expires on its start date; either side ends a role with notice, and the company
// can end it today paying the notice; a contract not started yet can be cancelled; a dispute about a
// role keeps its amount back from the pay. Today is Fri 25 Sep 2026.

const DAY = 86_400_000;
const T = NOW.getTime();

const offer = (status: "sent" | "accepted", start: string) => ({ conversion: { type: "full-time", salary: "$4,000", start, benefits: ["Health Insurance Coverage"], status, sent: "22 Sep 2026", accepted: status === "accepted" ? "22 Sep 2026" : undefined } });

test.describe("a post-trial offer nobody answers", () => {
  test.use({ seedOptions: { contract: EVALUATED, deal: offer("sent", "2026-09-24") } });

  test("expires on its start date: it can't be accepted, and the decision is back", async ({ page, secondPage }) => {
    await page.goto(`${PATH.team}?tab=overview`);
    await expect(page.getByText(/Your full-time offer expired on 24 Sep 2026, its start date, without an answer from Juan\./)).toBeVisible();
    await expect.poll(async () => (await savedDeal(page)).conversion.status).toBe("expired");
    expect((await notes(page, "team")).map((n) => n.title)).toContain("Your full-time offer to Juan expired");
    await expect(page.getByRole("button", { name: "Send a new offer" })).toBeEnabled();

    const juan = await secondPage();
    await juan.goto(`${PATH.independent}/offer`);
    await expect(juan.getByText(/This offer expired on .* its start date, without an answer/)).toBeVisible();
    await expect(juan.getByRole("button", { name: "Accept" })).toHaveCount(0);
    await expect(juan.getByRole("button", { name: "Expired" })).toBeDisabled();
  });
});

test.describe("notice on a full-time role", () => {
  test.use({ seedOptions: { contract: EVALUATED, deal: offer("accepted", "2026-09-01") } });

  test("the independent gives notice, the role runs on to its last day, and the company can end it today paying the notice", async ({ page, secondPage }) => {
    await page.goto(`${PATH.independent}?tab=contract`);
    await page.getByRole("button", { name: "Give notice" }).click();
    const confirm = page.getByRole("dialog", { name: "Give notice on Brand Designer?" });
    await expect(confirm).toContainText("Last day: 25 Oct 2026 (30 days from today)");
    await confirm.getByRole("button", { name: "Give notice" }).click();
    await expect(toast(page, "Notice given. The role ends after 25 Oct 2026")).toBeVisible();
    expect((await savedDeal(page)).contract.notice).toMatchObject({ by: "independent", lastDay: "2026-10-25" });
    await expect(page.getByRole("button", { name: "Take back notice" })).toBeVisible();

    const alex = await secondPage();
    await alex.goto(`${PATH.team}?tab=overview`);
    await expect(alex.getByText("Ends 25 Oct 2026", { exact: true }).first()).toBeVisible();
    await expect(alex.getByText(/Juan gave notice on 25 Sep 2026: the full-time role ends after 25 Oct 2026\./)).toBeVisible();
    expect((await notes(alex, "team")).map((n) => n.title)).toContain("Juan gave notice");

    await alex.goto(`${PATH.team}?tab=evaluation`);
    await alex.getByRole("button", { name: "End today" }).click();
    await alex.getByRole("dialog").getByRole("button", { name: "End today" }).click();
    // All of September, then 25 of October's 31 days, at $4,000 a month.
    await expect(toast(alex, "Contract ended. $7,225.81 was paid to Juan, through the notice period.")).toBeVisible();
    expect((await savedDeal(alex)).contract).toMatchObject({ ended: true, paidThrough: "2026-10-25" });
  });
});

test.describe("a full-time role that hasn't started", () => {
  test.use({ seedOptions: { contract: EVALUATED, deal: offer("accepted", "2026-10-01") } });

  test("either side can cancel it before its first day, and nothing is owed", async ({ page }) => {
    await page.goto(`${PATH.independent}?tab=contract`);
    await expect(page.getByText(/Your full-time role hasn't started yet: its first day is 01 Oct 2026\./)).toBeVisible();
    await page.getByRole("button", { name: "Cancel contract" }).click();
    // It can't be undone: a reason, and the role's name typed out, before it goes.
    const dialog = page.getByRole("dialog", { name: "Cancel the Brand Designer contract?" });
    const confirm = dialog.getByRole("button", { name: "Cancel contract" });
    await expect(confirm).toBeDisabled();
    await dialog.getByRole("textbox", { name: "Type Brand Designer to confirm" }).fill("brand designer");
    await expect(confirm).toBeDisabled();
    await dialog.getByRole("textbox", { name: "Type Brand Designer to confirm" }).fill("Brand Designer");
    await confirm.click();
    await expect(dialog.getByText("Choose a reason.")).toBeVisible();
    await dialog.getByRole("button", { name: "Reason" }).click();
    await page.getByRole("option", { name: "Other", exact: true }).click();
    await confirm.click();
    await expect(dialog.getByText("Tell Nairobi Solutions Inc. why, in a line.")).toBeVisible();
    expect((await savedDeal(page)).contract.ended).toBeFalsy();
    await dialog.getByRole("textbox", { name: /^Why\?/ }).fill("I'm moving abroad next month");
    await confirm.click();
    await expect(toast(page, "Contract cancelled")).toBeVisible();
    expect((await savedDeal(page)).contract.cancelReason).toEqual({ by: "independent", reason: "Other", note: "I'm moving abroad next month" });
    expect((await savedDeal(page)).contract).toMatchObject({ ended: true, cancelled: true });
    expect((await notes(page, "team")).map((n) => n.title)).toContain("Contract cancelled");
    // It reads Cancelled, not Ended, and it's a step in the thread both sides share.
    await expect(page.getByText("Cancelled", { exact: true }).first()).toBeVisible();
    expect(JSON.stringify((await stored(page, "live"))?.chat ?? [])).toContain("cancelled the Brand Designer full-time role before its first day");

    // The Team Builder reads it in Messages, and its notification opens the contract.
    await page.goto("/team/messages");
    const entry = page.locator('[id^="msg-"]').filter({ hasText: /cancelled the Brand Designer full-time role before its first day/ });
    await expect(entry.getByRole("link", { name: "View details" })).toHaveAttribute("href", /\/team\/independents\/juan-dela-cruz\?tab=contract/);
    await page.goto("/team/notifications");
    await expect(page.getByText("Contract cancelled", { exact: true })).toBeVisible();
    await expect(page.getByText(/cancelled the Brand Designer full-time role before its first day, 01 Oct 2026\. Their reason: “I'm moving abroad next month”\. Nothing was owed\./)).toBeVisible();
  });
});

test.describe("a trial that hasn't started", () => {
  test.use({ seedOptions: { contract: { started: "2026-10-05", ends: "2026-11-13" } } });

  test("the Team Builder cancels it with a reason, the escrow comes back, and Juan reads why", async ({ page }) => {
    await page.goto(`${PATH.team}?tab=evaluation`);
    await page.getByRole("button", { name: "Cancel contract" }).click();
    const dialog = page.getByRole("dialog", { name: "Cancel the contract with Juan Dela Cruz?" });
    await expect(dialog.getByText(/The \$1,600\.00 in escrow comes back to you/)).toBeVisible();
    await dialog.getByRole("button", { name: "Reason" }).click();
    await page.getByRole("option", { name: "The role is on hold" }).click();
    await dialog.getByRole("textbox", { name: /Anything else Juan should know/ }).fill("We'll reopen it in the new year.");
    await expect(dialog.getByRole("button", { name: "Cancel contract" })).toBeDisabled();
    await dialog.getByRole("textbox", { name: "Type Brand Designer to confirm" }).fill("Brand Designer");
    await dialog.getByRole("button", { name: "Cancel contract" }).click();
    await expect(toast(page, "Contract cancelled. $1,600.00 came back to you.")).toBeVisible();
    expect((await savedDeal(page)).contract).toMatchObject({ ended: true, cancelled: true, cancelReason: { by: "team", reason: "The role is on hold" }, escrow: { refunded: 1600 } });
    const told = (await notes(page, "independent")).find((n) => n.title === "Contract cancelled");
    expect(told?.body).toContain("Their reason: “The role is on hold: We'll reopen it in the new year.”");
    expect(told?.body).toContain("The $1,600.00 in escrow went back to Nairobi Solutions Inc.");
  });
});

test.describe("a dispute about the role's pay", () => {
  /** Full-time since 1 Aug, after a trial that began 15 Jun; the company disputes $1,000 of the pay. */
  const role = {
    id: "dsp-role",
    contract: "deal:brand-designer:2026-06-15",
    links: { team: "juan-dela-cruz", independent: "brand-designer" },
    title: "Brand Designer",
    type: "full-time",
    rate: "$4,000 /month",
    team: { name: "Alex Rivera", company: "Nairobi Solutions Inc.", slug: "nairobi-solutions" },
    independent: { name: "Juan Dela Cruz", slug: "juan-dela-cruz", avatar: "/team/juan.jpg" },
    filedBy: "team",
    at: T - 3 * DAY,
    reason: "Missed Deadline",
    description: "The August campaign assets never arrived.",
    amount: 1000,
    status: "Pending",
    turn: { who: "independent", since: T - 3 * DAY, due: T + 2 * DAY, why: "respond" },
    facts: { started: "01 Aug 2026", ends: "Ongoing", trialEnded: false, evaluation: true, tasksDone: 0, tasksTotal: 0, escrowHeld: 0 },
    entries: [{ id: "filed-a", at: T - 3 * DAY, by: "team", kind: "filed", text: "The August campaign assets never arrived." }],
    proposals: [],
    updated: T - 3 * DAY,
  };
  test.use({ seedOptions: { contract: { ...EVALUATED, started: "2026-06-15", ends: "2026-07-24" }, deal: offer("accepted", "2026-08-01"), disputes: [role] } });

  test("keeps its amount back from the next payday, and pays it on when the case closes without a refund", async ({ page, secondPage }) => {
    await open(page, "independent");
    // August closed with the case open: $1,000 of its $4,000 is kept back.
    await expect.poll(async () => (await savedDeal(page)).contract.paidThrough).toBe("2026-08-31");
    expect((await savedDeal(page)).contract.roleHolds["dsp-role"]).toMatchObject({ amount: 1000, withheld: 1000 });
    const paid = (await notes(page, "independent")).filter((n) => n.title === "Payment recorded");
    expect(paid).toHaveLength(1);
    expect(paid[0].body).toContain("$3,000.00");
    expect(paid[0].body).toContain("$1,000.00 held for a dispute");

    // The company withdraws it: the hold lifts, and what it kept back is paid on.
    const alex = await secondPage();
    await alex.goto("/team/payments/disputes/dsp-role");
    await alex.getByRole("button", { name: "Withdraw dispute" }).click();
    await alex.getByRole("dialog").getByRole("button", { name: "Withdraw dispute" }).click();
    await expect.poll(async () => (await savedDeal(alex)).contract.roleHolds["dsp-role"]).toMatchObject({ closed: true, withheld: 0, deduct: 0 });
    const after = (await notes(alex, "independent")).filter((n) => n.title === "Payment recorded");
    expect(after.map((n) => n.body).join(" ")).toContain("$1,000.00");
  });
});
