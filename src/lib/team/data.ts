import type { Stage } from "@/components/independent/ui";
import type { DealKeyResult, ObjectiveComment } from "@/lib/demo/deal";

/** Seed data for the Team Builder portal — every string is lifted from the Figma "Team Builder" canvas. */

export const ME = { name: "Alex Rivera", first: "Alex", title: "Head of Sales", company: "Nairobi Solutions Inc.", avatar: "/team/alex.jpg" };


/**
 * TB-001 account setup checklist — the 5 steps named in the acceptance criteria, each with the
 * shortcut link that completes it. Flip `done` to watch the percentage and progress bar move;
 * with all 5 done the whole card disappears.
 */
/**
 * TB-001 account setup checklist — the 5 steps named in the acceptance criteria, each with the
 * shortcut link that completes it.
 *
 * `done` is computed from the actual state, never stored: the checklist used to carry hardcoded
 * flags, so filling in your company profile or adding a card moved nothing, and the card sat at
 * 40% forever while the company page claimed the same step was finished.
 */
export function setupSteps({ company, cards, roles }: { company: CompanyProfile; cards: PaymentMethod[]; roles: Role[] }) {
  const companyDone = COMPANY_FIELDS.every((k) => String(company[k]).trim() !== "");
  return [
    // Nothing in the demo tracks email confirmation, so this one is simply already true.
    { label: "Verify email", done: true, href: "/team/settings", hint: "Confirm the address we send hiring updates to." },
    { label: "Work Style Quiz", done: company.tags.length > 0, href: "/team/profile/company", hint: "Generates the workplace tags we match candidates against." },
    { label: "Company profile", done: companyDone, href: "/team/profile/company", hint: "Logo, industry and size — candidates see this on every role." },
    { label: "Payment method", done: cards.length > 0, href: "/team/settings/payment", hint: "Funds the escrow that pays an independent at each cycle." },
    // Can't post a role without a company to post it under or a card to fund the escrow.
    { label: "Create your first role", done: roles.length > 0, href: "/team/hire", hint: "Post a job and start collecting applications.", requires: ["Company profile", "Payment method"] },
  ];
}

/** TB-001 marketing banner. Set to null to exercise the "no active banner" branch. */
export const MARKETING_BANNER = {
  id: "trial-drive-2026",
  title: "Trial Drives now run 30 days with escrow built in",
  body: "Test a hire on real work before you commit. Payment is held securely and released only when the objectives you set are met.",
  cta: { label: "Create a Role", href: "/team/hire" },
};

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
];

export const INITIAL_SAVED = ["juan-dela-cruz"];

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
  /** "How many to hire" from the wizard; roles saved before it was kept count as one. */
  hires?: number;
  /** TB-024 exclusive benefits — full-time posts only, optional. */
  benefits?: { label: string; amount: string }[];
  /** Slug this draft was cloned from (TB-032); drafts made from scratch leave it unset. */
  duplicatedFrom?: string;
};



/** Nothing is posted yet: the demo starts with Create role. */
export const roles: Role[] = [];

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

export const candidates: Candidate[] = [];

/**
 * TB-037 candidate tracker — the seven Kanban columns, in order. "Dropped" isn't a stage: a
 * dropped candidate keeps the stage they were dropped from, so it's matched on the flag.
 */
export const TRACKER_COLUMNS: { key: string; label: string; stages: Stage[]; bg: string; text: string; count: string }[] = [
  { key: "candidates", label: "Candidates", stages: ["applied"], bg: "#e5e5e5", text: "#4a4a4a", count: "#d8d8d8" },
  { key: "matched", label: "Matched", stages: ["matched"], bg: "#ebf8fe", text: "#004675", count: "#c9eeff" },
  { key: "interview", label: "Interview", stages: ["invited", "invite_accepted", "interviewed"], bg: "#fff5ec", text: "#8a4200", count: "#ffe0c4" },
  { key: "proposal", label: "Proposal Requested", stages: ["proposal_requested", "proposal_sent"], bg: "#fff3fb", text: "#6e0e52", count: "#ffdbf3" },
  { key: "offer", label: "Offer Sent", stages: ["offer_received", "offer_accepted"], bg: "#fffbeb", text: "#7a5e0a", count: "#fff0b6" },
  { key: "hired", label: "Hired", stages: ["hired"], bg: "#f0fdf4", text: "#1b6b3a", count: "#c6ffd2" },
  { key: "dropped", label: "Dropped", stages: [], bg: "#fdecec", text: "#a62121", count: "#f9d5d5" },
];

/** The tracker column a card sits in now. */
export const columnOf = (c: Pick<Candidate, "stage" | "dropped">) => (c.dropped ? "dropped" : TRACKER_COLUMNS.find((col) => col.stages.includes(c.stage))?.key);

/** The role's board opened at that column — the board centres it and frames it for a moment. */
export const pipelineHref = (c: Pick<Candidate, "role" | "stage" | "dropped">) => {
  const col = columnOf(c);
  return `/team/hire/roles/${c.role}${col ? `?stage=${col}` : ""}`;
};

/** Employer-side wording for the shared pipeline tracker. */
export const EMPLOYER_STAGE_LABELS: Partial<Record<Stage, string>> = {
  applied: "Interested",
  invited: "Interview invitation sent",
  proposal_sent: "Proposal submitted",
  offer_received: "Offer sent",
};

/* ------------------------------------------------------------- interviews */

/** `roleSlug` / `candidate` — the role and tracker card it was booked from, so a row can open them. */
export type Interview = { id: string; independent: string; role: string; roleSlug?: string; candidate?: string; when: string; format: string; link?: string; status: { label: string; tone: Tone }; past?: boolean };

/** A candidate whose interview fell through — declined by them or cancelled — and can be offered a new slot. */
export const INTERVIEW_DECLINED = "Interview declined";
export const INTERVIEW_CANCELLED = "Interview cancelled";
export const needsNewSlot = (c: { stage: string; status?: { label: string } }) => c.stage === "invited" && (c.status?.label === INTERVIEW_DECLINED || c.status?.label === INTERVIEW_CANCELLED);

export const interviews: Interview[] = [];

/* ----------------------------------------------------------------- offers */

export type Offer = {
  id: string;
  independent: string;
  role: string;
  sent: string;
  rate: string;
  start: string;
  status: { label: string; tone: Tone };
  /** Trial offer or TB-072 full-time offer — they are edited and withdrawn differently. */
  kind?: "trial" | "full-time";
  /** IN-075 — the reason the talent gave for declining, when they gave one. */
  declineReason?: string;
};

export const offers: Offer[] = [];

/* -------------------------------------------------------------- contracts */

export type Objective = {
  id: string;
  title: string;
  description?: string;
  kind: "kpi" | "okr" | "task";
  progress: number;
  /** "revision" — TB-111 sent it back with a reason code; the talent corrects it and resubmits. */
  status: "pending" | "complete" | "risk" | "on" | "revision";
  meta: string;
  due?: string;
  /** TB-062 — an Automatic objective's own key results. */
  keyResults?: DealKeyResult[];
  /** TB-061 — a Manual objective's target, unit and latest value. */
  target?: number;
  unit?: string;
  current?: number;
  trend?: number[];
  updated?: string;
  /** TB-109 — an approved objective stops feeding the activity tracker. */
  retired?: boolean;
  /** TB-112 — what happened on it, newest first, and the talent's latest submission. */
  activity?: { at: string; text: string }[];
  lastUpdate?: { date: string; text: string; value?: number; done?: boolean };
  comments?: ObjectiveComment[];
};

/** TB-058 wording for each objective kind, and the rule that decides when it falls Off Track. */
export const OBJECTIVE_KIND: Record<Objective["kind"], string> = { kpi: "Manual", okr: "Automatic", task: "Default" };

/**
 * TB-058 — an active objective flips to Off Track automatically with 7 days or fewer left when
 * a Manual one is under 70% of target, an Automatic one has under 70% of its key results done,
 * or a Default one still isn't marked done. Nobody has to press anything.
 */
export function isOffTrack(o: { kind: Objective["kind"]; status: string; progress: number }, daysLeft: number) {
  if (daysLeft > 7 || o.status === "complete" || o.status === "pending") return false;
  return o.kind === "task" ? o.progress < 100 : o.progress < 70;
}

/** TB-024 / TB-072 / IN-046 — the benefits every full-time engagement includes, on top of salary. */
export const FT_BENEFITS = ["Health Insurance Coverage", "Government Contribution Coverage", "Internet Allowance", "Learning & Development Allowance"];

/** TB-058 Trial Fit Score — the weights differ by phase, so the breakdown states which is live. */
export const TFP_WEIGHTS = {
  3: { label: "On Trial", workStyle: 20, profile: 30, performance: 50, evaluation: 0 },
  4: { label: "Post Trial", workStyle: 15, profile: 20, performance: 40, evaluation: 25 },
} as const;

/** TB-111 reason codes — one must be chosen before a revision can be requested. */
/** TB-067/081/117 — one submitted evaluation; a contract keeps a list of them. */
export type Evaluation = {
  stars: number;
  /** TB-067 — the five criteria scores behind the stars, so the talent sees what was scored. */
  scores?: { label: string; value: number }[];
  feedback: string;
  recommendation: string;
  date: string;
  /** TB-068 — the Trial Fit Score as it stood when this was submitted. */
  tfp: number;
};

export const REVISION_REASONS = ["Missing Deliverable", "Out-of-Scope Output", "Missed Deadline", "No Report Submitted"];

export const TFP_TOOLTIP = "Work Style, Profile and Performance are scored continuously during the trial. Your evaluation is added once the trial ends, and the final score is available after you submit it.";

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
  /** Working days left in a trial (null on a full-time contract), and whether its end date has come. */
  left: number | null;
  over: boolean;
  /** When it was ended, if the Team Builder ended it. */
  endedOn?: string;
  rate: string;
  manager: string;
  objectives: Objective[];
  /** TB-058 Trial Fit Score breakdown; phase decides which weights apply. */
  /** `evaluation` is the latest evaluation's stars as a percentage, once one is in. */
  tfs: { overall: number; performance: number; profile: number; workStyle: number; evaluation?: number };
  phase: 3 | 4;
  /** TB-058 activity log — one tile per weekday: 0 nothing, 1 some, 2 all objectives logged. */
  activity: number[];
  streak: number;
};


export const contracts: Contract[] = [];

/** Display names for contracts whose slug is not the independent’s own. */
export const CONTRACT_NAMES: Record<string, string> = {};

/* ----------------------------------------------------------------- money */

/** TB-084 names three transaction types; `desc` keeps the human sentence alongside them. */
export type TxnType = "Payment Deposited" | "Payment Released" | "Payment Refunded";

export type Transaction = {
  id: string;
  date: string;
  /** TB-084/086/087 — the contract this belongs to, so it can be searched and filtered by name. */
  contract: string;
  /** Sortable stamp behind the display date (TB-084 defaults to most recent). */
  at: number;
  desc: string;
  independent: string;
  type: TxnType;
  amount: string;
  status: { label: string; tone: Tone };
  /** The contract's tracker, where a problem with this payment is disputed. */
  contractHref?: string;
  /** Figma "Payments / Transaction · detail drawer" */
  detail: { time: string; drawerStatus: string; rows: [string, string][]; breakdown: [string, string][]; total: string; timeline: { title: string; date: string; done: boolean }[] };
};

export const transactions: Transaction[] = [];

/* Disputes live in @/lib/demo/disputes — one record the Independent and Admin portals read too. */

/** TB-101 — the plan on this account, and the ladder it sits on. */
export const PLAN = { name: "Growth", cycle: "Monthly", renews: "1 Oct 2026", billedTo: "Visa ending 4242" };

export const PLANS = [
  { name: "Starter", price: "$0", next: "Growth", features: ["1 active role at a time", "Trial Drives with escrow", "Standard matching"] },
  { name: "Growth", price: "$149", next: "Scale", features: ["Up to 10 active roles", "Trial Drives with escrow", "Priority matching and Work Style fit", "Objective tracking and Trial Fit Score", "Dispute review within 5 working days"] },
  { name: "Scale", price: "$399", next: null as string | null, features: ["Unlimited active roles", "Everything in Growth", "Dedicated hiring support", "Custom contracts and invoicing"] },
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
  body: string;
  time: string;
  unread: boolean;
  kind: "hiring" | "independents" | "payments";
  avatar: string;
  /** What the row opens — the thing it is about. */
  href: string;
  /** When it happened (epoch ms); `group` and `time` are the fallback for a record without it. */
  at?: number;
};

export const notifications: Notification[] = [];

/* ---------------------------------------------------------------- messages */

export type Conversation = { id: string; name: string; sub: string; avatar: string; kind: "conversations" | "candidates" };

/**
 * Messages: only the live pair (see @/lib/demo/live). The thread is not a seed — it exists once
 * there is somebody to talk to. Conversations is talent under a contract, Candidates is anyone in
 * the pipeline, so a brand-new demo opens on an empty inbox. It is one thread, so once they are
 * hired it moves to Conversations rather than being listed under both tabs.
 */
export function conversationsFor({ hired, inPipeline, role, contract }: { hired: boolean; inPipeline: boolean; role?: string; contract?: string }): Conversation[] {
  const person = byName("juan-dela-cruz");
  if (hired) return [{ id: "juan", name: person.name, sub: `${role ?? person.role} · ${contract ?? "Trial"}`, avatar: person.avatar, kind: "conversations" }];
  if (inPipeline) return [{ id: "juan-candidate", name: person.name, sub: `Candidate${role ? ` · ${role}` : ""}`, avatar: person.avatar, kind: "candidates" }];
  return [];
}

/* ---------------------------------------------------------------- profile */

/** TB-126 — the industry field is a pick from this list, not free text. */
export const INDUSTRIES = [
  "Advertising and media",
  "Construction",
  "Education",
  "Financial services",
  "Government",
  "Healthcare",
  "Hospitality and travel",
  "Legal services",
  "Logistics and supply chain",
  "Manufacturing",
  "Non-profit",
  "Real estate",
  "Retail and e-commerce",
  "Sales and marketing services",
  "Software and IT",
  "Telecommunications",
];

/** Headcount bands, same as the industry field: a pick, not a typed number. */
export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1,000", "1,000+"];

/** The fields that have to be filled for the profile to count as complete (TB-001 / TB-097). */
export const COMPANY_FIELDS = ["name", "description", "url", "industry", "location", "size"] as const;

/** TB-125 — the description is public on every job post, so it is capped. */
export const COMPANY_DESC_MAX = 600;

/** TB-120 / TB-123 — what an upload has to be before it is allowed to replace a photo or logo. */
export const IMAGE_TYPES = ["image/jpeg", "image/png"];
export const IMAGE_MAX_MB = 5;
/**
 * Reads the file as a data URL rather than an object URL: the profile is persisted to
 * localStorage, and a `blob:` URL is dead the moment the page reloads.
 */
export const readImage = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** Returns the reason an upload was rejected, or null when it is fine. */
export function checkImage(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) return "That file has to be a JPG or a PNG.";
  if (file.size > IMAGE_MAX_MB * 1024 * 1024) return `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is ${IMAGE_MAX_MB}MB.`;
  return null;
}

/** TB-128 — accepts a bare domain as well as a full URL, rejects anything that isn't one. */
export const isUrl = (v: string) => /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(v.trim());

/** TB-094 / TB-097 — the editable profile, seeded here and persisted in the store from then on. */
export type TeamProfile = { name: string; title: string; photo: string; memberSince: string; email: string; phone: string; timezone: string; about: string };
export type CompanyProfile = { name: string; description: string; url: string; industry: string; location: string; size: string; logo: string | null; tags: string[] };

export const TEAM_PROFILE: TeamProfile = {
  name: ME.name,
  title: ME.title,
  photo: ME.avatar,
  memberSince: "14 Aug 2025",
  email: "alex@nairobisolutions.com",
  phone: "+63 917 555 0142",
  timezone: "(GMT+8) Manila",
  about: "I hire and coach outbound sales teams for US fintechs. I run 30-day trials with three objectives and weekly check-ins.",
};

export const COMPANY_PROFILE: CompanyProfile = {
  name: "Nairobi Solutions Inc.",
  description: "B2B SaaS agency based in New York. We build outbound teams for early-stage fintechs and keep them accountable with weekly metrics.",
  url: "www.nairobisolutions.com",
  industry: "Sales and marketing services",
  location: "New York, USA · remote team",
  size: "",
  logo: null,
  tags: ["Direct", "Data-driven", "Async first", "Weekly check-ins", "Coaching"],
};

/** TB-096 — a retake shuffles to a different set; the badges have to visibly change. */
export const WORK_STYLE_SETS = [
  ["Direct", "Data-driven", "Async first", "Weekly check-ins", "Coaching"],
  ["Structured", "Outcome-led", "Daily stand-ups", "Hands-on", "Fast feedback"],
  ["Collaborative", "Documentation-first", "Flexible hours", "Autonomy", "Monthly reviews"],
];

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

/** What the talent keeps on their own profile (@/lib/independent/store), as far as a Team Builder sees it. */
type TalentProfile = { name?: string; headline?: string; bio?: string; rate?: string; level?: string; location?: string; skills?: string[]; photo?: string };
const TALENT_PROFILE_KEY = "hireable.demo.ind.profile";
const TALENT_SEED_PHOTO = "/independent/avatar.jpg";
let profileCache: { raw: string | null; profile: TalentProfile | null } = { raw: null, profile: null };

/**
 * IN-060 → TB — the live pair's card follows what the talent saved on their own profile, so an
 * edit there (bio, rate, skills, headline, photo) is what the Team Builder reads. Every screen
 * here used to show this seed, and the candidate profile swapped the bio for a marketing one.
 * Portal pages render after hydration, so reading storage here never runs on the server.
 */
function withLiveProfile(i: Independent): Independent {
  if (i.slug !== "juan-dela-cruz" || typeof window === "undefined") return i;
  try {
    const raw = localStorage.getItem(TALENT_PROFILE_KEY);
    if (raw !== profileCache.raw) profileCache = { raw, profile: raw ? (JSON.parse(raw) as TalentProfile) : null };
  } catch {
    return i;
  }
  const p = profileCache.profile;
  if (!p) return i;
  return {
    ...i,
    name: p.name?.trim() || i.name,
    role: p.headline?.trim() || i.role,
    bio: p.bio?.trim() || i.bio,
    rate: p.rate?.trim() ? `$${p.rate.trim().replace(/^\$/, "")} /month` : i.rate,
    level: p.level || i.level,
    location: p.location?.trim() || i.location,
    skills: p.skills?.length ? p.skills : i.skills,
    // The two portals ship different crops of the same photo; only a real change replaces it.
    avatar: p.photo && p.photo !== TALENT_SEED_PHOTO ? p.photo : i.avatar,
  };
}

export const byName = (slug: string) => withLiveProfile(independents.find((i) => i.slug === slug) ?? independents[0]);

/** Every independent as a Team Builder sees them. Discover read the seed directly, so a profile edit never reached it. */
export const liveIndependents = () => independents.map(withLiveProfile);
