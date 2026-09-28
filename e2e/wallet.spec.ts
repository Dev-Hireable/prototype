import type { Locator, Page } from "@playwright/test";
import { expect, NOW, test, toast } from "./fixtures";

// The talent's money screens. Earnings (/independent/wallet): the balances added up from the ledger,
// the ledger's search, filters, pager and View, withdrawing to the default method, and the note about
// disputes. The payout methods, on Earnings and in Settings (/independent/settings/payout): made the
// default, removed, and added through the shared add-payout dialog — pending verification, which keeps a
// new method from being the default. Today is Fri 25 Sep 2026; the live trial holds $1,600 in escrow.

const DAY = 86_400_000;
const T = NOW.getTime();
const SETTINGS = "/independent/settings/payout";

/* ------------------------------------------------------------------ seeds */

/** The methods the app starts with (src/lib/independent/data.ts): Maya the default, GCash and a BPI account, all verified. */
const MAYA = { id: "maya", brand: "Maya", last4: "4471", holder: "Juan Dela Cruz", verified: "Verified 8 Sep 2026", detail: "E-wallet", isDefault: true };
const GCASH = { id: "gcash", brand: "GCash", last4: "9023", holder: "Juan Dela Cruz", verified: "Verified 2 Jun 2026", detail: "GCash · 0917 555 0142", isDefault: false };
const BPI = { id: "bpi", brand: "Bank", last4: "3391", holder: "Juan Dela Cruz", verified: "Verified 12 Jan 2026", detail: "InstaPay / PESONet", isDefault: false };
/** A second Maya number, added but not verified yet. */
const PENDING = { id: "maya-2", brand: "Maya", last4: "7777", holder: "Juan Dela Cruz", verified: "Verification pending", detail: "E-wallet", isDefault: false };
/** The three, and the unverified one. */
const PAYOUTS = { stores: { "ind.payouts": [MAYA, GCASH, BPI, PENDING] } };

const OPS = { contract: "ops-assistant", title: "Ops Assistant", company: "Lumen Retail" };
const SDR = { contract: "sales-rep", title: "Sales Development Rep", company: "Kestrel Labs" };
/** A payment on a past contract as the paying side records it in the shared store: released to Juan, or refunded to the company. */
const paid = (c: typeof OPS, date: string, at: number, amount: string, kind: "released" | "refunded" = "released") => ({ id: `pay-${at}`, ...c, amount, period: "Monthly pay", date, at, kind });
/** A payout Juan made, as the wallet saves a withdrawal. */
const payout = (date: string, at: number, to: string, amount: string) => ({ date, at, desc: `Payout to ${to}`, party: "—", type: "Payout", amount, status: { label: "Paid", tone: "ok" } });

/**
 * Ten ledger rows over two past contracts: $3,700 released in seven payments, $300 refunded to Lumen
 * Retail, and $1,500 paid out in two payouts, which cover the four oldest releases. $2,200 is left.
 */
const LEDGER = {
  live: {
    payments: [
      paid(SDR, "18 Sep 2026", 20260918, "$800.00"),
      paid(OPS, "05 Sep 2026", 20260905, "$1,200.00"),
      paid(OPS, "15 Aug 2026", 20260815, "$400.00"),
      paid(OPS, "10 Aug 2026", 20260810, "$300.00", "refunded"),
      paid(SDR, "01 Aug 2026", 20260801, "$600.00"),
      paid(OPS, "15 Jul 2026", 20260715, "$300.00"),
      paid(OPS, "01 Jul 2026", 20260701, "$250.00"),
      paid(OPS, "15 Jun 2026", 20260615, "$150.00"),
    ],
  },
  "ind.withdrawals": [payout("06 Sep 2026", 20260906, "Maya ····4471", "−$500.00"), payout("20 Jul 2026", 20260720, "GCash ····9023", "−$1,000.00")],
};

/** A dispute the company filed on the live trial, answered, and now with Hireable support. */
const UNDER_REVIEW = {
  id: "dsp-open",
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
  turn: { who: "support", since: T - 2 * DAY },
  facts: { started: "21 Sep 2026", ends: "24 Sep 2026", trialEnded: true, evaluation: false, tasksDone: 1, tasksTotal: 7, escrowHeld: 1600, escrowFunded: 1600 },
  entries: [
    { id: "filed-a", at: T - 6 * DAY, by: "team", kind: "filed", text: "The logo drafts came two weeks late." },
    { id: "response-b", at: T - 2 * DAY, by: "independent", kind: "response", text: "The brief changed on the 22nd." },
  ],
  proposals: [],
  updated: T - 2 * DAY,
};
/** One closed months ago: no breach found. */
const CLOSED = { ...UNDER_REVIEW, id: "dsp-closed", status: "Resolved", turn: undefined, resolution: { kind: "rejected", notes: "No breach found.", at: T - 40 * DAY }, updated: T - 40 * DAY };

/* ---------------------------------------------------------------- helpers */

type SavedMethod = { id: string; brand: string; last4: string; holder: string; verified: string; detail: string; isDefault: boolean };

/** The payout methods as saved (null until the first change: the app's own three until then). */
const savedPayouts = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("hireable.demo.ind.payouts") ?? "null") as SavedMethod[] | null);

/** The ids of the saved methods marked as the default. */
const savedDefaults = async (page: Page) => ((await savedPayouts(page)) ?? []).filter((m) => m.isDefault).map((m) => m.id);

/** The withdrawals as saved, newest first. */
const savedWithdrawals = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("hireable.demo.ind.withdrawals") ?? "[]") as Record<string, unknown>[]);

/** A balance card's lines — its figure, its label and the line under it — found by the label. */
const balance = (page: Page, label: string) => page.getByText(label, { exact: true }).locator("..").getByRole("paragraph");

/** Opens Earnings and waits for what's saved: the live trial's escrow shows only once the page has read storage. */
async function openWallet(page: Page) {
  await page.goto("/independent/wallet");
  await expect(balance(page, "Held in escrow")).toHaveText(["$1,600.00", "Held in escrow", "1 trial funded and not yet released"]);
}

/** The ledger rows on the page: one View button each. */
const rows = (page: Page) => page.getByRole("button", { name: "View", exact: true });

/** The line under the filters while one is on: "Showing N of M", a chip for each filter, and Clear filters. */
const activeFilters = (page: Page) => page.getByText(/^Showing \d+ of \d+ transactions?$/).locator("..");

/** Opens the filter that shows `current` and picks `option`: the filter shows it, with the focus back on it. */
async function pick(page: Page, current: string, option: string) {
  await page.getByRole("button", { name: current, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
  await expect(page.getByRole("button", { name: option, exact: true })).toBeFocused();
}

/** A line of the transaction dialog, by its label. */
const detail = (dialog: Locator, label: string) => dialog.getByText(label, { exact: true }).locator("..");

/** A payout card on Earnings, by its last four digits: the innermost block holding its number and a ⋮ button. */
const payoutCard = (page: Page, last4: string) =>
  page
    .locator("div")
    .filter({ hasText: `•••• •••• ${last4}` })
    .filter({ has: page.getByRole("button", { name: "Payout method actions" }) })
    .last();

/** Opens a payout card's ⋮ menu. */
async function cardMenu(page: Page, last4: string) {
  await payoutCard(page, last4).getByRole("button", { name: "Payout method actions" }).click();
  await expect(page.getByRole("menu")).toBeVisible();
}

/** Picks Remove from a payout card's ⋮ menu. */
async function removeFromMenu(page: Page, last4: string) {
  await cardMenu(page, last4);
  await page.getByRole("menuitem", { name: "Remove" }).click();
}

/** The add-payout dialog, on either page. */
const addDialog = (page: Page) => page.getByRole("dialog", { name: "Add a payout method" });

/** One of the add dialog's pickers, by its label. */
const picker = (page: Page, label: "Payout type" | "Bank") => addDialog(page).getByRole("button", { name: label, exact: true });

/**
 * Picks `option` in one of the add dialog's pickers. The picker takes the focus back a frame after the
 * pick, so wait for that — typing straight after would lose the keys to it.
 */
async function choose(page: Page, label: "Payout type" | "Bank", option: string) {
  await picker(page, label).click();
  await page.getByRole("option", { name: option, exact: true }).click();
  await expect(picker(page, label)).toBeFocused();
}

/** Adds a method through the open add-payout dialog — a bank account, or a GCash or Maya number — unticking the default unless `asDefault`. */
async function addMethod(page: Page, type: "Bank" | "GCash" | "Maya", number: string, { bank, asDefault = false }: { bank?: string; asDefault?: boolean } = {}) {
  const d = addDialog(page);
  if (type !== "Bank") await choose(page, "Payout type", type);
  if (bank) await choose(page, "Bank", bank);
  await d.getByRole("textbox", { name: type === "Bank" ? "Account number" : "Mobile number" }).fill(number);
  const tick = d.getByRole("checkbox", { name: "Set as default payout method" });
  if (!asDefault) await tick.click();
  await expect(tick).toBeChecked({ checked: asDefault });
  await d.getByRole("button", { name: "Add payout method" }).click();
  await expect(d).toBeHidden();
}

/** A method's row in payout settings, by its title: the innermost block holding it and a Remove button. */
const methodRow = (page: Page, title: string) =>
  page
    .locator("div")
    .filter({ hasText: title })
    .filter({ has: page.getByRole("button", { name: "Remove" }) })
    .last();

/** Opens payout settings with PAYOUTS saved, and waits for the fourth method — there only once the page has read storage. */
async function openSettings(page: Page) {
  await page.goto(SETTINGS);
  await expect(methodRow(page, "Maya · ····7777")).toBeVisible();
}

/* ------------------------------------------------------------------ wallet */

test.describe("wallet · balances", () => {
  test.use({ seedOptions: { stores: LEDGER } });

  test("the balances add up from the ledger and the trial's escrow, and payouts mark the oldest payments paid out", async ({ page }) => {
    // Held in escrow, the live trial's $1,600, is what openWallet waits for.
    await openWallet(page);
    await expect(balance(page, "Received, all time")).toHaveText(["$3,700.00", "Received, all time", "7 payments received from 2 contracts"]);
    await expect(balance(page, "Available to withdraw")).toHaveText(["$2,200.00", "Available to withdraw", "released and not yet withdrawn"]);
    await expect(balance(page, "Withdrawn to payout method")).toHaveText(["$1,500.00", "Withdrawn to payout method", "2 payouts so far"]);
    await expect(page.getByRole("button", { name: "Withdraw $2,200.00" })).toBeEnabled();
    // The $1,500 paid out covers 15 Jun – 1 Aug; on this page that's 1 Aug and 15 Jul, and the three newer are still to withdraw.
    await expect(page.getByText("Paid out", { exact: true })).toHaveCount(2);
    await expect(page.getByText("Available", { exact: true })).toHaveCount(3);
    // The refund went back to the company: a row, but none of the balance.
    await expect(page.getByText("Refunded", { exact: true })).toHaveCount(1);
    // No disputes on file, so no note about them.
    await expect(page.getByRole("link", { name: "View disputes" })).toHaveCount(0);
  });
});

test.describe("wallet · the ledger", () => {
  test.use({ seedOptions: { stores: LEDGER } });

  test("search and filters narrow the rows, each named in a chip beside the count, and Clear filters brings every row back", async ({ page }) => {
    await openWallet(page);
    const search = page.getByPlaceholder("Search by contract or company");
    await search.fill("Kestrel");
    await expect(page.getByText("Showing 2 of 10 transactions", { exact: true })).toBeVisible();
    await expect(activeFilters(page).getByText("Search: Kestrel", { exact: true })).toBeVisible();
    await expect(rows(page)).toHaveCount(2);
    await activeFilters(page).getByRole("button", { name: "Clear filters" }).click();
    await expect(search).toHaveValue("");
    await expect(activeFilters(page)).toHaveCount(0);

    // The contract and the type combine, down to nothing: the empty state has its own Clear filters.
    await pick(page, "All contracts", "Ops Assistant");
    await expect(page.getByText("Showing 6 of 10 transactions", { exact: true })).toBeVisible();
    await pick(page, "All types", "Withdrawal");
    await expect(page.getByText("Showing 0 of 10 transactions", { exact: true })).toBeVisible();
    for (const chip of ["Ops Assistant", "Withdrawal"]) await expect(activeFilters(page).getByText(chip, { exact: true })).toBeVisible();
    const empty = page.getByText("No transactions match", { exact: true }).locator("..");
    await expect(empty).toContainText("Try a different contract, type or date range.");
    await empty.getByRole("button", { name: "Clear filters" }).click();
    for (const reset of ["All contracts", "All types", "All time"]) await expect(page.getByRole("button", { name: reset, exact: true })).toBeVisible();
    await expect(rows(page)).toHaveCount(8);
  });

  test("the rows come eight to a page, and a new filter starts again from the first", async ({ page }) => {
    await openWallet(page);
    const next = page.getByRole("button", { name: "Next", exact: true });
    await expect(rows(page)).toHaveCount(8);
    await expect(page.getByText("Page 1 of 2", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Previous", exact: true })).toBeDisabled();
    await next.click();
    await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
    await expect(rows(page)).toHaveCount(2);
    await expect(page.getByText("15 Jun 2026", { exact: true })).toBeVisible();
    await expect(next).toBeDisabled();
    // Ninety days back from the newest row leaves nine: still two pages, and it's back on the first.
    await pick(page, "All time", "Last 90 days");
    await expect(page.getByText("Showing 9 of 10 transactions", { exact: true })).toBeVisible();
    await expect(page.getByText("Page 1 of 2", { exact: true })).toBeVisible();
    await expect(rows(page)).toHaveCount(8);
  });
});

test.describe("wallet · a transaction", () => {
  test.use({ seedOptions: { stores: LEDGER } });

  test("View opens the row's transaction, with its receipt to download", async ({ page }) => {
    await openWallet(page);
    await rows(page).first().click();
    const d = page.getByRole("dialog", { name: "Transaction" });
    await expect(d.getByText("18 Sep 2026 · Payment Received", { exact: true })).toBeVisible();
    const lines = { Contract: "Sales Development Rep", Company: "Kestrel Labs", Amount: "+$800.00", Status: "Available", Reference: "Payment released · Sales Development Rep" };
    for (const [label, value] of Object.entries(lines)) await expect(detail(d, label)).toContainText(value);
    await d.getByRole("button", { name: "Download receipt" }).click();
    await expect(toast(page, "Receipt downloaded")).toBeVisible();
    await d.getByRole("button", { name: "Close" }).click();
    await expect(d).toBeHidden();
  });
});

test.describe("wallet · withdrawing", () => {
  test.use({ seedOptions: { stores: LEDGER } });

  test("the withdraw dialog names the default method and pays it out", async ({ page }) => {
    await openWallet(page);
    const withdraw = page.getByRole("button", { name: "Withdraw $2,200.00" });
    const d = page.getByRole("dialog", { name: "Withdraw $2,200.00?" });
    await withdraw.click();
    await expect(d).toContainText("Sent to your default method (Maya ····4471). Usually lands within one working day.");
    await d.getByRole("button", { name: "Cancel" }).click();
    await expect(d).toBeHidden();
    expect(await savedWithdrawals(page)).toHaveLength(2);

    await withdraw.click();
    await d.getByRole("button", { name: "Withdraw", exact: true }).click();
    await expect(toast(page, "$2,200.00 on its way")).toBeVisible();
    expect((await savedWithdrawals(page))[0]).toMatchObject({ date: "25 Sep 2026", at: 20260925, desc: "Payout to Maya ····4471", type: "Payout", amount: "−$2,200.00", status: { label: "Paid" } });
    // Nothing left to withdraw, and every payment received is now paid out.
    await expect(page.getByRole("button", { name: "Withdraw $0.00" })).toBeDisabled();
    await expect(balance(page, "Available to withdraw")).toHaveText(["$0.00", "Available to withdraw", "withdrawn already"]);
    await expect(balance(page, "Withdrawn to payout method")).toHaveText(["$3,700.00", "Withdrawn to payout method", "3 payouts so far"]);
    await expect(page.getByText("Available", { exact: true })).toHaveCount(0);
    await rows(page).first().click();
    await expect(page.getByRole("dialog", { name: "Transaction" }).getByText("25 Sep 2026 · Withdrawal", { exact: true })).toBeVisible();
  });
});

test.describe("wallet · the default method", () => {
  test.use({ seedOptions: { stores: LEDGER } });

  test("⋮ Set as default is off for the default method, and moves the default — and the next withdrawal — to another", async ({ page }) => {
    await openWallet(page);
    await expect(payoutCard(page, "4471")).toContainText("DEFAULT");
    await cardMenu(page, "4471");
    await expect(page.getByRole("menuitem", { name: "Set as default" })).toBeDisabled();
    await expect(page.getByRole("menuitem", { name: "Remove" })).toBeEnabled();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();

    await cardMenu(page, "9023");
    await page.getByRole("menuitem", { name: "Set as default" }).click();
    await expect(toast(page, "GCash ····9023 is now your default")).toBeVisible();
    await expect(page.getByRole("menu")).toBeHidden();
    await expect(payoutCard(page, "9023")).toContainText("DEFAULT");
    await expect(payoutCard(page, "4471")).not.toContainText("DEFAULT");
    expect(await savedDefaults(page)).toEqual(["gcash"]);
    await page.getByRole("button", { name: "Withdraw $2,200.00" }).click();
    await expect(page.getByRole("dialog", { name: "Withdraw $2,200.00?" })).toContainText("Sent to your default method (GCash ····9023).");
  });
});

test.describe("wallet · removing a method", () => {
  test("⋮ Remove words the default's removal differently from another method's, and takes the method off", async ({ page }) => {
    await openWallet(page);
    const bank = page.getByRole("dialog", { name: "Remove Bank ····3391?" });
    await removeFromMenu(page, "3391");
    await expect(bank).toContainText("Payouts already scheduled to this method complete; nothing new is sent here.");
    await bank.getByRole("button", { name: "Cancel" }).click();
    await expect(bank).toBeHidden();

    const maya = page.getByRole("dialog", { name: "Remove Maya ····4471?" });
    await removeFromMenu(page, "4471");
    await expect(maya).toContainText("This is your default method. Your next payout goes to GCash ····9023 instead.");
    await maya.getByRole("button", { name: "Close" }).click();
    await expect(maya).toBeHidden();

    await removeFromMenu(page, "3391");
    await bank.getByRole("button", { name: "Remove", exact: true }).click();
    await expect(toast(page, "Payout method removed")).toBeVisible();
    await expect(page.getByRole("button", { name: "Payout method actions" })).toHaveCount(2);
    expect((await savedPayouts(page))?.map((m) => m.id)).toEqual(["maya", "gcash"]);
  });
});

test.describe("wallet · removing the default method", () => {
  test.use({ seedOptions: { stores: { ...LEDGER, "ind.payouts": [MAYA, GCASH] } } });

  test("removing the default hands the default to the method that remains", async ({ page }) => {
    await openWallet(page);
    await removeFromMenu(page, "4471");
    await page.getByRole("dialog", { name: "Remove Maya ····4471?" }).getByRole("button", { name: "Remove", exact: true }).click();
    await expect(toast(page, "Payout method removed")).toBeVisible();
    await expect(payoutCard(page, "9023")).toContainText("DEFAULT");
    expect(await savedDefaults(page)).toEqual(["gcash"]);
    await page.getByRole("button", { name: "Withdraw $2,200.00" }).click();
    await expect(page.getByRole("dialog", { name: "Withdraw $2,200.00?" })).toContainText("Sent to your default method (GCash ····9023).");
  });
});

test.describe("wallet · removing the default with no other verified", () => {
  test.use({ seedOptions: { stores: { ...LEDGER, "ind.payouts": [MAYA, PENDING] } } });

  test("the dialog says withdrawing waits, and no method pending verification becomes the default", async ({ page }) => {
    await openWallet(page);
    await removeFromMenu(page, "4471");
    const maya = page.getByRole("dialog", { name: "Remove Maya ····4471?" });
    await expect(maya).toContainText("This is your default method, and no other is verified yet: withdrawing waits until one is.");
    await maya.getByRole("button", { name: "Remove", exact: true }).click();
    await expect(toast(page, "Payout method removed")).toBeVisible();
    expect(await savedDefaults(page)).toEqual([]);
    await expect(page.getByRole("button", { name: "Withdraw $2,200.00" })).toBeDisabled();
  });
});

test.describe("wallet · adding a method", () => {
  test("the dialog asks for a bank and an account number, or a mobile number for GCash and Maya, and Add waits for the number", async ({ page }) => {
    await openWallet(page);
    await page.getByRole("button", { name: "Add payout method", exact: true }).click();
    const d = addDialog(page);
    const add = d.getByRole("button", { name: "Add payout method" });
    const account = d.getByRole("textbox", { name: "Account number" });
    await expect(picker(page, "Payout type")).toHaveText("Bank transfer (InstaPay / PESONet)");
    await expect(picker(page, "Bank")).toHaveText("BPI");
    await expect(d.getByRole("textbox", { name: "Account name" })).toHaveValue("Juan Dela Cruz");
    await expect(account).toHaveAttribute("placeholder", "0000 0000 0000");
    await expect(d.getByRole("checkbox", { name: "Set as default payout method" })).toBeChecked();
    await expect(add).toBeDisabled();
    await account.fill("12 3");
    await expect(add).toBeDisabled();
    await account.fill("1234 5678 9012");
    await expect(add).toBeEnabled();

    for (const wallet of ["GCash", "Maya"]) {
      await choose(page, "Payout type", wallet);
      await expect(picker(page, "Bank")).toHaveCount(0);
      await expect(d.getByRole("textbox", { name: "Mobile number" })).toHaveAttribute("placeholder", "0917 000 0000");
    }
    await d.getByRole("button", { name: "Cancel" }).click();
    await expect(d).toBeHidden();
    await expect(page.getByRole("button", { name: "Payout method actions" })).toHaveCount(3);
  });

  test("a new method is saved pending verification, and its card says so — it can't be the default yet", async ({ page }) => {
    await openWallet(page);
    await page.getByRole("button", { name: "Add payout method Bank · GCash · Maya" }).click();
    await addMethod(page, "GCash", "0917 555 1234");
    await expect(toast(page, /^GCash ····1234 added$/)).toBeVisible();
    const added = (await savedPayouts(page))?.at(-1);
    expect(added).toMatchObject({ brand: "GCash", last4: "1234", holder: "Juan Dela Cruz", verified: "Verification pending", detail: "GCash · 0917 555 1234", isDefault: false });
    expect(added?.id).toMatch(/^pm-\d+$/);
    await expect(payoutCard(page, "1234")).toContainText("Verification pending");
    await cardMenu(page, "1234");
    await expect(page.getByRole("menuitem", { name: "Set as default" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(payoutCard(page, "4471")).toContainText("DEFAULT");
  });
});

test.describe("wallet · adding a method as the default", () => {
  // A method pending verification can't be the default, ticked or not: the old default keeps it.
  test("the add toast only calls the new method the default when it was made the default", async ({ page }) => {
    await openWallet(page);
    await page.getByRole("button", { name: "Add payout method", exact: true }).click();
    await addMethod(page, "GCash", "0917 555 1234", { asDefault: true });
    expect(await savedDefaults(page)).toEqual(["maya"]);
    // The whole message, not "set as default" missing from it: a toast goes by itself after a few seconds.
    await expect(toast(page, /^GCash ····1234 added$/)).toBeVisible();
  });
});

test.describe("wallet · disputes", () => {
  test.use({ seedOptions: { disputes: [UNDER_REVIEW, CLOSED] } });

  test("the note counts the disputes under review, and leads to the disputes page", async ({ page }) => {
    await openWallet(page);
    await expect(page.getByText("1 dispute is under review.")).toBeVisible();
    await page.getByRole("link", { name: "View disputes" }).click();
    await expect(page).toHaveURL(/\/independent\/wallet\/disputes$/);
    await expect(page.getByRole("heading", { name: "Disputes", level: 1 })).toBeVisible();
  });
});

/* --------------------------------------------------------- payout settings */

test.describe("payout settings · the default method", () => {
  test.use({ seedOptions: PAYOUTS });

  test("an unverified method can't be made the default, and the default can't be removed until another takes over", async ({ page }) => {
    await openSettings(page);
    const maya = methodRow(page, "Maya · ····4471");
    const gcash = methodRow(page, "GCash · 0917 555 0142");
    await expect(maya.getByText("Default", { exact: true })).toBeVisible();
    await expect(maya.getByRole("button", { name: "Set as default" })).toHaveCount(0);
    await expect(maya.getByRole("button", { name: "Remove" })).toBeDisabled();
    await expect(methodRow(page, "Maya · ····7777").getByRole("button", { name: "Set as default" })).toBeDisabled();

    await gcash.getByRole("button", { name: "Set as default" }).click();
    await expect(toast(page, "GCash is now your default")).toBeVisible();
    await expect(gcash.getByText("Default", { exact: true })).toBeVisible();
    await expect(gcash.getByRole("button", { name: "Remove" })).toBeDisabled();
    await expect(maya.getByRole("button", { name: "Remove" })).toBeEnabled();
    expect(await savedDefaults(page)).toEqual(["gcash"]);
  });
});

test.describe("payout settings · removing a method", () => {
  test.use({ seedOptions: PAYOUTS });

  test("Remove asks first: Cancel keeps the method, Remove takes it off", async ({ page }) => {
    await openSettings(page);
    const bank = methodRow(page, "BPI · account ending 3391");
    const confirm = page.getByRole("dialog", { name: "Remove Bank?" });
    await bank.getByRole("button", { name: "Remove" }).click();
    await expect(confirm).toContainText("Payouts already scheduled to this method complete; nothing new is sent here.");
    await confirm.getByRole("button", { name: "Cancel" }).click();
    await expect(confirm).toBeHidden();
    await expect(bank).toBeVisible();

    await bank.getByRole("button", { name: "Remove" }).click();
    await confirm.getByRole("button", { name: "Remove", exact: true }).click();
    await expect(toast(page, "Payout method removed")).toBeVisible();
    await expect(bank).toHaveCount(0);
    expect((await savedPayouts(page))?.map((m) => m.id)).toEqual(["maya", "gcash", "maya-2"]);
  });
});

test.describe("payout settings · the only method", () => {
  // Not the default, so only the only-method rule holds its Remove.
  test.use({ seedOptions: { stores: { "ind.payouts": [GCASH] } } });

  test("the only method can't be removed, and adding another — pending verification — frees it", async ({ page }) => {
    await page.goto(SETTINGS);
    const only = page.getByText("You cannot remove your only payout method. Add another one first, then remove this one.");
    await expect(only).toBeVisible();
    const gcash = methodRow(page, "GCash · 0917 555 0142");
    await expect(gcash.getByRole("button", { name: "Remove" })).toBeDisabled();

    await page.getByRole("button", { name: "Add payout method", exact: true }).click();
    await addMethod(page, "Maya", "0918 222 3333");
    await expect(toast(page, /^Maya added$/)).toBeVisible();
    await expect(only).toBeHidden();
    await expect(gcash.getByRole("button", { name: "Remove" })).toBeEnabled();
    await expect(methodRow(page, "Maya · ····3333").getByRole("button", { name: "Set as default" })).toBeDisabled();
    expect((await savedPayouts(page))?.at(-1)).toMatchObject({ brand: "Maya", last4: "3333", verified: "Verification pending", detail: "Maya · 0918 222 3333", isDefault: false });
  });
});

test.describe("payout settings · a new method", () => {
  test.use({ seedOptions: PAYOUTS });

  // Each row goes by its own method: every bank used to read "BPI", and every GCash the seed's number.
  test("a new bank account is listed under its own bank", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("button", { name: "Add payout method", exact: true }).click();
    await addMethod(page, "Bank", "1234 5678 9012", { bank: "BDO" });
    await expect(toast(page, /^Bank added$/)).toBeVisible();
    await expect(methodRow(page, "BDO · account ending 9012")).toBeVisible();
  });
});
