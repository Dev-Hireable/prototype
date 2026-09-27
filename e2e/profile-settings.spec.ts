import type { Locator, Page } from "@playwright/test";
import { expect, stored, test, toast } from "./fixtures";

// The profiles and account settings on both sides: the talent profile edited in place, the photo and
// logo pickers, the company details' checks, the account email's code step, and the Team Builder's
// cards. What they save lives in this browser (@/lib/team/account, @/lib/independent/account).

/** A file offered to a photo or logo picker. */
type Upload = { name: string; mimeType: string; buffer: Buffer };

/** A 1×1 PNG: a photo or logo well under the limit. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const FILES = {
  /** An image, but not a JPG or a PNG. */
  gif: { name: "photo.gif", mimeType: "image/gif", buffer: Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64") },
  /** A PNG over the 5MB limit: 5.6MB. */
  big: { name: "big.png", mimeType: "image/png", buffer: Buffer.concat([PNG, Buffer.alloc(Math.round(5.6 * 1024 * 1024))]) },
  png: { name: "me.png", mimeType: "image/png", buffer: PNG },
} satisfies Record<string, Upload>;

/** The camera buttons on a photo and on the company logo. */
const PHOTO = "Change photo — JPG or PNG, up to 5MB";
const LOGO = "Change logo — JPG or PNG, up to 5MB";

/** A role the company has published. */
const LIVE_ROLE = {
  slug: "sdr-lead",
  title: "SDR Lead",
  type: "trial",
  status: "Active",
  candidates: null,
  matched: null,
  interviews: null,
  offers: null,
  hired: null,
  updated: "25 Sep 2026",
  description: "Outbound calling for a fintech.",
  budget: "$1,600.00 - $2,000.00 /mo",
  duration: "30 Days",
  experience: "Advanced (5–8 years)",
  skills: ["Cold calling"],
  expectation: "",
  attachment: "",
  tasks: [{ title: "Call the warm leads", week: 1, priority: "high" }],
};
/** The company's screens with that one role live, so their toasts say “live on 1 active role”. */
const ONE_LIVE_ROLE ={ seedOptions: { stores: { "team.roles": [LIVE_ROLE] } } };

/** Picks a file with the camera button on a photo or logo: its hidden input's file chooser, set from memory. */
async function pick(page: Page, camera: string, file: Upload) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: camera }).click();
  await (await chooser).setFiles(file);
}

/** The photo or logo the camera button sits on, as drawn: an image with no alt text, so no role to find it by. */
const imageOn = (page: Page, camera: string) => page.getByRole("button", { name: camera }).locator("..").locator("img");

/** Offers a GIF, then a PNG over the limit: each is turned away with the reason, in a danger toast (an alert). */
async function refusesWrongFiles(page: Page, camera: string) {
  await pick(page, camera, FILES.gif);
  await expect(page.getByRole("alert").filter({ hasText: "That file has to be a JPG or a PNG." })).toBeVisible();
  await pick(page, camera, FILES.big);
  await expect(page.getByRole("alert").filter({ hasText: "That file is 5.6MB — the limit is 5MB." })).toBeVisible();
}

/* ------------------------------------------------------------ the talent profile */

const BIO = "I build outbound teams for B2B SaaS, from the first call to the signed contract.";
const HEADLINE = "Head of Outbound";

/** Rewrites the bio: its editor is in the URL while it's open and the other pencils wait; Save says so and shows it. */
async function saveBio(page: Page) {
  await page.getByRole("button", { name: "Edit bio" }).click();
  await expect(page).toHaveURL(/[?&]edit=bio/);
  await expect(page.getByRole("button", { name: "Edit skills" })).toBeDisabled();
  await page.getByRole("textbox", { name: "Bio" }).fill(BIO);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(toast(page, "Bio saved")).toBeVisible();
  await expect(page).not.toHaveURL(/edit=/);
  await expect(page.getByText(BIO)).toBeVisible();
}

/** Adds Negotiation from the skill search; Save says so and its chip joins the others. */
async function addSkill(page: Page) {
  await page.getByRole("button", { name: "Edit skills" }).click();
  await page.getByRole("combobox", { name: "Search skills" }).fill("Negoti");
  await page.getByRole("option", { name: "Negotiation", exact: true }).click();
  await expect(page.getByText("7 / 10", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(toast(page, "Skills saved")).toBeVisible();
  await expect(page.getByText("Negotiation", { exact: true })).toBeVisible();
}

/** Changes the headline in the profile details; Save says so and the header reads it. */
async function saveHeadline(page: Page) {
  await page.getByRole("button", { name: "Edit profile details" }).click();
  await page.getByRole("textbox", { name: "Headline" }).fill(HEADLINE);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(toast(page, "Profile saved")).toBeVisible();
  await expect(page.getByText(HEADLINE, { exact: true })).toBeVisible();
}

/** Changes the portfolio link on the Portfolio tab; Save says so and the link opens the new address. */
async function savePortfolio(page: Page) {
  await page.getByRole("tab", { name: "Portfolio" }).click();
  await page.getByRole("button", { name: "Edit portfolio links" }).click();
  await page.getByRole("textbox", { name: "Portfolio" }).fill("juan.design");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(toast(page, "Links saved")).toBeVisible();
  await expect(page.getByRole("link", { name: "Portfolio juan.design" })).toHaveAttribute("href", "https://juan.design");
}

test.describe("profile and settings · the talent profile", () => {
  test("the bio, skills, details and links each save from their own editor, say so, and are still there after a reload", async ({ page }) => {
    await page.goto("/independent/profile");
    await saveBio(page);
    await addSkill(page);
    await saveHeadline(page);
    await savePortfolio(page);

    await page.reload();
    await expect(page.getByRole("link", { name: "Portfolio juan.design" })).toBeVisible();
    await page.getByRole("tab", { name: "About" }).click();
    await expect(page.getByText(BIO)).toBeVisible();
    await expect(page.getByText("Negotiation", { exact: true })).toBeVisible();
    await expect(page.getByText(HEADLINE, { exact: true })).toBeVisible();
    expect(await stored(page, "ind.profile")).toMatchObject({ bio: BIO, headline: HEADLINE, skills: expect.arrayContaining(["Negotiation"]), links: { portfolio: "juan.design" } });
  });

  test("the tags pencil says the quiz changes them, and asks before retaking it", async ({ page }) => {
    await page.goto("/independent/profile");
    const pencil = page.getByRole("button", { name: "Edit workplace tags" });
    await pencil.hover();
    await expect(page.locator('[data-slot="tooltip-content"]').filter({ hasText: "Retake the quiz to change your tags" })).toBeVisible();
    await pencil.click();
    const ask = page.getByRole("dialog", { name: "Retake the work-style quiz?" });
    await expect(ask).toContainText("Your current tags stay on your profile until you finish the new quiz.");
    await ask.getByRole("button", { name: "Cancel" }).click();
    await expect(ask).toBeHidden();
    await expect(page).not.toHaveURL(/edit=/);
    await pencil.click();
    await ask.getByRole("button", { name: "Start quiz" }).click();
    await expect(page).toHaveURL(/\/onboarding\/talent$/);
  });
});

/** Juana's profile as saved before: none of it is the seed the page draws while it hydrates. */
const SAVED_TALENT = {
  name: "Juana Dela Cruz",
  headline: "Outbound Sales Lead",
  bio: "Outbound lead for B2B teams.",
  rate: "2,000",
  level: "Expert (8+ years)",
  location: "Cebu, Philippines",
  photo: "/independent/avatar.jpg",
  skills: ["Cold calling"],
  links: { linkedin: "linkedin.com/in/juana", portfolio: "juana.notion.site", website: "juana.ph" },
  email: "juana@example.com",
  phone: "+63 917 555 0142",
  timezone: "(GMT+8) Manila",
};

test.describe("profile and settings · a talent profile saved before", () => {
  test.use({ seedOptions: { stores: { "ind.profile": SAVED_TALENT } } });

  test("?edit=profile opens the details editor filled in from the saved profile, and the old Edit profile page lands there", async ({ page }) => {
    await page.goto("/independent/profile?edit=profile");
    await expect(page.getByText("Profile details", { exact: true })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Full name" })).toHaveValue("Juana Dela Cruz");
    await expect(page.getByRole("textbox", { name: "Headline" })).toHaveValue("Outbound Sales Lead");
    await expect(page.getByRole("textbox", { name: "Monthly rate (USD)" })).toHaveValue("2,000");
    await expect(page.getByRole("button", { name: "Experience level" })).toHaveText("Expert (8+ years)");
    await expect(page.getByRole("textbox", { name: "Location" })).toHaveValue("Cebu, Philippines");
    await expect(page.getByRole("textbox", { name: "Website" })).toHaveValue("juana.ph");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page).not.toHaveURL(/edit=/);
    await expect(page.getByRole("heading", { name: "Juana Dela Cruz" })).toBeVisible();

    await page.goto("/independent/profile/edit");
    await expect(page).toHaveURL(/\/independent\/profile\?edit=profile$/);
    await expect(page.getByRole("textbox", { name: "Full name" })).toHaveValue("Juana Dela Cruz");
  });
});

/* ------------------------------------------------------------ photos */

test.describe("profile and settings · photos", () => {
  test("the talent's photo turns away the wrong file, and a PNG is previewed in the details editor and saved with the rest", async ({ page }) => {
    await page.goto("/independent/profile");
    await page.getByRole("button", { name: "Edit profile details" }).click();
    await refusesWrongFiles(page, PHOTO);
    await expect(page.getByText("Your photo · JPG or PNG, up to 5MB")).toBeVisible();
    await pick(page, PHOTO, FILES.png);
    await expect(page.getByText("New photo — saved with the rest when you press Save.")).toBeVisible();
    await expect(imageOn(page, PHOTO)).toHaveAttribute("src", /^data:image\/png/);
    // The rail's avatar, which opens My profile, is the saved photo: still the old one.
    const rail = page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "My profile" }).locator("img");
    await expect(rail).not.toHaveAttribute("src", /^data:/);
    expect(await stored(page, "ind.profile")).toBeNull();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(toast(page, "Profile saved")).toBeVisible();
    // The header's first image is the photo, now the saved PNG, and so is the rail's.
    const header = page.getByRole("banner").filter({ has: page.getByRole("heading", { name: "Juan Dela Cruz" }) });
    await expect(header.locator("img").first()).toHaveAttribute("src", /^data:image\/png/);
    await expect(rail).toHaveAttribute("src", /^data:image\/png/);
    expect(await stored(page, "ind.profile")).toMatchObject({ photo: expect.stringMatching(/^data:image\/png/) });
  });

  test("the Team Builder's photo turns away the wrong file, and a PNG waits on Save, then shows everywhere", async ({ page }) => {
    await page.goto("/team/profile");
    await refusesWrongFiles(page, PHOTO);
    await expect(page.getByText("New image — not saved yet")).toHaveCount(0);
    await pick(page, PHOTO, FILES.png);
    await expect(page.getByText("New image — not saved yet")).toBeVisible();
    await expect(imageOn(page, PHOTO)).toHaveAttribute("src", /^data:image\/png/);
    // The rail's avatar, which opens My profile, is the saved photo: still the old one.
    const rail = page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "My profile" }).locator("img");
    await expect(rail).not.toHaveAttribute("src", /^data:/);
    expect(await stored(page, "team.profile")).toBeNull();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(toast(page, "Photo updated everywhere")).toBeVisible();
    await expect(page.getByText("New image — not saved yet")).toHaveCount(0);
    await expect(rail).toHaveAttribute("src", /^data:image\/png/);
    expect(await stored(page, "team.profile")).toMatchObject({ photo: expect.stringMatching(/^data:image\/png/) });
  });
});

/* ------------------------------------------------------------ the company profile */

/** Picks a PNG logo and discards it (the initials come back), then picks it again and saves it. */
async function discardThenSaveLogo(page: Page) {
  const initials = page.getByText("NA", { exact: true });
  await pick(page, LOGO, FILES.png);
  await expect(page.getByText("New image — not saved yet")).toBeVisible();
  await expect(imageOn(page, LOGO)).toHaveAttribute("src", /^data:image\/png/);
  await expect(initials).toHaveCount(0);
  await page.getByRole("button", { name: "Discard" }).click();
  await expect(initials).toBeVisible();
  await pick(page, LOGO, FILES.png);
  await page.getByRole("button", { name: "Save", exact: true }).click();
}

test.describe("profile and settings · the company logo", () => {
  test.use(ONE_LIVE_ROLE);

  test("the logo turns away the wrong file, and a PNG takes the initials' place once saved", async ({ page }) => {
    await page.goto("/team/profile/company");
    await expect(page.getByText("Independents see this on every role you post — 1 active right now.")).toBeVisible();
    await expect(page.getByText("NA", { exact: true })).toBeVisible();
    await refusesWrongFiles(page, LOGO);
    await expect(page.getByText("New image — not saved yet")).toHaveCount(0);
    await expect(page.getByText("NA", { exact: true })).toBeVisible();
    await discardThenSaveLogo(page);
    await expect(toast(page, "Logo updated · live on 1 active role")).toBeVisible();
    await expect(imageOn(page, LOGO)).toHaveAttribute("src", /^data:image\/png/);
    expect(await stored(page, "team.company")).toMatchObject({ logo: expect.stringMatching(/^data:image\/png/) });
  });
});

test.describe("profile and settings · the company details", () => {
  test.use(ONE_LIVE_ROLE);

  test("a website that isn't one can't be saved, and a bare domain can", async ({ page }) => {
    await page.goto("/team/profile/company");
    await page.getByRole("button", { name: /^Website: .*\. Edit$/ }).click();
    const website = page.getByRole("textbox", { name: "Website" });
    const problem = page.getByRole("alert").filter({ hasText: "Enter a valid website, like nairobisolutions.com." });
    await website.fill("not a website");
    await expect(problem).toBeVisible();
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
    // Enter doesn't save it either.
    await website.press("Enter");
    await expect(website).toBeVisible();
    expect(await stored(page, "team.company")).toBeNull();
    await website.fill("nairobi.io");
    await expect(problem).toHaveCount(0);
    await website.press("Enter");
    await expect(toast(page, "Website saved · live on 1 active role")).toBeVisible();
    await expect(page.getByRole("button", { name: "Website: nairobi.io. Edit" })).toBeVisible();
    expect(await stored(page, "team.company")).toMatchObject({ url: "nairobi.io" });
  });

  test("About counts its characters and won't save past 600", async ({ page }) => {
    await page.goto("/team/profile/company");
    await page.getByRole("button", { name: /^About: .*\. Edit$/ }).click();
    const about = page.getByRole("textbox", { name: "About", exact: true });
    const tooLong = page.getByRole("alert").filter({ hasText: "Keep it under 600 characters." });
    await expect(page.getByText("130 / 600", { exact: true })).toBeVisible();
    await about.fill("x".repeat(601));
    await expect(page.getByText("601 / 600", { exact: true })).toBeVisible();
    await expect(tooLong).toBeVisible();
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
    await about.fill("x".repeat(600));
    await expect(page.getByText("600 / 600", { exact: true })).toBeVisible();
    await expect(tooLong).toHaveCount(0);
    await about.press("Control+Enter");
    await expect(toast(page, "About saved · live on 1 active role")).toBeVisible();
    expect(await stored(page, "team.company")).toMatchObject({ description: "x".repeat(600) });
  });
});

/* ------------------------------------------------------------ the account email */

/** Each side's account card: the email's label, the address it starts with and the one it changes to. */
const ACCOUNTS = [
  { who: "Team Builder", path: "/team/settings", label: "Work email", saved: "alex@nairobisolutions.com", next: "alex@nairobi.io", store: "team.profile" },
  { who: "independent", path: "/independent/settings", label: "Email", saved: "juandelacruz@gmail.com", next: "juan@delacruz.ph", store: "ind.profile" },
];
type Account = (typeof ACCOUNTS)[number];

/** The email field: its name is its label, then the hint under it. */
const emailField = (page: Page, a: Account) => page.getByRole("textbox", { name: new RegExp(`^${a.label}\\b`) });

/** The code step under the email while a new address waits: the innermost block with the code field and Verify. */
const codeStep = (page: Page) =>
  page
    .locator("div")
    .filter({ has: page.getByRole("button", { name: "Verify" }) })
    .filter({ has: page.getByRole("textbox", { name: /^Enter the code sent to/ }) })
    .last();

/** Types the new address and sends its code: the code step names the address, and Save changes waits on it. */
async function sendCode(page: Page, a: Account) {
  await emailField(page, a).fill(a.next);
  await page.getByRole("button", { name: "Change email" }).click();
  await expect(toast(page, `Verification code sent to ${a.next}`)).toBeVisible();
  await expect(codeStep(page).getByRole("textbox", { name: `Enter the code sent to ${a.next}` })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();
}

/** Change email is off for the saved address; the code takes six digits and nothing else before Verify can go; Cancel drops the step and puts the saved address back. */
async function codeThenCancel(page: Page, a: Account) {
  await expect(page.getByRole("button", { name: "Change email" })).toBeDisabled();
  await sendCode(page, a);
  const code = codeStep(page).getByRole("textbox", { name: /^Enter the code sent to/ });
  const verify = page.getByRole("button", { name: "Verify" });
  await expect(verify).toBeDisabled();
  await code.fill("12a3-4");
  await expect(code).toHaveValue("1234");
  await code.fill("1234567");
  await expect(code).toHaveValue("123456");
  await expect(verify).toBeEnabled();
  await codeStep(page).getByRole("button", { name: "Cancel" }).click();
  await expect(verify).toBeHidden();
  await expect(emailField(page, a)).toHaveValue(a.saved);
  await expect(page.getByRole("button", { name: "Save changes" })).toBeEnabled();
}

/** Sends the code again and verifies it, then saves: "Changes saved" outlasts the card starting over on the new address. */
async function verifyAndSave(page: Page, a: Account) {
  await sendCode(page, a);
  await codeStep(page).getByRole("textbox", { name: /^Enter the code sent to/ }).fill("654321");
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(toast(page, "Email verified and updated")).toBeVisible();
  await expect(page.getByRole("button", { name: "Verify" })).toBeHidden();
  await expect(emailField(page, a)).toHaveValue(a.next);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(toast(page, "Changes saved")).toBeVisible();
  await expect.poll(async () => (await stored(page, a.store))?.email).toBe(a.next);
  // The card has started over on the new saved address (Change email is off again), and the toast is still up.
  await expect(page.getByRole("button", { name: "Change email" })).toBeDisabled();
  await expect(toast(page, "Changes saved")).toBeVisible();
}

test.describe("profile and settings · the account email", () => {
  for (const a of ACCOUNTS) {
    test(`the ${a.who}'s new email waits on a six-digit code: Cancel puts the saved one back, and once verified it saves and survives a reload`, async ({ page }) => {
      await page.goto(a.path);
      await codeThenCancel(page, a);
      await verifyAndSave(page, a);
      await page.reload();
      await expect(emailField(page, a)).toHaveValue(a.next);
      await expect(page.getByRole("button", { name: "Change email" })).toBeDisabled();
    });
  }
});

/* ------------------------------------------------------------ payment methods */

const ONLY_CARD = "You cannot remove your only payment method. Add another card first, then remove this one.";

/**
 * A saved card's row: the innermost block with its brand mark and its name. The rows have no role of
 * their own; the brand mark keeps the Remove dialog, which names the card too, out of it.
 */
const cardRow = (page: Page, brand: "Visa" | "Mastercard", last4: string) =>
  page
    .locator("div")
    .filter({ has: page.getByRole("img", { name: brand, exact: true }) })
    .filter({ hasText: `${brand} ending ${last4}` })
    .last();

/** Remove on Visa ending 4242 asks first: Cancel keeps the card, Remove takes it off. */
async function removeVisa(page: Page, visa: Locator) {
  await visa.getByRole("button", { name: "Remove" }).click();
  const confirm = page.getByRole("dialog", { name: "Remove Visa ending 4242?" });
  await expect(confirm).toContainText("Charges already scheduled to this card complete; nothing new is charged here.");
  await confirm.getByRole("button", { name: "Cancel" }).click();
  await expect(confirm).toBeHidden();
  await expect(visa).toBeVisible();
  await visa.getByRole("button", { name: "Remove" }).click();
  await confirm.getByRole("button", { name: "Remove" }).click();
  await expect(toast(page, "Card removed")).toBeVisible();
  await expect(visa).toHaveCount(0);
}

/** In Add a card: Add card waits for 12 digits, then a Mastercard number, its expiry and “Set as default” go in. */
async function fillNewCard(add: Locator) {
  const number = add.getByRole("textbox", { name: "Card number" });
  const addCard = add.getByRole("button", { name: "Add card" });
  await expect(addCard).toBeDisabled();
  await number.fill("5555 4444 333");
  await expect(addCard).toBeDisabled();
  await number.fill("5555 4444 3333");
  await expect(addCard).toBeEnabled();
  await number.fill("5555 4444 3333 1234");
  await add.getByRole("textbox", { name: "Expiry" }).fill("10/2030");
  const makeDefault = add.getByRole("checkbox", { name: "Set as default payment method" });
  await expect(makeDefault).not.toBeChecked();
  await makeDefault.click();
  await expect(makeDefault).toBeChecked();
}

test.describe("profile and settings · payment methods", () => {
  test("Set as default moves the default, and Remove asks first, leaving a last card that can't be removed", async ({ page }) => {
    await page.goto("/team/settings/payment");
    const visa = cardRow(page, "Visa", "4242");
    const mastercard = cardRow(page, "Mastercard", "8812");
    await expect(visa.getByRole("button", { name: "Remove" })).toBeDisabled();
    await mastercard.getByRole("button", { name: "Set as default" }).click();
    await expect(toast(page, "Mastercard ending 8812 is now your default")).toBeVisible();
    await expect(mastercard.getByText("Default", { exact: true })).toBeVisible();
    await expect(mastercard.getByRole("button", { name: "Remove" })).toBeDisabled();
    expect(await stored(page, "team.cards")).toMatchObject([{ id: "pm1", isDefault: false }, { id: "pm2", isDefault: true }]);
    await removeVisa(page, visa);
    await expect(page.getByText(ONLY_CARD)).toBeVisible();
    await expect(mastercard.getByRole("button", { name: "Remove" })).toBeDisabled();
    expect(await stored(page, "team.cards")).toEqual([{ id: "pm2", brand: "Mastercard", last4: "8812", expires: "01/2027", isDefault: true }]);
  });
});

test.describe("profile and settings · adding a card", () => {
  test.use({ seedOptions: { stores: { "team.cards": [{ id: "pm1", brand: "Visa", last4: "4242", expires: "08/2028", isDefault: true }] } } });

  test("Add card waits for 12 digits, then adds the card as the new default, and the only-card banner goes", async ({ page }) => {
    await page.goto("/team/settings/payment");
    await expect(page.getByText(ONLY_CARD)).toBeVisible();
    await page.getByRole("button", { name: "Add payment method" }).click();
    const add = page.getByRole("dialog", { name: "Add a card" });
    await fillNewCard(add);
    await add.getByRole("button", { name: "Add card" }).click();
    await expect(toast(page, "Card added")).toBeVisible();
    await expect(add).toBeHidden();
    const added = cardRow(page, "Mastercard", "1234");
    await expect(added).toContainText("Expires 10/2030");
    await expect(added.getByText("Default", { exact: true })).toBeVisible();
    await expect(page.getByText(ONLY_CARD)).toHaveCount(0);
    await expect(cardRow(page, "Visa", "4242").getByRole("button", { name: "Remove" })).toBeEnabled();
    expect(await stored(page, "team.cards")).toMatchObject([{ id: "pm1", isDefault: false }, { brand: "Mastercard", last4: "1234", expires: "10/2030", isDefault: true }]);
  });
});
