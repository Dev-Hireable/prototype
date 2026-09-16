import type { Stage } from "@/components/independent/ui";

/** Seed data for the Team Builder portal — every string is lifted from the Figma "Team Builder" canvas. */

export const ME = { name: "Alex Rivera", first: "Alex", title: "Head of Sales", company: "Nairobi Solutions Inc.", avatar: "/team/alex.jpg" };

export type Tone = "ok" | "warn" | "danger" | "info" | "neutral" | "trial";

export type Independent = {
  slug: string;
  name: string;
  role: string;
  avatar: string;
  match: number;
  rate: string;
  level: string;
  location: string;
  skills: string[];
  bio: string;
  /** Intro video still (Figma asset); others fall back to their photo. */
  intro?: string;
  workStyle: { builder: number[]; independent: number[] };
};

const WS = { builder: [5, 5, 2, 3, 2, 5], independent: [5, 4, 2, 2, 2, 2] };

export const independents: Independent[] = [
  {
    slug: "juan-dela-cruz",
    name: "Juan Dela Cruz",
    role: "Sales Manager",
    avatar: "/team/juan.jpg",
    intro: "/team/intro-juan.jpg",
    match: 80,
    rate: "$1,600 /month",
    level: "Advanced (5–8 years)",
    location: "Manila, Philippines",
    skills: ["Lead generation", "Cold calling", "CRM management", "LinkedIn prospecting", "Sales outreach"],
    bio: "Sales leader with eight years in B2B SaaS, most recently running a six-person outbound team for a US fintech. I own pipeline from first touch to signed contract, coach reps on discovery calls, and keep the CRM honest.",
    workStyle: WS,
  },
  {
    slug: "maria-santos",
    name: "Maria Santos",
    role: "Customer Success Lead",
    avatar: "/team/maria.jpg",
    match: 72,
    rate: "$1,400 /month",
    level: "Intermediate (2–5 years)",
    location: "Cebu City, Philippines",
    skills: ["Onboarding", "Account management", "HubSpot", "Churn analysis"],
    bio: "Customer success lead for outpatient health platforms. I run onboarding and renewals for 60 clinic accounts and keep churn under 6%.",
    workStyle: { builder: [5, 4, 3, 3, 2, 4], independent: [4, 4, 3, 2, 2, 4] },
  },
  {
    slug: "paolo-reyes",
    name: "Paolo Reyes",
    role: "Business Development Representative",
    avatar: "/team/paolo.jpg",
    match: 65,
    rate: "$1,200 /month",
    level: "Intermediate (2–5 years)",
    location: "Quezon City, Philippines",
    skills: ["Outbound email", "Cold calling", "Apollo", "Pipeline hygiene"],
    bio: "BDR booking qualified meetings for two account executives through cold calls and email sequences. Apollo and Salesforce certified.",
    workStyle: { builder: [5, 5, 2, 3, 2, 5], independent: [3, 4, 2, 3, 3, 2] },
  },
  {
    slug: "andrea-lim",
    name: "Andrea Lim",
    role: "Account Executive",
    avatar: "/team/andrea.jpg",
    match: 88,
    rate: "$1,800 /month",
    level: "Expert (8+ years)",
    location: "Makati, Philippines",
    skills: ["Enterprise sales", "Negotiation", "Demo delivery", "Salesforce", "Forecasting"],
    bio: "Account executive closing inbound and partner-sourced deals for payments platforms. I run demos, negotiate contracts and hand off cleanly to onboarding.",
    workStyle: { builder: [5, 5, 2, 3, 2, 5], independent: [5, 5, 2, 3, 2, 4] },
  },
];

export const INITIAL_SAVED = ["juan-dela-cruz", "andrea-lim"];

/* ------------------------------------------------------------------ roles */

export type RoleStatus = "Active" | "Draft" | "Closed" | "Archived";
export type Role = {
  slug: string;
  title: string;
  type: "trial" | "full-time";
  status: RoleStatus;
  candidates: number | null;
  matched: number | null;
  interviews: number | null;
  offers: number | null;
  hired: number | null;
  updated: string;
  description: string;
  budget: string;
  duration: string;
  experience: string;
  skills: string[];
  expectation: string;
  attachment: string;
};

const DESC =
  "We need someone to own our digital marketing end to end. You'll plan and run campaigns across social, email, and paid channels, track what's working, and report weekly. You'll work directly with the founder, async-first, with one weekly sync. We move fast and expect you to take ownership without being managed.";

const ROLE = (r: Partial<Role> & Pick<Role, "slug" | "title" | "type" | "status" | "updated">): Role => ({
  candidates: 0,
  matched: 0,
  interviews: 0,
  offers: 0,
  hired: 0,
  description: DESC,
  budget: "$1,500.00 - $3,500.00 /mo",
  duration: "30 Days",
  experience: "Advanced (5-8 years)",
  skills: ["Digital Marketing", "Content Creation", "SEO / SEM", "Social Media Management", "Google Analytics", "Copywriting"],
  expectation:
    "Write a 3-post LinkedIn content series targeting B2B SaaS buyers, set up and run a Google Ads campaign with a $500 budget, and deliver a 1-page report summarizing results and recommendations.",
  attachment: "https://docs.google.com/presentation/d/marketing-brief-q1",
  ...r,
});

export const roles: Role[] = [
  ROLE({ slug: "sales-manager", title: "Sales Manager", type: "trial", status: "Active", candidates: 24, matched: 8, interviews: 4, offers: 1, hired: 0, updated: "2 Sep 2026" }),
  ROLE({ slug: "customer-success-lead", title: "Customer Success Lead", type: "full-time", status: "Active", candidates: 31, matched: 12, interviews: 6, offers: 2, hired: 1, updated: "28 Aug 2026" }),
  ROLE({ slug: "sales-development-rep", title: "Sales Development Rep", type: "trial", status: "Active", candidates: 9, matched: 3, interviews: 1, offers: 0, hired: 0, updated: "8 Sep 2026" }),
  ROLE({ slug: "account-executive", title: "Account Executive", type: "full-time", status: "Draft", candidates: null, matched: null, interviews: null, offers: null, hired: null, updated: "9 Sep 2026" }),
  ROLE({ slug: "marketing-specialist", title: "Marketing Specialist", type: "trial", status: "Closed", candidates: 18, matched: 6, interviews: 3, offers: 1, hired: 1, updated: "31 Aug 2026" }),
];

export const ROLE_STATUS: Record<RoleStatus, Tone> = { Active: "ok", Draft: "neutral", Closed: "danger", Archived: "neutral" };

/* ------------------------------------------------------------- candidates */

export type Candidate = {
  id: string;
  independent: string; // Independent slug
  role: string; // Role slug
  stage: Stage;
  status?: { label: string; tone: Tone; meta?: string };
  submitted: string;
  dropped?: boolean;
};

export const candidates: Candidate[] = [
  { id: "c1", independent: "juan-dela-cruz", role: "sales-manager", stage: "invited", status: { label: "Awaiting reply", tone: "neutral", meta: "01/06/2026 · 06:00 AM (EST)" }, submitted: "Applied 2 Sep 2026" },
  { id: "c2", independent: "maria-santos", role: "sales-manager", stage: "matched", status: { label: "Interested", tone: "info" }, submitted: "Applied 9 Sep 2026" },
  { id: "c3", independent: "paolo-reyes", role: "sales-manager", stage: "interviewed", status: { label: "Interview completed", tone: "ok", meta: "10 Sep" }, submitted: "Applied 1 Sep 2026" },
  { id: "c4", independent: "andrea-lim", role: "sales-manager", stage: "proposal_sent", status: { label: "Proposal received", tone: "info", meta: "v1 · 7 Sep" }, submitted: "Applied 28 Aug 2026" },
  { id: "c5", independent: "maria-santos", role: "customer-success-lead", stage: "hired", status: { label: "Hired", tone: "ok", meta: "2 Mar 2026" }, submitted: "Applied 10 Feb 2026" },
  { id: "c6", independent: "paolo-reyes", role: "sales-development-rep", stage: "offer_received", status: { label: "Offer sent", tone: "warn", meta: "Expires 16 Sep" }, submitted: "Applied 20 Aug 2026" },
];

/** Employer-side wording for the shared pipeline tracker. */
export const EMPLOYER_STAGE_LABELS: Partial<Record<Stage, string>> = {
  applied: "Interested",
  invited: "Interview invitation sent",
  proposal_sent: "Proposal received",
  offer_received: "Offer sent",
};

/* ------------------------------------------------------------- interviews */

export type Interview = { id: string; independent: string; role: string; when: string; format: string; status: { label: string; tone: Tone }; past?: boolean };

export const interviews: Interview[] = [
  { id: "iv1", independent: "juan-dela-cruz", role: "Sales Manager", when: "Thu 10 Sep 2026, 2:00 PM PHT", format: "Google Meet", status: { label: "Starts in 12 min", tone: "info" } },
  { id: "iv2", independent: "maria-santos", role: "Customer Success Lead", when: "Fri 11 Sep 2026, 10:00 AM PHT", format: "Zoom", status: { label: "Scheduled", tone: "info" } },
  { id: "iv3", independent: "paolo-reyes", role: "Sales Development Rep", when: "Mon 14 Sep 2026, 9:30 AM PHT", format: "Google Meet", status: { label: "Awaiting reply", tone: "neutral" } },
  { id: "iv4", independent: "andrea-lim", role: "Account Executive", when: "Tue 1 Sep 2026, 4:00 PM PHT", format: "Google Meet", status: { label: "Completed", tone: "neutral" }, past: true },
  { id: "iv5", independent: "paolo-reyes", role: "BDR", when: "Thu 27 Aug 2026, 9:00 AM PHT", format: "Zoom", status: { label: "Completed", tone: "neutral" }, past: true },
  { id: "iv6", independent: "maria-santos", role: "Customer Success Lead", when: "Mon 17 Aug 2026, 3:00 PM PHT", format: "Google Meet", status: { label: "Completed", tone: "neutral" }, past: true },
  { id: "iv7", independent: "juan-dela-cruz", role: "Sales Manager", when: "Wed 12 Aug 2026, 11:00 AM PHT", format: "Zoom", status: { label: "Cancelled", tone: "danger" }, past: true },
];

/* ----------------------------------------------------------------- offers */

export type Offer = { id: string; independent: string; role: string; sent: string; rate: string; start: string; status: { label: string; tone: Tone } };

export const offers: Offer[] = [
  { id: "o1", independent: "juan-dela-cruz", role: "Sales Manager", sent: "8 Sep 2026", rate: "$1,600 /month", start: "1 Oct 2026", status: { label: "Pending", tone: "warn" } },
  { id: "o2", independent: "paolo-reyes", role: "Sales Development Rep", sent: "6 Sep 2026", rate: "$1,200 /month", start: "21 Sep 2026", status: { label: "Pending", tone: "warn" } },
  { id: "o3", independent: "maria-santos", role: "Customer Success Lead", sent: "20 Feb 2026", rate: "$1,400 /month", start: "2 Mar 2026", status: { label: "Accepted", tone: "ok" } },
  { id: "o4", independent: "andrea-lim", role: "Account Executive", sent: "18 Jul 2026", rate: "$1,800 /month", start: "1 Aug 2026", status: { label: "Accepted", tone: "ok" } },
  { id: "o5", independent: "paolo-reyes", role: "BDR", sent: "2 Jul 2026", rate: "$1,100 /month", start: "15 Jul 2026", status: { label: "Declined", tone: "danger" } },
];

/* -------------------------------------------------------------- contracts */

export type Objective = { id: string; title: string; kind: "kpi" | "okr" | "task"; progress: number; status: "pending" | "complete" | "risk" | "on"; meta: string };

export type Contract = {
  slug: string;
  independent: string;
  role: string;
  type: "trial" | "full-time";
  status: { label: string; tone: Tone };
  progress: number | null;
  progressLabel: string;
  started: string;
  day: string;
  ends: string;
  rate: string;
  manager: string;
  objectives: Objective[];
};

const OBJECTIVES: Objective[] = [
  { id: "demos", title: "Book 20 qualified demos by day 30", kind: "kpi", progress: 65, status: "pending", meta: "13 of 20 booked · updated 8 Sep" },
  { id: "sequence", title: "Rebuild the outbound email sequence", kind: "task", progress: 100, status: "complete", meta: "Approved 3 Sep" },
  { id: "reply", title: "Lift reply rate from 4% to 8%", kind: "okr", progress: 30, status: "risk", meta: "Now 5.2% · updated 6 Sep" },
  { id: "crm", title: "Clean the CRM pipeline stages", kind: "task", progress: 100, status: "complete", meta: "Approved 29 Aug" },
];

export const contracts: Contract[] = [
  { slug: "juan-dela-cruz", independent: "juan-dela-cruz", role: "Sales Manager", type: "trial", status: { label: "On track", tone: "ok" }, progress: 60, progressLabel: "Trial progress", started: "25 Aug 2026", day: "Day 18 of 30", ends: "24 Sep 2026", rate: "$1,600 /month", manager: "Alex Rivera", objectives: OBJECTIVES },
  { slug: "maria-santos", independent: "maria-santos", role: "Customer Success Lead", type: "full-time", status: { label: "Active", tone: "ok" }, progress: null, progressLabel: "Hired full-time", started: "02 Mar 2026", day: "Month 7", ends: "Ongoing", rate: "$1,400 /month", manager: "Alex Rivera", objectives: OBJECTIVES.slice(0, 3) },
  { slug: "paolo-reyes", independent: "paolo-reyes", role: "Business Development Representative", type: "trial", status: { label: "Update pending", tone: "warn" }, progress: 35, progressLabel: "Trial progress", started: "01 Sep 2026", day: "Day 10 of 30", ends: "30 Sep 2026", rate: "$1,200 /month", manager: "Alex Rivera", objectives: OBJECTIVES.slice(0, 2) },
  { slug: "andrea-lim", independent: "andrea-lim", role: "Account Executive", type: "trial", status: { label: "Evaluation due", tone: "info" }, progress: 100, progressLabel: "Trial progress", started: "28 Aug 2026", day: "Day 30 of 30", ends: "26 Sep 2026", rate: "$1,800 /month", manager: "Alex Rivera", objectives: OBJECTIVES },
  { slug: "carlo-mendoza", independent: "juan-dela-cruz", role: "Sales Development Representative", type: "full-time", status: { label: "Ended", tone: "neutral" }, progress: 100, progressLabel: "Contract complete", started: "15 Jan 2026", day: "Ended 31 Aug", ends: "31 Aug 2026", rate: "$1,100 /month", manager: "Alex Rivera", objectives: OBJECTIVES.slice(1, 3) },
  { slug: "bea-villanueva", independent: "maria-santos", role: "Sales Operations Analyst", type: "trial", status: { label: "Off track", tone: "danger" }, progress: 20, progressLabel: "Trial progress", started: "20 Aug 2026", day: "Day 22 of 30", ends: "19 Sep 2026", rate: "$1,300 /month", manager: "Alex Rivera", objectives: OBJECTIVES.slice(2) },
];

/** Display names for the two contracts whose seed avatar is reused. */
export const CONTRACT_NAMES: Record<string, string> = { "carlo-mendoza": "Carlo Mendoza", "bea-villanueva": "Bea Villanueva" };

/* ----------------------------------------------------------------- money */

export type Transaction = {
  id: string;
  date: string;
  desc: string;
  independent: string;
  type: "Escrow deposit" | "Full-time salary" | "Trial payout" | "Refund";
  amount: string;
  status: { label: string; tone: Tone };
  /** Figma "Payments / Transaction · detail drawer" */
  detail: { time: string; drawerStatus: string; rows: [string, string][]; breakdown: [string, string][]; total: string; timeline: { title: string; date: string; done: boolean }[] };
};

export const transactions: Transaction[] = [
  {
    id: "t1", date: "8 Sep 2026", desc: "Escrow deposit · Sales Manager trial", independent: "Juan Dela Cruz", type: "Escrow deposit", amount: "$1,600.00", status: { label: "Held", tone: "warn" },
    detail: { time: "8 Sep 2026, 3:42 PM PHT", drawerStatus: "Held in escrow", rows: [["Reference", "TXN-2026-09-08-0412"], ["Independent", "Juan Dela Cruz"], ["Role", "Sales Manager · 30-day trial"], ["Payment method", "Visa ending 4242"], ["Releases on", "30 Sep 2026, when the trial ends"]], breakdown: [["Trial rate", "$1,600.00"], ["Platform fee", "Included"]], total: "$1,600.00", timeline: [{ title: "Deposit charged to Visa ending 4242", date: "8 Sep 2026", done: true }, { title: "Funds held in escrow", date: "8 Sep 2026", done: true }, { title: "Released to Juan Dela Cruz after the trial", date: "30 Sep 2026", done: false }] },
  },
  {
    id: "t2", date: "1 Sep 2026", desc: "Salary · Customer Success Lead · Sep 2026", independent: "Maria Santos", type: "Full-time salary", amount: "$1,400.00", status: { label: "Paid", tone: "ok" },
    detail: { time: "1 Sep 2026, 9:00 AM PHT", drawerStatus: "Paid", rows: [["Reference", "TXN-2026-09-01-0188"], ["Independent", "Maria Santos"], ["Role", "Customer Success Lead · full-time"], ["Payment method", "Visa ending 4242"], ["Period", "Sep 2026"]], breakdown: [["Monthly salary", "$1,400.00"], ["Platform fee", "Included"]], total: "$1,400.00", timeline: [{ title: "Salary charged to Visa ending 4242", date: "1 Sep 2026", done: true }, { title: "Paid to Maria Santos", date: "1 Sep 2026", done: true }] },
  },
  {
    id: "t3", date: "31 Aug 2026", desc: "Trial payout · Account Executive", independent: "Andrea Lim", type: "Trial payout", amount: "$1,800.00", status: { label: "Paid", tone: "ok" },
    detail: { time: "31 Aug 2026, 6:10 PM PHT", drawerStatus: "Paid", rows: [["Reference", "TXN-2026-08-31-0973"], ["Independent", "Andrea Lim"], ["Role", "Account Executive · 30-day trial"], ["Payment method", "Escrow release"], ["Released on", "31 Aug 2026, after your evaluation"]], breakdown: [["Trial rate", "$1,800.00"], ["Platform fee", "Included"]], total: "$1,800.00", timeline: [{ title: "Deposit charged to Visa ending 4242", date: "1 Aug 2026", done: true }, { title: "Funds held in escrow", date: "1 Aug 2026", done: true }, { title: "Released to Andrea Lim after the trial", date: "31 Aug 2026", done: true }] },
  },
  {
    id: "t4", date: "19 Aug 2026", desc: "Escrow deposit · Sales Development Rep", independent: "Paolo Reyes", type: "Escrow deposit", amount: "$1,200.00", status: { label: "Pending release", tone: "neutral" },
    detail: { time: "19 Aug 2026, 11:24 AM PHT", drawerStatus: "Pending release", rows: [["Reference", "TXN-2026-08-19-0551"], ["Independent", "Paolo Reyes"], ["Role", "Sales Development Rep · 30-day trial"], ["Payment method", "Visa ending 4242"], ["Releases on", "30 Sep 2026, when the trial ends"]], breakdown: [["Trial rate", "$1,200.00"], ["Platform fee", "Included"]], total: "$1,200.00", timeline: [{ title: "Deposit charged to Visa ending 4242", date: "19 Aug 2026", done: true }, { title: "Funds held in escrow", date: "19 Aug 2026", done: true }, { title: "Released to Paolo Reyes after the trial", date: "30 Sep 2026", done: false }] },
  },
  {
    id: "t5", date: "1 Aug 2026", desc: "Salary · Customer Success Lead · Aug 2026", independent: "Maria Santos", type: "Full-time salary", amount: "$1,400.00", status: { label: "Paid", tone: "ok" },
    detail: { time: "1 Aug 2026, 9:00 AM PHT", drawerStatus: "Paid", rows: [["Reference", "TXN-2026-08-01-0142"], ["Independent", "Maria Santos"], ["Role", "Customer Success Lead · full-time"], ["Payment method", "Visa ending 4242"], ["Period", "Aug 2026"]], breakdown: [["Monthly salary", "$1,400.00"], ["Platform fee", "Included"]], total: "$1,400.00", timeline: [{ title: "Salary charged to Visa ending 4242", date: "1 Aug 2026", done: true }, { title: "Paid to Maria Santos", date: "1 Aug 2026", done: true }] },
  },
  {
    id: "t6", date: "12 Jul 2026", desc: "Refund · cancelled trial", independent: "Carlo Mendoza", type: "Refund", amount: "$900.00", status: { label: "Refunded", tone: "info" },
    detail: { time: "12 Jul 2026, 2:05 PM PHT", drawerStatus: "Refunded", rows: [["Reference", "TXN-2026-07-12-0316"], ["Independent", "Carlo Mendoza"], ["Role", "Sales Development Rep · 30-day trial"], ["Payment method", "Visa ending 4242"], ["Refunded on", "12 Jul 2026, 3 to 5 working days to your card"]], breakdown: [["Escrow deposit", "$900.00"], ["Platform fee", "Waived"]], total: "$900.00", timeline: [{ title: "Trial cancelled by mutual agreement", date: "10 Jul 2026", done: true }, { title: "Escrow released back to you", date: "12 Jul 2026", done: true }, { title: "Refund posted to Visa ending 4242", date: "12 Jul 2026", done: true }] },
  },
];

export type Dispute = { id: string; name: string; role: string; avatar: string; contract: string; filed: string; amount: string; reason: string; status: { label: string; tone: Tone }; open: boolean };

export const disputes: Dispute[] = [
  { id: "d1", name: "Hanna Aquino", role: "Sales Ops Analyst", avatar: "/team/hanna.jpg", contract: "Sales Ops Analyst — trial", filed: "5 Sep 2026", amount: "$1,200.00", reason: "Not delivered", status: { label: "Pending review", tone: "warn" }, open: true },
  { id: "d2", name: "Leo Ramos", role: "BDR", avatar: "/team/maria.jpg", contract: "BDR — full-time", filed: "28 Aug 2026", amount: "$900.00", reason: "No evidence", status: { label: "In review", tone: "warn" }, open: false },
  { id: "d3", name: "Kris Tan", role: "Account Executive", avatar: "/team/paolo.jpg", contract: "Account Executive — trial", filed: "12 Aug 2026", amount: "$800.00", reason: "Ended early", status: { label: "Resolved", tone: "ok" }, open: false },
];

export type PaymentMethod = { id: string; brand: "Visa" | "Mastercard"; last4: string; expires: string; isDefault: boolean };

export const paymentMethods: PaymentMethod[] = [
  { id: "pm1", brand: "Visa", last4: "4242", expires: "08/2028", isDefault: true },
  { id: "pm2", brand: "Mastercard", last4: "8812", expires: "01/2027", isDefault: false },
];

/* ------------------------------------------------------------ notifications */

export type Notification = {
  id: string;
  group: "Today" | "Last 7 days";
  title: string;
  crumb: string;
  body: string;
  time: string;
  unread: boolean;
  kind: "hiring" | "independents" | "payments";
  avatar: string;
  action?: { label: string; href: string; primary?: boolean };
};

export const notifications: Notification[] = [
  { id: "n1", group: "Today", title: "Juan Dela Cruz submitted an objective update", crumb: "Independents › Juan Dela Cruz", body: "Book 20 qualified demos: 13 of 20. Waiting for your approval.", time: "2 hours ago", unread: true, kind: "independents", avatar: "/team/juan.jpg", action: { label: "Review update", href: "/team/independents/juan-dela-cruz", primary: true } },
  { id: "n2", group: "Today", title: "New application for Sales Manager", crumb: "Hire › All roles", body: "Maria Santos applied with a 72% match. 4 applications so far.", time: "5 hours ago", unread: true, kind: "hiring", avatar: "/team/maria.jpg", action: { label: "Open tracker", href: "/team/hire/roles/sales-manager" } },
  { id: "n3", group: "Last 7 days", title: "Paolo Reyes accepted your interview invite", crumb: "Hire › Candidate tracker", body: "Interview set for Fri 12 Sep 2026, 10:00 AM PHT.", time: "2 days ago", unread: false, kind: "hiring", avatar: "/team/paolo.jpg" },
  { id: "n4", group: "Last 7 days", title: "Trial ended for Andrea Lim", crumb: "Independents › Evaluations", body: "Send your evaluation to unlock the full-time decision.", time: "4 days ago", unread: false, kind: "independents", avatar: "/team/andrea.jpg", action: { label: "Send evaluation", href: "/team/independents/andrea-lim?tab=evaluation" } },
  { id: "n5", group: "Last 7 days", title: "Escrow deposit confirmed", crumb: "Payments › Transactions", body: "$1,600.00 held for Sales Manager, trial starting 1 Sep 2026.", time: "6 days ago", unread: false, kind: "payments", avatar: "/team/juan.jpg" },
];

/* ---------------------------------------------------------------- messages */

export const conversations = [
  { id: "juan", name: "Juan Dela Cruz", sub: "Sales Manager · Trial", avatar: "/team/juan.jpg", time: "09:41", preview: "Sent the revised KPI targets for week 3.", unread: 2 },
  { id: "hanna", name: "Hanna Aquino", sub: "Sales Ops Analyst · Trial", avatar: "/team/hanna.jpg", time: "Yesterday", preview: "Thanks — logged today’s calls.", unread: 0 },
  { id: "leo", name: "Leo Ramos", sub: "BDR · Full-time", avatar: "/team/paolo.jpg", time: "Tue", preview: "Can we move the 1:1 to Thursday?", unread: 0 },
  { id: "mia", name: "Mia Santos", sub: "Customer Success · Candidate", avatar: "/team/paolo.jpg", time: "Mon", preview: "Confirmed for the interview on the 15th.", unread: 9 },
  { id: "paolo", name: "Paolo Reyes", sub: "SDR · Candidate", avatar: "/team/paolo.jpg", time: "8 Sep", preview: "Proposal resubmitted with the changes.", unread: 0 },
];

export const thread: { me?: boolean; text?: string; time: string; file?: { name: string; meta: string } }[] = [
  { text: "Morning! I logged 14 calls yesterday, 3 booked. Two of them look like strong fits for the Q4 pipeline.", time: "09:12" },
  { me: true, text: "Nice. Can you add the two booked ones to the CRM board before the 1:1?", time: "09:20" },
  { text: "Done — both added with notes. Also attached the revised KPI targets for week 3.", time: "09:41" },
  { file: { name: "Week-3-KPI-targets.pdf", meta: "PDF · 84 KB · 09:41" }, time: "09:41" },
];

/* ---------------------------------------------------------------- profile */

export const profile = {
  fields: [
    ["Full name", "Alex Rivera"],
    ["Job title", "Head of Sales"],
    ["Work email", "alex@nairobisolutions.com"],
    ["Phone", "+63 917 555 0142"],
    ["Time zone", "(GMT+8) Manila"],
    ["About you", "I hire and coach outbound sales teams for US fintechs. I run 30-day trials with three objectives and weekly check-ins."],
  ] as [string, string][],
  tags: ["Direct", "Data-driven", "Async first", "Weekly check-ins", "Coaching"],
  company: [
    ["Company name", "Nairobi Solutions Inc."],
    ["About", "B2B SaaS agency based in New York. We build outbound teams for early-stage fintechs and keep them accountable with weekly metrics."],
    ["Website", "www.nairobisolutions.com"],
    ["Industry", "Sales and marketing services"],
    ["Location", "New York, USA · remote team"],
    ["Company size", "10 to 49 employees"],
  ] as [string, string][],
};

export const byName = (slug: string) => independents.find((i) => i.slug === slug) ?? independents[0];
