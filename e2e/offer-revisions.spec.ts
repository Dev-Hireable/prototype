import type { Page } from "@playwright/test";
import { expect, notes, savedDeal, test, toast } from "./fixtures";

// IN-092 / TB-149 / TB-105 / IN-074 — before anything is agreed, the offer is negotiated in
// revisions: Juan asks for changes instead of only accepting or declining, Alex answers each in the
// next revision, and Juan signs the revision he read — which becomes contract v1. Today is Fri 25 Sep 2026.

const OFFER = "/independent/jobs/applications/deal/offer";
const EDITOR = "/team/hire/offers/deal/edit";
const TASKS = [
  { id: "task-1", title: "Audit the brand assets", week: 1, priority: "high" },
  { id: "task-2", title: "Draft two logo directions", week: 2, priority: "medium" },
];
const ROLE = { slug: "brand-designer", title: "Brand Designer", type: "trial", status: "Active", candidates: null, matched: null, interviews: null, offers: null, hired: null, updated: "2026-09-18", description: "Brand work for a B2B agency.", budget: "$1,600.00 - $2,000.00 /mo", duration: "30 Days", experience: "Advanced (5–8 years)", skills: ["Branding"], expectation: "", attachment: "", tasks: [{ title: "Audit the brand assets", week: 1 }], hires: 1 };
const OFFER_OUT = {
  contract: null,
  stage: "offer_received",
  proposal: { version: 1, sent: "20 Sep 2026", rate: "$1,600.00/mo", letter: "Happy to start with the audit." },
  offer: { type: "trial", rate: "$1,600 /month", start: "2026-10-05", end: "2026-11-13", tasks: TASKS, status: "sent", sent: "22 Sep 2026", deposit: { escrow: 1600, fee: 80 } },
};

/** Types the name and ticks the agreement, as every signature is made. */
async function sign(page: Page, name: string) {
  await page.getByRole("textbox", { name: /^Type your full name to sign/ }).fill(name);
  await page.getByRole("checkbox", { name: "I agree to the platform contract and terms of service." }).click();
}

/** Juan asks for revision 1 to change: the audit renamed, with a reason, $1,800 a month, and a note. */
async function askForChanges(juan: Page) {
  // Juan asks for changes instead of signing.
  await juan.goto(OFFER);
  await juan.getByRole("button", { name: "Ask for changes" }).click();
  const dialog = juan.getByRole("dialog", { name: "Ask for changes to revision 1" });
  await dialog.getByRole("button", { name: "Suggest a change to “Audit the brand assets”" }).click();
  const form = dialog.getByRole("form", { name: "Suggest a change to “Audit the brand assets”" });
  await form.getByRole("textbox", { name: "New name" }).fill("Audit and tidy the brand assets");
  await form.getByRole("textbox", { name: "Why" }).fill("The tidy-up is part of the audit.");
  await form.getByRole("button", { name: "Add suggestion" }).click();
  await dialog.getByRole("textbox", { name: "Rate you'd sign for" }).fill("$1,800/mo");
  await dialog.getByRole("button", { name: "Send request" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Say what you'd change, so the company knows what to revise.");
  await dialog.getByRole("textbox", { name: "What should change?" }).fill("Fold the tidy-up into the audit; $1,800 a month covers it.");
  await dialog.getByRole("button", { name: "Send request" }).click();
  await expect(juan.getByText("You asked Alex for changes to revision 1", { exact: false })).toBeVisible();
}

/** Alex answers every change in revision 2: the rename accepted, the rate Juan asked for. */
async function reviseAsAlex(page: Page) {
  // Alex answers it in the next revision.
  await page.goto(EDITOR);
  await expect(page.getByText("Juan asked for changes to revision 1")).toBeVisible();
  await sign(page, "Alex Rivera");
  const send = page.getByRole("button", { name: "Send revision 2" });
  await expect(send).toBeDisabled();
  await expect(page.getByText("Answer each change Juan asked for first.")).toBeVisible();
  await page.getByRole("button", { name: "Accept" }).click();
  await page.getByRole("button", { name: "Use $1,800/mo" }).click();
  await expect(page.getByRole("textbox", { name: "Task 1" })).toHaveValue("Audit and tidy the brand assets");
  await send.click();
  await expect(page).toHaveURL(/\/team\/hire\/offers$/);
}

test.describe("offer revisions · asking for changes", () => {
  test.use({ seedOptions: { deal: OFFER_OUT, stores: { "team.roles": [ROLE] } } });

  test("Juan asks for changes, Alex answers them in revision 2, and Juan signs revision 2 as contract v1", async ({ page, secondPage }) => {
    test.setTimeout(120_000);
    const juan = await secondPage();
    await askForChanges(juan);
    await sign(juan, "Juan Dela Cruz");
    await expect(juan.getByRole("button", { name: "Accept", exact: true })).toBeDisabled();
    expect((await notes(juan, "team"))[0]).toMatchObject({ title: "Juan Dela Cruz asked for changes to your offer", href: EDITOR });
    await reviseAsAlex(page);
    await juan.goto(OFFER);
    await expect(juan.getByRole("list", { name: "Changes in revision 2" })).toContainText("Audit and tidy the brand assets");
    await expect(juan.getByText("You asked for changes to revision 1")).toBeVisible();
    await expect(juan.getByRole("listitem").filter({ hasText: "rename it “Audit and tidy the brand assets”" })).toContainText("Accepted");
    await sign(juan, "Juan Dela Cruz");
    await juan.getByRole("button", { name: "Accept", exact: true }).click();
    await expect(juan.getByRole("dialog", { name: "You’ve accepted the offer" })).toBeVisible();
    const deal = await savedDeal(juan);
    expect(deal.contract.scope.versions[0]).toMatchObject({ version: 1, source: { kind: "offer", revision: 2 }, terms: { rate: "$1,800.00/mo" } });
    expect(deal.contract.tasks.map((t: { id: string; title: string }) => [t.id, t.title])).toEqual([["task-1", "Audit and tidy the brand assets"], ["task-2", "Draft two logo directions"]]);
    expect(deal.offer.log.map((e: { kind: string }) => e.kind)).toEqual(["changes_requested", "revised", "accepted"]);
  });

  test("Juan can withdraw his request, and revision 1 can be signed as it stands", async ({ page }) => {
    await askForChanges(page);
    await page.getByRole("button", { name: "Withdraw request" }).click();
    await expect(toast(page, "Request withdrawn — revision 1 stands as Nairobi Solutions Inc. sent it")).toBeVisible();
    await sign(page, "Juan Dela Cruz");
    await page.getByRole("button", { name: "Accept", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "You’ve accepted the offer" })).toBeVisible();
    expect((await savedDeal(page)).contract.scope.versions[0].source).toEqual({ kind: "offer", revision: 1 });
  });
});

test.describe("offer revisions · a revision sent while it's read", () => {
  test.use({ seedOptions: { deal: OFFER_OUT, stores: { "team.roles": [ROLE] } } });

  test("a revision that arrives while Juan reads the offer has to be read before it's signed", async ({ page, secondPage }) => {
    test.setTimeout(120_000);
    const juan = await secondPage();
    await juan.goto(OFFER);
    await sign(juan, "Juan Dela Cruz");
    await expect(juan.getByRole("button", { name: "Accept", exact: true })).toBeEnabled();
    // Alex changes the start while Juan has revision 1 open.
    await page.goto(EDITOR);
    await page.getByRole("textbox", { name: "Rate" }).fill("1,700");
    await sign(page, "Alex Rivera");
    await page.getByRole("button", { name: "Send revision 2" }).click();
    await expect(page).toHaveURL(/\/team\/hire\/offers$/);
    await expect(juan.getByText("Nairobi Solutions Inc. sent revision 2 while you were reading revision 1.", { exact: false })).toBeVisible();
    await expect(juan.getByRole("button", { name: "Accept", exact: true })).toBeDisabled();
    await juan.getByRole("button", { name: "Read revision 2" }).click();
    await expect(juan.getByText("What changed in revision 2")).toBeVisible();
    await expect(juan.getByRole("button", { name: "Accept", exact: true })).toBeEnabled();
  });
});
