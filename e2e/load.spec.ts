import { card, expect, open, panel, test, view } from "./fixtures";

// Scenario A — the workspace loads for every role, from any link.
test.describe("loading the workspace · for every role", () => {
  test("the Team Builder's contract opens on the board, full width", async ({ page }) => {
    await open(page, "team");
    await expect(page.getByTestId("workspace")).toHaveAttribute("data-role", "manager");
    await expect(view(page, "Board")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("region", { name: /^To do,/ })).toBeVisible();
    await expect(card(page, /#4 Pick a typography pairing/)).toBeVisible();
    // A trial's tasks are the ones its offer agreed, so it has no Add task.
    await expect(page.getByRole("button", { name: "Add task" })).toHaveCount(0);
    // The summary line counts live work only: 11 items (one is archived), 2 done.
    await expect(page.getByLabel("Summary")).toContainText("2 of 11 done");
  });

  test("the Independent and admin see the same work", async ({ page }) => {
    await open(page, "independent");
    await expect(page.getByTestId("workspace")).toHaveAttribute("data-role", "contributor");
    await expect(card(page, /#4 Pick a typography pairing/)).toBeVisible();
    await open(page, "admin");
    await expect(page.getByTestId("workspace")).toHaveAttribute("data-role", "viewer");
    await expect(card(page, /#4 Pick a typography pairing/)).toBeVisible();
    await expect(page.getByText("You're viewing this workspace as an admin. It's read-only.")).toBeVisible();
  });
});

test.describe("loading the workspace · from any link", () => {
  test("an unknown view falls back to the board", async ({ page }) => {
    await open(page, "team", "?view=gantt");
    await expect(view(page, "Board")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("board")).toBeVisible();
  });

  test("links from before the workspace still work", async ({ page }) => {
    await open(page, "team", "?tab=tasks");
    await expect(page.getByTestId("board")).toBeVisible();
    await open(page, "team", "?tab=tasks&view=list");
    await expect(page.getByTestId("list")).toBeVisible();
  });

  test("a link to an item opens it", async ({ page }) => {
    await open(page, "team", "?task=t-logos");
    await expect(page.getByRole("textbox", { name: "What should change" })).toBeVisible();
    await expect(page.getByText("Both directions are in the shared folder.")).toBeVisible();
  });

  test("a link to an item that doesn't exist says so", async ({ page }) => {
    await open(page, "team", "?task=nope");
    await expect(page.getByTestId("workspace").getByRole("alert")).toContainText("doesn't exist");
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(page).not.toHaveURL(/task=/);
  });
});

test.describe("loading the workspace · the Overview tab", () => {
  test("the Overview tab keeps the contract's summary", async ({ page }) => {
    await open(page, "team");
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page).toHaveURL(/tab=overview/);
    // Worked out from the items themselves: 2 of the 11 that aren't archived are done.
    await expect(page.getByRole("region", { name: "Progress" })).toContainText("2 of 11 items done");
    // What's waiting on the Team Builder: #2's review, and #10, which is overdue.
    const attention = page.getByRole("region", { name: "Needs attention" });
    await expect(attention.getByRole("button")).toHaveCount(2);
    await expect(attention.getByRole("button", { name: /#10 Fix the icon grid/ })).toContainText("Overdue");
    // Still open and due in the next two weeks, soonest first: #6 on the 29th … #8 on 9 Oct.
    const soon = page.getByRole("region", { name: "Coming up" });
    await expect(soon.getByRole("button")).toHaveCount(5);
    await expect(soon.getByRole("button").first()).toContainText("Kickoff call with marketing");
    await expect(page.getByRole("region", { name: "Recent changes" })).toContainText("Audit the current brand assets");
    // The review is one click away, from the banner or the list.
    // The banner names the item it's about, not "an item".
    await expect(page.getByText("Juan sent #2 Draft two logo directions for review.")).toBeVisible();
    await attention.getByRole("button", { name: /#2 Draft two logo directions/ }).click();
    await expect(page).toHaveURL(/task=t-logos/);
    await expect(page.getByTestId("workspace")).toBeVisible();
    await expect(panel(page)).toBeVisible();
  });

  test("the Independent's Overview says what's waiting on them", async ({ page }) => {
    await open(page, "independent");
    await page.getByRole("tab", { name: "Overview" }).click();
    // Only #10: it was sent back with changes (and it's overdue). #2's review is Alex's to do.
    await expect(page.getByRole("region", { name: "Needs attention" }).getByRole("button")).toHaveCount(1);
    await expect(page.getByText("Alex asked for changes on an item.")).toBeVisible();
    await page.getByRole("button", { name: "Open", exact: true }).click();
    await expect(page).toHaveURL(/task=t-icons/);
    await expect(panel(page)).toBeVisible();
  });
});
