/** Seed content transcribed from the "[DRAFT] Independent Portal" Figma canvas. */

import type { Stage } from "@/components/independent/ui";
import { storedWorkStyle } from "@/lib/demo/work-style";
/** The Off Track rule and the objective-type wording are the same spec on both sides of a trial. */
import { isOffTrack } from "@/lib/team/data";
import type { DealEvaluation, DealKeyResult, ObjectiveComment, Posting } from "@/lib/demo/deal";

export const ME = { name: "Juan Dela Cruz", first: "Juan", headline: "Sales Manager", avatar: "/independent/avatar.jpg" };

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
  type: "trial" | "full-time";
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
  objectives: string[];
  about: { blurb: string; location: string; industry: string; size: string };
  workStyle: { builder: number[]; independent: number[] };
  /** "30 Days" for a trial; the start timing for a full-time role. */
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
    objectives: p.objectives,
    about: { blurb: p.companyBlurb, location: p.location, industry: p.industry, size: p.size },
    // The Team Builder's current quiz answers, read live, not a copy frozen when the role was posted.
    workStyle: { builder: storedWorkStyle("team"), independent: storedWorkStyle("independent") },
    duration: p.duration ?? "30 Days",
    hires: p.hires ?? 1,
    filled: !!p.filled,
  };
}

/** Nothing is on the board until a role is published from the client portal. */
export const roles: Role[] = [];

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

/** Kanban column headers — colours lifted from the Figma "My Applications" frame. */
export const COLUMNS: { key: string; label: string; stages: Stage[]; bg: string; text: string; count: string }[] = [
  { key: "applications", label: "Applications", stages: ["applied"], bg: "#e5e5e5", text: "#616161", count: "#d8d8d8" },
  { key: "matched", label: "Matched", stages: ["matched"], bg: "#ebf8fe", text: "#004675", count: "#c9eeff" },
  { key: "interviews", label: "Interviews", stages: ["invited", "invite_accepted", "interviewed"], bg: "#fff5ec", text: "#a6520d", count: "#ffe0c4" },
  { key: "proposals", label: "Proposals", stages: ["proposal_requested", "proposal_sent"], bg: "#fff3fb", text: "#6e0e52", count: "#ffdbf3" },
  { key: "offers", label: "Offers", stages: ["offer_received", "offer_accepted"], bg: "#fffbeb", text: "#8e6f12", count: "#fff0b6" },
  { key: "hired", label: "Hired", stages: ["hired"], bg: "#f0fdf4", text: "#1d6f3f", count: "#c6ffd2" },
];

/** The template's opening and disclaimer — the same on a trial and a full-time agreement. */
const AGREEMENT_PREAMBLE = `USE OF THIS TEMPLATE IS OPTIONAL. HIREABLE OFFERS THE PARTIES THE OPTION TO UPLOAD THEIR OWN TERMS INSTEAD OF USING THIS TEMPLATE.

Important Disclaimer: This is a form provided on an "as is" basis without representation or warranty of any kind as to its contents. Hireable, its employees, independent contractors or lawyers are not providing you with legal advice and any use of the form is at your own risk. This form is intended to be an example of a services agreement for the Philippines, to be used as an information tool and should not be viewed as a substitute for legal advice.`;

export const AGREEMENT = `HIREABLE SERVICES AGREEMENT

TRIAL CONTRACT - SAMPLE DATA

${AGREEMENT_PREAMBLE}

1. Services. The Independent agrees to perform the services described in the Offer Details for the Team Builder during the trial period.

2. Compensation. The Team Builder funds the trial rate into escrow at acceptance. Escrow is released at the end of the trial on approval of the final evaluation.

3. Term. This agreement runs from the start date to the end date shown in the Offer Details unless ended earlier under section 6.

4. Objectives. The parties agree the trial objectives listed above. Progress is logged in the trial tracker and reviewed by the hiring manager.

5. Disputes. Either party may raise a payment dispute through Hireable. Hireable reviews process compliance, not work quality.

6. Termination. Either party may end the trial early with written notice through the platform. Escrow is released pro rata on approval.`;

/**
 * TB-072 / IN-046 — what a full-time offer is signed against. The offer page used to show the
 * trial agreement: escrow at acceptance, a trial period and pro-rata escrow release.
 */
export const FULLTIME_AGREEMENT = `HIREABLE SERVICES AGREEMENT

FULL-TIME ENGAGEMENT - SAMPLE DATA

${AGREEMENT_PREAMBLE}

1. Services. The Independent agrees to perform the services described in the Offer Details for the Team Builder on an ongoing basis from the start date.

2. Compensation. The Team Builder pays the monthly salary shown in the Offer Details at the end of each month, with the exclusive benefits marked as included. No escrow is held on a full-time engagement.

3. Term. This agreement starts on the start date shown in the Offer Details and continues until either party ends it under section 6.

4. Objectives. The hiring manager assigns objectives as the work goes on. Progress is logged in the tracker and reviewed quarterly, with evaluations along the way.

5. Disputes. Either party may raise a payment dispute through Hireable. Hireable reviews process compliance, not work quality.

6. Termination. Either party may end the engagement with 30 days' written notice through the platform. Salary is paid pro rata up to the last working day.`;

/* ---------------------------------------------------------- interviews ---- */

/** `starts` is an invitation still waiting on the talent's answer. */
export type Interview = { id: string; role: string; roleHref: string; company: string; when: string; format: string; link?: string; status: "starts" | "accepted" | "completed" | "declined" | "cancelled"; past?: boolean };

export const interviews: Interview[] = [];

/* ----------------------------------------------------------- contracts ---- */

export type Objective = {
  id: string;
  title: string;
  /** What good looks like, as the Team Builder wrote it when assigning a full-time objective. */
  description?: string;
  kind: "kpi" | "okr" | "task";
  progress: number;
  /** IN-076 — "revision" is the Revision Requested pill; the rest read out through objectiveStatus. */
  status: "pending" | "complete" | "risk" | "on" | "revision";
  meta: string;
  current?: number;
  target?: number;
  due?: string;
  updated?: string;
  /** IN-028 — an Automatic objective's own key results; its progress is the share done. */
  keyResults?: DealKeyResult[];
  /** IN-041 — a Manual objective's own metric: what a value is counted in and the daily pace. */
  unit?: string;
  dailyTarget?: number;
  /** Cumulative progress per update, oldest first — the trend chart, extended by each new value. */
  trend?: number[];
  /** IN-041 / IN-045 — what this contract's own submissions recorded, newest first, with timestamps. */
  activity?: { at: string; text: string }[];
  /** The latest submission, as the Team Builder reviews it. */
  lastUpdate?: { date: string; text: string; value?: number; done?: boolean };
  /** IN-026 — the objective's discussion, shared with the Team Builder. */
  comments?: ObjectiveComment[];
};

/**
 * IN-076 — the status pill vocabulary the sheet asks for: No Update → On Track → Off Track →
 * Pending Approval → Revision Requested → Achieved / Missed. Off Track is derived, not stored:
 * the same TB-058 rule flips it with 7 days or fewer left and progress behind target.
 */
export function objectiveStatus(o: Objective, left: number | null): { label: string; tone: "ok" | "warn" | "danger" | "neutral" | "trial"; bar: "primary" | "ok" | "warn" } {
  if (o.status === "complete") return { label: "Achieved", tone: "ok", bar: "ok" };
  if (o.status === "pending") return { label: "Pending approval", tone: "warn", bar: "primary" };
  if (o.status === "revision") return { label: "Revision requested", tone: "danger", bar: "warn" };
  if (o.status === "risk") return { label: o.kind === "task" ? "Missed" : "Off track", tone: "danger", bar: "warn" };
  if (isOffTrack(o, left ?? 99)) return { label: "Off track", tone: "danger", bar: "warn" };
  return o.progress === 0 ? { label: "No update", tone: "neutral", bar: "primary" } : { label: "On track", tone: "ok", bar: "primary" };
}

export type Contract = {
  slug: string;
  title: string;
  company: string;
  initials: string;
  type: "trial" | "full-time";
  location: string;
  line: string;
  status: { label: string; tone: "ok" | "warn" | "danger" | "neutral" };
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
  objectives: Objective[];
  /** IN-076 Trial Fit Score — the same breakdown the Team Builder sees, with the phase that weights it. */
  /** `evaluation` is the latest evaluation's stars as a percentage, once one is in. */
  tfs: { overall: number; performance: number; profile: number; workStyle: number; evaluation?: number };
  phase: 3 | 4;
  /** TB-058 — one entry per weekday, oldest first: 0 nothing logged, 1 some, 2 all. */
  activity: number[];
  streak: number;
  /** IN-034 / IN-047 — what the Team Builder submitted, newest first. */
  evaluations: DealEvaluation[];
  /** What was funded into escrow for the trial. */
  deposit?: number;
};

/** IN-076 — the objectives agreed at the offer, each with the due and last-update dates the card shows. */

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
export const TXN_TYPES = ["Payment Deposited", "Payment Released", "Payment Refunded", "Payout"] as const;

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
export type PastEvaluation = { company: string; role: string; type: "trial" | "full-time"; date: string; stars: number; feedback: string };

export const pastEvaluations: PastEvaluation[] = [];

/** IN-062 — the bio limit, quoted in the editor and enforced by it. */
export const BIO_MAX = 500;

/**
 * TB-018 — at or above this, an applicant is a match rather than a plain application, so the
 * Team Builder's tracker files them straight into Matched instead of the Candidates column.
 */
export const MATCH_THRESHOLD = 80;

/**
 * IN-064 — the fit every role shows: Figma's 80% for this company and this talent. The demo doesn't
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
    { label: "Setup profile", done: bio.trim() !== "" && profile.skills.length > 0 && profile.rate.trim() !== "", href: "/independent/profile/edit", hint: "Bio, skills and rate — Team Builders see this first." },
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

export const thread = [
  { me: true, text: "Week 2 update is in — 5 of 6 objectives on track, the outreach KPI is at 72% of target.", time: "Yesterday" },
  { me: false, text: "Looks good — approved the week 2 update. Let’s push outreach a bit this week, you’re close.", time: "10:02" },
  { me: false, text: "I’ll set the 1:1 for Thursday 2pm, Manila time.", time: "10:03" },
];
