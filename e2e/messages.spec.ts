import { expect, filePicker, notes, open, panel, stored, test, upload } from "./fixtures";

// Messages and the quick chat: the thread's header opens the other side's profile in a sheet, and a
// work screen's "Message …" opens the same thread in a small window over the page.

const quickChat = (page: import("@playwright/test").Page) => page.getByRole("region", { name: /^Chat with / });

test.describe("messages · the other side's profile", () => {
  test("the name in the thread's header opens the Independent's profile for a Team Builder, and the company's for an Independent", async ({ page }) => {
    await page.goto("/team/messages");
    await page.getByRole("button", { name: "View Juan Dela Cruz's profile" }).click();
    const independent = page.getByRole("dialog", { name: "Independent profile" });
    await expect(independent.getByRole("heading", { name: "Juan Dela Cruz" })).toBeVisible();
    await expect(page).toHaveURL(/\/team\/messages/);
    await independent.getByRole("button", { name: "Close" }).click();
    await expect(independent).toHaveCount(0);

    await page.goto("/independent/messages");
    await page.getByRole("button", { name: "View Nairobi Solutions's profile" }).click();
    const company = page.getByRole("dialog", { name: "Company profile" });
    await expect(company).toContainText("Nairobi Solutions Inc.");
    await expect(company).toContainText("Alex Rivera");
  });
});

test.describe("messages · the quick chat", () => {
  test("Message on the contract opens the thread over the work, sends into it, folds away, and leads to the full thread", async ({ page }) => {
    await open(page, "team");
    await page.getByRole("button", { name: "Message Juan" }).click();
    const chat = quickChat(page);
    await expect(chat).toContainText("Juan Dela Cruz");
    await expect(page).toHaveURL(/\/team\/independents\/juan-dela-cruz/);
    // Ready to type.
    const input = chat.getByRole("textbox", { name: "Message" });
    await expect(input).toBeFocused();
    await input.fill("Quick one on the logos");
    await input.press("Enter");
    await expect(chat.getByText("Quick one on the logos")).toBeVisible();

    await chat.getByRole("button", { name: "Minimise chat", exact: true }).click();
    await expect(input).toHaveCount(0);
    await chat.getByRole("button", { name: "Open chat", exact: true }).click();
    await expect(chat.getByText("Quick one on the logos")).toBeVisible();

    await chat.getByRole("link", { name: "Open in Messages" }).click();
    await expect(page).toHaveURL(/\/team\/messages/);
    await expect(quickChat(page)).toHaveCount(0);
    // In the thread itself — the conversation list previews it too.
    await expect(page.locator("section").getByText("Quick one on the logos")).toBeVisible();
  });

  test("the Independent's Message opens the company's thread, where the Team Builder's message waits", async ({ page }) => {
    await open(page, "team");
    await page.getByRole("button", { name: "Message Juan" }).click();
    await quickChat(page).getByRole("textbox", { name: "Message" }).fill("Morning, Juan");
    await quickChat(page).getByRole("textbox", { name: "Message" }).press("Enter");

    await open(page, "independent");
    await page.getByRole("button", { name: /^Message / }).click();
    const chat = quickChat(page);
    await expect(chat).toContainText("Nairobi Solutions Inc.");
    await expect(chat.getByText("Morning, Juan")).toBeVisible();
    await chat.getByRole("button", { name: "Close chat" }).click();
    await expect(chat).toHaveCount(0);
  });
});

test.describe("messages · files", () => {
  test("files go with a message, or make one alone, and the other side opens them in the thread", async ({ page }) => {
    await page.goto("/team/messages");
    const message = page.getByRole("textbox", { name: "Message" });
    const composer = page.locator("form").filter({ has: message });
    await filePicker(composer).setInputFiles([upload.png("moodboard.png"), upload.doc("Launch budget.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")]);
    await expect(composer.getByRole("list", { name: "Files to send" }).getByRole("listitem")).toHaveCount(2);
    await message.fill("Moodboard and the budget");
    await composer.getByRole("button", { name: "Send", exact: true }).click();
    await expect(composer.getByRole("list", { name: "Files to send" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Open moodboard\.png/ })).toBeVisible();
    // Then one of files alone.
    await filePicker(composer).setInputFiles(upload.doc("Type specimen.pdf", "application/pdf"));
    await composer.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByRole("button", { name: /^Open Type specimen\.pdf/ })).toBeVisible();

    await page.goto("/independent/messages");
    await expect(page.getByRole("button", { name: /^Open moodboard\.png/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Download Launch budget\.xlsx/ })).toBeVisible();
    // The last message is the file alone, saved with what names it.
    const chat = (await stored(page, "live")).chat as { text?: string; files?: { name: string }[] }[];
    expect(chat.at(-1)).toMatchObject({ files: [{ name: "Type specimen.pdf" }] });
    expect(chat.at(-1)?.text).toBeUndefined();
  });
});

test.describe("messages · task links", () => {
  /** The link the task sheet's Copy link gives for #4, from the Team Builder's side. */
  const LINK = "http://localhost:3100/team/independents/juan-dela-cruz?task=t-type";
  const card = (page: import("@playwright/test").Page) => page.getByRole("list", { name: "Linked tasks" }).getByRole("link");

  test("a task's link pasted in a message reads as the task's name with its card, on each side's own contract page; the thread's row and the notification read it too", async ({ page }) => {
    await page.goto("/team/messages");
    const message = page.getByRole("textbox", { name: "Message" });
    await message.fill(`Can you look at ${LINK} before Friday?`);
    await message.press("Enter");
    await expect(page.getByRole("link", { name: "#4 Pick a typography pairing", exact: true })).toHaveText("Pick a typography pairing");
    await expect(card(page)).toHaveAttribute("href", "/team/independents/juan-dela-cruz?task=t-type");
    await expect(card(page)).toContainText("#4Pick a typography pairing");
    // The thread's row in the inbox: the hired Independent is under "conversations".
    await page.getByRole("button", { name: "conversations" }).click();
    await expect(page.getByRole("complementary").getByRole("listitem").filter({ hasText: "Juan Dela Cruz" })).toContainText("Can you look at #4 Pick a typography pairing before Friday?");
    expect((await notes(page, "independent")).find((n) => n.title.startsWith("New message"))?.body).toBe("Can you look at #4 Pick a typography pairing before Friday?");

    await page.goto("/independent/messages");
    await expect(card(page)).toHaveAttribute("href", "/independent/contracts/brand-designer?task=t-type");
    await card(page).click();
    await expect(panel(page).getByRole("button", { name: "Copy link to #4" })).toBeVisible();
  });

  test("a typed #4 links to the task as typed, with the same card", async ({ page }) => {
    await page.goto("/team/messages");
    const message = page.getByRole("textbox", { name: "Message" });
    await message.fill("Can you look at #4 before Friday?");
    await message.press("Enter");
    const link = page.getByRole("link", { name: "#4 Pick a typography pairing", exact: true });
    await expect(link).toHaveText("#4");
    await expect(link).toHaveAttribute("href", "/team/independents/juan-dela-cruz?task=t-type");
    await expect(card(page)).toContainText("Pick a typography pairing");
  });
});
