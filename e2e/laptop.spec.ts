import { expect, test } from "./fixtures";

// A 14" laptop: a 1280×720 screen at 150% scaling leaves the page about 1280×600 once the browser's
// toolbars take theirs. The app draws at its 90% laptop scale there (globals.css --ui-scale), and
// no page scrolls sideways or down — only what scrolls by nature: a kanban tracker with more
// columns than fit, and the timeline's axis.

const ROLE = { slug: "brand-designer", title: "Brand Designer", type: "trial", status: "Active", candidates: null, matched: null, interviews: null, offers: null, hired: null, updated: "25 Sep 2026", description: "Brand work.", budget: "$1,600.00 - $2,000.00 /mo", duration: "30 Days", experience: "Advanced (5–8 years)", skills: ["Branding"], expectation: "", attachment: "", tasks: [{ title: "Take over inbox triage", week: 1, priority: "high" }] };

const PAGES = [
  "/team", "/team/discover", "/team/discover/juan-dela-cruz", "/team/hire", "/team/hire/new", "/team/hire/roles", "/team/hire/offers", "/team/hire/interviews",
  "/team/independents", "/team/independents/juan-dela-cruz", "/team/independents/juan-dela-cruz?tab=overview", "/team/independents/juan-dela-cruz?tab=contract", "/team/independents/juan-dela-cruz?view=list", "/team/independents/juan-dela-cruz?view=calendar", "/team/independents/juan-dela-cruz?view=workload",
  "/team/payments", "/team/messages", "/team/profile/company", "/team/settings/notifications",
  "/independent", "/independent/jobs", "/independent/jobs/brand-designer", "/independent/jobs/applications/deal", "/independent/jobs/interviews", "/independent/contracts", "/independent/contracts/brand-designer", "/independent/contracts/brand-designer?tab=contract", "/independent/wallet", "/independent/profile",
  "/login", "/signup",
];

test.describe("on a 14\" laptop", () => {
  test.use({ viewport: { width: 1280, height: 600 } });

  test("nothing scrolls sideways or down that shouldn't", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/team/hire/roles");
    await page.evaluate((role) => {
      localStorage.setItem("hireable.demo.team.roles", JSON.stringify([role]));
      const s = JSON.parse(localStorage.getItem("hireable.demo.deal") ?? "{}");
      s.postings = [{ slug: role.slug, title: role.title, type: role.type, company: "Nairobi Solutions Inc.", rate: role.budget, rateRange: role.budget, level: role.experience, description: [role.description], skills: role.skills, expectation: "", duration: role.duration, posted: "Posted today", closes: "Open until filled", tasks: role.tasks }];
      localStorage.setItem("hireable.demo.deal", JSON.stringify(s));
    }, ROLE);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ui-scale").trim())).toBe(".9");

    const problems: string[] = [];
    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForTimeout(400);
      const found = await page.evaluate(() => {
        const out: string[] = [];
        const doc = document.documentElement;
        if (doc.scrollWidth > innerWidth + 1) out.push(`the page scrolls sideways (${doc.scrollWidth}px)`);
        if (Math.max(doc.scrollHeight, document.body.scrollHeight) > innerHeight + 1) out.push(`the page scrolls down (${doc.scrollHeight}px)`);
        for (const el of document.querySelectorAll("*")) {
          if (!/(auto|scroll)/.test(getComputedStyle(el).overflowX) || el.scrollWidth <= el.clientWidth + 1 || el.clientWidth < 40) continue;
          if (el.closest("[data-testid=timeline]")) continue;
          out.push(`${el.tagName.toLowerCase()}[${el.getAttribute("data-testid") ?? el.className.toString().slice(0, 60)}] scrolls sideways by ${el.scrollWidth - el.clientWidth}px`);
        }
        return out;
      });
      problems.push(...found.map((p) => `${path}: ${p}`));
    }
    expect(problems).toEqual([]);
  });
});
