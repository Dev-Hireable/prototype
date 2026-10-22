import type { Locator, Page } from "@playwright/test";
import { api, closePanel, expect, filePicker, notes, open, panel, savedItem, test, toast, upload } from "./fixtures";

// The item's sheet: its name heads it; subtasks go in one after another from the keyboard, and a
// box that can't be ticked says why; the Independent says what their own work waits on; and
// comments read as a thread and tell the other side, whose notification opens the item on its comments.

/** The tip on a disabled control: it takes no pointer, so the tip hangs on the wrapper Tip puts around it. */
async function tipOn(page: Page, control: Locator) {
  await control.locator('xpath=ancestor::*[@data-slot="tooltip-trigger"]').hover();
  return page.locator('[data-slot="tooltip-content"]');
}

test.describe("task sheet · the name", () => {
  test("the name heads the sheet, edited in place; Escape leaves the field before the sheet", async ({ page }) => {
    await open(page, "team", "?task=t-kickoff");
    const p = panel(page);
    const name = p.getByRole("textbox", { name: "Name" });
    await expect(name).toHaveValue("Kickoff call with marketing");
    // It opens on the close button, not halfway into editing the name.
    await expect(p.getByRole("button", { name: "Close" })).toBeFocused();
    await name.fill("Kickoff call with the marketing team");
    await name.press("Enter");
    await expect.poll(async () => (await savedItem(page, "t-kickoff")).title).toBe("Kickoff call with the marketing team");
    await name.click();
    await name.press("Escape");
    await expect(name).not.toBeFocused();
    await expect(p).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(p).toHaveCount(0);
  });

  test("the status leads the top bar and the next step ends it; the name heads the body on its left edge, and a name too long ends in … with the whole of it in a tooltip", async ({ page }) => {
    await open(page, "team", "?task=t-kickoff");
    const p = panel(page);
    const name = p.getByRole("textbox", { name: "Name" });
    const tip = page.locator('[data-slot="tooltip-content"]');
    const box = async (l: Locator) => (await l.boundingBox()) ?? { x: 0, y: 0, width: 0, height: 0 };
    // The sheet slides in from the side: measure once it has stopped.
    await p.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    // Alex's own item: its status after the close, Mark done at the bar's end, both over the name.
    const status = await box(p.getByRole("button", { name: /Change status/ }));
    const done = await box(p.getByRole("button", { name: "Mark done" }));
    expect(status.x).toBeLessThan(done.x);
    expect(Math.max(status.y + status.height, done.y + done.height)).toBeLessThanOrEqual((await box(name)).y);
    // The number starts on the body's left edge, where the properties' icons do.
    expect(Math.abs((await box(p.getByText("#6", { exact: true }))).x - (await box(p.getByRole("term").filter({ hasText: "Assignee" }))).x)).toBeLessThanOrEqual(1);
    await name.hover();
    await page.waitForTimeout(800);
    await expect(tip).toHaveCount(0);

    const long = "Kickoff call with marketing and the whole brand team to agree the direction for the launch";
    await name.fill(long);
    await name.press("Enter");
    await page.mouse.move(0, 0);
    await name.hover();
    await expect(tip).toHaveText(long);
  });
});

test.describe("task sheet · the next step", () => {
  test("Send for review opens its panel under the top bar: the note goes with the request, Cancel hands the focus back, and the comment box steps aside meanwhile", async ({ page }) => {
    await open(page, "independent", "?task=t-type");
    const p = panel(page);
    const comment = p.getByRole("textbox", { name: "Add a comment" });
    // Who a comment reaches is said under the box, not in it.
    await expect(p.getByText("Alex will be notified")).toBeVisible();
    await p.getByRole("button", { name: "Send for review" }).click();
    const note = p.getByRole("textbox", { name: "Note for Alex (optional)" });
    await expect(note).toBeFocused();
    await expect(comment).toHaveCount(0);
    await p.getByRole("button", { name: "Cancel" }).click();
    await expect(note).toHaveCount(0);
    await expect(p.getByRole("button", { name: "Send for review" })).toBeFocused();
    await expect(comment).toBeVisible();
    expect((await savedItem(page, "t-type")).status).toBe("todo");

    await p.getByRole("button", { name: "Send for review" }).click();
    await note.fill("Two pairings, each on a sample page.");
    await p.getByRole("button", { name: "Send for review" }).click();
    await expect.poll(async () => (await savedItem(page, "t-type")).status).toBe("review");
    expect((await savedItem(page, "t-type")).submitted).toMatchObject({ note: "Two pairings, each on a sample page." });
    // In review the step is taking it back, and the focus is on the status the send moved.
    await expect(p.getByRole("button", { name: "Take back to keep working" })).toBeVisible();
    await expect(p.getByRole("button", { name: /^Status: In review/ })).toBeFocused();
  });
});

test.describe("task sheet · subtasks", () => {
  test("Add subtask opens a row with the cursor in it; Enter adds one and starts the next", async ({ page }) => {
    await open(page, "independent", "?task=t-type");
    const p = panel(page);
    await p.getByRole("button", { name: "Add subtask" }).click();
    const entry = p.getByRole("textbox", { name: "New subtask" });
    await expect(entry).toBeFocused();
    await entry.fill("Shortlist three pairings");
    await entry.press("Enter");
    await expect(entry).toBeFocused();
    await expect(entry).toHaveValue("");
    await entry.fill("Try them on the logo");
    await entry.press("Enter");
    await expect.poll(async () => ((await savedItem(page, "t-type")).subtasks as { title: string }[]).map((s) => s.title)).toEqual(["Shortlist three pairings", "Try them on the logo"]);
    await expect(p.getByRole("checkbox", { name: "Shortlist three pairings" })).toBeVisible();
    // The same rules as adding a task: Enter on nothing closes, and the cursor goes back to "+".
    await entry.press("Enter");
    await expect(entry).toHaveCount(0);
    const add = p.getByRole("button", { name: "Add subtask" });
    await expect(add).toBeFocused();
    // Escape throws a draft away and closes the row — not the sheet.
    await add.press("Enter");
    await entry.fill("Throwaway");
    await entry.press("Escape");
    await expect(entry).toHaveCount(0);
    await expect(add).toBeFocused();
    await expect(p).toBeVisible();
    expect((await savedItem(page, "t-type")).subtasks).toHaveLength(2);
  });
});

test.describe("task sheet · ticking subtasks", () => {
  test("a box this person can't tick says why, in the words the repository refuses with", async ({ page }) => {
    // Alex adds and removes subtasks on Juan's work, but only Juan ticks them off.
    await open(page, "team", "?task=t-palette");
    const box = panel(page).getByRole("checkbox", { name: "Accessible contrast pairs" });
    await expect(panel(page).getByRole("button", { name: "Add subtask" })).toBeVisible();
    await expect(box).toBeDisabled();
    await expect(await tipOn(page, box)).toHaveText("Whoever does the work ticks its subtasks off.");
    expect(await api(page, "toggleSubtask", "t-palette", "s-2", true)).toMatchObject({ ok: false, code: "forbidden", message: "Whoever does the work ticks its subtasks off." });
    await closePanel(page);

    // Juan's boxes tick while the work is under way, and lock once it's sent for review.
    await open(page, "independent", "?task=t-palette");
    const mine = panel(page).getByRole("checkbox", { name: "Accessible contrast pairs" });
    await expect(mine).toBeEnabled();
    await panel(page).getByRole("button", { name: "Send for review" }).click();
    // #3 still waits on #2 and has a subtask open: it asks once, saying so, and goes when told to.
    await expect(panel(page).getByText("#3 is waiting on #2 Draft two logo directions and has 1 open subtask. Send it for review anyway?")).toBeVisible();
    expect((await savedItem(page, "t-palette")).status).toBe("doing");
    await panel(page).getByRole("button", { name: "Send for review" }).click();
    await expect(mine).toBeDisabled();
    await expect(await tipOn(page, mine)).toHaveText("Its subtasks are locked while it's in review or done.");
    await expect.poll(async () => (await savedItem(page, "t-palette")).status).toBe("review");
    expect(await api(page, "toggleSubtask", "t-palette", "s-2", true)).toMatchObject({ ok: false, code: "forbidden", message: "Its subtasks are locked while it's in review or done." });
    expect(((await savedItem(page, "t-palette")).subtasks as { done: boolean }[]).map((s) => s.done)).toEqual([true, false]);
  });
});

test.describe("task sheet · dependencies", () => {
  test("the Independent says what their own work waits on — and only their own", async ({ page }) => {
    await open(page, "independent", "?task=t-type");
    const p = panel(page);
    await p.getByRole("button", { name: "Add a dependency" }).click();
    await page.getByRole("textbox", { name: "Find an item it waits on" }).fill("#6");
    await page.getByRole("option", { name: /#6 Kickoff call with marketing/ }).click();
    await expect.poll(async () => (await savedItem(page, "t-type")).dependsOn).toEqual(["t-kickoff"]);
    await expect(p.getByText("Blocked", { exact: true })).toBeVisible();
    await p.getByRole("button", { name: "Stop waiting on #6" }).click();
    await expect.poll(async () => (await savedItem(page, "t-type")).dependsOn).toEqual([]);
    await closePanel(page);

    // Alex's item: nothing to add from the sheet, and the repository refuses it too.
    await open(page, "independent", "?task=t-kickoff");
    await expect(panel(page).getByRole("button", { name: "Add a dependency" })).toHaveCount(0);
    expect(await api(page, "addDependency", "t-kickoff", "t-type")).toMatchObject({ ok: false, code: "forbidden", message: "It isn't yours to work on, so Alex says what it waits on." });
    expect((await savedItem(page, "t-kickoff")).dependsOn).toEqual([]);
  });
});

test.describe("task sheet · comments", () => {
  test("a comment reads as a thread entry, and the other side is told — their notification opens it", async ({ page, secondPage }) => {
    await open(page, "team", "?task=t-type");
    const p = panel(page);
    const box = p.getByRole("textbox", { name: "Add a comment" });
    await box.fill("Could you try a serif for the headings?");
    await p.getByRole("button", { name: "Send", exact: true }).click();
    const alex = p.getByRole("article", { name: "Comment from Alex Rivera" });
    await expect(alex).toContainText("Could you try a serif for the headings?");
    // The day is said once, on the stream's divider; the comment carries its time.
    await expect(p.getByRole("list", { name: "Activity history" })).toContainText("Today");

    const [note] = await notes(page, "independent");
    expect(note).toMatchObject({ title: "Alex Rivera commented on a task", href: "/independent/contracts/brand-designer?task=t-type&focus=comments", unread: true });
    expect(note.body).toContain("Could you try a serif for the headings?");
    // Another while that one is unread updates it, rather than stacking a second.
    await box.fill("Or a slab — your call.");
    await p.getByRole("button", { name: "Send", exact: true }).click();
    await expect.poll(async () => (await notes(page, "independent")).filter((n) => n.title === "Alex Rivera commented on a task").length).toBe(1);
    expect((await notes(page, "independent"))[0].body).toContain("Or a slab — your call.");

    // Juan follows it: the item opens on its comments, and his reply tells Alex.
    const juan = await secondPage();
    await juan.goto(note.href);
    await expect(panel(juan).getByRole("article", { name: "Comment from Alex Rivera" })).toHaveCount(2);
    await expect(panel(juan).getByRole("region", { name: "Activity" })).toBeInViewport();
    await panel(juan).getByRole("textbox", { name: "Add a comment" }).fill("Trying one now.");
    await panel(juan).getByRole("button", { name: "Send", exact: true }).click();
    await expect(panel(juan).getByRole("article", { name: "Comment from Juan Dela Cruz" })).toContainText("Trying one now.");
    await expect.poll(async () => (await notes(juan, "team"))[0]?.title).toBe("Juan Dela Cruz commented on a task");
    expect((await notes(juan, "team"))[0].href).toBe("/team/independents/juan-dela-cruz?task=t-type&focus=comments");
  });
});

test.describe("task sheet · files on comments", () => {
  test("files go with a comment, or make one alone: an image opens in the viewer, a document downloads, and the other side is told", async ({ page }) => {
    await open(page, "team", "?task=t-type");
    const p = panel(page);
    await filePicker(p).setInputFiles([upload.png("tiles.png"), upload.doc("Brand brief.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")]);
    const waiting = p.getByRole("list", { name: "Files to send" });
    await expect(waiting.getByRole("listitem")).toHaveCount(2);
    // A file the box doesn't take is refused by name; the others stay.
    await filePicker(p).setInputFiles(upload.doc("setup.exe", "application/octet-stream"));
    await expect(p.getByRole("alert")).toHaveText("setup.exe: only images, PDFs, Word, Excel, PowerPoint, CSV and text files can be attached.");
    await expect(waiting.getByRole("listitem")).toHaveCount(2);
    // Files alone make a comment.
    await p.getByRole("button", { name: "Send", exact: true }).click();
    const alex = p.getByRole("article", { name: "Comment from Alex Rivera" });
    await expect(alex.getByRole("button", { name: /^Open tiles\.png/ })).toBeVisible();
    await expect(alex.getByRole("link", { name: /^Download Brand brief\.docx/ })).toBeVisible();
    await expect(waiting).toHaveCount(0);
    expect((await savedItem(page, "t-type")).comments).toMatchObject([{ text: "", files: [{ name: "tiles.png", type: "image/png" }, { name: "Brand brief.docx" }] }]);
    expect((await notes(page, "independent"))[0].body).toContain("Shared 2 files");
    // The image opens full size; Escape closes the viewer, not the sheet under it.
    await alex.getByRole("button", { name: /^Open tiles\.png/ }).click();
    const viewer = page.getByRole("dialog", { name: "tiles.png" });
    await expect(viewer.getByRole("img", { name: "tiles.png" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(viewer).toHaveCount(0);
    await expect(p).toBeVisible();
  });
});

test.describe("task sheet · task links", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("the top bar's Copy link copies the task's link, named after the task where formatting pastes, and the toast names it", async ({ page }) => {
    await open(page, "team", "?task=t-kickoff");
    const p = panel(page);
    // Beside the ⋯, on the top bar's line; the number over the name is text.
    const copy = p.getByRole("button", { name: "Copy link to #6" });
    const top = async (l: Locator) => Math.round(((await l.boundingBox())?.y ?? 0) + ((await l.boundingBox())?.height ?? 0) / 2);
    expect(Math.abs((await top(copy)) - (await top(p.getByRole("button", { name: "Item actions" }))))).toBeLessThanOrEqual(2);
    expect(await p.getByText("#6", { exact: true }).evaluate((e) => e.tagName)).toBe("SPAN");
    await copy.hover();
    await expect(page.locator('[data-slot="tooltip-content"]').filter({ hasText: "Copy link" })).toBeVisible();
    await copy.click();
    await expect(toast(page, "Copied the link to “Kickoff call with marketing”")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(new URL("/team/independents/juan-dela-cruz?task=t-kickoff", page.url()).href);
    const html = await page.evaluate(async () => (await (await navigator.clipboard.read())[0].getType("text/html")).text());
    expect(html).toContain(">#6 Kickoff call with marketing</a>");
  });

  test("a task's link pasted in a comment reads as its name with its card, which opens it; a typed #4 links as typed, and any other #number stays as written", async ({ page }) => {
    await open(page, "team", "?task=t-kickoff");
    await panel(page).getByRole("button", { name: "Copy link to #6" }).click();
    await expect(toast(page, "Copied the link to “Kickoff call with marketing”")).toBeVisible();
    // Pasted in a comment on Juan's #4, so he's told of it.
    await open(page, "team", "?task=t-type");
    const p = panel(page);
    const box = p.getByRole("textbox", { name: "Add a comment" });
    await box.fill("Could you check ");
    await box.press("End");
    await box.press("ControlOrMeta+V");
    await box.pressSequentially(" before Friday? Not #99, then #4.");
    await p.getByRole("button", { name: "Send", exact: true }).click();
    const comment = p.getByRole("article", { name: "Comment from Alex Rivera" });
    await expect(comment).toContainText("Could you check Kickoff call with marketing before Friday? Not #99, then #4.");
    await expect(comment).not.toContainText("http");
    await expect(comment.getByRole("button", { name: "#4 Pick a typography pairing", exact: true })).toHaveText("#4");
    // Under it, a card per task it names, in order: number and name, status and who has it.
    const cards = comment.getByRole("list", { name: "Linked tasks" }).getByRole("button");
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText("#6Kickoff call with marketing");
    await expect(cards.first()).toContainText("To do");
    await expect(cards.first()).toContainText("Alex");
    // Juan hears it, once it's saved, with the task's number and name, not its address.
    await expect.poll(async () => (await notes(page, "independent")).find((n) => n.title === "Alex Rivera commented on a task")?.body).toContain("“Could you check #6 Kickoff call with marketing before Friday? Not #99, then #4.”");
    await cards.first().click();
    await expect(page).toHaveURL(/[?&]task=t-kickoff/);
    await expect(p.getByRole("button", { name: "Copy link to #6" })).toBeVisible();
  });
});
