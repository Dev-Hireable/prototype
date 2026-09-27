import type { Page } from "@playwright/test";
import { api, card, closePanel, expect, notes, open, panel, ROLE, savedDeal, savedItem, test, toast } from "./fixtures";

// TB-150 / IN-093 / TB-151 / IN-094 — what the signed offer agreed is locked: its contract tasks and
// terms change only by an amendment the other side accepts, which makes the next version, and the
// contract's history keeps every step. The seed is the Brand Designer trial: #1–#4 are the signed
// offer's tasks (v1), #5–#12 internal work. Today is Fri 25 Sep 2026.

const AGREEMENT = { team: "/team/independents/juan-dela-cruz?tab=agreement", independent: "/independent/contracts/brand-designer?tab=agreement" };
const LOCK = "This task is part of an agreed contract. Changes to its scope require approval from both parties.";

/** Opens the Agreement tab on one side, once the version in force has read in. */
async function agreementTab(page: Page, side: keyof typeof AGREEMENT) {
  await page.goto(AGREEMENT[side]);
  await expect(page.getByText("is in force")).toBeVisible();
}

/** Alex proposes Amendment 1 from the Agreement tab: #4 renamed with more effort, and a new contract task. */
async function proposeFromTab(page: Page) {
  // Propose a change: a rename and more effort on #4, and a task added, with the reason.
  await agreementTab(page, "team");
  await page.getByRole("button", { name: "Propose a change" }).click();
  const builder = page.getByRole("dialog", { name: "Propose a change to the contract" });
  await builder.getByRole("button", { name: "Change Pick a typography pairing", exact: true }).click();
  await builder.getByRole("textbox", { name: "Task name" }).fill("Pick two typography pairings");
  await builder.getByRole("textbox", { name: "Effort" }).fill("5");
  await builder.getByRole("button", { name: "Save change" }).click();
  await builder.getByRole("button", { name: "Add a contract task" }).click();
  await builder.getByRole("textbox", { name: "Task name" }).fill("Social launch kit");
  await builder.getByRole("button", { name: "Add task" }).click();
  await builder.getByRole("button", { name: "Send proposal" }).click();
  await expect(builder.getByRole("alert")).toHaveText("Say why — it's what the other side decides on.");
  await builder.getByRole("textbox", { name: "Why" }).fill("Marketing needs the launch kit in the trial.");
  await expect(builder.getByRole("list", { name: "Proposed changes" })).toContainText("Social launch kit");
  await builder.getByRole("button", { name: "Send proposal" }).click();
  await expect(toast(page, "Change proposed — Juan has been told")).toBeVisible();
}

/** Juan reads the whole v2 before accepting it: the version, what changes, every contract task. */
async function acceptAsJuan(juan: Page) {
  // Juan accepts it, after reading the whole next version.
  await agreementTab(juan, "independent");
  const amendment = juan.getByText("Waiting on you");
  await expect(amendment).toBeVisible();
  await juan.getByRole("button", { name: "Accept…" }).click();
  const confirm = juan.getByRole("dialog", { name: "Accept Amendment 1?" });
  await expect(confirm).toContainText("v1 → v2");
  await expect(confirm).toContainText("It adds 1 task and changes 1 task");
  await expect(confirm).toContainText("None — this is the only open amendment");
  await expect(confirm).toContainText("Social launch kit");
  const accept = confirm.getByRole("button", { name: "Accept and agree to v2" });
  await expect(accept).toBeDisabled();
  await confirm.getByRole("checkbox", { name: "I agree to contract v2 as shown" }).click();
  await accept.click();
  await expect(juan.getByText("In force: contract v2")).toBeVisible();
}

test.describe("agreement · contract tasks are locked", () => {
  test("trying to change a contract task says it's agreed, and offers an amendment instead", async ({ page }) => {
    await open(page, "team", "?task=t-type");
    await panel(page).getByRole("button", { name: /^Name: agreed in the contract/ }).click();
    await expect(panel(page).getByRole("alert")).toContainText(LOCK);
    await panel(page).getByRole("button", { name: "Cancel" }).click();
    await expect(panel(page).getByRole("alert")).toHaveCount(0);
    await panel(page).getByRole("button", { name: /^Due date is agreed in the contract/ }).click();
    await expect(panel(page).getByRole("button", { name: "Propose change" })).toBeVisible();
    await panel(page).getByRole("button", { name: "Item actions" }).click();
    await page.getByRole("menuitem", { name: "Delete task" }).click();
    await expect(panel(page).getByRole("button", { name: "Propose removing it" })).toBeVisible();
    await panel(page).getByRole("button", { name: "Propose removing it" }).click();
    const builder = page.getByRole("dialog", { name: "Propose a change to the contract" });
    await expect(builder.getByText("To be removed")).toBeVisible();
  });

  test("the rules hold without the screens: a contract task's scope can't be changed or deleted", async ({ page }) => {
    await open(page, "team");
    for (const change of [{ title: "Renamed" }, { due: "2026-10-09" }, { effort: 8 }, { assignee: "team" }]) expect(await api(page, "patch", "t-type", change)).toMatchObject({ ok: false, code: "forbidden", message: LOCK });
    expect(await api(page, "archive", "t-type")).toMatchObject({ ok: false, message: LOCK });
    // Running the work isn't the contract's: priority and tags still change.
    expect(await api(page, "patch", "t-type", { priority: "high" })).toMatchObject({ ok: true });
    expect((await savedItem(page, "t-type")).title).toBe("Pick a typography pairing");
  });

  test("the board tells contract work from internal work, and a contract task's dates don't drag", async ({ page }) => {
    await open(page, "team");
    await expect(card(page, /#4 Pick a typography pairing/)).toContainText("Contract");
    await expect(card(page, /#6 Kickoff call with marketing/)).toContainText("Internal");
    await open(page, "team", "?view=calendar");
    const calendar = page.getByTestId("calendar");
    await expect(calendar.getByRole("button", { name: /#4 Pick a typography pairing/ }).first()).toHaveAttribute("draggable", "false");
    await expect(calendar.getByRole("button", { name: /#10 Fix the icon grid/ })).toHaveAttribute("draggable", "true");
  });
});

test.describe("agreement · an amendment accepted", () => {
  test("Alex proposes, Juan reads the whole v2 and accepts it, and the work changes with it", async ({ page, secondPage }) => {
    test.setTimeout(120_000);
    await proposeFromTab(page);
    await open(page, "team");
    await expect(card(page, /#4 Pick a typography pairing/)).toContainText("Amendment pending");
    const juan = await secondPage();
    await acceptAsJuan(juan);
    const deal = await savedDeal(juan);
    expect(deal.contract.scope.versions.map((v: { version: number }) => v.version)).toEqual([1, 2]);
    expect(await savedItem(juan, "t-type")).toMatchObject({ title: "Pick two typography pairings", effort: 5 });
    const kit = deal.contract.tasks.find((t: { title: string }) => t.title === "Social launch kit");
    expect(kit).toMatchObject({ number: 13, agreed: true, trial: true, assignee: "independent" });
    expect((await notes(juan, "team"))[0]).toMatchObject({ title: "Amendment 1 accepted", href: "/team/independents/juan-dela-cruz?tab=agreement" });
    await expect(juan.getByRole("list", { name: "Contract history" })).toContainText("Amendment 1 accepted — contract v2");
  });
});

/** Juan proposes removing #4 (Amendment 1) from its task's menu on the board, with a reason. */
async function juanProposesRemoval(juan: Page) {
  // From the board: the contract task's menu proposes its removal.
  await open(juan, "independent");
  await card(juan, /#4 Pick a typography pairing/).hover();
  await juan.getByRole("button", { name: "More actions for #4 Pick a typography pairing" }).click();
  await juan.getByRole("menuitem", { name: "Propose removing it…" }).click();
  const builder = juan.getByRole("dialog", { name: "Propose a change to the contract" });
  await builder.getByRole("textbox", { name: "Why" }).fill("The palette covers the type too.");
  await builder.getByRole("button", { name: "Send proposal" }).click();
  await expect(toast(juan, "Change proposed — Alex has been told")).toBeVisible();
}

/** Juan revises Amendment 1 from the Agreement tab: instead of removing #4, a lighter estimate for it. */
async function juanRevisesLighter(juan: Page) {
  // Undo the removal, then change the estimate to 1.
  await juan.getByRole("button", { name: "Revise" }).click();
  const builder = juan.getByRole("dialog", { name: "Revise Amendment 1" });
  await builder.getByRole("button", { name: "Undo the change to Pick a typography pairing" }).click();
  await builder.getByRole("button", { name: "Change Pick a typography pairing", exact: true }).click();
  await builder.getByRole("textbox", { name: "Effort" }).fill("1");
  await builder.getByRole("button", { name: "Save change" }).click();
  await builder.getByRole("button", { name: "Send revision" }).click();
}

test.describe("agreement · sent back, revised, rejected", () => {
  test("Alex sends it back with a note, Juan revises it, and Alex rejects it: the contract stays at v1", async ({ page, secondPage }) => {
    test.setTimeout(120_000);
    const juan = await secondPage();
    await juanProposesRemoval(juan);
    await agreementTab(page, "team");
    await page.getByRole("button", { name: "Ask for changes" }).click();
    await page.getByRole("dialog", { name: "Ask Juan for changes" }).getByRole("textbox").fill("Keep it, but lighter.");
    await page.getByRole("button", { name: "Send back" }).click();
    await agreementTab(juan, "independent");
    await expect(juan.getByText("Alex asked for changes: “Keep it, but lighter.”")).toBeVisible();
    await juanRevisesLighter(juan);
    await agreementTab(page, "team");
    await expect(page.getByText("revision 2")).toBeVisible();
    await page.getByRole("button", { name: "Reject" }).click();
    await page.getByRole("dialog", { name: "Reject Amendment 1?" }).getByRole("textbox").fill("The pairing is agreed as it is.");
    await page.getByRole("button", { name: "Reject amendment" }).click();
    await expect(page.getByText("In force: contract v1")).toBeVisible();
    await expect(page.getByRole("list", { name: "Contract history" })).toContainText("Amendment 1 rejected");
    expect((await savedDeal(page)).contract.scope.amendments[0]).toMatchObject({ status: "rejected", revision: 2 });
  });

  test("a revision sent while the other side reads it can't be accepted unread", async ({ page, secondPage }) => {
    test.setTimeout(120_000);
    const juan = await secondPage();
    await juanProposesRemoval(juan);
    await agreementTab(page, "team");
    await expect(page.getByRole("button", { name: "Accept…" })).toBeEnabled();
    // Juan revises it while Alex has revision 1 open: removal becomes a lighter estimate.
    await agreementTab(juan, "independent");
    await juanRevisesLighter(juan);
    await expect(page.getByText("Juan revised it while you were reading revision 1.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Accept…" })).toBeDisabled();
    await page.getByRole("button", { name: "Read revision 2" }).click();
    await expect(page.getByRole("button", { name: "Accept…" })).toBeEnabled();
    await expect(page.getByRole("list", { name: "Changes in Amendment 1" })).toContainText("Effort");
  });

  test("the proposer can withdraw it: the contract stays as agreed, and another can be proposed", async ({ page, secondPage }) => {
    const juan = await secondPage();
    await juanProposesRemoval(juan);
    await agreementTab(juan, "independent");
    await juan.getByRole("button", { name: "Withdraw" }).click();
    await expect(toast(juan, "Amendment 1 withdrawn")).toBeVisible();
    await agreementTab(page, "team");
    await expect(page.getByRole("button", { name: "Propose a change" })).toBeEnabled();
    await expect(page.getByRole("list", { name: "Contract history" })).toContainText("Amendment 1 withdrawn");
  });
});

/** Alex proposes a new trial rate, $2,000 a month for the trial's one month, and Juan accepts it. */
async function newRateAccepted(page: Page, juan: Page) {
  // Alex proposes the new rate; the builder says what it does to the escrow.
  await agreementTab(page, "team");
  await page.getByRole("button", { name: "Propose a change" }).click();
  const builder = page.getByRole("dialog", { name: "Propose a change to the contract" });
  await builder.getByRole("button", { name: "Change the pay" }).click();
  await builder.getByRole("textbox", { name: "Pay per month" }).fill("2,000");
  await expect(builder.getByText("The escrow goes from $1,600.00 to $2,000.00 when it's accepted", { exact: false })).toBeVisible();
  await builder.getByRole("button", { name: "Save change" }).click();
  await builder.getByRole("textbox", { name: "Why" }).fill("The audit turned out bigger.");
  await builder.getByRole("button", { name: "Send proposal" }).click();
  // Juan accepts it.
  await agreementTab(juan, "independent");
  await juan.getByRole("button", { name: "Accept…" }).click();
  await juan.getByRole("checkbox", { name: "I agree to contract v2 as shown" }).click();
  await juan.getByRole("button", { name: "Accept and agree to v2" }).click();
}

test.describe("agreement · on a trial", () => {
  test("Alex adds an internal task of his own, never one for Juan", async ({ page }) => {
    await open(page, "team");
    await expect(page.getByRole("button", { name: "Add task", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Add internal task" }).click();
    const dialog = page.getByRole("dialog", { name: "Add internal task" });
    await dialog.getByRole("button", { name: "Assignee" }).click();
    await expect(page.getByRole("option")).toHaveText(["Alex", "Unassigned"]);
    await page.keyboard.press("Escape");
    await dialog.getByRole("textbox", { name: "Name" }).fill("Book the kickoff room");
    await dialog.getByRole("button", { name: "Add internal task" }).click();
    await expect(toast(page, "Added the internal task “Book the kickoff room”")).toBeVisible();
    const added = Object.values((await savedDeal(page)).contract.tasks as Record<string, unknown>[]).find((t) => t.title === "Book the kickoff room");
    expect(added).toMatchObject({ assignee: "team", trial: true });
    expect(added).not.toHaveProperty("agreed");
    expect(await api(page, "createInternal", { id: "x1", title: "For Juan", assignee: "independent" })).toMatchObject({ ok: false, code: "forbidden" });
    await closePanel(page).catch(() => {});
  });

  test("a new trial rate re-prices the escrow once it's accepted", async ({ page, secondPage }) => {
    test.setTimeout(120_000);
    const juan = await secondPage();
    await newRateAccepted(page, juan);
    await expect.poll(async () => (await savedDeal(juan)).contract.escrowAdjustments).toEqual([{ version: 2, amount: 400, fee: 40, at: "25 Sep 2026" }]);
    expect((await savedDeal(juan)).contract.rate).toBe("$2,000.00/mo");
    expect((await notes(juan, "team")).map((n) => n.title)).toContain("Escrow re-priced");
  });
});

test.describe("agreement · on a role", () => {
  test.use({ seedOptions: ROLE });

  test("contract tasks keep their tag, and the role's everyday work has none", async ({ page }) => {
    await open(page, "team");
    await expect(card(page, /#4 Pick a typography pairing/)).toContainText("Contract");
    const everyday = card(page, /#9 Social media templates/);
    await expect(everyday).toBeVisible();
    await expect(everyday).not.toContainText("Internal");
    await expect(everyday).not.toContainText("Contract");
  });
});

test.describe("agreement · history and a closed contract", () => {
  test("every version opens in full, and an earlier one can be proposed again", async ({ page, secondPage }) => {
    test.setTimeout(120_000);
    await proposeFromTab(page);
    const juan = await secondPage();
    await acceptAsJuan(juan);
    await agreementTab(page, "team");
    await page.getByRole("button", { name: "View v1" }).click();
    const v1 = page.getByRole("dialog", { name: "Contract v1" });
    await expect(v1).toContainText("Pick a typography pairing");
    await expect(v1).not.toContainText("Social launch kit");
    await v1.getByRole("button", { name: "Propose going back to v1" }).click();
    const builder = page.getByRole("dialog", { name: "Propose a change to the contract" });
    await expect(builder.getByRole("list", { name: "Proposed changes" })).toContainText("Social launch kit");
    await expect(builder.getByRole("textbox", { name: "Why" })).toHaveValue("Back to what was agreed in v1.");
  });

  test("an ended contract's agreement is read-only", async ({ page }) => {
    await page.goto("/team/independents/juan-dela-cruz?tab=agreement");
    await expect(page.getByText("is in force")).toBeVisible();
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("hireable.demo.deal") ?? "{}");
      s.deal.contract.ended = true;
      s.deal.contract.endedOn = "25 Sep 2026";
      localStorage.setItem("hireable.demo.deal", JSON.stringify(s));
    });
    await page.reload();
    await expect(page.getByRole("button", { name: "Propose a change" })).toBeDisabled();
    await expect(page.getByText("This contract has ended, so its work is read-only.")).toBeVisible();
  });
});
