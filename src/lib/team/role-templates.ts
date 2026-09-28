import { EXPERIENCE_LEVELS } from "@/lib/demo/job-types";
import type { PlannedTask } from "@/lib/demo/tasks";
import type { GENERAL_SKILLS } from "@/lib/portal/skills";
import { independents } from "@/lib/team/data";
import type { Independent } from "@/lib/team/data";

/** The wizard's experience levels; the first entry is the empty prompt. */
export const LEVELS = ["Select experience level", ...EXPERIENCE_LEVELS];
const [, BEGINNER, INTERMEDIATE, ADVANCED, EXPERT] = LEVELS;

export const TEMPLATE_CATEGORIES = ["Admin & Support", "Sales", "Marketing", "Design & Creative", "Engineering", "Finance & Operations"] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

/**
 * A starting point for the Create Role wizard: everything step one asks for, the trial's tasks, a
 * suggested monthly range and trial length. Picking one fills the form; every
 * field stays editable. Skills come from the picker's own catalogue so they show up as chips.
 */
export type RoleTemplate = {
  id: string;
  title: string;
  category: TemplateCategory;
  /** Extra words the Role field matches on while typing ("VA", "BDR", "frontend"…). */
  keywords: string[];
  description: string;
  skills: (typeof GENERAL_SKILLS)[number][];
  level: string;
  /** TB-024 — the trial's tasks: measurable deliverables for a trial of `days`, due by week. */
  tasks: PlannedTask[];
  days: 30 | 60 | 90;
  /** Suggested monthly range in USD, in line with remote rates for the role. */
  budget: { min: number; max: number };
  /** Shown as a quick pick on step one. */
  popular?: boolean;
};

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: "virtual-assistant",
    title: "Virtual Assistant",
    category: "Admin & Support",
    keywords: ["va", "admin", "assistant", "administrative"],
    description:
      "Keep our day-to-day running smoothly: manage inboxes and calendars, schedule meetings across time zones, prepare documents, and keep trackers and records up to date so the team can focus on their core work.",
    skills: ["Virtual assistance", "Calendar management", "Email management", "Data entry", "Google Workspace"],
    level: INTERMEDIATE,
    tasks: [
      { title: "Take over inbox triage for two team members", week: 1, priority: "high" },
      { title: "Run both calendars, scheduling across time zones", week: 2, priority: "high" },
      { title: "Clean up and de-duplicate the client contact sheet", week: 2, priority: "medium", description: "About 300 rows. Merge duplicates and fill in missing emails." },
      { title: "Keep the shared task tracker current every working day", week: 6, priority: "medium" },
    ],
    days: 30,
    budget: { min: 600, max: 1000 },
    popular: true,
  },
  {
    id: "executive-assistant",
    title: "Executive Assistant",
    category: "Admin & Support",
    keywords: ["ea", "assistant", "personal assistant", "chief of staff"],
    description:
      "Be the right hand to our founder: own the calendar and inbox, prepare meeting briefs and follow-ups, coordinate travel, and keep projects and priorities moving between leadership and the team.",
    skills: ["Calendar management", "Email management", "Project management", "Communication", "Google Workspace"],
    level: ADVANCED,
    tasks: [
      { title: "Take over the founder's calendar and inbox", week: 1, priority: "high" },
      { title: "Prepare a one-page brief before every external meeting", week: 2, priority: "high" },
      { title: "Send meeting follow-ups within 24 hours", week: 4, priority: "medium" },
      { title: "Deliver a written priorities summary every Friday", week: 6, priority: "medium" },
    ],
    days: 30,
    budget: { min: 1000, max: 1600 },
  },
  {
    id: "customer-support",
    title: "Customer Support Representative",
    category: "Admin & Support",
    keywords: ["csr", "customer service", "support", "help desk", "chat support"],
    description:
      "Be the first voice our customers hear. Answer tickets and chats, solve account and billing questions, log issues clearly for the product team, and follow up until every customer has an answer.",
    skills: ["Customer service", "Communication", "Email management", "Problem solving", "Time management"],
    level: BEGINNER,
    tasks: [
      { title: "Handle the email and chat queue during your shift", week: 1, priority: "high", description: "First response in under 2 hours." },
      { title: "Resolve 80% of tickets without escalation", week: 4, priority: "high" },
      { title: "Keep customer satisfaction at 4.5/5 or higher", week: 6, priority: "medium" },
      { title: "Draft 5 help-centre answers from repeat questions", week: 6, priority: "low" },
    ],
    days: 30,
    budget: { min: 600, max: 950 },
    popular: true,
  },
  {
    id: "data-entry",
    title: "Data Entry Specialist",
    category: "Admin & Support",
    keywords: ["data", "encoder", "admin", "records"],
    description:
      "Keep our records accurate and up to date: enter and verify data across our spreadsheets and CRM, clean up duplicates, and flag anything that doesn't add up.",
    skills: ["Data entry", "Microsoft Excel", "Google Workspace", "Research", "Time management"],
    level: BEGINNER,
    tasks: [
      { title: "Remove duplicates from the existing sheet", week: 2, priority: "medium" },
      { title: "Enter 1,500 records from the source files into the CRM", week: 4, priority: "high", description: "Verified at 99% accuracy." },
      { title: "Document the steps so the process can be repeated", week: 6, priority: "low" },
    ],
    days: 30,
    budget: { min: 500, max: 800 },
  },
  {
    id: "sdr",
    title: "Sales Development Representative",
    category: "Sales",
    keywords: ["sdr", "bdr", "business development", "appointment setter", "lead generation", "outbound"],
    description:
      "Open doors for our sales team. Research target accounts, run cold outreach by phone, email and LinkedIn, qualify leads, and book discovery calls for our account executives.",
    skills: ["Lead generation", "Cold calling", "Sales prospecting", "HubSpot", "Communication"],
    level: INTERMEDIATE,
    tasks: [
      { title: "Build a list of 200 qualified prospects", week: 1, priority: "high", description: "In our target segment." },
      { title: "Run a multi-touch outreach sequence", week: 3, priority: "high", description: "Calls, email and LinkedIn, with every touch logged in HubSpot." },
      { title: "Book 10 qualified discovery calls", week: 6, priority: "high" },
    ],
    days: 30,
    budget: { min: 900, max: 1500 },
    popular: true,
  },
  {
    id: "sales-manager",
    title: "Sales Manager",
    category: "Sales",
    keywords: ["sales", "account executive", "closer", "sales lead", "head of sales"],
    description:
      "Own our pipeline from first touch to signed contract. Lead outbound and inbound deals, coach reps on discovery and closing, forecast accurately, and keep the CRM honest.",
    skills: ["Lead generation", "Cold calling", "Negotiation", "Account management", "Salesforce"],
    level: ADVANCED,
    tasks: [
      { title: "Take ownership of the current pipeline", week: 1, priority: "high" },
      { title: "Run 15 discovery calls", week: 4, priority: "high" },
      { title: "Move 5 opportunities to proposal stage", week: 5, priority: "medium" },
      { title: "Deliver a pipeline review with a forecast and a playbook", week: 6, priority: "medium", description: "A playbook the reps can follow." },
    ],
    days: 30,
    budget: { min: 1500, max: 2500 },
    popular: true,
  },
  {
    id: "account-manager",
    title: "Account Manager",
    category: "Sales",
    keywords: ["client success", "customer success", "account", "retention", "renewals"],
    description:
      "Look after our existing clients: run check-ins and business reviews, spot renewal and upsell opportunities, and make sure every account is healthy and heard.",
    skills: ["Account management", "Customer service", "Negotiation", "Communication", "HubSpot"],
    level: INTERMEDIATE,
    tasks: [
      { title: "Take over 15 client accounts", week: 1, priority: "high" },
      { title: "Run a check-in with every account", week: 2, priority: "high", description: "Log account health in HubSpot after each one." },
      { title: "Find 3 renewal or upsell opportunities, with a plan for each", week: 6, priority: "medium" },
    ],
    days: 30,
    budget: { min: 1000, max: 1700 },
  },
  {
    id: "social-media-manager",
    title: "Social Media Manager",
    category: "Marketing",
    keywords: ["social media", "smm", "community manager", "content creator", "instagram", "tiktok"],
    description:
      "Grow our brand on social. Plan and publish content across our channels, write captions, design simple graphics, engage with our community, and report on what's working.",
    skills: ["Social media marketing", "Content writing", "Canva", "Facebook Ads", "Marketing strategy"],
    level: INTERMEDIATE,
    tasks: [
      { title: "Build a 30-day content calendar", week: 1, priority: "high", description: "Instagram, LinkedIn and Facebook." },
      { title: "Publish 20 posts with on-brand graphics", week: 5, priority: "high" },
      { title: "Reply to comments within a day", week: 6, priority: "medium" },
      { title: "Report reach and engagement growth", week: 6, priority: "medium" },
    ],
    days: 30,
    budget: { min: 800, max: 1400 },
    popular: true,
  },
  {
    id: "digital-marketing",
    title: "Digital Marketing Specialist",
    category: "Marketing",
    keywords: ["marketing", "performance marketing", "paid ads", "ppc", "growth"],
    description:
      "Run our paid and owned channels end to end: plan campaigns, manage Google and Meta ads, send email campaigns, and report on leads and cost per acquisition every week.",
    skills: ["Digital marketing", "Google Ads", "Facebook Ads", "Email marketing", "SEO"],
    level: INTERMEDIATE,
    tasks: [
      { title: "Audit the Google and Meta ad accounts", week: 1, priority: "high" },
      { title: "Relaunch two campaigns with a test plan", week: 2, priority: "high" },
      { title: "Send two email campaigns", week: 4, priority: "medium" },
      { title: "Cut cost per lead by 15%, or show why not", week: 6, priority: "high", description: "With a results report every week." },
    ],
    days: 30,
    budget: { min: 1000, max: 1800 },
  },
  {
    id: "content-writer",
    title: "Content Writer",
    category: "Marketing",
    keywords: ["writer", "copywriter", "blog", "content", "editor"],
    description:
      "Write clear, useful content that brings the right people to us: blog posts, landing pages, newsletters and case studies, researched properly and optimized for search.",
    skills: ["Content writing", "Copywriting", "SEO", "Research", "WordPress"],
    level: INTERMEDIATE,
    tasks: [
      { title: "Refresh 3 existing landing pages", week: 3, priority: "medium" },
      { title: "Write and publish 6 SEO blog posts", week: 5, priority: "high", description: "1,200+ words each, from our topic list, edited to our style guide." },
      { title: "Draft one customer case study", week: 6, priority: "medium" },
    ],
    days: 30,
    budget: { min: 700, max: 1200 },
  },
  {
    id: "seo-specialist",
    title: "SEO Specialist",
    category: "Marketing",
    keywords: ["seo", "search", "organic", "keyword"],
    description:
      "Get us found. Run keyword research and technical audits, improve on-page SEO, plan content around search intent, and track rankings and organic traffic.",
    skills: ["SEO", "Content writing", "Research", "WordPress", "Marketing strategy"],
    level: INTERMEDIATE,
    tasks: [
      { title: "Deliver a technical SEO audit with a prioritized fix list", week: 1, priority: "high" },
      { title: "Set up a weekly ranking and organic traffic report", week: 2, priority: "low" },
      { title: "Fix the top 10 on-page issues", week: 3, priority: "high" },
      { title: "Map 30 target keywords to pages", week: 4, priority: "medium" },
    ],
    days: 30,
    budget: { min: 900, max: 1500 },
  },
  {
    id: "graphic-designer",
    title: "Graphic Designer",
    category: "Design & Creative",
    keywords: ["designer", "graphics", "visual", "brand", "creative"],
    description:
      "Make our brand look sharp everywhere. Design social posts, ads, presentations and marketing collateral that follow our brand guidelines, and turn requests around quickly.",
    skills: ["Graphic design", "Canva", "Adobe Photoshop", "Figma", "Communication"],
    level: INTERMEDIATE,
    tasks: [
      { title: "Design 15 social media templates", week: 2, priority: "high", description: "On-brand, with editable source files in Figma or Canva." },
      { title: "Design 5 ad creatives in three sizes each", week: 4, priority: "high" },
      { title: "Design one sales presentation", week: 6, priority: "medium" },
    ],
    days: 30,
    budget: { min: 800, max: 1400 },
    popular: true,
  },
  {
    id: "video-editor",
    title: "Video Editor",
    category: "Design & Creative",
    keywords: ["video", "editor", "reels", "youtube", "motion"],
    description:
      "Turn raw footage into content people finish watching. Edit short-form clips, product videos and webinars, add captions and simple motion graphics, and deliver on schedule.",
    skills: ["Video editing", "Social media marketing", "Canva", "Adobe Photoshop", "Time management"],
    level: INTERMEDIATE,
    tasks: [
      { title: "Set up a reusable intro, outro and caption style", week: 1, priority: "medium" },
      { title: "Cut one 10-minute webinar into 5 captioned clips", week: 3, priority: "medium" },
      { title: "Edit 12 short-form videos for Reels and TikTok", week: 5, priority: "high", description: "Under 60 seconds each." },
    ],
    days: 30,
    budget: { min: 800, max: 1400 },
  },
  {
    id: "ui-ux-designer",
    title: "UI/UX Designer",
    category: "Design & Creative",
    keywords: ["ux", "ui", "product designer", "figma", "web design"],
    description:
      "Design product experiences our users love. Turn requirements into flows, wireframes and polished UI in Figma, test with real users, and work closely with our developers through handoff.",
    skills: ["UI/UX design", "Figma", "Research", "Graphic design", "Communication"],
    level: ADVANCED,
    tasks: [
      { title: "Map the current onboarding journey", week: 2, priority: "high" },
      { title: "Run 5 user interviews", week: 4, priority: "high" },
      { title: "Deliver wireframes and a high-fidelity Figma prototype", week: 9, priority: "high" },
      { title: "Hand off specs the developers can build from", week: 12, priority: "medium" },
    ],
    days: 60,
    budget: { min: 1500, max: 2500 },
  },
  {
    id: "frontend-developer",
    title: "Front-end Developer",
    category: "Engineering",
    keywords: ["developer", "frontend", "front end", "react", "web developer", "software engineer", "programmer"],
    description:
      "Build and ship the web app our customers use every day. Write clean React and TypeScript, turn Figma designs into fast, accessible pages, and review and test code with the team.",
    skills: ["React", "TypeScript", "Next.js", "JavaScript", "QA testing"],
    level: ADVANCED,
    tasks: [
      { title: "Fix 10 open UI bugs", week: 3, priority: "medium" },
      { title: "Build the first backlog feature", week: 6, priority: "high", description: "React and TypeScript, shipped to production through code review." },
      { title: "Build the second backlog feature", week: 11, priority: "high" },
      { title: "Add tests for the code you touch", week: 12, priority: "medium" },
    ],
    days: 60,
    budget: { min: 1800, max: 3000 },
  },
  {
    id: "wordpress-developer",
    title: "WordPress Developer",
    category: "Engineering",
    keywords: ["wordpress", "web developer", "website", "shopify", "cms"],
    description:
      "Keep our website fast, secure and easy to update. Build and customize WordPress pages and themes, manage plugins, and fix issues as they come up.",
    skills: ["WordPress", "JavaScript", "SEO", "Shopify", "Problem solving"],
    level: INTERMEDIATE,
    tasks: [
      { title: "Update and audit every plugin", week: 1, priority: "medium" },
      { title: "Rebuild the homepage and two landing pages from Figma", week: 4, priority: "high" },
      { title: "Get Core Web Vitals into the green", week: 5, priority: "high" },
      { title: "Document how the team can edit each page", week: 6, priority: "low" },
    ],
    days: 30,
    budget: { min: 1000, max: 1800 },
  },
  {
    id: "bookkeeper",
    title: "Bookkeeper",
    category: "Finance & Operations",
    keywords: ["accounting", "accountant", "finance", "bookkeeping", "quickbooks", "xero"],
    description:
      "Keep our books accurate and on time. Record transactions, reconcile accounts, manage invoices and bills, and prepare clean monthly reports for our accountant.",
    skills: ["Bookkeeping", "Microsoft Excel", "Data entry", "Google Workspace", "Time management"],
    level: INTERMEDIATE,
    tasks: [
      { title: "Reconcile last quarter's bank and card accounts", week: 2, priority: "high" },
      { title: "Clear the backlog of uncategorized transactions", week: 3, priority: "medium" },
      { title: "Send and chase this month's invoices", week: 4, priority: "medium" },
      { title: "Deliver a month-end report with a profit and loss summary", week: 6, priority: "high" },
    ],
    days: 30,
    budget: { min: 900, max: 1500 },
  },
  {
    id: "project-manager",
    title: "Project Manager",
    category: "Finance & Operations",
    keywords: ["pm", "project coordinator", "operations", "scrum", "delivery"],
    description:
      "Keep projects on time and everyone on the same page. Plan timelines, run stand-ups and status updates, manage risks and scope, and make sure the work ships.",
    skills: ["Project management", "Communication", "Time management", "Problem solving", "Google Workspace"],
    level: ADVANCED,
    tasks: [
      { title: "Build the plan and timeline for the live project", week: 1, priority: "high" },
      { title: "Run weekly status meetings with written updates", week: 6, priority: "medium" },
      { title: "Keep the task board and a risk log current", week: 6, priority: "low" },
      { title: "Deliver the next milestone on time", week: 6, priority: "high" },
    ],
    days: 30,
    budget: { min: 1400, max: 2200 },
  },
];

/** "$600 – $1,000 /month" — the suggested range as the cards show it. */
export const templateRange = (t: RoleTemplate) => `$${t.budget.min.toLocaleString("en-US")} – $${t.budget.max.toLocaleString("en-US")} /month`;

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
  return q.length >= 4 && t.skills.some((s) => s.toLowerCase().includes(q)) ? 1 : 0;
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

/** Rates move with experience; a guide entry is scaled from its own level to the one picked. */
const LEVEL_FACTOR: Record<string, number> = { [BEGINNER]: 0.75, [INTERMEDIATE]: 1, [ADVANCED]: 1.35, [EXPERT]: 1.7 };
const round50 = (n: number) => Math.round(n / 50) * 50;
export const levelName = (level: string) => level.replace(/\s*\(.*\)$/, "");

export type RateSuggestion = {
  min: number;
  max: number;
  /** The rate-guide entry it starts from, and how the role was matched to it. */
  guide: RoleTemplate;
  matched: "template" | "title" | "skills";
  /** The level the guide was scaled to, when it isn't the guide's own. */
  adjustedFor?: string;
  /** Independents on Hireable doing this kind of work, with what they actually charge. */
  peers: { name: string; role: string; level: string; rate: number; shared: string[] }[];
};

/**
 * The budget step's "Suggested range", and what backs it: a rate-guide entry (the template in
 * use, else the one the title names, else the one sharing the most skills), scaled to the chosen
 * experience level, next to the independents on Hireable with matching skills or the same role.
 * Null until step one says enough to match anything.
 */
export function suggestRange(role: { title: string; skills: string[]; level: string; template: RoleTemplate | null }, pool: Independent[] = independents): RateSuggestion | null {
  let byTitle: RoleTemplate | null = null;
  let best = 1; // keywords (2) or title words (3) — a skill-only hit doesn't name the role
  for (const t of ROLE_TEMPLATES) {
    const s = score(t, role.title);
    if (s > best) [byTitle, best] = [t, s];
  }
  const wanted = new Set(role.skills);
  const bySkills = ROLE_TEMPLATES.map((t) => ({ t, n: t.skills.filter((s) => wanted.has(s)).length })).sort((a, b) => b.n - a.n)[0];
  const guide = role.template ?? byTitle ?? (bySkills && bySkills.n >= 2 ? bySkills.t : null);
  if (!guide) return null;

  const level = LEVEL_FACTOR[role.level] ? role.level : guide.level;
  const factor = LEVEL_FACTOR[level] / LEVEL_FACTOR[guide.level];
  const titleWords = wordsOf(role.title);
  const sameRole = (r: string) => titleWords.length > 0 && titleWords.every((w) => wordsOf(r).some((x) => x.startsWith(w)));
  const peers = pool
    .map((p) => ({ name: p.name, role: p.role, level: p.level, rate: Number(p.rate.replace(/[^0-9.]/g, "")) || 0, shared: p.skills.filter((s) => wanted.has(s)) }))
    .filter((p) => p.rate > 0 && (p.shared.length > 0 || sameRole(p.role)));

  return {
    min: round50(guide.budget.min * factor),
    max: round50(guide.budget.max * factor),
    guide,
    matched: role.template ? "template" : byTitle ? "title" : "skills",
    adjustedFor: level !== guide.level ? level : undefined,
    peers,
  };
}
