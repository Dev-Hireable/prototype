import type { Page } from "@playwright/test";
import { api, card, closePanel, drag, expect, open, panel as detail, savedItem, SEED, test } from "./fixtures";

/**
 * #4 as work outside the signed offer: the drags below move a span, and a due date the offer agreed
 * doesn't move that way (TB-077 — permissions.spec). Its start still would, as its own.
 */
const TYPE_UNAGREED = { tasks: SEED.deal.contract.tasks.map((t) => (t.id === "t-type" ? { ...t, agreed: undefined } : t)) };

// Scenarios F and M — dates: in the panel, on the calendar, on the timeline; and dependencies.
// This spec also runs in America/Los_Angeles, where a date-only value built through UTC would
// land a day early.
test.describe("scheduling · dates in the panel", () => {
  test("setting start and due in the panel, within the rules", async ({ page }) => {
    await open(page, "team", "?task=t-share");
    const panel = detail(page);
    await panel.getByRole("button", { name: "Set start date" }).click();
    // A start in the past can't be picked either; today can.
    await expect(page.getByRole("button", { name: /September 24th, 2026/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: /Today, Friday, September 25th, 2026/ })).toBeEnabled();
    await page.getByRole("button", { name: /September 28th, 2026/ }).click();
    await expect.poll(async () => (await savedItem(page, "t-share")).start).toBe("2026-09-28");
    await panel.getByRole("button", { name: "Set due date" }).click();
    // Before the start, and in the past, can't be picked. (.last(): the start picker may still be closing.)
    await expect(page.getByRole("button", { name: /September 27th, 2026/ }).last()).toBeDisabled();
    await expect(page.getByRole("button", { name: /Today, Friday, September 25th, 2026/ }).last()).toBeDisabled();
    await page.getByRole("button", { name: /September 30th, 2026/ }).last().click();
    await expect.poll(async () => (await savedItem(page, "t-share")).due).toBe("2026-09-30");
    await expect(panel.getByRole("button", { name: /Due date: Wed 30 Sep 2026/ })).toBeVisible();
  });

  test("nothing is scheduled after the trial's last day", async ({ page }) => {
    await open(page, "team", "?task=t-share");
    await detail(page).getByRole("button", { name: "Set due date" }).click();
    await page.getByRole("button", { name: "Go to the Next Month" }).click();
    await expect(page.getByRole("button", { name: /October 30th, 2026/ })).toBeEnabled();
    await page.getByRole("button", { name: "Go to the Next Month" }).click();
    await expect(page.getByRole("button", { name: /November 2nd, 2026/ })).toBeDisabled();
  });
});

test.describe("scheduling · the calendar", () => {
  test.use({ seedOptions: TYPE_UNAGREED });

  test("the calendar shows spans and moves them, keeping their length", async ({ page }) => {
    await open(page, "team", "?view=calendar");
    const calendar = page.getByTestId("calendar");
    // The palette runs 25 Sep – 2 Oct: one bar in each of the two weeks it touches.
    await expect(calendar.getByRole("button", { name: /#3 Build the colour palette/ })).toHaveCount(2);
    await expect(calendar.getByRole("gridcell", { name: /Fri 25 Sep 2026, today/ })).toHaveAttribute("aria-current", "date");
    // A busy day keeps three lanes and says what else is on it.
    await calendar.getByRole("button", { name: "1 more on Tue 29 Sep 2026" }).click();
    await expect(page.getByRole("button", { name: /#6 Kickoff call with marketing/ })).toBeVisible();
    await page.keyboard.press("Escape");
    // A due date moves to another day.
    await drag(page, calendar.getByRole("button", { name: /#10 Fix the icon grid/ }), calendar.getByRole("gridcell", { name: /^Thu 1 Oct 2026/ }), { targetY: 12 });
    await expect.poll(async () => (await savedItem(page, "t-icons")).due).toBe("2026-10-01");
    // A span, grabbed by its first day, keeps its length.
    await drag(page, calendar.getByRole("button", { name: /#4 Pick a typography pairing/ }).first(), calendar.getByRole("gridcell", { name: /^Wed 30 Sep 2026/ }), { targetY: 12, sourceX: 10 });
    await expect.poll(async () => [(await savedItem(page, "t-type")).start, (await savedItem(page, "t-type")).due]).toEqual(["2026-09-30", "2026-10-07"]);
  });

  test("unscheduled work waits beside the month and can be dropped on a day", async ({ page }) => {
    await open(page, "team", "?view=calendar");
    const unscheduled = page.getByRole("complementary", { name: "Unscheduled" });
    await expect(unscheduled.getByRole("button", { name: /#9 Social media templates/ })).toBeVisible();
    await drag(page, unscheduled.getByRole("button", { name: /#9 Social media templates/ }), page.getByTestId("calendar").getByRole("gridcell", { name: /^Fri 2 Oct 2026/ }), { targetY: 12 });
    await expect.poll(async () => (await savedItem(page, "t-social")).due).toBe("2026-10-02");
    await expect(unscheduled.getByRole("button", { name: /#9/ })).toHaveCount(0);
  });

  test("a day in the past doesn't take a drop", async ({ page }) => {
    await open(page, "team", "?view=calendar");
    const calendar = page.getByTestId("calendar");
    await drag(page, calendar.getByRole("button", { name: /#10 Fix the icon grid/ }), calendar.getByRole("gridcell", { name: /^Tue 22 Sep 2026/ }), { targetY: 12 });
    expect((await savedItem(page, "t-icons")).due).toBe("2026-09-23");
  });
});

test.describe("scheduling · the timeline", () => {
  test.use({ seedOptions: TYPE_UNAGREED });

  test("the timeline: drag to move, drag an end to resize, arrow keys to nudge", async ({ page }) => {
    await open(page, "team", "?view=timeline&scale=day");
    const timeline = page.getByTestId("timeline");
    await expect(timeline.getByText("Today", { exact: true })).toBeVisible();
    const bar = timeline.getByRole("button", { name: /^#4 Pick a typography pairing, To do/ });
    const box = await bar.boundingBox();
    if (!box) throw new Error("no bar");
    // Two days right (36px a day at the day scale), keeping its length.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 4 });
    await page.mouse.move(box.x + box.width / 2 + 72, box.y + box.height / 2, { steps: 4 });
    await page.mouse.up();
    await expect.poll(async () => [(await savedItem(page, "t-type")).start, (await savedItem(page, "t-type")).due]).toEqual(["2026-09-30", "2026-10-07"]);
    // The right end, one day further. It now ends past the visible edge, so scroll it into view first.
    await timeline.evaluate((el) => (el.scrollLeft += 240));
    const moved = await timeline.getByRole("button", { name: /^#4 Pick a typography pairing, To do/ }).boundingBox();
    if (!moved) throw new Error("no bar");
    await page.mouse.move(moved.x + moved.width - 3, moved.y + moved.height / 2);
    await page.mouse.down();
    await page.mouse.move(moved.x + moved.width + 20, moved.y + moved.height / 2, { steps: 4 });
    await page.mouse.move(moved.x + moved.width + 33, moved.y + moved.height / 2, { steps: 4 });
    await page.mouse.up();
    await expect.poll(async () => (await savedItem(page, "t-type")).due).toBe("2026-10-08");
    // Keyboard: the kickoff call two days later.
    await timeline.getByRole("button", { name: /^#6 Kickoff call with marketing/ }).focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect.poll(async () => (await savedItem(page, "t-kickoff")).due).toBe("2026-10-01");
  });

  test("a change that breaks a rule is refused on the timeline, and Escape undoes a nudge", async ({ page }) => {
    await open(page, "team", "?view=timeline&scale=day");
    const timeline = page.getByTestId("timeline");
    const kickoff = timeline.getByRole("button", { name: /^#6 Kickoff call with marketing/ });
    await kickoff.focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowLeft");
    await expect(timeline.getByRole("alert")).toContainText("can't be in the past");
    await page.keyboard.press("Escape");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1200);
    expect((await savedItem(page, "t-kickoff")).due).toBe("2026-09-29");
  });

  test("a start date alone, a due date alone and a milestone each draw their own way", async ({ page }) => {
    await open(page, "team", "?view=timeline&scale=day");
    const timeline = page.getByTestId("timeline");
    await expect(timeline.getByRole("button", { name: /^#5 Brand guidelines PDF, To do, Due 16 Oct/ })).toBeVisible();
    await expect(timeline.getByRole("button", { name: /^#8 Midpoint check-in, To do, Due 9 Oct/ })).toBeVisible();
    await expect(timeline.getByRole("button", { name: "Schedule" }).first()).toBeVisible();
  });
});

test.describe("scheduling · Schedule on the timeline", () => {
  test("Schedule on a row with no dates opens its sheet on the first date to set", async ({ page }) => {
    await open(page, "team", "?view=timeline&scale=day");
    // #9 has no dates yet: its row says so and offers Schedule.
    const row = page.getByTestId("timeline").locator("div").filter({ has: page.getByRole("button", { name: "Social media templates", exact: true }) }).filter({ has: page.getByRole("button", { name: "Schedule" }) }).last();
    await row.getByRole("button", { name: "Schedule" }).click();
    // The sheet starts on its start date, the first one the Team Builder can change, not on its close button.
    const start = detail(page).getByRole("button", { name: "Set start date" });
    await expect(start).toBeFocused();
    await expect(start).toBeInViewport();
  });
});

test.describe("scheduling · dependencies", () => {
  test("dependencies: add one, refuse a loop, show what's blocked", async ({ page }) => {
    await open(page, "team", "?task=t-type");
    const panel = detail(page);
    await panel.getByRole("button", { name: "Add a dependency" }).click();
    await page.getByRole("textbox", { name: "Find an item it waits on" }).fill("#10");
    await page.getByRole("option", { name: /#10 Fix the icon grid/ }).click();
    await expect.poll(async () => (await savedItem(page, "t-type")).dependsOn).toEqual(["t-icons"]);
    // Said once each: Blocked beside the status, and what it waits on under Dependencies.
    await expect(panel.getByText("Blocked", { exact: true })).toBeVisible();
    await expect(panel.getByRole("region", { name: "Dependencies" }).getByRole("button", { name: /#10 Fix the icon grid/ })).toBeVisible();
    await closePanel(page);
    await expect(card(page, /#4 Pick a typography pairing/).getByText("Blocked")).toBeVisible();

    await page.goto("/team/independents/juan-dela-cruz?task=t-icons");
    await detail(page).getByRole("button", { name: "Add a dependency" }).click();
    await page.getByRole("textbox", { name: "Find an item it waits on" }).fill("typography");
    await page.getByRole("option", { name: /#4 Pick a typography pairing/ }).click();
    await expect(page.getByRole("alert").filter({ hasText: "loop" })).toContainText("#10 → #4 → #10");
    expect((await savedItem(page, "t-icons")).dependsOn).toEqual([]);
  });
});

test.describe("dates in another time zone", () => {
  test.use({ timezoneId: "Pacific/Kiritimati" });
  test("a due date is the same calendar day at UTC+14", async ({ page }) => {
    await open(page, "team", "?view=calendar");
    await expect(page.getByTestId("calendar").getByRole("gridcell", { name: /^Fri 25 Sep 2026, today/ })).toBeVisible();
    await expect(page.getByTestId("calendar").getByRole("button", { name: /#10 Fix the icon grid, In progress, due 23 Sep/ })).toBeVisible();
    await open(page, "team", "?view=timeline&scale=day");
    await expect(page.getByTestId("timeline").getByRole("button", { name: /^#6 Kickoff call with marketing, To do, Due 29 Sep/ })).toBeVisible();
  });
});

/** The tip showing now: hover help is the app's Tip, never a native title. */
const tip = (page: Page) => page.locator('[data-slot="tooltip-content"]');

/** #4 as it would be left overdue: the signed offer agreed its due date, 24 Sep, and it has no start. */
const TYPE_OVERDUE = { tasks: SEED.deal.contract.tasks.map((t) => (t.id === "t-type" ? { ...t, start: undefined, due: "2026-09-24" } : t)) };

// #10 was due 23 Sep and has no start: no day is left to start it, so its start reads as text that
// says why — not a picker with every day greyed out — and a start saved some other way is refused.
test.describe("scheduling · an overdue item's start", () => {
  test("the Team Builder is told to move the due date first, and once it's moved the start can be set", async ({ page }) => {
    await open(page, "team", "?task=t-icons");
    const panel = detail(page);
    await expect(panel.getByRole("button", { name: /start date/ })).toHaveCount(0);
    await panel.getByText("No start date", { exact: true }).hover();
    await expect(tip(page)).toHaveText("It's past its due date, so there's no day left to start it. Move the due date first.");
    expect(await api(page, "patch", "t-icons", { start: "2026-09-25" })).toMatchObject({ ok: false, code: "validation", message: "The due date can't be before the start date." });
    await panel.getByRole("button", { name: /Change due date/ }).click();
    await page.getByRole("button", { name: /September 30th, 2026/ }).click();
    await expect.poll(async () => (await savedItem(page, "t-icons")).due).toBe("2026-09-30");
    await panel.getByRole("button", { name: "Set start date" }).click();
    await page.getByRole("button", { name: /September 28th, 2026/ }).last().click();
    await expect.poll(async () => (await savedItem(page, "t-icons")).start).toBe("2026-09-28");
  });

  test("the Independent, who doesn't set due dates, is told why", async ({ page }) => {
    await open(page, "independent", "?task=t-icons");
    await detail(page).getByText("No start date", { exact: true }).hover();
    await expect(tip(page)).toHaveText("It's past its due date, so there's no day left to start it.");
  });
});

test.describe("scheduling · an overdue agreed item's start", () => {
  test.use({ seedOptions: TYPE_OVERDUE });

  test("the signed offer's due date stays as agreed, so nobody is told to move it", async ({ page }) => {
    await open(page, "team", "?task=t-type");
    const panel = detail(page);
    await expect(panel.getByRole("button", { name: "Due date: agreed in the signed offer" })).toBeVisible();
    await panel.getByText("No start date", { exact: true }).hover();
    await expect(tip(page)).toHaveText("It's past its due date, so there's no day left to start it.");
  });
});
