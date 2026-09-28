import { card, column, drag, expect, fault, open, ROLE, saved, savedItem, test } from "./fixtures";

// Scenario J — a save that fails: the change shows at once, then goes back, and says why.
test.describe("when a save fails · rollback and Retry", () => {
  test("a move shows at once, then snaps back with the reason and a Retry", async ({ page }) => {
    await open(page, "team");
    await fault(page, { op: "move", mode: "fail", latencyMs: 800, times: 1 });
    await drag(page, card(page, /#6 Kickoff call/), column(page, "In progress"));
    // Optimistic: it's in the new column while the save is on its way…
    await expect(column(page, "In progress").getByRole("group", { name: /#6 Kickoff/ })).toBeVisible();
    await expect(column(page, "In progress").getByRole("group", { name: /#6 Kickoff/ })).toHaveAttribute("data-pending", "true");
    // …then back where it was, with the reason.
    await expect(column(page, "To do").getByRole("group", { name: /#6 Kickoff/ })).toBeVisible();
    const alert = page.getByRole("alert").filter({ hasText: "couldn't save" });
    await expect(alert).toBeVisible();
    expect((await savedItem(page, "t-kickoff")).status).toBe("todo");
    // Retry goes through now the fault has passed.
    await alert.getByRole("button", { name: "Retry" }).click();
    await expect(column(page, "In progress").getByRole("group", { name: /#6 Kickoff/ })).toBeVisible();
    await expect.poll(async () => (await savedItem(page, "t-kickoff")).status).toBe("doing");
  });
});

test.describe("when a save fails · an add, on a role", () => {
  test.use({ seedOptions: ROLE });

  test("an add that fails goes away, and Retry adds it once", async ({ page }) => {
    await open(page, "team");
    await fault(page, { op: "create", mode: "fail", latencyMs: 300, times: 1 });
    const todo = column(page, "To do");
    await todo.getByRole("button", { name: "Add task" }).click();
    await todo.getByRole("textbox", { name: "New task name" }).fill("Will need a retry");
    await todo.getByRole("textbox", { name: "New task name" }).press("Enter");
    await expect(card(page, /Will need a retry/)).toBeVisible();
    const alert = page.getByRole("alert").filter({ hasText: "couldn't save" });
    await expect(alert).toBeVisible();
    await expect(card(page, /Will need a retry/)).toHaveCount(0);
    await alert.getByRole("button", { name: "Retry" }).click();
    await expect(card(page, /Will need a retry/)).toBeVisible();
    await expect.poll(async () => Object.values(await saved(page)).filter((t) => t.title === "Will need a retry").length).toBe(1);
  });
});

test.describe("when a save fails · saved data stays consistent", () => {
  test("storage that refuses to save leaves nothing half-done", async ({ page }) => {
    await open(page, "team", "?view=list");
    const before = await saved(page);
    await page.evaluate(() => {
      const real = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === "hireable.demo.deal") throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
        return real.call(this, key, value);
      };
    });
    await page.getByRole("button", { name: /More actions for #7/ }).click();
    await page.getByRole("menuitem", { name: "Delete task" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "storage is full or blocked" })).toBeVisible();
    await expect(page.getByTestId("list").getByRole("row", { name: /#7 Share the style tiles/ })).toBeVisible();
    expect(await saved(page)).toEqual(before);
  });

  test("changes queued behind a failed one are dropped, not applied out of order", async ({ page }) => {
    await open(page, "team", "?view=list");
    // Long enough that the second change is queued behind the first before it fails.
    await fault(page, { op: "patch", mode: "fail", latencyMs: 3000, times: 1 });
    const row = page.getByTestId("list").getByRole("row", { name: /#7 Share the style tiles/ });
    await row.getByRole("button", { name: /Assignee: Unassigned/ }).click();
    await page.getByRole("menuitemradio", { name: "Alex" }).click();
    await row.getByRole("button", { name: /Work type: Review/ }).click();
    await page.getByRole("menuitemradio", { name: /Meeting/ }).click();
    await expect(page.getByRole("alert").filter({ hasText: "couldn't save" })).toBeVisible();
    await expect.poll(async () => savedItem(page, "t-share").then((t) => [t.assignee, t.type])).toEqual([null, "review"]);
    await expect(row.getByText("Unassigned")).toBeVisible();
  });
});
