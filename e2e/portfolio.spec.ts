import type { Locator, Page } from "@playwright/test";
import { drag, expect, stored, test, toast } from "./fixtures";

// The Independent's portfolio as work samples uploaded to Hireable (#355, #311; TB-012, TB-040,
// IN-060): added, captioned, put in order and taken off on their own profile, and shown in one
// gallery on every profile a Team Builder opens (Discover, Saved, the pipeline's sheet, the candidate
// page), before a hire as well as after it, while the links stay hidden until there's a contract.
// The files live in this browser's IndexedDB, which both portals' tabs share (@/lib/demo/files).

type Upload = { name: string; mimeType: string; buffer: Buffer };

/** A 1×1 PNG. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
/** A one-page PDF. */
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");
const png = (name: string): Upload => ({ name, mimeType: "image/png", buffer: PNG });
const FILES = {
  kalye: png("kalye.png"),
  tala: png("tala.png"),
  guide: { name: "brand-guide.pdf", mimeType: "application/pdf", buffer: PDF },
  /** Not an image or a PDF. */
  svg: { name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') },
  /** A PNG over the 10MB limit: 10.5MB. */
  big: { name: "big.png", mimeType: "image/png", buffer: Buffer.concat([PNG, Buffer.alloc(Math.round(10.5 * 1024 * 1024))]) },
} satisfies Record<string, Upload>;

const KALYE = "Kalye Coffee rebrand";
const GUIDE = "Brand guide for Tala";
const TALA = "Tala app launch";

/** A role the company posted, with Juan applied to it. */
const ROLE = { slug: "brand-designer", title: "Brand Designer", type: "trial", status: "Active", candidates: null, matched: null, interviews: null, offers: null, hired: null, updated: "25 Sep 2026", description: "Brand work for a B2B agency.", budget: "$1,600.00 - $2,000.00", duration: "30 Days", experience: "Advanced (5–8 years)", skills: ["Branding"], expectation: "", attachment: "" };
const APPLIED = { id: "c1", independent: "juan-dela-cruz", role: ROLE.slug, stage: "applied", status: { label: "Applied", tone: "info" }, submitted: "Today" };

/** The gallery's cards, in their order. */
const cards = (scope: Page | Locator) => scope.getByRole("list", { name: "Work samples" }).getByRole("button");

/** A danger toast: an alert, not a status. */
const alert = (page: Page, text: string) => page.locator("[data-sonner-toast]").getByRole("alert").filter({ hasText: text });

/** The Independent's work samples editor, open on the Portfolio tab of their profile. */
async function openEditor(page: Page) {
  await page.goto("/independent/profile?tab=portfolio");
  await page.getByRole("button", { name: "Edit work samples" }).click();
  await expect(page).toHaveURL(/[?&]edit=samples/);
}

/** Picks files with the editor's Add work samples box: its hidden input's file chooser, set from memory. */
async function pick(page: Page, ...files: Upload[]) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /^Add work samples/ }).click();
  await (await chooser).setFiles(files);
}

/**
 * As the Independent: adds Kalye, Tala and the brand guide, captions each, moves the guide up between
 * the two, and saves. The toast says so, and the gallery shows them in that order.
 */
async function addThree(page: Page) {
  await openEditor(page);
  await pick(page, FILES.kalye, FILES.tala, FILES.guide);
  await page.getByRole("textbox", { name: "Caption for kalye.png" }).fill(KALYE);
  await page.getByRole("textbox", { name: "Caption for tala.png" }).fill(TALA);
  await page.getByRole("textbox", { name: "Caption for brand-guide.pdf" }).fill(GUIDE);
  await page.getByRole("button", { name: "Move brand-guide.pdf up" }).click();
  await expect(page.getByText("3 / 12", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(toast(page, "Work samples saved")).toBeVisible();
  await expect(cards(page)).toContainText([KALYE, GUIDE, TALA]);
}

/**
 * Opens Kalye full size from `scope` and steps through: Next to the guide, a PDF in the browser's own
 * viewer, then ← back to Kalye, and Escape closes the viewer.
 */
async function stepThrough(page: Page, scope: Page | Locator) {
  await scope.getByRole("button", { name: `Open ${KALYE}` }).click();
  const kalye = page.getByRole("dialog", { name: KALYE });
  await expect(kalye.getByRole("img", { name: KALYE })).toBeVisible();
  await expect(kalye).toContainText("1 of 3");
  await kalye.getByRole("button", { name: "Next" }).click();
  const guide = page.getByRole("dialog", { name: GUIDE });
  await expect(guide.getByRole("link", { name: "Open the PDF" })).toBeVisible();
  await expect(guide).toContainText("2 of 3");
  await page.keyboard.press("ArrowLeft");
  await expect(kalye).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(kalye).toHaveCount(0);
}

/** How many files this browser keeps for the app (@/lib/demo/files). */
const keptFiles = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const req = indexedDB.open("hireable-files");
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const count = req.result.transaction("files").objectStore("files").count();
          count.onsuccess = () => resolve(count.result);
          count.onerror = () => reject(count.error);
        };
      }),
  );

/** Puts the posted role, with Juan applied, in the Team Builder's saved demo. */
async function postRole(page: Page) {
  await page.goto("/team/hire/roles");
  await page.evaluate(({ role, cand }) => {
    localStorage.setItem("hireable.demo.team.roles", JSON.stringify([role]));
    localStorage.setItem("hireable.demo.team.candidates", JSON.stringify([cand]));
  }, { role: ROLE, cand: APPLIED });
}

/** Juan's profile sheet, open on its Portfolio tab: the samples in their order, and the links hidden until a hire. */
async function sheetShowsSamples(page: Page) {
  const sheet = page.getByRole("dialog", { name: "Independent profile" });
  await sheet.getByRole("tab", { name: "Portfolio" }).click();
  await expect(cards(sheet)).toContainText([KALYE, GUIDE, TALA]);
  await expect(sheet.getByRole("listitem").filter({ hasText: "Website" })).toContainText("Shown once you hire Juan");
  return sheet;
}

test.describe("portfolio · the Independent's samples", () => {
  test("added, captioned and put in order in the editor, saved, and still there after a reload", async ({ page }) => {
    await addThree(page);
    await page.reload();
    await expect(cards(page)).toContainText([KALYE, GUIDE, TALA]);
    expect(await stored(page, "ind.portfolio")).toMatchObject([
      { name: "kalye.png", type: "image/png", caption: KALYE },
      { name: "brand-guide.pdf", type: "application/pdf", caption: GUIDE },
      { name: "tala.png", type: "image/png", caption: TALA },
    ]);
    // The preview is a Team Builder's before a hire: the samples show, the links don't.
    await expect(page.getByRole("listitem").filter({ hasText: "Portfolio" })).toContainText("Shown once you're hired");
    await stepThrough(page, page);
  });

  test("a sample dragged by its grip lands where it's dropped", async ({ page }) => {
    await openEditor(page);
    await pick(page, FILES.kalye, FILES.tala, FILES.guide);
    const rows = page.getByRole("list", { name: "Your work samples" }).getByRole("listitem");
    await drag(page, rows.nth(2).locator("[draggable=true]"), rows.nth(0), { targetY: 10 });
    await expect(rows).toContainText(["brand-guide.pdf", "kalye.png", "tala.png"]);
  });

  test("taken off, a sample leaves the profile, and its file leaves the browser", async ({ page }) => {
    await addThree(page);
    expect(await keptFiles(page)).toBe(3);
    await page.getByRole("button", { name: "Edit work samples" }).click();
    await page.getByRole("button", { name: "Remove tala.png" }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(toast(page, "Work samples saved")).toBeVisible();
    await expect(cards(page)).toHaveCount(2);
    await expect(cards(page)).toContainText([KALYE, GUIDE]);
    await expect.poll(() => keptFiles(page)).toBe(2);
  });
});

test.describe("portfolio · what the editor turns away", () => {
  test("a file that isn't an image or a PDF, one over 10MB and a 13th are each refused in a danger toast; Cancel keeps nothing", async ({ page }) => {
    await openEditor(page);
    await pick(page, FILES.svg);
    await expect(alert(page, "logo.svg has to be an image (PNG, JPG, WebP or GIF) or a PDF.")).toBeVisible();
    await pick(page, FILES.big);
    await expect(alert(page, "big.png is 10.5MB. The limit is 10MB.")).toBeVisible();
    await pick(page, ...Array.from({ length: 13 }, (_, i) => png(`shot-${i + 1}.png`)));
    await expect(alert(page, "A profile shows up to 12 work samples, so 1 file wasn't added.")).toBeVisible();
    await expect(page.getByText("12 / 12", { exact: true })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Caption for shot-13.png" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Add work samples/ })).toBeDisabled();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("No work samples yet.", { exact: false })).toBeVisible();
    expect(await stored(page, "ind.portfolio")).toBeNull();
  });
});

test.describe("portfolio · a Team Builder before the hire", () => {
  test.use({ seedOptions: { empty: true } });

  test("Discover's sheet shows the samples with the links hidden, and Escape closes the viewer, not the sheet", async ({ page }) => {
    await addThree(page);
    await page.goto("/team/discover");
    await page.getByRole("button", { name: "Juan D." }).click();
    const sheet = await sheetShowsSamples(page);
    await stepThrough(page, sheet);
    await expect(sheet).toBeVisible();
  });

  test("Saved, the pipeline's sheet and the candidate page show the same samples", async ({ page }) => {
    await addThree(page);
    await page.goto("/team/discover/saved");
    await page.getByRole("button", { name: "Juan D." }).click();
    await sheetShowsSamples(page);

    await postRole(page);
    await page.goto(`/team/hire/roles/${ROLE.slug}`);
    await page.getByRole("button", { name: /^Juan D\./ }).click();
    await sheetShowsSamples(page);

    await page.goto(`/team/hire/roles/${ROLE.slug}/candidates/c1?tab=portfolio`);
    await expect(cards(page)).toContainText([KALYE, GUIDE, TALA]);
    await expect(page.getByRole("listitem").filter({ hasText: "LinkedIn" })).toContainText("Shown once you hire Juan");
  });

  test("a sample the Independent takes off is gone from the Team Builder's view too", async ({ page, secondPage }) => {
    await addThree(page);
    const team = await secondPage();
    await postRole(team);
    await team.goto(`/team/hire/roles/${ROLE.slug}/candidates/c1?tab=portfolio`);
    await expect(cards(team)).toHaveCount(3);

    await page.getByRole("button", { name: "Edit work samples" }).click();
    await page.getByRole("button", { name: "Remove kalye.png" }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(toast(page, "Work samples saved")).toBeVisible();

    await team.reload();
    await expect(cards(team)).toContainText([GUIDE, TALA]);
    await expect(team.getByRole("button", { name: `Open ${KALYE}` })).toHaveCount(0);
  });
});

test.describe("portfolio · a Team Builder after the hire", () => {
  // The seeded contract, on the role it was hired for.
  test.use({ seedOptions: { stores: { "team.roles": [ROLE] } } });

  test("the candidate page shows the samples, and the links open now", async ({ page }) => {
    await addThree(page);
    await page.goto("/team/hire/roles/brand-designer/candidates/deal?tab=portfolio");
    await expect(cards(page)).toContainText([KALYE, GUIDE, TALA]);
    await expect(page.getByRole("link", { name: /juandelacruz\.notion\.site/ })).toBeVisible();
    await stepThrough(page, page);
  });
});
