import { expect, open, test } from "./fixtures";

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
