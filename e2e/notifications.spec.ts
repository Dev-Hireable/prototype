import type { Page } from "@playwright/test";
import { expect, notes, NOW, test, toast } from "./fixtures";

// The Notifications page on both sides: the latest ten, with "See older notifications" for the rest;
// a row's ⋮ to mark it read or unread, or delete it; Select to do either to several at once; each
// delete with Undo, and the unread counts following along.

type Side = "team" | "independent";
const SIDES: Side[] = ["team", "independent"];
const OTHER: Record<Side, Side> = { team: "independent", independent: "team" };
const HOUR = 3_600_000;

/** What each side's notifications say, numbered so each row can be told apart. */
const SAYS = {
  team: (k: number) => ({ title: `Juan Dela Cruz sent #${k} for review`, body: `#${k} on Brand Designer is In review until you approve it or ask for changes.`, href: `/team/independents/juan-dela-cruz?task=t-${k}`, avatar: "/team/juan.jpg" }),
  independent: (k: number) => ({ title: `Alex Rivera approved #${k}`, body: `#${k} on Brand Designer is Done.`, href: `/independent/contracts/brand-designer?task=t-${k}`, avatar: "/team/alex.jpg" }),
};
const titleOf = (side: Side, k: number) => SAYS[side](k).title;

/**
 * `count` notifications for `side`, numbered from 1, newest first and five hours apart back from the
 * pinned afternoon, so Today, Yesterday and Earlier all show; the numbers in `unread` are unread.
 */
function feedOf(side: Side, count: number, unread = [1, 2, 3]) {
  return Array.from({ length: count }, (_, i) => ({ id: `${side}-${i + 1}`, group: "Today", time: "09:00", at: NOW.getTime() - (i * 5 + 1) * HOUR, unread: unread.includes(i + 1), kind: "tasks", ...SAYS[side](i + 1) }));
}

/** Both feeds, `count` each, as the live store keeps them. */
const both = (count: number, unread?: number[]) => ({ stores: { live: { team: feedOf("team", count, unread), independent: feedOf("independent", count, unread) } } });

/** The feed's rows, and one of them by its notification's title ("#2" isn't "#21"). */
const rows = (page: Page) => page.locator("li[data-note]");
const row = (page: Page, title: string) => rows(page).filter({ has: page.getByText(title, { exact: true }) });
/** A row's own link, which opens what it's about. */
const rowLink = (page: Page, title: string) => row(page, title).getByRole("link");
/** Opens a row's ⋮ menu, which shows while the row is hovered. */
async function openMenu(page: Page, title: string) {
  await row(page, title).hover();
  await page.getByRole("button", { name: `More actions for ${title}`, exact: true }).click();
}
/** The unread count on the rail's Notifications tab. */
const badge = (page: Page, n: number) => page.getByRole("navigation", { name: "Sections" }).getByLabel(`${n} unread`, { exact: true });
const seeOlder = (page: Page) => page.getByRole("button", { name: /^See older notifications/ });
/** The ids a side's saved feed holds, in order, and the unread ones. */
const savedIds = async (page: Page, side: Side) => (await notes(page, side)).map((n) => (n as { id?: string }).id);
const savedUnread = async (page: Page, side: Side) => (await notes(page, side)).filter((n) => n.unread).map((n) => (n as { id?: string }).id);

for (const side of SIDES) {
  test.describe(`notifications · a row's menu, ${side}`, () => {
    test.use({ seedOptions: both(12) });

    test("a row's ⋮ deletes it from this side's feed only, its unread count with it, and the toast's Undo puts it back in its place", async ({ page }) => {
      await page.goto(`/${side}/notifications`);
      await expect(rows(page)).toHaveCount(10);
      await expect(badge(page, 3)).toBeVisible();

      await openMenu(page, titleOf(side, 2));
      await page.getByRole("menuitem", { name: "Delete" }).click();
      await expect(row(page, titleOf(side, 2))).toHaveCount(0);
      const said = toast(page, `Deleted “${titleOf(side, 2)}”`);
      await expect(said).toBeVisible();
      // It was unread, so the count drops with it; the next one moves up into the ten.
      await expect(badge(page, 2)).toBeVisible();
      await expect(rows(page)).toHaveCount(10);
      expect(await savedIds(page, side)).not.toContain(`${side}-2`);
      expect(await notes(page, OTHER[side])).toHaveLength(12);

      await said.getByRole("button", { name: "Undo" }).click();
      await expect(rows(page).nth(1)).toContainText(titleOf(side, 2));
      await expect(badge(page, 3)).toBeVisible();
      expect((await savedIds(page, side)).slice(0, 3)).toEqual([`${side}-1`, `${side}-2`, `${side}-3`]);
    });

    test("a row's ⋮ marks it read, then unread again, and the unread count follows", async ({ page }) => {
      await page.goto(`/${side}/notifications`);
      await openMenu(page, titleOf(side, 1));
      await page.getByRole("menuitem", { name: "Mark as read" }).click();
      await expect(badge(page, 2)).toBeVisible();
      expect(await savedUnread(page, side)).toEqual([`${side}-2`, `${side}-3`]);

      await openMenu(page, titleOf(side, 5));
      await page.getByRole("menuitem", { name: "Mark as unread" }).click();
      await expect(badge(page, 3)).toBeVisible();
      expect(await savedUnread(page, side)).toEqual([`${side}-2`, `${side}-3`, `${side}-5`]);
    });
  });
}

test.describe("notifications · from the keyboard, and after a reload", () => {
  test.use({ seedOptions: both(12) });

  test("a row's ⋮ comes after its link, its Delete hands the focus to the row that takes its place, and a deleted one stays deleted after a reload", async ({ page }) => {
    await page.goto("/independent/notifications");
    await expect(rows(page)).toHaveCount(10);
    await rowLink(page, titleOf("independent", 4)).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: `More actions for ${titleOf("independent", 4)}` })).toBeFocused();
    await page.keyboard.press("Enter");
    await page.getByRole("menuitem", { name: "Delete" }).press("Enter");
    await expect(rowLink(page, titleOf("independent", 5))).toBeFocused();
    await expect(toast(page, `Deleted “${titleOf("independent", 4)}”`)).toBeVisible();

    await page.reload();
    await expect(rows(page)).toHaveCount(10);
    await expect(row(page, titleOf("independent", 4))).toHaveCount(0);
    await expect(row(page, titleOf("independent", 11))).toBeVisible();
    await expect(badge(page, 3)).toBeVisible();
    expect(await savedIds(page, "independent")).toHaveLength(11);
  });
});

test.describe("notifications · selecting several", () => {
  test.use({ seedOptions: both(12) });

  test("Select ticks rows, or all in view, to mark them read or delete them together, and Undo puts them all back", async ({ page }) => {
    await page.goto("/team/notifications");
    await expect(rows(page)).toHaveCount(10);
    await page.getByRole("button", { name: "Select", exact: true }).click();
    // A ticked row opens nothing; the whole row ticks its box.
    await row(page, titleOf("team", 1)).click();
    await page.getByRole("checkbox", { name: `Select “${titleOf("team", 4)}”` }).check();
    await expect(page.getByText("2 selected")).toBeVisible();
    await expect(page).toHaveURL(/\/team\/notifications$/);
    await page.getByRole("button", { name: "Mark as read" }).click();
    await expect(badge(page, 2)).toBeVisible();
    expect(await savedUnread(page, "team")).toEqual(["team-2", "team-3"]);
    await expect(page.getByRole("button", { name: "Select", exact: true })).toBeFocused();

    await page.getByRole("button", { name: "Select", exact: true }).click();
    await page.getByRole("checkbox", { name: "Select all" }).check();
    await expect(page.getByText("10 selected")).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    const said = toast(page, "Deleted 10 notifications");
    await expect(said).toBeVisible();
    // Only the two that weren't in view are left.
    await expect(rows(page)).toHaveCount(2);
    expect(await savedIds(page, "team")).toEqual(["team-11", "team-12"]);
    await expect(badge(page, 2)).toHaveCount(0);

    await said.getByRole("button", { name: "Undo" }).click();
    await expect(rows(page)).toHaveCount(10);
    expect(await savedIds(page, "team")).toEqual(feedOf("team", 12).map((n) => n.id));
    await expect(badge(page, 2)).toBeVisible();
  });
});

test.describe("notifications · seeing older ones", () => {
  test.use({ seedOptions: both(25, [1, 2, 14]) });

  test("the latest ten show first, See older notifications brings ten more at a time with the focus on the first of them, and a filter starts again from its latest", async ({ page }) => {
    await page.goto("/team/notifications");
    await expect(rows(page)).toHaveCount(10);
    await expect(rows(page).last()).toContainText(titleOf("team", 10));
    // The unread count covers the hidden ones too, and the foot says how many of them are unread.
    await expect(badge(page, 3)).toBeVisible();
    await expect(seeOlder(page)).toHaveText(/^See older notifications\s*· 15 more, 1 unread$/);

    await seeOlder(page).click();
    await expect(rows(page)).toHaveCount(20);
    await expect(rowLink(page, titleOf("team", 11))).toBeFocused();
    await expect(seeOlder(page)).toHaveText(/^See older notifications\s*· 5 more$/);
    await seeOlder(page).click();
    await expect(rows(page)).toHaveCount(25);
    await expect(seeOlder(page)).toHaveCount(0);

    await page.getByRole("button", { name: "Unread", exact: true }).click();
    await expect(rows(page)).toHaveCount(3);
    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(rows(page)).toHaveCount(10);
    await page.getByRole("button", { name: "Mark all as read" }).click();
    await expect(badge(page, 3)).toHaveCount(0);
    await expect(seeOlder(page)).toHaveText(/^See older notifications\s*· 15 more$/);
  });
});
