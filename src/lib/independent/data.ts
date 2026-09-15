/** Seed content transcribed from the "[DRAFT] Independent Portal" Figma canvas. */

import type { Stage } from "@/components/independent/ui";

export const ME = { name: "Juan Dela Cruz", first: "Juan", headline: "Sales Manager", avatar: "/independent/avatar.jpg" };

/* --------------------------------------------------------------- roles ---- */

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

const APP = (id: string, stage: Stage, extra: Partial<Application> = {}): Application => ({
  id,
  roleSlug: "marketing-specialist",
  title: "Marketing Specialist",
  company: "Nairobi Solutions Inc.",
  match: 80,
  submitted: "Submitted Jan 08, 2026",
  stage,
  ...extra,
});

export const applications: Application[] = [
  APP("a1", "applied", { match: 0 }),
  APP("a2", "applied", { match: 0 }),
  APP("a3", "applied", { match: 0 }),
  APP("a4", "applied", { match: 0 }),
  APP("a5", "applied", { match: 0 }),
  APP("m1", "matched"),
  APP("m2", "matched"),
  APP("i1", "invited", { status: { label: "Awaiting confirmation", tone: "neutral", meta: "--" } }),
  APP("i2", "invite_accepted", { status: { label: "Incoming interview", tone: "info", meta: "Mar 22 · 10:00AM" } }),
  APP("i3", "interviewed", { status: { label: "Interview completed", tone: "ok", meta: "Mar 22 · 10:00AM" } }),
  APP("i4", "invited", { status: { label: "Declined", tone: "danger", meta: "--" } }),
  APP("p1", "proposal_requested", { status: { label: "Proposal requested", tone: "warn" } }),
  APP("p2", "proposal_sent", { status: { label: "Proposal sent", tone: "info" } }),
  APP("p3", "proposal_sent", { status: { label: "Revision requested", tone: "warn" } }),
  APP("o1", "offer_received", { status: { label: "Offer received", tone: "ok" } }),
  APP("o2", "offer_received", { status: { label: "Offer updated", tone: "info" } }),
  APP("h1", "hired", { status: { label: "Hired", tone: "ok" } }),
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
  builder: { location: "New York, USA", since: "Member since Jan 01, 2025", contact: "John Doe", company: "Nairobi Solutions" },
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
  { id: "iv1", role: "Sales Manager", roleHref: "/independent/jobs/applications/i2", company: "Nairobi Solutions Inc.", when: "Thu 10 Sep 2026, 2:00 PM PHT", format: "Google Meet", status: "starts" },
  { id: "iv2", role: "Customer Success Lead", roleHref: "/independent/jobs/applications/i1", company: "Bluewater Labs", when: "Fri 11 Sep 2026, 10:00 AM PHT", format: "Zoom", status: "accepted" },
  { id: "iv3", role: "Account Executive", roleHref: "/independent/jobs/applications/i3", company: "Vela Partners", when: "Tue 1 Sep 2026, 4:00 PM PHT", format: "Google Meet", status: "completed", past: true },
  { id: "iv4", role: "BDR", roleHref: "/independent/jobs/applications/i3", company: "Kestrel Logistics", when: "Thu 27 Aug 2026, 9:00 AM PHT", format: "Zoom", status: "completed", past: true },
  { id: "iv5", role: "SDR", roleHref: "/independent/jobs/applications/i4", company: "Orbit Media", when: "Mon 17 Aug 2026, 3:00 PM PHT", format: "Google Meet", status: "declined", past: true },
];

/* ----------------------------------------------------------- contracts ---- */

export type Objective = { id: string; title: string; kind: "kpi" | "okr" | "task"; progress: number; status: "pending" | "complete" | "risk" | "on"; meta: string; current?: number; target?: number };

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
};

const NS_OBJECTIVES: Objective[] = [
  { id: "demos", title: "Book 20 qualified demos by day 30", kind: "kpi", progress: 65, status: "pending", meta: "13 of 20 booked · updated 8 Sep", current: 13, target: 20 },
  { id: "sequence", title: "Rebuild the outbound email sequence", kind: "task", progress: 100, status: "complete", meta: "Approved 3 Sep" },
  { id: "reply", title: "Lift reply rate from 4% to 8%", kind: "okr", progress: 30, status: "risk", meta: "Now 5.2% · updated 6 Sep" },
  { id: "crm", title: "Clean the CRM pipeline stages", kind: "task", progress: 100, status: "complete", meta: "Approved 29 Aug" },
];

export const contracts: Contract[] = [
  {
    slug: "sales-manager",
    title: "Sales Manager",
    company: "Nairobi Solutions",
    initials: "NS",
    type: "trial",
    location: "Remote, US hours",
    line: "Started 25 Aug 2026 · Day 18 of 30 · $1,600 /month · Manager: Rowena Alcantara",
    status: { label: "On track", tone: "ok" },
    progressLabel: "Trial progress",
    progress: 60,
    progressTone: "primary",
    manager: "Rowena Alcantara",
    managerFirst: "Rowena",
    started: "25 Aug 2026",
    day: "Day 18 of 30",
    ends: "24 Sep 2026",
    rate: "$1,600 /month",
    objectives: NS_OBJECTIVES,
  },
  {
    slug: "customer-success-lead",
    title: "Customer Success Lead",
    company: "Brightline Health",
    initials: "BH",
    type: "full-time",
    location: "Remote, UK hours",
    line: "Since 02 Mar 2026 · $1,400 /month · Manager: Owen Price",
    status: { label: "Active", tone: "ok" },
    progressLabel: "Quarter progress",
    progress: 78,
    progressTone: "primary",
    manager: "Owen Price",
    managerFirst: "Owen",
    started: "02 Mar 2026",
    day: "Day 71 of 92",
    ends: "30 Sep 2026",
    rate: "$1,400 /month",
    objectives: [
      { id: "renew", title: "Renew 30 of 38 accounts this quarter", kind: "kpi", progress: 71, status: "pending", meta: "27 of 38 renewed · sent 9 Sep", current: 27, target: 38 },
      { id: "churn", title: "Keep churn under 6%", kind: "okr", progress: 100, status: "complete", meta: "Approved 21 Aug" },
      { id: "reviews", title: "Run 20 quarterly reviews", kind: "task", progress: 40, status: "on", meta: "Now 5.2% · updated 5 Sep" },
      { id: "playbook", title: "Publish the renewal playbook", kind: "task", progress: 100, status: "complete", meta: "Approved 2 Sep" },
    ],
  },
  {
    slug: "business-development-representative",
    title: "Business Development Representative",
    company: "Kestrel Logistics",
    initials: "KL",
    type: "trial",
    location: "Remote, US hours",
    line: "Started 01 Sep 2026 · Day 10 of 30 · $1,200 /month · Manager: Dana Whitfield",
    status: { label: "Update pending review", tone: "warn" },
    progressLabel: "Trial progress",
    progress: 35,
    progressTone: "primary",
    manager: "Dana Whitfield",
    managerFirst: "Dana",
    started: "01 Sep 2026",
    day: "Day 10 of 30",
    ends: "30 Sep 2026",
    rate: "$1,200 /month",
    objectives: NS_OBJECTIVES.slice(0, 3),
  },
  {
    slug: "account-executive",
    title: "Account Executive",
    company: "Summit Payments",
    initials: "SP",
    type: "trial",
    location: "Remote, AU hours",
    line: "Started 01 Jul 2026 · Ended 31 Jul 2026 · $1,800 /month · Manager: Mei Tanaka",
    status: { label: "Evaluation received", tone: "ok" },
    progressLabel: "Trial progress",
    progress: 100,
    progressTone: "ok",
    manager: "Mei Tanaka",
    managerFirst: "Mei",
    started: "01 Jul 2026",
    day: "Day 30 of 30",
    ends: "31 Jul 2026",
    rate: "$1,800 /month",
    objectives: NS_OBJECTIVES.map((o) => ({ ...o, progress: 100, status: "complete" as const })),
  },
  {
    slug: "sales-development-representative",
    title: "Sales Development Representative",
    company: "Orbit Media",
    initials: "OM",
    type: "full-time",
    location: "Remote, US hours",
    line: "Since 15 Jan 2026 · Ended 31 Aug 2026 · $1,100 /month · Manager: Chris Adler",
    status: { label: "Ended", tone: "neutral" },
    progressLabel: "Contract complete",
    progress: 100,
    progressTone: "ok",
    manager: "Chris Adler",
    managerFirst: "Chris",
    started: "15 Jan 2026",
    day: "Ended",
    ends: "31 Aug 2026",
    rate: "$1,100 /month",
    objectives: NS_OBJECTIVES.map((o) => ({ ...o, progress: 100, status: "complete" as const })),
  },
  {
    slug: "sales-operations-analyst",
    title: "Sales Operations Analyst",
    company: "Harbor Analytics",
    initials: "HA",
    type: "trial",
    location: "Remote, EU hours",
    line: "Started 20 Aug 2026 · Day 22 of 30 · $1,300 /month · Manager: Priya Nair",
    status: { label: "Off track", tone: "danger" },
    progressLabel: "Trial progress",
    progress: 20,
    progressTone: "danger",
    manager: "Priya Nair",
    managerFirst: "Priya",
    started: "20 Aug 2026",
    day: "Day 22 of 30",
    ends: "19 Sep 2026",
    rate: "$1,300 /month",
    objectives: NS_OBJECTIVES.map((o) => ({ ...o, progress: Math.round(o.progress / 3) })),
  },
];

export const evaluation = {
  submitted: "Submitted 1 Oct 2026 by Alex Rivera, Head of Sales. Scores are final and feed your trial fit score.",
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
  fit: { score: "88%", locked: "Locked at phase 4 on 1 Oct 2026, after the employer evaluation.", parts: [["Performance", "60% · objectives and evaluation"], ["Profile", "100% · profile vs role alignment"], ["Work style", "100% · from the work-style quiz"]] },
};

/* -------------------------------------------------------------- wallet ---- */

export type PayoutMethod = { id: string; brand: "Maya" | "GCash" | "Bank"; last4: string; holder: string; verified: string; detail: string; isDefault: boolean };

export const payoutMethods: PayoutMethod[] = [
  { id: "maya", brand: "Maya", last4: "4471", holder: "Juan Dela Cruz", verified: "Verified 8 Sep 2026", detail: "E-wallet", isDefault: true },
  { id: "gcash", brand: "GCash", last4: "9023", holder: "Juan Dela Cruz", verified: "Verified 2 Jun 2026", detail: "GCash · 0917 555 0142", isDefault: false },
  { id: "bpi", brand: "Bank", last4: "3391", holder: "Juan Dela Cruz", verified: "Verified 12 Jan 2026", detail: "InstaPay / PESONet", isDefault: false },
];

export const transactions = [
  { date: "02 Sep 2026", desc: "Payment released · Customer Success Lead", party: "Brightline Health", type: "Released", amount: "+$1,400.00", status: { label: "Available", tone: "ok" as const } },
  { date: "25 Aug 2026", desc: "Escrow funded · Sales Manager trial", party: "Nairobi Solutions", type: "Escrow", amount: "$1,600.00", status: { label: "Held", tone: "warn" as const } },
  { date: "31 Aug 2026", desc: "Payout to Maya ····4471", party: "—", type: "Payout", amount: "−$2,800.00", status: { label: "Paid", tone: "ok" as const } },
  { date: "30 Jul 2026", desc: "Payment released · BDR trial", party: "Vela Partners", type: "Released", amount: "+$1,200.00", status: { label: "Paid out", tone: "ok" as const } },
  { date: "30 Jun 2026", desc: "Payment released · BDR trial", party: "Vela Partners", type: "Released", amount: "+$1,600.00", status: { label: "Paid out", tone: "ok" as const } },
  { date: "12 Jun 2026", desc: "Payment released · BDR trial", party: "Vela Partners", type: "Released", amount: "+$1,600.00", status: { label: "Paid out", tone: "ok" as const } },
];

/* ------------------------------------------------------------ profile ----- */

export const profile = {
  bio: "Sales leader with eight years in B2B SaaS, most recently running a six-person outbound team for a US fintech. I own pipeline from first touch to signed contract, coach reps on discovery calls, and keep the CRM honest.",
  editBio:
    "Sales leader with eight years in B2B SaaS, most recently running a six-person outbound team for a US fintech. I own pipeline from first touch to signed contract, coach reps on discovery calls, and keep the CRM honest. Available for a 30-day trial starting October.",
  rate: "1,600",
  level: "Advanced (5–8 years)",
  location: "Manila, Philippines",
  skills: ["Lead generation", "Objection handling", "Sales outreach", "Cold calling", "CRM", "LinkedIn prospecting"],
  tags: ["Proactive", "Adaptive", "Dependable", "Confident", "Responsive"],
  links: { linkedin: "linkedin.com/in/juandelacruz", portfolio: "juandelacruz.notion.site", website: "juandelacruz.ph" },
  history: [
    { role: "Content Marketing Manager", date: "January 1, 2020", quote: "Juan exceeded expectations on every campaign. His ability to analyze data and pivot strategy mid-flight saved us thousands in ad spend." },
    { role: "Growth Marketing Lead", date: "January 1, 2020", quote: "Incredible attention to detail and a natural sense for what resonates with audiences. Our email open rates doubled under Juan's watch." },
    { role: "Senior Marketing Specialist", date: "January 1, 2020", quote: "Solid performer with strong fundamentals. Sometimes needed guidance on prioritization, but always delivered quality work on time." },
  ],
};

/* ------------------------------------------------------- notifications ---- */

export type Notification = { id: string; group: "Today" | "Yesterday" | "Earlier"; title: string; body: string; time: string; unread: boolean; kind: "contracts" | "offers" | "payments" | "interviews" | "other" };

export const notifications: Notification[] = [
  { id: "n1", group: "Today", title: "Week 2 update approved", body: "Rowena Alcantara approved your update for Sales Manager — 5 of 6 objectives on track.", time: "10:02", unread: true, kind: "contracts" },
  { id: "n2", group: "Today", title: "Payout method verified", body: "Your Maya account is verified. Trial payments will be released to it at each cycle end.", time: "08:15", unread: true, kind: "payments" },
  { id: "n3", group: "Yesterday", title: "Interview rescheduled", body: "Vela Partners moved your Account Executive interview to Thu 18 Sep, 2:00 PM PHT.", time: "16:40", unread: false, kind: "interviews" },
  { id: "n4", group: "Yesterday", title: "Offer received", body: "Brightline Health sent a full-time offer for Customer Success Lead — $1,400 /month.", time: "11:20", unread: false, kind: "offers" },
  { id: "n5", group: "Earlier", title: "Objective due in 3 days", body: "“Book 12 discovery calls” is at 72% — log progress to stay on track.", time: "8 Sep", unread: false, kind: "contracts" },
  { id: "n6", group: "Earlier", title: "Escrow funded", body: "Nairobi Solutions funded $1,600 for your Sales Manager trial. You can start on 25 Aug.", time: "25 Aug", unread: false, kind: "payments" },
];

/* ------------------------------------------------------------ messages ---- */

export const conversations = [
  { id: "c1", name: "Nairobi Solutions", sub: "Rowena Alcantara · Sales Manager trial", preview: "Looks good — approved the week 2 update.", time: "10:02", unread: 1, initials: "NS" },
  { id: "c2", name: "Brightline Health", sub: "Owen Price · Customer Success", preview: "Offer letter attached, have a read.", time: "Yesterday", unread: 0, initials: "BH" },
  { id: "c3", name: "Vela Partners", sub: "Ana Reyes · Account Executive", preview: "Interview moved to Thursday 2pm.", time: "Tue", unread: 0, initials: "VP" },
  { id: "c4", name: "Hireable support", sub: "Payouts", preview: "Your Maya payout method is verified.", time: "8 Sep", unread: 0, initials: "H" },
];

export const thread = [
  { me: true, text: "Week 2 update is in — 5 of 6 objectives on track, the outreach KPI is at 72% of target.", time: "Yesterday" },
  { me: false, text: "Looks good — approved the week 2 update. Let’s push outreach a bit this week, you’re close.", time: "10:02" },
  { me: false, text: "I’ll set the 1:1 for Thursday 2pm, Manila time.", time: "10:03" },
];
