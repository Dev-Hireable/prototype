import { expect, test as base, type BrowserContext, type Locator, type Page } from "@playwright/test";
import seedFile from "./fixtures/deal.json";

/**
 * The E2E harness. Every test starts from the same contract (fixtures/deal.json): a trial between
 * Alex Rivera (Team Builder) and Juan Dela Cruz (Independent), a dozen work items across every
 * status, date combination and assignee, "today" pinned to Fri 25 Sep 2026. #1–#4 are the offer's
 * agreed tasks; #5–#12 were added during the trial, which a trial no longer allows (TB-064) — saved
 * data like that still loads and works.
 *
 * Seeding runs before the app's own scripts, once per test (a run id guards it), so a reload or a
 * second tab keeps what the test changed — persistence is tested for real, not re-seeded away.
 * Any console error or uncaught exception fails the test.
 */

/** 09:00 UTC on Fri 25 Sep 2026 — still the 25th in Manila, Los Angeles and at UTC+14. */
export const NOW = new Date("2026-09-25T09:00:00Z");
export const SEED = seedFile as unknown as { deal: { contract: { tasks: Record<string, unknown>[]; [k: string]: unknown }; [k: string]: unknown }; postings: unknown[] };

export type Portal = "team" | "independent" | "admin";

export const PATH: Record<Portal, string> = {
  team: "/team/independents/juan-dela-cruz",
  independent: "/independent/contracts/brand-designer",
  admin: "/admin/contracts/brand-designer",
};

/** A trial that ran 10 Aug – 18 Sep and was evaluated, its escrow paid out. */
export const EVALUATED = {
  started: "2026-08-10",
  ends: "2026-09-18",
  evaluations: [{ stars: 4, scores: [{ label: "Quality of work", value: 4 }], feedback: "A strong trial.", recommendation: "Hire full-time", date: "21 Sep 2026", tfp: 80 }],
  escrow: { released: 1600, refunded: 0 },
};

/**
 * The same contract as a full-time role since Mon 21 Sep, after that trial: where work is added.
 * A trial takes none — its tasks are the ones its signed offer agreed (TB-064) — so the specs that
 * add work run on this.
 */
export const ROLE = {
  contract: EVALUATED,
  deal: { conversion: { type: "full-time", salary: "$4,000", start: "2026-09-21", benefits: [], status: "accepted", sent: "21 Sep 2026", accepted: "21 Sep 2026" } },
};

type SeedOptions = {
  /** Replace the seeded work items. */
  tasks?: Record<string, unknown>[];
  /** Change the contract record (ends, ended…). */
  contract?: Record<string, unknown>;
  /** Change the deal itself (a post-trial offer: `conversion`). */
  deal?: Record<string, unknown>;
  /** Save this exact string as the deal (corrupt data). */
  raw?: string;
  /** No deal at all. */
  empty?: boolean;
  /** Disputes already on file. */
  disputes?: Record<string, unknown>[];
  /**
   * Other saved stores, by their key under `hireable.demo.` (`"team.roles"`, `"ind.payouts"`, …): set once
   * with the rest, so a reload keeps what the test changed.
   */
  stores?: Record<string, unknown>;
};

export async function seed(context: BrowserContext, opts: SeedOptions = {}) {
  const run = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const deal = structuredClone(SEED);
  if (opts.tasks) deal.deal.contract.tasks = opts.tasks;
  if (opts.contract) Object.assign(deal.deal.contract, opts.contract);
  if (opts.deal) Object.assign(deal.deal, opts.deal);
  const value = opts.raw ?? (opts.empty ? null : JSON.stringify(deal));
  const disputes = opts.disputes ? JSON.stringify(opts.disputes) : null;
  const stores = Object.entries(opts.stores ?? {}).map(([key, v]) => [`hireable.demo.${key}`, JSON.stringify(v)]);
  await context.addInitScript(
    ({ run, value, disputes, stores }) => {
      if (localStorage.getItem("hireable.e2e.run") === run) return;
      for (const k of Object.keys(localStorage)) if (k.startsWith("hireable.")) localStorage.removeItem(k);
      localStorage.setItem("hireable.e2e.run", run);
      localStorage.setItem("hireable.demo.team.workStyle", "[5,4,2,1,5,4]");
      localStorage.setItem("hireable.demo.ind.workStyle", "[4,5,1,2,4,5]");
      if (value !== null) localStorage.setItem("hireable.demo.deal", value);
      if (disputes !== null) localStorage.setItem("hireable.demo.disputes", disputes);
      for (const [k, v] of stores) localStorage.setItem(k, v);
    },
    { run, value, disputes, stores },
  );
}

/** A page with today pinned, console errors collected. */
async function prepare(page: Page, errors: string[]) {
  await page.clock.setFixedTime(NOW);
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
}

type Fixtures = {
  /** Console errors and uncaught exceptions seen on any page the test opened. */
  errors: string[];
  /** Seeds the contract before the first navigation (automatic). */
  seeded: void;
  /** A second tab in the same browser — the other portal, sharing the same saved data. */
  secondPage: () => Promise<Page>;
};

/** Per describe: `test.use({ seedOptions: { tasks: [] } })`. */
type Options = { seedOptions: SeedOptions };

export const test = base.extend<Fixtures & Options>({
  seedOptions: [{}, { option: true }],
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      await prepare(page, errors);
      await use(errors);
      expect(errors, "no console errors or uncaught exceptions").toEqual([]);
    },
    { auto: true },
  ],
  seeded: [
    async ({ context, seedOptions }, use) => {
      await seed(context, seedOptions);
      await use();
    },
    { auto: true },
  ],
  secondPage: async ({ context, errors }, use) => {
    await use(async () => {
      const p = await context.newPage();
      await prepare(p, errors);
      return p;
    });
  },
});

export { expect };

/* -------------------------------------------------------------- helpers */

export async function open(page: Page, portal: Portal, query = "") {
  await page.goto(`${PATH[portal]}${query}`);
  await expect(page.getByTestId("workspace")).toBeVisible();
}

/** The saved work items, straight from storage. */
export async function saved(page: Page): Promise<Record<string, Record<string, unknown>>> {
  const tasks = await page.evaluate(() => JSON.parse(localStorage.getItem("hireable.demo.deal") ?? "null")?.deal?.contract?.tasks ?? []);
  return Object.fromEntries((tasks as Record<string, unknown>[]).map((t) => [t.id as string, t]));
}

/** The deal as it's saved: the contract, the trial offer and any post-trial offer. */
export async function savedDeal(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("hireable.demo.deal") ?? "null")?.deal);
}

/** Any other saved store under `hireable.demo.` (`"team.profile"`, `"ind.payouts"`…), or null before its first save. */
export async function stored(page: Page, key: string) {
  return page.evaluate((k) => JSON.parse(localStorage.getItem(`hireable.demo.${k}`) ?? "null"), key);
}

export async function savedItem(page: Page, id: string) {
  return (await saved(page))[id];
}

/** A dispute as it's saved. */
export async function savedDispute(page: Page, id: string): Promise<Record<string, unknown> | undefined> {
  const all = await page.evaluate(() => JSON.parse(localStorage.getItem("hireable.demo.disputes") ?? "[]") as Record<string, unknown>[]);
  return all.find((d) => d.id === id);
}

/** The live contract's escrow as it's saved: what has been released and refunded from it. */
export async function savedEscrow(page: Page): Promise<{ released: number; refunded: number } | undefined> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("hireable.demo.deal") ?? "null")?.deal?.contract?.escrow);
}

/** The notifications a side has been sent. */
export async function notes(page: Page, side: "team" | "independent"): Promise<{ title: string; body: string; href: string; unread: boolean }[]> {
  return page.evaluate((s) => JSON.parse(localStorage.getItem("hireable.demo.live") ?? "{}")?.[s] ?? [], side);
}

/** A board card by its reference and name, as it's announced. */
export const card = (page: Page, name: string | RegExp) => page.getByTestId("board").getByRole("group", { name });

/** A board column by its heading. */
export const column = (page: Page, label: string) => page.getByRole("region", { name: new RegExp(`^${label},`) });

export const view = (page: Page, name: string) => page.getByRole("tab", { name, exact: true });

/** The project picker's button, by what it's showing: Open work, All work or a project's name. */
export const projectPicker = (page: Page, showing: string) => page.getByRole("button", { name: `Showing ${showing}. Change project` });

/** The toolbar's Filter button, matched by its start: while filters are on it's "Filter, 2 active". */
export const filterButton = (page: Page) => page.getByRole("button", { name: /^Filter/ });

/** A toast (status or alert) with this text — not the screen-reader announcer that repeats it. */
export const toast = (page: Page, text: string | RegExp) => page.getByRole("status").or(page.getByRole("alert")).filter({ hasText: text });

/** An item's panel: the sheet that slides in over the view. */
export const panel = (page: Page) => page.getByTestId("task-panel");

/**
 * Closes the item's sheet, which holds the focus and hides the view behind it while it's open.
 * Escape closes whatever is on top first — a date picker or menu inside the sheet — so it takes as
 * many presses as there are layers.
 */
export async function closePanel(page: Page) {
  for (let i = 0; i < 3 && (await panel(page).count()) > 0; i++) {
    await page.keyboard.press("Escape");
    await panel(page)
      .waitFor({ state: "detached", timeout: 1500 })
      .catch(() => {});
  }
  await expect(panel(page)).toHaveCount(0);
  await expect(page).not.toHaveURL(/[?&]task=/);
}

/**
 * Ticks one option in the toolbar's Filter menu and closes the menu again: a top-level option
 * ("Blocked only", "Show deleted instead"), or a group and the option in its submenu ("Status", "In progress").
 */
export async function tickFilter(page: Page, ...path: [option: string] | [group: string, option: string]) {
  await filterButton(page).click();
  if (path.length === 2) await page.getByRole("menuitem", { name: path[0] }).click();
  await page.getByRole("menuitemcheckbox", { name: path[path.length - 1] }).click();
  // One Escape per open menu: the group's submenu first, then the Filter menu.
  for (let i = 0; i < path.length; i++) await page.keyboard.press("Escape");
}

/** The E2E seam: call this portal's repository directly, as a client with no UI would. */
export async function api(page: Page, method: string, ...args: unknown[]) {
  // The seam loads after the workspace mounts (a dynamic import), so wait for it.
  await page.waitForFunction(() => !!window.__hireable?.work);
  return page.evaluate(({ method, args }) => window.__hireable!.call(method, ...args), { method, args });
}

/** Make this tab's next saves slow and/or fail. */
export async function fault(page: Page, f: { op?: string; mode?: "fail" | "conflict"; latencyMs?: number; times?: number; message?: string }) {
  await page.waitForFunction(() => !!window.__hireable?.work);
  await page.evaluate((f) => window.__hireable!.fault.set(f), f);
}

/** Drag with the mouse, as a person would — native drag and drop. */
export async function drag(page: Page, from: Locator, to: Locator, opts: { targetY?: number; sourceX?: number } = {}) {
  await from.scrollIntoViewIfNeeded();
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  if (!a || !b) throw new Error("Couldn't find what to drag or where to drop it.");
  await from.dragTo(to, { sourcePosition: { x: opts.sourceX ?? a.width / 2, y: Math.min(20, a.height / 2) }, targetPosition: { x: b.width / 2, y: opts.targetY ?? Math.min(80, b.height - 10) } });
}

declare global {
  interface Window {
    __hireable?: {
      work: unknown;
      call: (method: string, ...args: unknown[]) => Promise<{ ok: true; value: unknown } | { ok: false; code: string; message: string }>;
      fault: { set: (f: unknown) => void; clear: () => void };
      snapshot: () => unknown;
    };
  }
}
