import type { Locator, Page } from "@playwright/test";
import { card, expect, notes, NOW, open, savedDispute, savedEscrow, test, toast } from "./fixtures";

// AD-032 – AD-035 — disputes as Hireable support works them: every case on the platform in one list,
// newest first, with support's queue against the SLA, the money held and a New flag on what support
// hasn't opened; and one case with its process check, the way into the contract's work, and
// support's Reject and Release. Asking a side, giving more time and ruling are in disputes.spec.
// Today is Fri 25 Sep 2026.

const DAY = 86_400_000;
const T = NOW.getTime();

/** The trial is over, so disputes on it make sense. */
const OVER = { contract: { ends: "2026-09-24" } };

/** A dispute on the live contract, filed by the company six days ago, as the store keeps it. */
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
    // As filed: four tasks on the log then, none approved yet.
    facts: { started: "21 Sep 2026", ends: "24 Sep 2026", trialEnded: true, evaluation: false, tasksDone: 0, tasksTotal: 4, escrowHeld: 1600, escrowFunded: 1600 },
    entries: [{ id: "filed-a", at: T - 6 * DAY, by: "team", kind: "filed", text: "The logo drafts came two weeks late." }],
    proposals: [],
    updated: T - 6 * DAY,
    ...over,
  };
}

/** Support's queue — none of it opened by support yet. */
const DISPUTES = [
  // Juan answered two days ago; it's with support, six days after filing — past the five-day SLA.
  onFile("dsp-open", {
    turn: { who: "support", since: T - 2 * DAY },
    entries: [
      { id: "filed-a", at: T - 6 * DAY, by: "team", kind: "filed", text: "The logo drafts came two weeks late." },
      { id: "response-b", at: T - 2 * DAY, by: "independent", kind: "response", text: "The brief changed on the 22nd." },
    ],
    updated: T - 2 * DAY,
  }),
  // Filed by Juan yesterday about a full-time role with another company, whose turn it is to respond.
  onFile("dsp-turn", {
    contract: "deal:sales-associate:2026-08-01",
    links: { team: "sales-associate", independent: "sales-associate" },
    title: "Sales Associate",
    type: "full-time",
    rate: "$2,400 /month",
    team: { name: "Owen Price", company: "Brightline Health", slug: "brightline-health" },
    filedBy: "independent",
    at: T - DAY,
    reason: "Missing Deliverable",
    description: "The final pay stub never arrived.",
    amount: 400,
    turn: { who: "team", since: T - DAY, due: T + 4 * DAY, why: "respond" },
    facts: { started: "01 Aug 2026", ends: "Ongoing", trialEnded: false, evaluation: true, tasksDone: 3, tasksTotal: 4, escrowHeld: 0 },
    entries: [{ id: "filed-t", at: T - DAY, by: "independent", kind: "filed", text: "The final pay stub never arrived." }],
    updated: T - DAY,
  }),
  // Ruled for Juan yesterday; the payment waits on support's release.
  onFile("dsp-paid", {
    reason: "No Report Submitted",
    amount: 300,
    at: T - 9 * DAY,
    status: "Resolved",
    resolution: { kind: "ruling", favor: "independent", notes: "The reports were filed on time.", at: T - DAY, payment: "awaiting release" },
    entries: [
      { id: "filed-p", at: T - 9 * DAY, by: "team", kind: "filed", text: "No report came in for the second week." },
      { id: "ruling-p", at: T - DAY, by: "support", name: "Admin Lead", kind: "ruling", to: "independent", text: "The reports were filed on time." },
    ],
    handler: "Admin Lead",
    updated: T - DAY,
  }),
  // Rejected ten days ago: the agreed process was followed.
  onFile("dsp-closed", {
    reason: "Out-of-Scope Output",
    amount: 200,
    at: T - 12 * DAY,
    status: "Rejected",
    resolution: { kind: "rejected", notes: "The agreed process was followed.", at: T - 10 * DAY },
    updated: T - 10 * DAY,
  }),
];

/** The queue on file, the trial over: every describe starts from it but "nothing filed". */
const QUEUE = { seedOptions: { ...OVER, disputes: DISPUTES } };

/* -------------------------------------------------------------- helpers */

/** The list's table of disputes. */
const list = (page: Page) => page.getByRole("table");

/** The case's process check. */
const processCheck = (page: Page) => page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: "Source" }) });

/** A figure over the list, read as its label, value and note: "Past SLA 1 pending longer than 5 days". */
const stat = (page: Page, label: string) => page.getByText(label, { exact: true }).locator("..");
/** Reads a stat's lines as one, the way it's seen. */
const AS_SEEN = { useInnerText: true };

/** The Disputes count in the section rail: disputes with activity support hasn't opened. */
const unread = (page: Page, n: number) => page.getByRole("navigation", { name: "Sections" }).getByLabel(`${n} unread`, { exact: true });

/** Support's moves in the case's header. */
const moves = (page: Page) => page.getByRole("button", { name: /^(Ask a party|Extend deadline|Reject|Resolve|Request payment release)$/ });

/** The list's search box. */
const search = (page: Page) => page.getByPlaceholder("Search by party, contract or reason");
/** One of the list's two filters. */
const filter = (page: Page, name: "Status" | "Reason") => page.getByRole("combobox", { name, exact: true });
/** The line the list shows when the search and filters leave nothing. */
const noMatch = (page: Page) => list(page).getByRole("cell", { name: "No disputes match these filters." });

/** A table's rows, top to bottom, each as the text under the named column headers. */
async function columns(table: Locator, ...headers: string[]) {
  const heads = await table.getByRole("columnheader").allInnerTexts();
  const rows = await table.getByRole("row").filter({ has: table.page().getByRole("cell") }).all();
  return Promise.all(
    rows.map(async (row) => {
      const cells = (await row.getByRole("cell").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
      return headers.map((h) => cells[heads.indexOf(h)]);
    }),
  );
}

/** The disputes the list shows, top to bottom, as their first column reads — with its New flag. */
const names = async (page: Page) => (await columns(list(page), "Dispute")).map(([name]) => name);

/** Opens the list and waits for every dispute on file, read from storage in the browser. */
async function openList(page: Page) {
  await page.goto("/admin/disputes");
  await expect(list(page).getByRole("link")).toHaveCount(DISPUTES.length);
}

/** Opens one case as support; it renders once the disputes have been read from storage. */
async function openCase(page: Page, id: string, title: string) {
  await page.goto(`/admin/disputes/${id}`);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
}

/** Alex files an $800 Missed Deadline dispute from Juan's contract, in his own tab. */
async function alexFiles(alex: Page) {
  await open(alex, "team");
  await alex.getByRole("button", { name: "File a Dispute" }).first().click();
  const form = alex.getByRole("dialog", { name: /File a dispute about Juan Dela Cruz/ });
  await form.getByRole("button", { name: "Reason" }).click();
  await alex.getByRole("option", { name: "Missed Deadline" }).click();
  await form.getByRole("textbox", { name: "What happened?" }).fill("The logo drafts came two weeks late.");
  await form.getByRole("textbox", { name: /Amount in question/ }).fill("800");
  await form.getByRole("button", { name: "File dispute" }).click();
  await expect(alex).toHaveURL(/\/team\/payments\/disputes\/dsp-/);
}

/** Opens Reject and backs out twice — with the × after typing notes, then with Escape — checking it waits for notes. */
async function rejectAndBackOut(page: Page) {
  const opener = page.getByRole("button", { name: "Reject", exact: true });
  const dialog = page.getByRole("dialog", { name: "Reject this dispute?" });
  const why = dialog.getByRole("textbox", { name: "Resolution notes" });
  const confirm = dialog.getByRole("button", { name: "Reject dispute" });
  await opener.click();
  // It waits for notes, and blank ones aren't notes.
  await expect(confirm).toBeDisabled();
  await why.fill("   ");
  await expect(confirm).toBeDisabled();
  await why.fill("The agreed process was followed.");
  await expect(confirm).toBeEnabled();
  // The × closes it, and what was typed goes with it.
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
  await opener.click();
  await expect(why).toHaveValue("");
  await expect(confirm).toBeDisabled();
  // Escape closes it too, handing the focus back to Reject.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
}

/* ---------------------------------------------------------------- the list */

test.describe("admin disputes · the list", () => {
  test.use(QUEUE);

  test("the stats count support's queue against the SLA, what waits on release, and the money held", async ({ page }) => {
    await openList(page);
    await expect(stat(page, "Waiting on support")).toHaveText("Waiting on support 1 of 2 open · SLA 5 days", AS_SEEN);
    // The ruling for Juan is nine days old, but it's closed: only open cases count against the SLA.
    await expect(stat(page, "Past SLA")).toHaveText("Past SLA 1 pending longer than 5 days", AS_SEEN);
    await expect(stat(page, "Awaiting release")).toHaveText("Awaiting release 1 ruled for the independent", AS_SEEN);
    // The two open cases and the ruling awaiting release; the rejected one holds nothing.
    await expect(stat(page, "Held for disputes")).toHaveText("Held for disputes $1,500.00 in escrow, or kept back from pay", AS_SEEN);
  });

  test("rows run newest first, naming both sides, the amount, whose move it is, the age and the status", async ({ page }) => {
    await openList(page);
    // A closed case's age stops the day it closed.
    await expect.poll(() => columns(list(page), "Dispute", "Filed by", "Against", "Amount", "Waiting on", "Age", "Status")).toEqual([
      ["Missing Deliverable · Sales Associate New", "Juan Dela Cruz", "Brightline Health", "$400.00", "Brightline Health · 4 days left", "1 day", "Pending"],
      ["Missed Deadline · Brand Designer New", "Nairobi Solutions Inc.", "Juan Dela Cruz", "$800.00", "Support", "6 days", "Pending"],
      ["No Report Submitted · Brand Designer New", "Nairobi Solutions Inc.", "Juan Dela Cruz", "$300.00", "—", "8 days", "Resolved"],
      ["Out-of-Scope Output · Brand Designer New", "Nairobi Solutions Inc.", "Juan Dela Cruz", "$200.00", "—", "2 days", "Rejected"],
    ]);
  });

  test("a row opens its case, and only that case stops being flagged New", async ({ page }) => {
    await openList(page);
    await expect(unread(page, 4)).toBeVisible();
    await page.getByRole("link", { name: /^Missed Deadline · Brand Designer/ }).click();
    await expect(page).toHaveURL(/\/admin\/disputes\/dsp-open$/);
    await expect(page.getByRole("heading", { level: 1, name: "Missed Deadline · Brand Designer" })).toBeVisible();

    await page.getByRole("link", { name: "Back to all disputes" }).click();
    await expect(page).toHaveURL(/\/admin\/disputes$/);
    await expect.poll(() => names(page)).toEqual(["Missing Deliverable · Sales Associate New", "Missed Deadline · Brand Designer", "No Report Submitted · Brand Designer New", "Out-of-Scope Output · Brand Designer New"]);
    await expect(unread(page, 3)).toBeVisible();
    // Saved: seen up to its latest activity, the others untouched.
    expect(await savedDispute(page, "dsp-open")).toMatchObject({ adminSeen: T - 2 * DAY });
    for (const id of ["dsp-turn", "dsp-paid", "dsp-closed"]) expect((await savedDispute(page, id))?.adminSeen).toBeUndefined();
  });
});

test.describe("admin disputes · search and filters", () => {
  test.use(QUEUE);

  test("the search finds disputes by party, contract or reason, and says when nothing matches", async ({ page }) => {
    await openList(page);
    await search(page).fill("brightline");
    await expect.poll(() => names(page)).toEqual(["Missing Deliverable · Sales Associate New"]);
    // Case and stray spaces don't matter.
    await search(page).fill("  Brand DESIGNER ");
    await expect.poll(() => names(page)).toEqual(["Missed Deadline · Brand Designer New", "No Report Submitted · Brand Designer New", "Out-of-Scope Output · Brand Designer New"]);
    // The contract's type is part of its name.
    await search(page).fill("full-time");
    await expect.poll(() => names(page)).toEqual(["Missing Deliverable · Sales Associate New"]);
    await search(page).fill("out-of-scope");
    await expect.poll(() => names(page)).toEqual(["Out-of-Scope Output · Brand Designer New"]);
    await search(page).fill("refund");
    await expect(noMatch(page)).toBeVisible();
    await expect(list(page).getByRole("link")).toHaveCount(0);
    await search(page).fill("");
    await expect(list(page).getByRole("link")).toHaveCount(DISPUTES.length);
  });

  test("the Status and Reason filters narrow the list, together too, and say when nothing is left", async ({ page }) => {
    await openList(page);
    await expect(filter(page, "Status").getByRole("option")).toHaveText(["All statuses", "Pending", "Resolved", "Rejected", "Withdrawn"]);
    await expect(filter(page, "Reason").getByRole("option")).toHaveText(["All reasons", "Missing Deliverable", "Out-of-Scope Output", "Missed Deadline", "No Report Submitted"]);
    await filter(page, "Status").selectOption("Pending");
    await expect.poll(() => names(page)).toEqual(["Missing Deliverable · Sales Associate New", "Missed Deadline · Brand Designer New"]);
    await filter(page, "Reason").selectOption("Missed Deadline");
    await expect.poll(() => names(page)).toEqual(["Missed Deadline · Brand Designer New"]);
    await filter(page, "Status").selectOption("Rejected");
    await expect(noMatch(page)).toBeVisible();
    await filter(page, "Reason").selectOption("All reasons");
    await expect.poll(() => names(page)).toEqual(["Out-of-Scope Output · Brand Designer New"]);
    await filter(page, "Status").selectOption("Withdrawn");
    await expect(noMatch(page)).toBeVisible();
  });
});

test.describe("admin disputes · nothing filed", () => {
  test.use({ seedOptions: { ...OVER, disputes: [] } });

  test("the list says how disputes arrive, and one filed in the Team Builder's tab lands on it flagged New", async ({ page, secondPage }) => {
    await page.goto("/admin/disputes");
    await expect(list(page).getByRole("cell", { name: "No disputes filed yet. When a Team Builder or an independent files one, it lands here for review." })).toBeVisible();

    await alexFiles(await secondPage());
    // Support's tab moves on its own.
    await expect.poll(() => columns(list(page), "Dispute", "Filed by", "Against", "Waiting on", "Age", "Status")).toEqual([
      ["Missed Deadline · Brand Designer New", "Nairobi Solutions Inc.", "Juan Dela Cruz", "Juan Dela Cruz · 5 days left", "Today", "Pending"],
    ]);
    await expect(unread(page, 1)).toBeVisible();
    await expect(stat(page, "Held for disputes")).toHaveText("Held for disputes $800.00 in escrow, or kept back from pay", AS_SEEN);
  });
});

/* ---------------------------------------------------------------- one case */

test.describe("admin disputes · the process check", () => {
  test.use(QUEUE);

  test("on the live contract it reads the record as it stands: the trial's end, the evaluation, the tasks approved and the escrow", async ({ page }) => {
    await openCase(page, "dsp-open", "Missed Deadline · Brand Designer");
    await expect(page.getByRole("heading", { name: "Process check — Hireable reviews compliance, not work quality" })).toBeVisible();
    await expect(processCheck(page).getByRole("columnheader")).toHaveText(["Check", "Result", "Source"]);
    // Filed with four tasks on the log; the check counts the seven there now, one of them approved.
    await expect.poll(() => columns(processCheck(page), "Check", "Result", "Source")).toEqual([
      ["Trial has ended", "Pass — ended 24 Sep 2026", "contract"],
      ["Evaluation submitted by employer", "Fail — not submitted", "trial dashboard"],
      ["Tasks approved", "1 of 7 approved", "task log"],
      ["Escrow funded at offer", "Pass — $1,600.00 deposited 21 Sep 2026", "payments"],
      ["Amount in question within escrow", "Pass — $800.00 of $1,600.00 held when filed", "payments"],
    ]);
  });

  test("Open the contract's work leads to the contract's task log, whose back link returns to the case", async ({ page }) => {
    await openCase(page, "dsp-open", "Missed Deadline · Brand Designer");
    await page.getByRole("link", { name: "Open the contract's work" }).click();
    await expect(page).toHaveURL(/\/admin\/contracts\/brand-designer\?from=%2Fadmin%2Fdisputes%2Fdsp-open$/);
    await expect(page.getByRole("heading", { level: 1, name: "Brand Designer — Nairobi Solutions Inc. and Juan Dela Cruz" })).toBeVisible();
    await expect(card(page, /Build the colour palette/)).toBeVisible();

    await page.getByRole("link", { name: "Back to dispute" }).click();
    await expect(page).toHaveURL(/\/admin\/disputes\/dsp-open$/);
    await expect(page.getByRole("heading", { level: 1, name: "Missed Deadline · Brand Designer" })).toBeVisible();
  });

  test("on another contract it reads what was filed, and there's no way into that contract's work", async ({ page }) => {
    await openCase(page, "dsp-turn", "Missing Deliverable · Sales Associate");
    await expect.poll(() => columns(processCheck(page), "Check", "Result", "Source")).toEqual([
      ["Full-time contract is active", "Pass — since 01 Aug 2026", "contract"],
      ["Evaluation submitted by employer", "Pass — submitted", "trial dashboard"],
      ["Tasks approved", "3 of 4 approved", "task log"],
    ]);
    await expect(page.getByRole("link", { name: /^Open the contract/ })).toHaveCount(0);
  });
});

test.describe("admin disputes · rejecting", () => {
  test.use(QUEUE);

  test("Reject waits for notes, and the × or Escape closes it without rejecting anything", async ({ page }) => {
    await openCase(page, "dsp-open", "Missed Deadline · Brand Designer");
    await expect(moves(page)).toHaveText(["Ask a party", "Reject", "Resolve"]);
    await rejectAndBackOut(page);
    await expect(moves(page)).toHaveText(["Ask a party", "Reject", "Resolve"]);
    // Nothing happened to the case.
    expect(await savedDispute(page, "dsp-open")).toMatchObject({ status: "Pending", turn: { who: "support" }, updated: T - 2 * DAY });
  });

  test("rejecting with notes closes the case for neither side, lifts the hold and tells both sides", async ({ page }) => {
    const why = "The drafts followed the brief as it changed on the 22nd.";
    await openCase(page, "dsp-open", "Missed Deadline · Brand Designer");
    await page.getByRole("button", { name: "Reject", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Reject this dispute?" });
    await expect(dialog).toContainText("The $800.00 hold on the escrow is lifted and both parties are told.");
    await dialog.getByRole("textbox", { name: "Resolution notes" }).fill(why);
    await dialog.getByRole("button", { name: "Reject dispute" }).click();
    await expect(toast(page, "Dispute rejected — both parties have been notified")).toBeVisible();

    // Closed as rejected, with support's notes, the hold lifted and nothing left for support to do.
    await expect(page.getByRole("status").filter({ hasText: "Rejected — the agreed process was followed" })).toContainText(why);
    await expect(page.getByRole("complementary").getByText("Missed Deadline · The hold was lifted.")).toBeVisible();
    await expect(moves(page)).toHaveCount(0);
    expect(await savedDispute(page, "dsp-open")).toMatchObject({ status: "Rejected", resolution: { kind: "rejected", notes: why, at: T }, handler: "Admin Lead" });
    // No money moves: the escrow keeps the $800 it held.
    expect((await savedEscrow(page)) ?? { released: 0, refunded: 0 }).toEqual({ released: 0, refunded: 0 });
    for (const side of ["team", "independent"] as const) expect((await notes(page, side))[0]).toMatchObject({ title: "Dispute rejected" });
  });
});

test.describe("admin disputes · releasing", () => {
  test.use(QUEUE);

  test("the release names the amount, the escrow and Juan, then pays it out and tells him", async ({ page }) => {
    await openCase(page, "dsp-paid", "No Report Submitted · Brand Designer");
    // Ruled for Juan: releasing is the one move left.
    await expect(page.getByText("Release the payment to pay it out.")).toBeVisible();
    await expect(moves(page)).toHaveText(["Request payment release"]);
    await moves(page).click();
    const dialog = page.getByRole("dialog", { name: "Request payment release?" });
    await expect(dialog).toContainText("$300.00 is released from the Brand Designer escrow to Juan Dela Cruz, and both parties are told.");
    await dialog.getByRole("button", { name: "Release payment" }).click();
    await expect(toast(page, "Payment released to Juan Dela Cruz")).toBeVisible();

    await expect(page.getByText("Resolved in favor of Juan Dela Cruz · $300.00 released to Juan Dela Cruz")).toBeVisible();
    await expect(moves(page)).toHaveCount(0);
    await expect(page.getByRole("complementary").getByText("Released · Dispute · No Report Submitted")).toBeVisible();
    expect(await savedDispute(page, "dsp-paid")).toMatchObject({ status: "Resolved", resolution: { payment: "released", moved: 300 } });
    expect(await savedEscrow(page)).toEqual({ released: 300, refunded: 0 });
    expect((await notes(page, "independent"))[0]).toMatchObject({ title: "Dispute payment released", body: "$300.00 from the Brand Designer dispute has been released to you. It's in your earnings now." });
  });
});
