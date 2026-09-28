import type { Locator, Page } from "@playwright/test";
import { expect, test, toast } from "./fixtures";

// The create-role wizard, /team/hire/new (TB-024 / TB-025 / TB-030 / TB-035): a role's details, a
// trial's tasks and its budget, a step at a time, each step waiting on what it needs; the template
// library to start from; Review, edited in place; and a draft or a live post at the end — a live one
// only once the company profile is finished (TB-001). Roles are saved in `team.roles`, the job
// board's postings with the deal.

/** What the tests type into a new trial: step one and its task. */
const NEW_ROLE = {
  title: "Growth Marketer",
  description: "Run our paid channels and report on leads every week.",
  skill: "Digital marketing",
  level: "Intermediate (2–5 years)",
  task: "Audit the ad accounts",
};

/** A role as `team.roles` keeps it: a complete trial post, a draft unless `over` says otherwise. */
const role = (slug: string, title: string, over: Record<string, unknown> = {}) => ({
  slug,
  title,
  type: "trial",
  status: "Draft",
  candidates: null,
  matched: null,
  interviews: null,
  offers: null,
  hired: null,
  updated: "24 Sep 2026",
  description: "Own the outbound pipeline for our EU segment.",
  budget: "$1,600.00 – $2,000.00 /month",
  duration: "30 Days",
  experience: "Advanced (5–8 years)",
  skills: ["Cold calling", "Lead generation"],
  expectation: "",
  attachment: "",
  tasks: [{ title: "Book 10 discovery calls", week: 2 }],
  hires: 1,
  ...over,
});

/** A draft with every part filled in. */
const SALES_LEAD = role("sales-lead", "Sales Lead");

/** The company profile with every field the publish lock asks for; the seed leaves its size empty. */
const FINISHED_COMPANY = {
  name: "Nairobi Solutions Inc.",
  description: "B2B SaaS agency based in New York. We build outbound teams for early-stage fintechs and keep them accountable with weekly metrics.",
  url: "www.nairobisolutions.com",
  industry: "Sales and marketing services",
  location: "New York, USA · remote team",
  size: "11-50",
  logo: null,
};

/** The UI/UX Designer template's trial tasks: it's a 60-day trial at $1,500 – $2,500 a month. */
const UX_TASKS = ["Map the current onboarding journey", "Run 5 user interviews", "Deliver wireframes and a high-fidelity Figma prototype", "Hand off specs the developers can build from"];

/* -------------------------------------------------------------- locators */

/** A labelled part of step one: "Role Description", "Skills", "Experience Level". */
const field = (page: Page, label: string) => page.getByRole("group", { name: label, exact: true });
/** The Role field, on step one and in Review's editor: its placeholder names it. */
const roleField = (page: Page) => page.getByRole("textbox", { name: "Add e.g. Marketing Manager, Virtual Assistant" });
const descriptionField = (page: Page) => field(page, "Role Description").getByRole("textbox");
const levelPicker = (page: Page) => field(page, "Experience Level").getByRole("button");
const reviewHeading = (page: Page) => page.getByRole("heading", { name: "Review your trial role" });
/** The library's template cards: each one is the button that picks it. */
const cards = (library: Locator) => library.getByRole("button", { name: /^Use the .+ template$/ });
const librarySearch = (library: Locator) => library.getByPlaceholder("Search roles, e.g. assistant, sales, designer");

/** The Team Builder's roles, as they're saved. */
const savedRoles = (page: Page): Promise<Record<string, unknown>[]> => page.evaluate(() => JSON.parse(localStorage.getItem("hireable.demo.team.roles") ?? "[]"));

/** The job board's postings, as they're saved with the deal. */
const savedPostings = (page: Page): Promise<Record<string, unknown>[]> => page.evaluate(() => JSON.parse(localStorage.getItem("hireable.demo.deal") ?? "null")?.postings ?? []);

/* --------------------------------------------------------------- helpers */

/** Picks a skill from the picker's suggestions. */
async function addSkill(page: Page, skill: string) {
  await field(page, "Skills").getByRole("combobox").fill(skill);
  await page.getByRole("option", { name: skill, exact: true }).click();
}

/** Picks from the Experience Level list; its first entry, "Select experience level", empties it again. */
async function pickLevel(page: Page, level: string) {
  await levelPicker(page).click();
  await page.getByRole("option", { name: level, exact: true }).click();
}

/** Fills step one with NEW_ROLE: the role, what it involves, a skill and the level. */
async function fillDetails(page: Page) {
  await roleField(page).fill(NEW_ROLE.title);
  await descriptionField(page).fill(NEW_ROLE.description);
  await addSkill(page, NEW_ROLE.skill);
  await pickLevel(page, NEW_ROLE.level);
}

/** A new trial with NEW_ROLE's details and its task, on the budget step. */
async function toBudgetStep(page: Page) {
  await page.goto("/team/hire/new?type=trial");
  await fillDetails(page);
  await page.getByRole("button", { name: "Next: Trial Tasks" }).click();
  await page.getByRole("textbox", { name: "Task 1" }).fill(NEW_ROLE.task);
  await page.getByRole("button", { name: "Add budget & duration" }).click();
}

/** A new trial filled in through its three steps to Review: NEW_ROLE, $1,500 – $2,500 a month, for `days`. */
async function fillTrial(page: Page, days = "30 Days") {
  await toBudgetStep(page);
  await page.getByRole("textbox", { name: "Minimum" }).fill("1500");
  await page.getByRole("textbox", { name: "Maximum" }).fill("2500");
  await page.getByRole("button", { name: days, exact: true }).click();
  await page.getByRole("button", { name: "Review job post" }).click();
  await expect(reviewHeading(page)).toBeVisible();
}

/** Opens the one listed role's menu on All roles, and picks from it. */
async function roleMenu(page: Page, item: string) {
  await page.getByRole("button", { name: "Role actions" }).click();
  await page.getByRole("menuitem", { name: item, exact: true }).click();
}

/** Opens the template library from step one: Use a template, or Change template once one is in. */
async function openLibrary(page: Page) {
  await page.getByRole("button", { name: /^(Use a|Change) template$/ }).click();
  const library = page.getByRole("dialog", { name: "Role templates" });
  await expect(library).toBeVisible();
  return library;
}

/** The library's counts by category, one category narrowed to its own, and a search that finds none. */
async function narrowAndSearch(library: Locator) {
  const categories = library.getByRole("group", { name: "Template category" }).getByRole("button");
  await expect(categories).toHaveText(["All 18", "Admin & Support 4", "Sales 3", "Marketing 4", "Design & Creative 3", "Engineering 2", "Finance & Operations 2"]);
  await expect(cards(library)).toHaveCount(18);
  await library.getByRole("button", { name: "Sales 3" }).click();
  await expect(cards(library)).toHaveCount(3);
  await expect(library.getByRole("button", { name: "Use the Sales Manager template" })).toBeVisible();
  await expect(library.getByRole("button", { name: "Use the Virtual Assistant template" })).toHaveCount(0);
  await librarySearch(library).fill("zzzz");
  await expect(library.getByText("No templates match “zzzz”. Try another word, or close this and start from scratch.")).toBeVisible();
  await expect(cards(library)).toHaveCount(0);
}

/** Step one as the UI/UX Designer template fills it in, with the template button now for changing it. */
async function expectUxDetails(page: Page) {
  await expect(page.getByRole("button", { name: "Change template" })).toBeVisible();
  await expect(roleField(page)).toHaveValue("UI/UX Designer");
  await expect(descriptionField(page)).toHaveValue(/^Design product experiences our users love\./);
  await expect(field(page, "Skills")).toContainText("5 / 5");
  await expect(field(page, "Skills").getByText("UI/UX design", { exact: true })).toBeVisible();
  await expect(levelPicker(page)).toHaveText("Advanced (5–8 years)");
}

/** Step one as a new post starts: nothing filled in, and no template in use. */
async function expectBlankDetails(page: Page) {
  await expect(page.getByRole("button", { name: "Use a template" })).toBeVisible();
  await expect(roleField(page)).toHaveValue("");
  await expect(descriptionField(page)).toHaveValue("");
  await expect(field(page, "Skills")).toContainText("0 / 5");
  await expect(levelPicker(page)).toHaveText("Select experience level");
  await expect(page.getByRole("button", { name: "Next: Trial Tasks" })).toBeDisabled();
}

/** Past step one after Start from scratch: no template tasks, no budget, and the length back at 30 days. */
async function expectNothingLeftFurtherOn(page: Page) {
  await fillDetails(page);
  await page.getByRole("button", { name: "Next: Trial Tasks" }).click();
  await expect(page.getByRole("textbox", { name: "Task 1" })).toHaveValue("");
  await expect(page.getByRole("textbox", { name: "Task 2" })).toHaveCount(0);
  await page.getByRole("textbox", { name: "Task 1" }).fill(NEW_ROLE.task);
  await page.getByRole("button", { name: "Add budget & duration" }).click();
  await expect(page.getByRole("textbox", { name: "Minimum" })).toHaveValue("");
  await expect(page.getByRole("textbox", { name: "Maximum" })).toHaveValue("");
  await expect(page.getByRole("button", { name: "30 Days", exact: true })).toHaveAttribute("aria-pressed", "true");
}

/** Step one: Next waits until every required field is in, and again when any one is taken away. */
async function detailsWaitOnEveryField(page: Page) {
  const next = page.getByRole("button", { name: "Next: Trial Tasks" });
  await expect(next).toBeDisabled();
  await fillDetails(page);
  await expect(next).toBeEnabled();
  await roleField(page).fill("");
  await expect(next).toBeDisabled();
  await roleField(page).fill(NEW_ROLE.title);
  await descriptionField(page).fill("");
  await expect(next).toBeDisabled();
  await descriptionField(page).fill(NEW_ROLE.description);
  await field(page, "Skills").getByRole("button", { name: "Remove" }).click();
  await expect(next).toBeDisabled();
  await addSkill(page, NEW_ROLE.skill);
  await pickLevel(page, "Select experience level");
  await expect(next).toBeDisabled();
  await pickLevel(page, NEW_ROLE.level);
  await expect(next).toBeEnabled();
  await next.click();
}

/** Step two: the budget waits on a named task. */
async function tasksWaitOnATask(page: Page) {
  const next = page.getByRole("button", { name: "Add budget & duration" });
  await expect(next).toBeDisabled();
  await page.getByRole("textbox", { name: "Task 1" }).fill(NEW_ROLE.task);
  await expect(next).toBeEnabled();
  await next.click();
}

/** Step three: Review waits on both ends of the range, and refuses a minimum over the maximum. */
async function budgetWaitsOnARange(page: Page) {
  const next = page.getByRole("button", { name: "Review job post" });
  const upsideDown = page.getByText("Minimum can't be more than the maximum.");
  await expect(next).toBeDisabled();
  await page.getByRole("textbox", { name: "Minimum" }).fill("2000");
  await expect(next).toBeDisabled();
  await page.getByRole("textbox", { name: "Maximum" }).fill("1500");
  await expect(upsideDown).toBeVisible();
  await expect(next).toBeDisabled();
  await page.getByRole("textbox", { name: "Maximum" }).fill("3000");
  await expect(upsideDown).toHaveCount(0);
  await expect(next).toBeEnabled();
  await next.click();
}

/** On Review, edits the title: an empty one can't be saved, the rest waits on the edit, and Cancel puts the old one back. */
async function editTitleThenCancel(page: Page) {
  await page.getByRole("button", { name: "Edit Role", exact: true }).click();
  await roleField(page).fill("");
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  await roleField(page).fill("Head of Sales");
  // One part at a time: the other pencils and Save as draft wait for this edit.
  await expect(page.getByRole("button", { name: "Edit Budget" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save as draft" })).toBeDisabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sales Lead" })).toBeVisible();
  await expect(page.getByText("Head of Sales")).toHaveCount(0);
}

/** On Review, raises the minimum and saves it: the post shows the new range. */
async function editMinimumThenSave(page: Page) {
  await page.getByRole("button", { name: "Edit Budget" }).click();
  await page.getByRole("textbox", { name: "Minimum" }).fill("1800");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("$1,800.00 – $2,000.00 /month")).toBeVisible();
}

/* ----------------------------------------------------------------- specs */

test.describe("role wizard · templates", () => {
  test("the library counts its templates by category, narrows and searches them, and starts over once closed", async ({ page }) => {
    await page.goto("/team/hire/new?type=trial");
    const library = await openLibrary(page);
    await narrowAndSearch(library);
    await library.getByRole("button", { name: "Close", exact: true }).click();
    await expect(library).toBeHidden();
    await openLibrary(page);
    await expect(librarySearch(library)).toHaveValue("");
    await expect(library.getByRole("button", { name: "All 18" })).toHaveAttribute("aria-pressed", "true");
    await expect(cards(library)).toHaveCount(18);
    // A search matches the start of a title's words: "assistant" finds both assistants.
    await librarySearch(library).fill("assistant");
    await expect(cards(library)).toHaveCount(2);
    await expect(library.getByRole("button", { name: "Use the Virtual Assistant template" })).toBeVisible();
    await expect(library.getByRole("button", { name: "Use the Executive Assistant template" })).toBeVisible();
  });

  test("a template fills in the whole trial: the details, its tasks, its length and its budget", async ({ page }) => {
    await page.goto("/team/hire/new?type=trial");
    const library = await openLibrary(page);
    await library.getByRole("button", { name: "Use the UI/UX Designer template" }).click();
    await expect(library).toBeHidden();
    await expectUxDetails(page);
    await page.getByRole("button", { name: "Next: Trial Tasks" }).click();
    for (const [i, task] of UX_TASKS.entries()) await expect(page.getByRole("textbox", { name: `Task ${i + 1}` })).toHaveValue(task);
    await page.getByRole("button", { name: "Add budget & duration" }).click();
    await expect(page.getByRole("textbox", { name: "Minimum" })).toHaveValue("1,500.00");
    await expect(page.getByRole("textbox", { name: "Maximum" })).toHaveValue("2,500.00");
    await expect(page.getByRole("button", { name: "60 Days", exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  test("reopened, the library names the template in use, and Start from scratch clears all it filled in", async ({ page }) => {
    await page.goto("/team/hire/new?type=trial");
    const library = await openLibrary(page);
    await library.getByRole("button", { name: "Use the Front-end Developer template" }).click();
    await openLibrary(page);
    await expect(library.getByText("The form is filled from the Front-end Developer template.")).toBeVisible();
    const inUse = library.getByRole("button", { name: "Front-end Developer — in use" });
    await expect(inUse).toBeDisabled();
    await expect(inUse).toContainText("In use");
    await library.getByRole("button", { name: "Start from scratch" }).click();
    await expect(library).toBeHidden();
    await expectBlankDetails(page);
    await expectNothingLeftFurtherOn(page);
  });
});

test.describe("role wizard · steps", () => {
  test("each step waits on its required fields, and the budget refuses a minimum over the maximum", async ({ page }) => {
    await page.goto("/team/hire/new?type=trial");
    await detailsWaitOnEveryField(page);
    await tasksWaitOnATask(page);
    await budgetWaitsOnARange(page);
    // Review shows the post as the steps wrote it.
    await expect(reviewHeading(page)).toBeVisible();
    await expect(page.getByRole("heading", { name: NEW_ROLE.title })).toBeVisible();
    await expect(page.getByText("$2,000.00 – $3,000.00 /month")).toBeVisible();
    await expect(page.getByText(NEW_ROLE.task)).toBeVisible();
  });

  // The same bar as a draft's Publish on All roles (roleParts), which wants an amount over zero.
  test("a range of $0 to $0 is refused like an empty one", async ({ page }) => {
    await toBudgetStep(page);
    await page.getByRole("textbox", { name: "Minimum" }).fill("0");
    await page.getByRole("textbox", { name: "Maximum" }).fill("0");
    await expect(page.getByText("The budget can't be $0.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Review job post" })).toBeDisabled();
  });
});

test.describe("role wizard · Review", () => {
  test.use({ seedOptions: { stores: { "team.roles": [SALES_LEAD] } } });

  test("Cancel puts an edited field back, and Save keeps the change", async ({ page }) => {
    await page.goto("/team/hire/new?type=trial&edit=sales-lead");
    await expect(reviewHeading(page)).toBeVisible();
    await editTitleThenCancel(page);
    await editMinimumThenSave(page);
    await page.getByRole("button", { name: "Save as draft" }).click();
    await expect(page).toHaveURL(/\/team\/hire\/roles$/);
    expect(await savedRoles(page)).toEqual([expect.objectContaining({ slug: "sales-lead", title: "Sales Lead", budget: "$1,800.00 – $2,000.00 /month", status: "Draft" })]);
  });

  test("Publish waits on a finished company profile, and says why in its tip and a banner", async ({ page }) => {
    await page.goto("/team/hire/new?type=trial&edit=sales-lead");
    const publish = page.getByRole("button", { name: "Publish Role" });
    await expect(publish).toBeDisabled();
    // A disabled button takes no pointer, so its tip hangs on the wrapper around it.
    await publish.locator("..").hover();
    await expect(page.locator('[data-slot="tooltip-content"]')).toHaveText("Finish your company profile and add a payment method first");
    await expect(page.getByText("To publish, finish your company profile. You can save this role as a draft now and publish it after.")).toBeVisible();
    await expect(page.getByRole("link", { name: "company profile", exact: true })).toHaveAttribute("href", "/team/profile/company");
    await expect(page.getByRole("button", { name: "Save as draft" })).toBeEnabled();
  });
});

test.describe("role wizard · drafts", () => {
  test("Save as draft keeps what was filled in, and Continue editing opens the draft back on Review", async ({ page }) => {
    await fillTrial(page);
    await page.getByRole("button", { name: "Save as draft" }).click();
    await expect(page).toHaveURL(/\/team\/hire\/roles$/);
    await expect(page.getByText("0 active · 1 draft · 0 closed")).toBeVisible();
    expect(await savedRoles(page)).toEqual([
      expect.objectContaining({ slug: "growth-marketer", title: NEW_ROLE.title, type: "trial", status: "Draft", skills: [NEW_ROLE.skill], budget: "$1,500.00 – $2,500.00 /month", duration: "30 Days", tasks: [{ title: NEW_ROLE.task }] }),
    ]);
    await roleMenu(page, "Continue editing");
    await expect(page).toHaveURL(/\/team\/hire\/new\?type=trial&edit=growth-marketer$/);
    await expect(reviewHeading(page)).toBeVisible();
    await expect(page.getByRole("heading", { name: NEW_ROLE.title })).toBeVisible();
    await expect(page.getByText("$1,500.00 – $2,500.00 /month")).toBeVisible();
    await expect(page.getByText(NEW_ROLE.task)).toBeVisible();
  });

  test("a draft saved with only a title opens back on Role Details, its title kept", async ({ page }) => {
    await page.goto("/team/hire/new?type=full-time");
    await roleField(page).fill("Operations Lead");
    await page.getByRole("button", { name: "Save as draft" }).click();
    await expect(page).toHaveURL(/\/team\/hire\/roles$/);
    expect(await savedRoles(page)).toEqual([expect.objectContaining({ slug: "operations-lead", title: "Operations Lead", type: "full-time", status: "Draft" })]);
    await roleMenu(page, "Continue editing");
    await expect(page).toHaveURL(/\/team\/hire\/new\?type=full-time&edit=operations-lead$/);
    await expect(roleField(page)).toHaveValue("Operations Lead");
    await expect(page.getByRole("heading", { name: "Build Team" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Role Details" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add budget", exact: true })).toBeDisabled();
  });

  // Saving from there keeps it: the length used to reset to 30 Days and be written over the draft's.
  test("a draft opens back with the trial length it was saved with", async ({ page }) => {
    await fillTrial(page, "60 Days");
    await page.getByRole("button", { name: "Save as draft" }).click();
    await expect.poll(async () => (await savedRoles(page))[0]?.duration).toBe("60 Days");
    await roleMenu(page, "Continue editing");
    await expect(reviewHeading(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "60 Days", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Save as draft" }).click();
    await expect(page).toHaveURL(/\/team\/hire\/roles$/);
    expect((await savedRoles(page))[0]).toMatchObject({ duration: "60 Days" });
  });
});

test.describe("role wizard · publishing", () => {
  test.use({ seedOptions: { stores: { "team.company": FINISHED_COMPANY } } });

  test("Publish puts the role on the job board and shows the success screen", async ({ page }) => {
    await fillTrial(page);
    await page.getByRole("button", { name: "Publish Role" }).click();
    await expect(page.getByRole("heading", { name: "Job post published" })).toBeVisible();
    await expect(page.getByText("Your job is now live. Next, review applicants and invite the best matches to a work trial.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Track applicants" })).toHaveAttribute("href", "/team/hire/roles/growth-marketer");
    await expect(page.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/team");
    expect(await savedRoles(page)).toEqual([expect.objectContaining({ slug: "growth-marketer", status: "Active" })]);
    expect(await savedPostings(page)).toEqual([expect.objectContaining({ slug: "growth-marketer", title: NEW_ROLE.title, company: "Nairobi Solutions Inc.", rate: "$1,500.00 – $2,500.00 /month", tasks: [{ title: NEW_ROLE.task }] })]);
  });
});

test.describe("role wizard · publishing a draft", () => {
  test.use({ seedOptions: { stores: { "team.company": FINISHED_COMPANY, "team.roles": [SALES_LEAD] } } });

  test("the published draft keeps its slug, and no copy of it is left behind", async ({ page }) => {
    await page.goto("/team/hire/new?type=trial&edit=sales-lead");
    await expect(page.getByRole("heading", { name: "Sales Lead" })).toBeVisible();
    await page.getByRole("button", { name: "Publish Role" }).click();
    await expect(page.getByRole("heading", { name: "Job post published" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Track applicants" })).toHaveAttribute("href", "/team/hire/roles/sales-lead");
    expect(await savedRoles(page)).toEqual([expect.objectContaining({ slug: "sales-lead", title: "Sales Lead", status: "Active" })]);
    expect((await savedPostings(page)).map((p) => p.slug)).toEqual(["sales-lead"]);
  });
});

test.describe("role wizard · duplicating", () => {
  test.use({ seedOptions: { stores: { "team.company": FINISHED_COMPANY, "team.roles": [role("operations-assistant", "Operations Assistant", { status: "Active" })] } } });

  test("a duplicate opens on Review as a draft, rather than going live as a copy", async ({ page }) => {
    await page.goto("/team/hire/roles");
    await roleMenu(page, "Duplicate");
    await expect(toast(page, "Operations Assistant duplicated as a draft")).toBeVisible();
    // Publish on the copy opens it on Review first, so it isn't posted as "… (copy)" by accident.
    await page.getByPlaceholder("Search roles").fill("(copy)");
    await roleMenu(page, "Publish");
    await expect(page).toHaveURL(/\/team\/hire\/new\?edit=operations-assistant-copy$/);
    await expect(reviewHeading(page)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Operations Assistant (copy)" })).toBeVisible();
    expect((await savedRoles(page)).find((r) => r.slug === "operations-assistant-copy")).toMatchObject({ status: "Draft", duplicatedFrom: "operations-assistant" });
    expect(await savedPostings(page)).toEqual([]);
  });
});
