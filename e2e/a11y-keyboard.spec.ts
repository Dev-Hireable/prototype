import { card, column, expect, filterButton, open, panel, ROLE, savedItem, test } from "./fixtures";

// Keyboard alternatives to every drag, focus that goes where you'd expect, and nothing said in
// colour alone.
test.describe("keyboard and accessibility · the keyboard and focus", () => {
  test("open an item with Enter, close it with Escape, and land back on the card", async ({ page }) => {
    await open(page, "team");
    const kickoff = card(page, /#6 Kickoff call/);
    await kickoff.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/task=t-kickoff/);
    await expect(panel(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page).not.toHaveURL(/task=/);
    await expect(kickoff).toBeFocused();
  });

  test("reordering with Alt+Shift+Up and Down", async ({ page }) => {
    await open(page, "team");
    const social = card(page, /#9 Social media templates/);
    await social.focus();
    const before = (await savedItem(page, "t-social")).order as number;
    await page.keyboard.press("Alt+Shift+ArrowUp");
    await expect.poll(async () => (await savedItem(page, "t-social")).order as number).toBeLessThan(before);
    await expect(column(page, "To do").getByRole("group", { name: /#9/ })).toBeFocused();
    await expect(page.getByTestId("announcer")).toHaveText("Moved #9 up");
  });
});

test.describe("keyboard and accessibility · the Add task dialog, on a role", () => {
  test.use({ seedOptions: ROLE });

  test("a dialog keeps Tab inside it and hands the focus back when it closes", async ({ page }) => {
    await open(page, "team");
    const opener = page.getByRole("button", { name: "Add task" }).first();
    await opener.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Add task" });
    await expect(dialog.getByRole("textbox", { name: "Name" })).toBeFocused();
    // More presses than the dialog has controls, both ways round: the page behind is never reached.
    for (const key of ["Tab", "Shift+Tab"]) {
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press(key);
        expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
      }
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });
});

test.describe("keyboard and accessibility · words, not colour", () => {
  test("status, lateness and blockage are said in words, not only colour", async ({ page }) => {
    await open(page, "team");
    await expect(card(page, /#10 Fix the icon grid/).getByText(/Overdue/)).toBeVisible();
    await expect(card(page, /#3 Build the colour palette/).getByText("Blocked")).toBeVisible();
    await expect(card(page, /#10 Fix the icon grid/).getByText("Changes requested")).toBeVisible();
    await expect(page.getByRole("region", { name: /^In review, 1 item/ })).toBeVisible();
  });
});

test.describe("keyboard and accessibility · menus", () => {
  test("filter menus stay open while ticking several", async ({ page }) => {
    await open(page, "team");
    await filterButton(page).click();
    await page.getByRole("menuitem", { name: "Status" }).click();
    await page.getByRole("menuitemcheckbox", { name: "To do" }).click();
    await page.getByRole("menuitemcheckbox", { name: "In progress" }).click();
    await expect(page.getByRole("menuitemcheckbox", { name: "In progress" })).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/status=todo%2Cdoing|status=todo,doing/);
  });

  test("a Select's list takes the focus the first time it opens from the keyboard", async ({ page }) => {
    await page.goto("/team/hire/interviews");
    await page.getByRole("button", { name: "Set availability" }).click();
    const dialog = page.getByRole("dialog", { name: "Interview availability" });
    const from = dialog.getByRole("button", { name: "From" });
    await from.focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("option", { name: "9:00 AM", exact: true })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("option", { name: "10:00 AM", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(from).toHaveText("10:00 AM");
    await expect(from).toBeFocused();
    // Escape closes the list, not the dialog under it.
    await page.keyboard.press("Enter");
    await expect(page.getByRole("option", { name: "10:00 AM", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toBeHidden();
    await expect(dialog).toBeVisible();
    await expect(from).toBeFocused();
  });

  test("Escape closes the skill suggestions first, then the skills editor", async ({ page }) => {
    await page.goto("/independent/profile");
    await page.getByRole("button", { name: "Edit Skills" }).click();
    const search = page.getByRole("combobox");
    await search.focus();
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toBeHidden();
    await expect(search).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(search).toBeHidden();
    await expect(page.getByRole("button", { name: "Edit Skills" })).toBeVisible();
  });
});

test.describe("keyboard and accessibility · a dialog that gives way to another", () => {
  const ROLE = { slug: "brand-designer", title: "Brand Designer", type: "trial", status: "Active", candidates: null, matched: null, interviews: null, offers: null, hired: null, updated: "25 Sep 2026", description: "Brand work.", budget: "$1,600.00 - $2,000.00 /mo", duration: "30 Days", experience: "Advanced (5–8 years)", skills: ["Branding"], expectation: "", attachment: "", tasks: [{ title: "Take over inbox triage", week: 1, priority: "high" }] };
  test.use({ seedOptions: { deal: { stage: "proposal_sent", contract: null, offer: null, proposal: { version: 1, sent: "24 Sep 2026", rate: "$1,600 /month", letter: "Happy to help." } } } });

  test("closing the review after a long round trip hands the focus back to its opener", async ({ page }) => {
    await page.goto("/team/hire/roles");
    await page.evaluate((role) => localStorage.setItem("hireable.demo.team.roles", JSON.stringify([role])), ROLE);
    await page.goto("/team/hire/roles/brand-designer/candidates/deal");
    const opener = page.getByRole("button", { name: "Review proposal" });
    await opener.focus();
    await page.keyboard.press("Enter");
    const review = page.getByRole("dialog", { name: /proposal for Brand Designer/ });
    await expect(review).toBeVisible();
    // Far more focus moves than the trail of recent ones keeps, then Decline and Revision (twice),
    // each swapped in for the review and back.
    for (let i = 0; i < 24; i++) await page.keyboard.press("Tab");
    await review.getByRole("button", { name: "Decline proposal" }).press("Enter");
    await page.getByRole("dialog", { name: "Decline this proposal?" }).getByRole("button", { name: "Cancel" }).press("Enter");
    for (let round = 0; round < 2; round++) {
      await review.getByRole("button", { name: "Request revision" }).press("Enter");
      await page.getByRole("dialog", { name: "Request a revision" }).getByRole("button", { name: "Cancel" }).press("Enter");
    }
    await expect(review).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(review).toBeHidden();
    await expect(opener).toBeFocused();
  });
});

test.describe("keyboard and accessibility · inline editing", () => {
  test("closing an inline editor, any way, hands the focus back to its pencil", async ({ page }) => {
    await page.goto("/independent/profile");
    const pencil = page.getByRole("button", { name: "Edit bio" });
    const bio = page.getByRole("textbox", { name: "Bio" });
    // The editor replaces the part, pencil and all: the one that comes back takes the focus.
    await pencil.press("Enter");
    await expect(bio).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(bio).toBeHidden();
    await expect(pencil).toBeFocused();
    await pencil.press("Enter");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(pencil).toBeFocused();
    await pencil.press("Enter");
    await page.getByRole("button", { name: "Save", exact: true }).press("Enter");
    await expect(bio).toBeHidden();
    await expect(pencil).toBeFocused();
  });

  test("opening an editor with no field of its own to focus puts the focus in it", async ({ page }) => {
    await page.goto("/independent/profile");
    const pencil = page.getByRole("button", { name: "Edit skills" });
    await pencil.press("Enter");
    // Its first control takes the focus, so Tab and Escape carry on from the editor.
    await expect(page.getByRole("combobox")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("combobox")).toBeHidden();
    await expect(pencil).toBeFocused();
  });
});
