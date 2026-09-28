import { expect, open, test, tickFilter, view } from "./fixtures";

// Scenarios H and I — filters and search, shared by every view and kept in the URL.
test.describe("filters and search · filters", () => {
  test("an assignee and a status filter hold across every view", async ({ page }) => {
    await open(page, "team");
    await tickFilter(page, "Assignee", "Juan");
    await tickFilter(page, "Status", "In progress");
    await expect(page).toHaveURL(/assignee=independent/);
    await expect(page).toHaveURL(/status=doing/);
    await expect(page.getByText("2 of 11 items")).toBeVisible();
    const board = page.getByTestId("board");
    await expect(board.getByRole("group")).toHaveCount(2);
    await expect(board.getByRole("group", { name: /#3 Build the colour palette/ })).toBeVisible();
    await expect(board.getByRole("group", { name: /#10 Fix the icon grid/ })).toBeVisible();

    await view(page, "List").click();
    await expect(page.getByTestId("list").getByRole("row", { name: /^#\d+ / })).toHaveCount(2);
    await view(page, "Calendar").click();
    await expect(page.getByTestId("calendar").getByRole("button", { name: /#4 Pick a typography/ })).toHaveCount(0);
    await expect(page.getByTestId("calendar").getByRole("button", { name: /#3 Build the colour palette/ }).first()).toBeVisible();
    await view(page, "Timeline").click();
    await expect(page.getByTestId("timeline").getByRole("button", { name: /^#\d+ .*, (To do|In progress|In review|Done),/ })).toHaveCount(2);
    await view(page, "Workload").click();
    await expect(page.getByTestId("workload").getByLabel(/^Alex, .*: nothing$/).first()).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Remove filter Assignee: Juan" })).toBeVisible();
  });

  test("chips remove one filter at a time; Clear all removes them all", async ({ page }) => {
    await open(page, "team");
    await tickFilter(page, "Status", "To do");
    await tickFilter(page, "Priority", "High");
    await tickFilter(page, "Work type", "Design");
    await expect(page.getByRole("group", { name: "Active filters" }).getByRole("button", { name: /^Remove filter/ })).toHaveCount(3);
    await page.getByRole("button", { name: "Remove filter Priority: High" }).click();
    await expect(page).not.toHaveURL(/priority=/);
    await expect(page).toHaveURL(/status=todo/);
    await page.getByRole("button", { name: "Clear all" }).click();
    await expect(page).not.toHaveURL(/status=|type=/);
    await expect(page.getByText("11 items")).toBeVisible();
  });

  test("blocked only, and the archive", async ({ page }) => {
    await open(page, "team", "?view=list");
    await tickFilter(page, "Blocked only");
    await expect(page.getByTestId("list").getByRole("row", { name: /^#\d+ / })).toHaveCount(2); // #3 and #5
    await page.getByRole("button", { name: "Remove filter Blocked only" }).click();
    await tickFilter(page, "Show deleted instead");
    await expect(page.getByTestId("list").getByRole("row", { name: /#12 Moodboard/ })).toBeVisible();
    await expect(page.getByTestId("list").getByRole("row", { name: /^#\d+ / })).toHaveCount(1);
  });
});

test.describe("filters and search · search", () => {
  test("search combines with filters, and an empty result says how to get back", async ({ page }) => {
    await open(page, "team");
    await page.getByRole("searchbox", { name: /Search work/ }).fill("palette");
    await expect(page).toHaveURL(/q=palette/);
    await expect(page.getByTestId("board").getByRole("group")).toHaveCount(1);
    await tickFilter(page, "Status", "To do");
    await expect(page.getByText("No work matches these filters")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.getByRole("searchbox", { name: /Search work/ })).toHaveValue("");
    await expect(page.getByText("11 items")).toBeVisible();
  });

  test("search finds an item by number, and ignores case and accents", async ({ page }) => {
    await open(page, "team", "?view=list");
    await page.getByRole("searchbox", { name: /Search work/ }).fill("#10");
    await expect(page.getByTestId("list").getByRole("row", { name: /^#\d+ / })).toHaveCount(1);
    await page.getByRole("searchbox", { name: /Search work/ }).fill("COLOUR");
    await expect(page.getByTestId("list").getByRole("row", { name: /#3 Build the colour palette/ })).toBeVisible();
    await page.getByRole("searchbox", { name: /Search work/ }).fill("brand guidelines pdf");
    await expect(page.getByTestId("list").getByRole("row", { name: /^#\d+ / })).toHaveCount(1);
  });
});
