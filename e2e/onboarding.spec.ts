import type { Page } from "@playwright/test";
import { expect, NOW, test } from "./fixtures";

// OB-001 to OB-003 — signing up, logging in and the work-style quiz. The quiz is the real app's
// onboarding (/onboarding/client, /onboarding/talent). Accounts and the session are saved under
// hireable.demo.auth; the answers under hireable.demo.team.workStyle and hireable.demo.ind.workStyle,
// one set per side rather than per account. The fixtures give both sides answers, so a first quiz
// empties its side's set: a new account alone would be greeted as a retake.

/** The two account types: the toggle, the field that differs, and where each one's quiz lives. */
const TEAM = { label: "Team Builder", toggle: "I'm hiring", role: "team", name: "Rosa Lim", detail: "Company name", value: "Lim Studio", quiz: "client" } as const;
const TALENT = { label: "Independent", toggle: "I'm looking for work", role: "independent", name: "Paolo Reyes", detail: "Job title", value: "Brand Designer", quiz: "talent" } as const;
type Side = typeof TEAM | typeof TALENT;

/** A made-up password that meets every rule: at least eight characters, a capital and a number. */
const PASSWORD = "Quizready2026";

/** Hiro, the client quiz's assistant: how he opens, and how he opens a retake. */
const HIRO_GREETING = "Hey, I'm Hiro. I'll throw a few real scenarios your way so we can see how you like to run your team. Pick one, or type your own answer. Ready?";
const HIRO_WELCOME_BACK = "Good to see you again. Same six scenarios as last time, so answer for how you run your team today, not how you answered before. Ready?";
/** The client quiz's second question's options, in order: the keyboard walks them. */
const CLIENT_Q2 = [
  "Redirect the team right away and keep shipping.",
  "Dig into why it changed, then reset priorities with the team.",
  "Push back and try to protect the original scope.",
  "Pause the sprint until the new direction is clear.",
];
/** Hira, the talent quiz's assistant: her first question's first two options, and its follow-up. */
const TALENT_Q1 = ["Make a judgment call and keep going.", "Drop a message and move to something else while I wait."];
const TALENT_Q1_FOLLOWUP = "Would you make a judgment call now, or pause until you get input?";

/** The seeded sides' traits: Alex's [5,4,2,1,5,4] and Juan's [4,5,1,2,4,5], as their tags. */
const ALEX_TRAITS = ["Decisive", "Strategic", "Balanced", "Methodical", "Assertive", "Consistent"];
const JUAN_TRAITS = ["Collaborative", "Adaptive", "Scheduled", "Structured", "Receptive", "Responsive"];

/** The demo's accounts and who is signed in, as saved; null until something signs in or up. */
async function savedAuth(page: Page): Promise<{ session: Record<string, unknown> | null; accounts: Record<string, unknown>[] } | null> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("hireable.demo.auth") ?? "null"));
}

/** A side's saved answers, 1–5 per trait: what the quiz writes and the portal reads. */
async function savedTraits(page: Page, side: "team" | "ind"): Promise<number[] | null> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), `hireable.demo.${side}.workStyle`);
}

/** Opens sign-up and fills every field for this account type (Create account is left to the test). */
async function fillSignUp(page: Page, who: Side, email: string) {
  await page.goto("/signup");
  await page.getByRole("button", { name: who.toggle }).click();
  await page.getByRole("textbox", { name: "Full name" }).fill(who.name);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: who.detail }).fill(who.value);
  await page.getByPlaceholder("Create a password").fill(PASSWORD);
}

/** A demo account's button on the log-in screen, by the person's name. */
const demoAccount = (page: Page, name: string) => page.getByRole("button", { name: new RegExp(`^${name}`) });
/** The three demo accounts the log-in screen offers. */
const DEMO_NAMES = ["Alex Rivera", "Juan Dela Cruz", "Hireable Admin"];
/** The border the picked demo account is drawn with (the primary blue); the mark has no ARIA state. */
const PICKED = "rgb(0, 122, 204)";

/** Only this demo account is drawn as picked — or, with null, none is. */
async function expectPicked(page: Page, name: string | null) {
  for (const n of DEMO_NAMES) {
    if (n === name) await expect(demoAccount(page, n)).toHaveCSS("border-color", PICKED);
    else await expect(demoAccount(page, n)).not.toHaveCSS("border-color", PICKED);
  }
}

/** Signs in as a demo account through the picker. */
async function signInAs(page: Page, name: string) {
  await page.goto("/login");
  await demoAccount(page, name).click();
  await page.getByRole("button", { name: "Sign in" }).click();
}

/**
 * Lets the clock run on from the pinned today. GSAP's ticker reads Date.now, so under the fixture's
 * fixed time every GSAP timeline stands still.
 */
async function letTimeRun(page: Page) {
  await page.clock.setSystemTime(NOW);
}

/**
 * Waits out the splash that covers every onboarding page for 4.2 s after it hydrates: first for it
 * to be drawn (reduced motion sets it straight to full opacity), then for it to go, so a slow
 * hydration doesn't eat into the wait for its timer.
 */
async function waitOutSplash(page: Page) {
  const splash = page.getByRole("status").filter({ hasText: "Loading…" });
  await expect(splash).toHaveCSS("opacity", "1");
  await expect(splash).toBeHidden();
}

/** Opens a side's onboarding with the clock running. */
async function openOnboarding(page: Page, quiz: "client" | "talent") {
  await letTimeRun(page);
  await page.goto(`/onboarding/${quiz}`);
}

/** A first run's intro — its title and no traits to keep — then Start quiz. */
async function startFirstQuiz(page: Page, title: string) {
  await waitOutSplash(page);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("Your current traits", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Keep my current traits" })).toHaveCount(0);
  await page.getByRole("button", { name: "Start quiz" }).click();
  await expect(page.getByText("Question 1 of 6")).toBeVisible();
}

/** A retake's intro: its title, the traits the quiz would replace, and the two ways on. */
async function expectRetakeIntro(page: Page, title: string, traits: readonly string[]) {
  await waitOutSplash(page);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("Your current traits", { exact: true })).toBeVisible();
  for (const trait of traits) await expect(page.getByText(trait, { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Keep my current traits" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retake quiz" })).toBeVisible();
}

/** Answers question n by clicking an option; until then the send button (See Results on the last) is off. */
async function answerByClick(page: Page, n: number, option: string) {
  await expect(page.getByText(`Question ${n} of 6`)).toBeVisible();
  await expect(page.getByRole("button", { name: n === 6 ? "See Results" : "Send response" })).toBeDisabled();
  await page.getByRole("radio", { name: option }).click();
  await expect(page.getByRole("log")).toContainText(option);
}

/** Answers question n from the keyboard: arrows move the pick and the focus and wrap round, Home and End jump, Enter sends the third option. */
async function answerByKeyboard(page: Page, n: number, options: readonly string[]) {
  await expect(page.getByText(`Question ${n} of 6`)).toBeVisible();
  const option = (i: number) => page.getByRole("radio", { name: options[i] });
  await expect(option(0)).toBeEnabled();
  await option(0).focus();
  const moves = [["ArrowDown", 1], ["End", 3], ["Home", 0], ["ArrowUp", 3], ["ArrowUp", 2]] as const;
  for (const [key, to] of moves) {
    await page.keyboard.press(key);
    await expect(option(to)).toBeFocused();
    await expect(option(to)).toBeChecked();
  }
  // Picking with the arrows doesn't send; Enter does.
  await expect(page.getByText(`Question ${n} of 6`)).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("log")).toContainText(options[2]);
}

/** The client results: the profile's title, one tag per answer, and who it matches best. */
async function expectClientResults(page: Page, tags: readonly string[]) {
  await expect(page.getByRole("heading", { name: "Your Hiring Style Profile" })).toBeVisible();
  for (const tag of tags) await expect(page.getByText(tag, { exact: true })).toBeVisible();
  await expect(page.getByText("Your Ideal Independent Match")).toBeVisible();
}

test.describe("onboarding · signing up", () => {
  test("the role toggle swaps the job title for a company name, and Create account waits for a valid form", async ({ page }) => {
    await page.goto("/signup");
    const talent = page.getByRole("button", { name: TALENT.toggle });
    const team = page.getByRole("button", { name: TEAM.toggle });
    await expect(talent).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("textbox", { name: "Job title" })).toBeVisible();
    await team.click();
    await expect(team).toHaveAttribute("aria-pressed", "true");
    await expect(talent).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("textbox", { name: "Company name" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Job title" })).toHaveCount(0);

    const create = page.getByRole("button", { name: "Create account" });
    const email = page.getByRole("textbox", { name: "Email" });
    const badEmail = page.getByRole("alert").filter({ hasText: "That does not look like an email address." });
    await expect(create).toBeDisabled();
    await page.getByRole("textbox", { name: "Full name" }).fill(TEAM.name);
    await email.fill("rosa.lim");
    await expect(badEmail).toBeVisible();
    await email.fill("rosa.lim@example.test");
    await expect(badEmail).toHaveCount(0);
    await page.getByRole("textbox", { name: "Company name" }).fill(TEAM.value);
    // Five lower-case letters: short, no capital, no number.
    await page.getByPlaceholder("Create a password").fill("short");
    await expect(create).toBeDisabled();
    await page.getByPlaceholder("Create a password").fill(PASSWORD);
    await expect(create).toBeEnabled();
  });

  test("an email already in use is refused with the reason, and switching roles clears it", async ({ page }) => {
    await fillSignUp(page, TEAM, "alex@nairobisolutions.com");
    await page.getByRole("button", { name: "Create account" }).click();
    const taken = page.getByRole("alert").filter({ hasText: "An account already uses that email. Sign in instead, or use another address." });
    await expect(taken).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    expect((await savedAuth(page))?.session ?? null).toBeNull();
    await page.getByRole("button", { name: TALENT.toggle }).click();
    await expect(taken).toHaveCount(0);
  });
});

test.describe("onboarding · verifying the email", () => {
  for (const who of [TEAM, TALENT]) {
    test(`a new ${who.label} is created verified and signed in, and Start the Work Style Quiz opens the ${who.quiz} quiz`, async ({ page }) => {
      const email = `new.${who.role}@example.test`;
      await fillSignUp(page, who, email);
      await page.getByRole("button", { name: "Create account" }).click();
      await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
      await expect(page.getByText(`We sent a verification link to ${email}.`)).toBeVisible();
      await expect(page.getByText("Email verified")).toBeVisible();
      const auth = await savedAuth(page);
      expect(auth?.accounts).toContainEqual(expect.objectContaining({ email, name: who.name, role: who.role, detail: who.value, verified: true }));
      expect(auth?.session).toEqual({ email, name: who.name, role: who.role });
      await page.getByRole("button", { name: "Start the Work Style Quiz" }).click();
      await expect(page).toHaveURL(new RegExp(`/onboarding/${who.quiz}$`));
    });
  }
});

test.describe("onboarding · logging in", () => {
  test("picking a demo account fills the form and marks that account, and the mark follows the email", async ({ page }) => {
    await page.goto("/login");
    const email = page.getByRole("textbox", { name: "Email" });
    const signIn = page.getByRole("button", { name: "Sign in" });
    await expect(signIn).toBeDisabled();
    await demoAccount(page, "Juan Dela Cruz").click();
    await expect(email).toHaveValue("juandelacruz@gmail.com");
    await expect(page.getByPlaceholder("Your password")).not.toHaveValue("");
    await expect(signIn).toBeEnabled();
    await expectPicked(page, "Juan Dela Cruz");
    await demoAccount(page, "Alex Rivera").click();
    await expect(email).toHaveValue("alex@nairobisolutions.com");
    await expectPicked(page, "Alex Rivera");
    await email.fill("someone@example.test");
    await expectPicked(page, null);
  });

  test("a wrong password is refused with one message that never says which part is wrong, and typing clears it", async ({ page }) => {
    await page.goto("/login");
    const email = page.getByRole("textbox", { name: "Email" });
    const password = page.getByPlaceholder("Your password");
    const refused = page.getByRole("alert").filter({ hasText: "That email and password don't match an account. Check both and try again." });
    await email.fill("juandelacruz@gmail.com");
    await password.fill("not-his-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(refused).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await password.pressSequentially("1");
    await expect(refused).toHaveCount(0);
    // An address with no account gets the very same words.
    await email.fill("nobody@example.test");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(refused).toBeVisible();
    expect((await savedAuth(page))?.session ?? null).toBeNull();
  });
});

test.describe("onboarding · where logging in lands", () => {
  test.use({ seedOptions: { stores: { "ind.workStyle": [] } } });

  test("an account with no traits goes to its quiz first, and one with traits straight to its dashboard", async ({ page }) => {
    await signInAs(page, "Juan Dela Cruz");
    await expect(page).toHaveURL(/\/onboarding\/talent$/);
    expect((await savedAuth(page))?.session).toMatchObject({ email: "juandelacruz@gmail.com", role: "independent" });
    await signInAs(page, "Alex Rivera");
    await expect(page).toHaveURL(/\/team$/);
    await expect(page.getByRole("heading", { name: "Applicants" })).toBeVisible();
  });
});

test.describe("onboarding · a first quiz", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" }, seedOptions: { stores: { "team.workStyle": [] } } });

  test("a new Team Builder answers the six scenarios by click and by keyboard, sees their profile and lands on the team dashboard", async ({ page }) => {
    await letTimeRun(page);
    await fillSignUp(page, TEAM, "new.team@example.test");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByRole("button", { name: "Start the Work Style Quiz" }).click();
    await expect(page).toHaveURL(/\/onboarding\/client$/);
    await startFirstQuiz(page, "Hire a dedicated long-term partner, not a short-term professional.");
    await expect(page.getByRole("log")).toContainText(HIRO_GREETING);
    await answerByClick(page, 1, "Hold off until I have the full picture.");
    await answerByKeyboard(page, 2, CLIENT_Q2);
    await answerByClick(page, 3, "Reply as soon as I see it.");
    await answerByClick(page, 4, "Decide what's most urgent and start there.");
    await answerByClick(page, 5, "Look for a compromise that works for both sides.");
    await answerByClick(page, 6, "Async updates only when there's something worth sharing.");
    await expectClientResults(page, ["Cautious", "Consistent", "Immediate", "Prioritizing", "Mediating", "Independent"]);
    // Answer positions 4, 3, 1, 2, 3, 4, kept on the 1–5 scale the portal reads.
    expect(await savedTraits(page, "team")).toEqual([1, 2, 5, 4, 2, 1]);
    await page.getByRole("button", { name: "View dashboard" }).click();
    await expect(page).toHaveURL(/\/team$/);
    // Drawn from the saved answers once the portal hydrates; without them it would send them back to the quiz.
    await expect(page.getByRole("listitem").filter({ hasText: "Work Style Quiz" })).toContainText("Done");
  });
});

test.describe("onboarding · answering in your own words", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" }, seedOptions: { stores: { "ind.workStyle": [] } } });

  test("a typed answer takes over from a picked option, and one with nothing to go on earns a single follow-up", async ({ page }) => {
    await openOnboarding(page, "talent");
    await startFirstQuiz(page, "Looking for a lasting match? You're in the right place.");
    const other = page.getByRole("textbox", { name: "Other answer" });
    const send = page.getByRole("button", { name: "Send response" });
    const log = page.getByRole("log");
    await expect(send).toBeDisabled();
    await expect(page.getByRole("radio", { name: TALENT_Q1[0] })).toBeEnabled();
    await page.getByRole("radio", { name: TALENT_Q1[0] }).focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("radio", { name: TALENT_Q1[1] })).toBeChecked();
    // Typing drops the pick, so Enter sends the words, not the option.
    await other.fill("banana pancakes on a tuesday");
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
    await expect(send).toBeEnabled();
    await other.press("Enter");
    await expect(log).toContainText("banana pancakes on a tuesday");
    await expect(log).not.toContainText(TALENT_Q1[1]);
    await expect(log).toContainText(TALENT_Q1_FOLLOWUP);
    await expect(page.getByText("Question 1 of 6")).toBeVisible();
    // A reply no clearer moves the quiz on anyway, read at the middle of the scale: one follow-up only.
    await other.fill("still pancakes");
    await other.press("Enter");
    await expect(page.getByText("Question 2 of 6")).toBeVisible();
    await expect(log).toContainText("You stay balanced and communicative. Got it.");
    await expect(log.getByText(TALENT_Q1_FOLLOWUP)).toHaveCount(1);
  });

  // The intro's exit used to play with reduced motion too, and stood still with the clock.
  test("with reduced motion, Start quiz leads on without waiting for an animation", async ({ page }) => {
    await page.goto("/onboarding/talent");
    await startFirstQuiz(page, "Looking for a lasting match? You're in the right place.");
  });
});

test.describe("onboarding · retaking the quiz", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("a returning Independent is shown their current traits, and keeping them goes back to the dashboard unchanged", async ({ page }) => {
    await openOnboarding(page, "talent");
    await expectRetakeIntro(page, "Has the way you work changed?", JUAN_TRAITS);
    await page.getByRole("link", { name: "Keep my current traits" }).click();
    await expect(page).toHaveURL(/\/independent$/);
    await expect(page.getByText("Your work style", { exact: true })).toBeVisible();
    for (const trait of JUAN_TRAITS) await expect(page.getByText(trait, { exact: true })).toBeVisible();
    expect(await savedTraits(page, "ind")).toEqual([4, 5, 1, 2, 4, 5]);
  });

  test("retaking, the assistant welcomes them back instead of introducing itself, and the old traits stay until the end", async ({ page }) => {
    await openOnboarding(page, "client");
    await expectRetakeIntro(page, "Has the way you run your team changed?", ALEX_TRAITS);
    await page.getByRole("button", { name: "Retake quiz" }).click();
    const log = page.getByRole("log");
    await expect(log).toContainText(HIRO_WELCOME_BACK);
    await expect(log).not.toContainText("I'm Hiro");
    await answerByClick(page, 1, "Approve it and keep things moving.");
    await expect(page.getByText("Question 2 of 6")).toBeVisible();
    expect(await savedTraits(page, "team")).toEqual([5, 4, 2, 1, 5, 4]);
  });
});
