import { expect, open, test, view } from "./fixtures";

// @perf — 600 work items: the board and list open and filter without stalling. Run with
// `npm run test:perf`. The thresholds are generous; they catch a render that has gone quadratic,
// not a few milliseconds.
const TYPES = ["task", "design", "development", "content", "research", "meeting"];
const many = Array.from({ length: 600 }, (_, i) => ({
  id: `p${i}`,
  number: i + 1,
  title: `Work item ${i + 1}${i % 7 === 0 ? " — launch" : ""}`,
  status: ["todo", "doing", "review", "done"][i % 4],
  type: TYPES[i % TYPES.length],
  assignee: i % 5 === 0 ? "team" : i % 11 === 0 ? null : "independent",
  addedBy: "team",
  ...(i % 3 === 0 ? { start: `2026-${i % 2 ? "10" : "09"}-${String((i % 20) + 5).padStart(2, "0")}` } : {}),
  ...(i % 2 === 0 ? { due: `2026-10-${String((i % 25) + 1).padStart(2, "0")}` } : {}),
  effort: [1, 2, 3, 5, 8, 13][i % 6],
  order: (i + 1) * 1024,
  ...(i > 0 && i % 9 === 0 ? { dependsOn: [`p${i - 1}`] } : {}),
}));

test.describe("600 items @perf", () => {
  test.use({ seedOptions: { tasks: many } });

  test("views open and filter quickly", async ({ page }) => {
    const t0 = Date.now();
    await open(page, "team");
    await expect(page.getByRole("region", { name: /^To do, 150 items/ })).toBeVisible();
    const board = Date.now() - t0;

    const t1 = Date.now();
    await page.getByRole("searchbox", { name: /Search work/ }).fill("launch");
    await expect(page.getByText(/of 600 items/)).toBeVisible();
    const search = Date.now() - t1;

    const t2 = Date.now();
    await view(page, "List").click();
    await expect(page.getByTestId("list")).toBeVisible();
    await view(page, "Timeline").click();
    await expect(page.getByTestId("timeline")).toBeVisible();
    await view(page, "Workload").click();
    await expect(page.getByTestId("workload")).toBeVisible();
    await view(page, "Calendar").click();
    await expect(page.getByTestId("calendar")).toBeVisible();
    const views = Date.now() - t2;

    test.info().annotations.push({ type: "timing", description: `board ${board}ms · search ${search}ms · four views ${views}ms` });
    expect(board).toBeLessThan(8000);
    expect(search).toBeLessThan(3000);
    expect(views).toBeLessThan(8000);
  });
});
