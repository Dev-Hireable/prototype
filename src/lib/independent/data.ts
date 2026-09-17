/** Seed content transcribed from the "[DRAFT] Independent Portal" Figma canvas. */

import type { Stage } from "@/components/independent/ui";
/** The Off Track rule and the objective-type wording are the same spec on both sides of a trial. */
import { isOffTrack } from "@/lib/team/data";

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
};

const WS = { builder: [5, 5, 2, 3, 2, 5], independent: [5, 4, 2, 2, 2, 2] }; // Figma 11321:3220 bubble positions

export const roles: Role[] = [
  {
    slug: "sales-manager",
    title: "Sales Manager",
    company: "Nairobi Solutions",
    initials: "NS",
    type: "trial",
    match: 80,
    location: "Remote, US hours",
    rate: "$1,600 /month",
    rateRange: "$1,200 to $1,600 /month",
    level: "Advanced (5–8 years)",
    posted: "Posted 3 days ago",
    closes: "Closes 30 Sep",
    savedAgo: "Saved 2 days ago",
    blurb: "Lead a six-person outbound team selling to US mid-market fintech. You own pipeline from first touch to signed contract and coach reps on discovery calls.",
    skills: ["Outbound sales", "Team leadership", "HubSpot", "Forecasting"],
    description: [
      "We are looking for a Sales Manager to lead our outbound motion for the US market. You will own pipeline from first touch to signed contract, coach two SDRs on discovery calls, and keep HubSpot accurate so forecasting is trusted.",
      "During the 30-day trial you work on three objectives with the founder. A strong trial converts to a full-time offer at the trial rate.",
    ],
    objectives: ["Book 50 discovery calls in 30 days", "Reply rate above 12% on outbound sequences", "Ship the outbound playbook with 3 measurable key results"],
    about: {
      blurb: "B2B SaaS agency based in New York. We build outbound teams for early-stage fintechs and keep them accountable with weekly metrics.",
      location: "New York, USA · remote team",
      industry: "Sales and marketing services",
      size: "10 to 49 employees",
    },
    workStyle: WS,
  },
  {
    slug: "customer-success-lead",
    title: "Customer Success Lead",
    company: "Brightline Health",
    initials: "BH",
    type: "full-time",
    match: 72,
    location: "Remote, UK hours",
    rate: "$1,400 /month",
    rateRange: "$1,200 to $1,400 /month",
    level: "Intermediate (2–5 years)",
    posted: "Posted 5 days ago",
    closes: "Closes 10 Oct",
    savedAgo: "Saved 4 days ago",
    blurb: "Own onboarding and renewals for 60 clinic accounts. Run quarterly reviews, track health scores and cut churn.",
    skills: ["Onboarding", "Account management", "Churn analysis"],
    description: ["Own onboarding and renewals for 60 clinic accounts. Run quarterly reviews, track health scores and cut churn."],
    objectives: ["Renew 30 of 38 accounts this quarter", "Keep churn under 6%", "Run 20 quarterly reviews"],
    about: { blurb: "Digital health platform for outpatient clinics across the UK.", location: "London, UK · remote team", industry: "Health tech", size: "50 to 99 employees" },
    workStyle: WS,
  },
  {
    slug: "business-development-representative",
    title: "Business Development Representative",
    company: "Kestrel Logistics",
    initials: "KL",
    type: "trial",
    match: 65,
    location: "Remote, US hours",
    rate: "$1,200 /month",
    rateRange: "$1,000 to $1,200 /month",
    level: "Intermediate (2–5 years)",
    posted: "Posted 1 week ago",
    closes: "Closes 20 Sep",
    savedAgo: "Saved 2 weeks ago",
    blurb: "Book qualified meetings for two account executives through cold calls and email sequences. Apollo and Salesforce experience preferred.",
    skills: ["Cold calling", "Apollo", "Salesforce", "Pipeline hygiene"],
    description: ["Book qualified meetings for two account executives through cold calls and email sequences. Apollo and Salesforce experience preferred."],
    objectives: ["Book 20 qualified meetings", "Keep CRM hygiene above 95%", "Launch two email sequences"],
    about: { blurb: "Freight-forwarding software for mid-size shippers.", location: "Chicago, USA · remote team", industry: "Logistics software", size: "10 to 49 employees" },
    workStyle: WS,
  },
  {
    slug: "account-executive",
    title: "Account Executive",
    company: "Summit Payments",
    initials: "SP",
    type: "full-time",
    match: 88,
    location: "Remote, AU hours",
    rate: "$1,800 /month",
    rateRange: "$1,600 to $1,800 /month",
    level: "Expert (8+ years)",
    posted: "Posted 2 weeks ago",
    closes: "Closes 15 Oct",
    savedAgo: "Saved 1 week ago",
    blurb: "Close inbound and partner-sourced deals for a payments platform. Run demos, negotiate contracts and hand off cleanly to onboarding.",
    skills: ["Enterprise sales", "Negotiation", "Demo delivery"],
    description: ["Close inbound and partner-sourced deals for a payments platform. Run demos, negotiate contracts and hand off cleanly to onboarding."],
    objectives: ["Close $40k in new ARR", "Run 25 demos", "Hand off 10 accounts to onboarding"],
    about: { blurb: "Payments platform for Australian retailers.", location: "Sydney, AU · remote team", industry: "Fintech", size: "100 to 249 employees" },
    workStyle: WS,
  },
  {
    slug: "sales-development-representative",
    title: "Sales Development Representative",
    company: "Orbit Media",
    initials: "OM",
    type: "trial",
    match: 58,
    location: "Remote, US hours",
    rate: "$1,100 /month",
    rateRange: "$900 to $1,100 /month",
    level: "Beginner (0–2 years)",
    posted: "Posted 2 weeks ago",
    closes: "Closes 5 Oct",
    savedAgo: "Saved 3 weeks ago",
    blurb: "Research accounts, write first-touch emails and keep the CRM clean for a media sales team of four.",
    skills: ["Lead research", "Outbound email", "CRM management"],
    description: ["Research accounts, write first-touch emails and keep the CRM clean for a media sales team of four."],
    objectives: ["Research 200 accounts", "Send 400 first-touch emails", "Keep CRM clean weekly"],
    about: { blurb: "Media sales agency for podcast networks.", location: "Austin, USA · remote team", industry: "Media", size: "10 to 49 employees" },
    workStyle: WS,
  },
];

export const INITIAL_SAVED = ["sales-manager", "account-executive", "business-development-representative"];

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

const APP = (id: string, stage: Stage, role: string, extra: Partial<Application> = {}): Application => {
  const r = roles.find((x) => x.slug === role) ?? roles[0];
  return { id, roleSlug: r.slug, title: r.title, company: r.company, match: r.match, submitted: "Submitted 2 Sep 2026", stage, ...extra };
};

export const applications: Application[] = [
  APP("h1", "hired", "sales-manager", { status: { label: "Hired · trial running", tone: "ok" }, submitted: "Submitted 12 Aug 2026" }),
  APP("o1", "offer_received", "customer-success-lead", { status: { label: "Offer received", tone: "ok" } }),
  APP("p2", "proposal_sent", "account-executive", { status: { label: "Proposal sent", tone: "info" } }),
  APP("i2", "invite_accepted", "business-development-representative", { status: { label: "Incoming interview", tone: "info", meta: "Thu 18 Sep · 2:00 PM" } }),
  APP("m1", "matched", "sales-development-representative", { status: { label: "Matched", tone: "info" } }),
];

/** Kanban column headers — colours lifted from the Figma "My Applications" frame. */
export const COLUMNS: { key: string; label: string; stages: Stage[]; bg: string; border: string; text: string; count: string }[] = [
  { key: "applications", label: "Applications", stages: ["applied"], bg: "#e5e5e5", border: "#c3c3c3", text: "#616161", count: "#d8d8d8" },
  { key: "matched", label: "Matched", stages: ["matched"], bg: "#ebf8fe", border: "#007acc", text: "#004675", count: "#c9eeff" },
  { key: "interviews", label: "Interviews", stages: ["invited", "invite_accepted", "interviewed"], bg: "#fff5ec", border: "#ff8112", text: "#a6520d", count: "#ffe0c4" },
  { key: "proposals", label: "Proposals", stages: ["proposal_requested", "proposal_sent"], bg: "#fff3fb", border: "#6e0e52", text: "#6e0e52", count: "#ffdbf3" },
  { key: "offers", label: "Offers", stages: ["offer_received", "offer_accepted"], bg: "#fffbeb", border: "#f2c94c", text: "#8e6f12", count: "#fff0b6" },
  { key: "hired", label: "Hired", stages: ["hired"], bg: "#f0fdf4", border: "#27ae60", text: "#1d6f3f", count: "#c6ffd2" },
];

/** The "Marketing Specialist" posting every application detail screen shows. */
export const marketingSpecialist = {
  title: "Marketing Specialist",
  posted: "Posted Jan 08, 2026",
  description:
    "We need someone to own our digital marketing end to end. You'll plan and run campaigns across social, email, and paid channels, track what's working, and report weekly. You'll work directly with the founder, async-first, with one weekly sync. We move fast and expect you to take ownership without being managed.",
  budget: "$1,500.00 - $3,500.00 /mo",
  duration: "30 Days",
  experience: "Advanced (5-8 years)",
  skills: ["Digital Marketing", "Content Creation", "SEO / SEM", "Social Media Management", "Google Analytics", "Copywriting"],
  workStyle: WS,
  interview: { date: "01/06/2026", time: "06:00 AM (EST)", link: "https://meet.google.com/yxw-vuts-rqp" },
  builder: { location: "New York, USA", since: "Member since Jan 01, 2025", contact: "Alex Rivera", company: "Nairobi Solutions" },
  expectation:
    "Write a 3-post LinkedIn content series targeting B2B SaaS buyers, set up and run a Google Ads campaign with a $500 budget, and deliver a 1-page report summarizing results and recommendations.",
  attachment: "https://docs.google.com/presentation/d/marketing-brief-q1",
  summary: { role: "Marketing Specialist", contractType: "Trial", budget: "$1,500 – $3,500 /month", duration: "30 Days" },
  proposalObjectives: ["Design Brand Awareness Campaign Collaterals", "Increase Click-Through Rate", "Drive Qualified Pipeline Through Outreach"],
  coverLetter:
    "I am a results-driven Marketing Specialist with over 5 years of experience in digital marketing, brand awareness, and campaign management. I have a strong background in managing multi-channel campaigns across email, social media, and paid advertising platforms. My approach combines data-driven strategy with creative execution to deliver measurable results for clients.\n\nIn my previous roles, I have successfully grown click-through rates by an average of 35%, managed monthly ad budgets of up to $10,000, and consistently delivered campaign assets ahead of schedule. I am confident that my skills and experience align well with the goals of this engagement, and I am excited about the opportunity to contribute to your team's success during the 30-day trial period.",
  revision: { note: "Please update the lead generation target from 50 to 75.", version: "Proposal v1", date: "Jan 1, 2026" },
  offer: {
    from: "Nairobi Solutions Inc.",
    rate: "$1,500.00 /month",
    updatedRate: "$1,600.00 /month",
    start: "Mar 30, 2026",
    end: "Apr 29, 2026",
    cadence: "One-time",
    payIn: "End of trial (1 payment)",
    total: "$1,500.00",
    updatedTotal: "$1,600.00",
    expires: "Mar 6, 2026",
    updatedExpires: "16 Sep 2026",
    updatedNote: "What changed: rate $1,500.00 to $1,600.00 per month. Everything else is the same as the offer sent on 8 Sep.",
    objectives: ["Drive Qualified Pipeline Through Outreach", "Launch LinkedIn Thought Leadership Campaign", "MQL Growth Rate"],
  },
};

export const AGREEMENT = `HIREABLE SERVICES AGREEMENT

TRIAL CONTRACT - SAMPLE DATA

USE OF THIS TEMPLATE IS OPTIONAL. HIREABLE OFFERS THE PARTIES THE OPTION TO UPLOAD THEIR OWN TERMS INSTEAD OF USING THIS TEMPLATE.

Important Disclaimer: This is a form provided on an "as is" basis without representation or warranty of any kind as to its contents. Hireable, its employees, independent contractors or lawyers are not providing you with legal advice and any use of the form is at your own risk. This form is intended to be an example of a services agreement for the Philippines, to be used as an information tool and should not be viewed as a substitute for legal advice.

1. Services. The Independent agrees to perform the services described in the Offer Details for the Team Builder during the trial period.

2. Compensation. The Team Builder funds the trial rate into escrow at acceptance. Escrow is released at the end of the trial on approval of the final evaluation.

3. Term. This agreement runs from the start date to the end date shown in the Offer Details unless ended earlier under section 6.

4. Objectives. The parties agree the trial objectives listed above. Progress is logged in the trial tracker and reviewed by the hiring manager.

5. Disputes. Either party may raise a payment dispute through Hireable. Hireable reviews process compliance, not work quality.

6. Termination. Either party may end the trial early with written notice through the platform. Escrow is released pro rata on approval.`;

/* ---------------------------------------------------------- interviews ---- */

export type Interview = { id: string; role: string; roleHref: string; company: string; when: string; format: string; status: "starts" | "accepted" | "completed" | "declined"; past?: boolean };

export const interviews: Interview[] = [
  { id: "iv1", role: "Sales Manager", roleHref: "/independent/jobs/applications/h1", company: "Nairobi Solutions Inc.", when: "Thu 10 Sep 2026, 2:00 PM PHT", format: "Google Meet", status: "starts" },
  { id: "iv2", role: "Business Development Representative", roleHref: "/independent/jobs/applications/i2", company: "Kestrel Logistics", when: "Thu 18 Sep 2026, 2:00 PM PHT", format: "Zoom", status: "accepted" },
  { id: "iv3", role: "Sales Manager", roleHref: "/independent/jobs/applications/h1", company: "Nairobi Solutions Inc.", when: "Wed 12 Aug 2026, 11:00 AM PHT", format: "Google Meet", status: "completed", past: true },
];

/* ----------------------------------------------------------- contracts ---- */

export type Objective = {
  id: string;
  title: string;
  kind: "kpi" | "okr" | "task";
  progress: number;
  /** IN-076 — "revision" is the Revision Requested pill; the rest read out through objectiveStatus. */
  status: "pending" | "complete" | "risk" | "on" | "revision";
  meta: string;
  current?: number;
  target?: number;
  due?: string;
  updated?: string;
  keyResults?: number;
  /** IN-041 — a Manual objective's own metric: what a value is counted in and the daily pace. */
  unit?: string;
  dailyTarget?: number;
  /** Cumulative progress per update, oldest first — the trend chart, extended by each new value. */
  trend?: number[];
  /** IN-041 / IN-045 — what this contract's own submissions recorded, newest first, with timestamps. */
  activity?: { at: string; text: string }[];
};

/** "Day 18 of 30" → 12 left; a full-time contract has no countdown. */
export const daysLeft = (day: string) => {
  const m = day.match(/Day (\d+) of (\d+)/);
  return m ? Number(m[2]) - Number(m[1]) : null;
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
  rate: string;
  objectives: Objective[];
  /** IN-076 Trial Fit Score — the same breakdown the Team Builder sees, with the phase that weights it. */
  tfs: { overall: number; performance: number; profile: number; workStyle: number };
  phase: 3 | 4;
  /** TB-058 — one entry per weekday, oldest first: 0 nothing logged, 1 some, 2 all. */
  activity: number[];
  streak: number;
};

/** IN-076 — the objectives agreed at the offer, each with the due and last-update dates the card shows. */
const NS_OBJECTIVES: Objective[] = [
  { id: "demos", title: "Book 20 qualified demos by day 30", kind: "kpi", progress: 65, status: "pending", meta: "13 of 20 booked", current: 13, target: 20, due: "24 Sep 2026", updated: "8 Sep 2026", unit: "demos", dailyTarget: 2, trend: [5, 10, 20, 30, 35, 45, 50, 60, 65] },
  { id: "sequence", title: "Rebuild the outbound email sequence", kind: "task", progress: 100, status: "complete", meta: "Approved by Alex", due: "5 Sep 2026", updated: "3 Sep 2026" },
  { id: "reply", title: "Lift reply rate from 4% to 8%", kind: "okr", progress: 33, status: "on", meta: "Now 5.2% · 1 of 3 key results approved", due: "24 Sep 2026", updated: "6 Sep 2026", keyResults: 3 },
  { id: "crm", title: "Clean the CRM pipeline stages", kind: "task", progress: 100, status: "complete", meta: "Approved by Alex", due: "29 Aug 2026", updated: "29 Aug 2026" },
];

export const contracts: Contract[] = [
  {
    slug: "sales-manager",
    title: "Sales Manager",
    company: "Nairobi Solutions",
    initials: "NS",
    type: "trial",
    location: "Remote, US hours",
    line: "Started 25 Aug 2026 · Day 18 of 30 · $1,600 /month · Manager: Alex Rivera",
    status: { label: "On track", tone: "ok" },
    progressLabel: "Trial progress",
    progress: 60,
    progressTone: "primary",
    manager: "Alex Rivera",
    managerFirst: "Alex",
    started: "25 Aug 2026",
    day: "Day 18 of 30",
    ends: "24 Sep 2026",
    rate: "$1,600 /month",
    objectives: NS_OBJECTIVES,
    tfs: { overall: 82, performance: 86, profile: 80, workStyle: 76 },
    phase: 3,
    activity: [2, 2, 1, 2, 2, 2, 0, 2, 1, 2, 2, 2, 2, 1, 2, 2, 0, 2],
    streak: 6,
  },
];

/**
 * IN-049 — the Team Builder's company as the independent sees it from a contract: read-only,
 * keyed by the company name on the contract so every contract can show the firm it belongs to.
 */
export type CompanyProfile = { name: string; description: string; industry: string; location: string; url: string; tags: string[] };

export const COMPANIES: Record<string, CompanyProfile> = {
  "Nairobi Solutions": {
    name: "Nairobi Solutions Inc.",
    description: "B2B SaaS agency based in New York. We build outbound teams for early-stage fintechs and keep them accountable with weekly metrics.",
    industry: "Sales and marketing services",
    location: "New York, USA · remote team",
    url: "www.nairobisolutions.com",
    tags: ["Direct", "Data-driven", "Async first", "Weekly check-ins", "Coaching"],
  },
  "Brightline Health": {
    name: "Brightline Health",
    description: "Digital health platform for outpatient clinics across the UK. Sixty clinic accounts, onboarded and renewed by a small customer team.",
    industry: "Health tech",
    location: "London, UK · remote team",
    url: "www.brightlinehealth.co.uk",
    tags: ["Structured", "Documentation first", "Quarterly reviews", "Low meeting load"],
  },
  "Kestrel Logistics": {
    name: "Kestrel Logistics",
    description: "Freight-forwarding software for mid-size shippers, sold to operations teams across the US midwest.",
    industry: "Logistics software",
    location: "Chicago, USA · remote team",
    url: "www.kestrellogistics.com",
    tags: ["Fast-moving", "Hands-on", "Daily stand-ups"],
  },
  "Summit Payments": {
    name: "Summit Payments",
    description: "Payments platform for Australian retailers, from in-store terminals to online checkout.",
    industry: "Fintech",
    location: "Sydney, AU · remote team",
    url: "www.summitpayments.com.au",
    tags: ["Process-led", "Compliance aware", "Async first"],
  },
  "Orbit Media": {
    name: "Orbit Media",
    description: "Media sales agency representing podcast networks to brand advertisers.",
    industry: "Media",
    location: "Austin, USA · remote team",
    url: "www.orbitmedia.fm",
    tags: ["Creative", "Collaborative", "Weekly check-ins"],
  },
  "Harbor Analytics": {
    name: "Harbor Analytics",
    description: "Revenue analytics for European SaaS teams — dashboards, forecasting and pipeline hygiene.",
    industry: "Analytics",
    location: "Amsterdam, NL · remote team",
    url: "www.harboranalytics.eu",
    tags: ["Analytical", "Detail-oriented", "Async first"],
  },
};

/**
 * IN-047 — a full-time engagement collects evaluations as it goes, so they are a list per
 * contract rather than the single post-trial one below.
 */
export type ContractEvaluation = { date: string; stars: number; feedback: string; recommendation: string };

export const contractEvaluations: Record<string, ContractEvaluation[]> = {};

export const evaluation = {
  /** IN-034 — the overall star rating the Team Builder submits alongside the criteria scores. */
  stars: 4,
  submitted: "Submitted 1 Oct 2026. Scores are final and feed your trial fit score.",
  scores: [
    { label: "Quality of work", value: 4 },
    { label: "Communication", value: 5 },
    { label: "Reliability", value: 4 },
    { label: "Initiative", value: 4 },
    { label: "Collaboration", value: 3 },
  ],
  average: "Average score 4.0 of 5",
  recommendation: "Recommend a full-time offer at the trial rate.",
  comments:
    "Juan exceeded the call target in week three and booked six demos. Communication was clear and daily check-ins were on time. Recommend a full-time offer at the trial rate.",
  fit: { locked: "Locked at phase 4 on 1 Oct 2026, after the employer evaluation. It cannot move again." },
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
export type Transaction = { date: string; /** yyyymmdd — the ledger sorts newest first and filters by range on this, not on the printed date. */ at: number; desc: string; party: string; type: TxnType; contract?: string; amount: string; status: { label: string; tone: "ok" | "warn" | "danger" | "neutral" } };

export const transactions: Transaction[] = [
  { date: "25 Aug 2026", at: 20260825, desc: "Escrow funded · Sales Manager trial", party: "Nairobi Solutions", type: "Payment Deposited", contract: "sales-manager", amount: "$1,600.00", status: { label: "Held", tone: "warn" } },
];

/** IN-032 / IN-059 — one dispute per contract, so the tab shows it and the button stops offering another. */
export type Dispute = { id: string; contract: string; filed: string; reason: string; description: string; amount: string; evidence?: string; status: { label: string; tone: "ok" | "warn" | "danger" | "neutral" }; resolution?: { outcome: string; notes: string } };

export const disputes: Dispute[] = [];

/** IN-032 — the reasons the dispute form offers, kept with the data so IN-059 reuses them. */
/** IN-059 — the four reason codes the sheet allows on a dispute. */
export const DISPUTE_REASONS = ["Missing Deliverable", "Out-of-Scope Output", "Missed Deadline", "No Report Submitted"];

/* ------------------------------------------------------------ profile ----- */

/**
 * IN-063 / IN-064 — the work-style quiz. One question per trait on the profile chart, answered
 * 1–5. The answers are the independent's own work style: the tags on the profile and the match
 * percentage on every role are both derived from them, so retaking the quiz really does move them.
 */
export type WorkStyleQuestion = { trait: string; question: string; options: { label: string; value: number }[] };

export const WORK_STYLE_QUESTIONS: WorkStyleQuestion[] = [
  {
    trait: "Decision Making",
    question: "How do you decide when the data is thin?",
    options: [
      { label: "Wait until the team agrees", value: 1 },
      { label: "Ask one or two people, then decide", value: 3 },
      { label: "Call it and move — correct later if needed", value: 5 },
    ],
  },
  {
    trait: "Adaptability",
    question: "A priority changes mid-week. What happens?",
    options: [
      { label: "Finish what's started first", value: 1 },
      { label: "Re-plan at the next check-in", value: 3 },
      { label: "Drop everything and re-plan on the spot", value: 5 },
    ],
  },
  {
    trait: "Responsiveness",
    question: "How quickly do you reply during the working day?",
    options: [
      { label: "In batches, once or twice a day", value: 1 },
      { label: "Within a couple of hours", value: 3 },
      { label: "Within minutes, most of the day", value: 5 },
    ],
  },
  {
    trait: "Time Management",
    question: "How do you run your day?",
    options: [
      { label: "Loosely, by whatever has the most energy", value: 1 },
      { label: "A short list, roughly in order", value: 3 },
      { label: "Blocked out and scheduled in advance", value: 5 },
    ],
  },
  {
    trait: "Cooperativeness",
    question: "How much of the work is with other people?",
    options: [
      { label: "Heads-down on my own", value: 1 },
      { label: "Solo, with regular check-ins", value: 3 },
      { label: "Alongside others for most of it", value: 5 },
    ],
  },
  {
    trait: "Communication",
    question: "How do you keep people posted?",
    options: [
      { label: "When there is something worth saying", value: 1 },
      { label: "A summary at the end of each week", value: 3 },
      { label: "Written updates as the work moves", value: 5 },
    ],
  },
];

/** OB-003 — "Something else" is scored as the middle of the scale; the words are kept as written. */
export const OTHER_VALUE = 3;

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
 * on top of these (see contractEvaluations), so the section is the whole record, not a seed list.
 */
export type PastEvaluation = { company: string; role: string; type: "trial" | "full-time"; date: string; stars: number; feedback: string };

export const pastEvaluations: PastEvaluation[] = [
  {
    company: "Orbit Media",
    role: "Sales Development Representative",
    type: "full-time",
    date: "31 Aug 2026",
    stars: 4,
    feedback: "Researched the account list properly and kept the CRM clean for eight months. Comfortable handing him a bigger territory next time.",
  },
  {
    company: "Vela Partners",
    role: "Business Development Representative",
    type: "trial",
    date: "30 Jul 2026",
    stars: 5,
    feedback: "Beat the meeting target in week two and wrote the sequence the team still uses. Would hire full-time if the headcount had been there.",
  },
  {
    company: "Harbor Analytics",
    role: "Sales Operations Analyst",
    type: "trial",
    date: "12 Jun 2026",
    stars: 3,
    feedback: "Solid fundamentals and reliable reporting. Prioritisation needed steering early on, but the weekly pack was always on time.",
  },
];

/** IN-062 — the bio limit, quoted in the editor and enforced by it. */
export const BIO_MAX = 500;

/** The answers on file. WS.independent in the role seed is the same vector, from the last quiz. */
export const WORK_STYLE_ANSWERS = [5, 4, 2, 2, 2, 2];

/** IN-063 — the tag each trait earns at the top or the bottom of its scale; 3 is unremarkable. */
const TAGS_BY_TRAIT: [string, string][] = [
  ["Consultative", "Decisive"],
  ["Steady", "Adaptive"],
  ["Considered", "Responsive"],
  ["Flexible", "Organised"],
  ["Independent", "Collaborative"],
  ["Concise", "Communicative"],
];

/** IN-063 — tags are derived, never typed in: the quiz is the only thing that can change them. */
export function tagsFor(answers: number[]) {
  const tags = answers.map((a, i) => (a >= 4 ? TAGS_BY_TRAIT[i][1] : a <= 2 ? TAGS_BY_TRAIT[i][0] : null)).filter((t): t is string => !!t);
  return tags.length ? tags : ["Balanced"];
}

/** How closely two work-style vectors sit, 0–100. */
const similarity = (a: number[], b: number[]) => Math.round(100 - (a.reduce((n, v, i) => n + Math.abs(v - (b[i] ?? 3)), 0) / (a.length * 4)) * 100);

/**
 * IN-064 — the match on a role moves with the quiz. The seeded percentage is the baseline for the
 * answers on file, and a retake shifts it by however much closer to (or further from) the Team
 * Builder's own style the new answers sit. Unchanged answers leave every number where it was.
 */
export function matchFor(role: { match: number; workStyle: { builder: number[] } }, answers: number[]) {
  const delta = similarity(role.workStyle.builder, answers) - similarity(role.workStyle.builder, WORK_STYLE_ANSWERS);
  return Math.max(0, Math.min(100, role.match + delta));
}

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
export function setupSteps({ payouts, applications, workStyle = WORK_STYLE_ANSWERS, bio = profile.bio }: { payouts: PayoutMethod[]; applications: Application[]; workStyle?: number[]; bio?: string }) {
  return [
    // Nothing in the demo tracks email confirmation, so this one is simply already true.
    { label: "Verify email", done: true, href: "/independent/settings", hint: "Confirm the address we send role alerts to." },
    { label: "Answer Work Style Quiz", done: workStyle.length > 0, href: "/independent/profile", hint: "Drives your match score against every open role." },
    { label: "Setup profile", done: bio.trim() !== "" && profile.skills.length > 0 && profile.rate.trim() !== "", href: "/independent/profile/edit", hint: "Bio, skills and rate — Team Builders see this first." },
    { label: "Setup payment method", done: payouts.length > 0, href: "/independent/settings/payout", hint: "Where your trial and salary payments are released." },
    // No point applying before there is a profile to send or an account to be paid into.
    { label: "Apply to a role", done: applications.length > 0, href: "/independent/jobs", hint: "Browse matched roles and send your first application.", requires: ["Setup profile", "Setup payment method"] },
  ];
}

/* ------------------------------------------------------- notifications ---- */

export type Notification = { id: string; group: "Today" | "Yesterday" | "Earlier"; title: string; body: string; time: string; unread: boolean; kind: "contracts" | "offers" | "payments" | "interviews" | "other"; href: string };

export const notifications: Notification[] = [
  { id: "n1", group: "Today", title: "Week 2 update approved", body: "Alex Rivera approved your update for Sales Manager — 3 of 4 objectives on track.", time: "10:02", unread: true, kind: "contracts", href: "/independent/contracts/sales-manager" },
  { id: "n2", group: "Today", title: "Payout method verified", body: "Your Maya account is verified. Trial payments will be released to it at each cycle end.", time: "08:15", unread: true, kind: "payments", href: "/independent/wallet" },
  { id: "n3", group: "Yesterday", title: "Interview confirmed", body: "Kestrel Logistics confirmed your Business Development Representative interview for Thu 18 Sep, 2:00 PM PHT.", time: "16:40", unread: false, kind: "interviews", href: "/independent/jobs/interviews" },
  { id: "n4", group: "Earlier", title: "Objective due in 3 days", body: "“Book 20 qualified demos by day 30” is at 65% — log progress to stay on track.", time: "8 Sep", unread: false, kind: "contracts", href: "/independent/contracts/sales-manager/objectives/demos" },
  { id: "n5", group: "Earlier", title: "Escrow funded", body: "Nairobi Solutions funded $1,600 for your Sales Manager trial. You started on 25 Aug.", time: "25 Aug", unread: false, kind: "payments", href: "/independent/wallet" },
];

/* ------------------------------------------------------------ messages ---- */

export const conversations = [
  { id: "c1", name: "Nairobi Solutions", sub: "Alex Rivera · Sales Manager trial", preview: "Looks good — approved the week 2 update.", time: "10:02", unread: 1, initials: "NS" },
  { id: "c2", name: "Brightline Health", sub: "Owen Price · Customer Success", preview: "Offer letter attached, have a read.", time: "Yesterday", unread: 0, initials: "BH" },
  { id: "c3", name: "Vela Partners", sub: "Ana Reyes · Account Executive", preview: "Interview moved to Thursday 2pm.", time: "Tue", unread: 0, initials: "VP" },
  { id: "c4", name: "Hireable support", sub: "Payouts", preview: "Your Maya payout method is verified.", time: "8 Sep", unread: 0, initials: "H" },
];

export const thread = [
  { me: true, text: "Week 2 update is in — 5 of 6 objectives on track, the outreach KPI is at 72% of target.", time: "Yesterday" },
  { me: false, text: "Looks good — approved the week 2 update. Let’s push outreach a bit this week, you’re close.", time: "10:02" },
  { me: false, text: "I’ll set the 1:1 for Thursday 2pm, Manila time.", time: "10:03" },
];
