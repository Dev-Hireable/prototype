import { api, card, column, drag, expect, open, panel, saved, savedItem, test } from "./fixtures";

// Scenario K — who can change what. The buttons follow the rules, and so does the "backend":
// calling the repository directly is refused too, and nothing is saved.
test.describe("permissions", () => {
  test("the Independent sees the plan but can't change it, apart from when their work starts", async ({ page }) => {
    await open(page, "independent", "?view=list");
    const list = page.getByTestId("list");
    await expect(list.getByRole("button", { name: /Change (assignee|work type|priority|due date|effort)/ })).toHaveCount(0);
    await open(page, "independent", "?task=t-type");
    await expect(panel(page).getByRole("button", { name: /Change due date/ })).toHaveCount(0);
    // When they start their own work is theirs to say.
    await expect(panel(page).getByRole("button", { name: /(Change|Set) start date/ })).toBeVisible();
    await expect(panel(page).getByText("5 Oct")).toBeVisible();
    // Their own work they can move, and send for review.
    await expect(panel(page).getByRole("button", { name: "Send for review" })).toBeVisible();
  });

  test("a direct API call from the Independent is refused and changes nothing", async ({ page }) => {
    await open(page, "independent");
    const before = await saved(page);
    const r1 = await api(page, "patch", "t-guide", { due: "2026-10-20" });
    expect(r1).toMatchObject({ ok: false, code: "forbidden" });
    expect((r1 as { message: string }).message).toMatch(/plans the work/);
    // A contract task's due date is the contract's, for either side (TB-150).
    expect(await api(page, "patch", "t-type", { due: "2026-10-20" })).toMatchObject({ ok: false, code: "forbidden", message: "This task is part of an agreed contract. Changes to its scope require approval from both parties." });
    expect(await api(page, "create", { id: "sneaky", title: "Not mine to add" })).toMatchObject({ ok: false, code: "forbidden" });
    expect(await api(page, "transition", "t-logos", { to: "done" })).toMatchObject({ ok: false, code: "forbidden" });
    expect(await api(page, "archive", "t-kickoff")).toMatchObject({ ok: false, code: "forbidden" });
    expect(await saved(page)).toEqual(before);
  });

  test("admin reads everything and changes nothing — in the UI or through the API", async ({ page }) => {
    await open(page, "admin");
    await expect(page.getByRole("button", { name: "Add task" })).toHaveCount(0);
    await expect(card(page, /#4 Pick a typography pairing/)).toHaveAttribute("draggable", "false");
    await open(page, "admin", "?task=t-logos");
    await expect(panel(page).getByRole("button", { name: /Approve|Request changes/ })).toHaveCount(0);
    await expect(panel(page).getByRole("textbox", { name: "Add a comment" })).toHaveCount(0);
    const before = await saved(page);
    for (const [method, ...args] of [
      ["transition", "t-logos", { to: "done" }],
      ["patch", "t-type", { priority: "high" }],
      ["comment", "t-type", { id: "c1", text: "Hello" }],
      ["archive", "t-share"],
      ["create", { id: "x", title: "Nope" }],
    ] as [string, ...unknown[]][]) {
      const r = await api(page, method, ...args);
      expect(r, method).toMatchObject({ ok: false, code: "forbidden" });
    }
    expect(await saved(page)).toEqual(before);
  });

  test("the Team Builder can't move the Independent's work for them", async ({ page }) => {
    await open(page, "team");
    const r = await api(page, "transition", "t-type", { to: "doing" });
    expect(r).toMatchObject({ ok: false, code: "forbidden" });
    expect((r as { message: string }).message).toMatch(/Juan moves their own work/);
    expect((await savedItem(page, "t-type")).status).toBe("todo");
  });
});

test.describe("after the trial's last day", () => {
  test.use({ seedOptions: { contract: { ends: "2026-09-24" } } });
  test("no new work, but submissions can still be approved", async ({ page }) => {
    await open(page, "team");
    await expect(page.getByRole("button", { name: "Add task" })).toHaveCount(0);
    await expect(page.getByText(/The trial ended on 24 Sep 2026. Approve what's still in review, then send your evaluation by 29 Sep 2026./)).toBeVisible();
    await drag(page, card(page, /#2 Draft two logo directions/), column(page, "Done"));
    await expect.poll(async () => (await savedItem(page, "t-logos")).status).toBe("done");
    expect(await api(page, "patch", "t-type", { priority: "high" })).toMatchObject({ ok: false, code: "forbidden" });
  });

  test("the Independent can't move work any more", async ({ page }) => {
    await open(page, "independent");
    await expect(card(page, /#4 Pick a typography pairing/)).toHaveAttribute("draggable", "false");
    expect(await api(page, "transition", "t-type", { to: "doing" })).toMatchObject({ ok: false, code: "forbidden" });
  });
});

test.describe("an ended contract", () => {
  test.use({ seedOptions: { contract: { ended: true, endedOn: "24 Sep 2026" } } });
  test("is read-only for everyone", async ({ page }) => {
    await open(page, "team", "?task=t-logos");
    await expect(page.getByText("This contract has ended, so its work is read-only.").first()).toBeVisible();
    await expect(panel(page).getByRole("button", { name: /Approve/ })).toHaveCount(0);
    await expect(panel(page).getByRole("textbox", { name: "Add a comment" })).toHaveCount(0);
    expect(await api(page, "comment", "t-logos", { id: "c9", text: "Late note" })).toMatchObject({ ok: false, code: "forbidden" });
  });
});
