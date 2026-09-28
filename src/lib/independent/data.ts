/** Seed content for the Independent portal. */

import type { Stage } from "@/components/independent/ui";
import type { DealEvaluation, Posting } from "@/lib/demo/deal";
import type { JobType } from "@/lib/demo/job-types";
import type { Task } from "@/lib/demo/tasks";
import type { FitScore } from "@/lib/team/data";

/** `intro` is the intro-video still Team Builders see on the profile — the same file as on their side. */
export const ME = { name: "Juan Dela Cruz", first: "Juan", headline: "Sales Manager", avatar: "/independent/avatar.jpg", intro: "/team/intro-juan.jpg" };

/* --------------------------------------------------------------- roles ---- */

/** IN-002 marketing banner. Set to null to exercise the "no active banner" branch. */
export const MARKETING_BANNER = {
  id: "work-style-2026",
  title: "Roles matched to how you actually work",
  body: "Your Work Style answers rank every open role, so the ones at the top are the ones you are most likely to land — and to enjoy.",
  cta: { label: "Browse roles", href: "/independent/jobs" },
};

/** IN-012 — what the match score is based on, and what moves it. */
export const MATCH_TOOLTIP = "Work Style fit against your quiz answers. Once your profile is complete it also weighs your skills and rate against the role; trial performance and the Team Builder's evaluation fold in later.";

export type Role = {
  slug: string;
  title: string;
  company: string;
  initials: string;
  type: JobType;
  /** A part-time role's hours a week. */
  hours?: number;
  match: number;
  location: string;
  rate: string;
  rateRange: string;
  level: string;
  posted: string;
  closes: string;
  savedAgo: string;
  blurb: string;
  skills: string[];
  description: string[];
  about: { blurb: string; location: string; industry: string; size: string };
  /** "30 Days" for a trial; the start timing for a full-time or part-time role. */
  duration: string;
  hires: number;
  /** Every seat is taken — shown, but closed to applications. */
  filled: boolean;
};

/** A published posting in the shape the job board renders. The board has no seed of its own:
 *  everything on it was posted by the Team Builder in the other portal. */
export function roleFromPosting(p: Posting): Role {
  return {
    slug: p.slug,
    title: p.title,
    company: p.company,
    initials: p.company.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    type: p.type,
    hours: p.hours,
    match: DEMO_MATCH,
    location: p.location,
    rate: p.rate,
    rateRange: p.rateRange,
    level: p.level,
    posted: p.posted,
    closes: p.closes,
    savedAgo: "Saved just now",
    blurb: p.description[0] ?? "",
    skills: p.skills,
    description: p.description,
    about: { blurb: p.companyBlurb, location: p.location, industry: p.industry, size: p.size },
    duration: p.duration ?? "30 Days",
    hires: p.hires ?? 1,
    filled: !!p.filled,
  };
}

export const INITIAL_SAVED: string[] = [];

/* -------------------------------------------------------- applications ---- */

export type Application = {
  id: string;
  roleSlug: string;
  title: string;
  company: string;
  match: number;
  submitted: string;
  stage: Stage;
  status?: { label: string; tone: "info" | "ok" | "danger" | "neutral" | "warn"; meta?: string };
};


export const applications: Application[] = [];

/** My Applications' kanban columns and their header colours. */
export const COLUMNS: { key: string; label: string; stages: Stage[]; bg: string; text: string; count: string }[] = [
  { key: "applications", label: "Applications", stages: ["applied"], bg: "#e5e5e5", text: "#616161", count: "#d8d8d8" },
  { key: "matched", label: "Matched", stages: ["matched"], bg: "#ebf8fe", text: "#004675", count: "#c9eeff" },
  { key: "interviews", label: "Interviews", stages: ["invited", "invite_accepted", "interviewed"], bg: "#fff5ec", text: "#a6520d", count: "#ffe0c4" },
  { key: "proposals", label: "Proposals", stages: ["proposal_requested", "proposal_sent"], bg: "#fff3fb", text: "#6e0e52", count: "#ffdbf3" },
  { key: "offers", label: "Offers", stages: ["offer_received", "offer_accepted"], bg: "#fffbeb", text: "#8e6f12", count: "#fff0b6" },
  { key: "hired", label: "Hired", stages: ["hired"], bg: "#f0fdf4", text: "#1d6f3f", count: "#c6ffd2" },
];

/** The template's opening and disclaimer — the same on every agreement. */
const AGREEMENT_PREAMBLE = `USE OF THIS TEMPLATE IS OPTIONAL. HIREABLE OFFERS THE PARTIES THE OPTION TO UPLOAD THEIR OWN TERMS INSTEAD OF USING THIS TEMPLATE.

Important Disclaimer: This is a form provided on an "as is" basis without representation or warranty of any kind as to its contents. Hireable, its employees, independent contractors or lawyers are not providing you with legal advice and any use of the form is at your own risk. This form is intended to be an example of a services agreement for the Philippines, to be used as an information tool and should not be viewed as a substitute for legal advice.`;

const AGREEMENT = `HIREABLE SERVICES AGREEMENT

TRIAL CONTRACT - SAMPLE DATA

${AGREEMENT_PREAMBLE}

1. Services. The Independent agrees to perform the services described in the Offer Details for the Team Builder during the trial period.

2. Compensation. The Team Builder funds the trial rate into escrow at acceptance. Escrow is released at the end of the trial on approval of the final evaluation.

3. Term. This agreement runs from the start date to the end date shown in the Offer Details unless ended earlier under section 6.

4. Tasks. The parties agree the trial tasks listed above. They are tracked on a shared task list, and the hiring manager reviews each one as it is completed.

5. Disputes. Either party may raise a payment dispute through Hireable. Hireable reviews process compliance, not work quality.

6. Termination. Either party may end the trial early with written notice through the platform. Escrow is released pro rata on approval.`;

/**
 * TB-072 / IN-046 — what a full-time offer is signed against. The offer page used to show the
 * trial agreement: escrow at acceptance, a trial period and pro-rata escrow release.
 */
const FULLTIME_AGREEMENT = `HIREABLE SERVICES AGREEMENT

FULL-TIME ENGAGEMENT - SAMPLE DATA

${AGREEMENT_PREAMBLE}

1. Services. The Independent agrees to perform the services described in the Offer Details for the Team Builder on an ongoing basis from the start date.

2. Compensation. The Team Builder pays the monthly salary shown in the Offer Details at the end of each month, with the exclusive benefits marked as included. No escrow is held on a full-time engagement.

3. Term. This agreement starts on the start date shown in the Offer Details and continues until either party ends it under section 6.

4. Tasks. Work is tracked on a shared task list that either party can add to. The hiring manager reviews each task as it is completed, with evaluations along the way.

5. Disputes. Either party may raise a payment dispute through Hireable. Hireable reviews process compliance, not work quality.

6. Termination. Either party may end the engagement with 30 days' written notice through the platform. Salary is paid pro rata up to the last working day.`;

/** What a part-time offer is signed against: a monthly rate for the hours a week agreed, no benefits. */
const PARTTIME_AGREEMENT = `HIREABLE SERVICES AGREEMENT

PART-TIME ENGAGEMENT - SAMPLE DATA

${AGREEMENT_PREAMBLE}

1. Services. The Independent agrees to perform the services described in the Offer Details for the Team Builder for the hours a week shown there, on an ongoing basis from the start date.

2. Compensation. The Team Builder pays the monthly rate shown in the Offer Details at the end of each month. No escrow is held on a part-time engagement, and the exclusive benefits of a full-time engagement do not apply.

3. Term. This agreement starts on the start date shown in the Offer Details and continues until either party ends it under section 6.

4. Tasks. Work is tracked on a shared task list that either party can add to. The hiring manager reviews each task as it is completed, with evaluations along the way.

5. Disputes. Either party may raise a payment dispute through Hireable. Hireable reviews process compliance, not work quality.

6. Termination. Either party may end the engagement with 14 days' written notice through the platform. The rate is paid pro rata up to the last working day.`;

/** The agreement an offer of this type is signed against. */
export const agreementFor = (type: JobType) => (type === "full-time" ? FULLTIME_AGREEMENT : type === "part-time" ? PARTTIME_AGREEMENT : AGREEMENT);

/* ---------------------------------------------------------- interviews ---- */

/** `starts` is an invitation still waiting on the talent's answer. */
export type Interview = { id: string; role: string; roleHref: string; company: string; when: string; format: string; link?: string; status: "starts" | "accepted" | "completed" | "declined" | "cancelled"; past?: boolean };

export const interviews: Interview[] = [];

/* ----------------------------------------------------------- contracts ---- */

export type Contract = {
  slug: string;
  title: string;
  company: string;
  initials: string;
  /** What the contract is now: a trial, or the full-time / part-time role it is (or became). */
  type: JobType;
  /** Whether it started as a trial, or was a direct full-time / part-time hire with no trial. */
  origin: "trial" | "direct";
  location: string;
  line: string;
  status: { label: string; tone: "ok" | "warn" | "danger" | "neutral" | "info" };
  /** The first day, while the contract is signed but hasn't started yet. */
  startsOn?: string;
  progressLabel: string;
  progress: number;
  progressTone: "primary" | "ok" | "danger";
  manager: string;
  managerFirst: string;
  started: string;
  day: string;
  ends: string;
  /** Working days left in a trial (null on a full-time contract), and whether its end date has come. */
  left: number | null;
  over: boolean;
  /** When it was ended, if the Team Builder ended it. */
  endedOn?: string;
  /** A trial's length in working days — `day` stops saying "Day 3 of 30" once it closes early. */
  workingDays?: number;
  rate: string;
  /** A part-time contract's hours a week. */
  hours?: number;
  /** IN-076 — the shared task list, the same one the Team Builder reviews. */
  tasks: Task[];
  /** IN-076 Trial Fit Score — the same breakdown the Team Builder sees; null on a direct hire, which had no trial. */
  tfs: FitScore | null;
  phase: 3 | 4;
  /** TB-058 — one entry per weekday, oldest first: 0 nothing logged, 1 worked on tasks, 2 sent one for review. */
  activity: number[];
  streak: number;
  /** IN-034 / IN-047 — what the Team Builder submitted, newest first. */
  evaluations: DealEvaluation[];
  /** What was funded into escrow for the trial. */
  deposit?: number;
  /** The match the application started on — what a direct hire shows in place of a trial score. */
  match: number;
};

export const contracts: Contract[] = [];

/**
 * IN-049 — the Team Builder's company as the independent sees it from a contract: read-only,
 * keyed by the company name on the contract so every contract can show the firm it belongs to.
 */
export type CompanyProfile = { name: string; description: string; industry: string; location: string; url: string };

export const COMPANIES: Record<string, CompanyProfile> = {
  // Keyed by the full name contracts carry; the short key never matched, so the profile was blank.
  "Nairobi Solutions Inc.": {
    name: "Nairobi Solutions Inc.",
    description: "B2B SaaS agency based in New York. We build outbound teams for early-stage fintechs and keep them accountable with weekly metrics.",
    industry: "Sales and marketing services",
    location: "New York, USA · remote team",
    url: "www.nairobisolutions.com",
  },
};

/* -------------------------------------------------------------- wallet ---- */

export type PayoutMethod = { id: string; brand: "Maya" | "GCash" | "Bank"; last4: string; holder: string; verified: string; detail: string; isDefault: boolean };

export const payoutMethods: PayoutMethod[] = [
  { id: "maya", brand: "Maya", last4: "4471", holder: "Juan Dela Cruz", verified: "Verified 8 Sep 2026", detail: "E-wallet", isDefault: true },
  { id: "gcash", brand: "GCash", last4: "9023", holder: "Juan Dela Cruz", verified: "Verified 2 Jun 2026", detail: "GCash · 0917 555 0142", isDefault: false },
  { id: "bpi", brand: "Bank", last4: "3391", holder: "Juan Dela Cruz", verified: "Verified 12 Jan 2026", detail: "InstaPay / PESONet", isDefault: false },
];

/** IN-032 transaction types, plus the wallet-only Payout that isn't tied to a contract. */
const TXN_TYPES = ["Payment Deposited", "Payment Released", "Payment Refunded", "Payout"] as const;

/**
 * IN-053 — Earnings states the same rows in the independent's own terms: a release is money
 * received, a payout is a withdrawal. The contract tab keeps IN-032's wording for the same event.
 */
export const EARNINGS_LABEL: Record<string, string> = { "Payment Released": "Payment Received", "Payment Deposited": "Payment Deposited", "Payment Refunded": "Payment Refunded", Payout: "Withdrawal" };
export const EARNINGS_TYPES = ["Payment Received", "Payment Deposited", "Payment Refunded", "Withdrawal"] as const;
export type TxnType = (typeof TXN_TYPES)[number];

/** IN-032 — `contract` is the slug the row belongs to, so a contract can list its own history. */
export type Transaction = {
  date: string;
  /** yyyymmdd — the ledger sorts newest first and filters by range on this, not on the printed date. */
  at: number;
  desc: string;
  party: string;
  type: TxnType;
  contract?: string;
  /** The contract's name as the row was recorded, so the ledger can show it without a lookup. */
  contractTitle?: string;
  amount: string;
  status: { label: string; tone: "ok" | "warn" | "danger" | "neutral" };
};

export const transactions: Transaction[] = [];

/* Disputes (IN-032 / IN-059 / IN-080–082) live in @/lib/demo/disputes, with their reason codes. */

/* ------------------------------------------------------------ profile ----- */

/** IN-065 — what the skills box offers while you type. Anything else typed in is kept as well. */
export const SKILL_SUGGESTIONS = [
  "Account management",
  "Apollo",
  "Churn analysis",
  "Cold calling",
  "Contract negotiation",
  "CRM",
  "Demo delivery",
  "Discovery calls",
  "Forecasting",
  "HubSpot",
  "Lead generation",
  "LinkedIn prospecting",
  "Objection handling",
  "Onboarding",
  "Outbound email",
  "Pipeline hygiene",
  "Salesforce",
  "Sales outreach",
  "Team leadership",
  "Territory planning",
];

/**
 * IN-066 — evaluations from engagements that have already closed. Live contracts add their own
 * on top of these (each contract's own evaluations), so the section is the whole record, not a seed list.
 */
export type PastEvaluation = { company: string; role: string; type: JobType; date: string; stars: number; feedback: string };

export const pastEvaluations: PastEvaluation[] = [];

/** IN-062 — the bio limit, quoted in the editor and enforced by it. */
export const BIO_MAX = 500;

/**
 * IN-064 — the fit every role shows: 80% for this company and this talent. The demo doesn't
 * score it from the two sides' quiz answers (the real app's matching works differently), so taking
 * or retaking the quiz leaves it, and the Team Builder's tracker, where they were.
 */
const DEMO_MATCH = 80;

export const profile = {
  bio: "Sales leader with eight years in B2B SaaS, most recently running a six-person outbound team for a US fintech. I own pipeline from first touch to signed contract, coach reps on discovery calls, and keep the CRM honest.",
  editBio:
    "Sales leader with eight years in B2B SaaS, most recently running a six-person outbound team for a US fintech. I own pipeline from first touch to signed contract, coach reps on discovery calls, and keep the CRM honest. Available for a 30-day trial starting October.",
  rate: "1,600",
  level: "Advanced (5–8 years)",
  location: "Manila, Philippines",
  skills: ["Lead generation", "Objection handling", "Sales outreach", "Cold calling", "CRM", "LinkedIn prospecting"],
  /** IN-061 — the photo lives with the rest of the profile once it has been changed. */
  photo: ME.avatar,
  links: { linkedin: "linkedin.com/in/juandelacruz", portfolio: "juandelacruz.notion.site", website: "juandelacruz.ph" },
  history: [
    { role: "Content Marketing Manager", date: "January 1, 2020", quote: "Juan exceeded expectations on every campaign. His ability to analyze data and pivot strategy mid-flight saved us thousands in ad spend." },
    { role: "Growth Marketing Lead", date: "January 1, 2020", quote: "Incredible attention to detail and a natural sense for what resonates with audiences. Our email open rates doubled under Juan's watch." },
    { role: "Senior Marketing Specialist", date: "January 1, 2020", quote: "Solid performer with strong fundamentals. Sometimes needed guidance on prioritization, but always delivered quality work on time." },
  ],
};

/**
 * IN-003 account setup checklist — the 5 steps named in the acceptance criteria. `done` is
 * computed from real state, never stored, so completing a step actually moves the bar.
 */
export function setupSteps({ payouts, applications, workStyle = [], bio = profile.bio }: { payouts: PayoutMethod[]; applications: Application[]; workStyle?: number[]; bio?: string }) {
  return [
    // Nothing in the demo tracks email confirmation, so this one is simply already true.
    { label: "Verify email", done: true, href: "/independent/settings", hint: "Confirm the address we send role alerts to." },
    { label: "Answer Work Style Quiz", done: workStyle.length > 0, href: "/onboarding/talent", hint: "Drives your match score against every open role." },
    { label: "Setup profile", done: bio.trim() !== "" && profile.skills.length > 0 && profile.rate.trim() !== "", href: "/independent/profile?edit=profile", hint: "Bio, skills and rate — Team Builders see this first." },
    { label: "Setup payment method", done: payouts.length > 0, href: "/independent/settings/payout", hint: "Where your trial and salary payments are released." },
    // No point applying before there is a profile to send or an account to be paid into.
    { label: "Apply to a role", done: applications.length > 0, href: "/independent/jobs", hint: "Browse matched roles and send your first application.", requires: ["Setup profile", "Setup payment method"] },
  ];
}

/* ------------------------------------------------------- notifications ---- */

/**
 * `at` is when it happened (epoch ms), so the feed can say Today / Yesterday / Earlier as days pass;
 * `group` and `time` are what a record without it falls back to. `avatar` is who it is from.
 */
export type Notification = { id: string; group: "Today" | "Yesterday" | "Earlier"; title: string; body: string; time: string; unread: boolean; kind: "contracts" | "offers" | "payments" | "interviews" | "other"; href: string; at?: number; avatar?: string };

export const notifications: Notification[] = [];

/* ------------------------------------------------------------ messages ---- */

export type Conversation = { id: string; name: string; sub: string; preview: string; time: string; unread: number; initials: string; kind: "conversations" | "applications" };

/** The inbox is not a seed: the thread exists once you are in a company's pipeline. */
/**
 * IN-006 — the one thread, filed where the tabs say: Conversations once there is a contract,
 * Applications while it is still a pipeline. The subtitle named Alex "Sales Manager" — the
 * talent's own title — rather than who he is to them.
 */
export function conversationsFor({ hired, inPipeline, role }: { hired: boolean; inPipeline: boolean; role?: string }): Conversation[] {
  if (!hired && !inPipeline) return [];
  return [{ id: "c1", name: "Nairobi Solutions", sub: `Alex Rivera · Hiring manager${role ? ` · ${role}` : ""}`, preview: "", time: "", unread: 0, initials: "NS", kind: hired ? "conversations" : "applications" }];
}
