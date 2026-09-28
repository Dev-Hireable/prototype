import { EVALUATED, expect, NOW, notes, open, PATH, savedDispute, savedEscrow, test, toast } from "./fixtures";

// Disputes as cases worked in turns — filed on one side, answered on the other within five days,
// reviewed by Hireable support, settled between the two or ruled on — with the files both sides
// attach, across the three portals.

const DAY = 86_400_000;
const T = NOW.getTime();
/** A 1×1 PNG — a screenshot, as far as the case is concerned. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const shot = (name: string) => ({ name, mimeType: "image/png", buffer: PNG });

/** The trial is over, so either side can file. */
const OVER = { contract: { ends: "2026-09-24" } };

/** A dispute on the live contract, as the store keeps it. */
function onFile(id: string, over: Record<string, unknown>) {
  return {
    id,
    contract: "deal:brand-designer:2026-09-21",
    links: { team: "juan-dela-cruz", independent: "brand-designer" },
    title: "Brand Designer",
    type: "trial",
    rate: "$1,600 /month",
    team: { name: "Alex Rivera", company: "Nairobi Solutions Inc.", slug: "nairobi-solutions" },
    independent: { name: "Juan Dela Cruz", slug: "juan-dela-cruz", avatar: "/team/juan.jpg" },
    filedBy: "team",
    at: T - 6 * DAY,
    reason: "Missed Deadline",
    description: "The logo drafts came two weeks late.",
    amount: 800,
    status: "Pending",
    facts: { started: "21 Sep 2026", ends: "24 Sep 2026", trialEnded: true, evaluation: false, tasksDone: 1, tasksTotal: 7, escrowHeld: 1600, escrowFunded: 1600 },
    entries: [{ id: "filed-a", at: T - 6 * DAY, by: "team", kind: "filed", text: "The logo drafts came two weeks late." }],
    proposals: [],
    updated: T - 6 * DAY,
    ...over,
  };
}

/** Juan has answered; it's with support. */
const ANSWERED = onFile("dsp-open", {
  turn: { who: "support", since: T - 2 * DAY },
  entries: [
    { id: "filed-a", at: T - 6 * DAY, by: "team", kind: "filed", text: "The logo drafts came two weeks late." },
    { id: "response-b", at: T - 2 * DAY, by: "independent", kind: "response", text: "The brief changed on the 22nd." },
  ],
  updated: T - 2 * DAY,
});

test.describe("filing and responding", () => {
  test.use({ seedOptions: OVER });

  test("the other side has five days to respond, and both read the same case with each other's screenshots", async ({ page, secondPage }) => {
    await open(page, "team");
    await page.getByRole("button", { name: "File a Dispute" }).first().click();
    const form = page.getByRole("dialog", { name: /File a dispute about Juan Dela Cruz/ });
    await form.getByRole("button", { name: "Reason" }).click();
    await page.getByRole("option", { name: "Missed Deadline" }).click();
    await form.getByRole("textbox", { name: "What happened?" }).fill("The logo drafts came two weeks late.");
    await form.getByRole("textbox", { name: /Amount in question/ }).fill("800");
    await form.getByLabel("Attach screenshots or PDFs").setInputFiles(shot("late-drafts.png"));
    await expect(form.getByRole("button", { name: "Remove late-drafts.png" })).toBeVisible();
    await expect(form.getByText("Once it's filed, the other side has 5 days to respond.", { exact: false })).toBeVisible();
    await form.getByRole("button", { name: "File dispute" }).click();

    // Straight to the case, on Juan's turn, with five days on the clock.
    await expect(page).toHaveURL(/\/team\/payments\/disputes\/dsp-/);
    const id = page.url().split("/").pop() as string;
    await expect(page.getByText(/Waiting on Juan Dela Cruz to respond — they have until .*5 days left/)).toBeVisible();
    expect(await savedDispute(page, id)).toMatchObject({ status: "Pending", amount: 800, turn: { who: "independent", due: T + 5 * DAY, why: "respond" } });

    // Juan is told, and the notification opens the case — with Alex's screenshot on it.
    const [told] = await notes(page, "independent");
    expect(told).toMatchObject({ title: "Nairobi Solutions Inc. filed a dispute", href: `/independent/wallet/disputes/${id}` });
    const juan = await secondPage();
    await juan.goto(told.href);
    await expect(juan.getByText("It's your turn to respond")).toBeVisible();
    await expect(juan.getByRole("button", { name: /Open late-drafts\.png/ })).toBeVisible();

    await juan.getByRole("textbox", { name: "Your response" }).fill("The brief changed on the 22nd, so the drafts moved with it.");
    await juan.getByLabel("Attach screenshots or PDFs").setInputFiles(shot("brief-change.png"));
    await juan.getByRole("button", { name: "Send response" }).click();
    await expect(toast(juan, "Response sent — Hireable support is reviewing the case")).toBeVisible();
    await expect.poll(async () => (await savedDispute(juan, id))?.turn).toEqual({ who: "support", since: T });

    // Alex's page moves on its own: the answer and Juan's screenshot are on the case, and it's with support.
    await expect(page.getByText(/Hireable support is reviewing the case/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Open brief-change\.png/ })).toBeVisible();
    expect((await notes(page, "team"))[0].title).toBe("Juan Dela Cruz responded to the dispute");
  });
});

test.describe("a turn that runs out", () => {
  test.use({ seedOptions: { ...OVER, disputes: [onFile("dsp-lapsed", { turn: { who: "independent", since: T - 6 * DAY, due: T - DAY, why: "respond" } })] } });

  test("closes the case for the other side, and the company's refund comes out of escrow", async ({ page }) => {
    await page.goto("/team/payments/disputes/dsp-lapsed");
    await expect(page.getByText(/Closed for Nairobi Solutions Inc\. — Juan Dela Cruz didn't respond in time · \$800\.00 refunded/)).toBeVisible();
    expect(await savedDispute(page, "dsp-lapsed")).toMatchObject({ status: "Resolved", resolution: { kind: "default", favor: "team", payment: "refunded", moved: 800 } });
    expect(await savedEscrow(page)).toEqual({ released: 0, refunded: 800 });
    expect((await notes(page, "independent"))[0].title).toBe("The dispute closed — no response");
    expect((await notes(page, "team"))[0].title).toBe("The dispute closed in your favor");
  });
});

test.describe("settling between themselves", () => {
  test.use({ seedOptions: { ...OVER, disputes: [ANSWERED] } });

  test("one side proposes a split, the other accepts, and the money moves both ways", async ({ page, secondPage }) => {
    await page.goto("/independent/wallet/disputes/dsp-open");
    await page.getByRole("button", { name: "Propose a settlement" }).click();
    await page.getByRole("button", { name: "Half each" }).click();
    await expect(page.getByRole("textbox", { name: "Back to Nairobi Solutions Inc." })).toHaveValue("400.00");
    await expect(page.getByRole("textbox", { name: "To Juan Dela Cruz" })).toHaveValue("400.00");
    await page.getByRole("button", { name: "Send proposal" }).click();
    await expect(toast(page, "Proposal sent — Nairobi Solutions Inc. can accept or decline")).toBeVisible();
    await expect(page.getByText("Waiting on Nairobi Solutions Inc. to accept or decline.")).toBeVisible();

    const alex = await secondPage();
    await alex.goto("/team/payments/disputes/dsp-open");
    const offer = alex.getByRole("region", { name: "Settlement proposal" });
    await expect(offer).toContainText("Juan Dela Cruz proposed a settlement");
    await offer.getByRole("button", { name: "Accept" }).click();
    await alex.getByRole("dialog", { name: "Accept this settlement?" }).getByRole("button", { name: "Accept settlement" }).click();
    await expect(alex.getByText("Settled by agreement · $400.00 back to Nairobi Solutions Inc. · $400.00 to Juan Dela Cruz")).toBeVisible();

    expect(await savedDispute(alex, "dsp-open")).toMatchObject({ status: "Resolved", resolution: { kind: "agreement", split: { refund: 400, release: 400 } } });
    expect(await savedEscrow(alex)).toEqual({ released: 400, refunded: 400 });
    // Juan's page closed too, and both halves are in the payments on the case.
    await expect(page.getByText(/Settled by agreement/)).toBeVisible();
    await expect(page.getByRole("complementary").getByText("Released · Dispute · Missed Deadline")).toBeVisible();
  });
});

test.describe("support's moves", () => {
  test.use({ seedOptions: { ...OVER, disputes: [ANSWERED] } });

  test("support asks one side, gives them more time, then rules", async ({ page, secondPage }) => {
    await page.goto("/admin/disputes/dsp-open");
    await expect(page.getByText(/Your turn to review/)).toBeVisible();

    await page.getByRole("button", { name: "Ask a party" }).click();
    const ask = page.getByRole("dialog", { name: "Ask a party for more" });
    await ask.getByRole("button", { name: "Ask", exact: true }).click();
    await page.getByRole("option", { name: "Juan Dela Cruz (independent)" }).click();
    await ask.getByRole("textbox", { name: "What do you need?" }).fill("Send the message where the brief changed.");
    await ask.getByRole("button", { name: "Send question" }).click();
    await expect(toast(page, "Asked Juan Dela Cruz — they have 5 days to answer")).toBeVisible();
    await expect(page.getByText(/Waiting on Juan Dela Cruz to answer Hireable support/)).toBeVisible();
    expect(await savedDispute(page, "dsp-open")).toMatchObject({ turn: { who: "independent", why: "asked", due: T + 5 * DAY } });

    // On Juan's side it's his turn, with the question in front of him.
    const juan = await secondPage();
    await juan.goto("/independent/wallet/disputes/dsp-open");
    await expect(juan.getByText(/Hireable support asked: “Send the message where the brief changed\.”/)).toBeVisible();

    await page.getByRole("button", { name: "Extend deadline" }).click();
    await page.getByRole("dialog", { name: "Extend the deadline" }).getByRole("button", { name: "Extend deadline" }).click();
    await expect.poll(async () => ((await savedDispute(page, "dsp-open"))?.turn as { due?: number } | undefined)?.due).toBe(T + 7 * DAY);
    expect((await notes(page, "independent"))[0].title).toBe("You have more time to respond");

    await page.getByRole("button", { name: "Resolve" }).click();
    const resolve = page.getByRole("dialog", { name: "Resolve this dispute" });
    await resolve.getByRole("button", { name: "Rule in favor of" }).click();
    await page.getByRole("option", { name: "Nairobi Solutions Inc. (team builder)" }).click();
    await resolve.getByRole("textbox", { name: "Resolution notes" }).fill("The task log shows the drafts were late against the agreed dates.");
    await resolve.getByRole("button", { name: "Resolve dispute" }).click();
    await expect(page.getByText(/Resolved in favor of Nairobi Solutions Inc\. · \$800\.00 refunded/)).toBeVisible();
    expect(await savedEscrow(page)).toEqual({ released: 0, refunded: 800 });
    await expect(juan.getByText(/Resolved in favor of Nairobi Solutions Inc\./)).toBeVisible();
  });
});

// When filing opens (TB-073 / TB-118 / IN-059 / IN-076): once the trial ends, and for as long as the
// contract runs — never before its first day, while the trial runs, or after it has ended.

/** Every copy of a button on the page (header, card) is there, and disabled. */
async function allDisabled(buttons: import("@playwright/test").Locator) {
  await expect(buttons.first()).toBeVisible();
  for (const button of await buttons.all()) await expect(button).toBeDisabled();
}

/** …then hired full-time, from `start`. */
const HIRED = (start: string, contract: Record<string, unknown> = {}) => ({
  contract: { ...EVALUATED, ...contract },
  deal: { conversion: { type: "full-time", salary: "$4,000", start, benefits: [], status: "accepted", sent: "22 Sep 2026", accepted: "22 Sep 2026" } },
});

test.describe("while the trial runs", () => {
  test("neither side can file yet, and both are told the day it opens", async ({ page, secondPage }) => {
    await page.goto(`${PATH.team}?tab=contract`);
    await allDisabled(page.getByRole("button", { name: "File a Dispute" }));
    await expect(page.getByText("No disputes. Available once the trial ends on 30 Oct 2026; until then, raise anything with Juan in Messages.")).toBeVisible();

    const juan = await secondPage();
    await juan.goto(`${PATH.independent}?tab=contract`);
    await allDisabled(juan.getByRole("button", { name: "File a dispute" }));
    await expect(juan.getByText("Available once the trial ends on 30 Oct 2026. Until then, raise anything unexpected with Alex in Messages.")).toBeVisible();
  });
});

test.describe("hired, but the role hasn't started", () => {
  test.use({ seedOptions: HIRED("2026-09-28") });

  test("filing waits for its first day — there's no pay yet to dispute", async ({ page, secondPage }) => {
    await page.goto(`${PATH.team}?tab=contract`);
    await allDisabled(page.getByRole("button", { name: "File a Dispute" }));
    await expect(page.getByText("No disputes. Filing opens on 28 Sep 2026, the contract's first day; until then, raise anything with Juan in Messages.")).toBeVisible();

    const juan = await secondPage();
    await juan.goto(`${PATH.independent}?tab=contract`);
    await allDisabled(juan.getByRole("button", { name: "File a dispute" }));
  });
});

test.describe("a role that's running", () => {
  test.use({ seedOptions: HIRED("2026-09-21") });

  test("either side can file about the pay, and it's saved — the trial's paid-out escrow doesn't refuse it", async ({ page }) => {
    await page.goto(`${PATH.team}?tab=contract`);
    await page.getByRole("button", { name: "File a Dispute" }).first().click();
    const form = page.getByRole("dialog", { name: /File a dispute about Juan Dela Cruz/ });
    await form.getByRole("button", { name: "Reason" }).click();
    await page.getByRole("option", { name: "Missed Deadline" }).click();
    await form.getByRole("textbox", { name: "What happened?" }).fill("September's reports never arrived.");
    await form.getByRole("textbox", { name: /Amount in question/ }).fill("500");
    await form.getByRole("button", { name: "File dispute" }).click();

    await expect(page).toHaveURL(/\/team\/payments\/disputes\/dsp-/);
    const id = page.url().split("/").pop() as string;
    expect(await savedDispute(page, id)).toMatchObject({ status: "Pending", amount: 500, type: "full-time" });
  });
});

test.describe("a role that has ended", () => {
  test.use({ seedOptions: HIRED("2026-09-01", { ended: true, endedOn: "24 Sep 2026" }) });

  test("it can't be disputed any more, on either side", async ({ page, secondPage }) => {
    await page.goto(`${PATH.team}?tab=contract`);
    await allDisabled(page.getByRole("button", { name: "File a Dispute" }));
    await expect(page.getByText("No disputes. This contract has ended, so it can't be disputed any more.")).toBeVisible();

    const juan = await secondPage();
    await juan.goto(`${PATH.independent}?tab=contract`);
    await allDisabled(juan.getByRole("button", { name: "File a dispute" }));
    await expect(juan.getByText("This contract has ended, so it can't be disputed any more.")).toBeVisible();
  });
});

test.describe("a trial dispute still open when the trial converts", () => {
  // The evaluation paid out all but the $800 the dispute holds; then Juan was hired full-time.
  test.use({
    seedOptions: {
      contract: { ...EVALUATED, escrow: { released: 800, refunded: 0 } },
      deal: HIRED("2026-09-21").deal,
      disputes: [{ ...ANSWERED, contract: "deal:brand-designer:2026-08-10", facts: { ...ANSWERED.facts, started: "10 Aug 2026", ends: "18 Sep 2026" } }],
    },
  });

  test("its ruling still moves the trial's escrow — nothing is left held for good", async ({ page, secondPage }) => {
    // Held since the trial began, not since the role did.
    await page.goto(`${PATH.team}?tab=contract`);
    await expect(page.getByText("$800.00 held since 10 Aug 2026 · $800.00 on hold for a dispute").first()).toBeVisible();

    const juan = await secondPage();
    await juan.goto("/independent/wallet/disputes/dsp-open");
    await juan.getByRole("button", { name: "Propose a settlement" }).click();
    await juan.getByRole("button", { name: "Half each" }).click();
    await juan.getByRole("button", { name: "Send proposal" }).click();
    await page.goto("/team/payments/disputes/dsp-open");
    await page.getByRole("region", { name: "Settlement proposal" }).getByRole("button", { name: "Accept" }).click();
    await page.getByRole("dialog", { name: "Accept this settlement?" }).getByRole("button", { name: "Accept settlement" }).click();
    await expect(page.getByText(/Settled by agreement/)).toBeVisible();

    // The last $800 left escrow: $400 each way.
    expect(await savedEscrow(page)).toEqual({ released: 1200, refunded: 400 });
    await page.goto(`${PATH.team}?tab=contract`);
    await expect(page.getByText(/held since/)).toHaveCount(0);
  });
});
