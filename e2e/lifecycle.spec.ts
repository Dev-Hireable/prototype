import { api, EVALUATED, expect, notes, open, PATH, panel, savedDeal, savedEscrow, test, toast } from "./fixtures";

// The contract's lifecycle (@/lib/contract/lifecycle): trial → evaluation → decision / offer →
// full-time or part-time → ended. Today is Fri 25 Sep 2026; the seeded trial funded $1,600 of escrow.

const offer = (status: "sent" | "accepted", start: string) => ({ conversion: { type: "full-time", salary: "$4,000", start, benefits: ["Health Insurance Coverage"], status, sent: "22 Sep 2026", accepted: status === "accepted" ? "22 Sep 2026" : undefined } });

test.describe("after the trial's last day", () => {
  test.use({ seedOptions: { contract: { ends: "2026-09-24" } } });

  test("it waits on the evaluation: reviews can be approved, nothing is sent back", async ({ page, secondPage }) => {
    await page.goto(`${PATH.team}?tab=overview`);
    await expect(page.getByText("Evaluation due", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/The trial has ended\. Send your evaluation of Juan by 29 Sep 2026: it makes the Trial Fit Score final and releases the \$1,600\.00 in escrow to Juan\./)).toBeVisible();
    await page.goto(PATH.team);
    await expect(page.getByTestId("workspace")).toBeVisible();
    // Sent back now, it could never come back.
    expect(await api(page, "transition", "t-logos", { to: "doing", note: "Tighten the spacing" })).toMatchObject({ ok: false, code: "forbidden", message: "The trial is over, so Juan can't make changes now. Approve it, or leave it for your evaluation." });
    expect(await api(page, "transition", "t-logos", { to: "done" })).toMatchObject({ ok: true });

    const juan = await secondPage();
    await juan.goto(PATH.independent);
    await expect(juan.getByText("Awaiting evaluation", { exact: true }).first()).toBeVisible();
    await expect(juan.getByText("The trial ended on 24 Sep 2026. Your work is with Alex for the evaluation, due 29 Sep 2026.")).toBeVisible();
  });

  test("the trial's evaluation makes the score final and pays out the escrow", async ({ page }) => {
    await page.goto(`${PATH.team}?tab=evaluation`);
    await page.getByRole("button", { name: "Recommendation" }).click();
    await page.getByRole("option", { name: "Hire full-time" }).click();
    await page.getByRole("textbox", { name: "Comments for the independent" }).fill("Clear, careful work — ready for more.");
    await page.getByRole("button", { name: "Send evaluation" }).click();
    await expect(toast(page, /Evaluation sent — Juan's Trial Fit Score is final and \$1,600\.00 was released to them/)).toBeVisible();
    expect(await savedEscrow(page)).toEqual({ released: 1600, refunded: 0 });
    const deal = await savedDeal(page);
    expect(deal.contract.trialScore).toMatchObject({ phase: 4 });
    expect((await notes(page, "independent")).map((n) => n.title)).toEqual(expect.arrayContaining(["Your trial evaluation is in", "Payment recorded"]));
    // Now it's decided: hire, or end.
    await page.goto(`${PATH.team}?tab=overview`);
    await expect(page.getByText("Evaluation sent", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/The trial is evaluated\. Hire Juan full-time or part-time to keep working together, or end the contract\./)).toBeVisible();
  });
});

test.describe("an offer out, then ending", () => {
  test.use({ seedOptions: { contract: EVALUATED, deal: offer("sent", "2026-09-28") } });

  test("ending is final: the offer still out is withdrawn, and nothing can be hired or reopened", async ({ page, secondPage }) => {
    await page.goto(`${PATH.team}?tab=overview`);
    await expect(page.getByText("Full-time offer sent", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Your full-time offer — \$4,000 \/month, from 28 Sep 2026 — is with Juan\./)).toBeVisible();
    await expect(page.getByRole("button", { name: "Withdraw offer" })).toBeVisible();

    await page.goto(`${PATH.team}?tab=evaluation`);
    await page.getByRole("button", { name: "End contract" }).click();
    await expect(page.getByRole("dialog")).toContainText("your full-time offer is withdrawn");
    await page.getByRole("dialog").getByRole("button", { name: "End contract" }).click();
    await expect(toast(page, "Contract ended")).toBeVisible();
    const deal = await savedDeal(page);
    expect(deal.contract.ended).toBe(true);
    expect(deal.conversion.status).toBe("withdrawn");
    await expect(page.getByRole("button", { name: "Hire Juan" })).toBeDisabled();

    const juan = await secondPage();
    await juan.goto(`${PATH.independent}/offer`);
    await expect(juan.getByText("Nairobi Solutions Inc. ended the contract, so this offer was withdrawn and can no longer be accepted.")).toBeVisible();
  });
});

test.describe("converted to full-time", () => {
  test.use({ seedOptions: { contract: EVALUATED, deal: offer("accepted", "2026-09-21") } });

  test("it carries on as the role, with the trial kept as its first chapter", async ({ page, secondPage }) => {
    await open(page, "team");
    await expect(page.getByText("Active", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Full-time since 21 Sep 2026")).toBeVisible();
    await expect(page.getByText(/Trial Fit Score \d+% · final/)).toBeVisible();

    await page.goto(`${PATH.team}?tab=contract`);
    await expect(page.getByText("Next payment")).toBeVisible();
    // 21–30 Sep: ten of September's thirty days of $4,000.
    await expect(page.getByText("$1,333.33 on 30 Sep 2026")).toBeVisible();
    await expect(page.getByText("10 Aug 2026 – 18 Sep 2026")).toBeVisible();
    // The benefits the offer carried, not a fixed list.
    const benefits = page.getByRole("listitem").filter({ hasText: "Internet Allowance" });
    await expect(benefits).toContainText("Not included");
    await expect(page.getByRole("listitem").filter({ hasText: "Health Insurance Coverage" })).toContainText("Included");
    // Disputes stay open for as long as the contract runs — about the pay, now.
    await expect(page.getByRole("button", { name: "File a Dispute" }).first()).toBeEnabled();

    const juan = await secondPage();
    await juan.goto(`${PATH.independent}?tab=evaluation`);
    await expect(juan.getByRole("heading", { name: "Your trial evaluation" })).toBeVisible();
    await expect(juan.getByText("Active", { exact: true }).first()).toBeVisible();
  });
});

test.describe("full-time pay", () => {
  test.use({ seedOptions: { contract: { ...EVALUATED, started: "2026-06-15", ends: "2026-07-24" }, deal: offer("accepted", "2026-08-01") } });

  test("each month is paid on its last day, once", async ({ page }) => {
    await open(page, "independent");
    // August has closed: it's paid in full. September hasn't.
    await expect.poll(async () => (await savedDeal(page)).contract.paidThrough).toBe("2026-08-31");
    const paid = (await notes(page, "independent")).filter((n) => n.title === "Payment recorded");
    expect(paid).toHaveLength(1);
    expect(paid[0].body).toContain("$4,000.00");
    await page.reload();
    await expect(page.getByTestId("workspace")).toBeVisible();
    await page.waitForTimeout(500);
    expect((await notes(page, "independent")).filter((n) => n.title === "Payment recorded")).toHaveLength(1);
    await page.goto(`${PATH.independent}?tab=contract`);
    await expect(page.getByText("$4,000.00 on 30 Sep 2026", { exact: true })).toBeVisible();
    await expect(panel(page)).toHaveCount(0);
  });
});

test.describe("a full-time role that has ended", () => {
  test.use({ seedOptions: { contract: { ...EVALUATED, ended: true, endedOn: "24 Sep 2026" }, deal: offer("accepted", "2026-09-01") } });

  test("its term runs to the day it ended, and the trial's money stays labelled as the trial's", async ({ page }) => {
    // The Overview's Contract & payment card.
    await page.goto(`${PATH.team}?tab=overview`);
    await expect(page.getByText("01 Sep 2026 – 24 Sep 2026")).toBeVisible();
    await expect(page.getByText(/– Ongoing/)).toHaveCount(0);

    // The escrow deposit was the trial's, whatever the contract became.
    await page.goto("/team/payments");
    // (The only money on this seed is the trial's deposit: it used to read "— full-time".)
    await expect(page.getByRole("button", { name: "Brand Designer — trial" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Brand Designer — full-time" })).toHaveCount(0);
  });
});
