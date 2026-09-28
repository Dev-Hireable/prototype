import { expect, open, PATH, ROLE, test, view } from "./fixtures";

// Scenario L — empty, filtered-empty, unscheduled-only and unreadable states.
test.describe("a trial with no tasks", () => {
  test.use({ seedOptions: { tasks: [] } });

  test("every view says its offer set none, and none can be added", async ({ page }) => {
    await open(page, "team");
    for (const name of ["Board", "List", "Calendar", "Timeline", "Workload"]) {
      await view(page, name).click();
      await expect(page.getByRole("heading", { name: "No trial tasks" })).toBeVisible();
    }
    // The summary line doesn't say "yet": none are coming.
    await expect(page.getByLabel("Summary")).toContainText("No trial tasks");
    await expect(page.getByText("The offer Juan signed has no tasks, and none are added during a trial.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add task" })).toHaveCount(0);
    await open(page, "independent");
    await expect(page.getByText("The offer you signed has no tasks, and none are added during a trial.")).toBeVisible();
    await open(page, "admin");
    await expect(page.getByText("The signed offer has no tasks for this trial.")).toBeVisible();
  });
});

test.describe("a role with no work yet", () => {
  test.use({ seedOptions: { ...ROLE, tasks: [] } });

  test("every view says so, in words for each person", async ({ page }) => {
    await open(page, "team");
    for (const name of ["Board", "List", "Calendar", "Timeline", "Workload"]) {
      await view(page, name).click();
      await expect(page.getByText("No work yet")).toBeVisible();
    }
    await page.getByRole("button", { name: "Add task" }).last().click();
    await expect(page.getByRole("dialog", { name: "Add task" })).toBeVisible();
    await open(page, "independent");
    await expect(page.getByText("Alex adds the work here.", { exact: false })).toBeVisible();
    await open(page, "admin");
    await expect(page.getByText("Nothing has been added to this contract yet.")).toBeVisible();
  });
});

test.describe("filtered to nothing", () => {
  test("says what to do about it", async ({ page }) => {
    await open(page, "team", "?q=zzzz");
    await expect(page.getByText("No work matches these filters")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.getByTestId("board")).toBeVisible();
  });
});

test.describe("nothing scheduled", () => {
  test.use({ seedOptions: { tasks: [{ id: "a", title: "Undated one", addedBy: "team" }, { id: "b", title: "Undated two", addedBy: "team", assignee: null }] } });
  test("the calendar explains, and lists the work as unscheduled", async ({ page }) => {
    await open(page, "team", "?view=calendar");
    await expect(page.getByText(/Nothing here has dates yet/)).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Unscheduled" }).getByRole("button")).toHaveCount(2);
    await view(page, "Timeline").click();
    await expect(page.getByTestId("timeline").getByText("No dates")).toHaveCount(2);
  });
});

test.describe("saved data that can't be read", () => {
  test.use({ seedOptions: { raw: "{not json" } });
  test("isn't written over, is kept, and can be reset", async ({ page }) => {
    await page.goto(PATH.team);
    await expect(page.getByText("This contract's saved work can't be read")).toBeVisible();
    const stored = await page.evaluate(() => [localStorage.getItem("hireable.demo.deal"), localStorage.getItem("hireable.backup.deal")]);
    expect(stored).toEqual(["{not json", "{not json"]);
    await page.getByRole("button", { name: "Reset demo data" }).click();
    await expect(page.getByText("This contract's saved work can't be read")).toHaveCount(0);
  });
});
