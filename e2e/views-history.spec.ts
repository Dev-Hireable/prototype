import { expect, open, test, tickFilter, view } from "./fixtures";

// Scenario B — switching views, one dataset; scenario O — Back and Forward.
test.describe("views and history · switching views", () => {
  test("every view shows the same items and survives a reload", async ({ page }) => {
    await open(page, "team");
    const expectations: [string, RegExp, string][] = [
      ["List", /view=list/, "list"],
      ["Calendar", /view=calendar/, "calendar"],
      ["Timeline", /view=timeline/, "timeline"],
      ["Workload", /view=workload/, "workload"],
      ["Board", /^(?!.*view=)/, "board"],
    ];
    for (const [name, url, id] of expectations) {
      await view(page, name).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByTestId(id)).toBeVisible();
      await page.reload();
      await expect(view(page, name)).toHaveAttribute("aria-selected", "true");
      await expect(page.getByTestId(id)).toBeVisible();
    }
    // The same item, in three views.
    await view(page, "List").click();
    await expect(page.getByTestId("list").getByText("Pick a typography pairing")).toBeVisible();
    await view(page, "Timeline").click();
    await expect(page.getByTestId("timeline").getByRole("button", { name: "Pick a typography pairing", exact: true })).toBeVisible();
  });

  test("the view tabs are a keyboard tablist", async ({ page }) => {
    await open(page, "team");
    await view(page, "Board").focus();
    await page.keyboard.press("ArrowRight");
    await expect(view(page, "List")).toBeFocused();
    // Moving focus alone doesn't switch; Enter does.
    await expect(view(page, "Board")).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Enter");
    await expect(view(page, "List")).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/view=list/);
  });
});

test.describe("views and history · Back and Forward", () => {
  test("Back and Forward move between views, filters and all", async ({ page }) => {
    await open(page, "team");
    await view(page, "List").click();
    await expect(page).toHaveURL(/view=list/);
    await tickFilter(page, "Status", "In progress");
    await expect(page).toHaveURL(/status=doing/);
    await view(page, "Calendar").click();
    await expect(page).toHaveURL(/view=calendar/);
    await expect(page).toHaveURL(/status=doing/);
    await page.goBack();
    await expect(view(page, "List")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("button", { name: "Remove filter Status: In progress" })).toBeVisible();
    await page.goBack();
    await expect(view(page, "Board")).toHaveAttribute("aria-selected", "true");
    await page.goForward();
    await expect(view(page, "List")).toHaveAttribute("aria-selected", "true");
    await page.goForward();
    await expect(view(page, "Calendar")).toHaveAttribute("aria-selected", "true");
  });
});
