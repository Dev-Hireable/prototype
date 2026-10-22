import { EXPERIENCE_LEVELS } from "@/lib/contract/job-types";
import type { PlannedTask } from "@/lib/demo/tasks";
import { ROLE_CATALOGUE, type CatalogueRole, type MonthlyRange } from "@/lib/team/role-catalogue";
import { independents } from "@/lib/team/data";
import type { Independent } from "@/lib/team/data";
import { forTrial, hasRates, isLevel, proRata, rateAt, type RateBasis } from "@/lib/team/rates";

export { TEMPLATE_CATEGORIES, type TemplateCategory } from "@/lib/team/role-catalogue";

/** The wizard's experience levels; the first entry is the empty prompt. */
export const LEVELS = ["Select experience level", ...EXPERIENCE_LEVELS];
const [, BEGINNER, INTERMEDIATE, ADVANCED] = LEVELS;

/** Step one takes 1 to 5 skills; a template fills in its first five, the role's core ones. */
const MAX_SKILLS = 5;

/**
 * A starting point for the Create Role wizard: a role from the catalogue (its description, skills
 * and published rates), the experience level it usually asks for, and for the most-hired roles one
 * example trial task. Picking one fills in the role's name, description and skills, plus that task
 * on a trial; every field stays editable.
 */
export type RoleTemplate = Omit<CatalogueRole, "skills"> & {
  /** What the Skills field gets: the role's first MAX_SKILLS skills. */
  skills: CatalogueRole["skills"];
  /** The role's other skills, shown with the template but not filled in. */
  moreSkills: CatalogueRole["skills"];
  /** Extra words the Role field matches on while typing ("VA", "BDR", "frontend"…). */
  keywords: string[];
  /** The level it usually asks for: the suggested pay's level until the Team Builder picks one. */
  level: string;
  /** TB-025 — one example trial task, a measurable deliverable due by week. None when the catalogue role has no plan yet. */
  task: PlannedTask | null;
  /** Leads the unfiltered list. */
  popular?: boolean;
};

type Extra = Pick<RoleTemplate, "keywords" | "level" | "task" | "popular">;

/** What Hireable adds to the most-hired catalogue roles, by title: search words, the usual level, and an example trial task. */
const EXTRAS: Record<string, Extra> = {
  "Virtual Assistant": {
    keywords: ["va", "admin", "assistant", "administrative"],
    level: INTERMEDIATE,
    popular: true,
    task: { title: "Take over inbox triage for two team members", week: 1, priority: "high" },
  },
  "Executive Assistant": {
    keywords: ["ea", "assistant", "personal assistant", "chief of staff"],
    level: ADVANCED,
    task: { title: "Take over the founder's calendar and inbox", week: 1, priority: "high" },
  },
  "Customer Support Representative": {
    keywords: ["csr", "customer service", "support", "help desk", "chat support"],
    level: BEGINNER,
    popular: true,
    task: { title: "Handle the email and chat queue during your shift", week: 1, priority: "high", description: "First response in under 2 hours." },
  },
  "Data Entry Specialist": {
    keywords: ["data", "encoder", "admin", "records"],
    level: BEGINNER,
    task: { title: "Enter 1,500 records from the source files into the CRM", week: 4, priority: "high", description: "Verified at 99% accuracy." },
  },
  "Sales Development Representative": {
    keywords: ["sdr", "bdr", "business development", "appointment setter", "lead generation", "outbound"],
    level: INTERMEDIATE,
    popular: true,
    task: { title: "Build a list of 200 qualified prospects", week: 1, priority: "high", description: "In our target segment." },
  },
  "Sales Manager": {
    keywords: ["sales", "account executive", "closer", "sales lead", "head of sales"],
    level: ADVANCED,
    popular: true,
    task: { title: "Take ownership of the current pipeline", week: 1, priority: "high" },
  },
  "Account Manager": {
    keywords: ["client success", "customer success", "account", "retention", "renewals"],
    level: INTERMEDIATE,
    task: { title: "Take over 15 client accounts", week: 1, priority: "high" },
  },
  "Social Media Manager": {
    keywords: ["social media", "smm", "community manager", "content creator", "instagram", "tiktok"],
    level: INTERMEDIATE,
    popular: true,
    task: { title: "Build a 30-day content calendar", week: 1, priority: "high", description: "Instagram, LinkedIn and Facebook." },
  },
  "Digital Marketing Specialist": {
    keywords: ["marketing", "performance marketing", "paid ads", "ppc", "growth"],
    level: INTERMEDIATE,
    task: { title: "Audit the Google and Meta ad accounts", week: 1, priority: "high" },
  },
  "Content Writer": {
    keywords: ["writer", "copywriter", "blog", "content", "editor"],
    level: INTERMEDIATE,
    task: { title: "Write and publish 6 SEO blog posts", week: 5, priority: "high", description: "1,200+ words each, from our topic list, edited to our style guide." },
  },
  "SEO Specialist": {
    keywords: ["seo", "search", "organic", "keyword"],
    level: INTERMEDIATE,
    task: { title: "Deliver a technical SEO audit with a prioritized fix list", week: 1, priority: "high" },
  },
  "Graphic Designer": {
    keywords: ["designer", "graphics", "visual", "brand", "creative"],
    level: INTERMEDIATE,
    popular: true,
    task: { title: "Design 15 social media templates", week: 2, priority: "high", description: "On-brand, with editable source files in Figma or Canva." },
  },
  "Video Editor": {
    keywords: ["video", "editor", "reels", "youtube", "motion"],
    level: INTERMEDIATE,
    task: { title: "Edit 12 short-form videos for Reels and TikTok", week: 5, priority: "high", description: "Under 60 seconds each." },
  },
  "UI/UX Designer": {
    keywords: ["ux", "ui", "product designer", "figma", "web design"],
    level: ADVANCED,
    task: { title: "Map the current onboarding journey", week: 2, priority: "high" },
  },
  "Front-End Developer": {
    keywords: ["developer", "frontend", "front end", "react", "web developer", "software engineer", "programmer"],
    level: ADVANCED,
    task: { title: "Build the first backlog feature", week: 6, priority: "high", description: "React and TypeScript, shipped to production through code review." },
  },
  "WordPress Developer": {
    keywords: ["wordpress", "web developer", "website", "shopify", "cms"],
    level: INTERMEDIATE,
    task: { title: "Rebuild the homepage and two landing pages from Figma", week: 4, priority: "high" },
  },
  "Bookkeeper": {
    keywords: ["accounting", "accountant", "finance", "bookkeeping", "quickbooks", "xero"],
    level: INTERMEDIATE,
    task: { title: "Reconcile last quarter's bank and card accounts", week: 2, priority: "high" },
  },
  "Project Manager": {
    keywords: ["pm", "project coordinator", "operations", "scrum", "delivery"],
    level: ADVANCED,
    task: { title: "Build the plan and timeline for the live project", week: 1, priority: "high" },
  },
};

export const ROLE_TEMPLATES: RoleTemplate[] = ROLE_CATALOGUE.map((role) => {
  const extra: Extra = EXTRAS[role.title] ?? { keywords: [], level: INTERMEDIATE, task: null };
  return { ...role, ...extra, skills: role.skills.slice(0, MAX_SKILLS), moreSkills: role.skills.slice(MAX_SKILLS) };
});

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

/* --------------------------------------------------------- suggested pay -- */

export const levelName = (level: string) => level.replace(/\s*\(.*\)$/, "");

export type RateSuggestion = {
  /** What the budget step suggests: the published range at the role's level, a part-time role's share of it when `hours` is set. */
  min: number;
  max: number;
  /** The same range for a full working week: what the Independents' own monthly rates compare with. */
  fullTime: MonthlyRange;
  /** The template whose rates it reads, and how the role was matched to it. */
  guide: RoleTemplate;
  matched: "template" | "title" | "skills";
  /** The published figure it starts from, and the level that figure covers (null: every level). */
  basis: RateBasis;
  /** The role's level, when no source published a figure for it and the nearest band was scaled to it. */
  scaledTo?: string;
  /** A part-time role's hours a week. */
  hours?: number;
  /** A trial's length in working days: `min` and `max` are then for the whole trial, the monthly range for each month of it. */
  trialDays?: number;
  /** Independents on Hireable doing this kind of work, with what they actually charge. */
  peers: { slug: string; name: string; role: string; level: string; rate: number; shared: string[] }[];
};

const withRates = (t: RoleTemplate) => hasRates(t.rates);
const sameSkill = (wanted: Set<string>) => (s: string) => wanted.has(s.toLowerCase());

/** The template the role's rates come from: the one in use, else the one the title names, else the one sharing the most skills. */
function guideFor(role: { title: string; skills: string[]; template: RoleTemplate | null }) {
  if (role.template) return { guide: role.template, matched: "template" as const };
  let byTitle: RoleTemplate | null = null;
  let best = 1; // keywords (2) or title words (3) — a skill-only hit doesn't name the role
  for (const t of ROLE_TEMPLATES.filter(withRates)) {
    const s = score(t, role.title);
    if (s > best) [byTitle, best] = [t, s];
  }
  if (byTitle) return { guide: byTitle, matched: "title" as const };
  const wanted = sameSkill(new Set(role.skills.map((s) => s.toLowerCase())));
  const bySkills = ROLE_TEMPLATES.filter(withRates)
    .map((t) => ({ t, n: [...t.skills, ...t.moreSkills].filter(wanted).length }))
    .sort((a, b) => b.n - a.n)[0];
  return { guide: bySkills && bySkills.n >= 2 ? bySkills.t : null, matched: "skills" as const };
}

/** The Independents on Hireable with a skill the role asks for, or the same role, at the monthly rate on their profile. */
function peersOf(role: { title: string; skills: string[] }, pool: Independent[]): RateSuggestion["peers"] {
  const wanted = sameSkill(new Set(role.skills.map((s) => s.toLowerCase())));
  const titleWords = wordsOf(role.title);
  const sameRole = (r: string) => titleWords.length > 0 && titleWords.every((w) => wordsOf(r).some((x) => x.startsWith(w)));
  return pool
    .map((p) => ({ slug: p.slug, name: p.name, role: p.role, level: p.level, rate: Number(p.rate.replace(/[^0-9.]/g, "")) || 0, shared: p.skills.filter(wanted) }))
    .filter((p) => p.rate > 0 && (p.shared.length > 0 || sameRole(p.role)));
}

/**
 * The budget step's suggested pay, and what backs it: a template's published market rates at the
 * chosen experience level (src/lib/team/rates.ts), a part-time role's share of them for its hours,
 * or a trial's pay for the whole of it (`trialDays`: the monthly range for each month of the trial),
 * next to the Independents on Hireable with matching skills or the same role. Null until step one
 * says enough to match a template that has rates.
 */
export function suggestRange(role: { title: string; skills: string[]; level: string; template: RoleTemplate | null; hours?: number; trialDays?: number }, pool: Independent[] = independents): RateSuggestion | null {
  const { guide, matched } = guideFor(role);
  const at = guide ? rateAt(guide.rates, isLevel(role.level) ? role.level : guide.level) : null;
  if (!guide || !at) return null;
  const range = role.trialDays ? forTrial(at.range, role.trialDays) : proRata(at.range, role.hours);
  return { ...range, fullTime: at.range, guide, matched, basis: at.basis, scaledTo: at.scaledTo, hours: role.hours, trialDays: role.trialDays, peers: peersOf(role, pool) };
}
