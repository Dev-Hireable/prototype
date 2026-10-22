import { getImageProps } from "next/image";
import { preload } from "react-dom";
import { durationDays, today, trialLength, workingDaysLabel } from "@/lib/portal/dates";
import type { JobType } from "@/lib/contract/job-types";
import { blankDraft, fromDrafts, planWeeks, toDrafts, type DraftTask, type PlannedTask } from "@/lib/demo/tasks";
import { settleMoney } from "@/lib/portal/money";
import type { Independent, Role } from "@/lib/team/data";
import { LEVELS, type RoleTemplate } from "@/lib/team/role-templates";
import { roleParts } from "@/lib/team/roles";

/**
 * The create-role wizard's paths and rules — everything that isn't layout: what each path says and
 * asks for, when a step is done, and how the form becomes a role.
 */

export const CHIP_TONES = ["text-ok", "text-primary", "text-[#e91e63]"];

/** TB-024 Benefits — optional, full-time only, each with its own monthly amount. */
export const BENEFITS = ["Health Insurance Coverage", "Government Contribution Coverage", "Internet Allowance", "Learning & Development Allowance"] as const;
/** How a benefit is paid: back against a receipt. A plain note, since nothing is wrong. */
export const BENEFITS_DISCLAIMER = "Benefits are paid back to the Independent when they upload a receipt.";

/** Every field the wizard edits — what Review's Edit → Cancel restores. */
export type Snapshot = {
  title: string;
  desc: string;
  level: string;
  skills: string[];
  hires: number;
  taskRows: DraftTask[];
  expectation: string;
  attachment: string;
  min: string;
  max: string;
  chip: number;
  hours: number;
  benefits: Record<string, string>;
};

export type ReviewSection = "title" | "budget" | "description" | "skills" | "duration" | "experience" | "hires" | "weekly" | "expectations" | "benefits";

/**
 * Copy per path — Test Independents (trial) and Build Team (full-time), with Build Team's
 * part-time twin: monthly pay for set hours a week, and no benefits (those are full-time only).
 * Each step is named in the stepper as its card is headed, and the pay is "Pay" on every path.
 */
export const PATH = {
  trial: {
    title: "Create a Trial",
    /** Step one only: the steps after it don't repeat it. */
    intro: "Set up a paid trial of 30, 60 or 90 working days before committing full time.",
    steps: ["Role details", "Trial tasks", "Pay", "Review", "Publish"],
    /** Which card each step slot renders — the two paths don't share an order (TB-024 / TB-025). */
    sequence: ["details", "expectations", "budget", "review", "published"],
    next: ["Next: Trial tasks", "Next: Pay", "Review role"],
    descPlaceholder: "What will they be doing during this trial?",
    h3: "Pay",
    sub3: "Set the pay for the whole trial and how long it runs.",
    pay: "Pay (for the whole trial)",
    label3: "Trial length",
    /** As saved on the role ("30 Days"); the chips read them in working days (`chipText`). */
    chips: ["30 Days", "60 Days", "90 Days"],
    money: "Pay:",
    when: "Duration:",
    reviewTitle: "Review your trial role",
  },
  "full-time": {
    title: "Build Team: full-time role",
    intro: "Hire for a long-term role with defined responsibilities, strong collaboration, and room for growth.",
    steps: ["Role details", "Pay and start", "Benefits", "Review", "Publish"],
    sequence: ["details", "budget", "benefits", "review", "published"],
    next: ["Next: Pay and start", "Next: Benefits", "Review role"],
    descPlaceholder: "What will they be doing in this role?",
    h3: "Pay and start",
    sub3: "Set the monthly pay and when they start.",
    pay: "Pay (per month)",
    label3: "Start date",
    chips: ["Immediately", "In 2 weeks", "In 1 month"],
    money: "Pay:",
    when: "Start date:",
    reviewTitle: "Review your full-time role",
  },
  "part-time": {
    title: "Build Team: part-time role",
    intro: "Hire for an ongoing role with set weekly hours, clear responsibilities, and room to grow.",
    steps: ["Role details", "Pay and start", "Review", "Publish"],
    sequence: ["details", "budget", "review", "published"],
    next: ["Next: Pay and start", "Review role"],
    descPlaceholder: "What will they be doing in this role?",
    h3: "Pay and start",
    sub3: "Set the monthly pay, the hours a week it covers, and when they start.",
    pay: "Pay (per month)",
    label3: "Start date",
    chips: ["Immediately", "In 2 weeks", "In 1 month"],
    money: "Pay:",
    when: "Start date:",
    reviewTitle: "Review your part-time role",
  },
} as const;

/** One path's copy and the order of its steps. */
export type PathCopy = (typeof PATH)[JobType];

/**
 * A trial's own step and its card on Review (TB-025): the tasks, and the notes and link beside them.
 * The tasks reach the Independent with the offer, once their proposal is accepted; the public post
 * says only how many there are.
 */
export const TRIAL_TASKS = {
  title: "Trial tasks",
  label: "Tasks",
  shared: "Independents see your trial tasks only after you accept their proposal. Tasks are not shown on your public role post.",
  notPublic: "Not shown on your public post",
  notesPlaceholder: "Do not share sensitive information here, such as login credentials.",
  notesHint: "Shown to the Independent once the contract is signed.",
  linkHint: "A Loom, Google Doc or anything else that helps them get going.",
} as const;

/** A trial length or a start timing as its chip reads: "30 working days", or "In 2 weeks" as it is. */
export const chipText = (type: JobType, chip: string) => (type === "trial" ? workingDaysLabel(durationDays(chip)) : chip);

/** The same, in full where there's room for it: "30 working days (about 6 weeks)". */
export const chipLong = (type: JobType, chip: string) => (type === "trial" ? trialLength(durationDays(chip)) : chip);

/** First step slot whose required fields aren't filled yet — "where they left off" (TB-035). */
export function resumeStep(r: Role, sequence: readonly string[]) {
  const done: Record<string, boolean> = { ...roleParts(r), benefits: true };
  const at = sequence.findIndex((k) => done[k] === false);
  return at === -1 ? sequence.indexOf("review") : at;
}

/** The "published" badge, drawn at 141×140 — one set of props, so the preload and the image ask for the same files. */
export const BADGE = { src: "/team/published.png", alt: "", width: 141, height: 140 } as const;

/**
 * The success badge is fetched while the form is being filled in, so it's already here when Publish
 * swaps the form for it — the same optimized files <Image> will ask for, at low priority.
 */
export function warmBadge() {
  const { srcSet, src } = getImageProps(BADGE).props;
  preload(src, { as: "image", imageSrcSet: srcSet, fetchPriority: "low" });
}

/** Due weeks run to the end of the trial length picked on the pay step, in working weeks: 30 days is 6, 60 is 12, 90 is 18 (30 until it's picked). */
export const weeksFor = (chips: readonly string[], chip: number) => planWeeks(durationDays(chips[chip]));

/**
 * A saved budget's two ends: "$1,500.00 - $3,500.00 /mo" → "1,500.00" and "3,500.00". Split on the
 * dash first, then take the whole part of each side; stripping punctuation up front turned
 * "1,500.00" into "1 500 00".
 */
export function budgetRange(budget: string) {
  const [lo, hi] = budget.split(/[–-]/);
  const whole = (s?: string) => (s?.match(/[\d,]+/)?.[0] ?? "").replace(/,/g, "");
  return [settleMoney(whole(lo)), settleMoney(whole(hi))] as const;
}

const amount = (v: string) => Number(v.replace(/,/g, ""));

/**
 * Both amounts filled, the range the right way up, and more than $0 — a draft's Publish (roleParts
 * in src/lib/team/roles.ts) wants an amount over zero too.
 */
const budgetOk = ({ min, max }: Pick<Snapshot, "min" | "max">) => min.length > 0 && max.length > 0 && amount(min) <= amount(max) && amount(max) > 0;

export function rangeError({ min, max }: Pick<Snapshot, "min" | "max">) {
  if (!min || !max) return null;
  if (amount(min) > amount(max)) return "Minimum can't be more than the maximum.";
  return amount(max) > 0 ? null : "The pay can't be $0.";
}

/**
 * The range as the role saves it: a trial's is for the whole trial, so it has no unit ("$1,600.00 –
 * $2,000.00"); a full-time or part-time role's is monthly ("… /month").
 */
const moneyLine = ({ min, max }: Pick<Snapshot, "min" | "max">, type: JobType) => `$${min || "0"} – $${max || "0"}${type === "trial" ? "" : " /month"}`;

/** The same as the review shows it, a trial's saying what it's for: "$1,600.00 – $2,000.00 for the trial". */
export const moneyText = (f: Pick<Snapshot, "min" | "max">, type: JobType) => `${moneyLine(f, type)}${type === "trial" ? " for the trial" : ""}`;

/**
 * TB-024 / TB-025 — Next stays disabled until every required field on the step is filled. Step 1
 * asks for role, description, at least one skill, an experience level and a headcount, not just the
 * title.
 */
const detailsDone = (f: Pick<Snapshot, "title" | "desc" | "skills" | "level" | "hires">) => f.title.trim().length > 1 && f.desc.trim().length > 0 && f.skills.length > 0 && f.level !== LEVELS[0] && f.hires >= 1;

/** Whether the step this slot shows is done — keyed off the card, not the slot: budget is step 2 on one path and step 3 on the other. */
export function stepDone(kind: string, f: Snapshot) {
  if (kind === "details") return detailsDone(f);
  if (kind === "expectations") return fromDrafts(f.taskRows).length > 0;
  return kind === "budget" ? budgetOk(f) : true;
}

/** Same rules as the wizard steps, so a quick edit on Review can't leave a required field empty. */
export function sectionsOk(f: Snapshot): Record<ReviewSection, boolean> {
  return {
    title: f.title.trim().length > 1,
    budget: budgetOk(f),
    description: f.desc.trim().length > 0,
    skills: f.skills.length > 0,
    duration: true,
    experience: f.level !== LEVELS[0],
    hires: f.hires >= 1,
    weekly: f.hours >= 1,
    expectations: fromDrafts(f.taskRows).length > 0,
    benefits: true,
  };
}

/** A task plan in a shape two lists can be compared by, whatever order their keys were written in. */
const plan = (list: PlannedTask[]) => JSON.stringify(list.map((x) => [x.title, x.week ?? 0, x.priority ?? "", x.description ?? ""]));

/**
 * The slug a new role gets: its title, made unique — two roles with the same title used to share
 * one, and publishing the second silently replaced the first.
 */
export function freshSlug(title: string, roles: Role[]) {
  const base = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "new-role";
  let fresh = base;
  for (let n = 2; roles.some((r) => r.slug === fresh); n++) fresh = `${base}-${n}`;
  return fresh;
}

/**
 * The chip a saved role's duration was written from — "60 Days", or "Starts in 2 weeks" off Build
 * Team's "In 2 weeks" (see roleFrom) — so a draft opens on the length it was saved with. The first
 * chip when none matches.
 */
export function chipOf(duration: string | undefined, chips: readonly string[]) {
  return Math.max(0, chips.findIndex((c) => duration === c || duration === `Starts ${c.toLowerCase()}`));
}

/** The role the form describes, as a draft or a live post. */
export function roleFrom(f: Snapshot, { slug, type, status, chips }: { slug: string; type: JobType; status: Role["status"]; chips: readonly string[] }): Role {
  return {
    slug,
    title: f.title.trim() || "Untitled role",
    type,
    status,
    candidates: 0,
    matched: 0,
    interviews: 0,
    offers: 0,
    hired: 0,
    updated: today(),
    description: f.desc,
    budget: moneyLine(f, type),
    duration: type === "trial" ? chips[f.chip] : `Starts ${chips[f.chip].toLowerCase()}`,
    experience: f.level === LEVELS[0] ? "Any level" : f.level,
    skills: f.skills,
    expectation: f.expectation,
    tasks: type === "trial" ? fromDrafts(f.taskRows) : undefined,
    attachment: f.attachment,
    hires: f.hires,
    hours: type === "part-time" ? f.hours : undefined,
    // TB-024 — exclusive benefits are a full-time post's alone.
    benefits: type === "full-time" ? Object.entries(f.benefits).map(([label, amount]) => ({ label, amount: amount || "0" })) : [],
  };
}

/** Everything a template would replace, other than the title, is still empty: the description, the skills and a trial's tasks. */
export const onlyTitle = (f: Snapshot) => !f.desc.trim() && f.skills.length === 0 && fromDrafts(f.taskRows).length === 0;

/** A template's tasks as a trial's plan takes them: its one example task, or a row to type the first into. */
const exampleRows = (tpl: RoleTemplate) => (tpl.task ? toDrafts([tpl.task]) : [blankDraft()]);

/**
 * What picking a template writes into the form: the role's name, description and skills, and on a
 * trial its one example task. The experience level, the trial's length and the pay are the Team
 * Builder's to set. "blank" (Start from scratch) clears the form instead.
 */
export function templateChanges(tpl: RoleTemplate | "blank", type: JobType): Partial<Snapshot> {
  if (tpl === "blank") return { title: "", desc: "", skills: [], level: LEVELS[0], ...(type === "trial" ? { taskRows: [blankDraft()], expectation: "" } : {}), min: "", max: "", chip: 0 };
  return { title: tpl.title, desc: tpl.description, skills: [...tpl.skills], ...(type === "trial" ? { taskRows: exampleRows(tpl) } : {}) };
}

/** A template's fields in a shape the form can be compared against. */
export function templateShape(tpl: RoleTemplate, type: JobType, f: Snapshot) {
  return JSON.stringify({ title: tpl.title, desc: tpl.description, skills: tpl.skills.join("|"), tasks: type === "trial" ? plan(tpl.task ? [tpl.task] : []) : plan(fromDrafts(f.taskRows)) });
}

/** The form's own fields in the same shape, to tell whether it still holds exactly what a template wrote. */
export const formShape = (f: Snapshot) => JSON.stringify({ title: f.title, desc: f.desc, skills: f.skills.join("|"), tasks: plan(fromDrafts(f.taskRows)) });

/** The Independents a just-published role shows first: the best matched, most first. */
export const topMatches = (pool: Independent[], count = 3) => [...pool].sort((a, b) => b.match - a.match).slice(0, count);
