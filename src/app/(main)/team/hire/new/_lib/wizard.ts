import { getImageProps } from "next/image";
import { preload } from "react-dom";
import { durationDays, today } from "@/lib/portal/dates";
import type { JobType } from "@/lib/contract/job-types";
import { blankDraft, fromDrafts, planWeeks, toDrafts, type DraftTask, type PlannedTask } from "@/lib/demo/tasks";
import { settleMoney } from "@/lib/portal/money";
import type { Role } from "@/lib/team/data";
import { LEVELS, type RoleTemplate } from "@/lib/team/role-templates";
import { roleParts } from "@/lib/team/roles";

/**
 * The create-role wizard's paths and rules — everything that isn't layout: what each path says and
 * asks for, when a step is done, and how the form becomes a role.
 */

export const CHIP_TONES = ["text-ok", "text-primary", "text-[#e91e63]"];

/** TB-024 "Exclusive Benefits" — optional, full-time only, each with its own monthly amount. */
export const BENEFITS = ["Health Insurance Coverage", "Government Contribution Coverage", "Internet Allowance", "Learning & Development Allowance"] as const;
export const BENEFITS_DISCLAIMER =
  "Exclusive benefits apply to full-time hired freelancers only. These benefits are reimbursable, proof of payment (receipts) must be submitted to receive reimbursement.";

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
 * part-time twin: a monthly rate for set hours a week, and no exclusive benefits (those are
 * full-time only).
 */
export const PATH = {
  trial: {
    title: "Create a Trial",
    intro: "See how you work together with a paid trial before committing full-time. Fund escrow after they accept, before the trial starts.",
    steps: ["Role Details", "Trial Tasks", "Budget & Duration", "Review", "Publish"],
    /** Which card each step slot renders — the two paths don't share an order (TB-024 / TB-025). */
    sequence: ["details", "expectations", "budget", "review", "published"],
    next: ["Next: Trial Tasks", "Add budget & duration", "Review job post"],
    descPlaceholder: "What will they be doing during this trial?",
    note: "Trial tasks are only shared with Independents you invite or match with — they won't appear on your public role listing.",
    h2: "What should the Independent get done in the trial?",
    field2: "Trial Tasks",
    ph2: "Anything they should know before they start: tools, access, how you like to work…",
    hint2: "A Loom, Google Doc or anything else that helps them get going.",
    h3: "Budget & Duration",
    sub3: "Set your monthly rate and trial length.",
    label3: "Trial Duration",
    chips: ["30 Days", "60 Days", "90 Days"],
    money: "Budget:",
    when: "Duration:",
    reviewTitle: "Review your trial role",
    reviewNote: "Your trial tasks are only shared with candidates you match with or invite — they won't be visible on your public job post.",
    publishedTitle: "Job post published",
    publishedBody: "Your job is now live. Next, review applicants and invite the best matches to a work trial.",
  },
  "full-time": {
    title: "Build Team",
    intro: "Hire for a long-term role with defined responsibilities, strong collaboration, and room for growth.",
    steps: ["Job Details", "Budget", "Exclusive Benefits", "Review", "Published"],
    sequence: ["details", "budget", "benefits", "review", "published"],
    next: ["Add budget", "Add benefits", "Review job post"],
    descPlaceholder: "What will they be doing in this role?",
    note: "Responsibilities appear on your public role listing so candidates know what the job involves.",
    h2: "What will this person own in the role?",
    field2: "Responsibilities",
    ph2: "e.g. Own the outbound pipeline for our EU segment, run weekly reporting, and manage two SDRs…",
    hint2: "Walk candidates through the role in your own words.",
    h3: "Salary & Start",
    sub3: "Set the monthly salary and when they start.",
    label3: "Start date",
    chips: ["Immediately", "In 2 weeks", "In 1 month"],
    money: "Salary:",
    when: "Start date:",
    reviewTitle: "Review your full-time role",
    reviewNote: "Responsibilities appear on your public job post so candidates know what the role involves.",
    publishedTitle: "Role published",
    publishedBody: "Your role is now live. Next, review applicants and invite the best matches to interview.",
  },
  "part-time": {
    title: "Build Team",
    intro: "Hire for an ongoing role, part of the week: a set number of hours, with defined responsibilities and room to grow.",
    steps: ["Job Details", "Rate & Hours", "Review", "Published"],
    sequence: ["details", "budget", "review", "published"],
    next: ["Add rate & hours", "Review job post"],
    descPlaceholder: "What will they be doing in this role?",
    note: "Responsibilities appear on your public role listing so candidates know what the job involves.",
    h2: "What will this person own in the role?",
    field2: "Responsibilities",
    ph2: "e.g. Run weekly social posting, report on engagement every Friday, and answer comments within a day…",
    hint2: "Walk candidates through the role in your own words.",
    h3: "Rate, Hours & Start",
    sub3: "Set the monthly rate, the hours a week it covers, and when they start.",
    label3: "Start date",
    chips: ["Immediately", "In 2 weeks", "In 1 month"],
    money: "Rate:",
    when: "Start date:",
    reviewTitle: "Review your part-time role",
    reviewNote: "Responsibilities appear on your public job post so candidates know what the role involves.",
    publishedTitle: "Role published",
    publishedBody: "Your role is now live. Next, review applicants and invite the best matches to interview.",
  },
} as const;

/** One path's copy and the order of its steps. */
export type PathCopy = (typeof PATH)[JobType];

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

/** Due weeks run to the end of the trial length picked on the budget step (30 days until then). */
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
  return amount(max) > 0 ? null : "The budget can't be $0.";
}

/** The range as the review and the post show it. */
export const moneyLine = ({ min, max }: Pick<Snapshot, "min" | "max">) => `$${min || "0"} – $${max || "0"} /month`;

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
    budget: moneyLine(f),
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

/** Everything a template would replace, other than the title, is still empty. */
export const onlyTitle = (f: Snapshot) => !f.desc.trim() && f.skills.length === 0 && f.level === LEVELS[0] && fromDrafts(f.taskRows).length === 0 && !f.min && !f.max;

/**
 * What picking a template writes into the form — or, for "blank" (Start from scratch), what it
 * clears. The trial path also takes the template's tasks and length; the Build Team paths have
 * neither step, so those stay as they are.
 */
export function templateChanges(tpl: RoleTemplate | "blank", type: JobType, chips: readonly string[]): Partial<Snapshot> {
  if (tpl === "blank") return { title: "", desc: "", skills: [], level: LEVELS[0], ...(type === "trial" ? { taskRows: [blankDraft()], expectation: "" } : {}), min: "", max: "", chip: 0 };
  return {
    title: tpl.title,
    desc: tpl.description,
    skills: [...tpl.skills],
    level: tpl.level,
    ...(type === "trial" ? { taskRows: toDrafts(tpl.tasks), chip: Math.max(0, chips.indexOf(`${tpl.days} Days`)) } : {}),
    min: settleMoney(String(tpl.budget.min)),
    max: settleMoney(String(tpl.budget.max)),
  };
}

/** A template's fields in a shape the form can be compared against. */
export function templateShape(tpl: RoleTemplate, type: JobType, chips: readonly string[], f: Snapshot) {
  return JSON.stringify({
    title: tpl.title,
    desc: tpl.description,
    skills: tpl.skills.join("|"),
    level: tpl.level,
    tasks: type === "trial" ? plan(tpl.tasks) : plan(fromDrafts(f.taskRows)),
    min: settleMoney(String(tpl.budget.min)),
    max: settleMoney(String(tpl.budget.max)),
    chip: type === "trial" ? Math.max(0, chips.indexOf(`${tpl.days} Days`)) : f.chip,
  });
}

/** The form's own fields in the same shape, to tell whether it still holds exactly what a template wrote. */
export const formShape = (f: Snapshot) => JSON.stringify({ title: f.title, desc: f.desc, skills: f.skills.join("|"), level: f.level, tasks: plan(fromDrafts(f.taskRows)), min: f.min, max: f.max, chip: f.chip });
