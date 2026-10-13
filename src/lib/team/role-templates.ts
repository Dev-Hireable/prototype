import { EXPERIENCE_LEVELS } from "@/lib/contract/job-types";
import type { PlannedTask } from "@/lib/demo/tasks";
import { ROLE_CATALOGUE, type CatalogueRole, type MonthlyRange } from "@/lib/team/role-catalogue";
import { independents } from "@/lib/team/data";
import type { Independent } from "@/lib/team/data";

export { TEMPLATE_CATEGORIES, type TemplateCategory } from "@/lib/team/role-catalogue";

/** The wizard's experience levels; the first entry is the empty prompt. */
export const LEVELS = ["Select experience level", ...EXPERIENCE_LEVELS];
const [, BEGINNER, INTERMEDIATE, ADVANCED, EXPERT] = LEVELS;

/** Step one takes 1 to 5 skills; a template fills in its first five, the role's core ones. */
const MAX_SKILLS = 5;

/**
 * A starting point for the Create Role wizard: a role from the catalogue (its description,
 * skills and rates), the experience level it usually asks for, and — for the most-hired roles —
 * the trial's tasks and length. Picking one fills the form; every field stays editable.
 */
export type RoleTemplate = Omit<CatalogueRole, "skills"> & {
  /** What the Skills field gets: the role's first MAX_SKILLS skills. */
  skills: CatalogueRole["skills"];
  /** The role's other skills, shown with the template but not filled in. */
  moreSkills: CatalogueRole["skills"];
  /** Extra words the Role field matches on while typing ("VA", "BDR", "frontend"…). */
  keywords: string[];
  level: string;
  /** TB-024 — the trial's tasks: measurable deliverables for a trial of `days`, due by week. None when the catalogue role has no plan yet. */
  tasks: PlannedTask[];
  days: 30 | 60 | 90;
  /** The suggested monthly range in USD at `level`, from the catalogue's rates; null when no source published one. */
  budget: MonthlyRange | null;
  /** Leads the unfiltered list. */
  popular?: boolean;
};

type Extra = Pick<RoleTemplate, "keywords" | "level" | "days" | "tasks" | "popular">;

/** What Hireable adds to the most-hired catalogue roles, by title: search words, the usual level, and a trial plan. */
const EXTRAS: Record<string, Extra> = {
  "Virtual Assistant": {
    keywords: ["va", "admin", "assistant", "administrative"],
    level: INTERMEDIATE,
    days: 30,
    popular: true,
    tasks: [
      { title: "Take over inbox triage for two team members", week: 1, priority: "high" },
      { title: "Run both calendars, scheduling across time zones", week: 2, priority: "high" },
      { title: "Clean up and de-duplicate the client contact sheet", week: 2, priority: "medium", description: "About 300 rows. Merge duplicates and fill in missing emails." },
      { title: "Keep the shared task tracker current every working day", week: 6, priority: "medium" },
    ],
  },
  "Executive Assistant": {
    keywords: ["ea", "assistant", "personal assistant", "chief of staff"],
    level: ADVANCED,
    days: 30,
    tasks: [
      { title: "Take over the founder's calendar and inbox", week: 1, priority: "high" },
      { title: "Prepare a one-page brief before every external meeting", week: 2, priority: "high" },
      { title: "Send meeting follow-ups within 24 hours", week: 4, priority: "medium" },
      { title: "Deliver a written priorities summary every Friday", week: 6, priority: "medium" },
    ],
  },
  "Customer Support Representative": {
    keywords: ["csr", "customer service", "support", "help desk", "chat support"],
    level: BEGINNER,
    days: 30,
    popular: true,
    tasks: [
      { title: "Handle the email and chat queue during your shift", week: 1, priority: "high", description: "First response in under 2 hours." },
      { title: "Resolve 80% of tickets without escalation", week: 4, priority: "high" },
      { title: "Keep customer satisfaction at 4.5/5 or higher", week: 6, priority: "medium" },
      { title: "Draft 5 help-centre answers from repeat questions", week: 6, priority: "low" },
    ],
  },
  "Data Entry Specialist": {
    keywords: ["data", "encoder", "admin", "records"],
    level: BEGINNER,
    days: 30,
    tasks: [
      { title: "Remove duplicates from the existing sheet", week: 2, priority: "medium" },
      { title: "Enter 1,500 records from the source files into the CRM", week: 4, priority: "high", description: "Verified at 99% accuracy." },
      { title: "Document the steps so the process can be repeated", week: 6, priority: "low" },
    ],
  },
  "Sales Development Representative": {
    keywords: ["sdr", "bdr", "business development", "appointment setter", "lead generation", "outbound"],
    level: INTERMEDIATE,
    days: 30,
    popular: true,
    tasks: [
      { title: "Build a list of 200 qualified prospects", week: 1, priority: "high", description: "In our target segment." },
      { title: "Run a multi-touch outreach sequence", week: 3, priority: "high", description: "Calls, email and LinkedIn, with every touch logged in HubSpot." },
      { title: "Book 10 qualified discovery calls", week: 6, priority: "high" },
    ],
  },
  "Sales Manager": {
    keywords: ["sales", "account executive", "closer", "sales lead", "head of sales"],
    level: ADVANCED,
    days: 30,
    popular: true,
    tasks: [
      { title: "Take ownership of the current pipeline", week: 1, priority: "high" },
      { title: "Run 15 discovery calls", week: 4, priority: "high" },
      { title: "Move 5 opportunities to proposal stage", week: 5, priority: "medium" },
      { title: "Deliver a pipeline review with a forecast and a playbook", week: 6, priority: "medium", description: "A playbook the reps can follow." },
    ],
  },
  "Account Manager": {
    keywords: ["client success", "customer success", "account", "retention", "renewals"],
    level: INTERMEDIATE,
    days: 30,
    tasks: [
      { title: "Take over 15 client accounts", week: 1, priority: "high" },
      { title: "Run a check-in with every account", week: 2, priority: "high", description: "Log account health in HubSpot after each one." },
      { title: "Find 3 renewal or upsell opportunities, with a plan for each", week: 6, priority: "medium" },
    ],
  },
  "Social Media Manager": {
    keywords: ["social media", "smm", "community manager", "content creator", "instagram", "tiktok"],
    level: INTERMEDIATE,
    days: 30,
    popular: true,
    tasks: [
      { title: "Build a 30-day content calendar", week: 1, priority: "high", description: "Instagram, LinkedIn and Facebook." },
      { title: "Publish 20 posts with on-brand graphics", week: 5, priority: "high" },
      { title: "Reply to comments within a day", week: 6, priority: "medium" },
      { title: "Report reach and engagement growth", week: 6, priority: "medium" },
    ],
  },
  "Digital Marketing Specialist": {
    keywords: ["marketing", "performance marketing", "paid ads", "ppc", "growth"],
    level: INTERMEDIATE,
    days: 30,
    tasks: [
      { title: "Audit the Google and Meta ad accounts", week: 1, priority: "high" },
      { title: "Relaunch two campaigns with a test plan", week: 2, priority: "high" },
      { title: "Send two email campaigns", week: 4, priority: "medium" },
      { title: "Cut cost per lead by 15%, or show why not", week: 6, priority: "high", description: "With a results report every week." },
    ],
  },
  "Content Writer": {
    keywords: ["writer", "copywriter", "blog", "content", "editor"],
    level: INTERMEDIATE,
    days: 30,
    tasks: [
      { title: "Refresh 3 existing landing pages", week: 3, priority: "medium" },
      { title: "Write and publish 6 SEO blog posts", week: 5, priority: "high", description: "1,200+ words each, from our topic list, edited to our style guide." },
      { title: "Draft one customer case study", week: 6, priority: "medium" },
    ],
  },
  "SEO Specialist": {
    keywords: ["seo", "search", "organic", "keyword"],
    level: INTERMEDIATE,
    days: 30,
    tasks: [
      { title: "Deliver a technical SEO audit with a prioritized fix list", week: 1, priority: "high" },
      { title: "Set up a weekly ranking and organic traffic report", week: 2, priority: "low" },
      { title: "Fix the top 10 on-page issues", week: 3, priority: "high" },
      { title: "Map 30 target keywords to pages", week: 4, priority: "medium" },
    ],
  },
  "Graphic Designer": {
    keywords: ["designer", "graphics", "visual", "brand", "creative"],
    level: INTERMEDIATE,
    days: 30,
    popular: true,
    tasks: [
      { title: "Design 15 social media templates", week: 2, priority: "high", description: "On-brand, with editable source files in Figma or Canva." },
      { title: "Design 5 ad creatives in three sizes each", week: 4, priority: "high" },
      { title: "Design one sales presentation", week: 6, priority: "medium" },
    ],
  },
  "Video Editor": {
    keywords: ["video", "editor", "reels", "youtube", "motion"],
    level: INTERMEDIATE,
    days: 30,
    tasks: [
      { title: "Set up a reusable intro, outro and caption style", week: 1, priority: "medium" },
      { title: "Cut one 10-minute webinar into 5 captioned clips", week: 3, priority: "medium" },
      { title: "Edit 12 short-form videos for Reels and TikTok", week: 5, priority: "high", description: "Under 60 seconds each." },
    ],
  },
  "UI/UX Designer": {
    keywords: ["ux", "ui", "product designer", "figma", "web design"],
    level: ADVANCED,
    days: 60,
    tasks: [
      { title: "Map the current onboarding journey", week: 2, priority: "high" },
      { title: "Run 5 user interviews", week: 4, priority: "high" },
      { title: "Deliver wireframes and a high-fidelity Figma prototype", week: 9, priority: "high" },
      { title: "Hand off specs the developers can build from", week: 12, priority: "medium" },
    ],
  },
  "Front-End Developer": {
    keywords: ["developer", "frontend", "front end", "react", "web developer", "software engineer", "programmer"],
    level: ADVANCED,
    days: 60,
    tasks: [
      { title: "Fix 10 open UI bugs", week: 3, priority: "medium" },
      { title: "Build the first backlog feature", week: 6, priority: "high", description: "React and TypeScript, shipped to production through code review." },
      { title: "Build the second backlog feature", week: 11, priority: "high" },
      { title: "Add tests for the code you touch", week: 12, priority: "medium" },
    ],
  },
  "WordPress Developer": {
    keywords: ["wordpress", "web developer", "website", "shopify", "cms"],
    level: INTERMEDIATE,
    days: 30,
    tasks: [
      { title: "Update and audit every plugin", week: 1, priority: "medium" },
      { title: "Rebuild the homepage and two landing pages from Figma", week: 4, priority: "high" },
      { title: "Get Core Web Vitals into the green", week: 5, priority: "high" },
      { title: "Document how the team can edit each page", week: 6, priority: "low" },
    ],
  },
  "Bookkeeper": {
    keywords: ["accounting", "accountant", "finance", "bookkeeping", "quickbooks", "xero"],
    level: INTERMEDIATE,
    days: 30,
    tasks: [
      { title: "Reconcile last quarter's bank and card accounts", week: 2, priority: "high" },
      { title: "Clear the backlog of uncategorized transactions", week: 3, priority: "medium" },
      { title: "Send and chase this month's invoices", week: 4, priority: "medium" },
      { title: "Deliver a month-end report with a profit and loss summary", week: 6, priority: "high" },
    ],
  },
  "Project Manager": {
    keywords: ["pm", "project coordinator", "operations", "scrum", "delivery"],
    level: ADVANCED,
    days: 30,
    tasks: [
      { title: "Build the plan and timeline for the live project", week: 1, priority: "high" },
      { title: "Run weekly status meetings with written updates", week: 6, priority: "medium" },
      { title: "Keep the task board and a risk log current", week: 6, priority: "low" },
      { title: "Deliver the next milestone on time", week: 6, priority: "high" },
    ],
  },
};

/** Which of the catalogue's rate bands a level reads: Expert has none of its own, so it scales up from senior. */
const BAND: Record<string, "entry" | "mid" | "senior"> = { [BEGINNER]: "entry", [INTERMEDIATE]: "mid", [ADVANCED]: "senior", [EXPERT]: "senior" };

/** A role's published range at a level, or null when the catalogue has none for it. */
const publishedAt = (rates: CatalogueRole["rates"], level: string) => (level === EXPERT ? null : (rates[BAND[level]] ?? null));

export const ROLE_TEMPLATES: RoleTemplate[] = ROLE_CATALOGUE.map((role) => {
  const extra: Extra = EXTRAS[role.title] ?? { keywords: [], level: INTERMEDIATE, days: 30, tasks: [] };
  return {
    ...role,
    ...extra,
    skills: role.skills.slice(0, MAX_SKILLS),
    moreSkills: role.skills.slice(MAX_SKILLS),
    budget: publishedAt(role.rates, extra.level) ?? role.rates.all ?? role.rates.mid ?? role.rates.entry ?? role.rates.senior ?? null,
  };
});

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

/** "$600 – $1,000 /month", or "$1,849 /month" for a single published figure. */
export const rangeText = (r: MonthlyRange) => `${r.min === r.max ? money(r.min) : `${money(r.min)} – ${money(r.max)}`} /month`;

/** The template's suggested range as the library shows it, or a note that none was published. */
export const templateRange = (t: RoleTemplate) => (t.budget ? rangeText(t.budget) : "No published rate");

const wordsOf = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/**
 * How well a template answers what was typed: 3 when every typed word starts a word of the title,
 * 2 when the keywords are needed too, 1 for a skill match, 0 for none. Matching word starts rather
 * than any substring keeps short queries honest — "pm" finds Project Manager, not "development",
 * and "va" finds Virtual Assistant, not "Canva".
 */
function score(t: RoleTemplate, query: string) {
  const words = wordsOf(query);
  if (words.length === 0) return 0;
  const title = wordsOf(t.title);
  const all = [...title, ...t.keywords.flatMap(wordsOf)];
  const covered = (pool: string[]) => words.every((w) => pool.some((p) => p.startsWith(w)));
  if (covered(title)) return 3;
  if (covered(all)) return 2;
  const q = query.trim().toLowerCase();
  return q.length >= 4 && [...t.skills, ...t.moreSkills].some((s) => s.toLowerCase().includes(q)) ? 1 : 0;
}

/** Templates matching what's been typed, best matches first; everything when the query is empty. */
export function searchTemplates(query: string, pool: RoleTemplate[] = ROLE_TEMPLATES) {
  if (!query.trim()) return pool;
  return pool
    .map((t) => ({ t, s: score(t, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.t);
}

/* ------------------------------------------------------ suggested budget -- */

/** Rates move with experience; with no published range at a level, the template's own is scaled to it. */
const LEVEL_FACTOR: Record<string, number> = { [BEGINNER]: 0.75, [INTERMEDIATE]: 1, [ADVANCED]: 1.35, [EXPERT]: 1.7 };
const round50 = (n: number) => Math.round(n / 50) * 50;
export const levelName = (level: string) => level.replace(/\s*\(.*\)$/, "");

export type RateSuggestion = {
  min: number;
  max: number;
  /** The template whose rates it reads, and how the role was matched to it. */
  guide: RoleTemplate & { budget: MonthlyRange };
  matched: "template" | "title" | "skills";
  /** The level the range is for, when it isn't the template's own. */
  adjustedFor?: string;
  /** True when no source published a range at that level, so it was scaled from the template's. */
  scaled: boolean;
  /** Independents on Hireable doing this kind of work, with what they actually charge. */
  peers: { name: string; role: string; level: string; rate: number; shared: string[] }[];
};

/** The guide's range at a level: the published one when there is one, else its own scaled to the level. */
function rangeAt(guide: RateSuggestion["guide"], level: string) {
  if (level === guide.level) return { ...guide.budget, scaled: false };
  const published = publishedAt(guide.rates, level);
  if (published) return { ...published, scaled: false };
  const factor = LEVEL_FACTOR[level] / LEVEL_FACTOR[guide.level];
  return { min: round50(guide.budget.min * factor), max: round50(guide.budget.max * factor), scaled: true };
}

const hasBudget = (t: RoleTemplate | null): t is RateSuggestion["guide"] => !!t?.budget;
const sameSkill = (wanted: Set<string>) => (s: string) => wanted.has(s.toLowerCase());

/** The template the role's rates come from: the one in use, else the one the title names, else the one sharing the most skills. */
function guideFor(role: { title: string; skills: string[]; template: RoleTemplate | null }) {
  if (role.template) return { guide: role.template, matched: "template" as const };
  let byTitle: RoleTemplate | null = null;
  let best = 1; // keywords (2) or title words (3) — a skill-only hit doesn't name the role
  for (const t of ROLE_TEMPLATES.filter(hasBudget)) {
    const s = score(t, role.title);
    if (s > best) [byTitle, best] = [t, s];
  }
  if (byTitle) return { guide: byTitle, matched: "title" as const };
  const wanted = sameSkill(new Set(role.skills.map((s) => s.toLowerCase())));
  const bySkills = ROLE_TEMPLATES.filter(hasBudget)
    .map((t) => ({ t, n: [...t.skills, ...t.moreSkills].filter(wanted).length }))
    .sort((a, b) => b.n - a.n)[0];
  return { guide: bySkills && bySkills.n >= 2 ? bySkills.t : null, matched: "skills" as const };
}

/**
 * The budget step's "Suggested range", and what backs it: a template's published rates at the
 * chosen experience level, next to the independents on Hireable with matching skills or the same
 * role. Null until step one says enough to match a template that has rates.
 */
export function suggestRange(role: { title: string; skills: string[]; level: string; template: RoleTemplate | null }, pool: Independent[] = independents): RateSuggestion | null {
  const { guide, matched } = guideFor(role);
  if (!hasBudget(guide)) return null;

  const level = LEVEL_FACTOR[role.level] ? role.level : guide.level;
  const wanted = sameSkill(new Set(role.skills.map((s) => s.toLowerCase())));
  const titleWords = wordsOf(role.title);
  const sameRole = (r: string) => titleWords.length > 0 && titleWords.every((w) => wordsOf(r).some((x) => x.startsWith(w)));
  const peers = pool
    .map((p) => ({ name: p.name, role: p.role, level: p.level, rate: Number(p.rate.replace(/[^0-9.]/g, "")) || 0, shared: p.skills.filter(wanted) }))
    .filter((p) => p.rate > 0 && (p.shared.length > 0 || sameRole(p.role)));

  return { ...rangeAt(guide, level), guide, matched, adjustedFor: level !== guide.level ? level : undefined, peers };
}
