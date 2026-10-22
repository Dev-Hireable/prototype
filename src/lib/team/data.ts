import type { Stage } from "@/lib/portal/stages";
import type { NoteCategory } from "@/lib/portal/notification-categories";
import type { Tone } from "@/lib/portal/tone";
import type { JobType } from "@/lib/contract/job-types";
import type { FitScore } from "@/lib/contract/fit-score";
import type { PlannedTask, Task } from "@/lib/demo/tasks";
import { storedWorkStyle } from "@/lib/demo/work-style";
import { dayLabel, workingDaysLabel } from "@/lib/portal/dates";
import { shortName } from "@/lib/portal/names";

/** Seed data for the Team Builder portal. */

const ME = { name: "Alex Rivera", first: "Alex", title: "Head of Sales", company: "Nairobi Solutions Inc.", avatar: "/team/alex.jpg" };

/** "company size", "website and company size": the missing fields as a sentence names them. */
const fieldList = (keys: readonly CompanyField[]) => {
  const names = keys.map((k) => COMPANY_FIELD_NAMES[k]);
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
};

/**
 * TB-001 account setup checklist: the 4 steps named in the acceptance criteria, each with the
 * shortcut link that completes it. A card isn't one of them: it's asked for at the first offer (TB-105).
 *
 * `done` is computed from the actual state, never stored: the checklist used to carry hardcoded
 * flags, so filling in your company profile or adding a card moved nothing, and the card sat at
 * 40% forever while the company page claimed the same step was finished.
 */
export function setupSteps({ company, roles, workStyle }: { company: CompanyProfile; roles: Role[]; workStyle: number[] }) {
  const missing = missingCompanyFields(company);
  return [
    // Nothing in the demo tracks email confirmation, so this one is simply already true.
    { label: "Verify email", done: true, href: "/team/settings", hint: "Confirm the address we send hiring updates to." },
    { label: "Work Style Quiz", done: workStyle.length > 0, href: "/onboarding/client", hint: "Generates the work style tags we match Independents against." },
    { label: "Company profile", done: missing.length === 0, href: "/team/profile/company", hint: "Logo, industry and size." },
    // Never locked: a draft can be started any time. It's publishing that waits on the company profile, so the hint says what's missing.
    { label: "Create your first role", done: roles.length > 0, href: "/team/hire/new", hint: missing.length ? `Add your ${fieldList(missing)} to post a role.` : "Post a role and start collecting applications." },
  ];
}

/** TB-001 marketing banner. Set to null to exercise the "no active banner" branch. The dashboard shows it once setup is done. */
export const MARKETING_BANNER = {
  id: "trial-drive-2026",
  title: `Trials now run ${workingDaysLabel(30)}, with escrow built in`,
  body: "Test a hire on real work before you commit. Payment is held securely and released once the tasks you agreed are done.",
  cta: { label: "Create a role", href: "/team/hire" },
};

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
  /** Intro video still; others fall back to their photo. */
  intro?: string;
  /** Website, LinkedIn and portfolio as the talent typed them (IN-060 lists website and LinkedIn). */
  links?: { linkedin: string; portfolio: string; website: string };
  /** The talent's quiz answers — their Workplace Tags come from these. */
  workStyle: { independent: number[] };
};

/** No quiz answers until the talent takes it; `withLiveProfile` reads the pair's from storage. */
const WS = { independent: [] as number[] };

export const independents: Independent[] = [
  {
    slug: "juan-dela-cruz",
    name: "Juan Dela Cruz",
    role: "Brand Designer",
    avatar: "/team/juan.jpg",
    intro: "/team/intro-juan.jpg",
    match: 80,
    rate: "$1,600 /month",
    level: "Advanced (5–8 years)",
    location: "Manila, Philippines",
    skills: ["Brand Identity Design", "Logo design", "Typography", "Adobe Illustrator", "Figma", "Graphic Design"],
    bio: "Brand designer with eight years shaping visual identities for startups and SaaS teams. I take a brand from mood board to logo, type and colour system, and hand over guidelines a team can actually use.",
    links: { linkedin: "linkedin.com/in/juandelacruz", portfolio: "juandelacruz.notion.site", website: "juandelacruz.ph" },
    workStyle: WS,
  },
];

export const INITIAL_SAVED = ["juan-dela-cruz"];

/* ------------------------------------------------------------------ roles */

export type RoleStatus = "Active" | "Draft" | "Closed" | "Archived";
export type Role = {
  slug: string;
  title: string;
  type: JobType;
  /** A part-time role's hours a week. */
  hours?: number;
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
  /** Notes beside the trial's tasks. Posts saved before the tasks existed wrote all of it here. */
  expectation: string;
  attachment: string;
  /**
   * TB-024 — a trial's tasks, written in its job post: what the Independent gets done during the
   * trial. The offer carries them as they stand, and that's where the Independent first reads them.
   * Ongoing roles leave this empty; their work is added once they start.
   */
  tasks?: PlannedTask[];
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
  /** Hired on a trial that has closed (end date reached, every trial task done, or ended early) and not converted. */
  trialEnded?: boolean;
  /** Invited to apply (TB-017) and hasn't yet: in Matched, but not an application. */
  invitedToApply?: boolean;
  /** Once hired: what the contract is now (a trial, or the full-time / part-time role it is or became). */
  hiredAs?: JobType;
  /** #313 — the interview was marked done on its own once its slot had passed, so it can still be marked as not held. */
  autoDone?: boolean;
};

/**
 * A card that isn't an application yet: invited to apply, not applied. Matched also holds
 * applicants the system matched on fit — those have applied, and can be interviewed. Cards saved
 * before the flag existed are read by their status.
 */
export const awaitsApplication = (c: Candidate) => !!c.invitedToApply || c.status?.label === "Invited to apply" || c.status?.label === "Awaiting application";

export const candidates: Candidate[] = [];

/**
 * TB-037 pipeline — the eight Kanban columns, in order, each with what it says while it's empty. The
 * first is named for the stage it holds (Applied): the role page's tab is already "Candidates".
 * "Trial Ended" and "Declined" aren't stages: a closed trial is still `hired` and a declined
 * candidate keeps the stage they were declined at, so both are matched on their flag (see
 * `columnOf`; the flag is still `dropped`). A trial that converts to full-time or part-time goes
 * back to Hired.
 */
export const TRACKER_COLUMNS: { key: string; label: string; empty: string; stages: Stage[]; bg: string; text: string; count: string }[] = [
  { key: "candidates", label: "Applied", empty: "No applications yet", stages: ["applied"], bg: "#e5e5e5", text: "#4a4a4a", count: "#d8d8d8" },
  { key: "matched", label: "Matched", empty: "No matches yet. Invite Independents from Discover.", stages: ["matched"], bg: "#ebf8fe", text: "#004675", count: "#c9eeff" },
  { key: "interview", label: "Interview", empty: "No interviews yet", stages: ["invited", "invite_accepted", "interviewed"], bg: "#fff5ec", text: "#8a4200", count: "#ffe0c4" },
  { key: "proposal", label: "Proposal Requested", empty: "No proposals requested yet", stages: ["proposal_requested", "proposal_sent"], bg: "#fff3fb", text: "#6e0e52", count: "#ffdbf3" },
  { key: "offer", label: "Offer Sent", empty: "No offers sent yet", stages: ["offer_received", "offer_accepted"], bg: "#fffbeb", text: "#7a5e0a", count: "#fff0b6" },
  { key: "hired", label: "Hired", empty: "No hires yet", stages: ["hired"], bg: "#f0fdf4", text: "#1b6b3a", count: "#c6ffd2" },
  { key: "trial_ended", label: "Trial Ended", empty: "No trials have ended", stages: [], bg: "#eef2f6", text: "#34465a", count: "#d9e1ea" },
  { key: "dropped", label: "Declined", empty: "No one declined", stages: [], bg: "#fdecec", text: "#a62121", count: "#f9d5d5" },
];

/** The tracker column a card sits in now. */
export const columnOf = (c: Pick<Candidate, "stage" | "dropped" | "trialEnded">) =>
  c.dropped ? "dropped" : c.trialEnded ? "trial_ended" : TRACKER_COLUMNS.find((col) => col.stages.includes(c.stage))?.key;

/** The role's board opened at that column — the board centres it and frames it for a moment. */
export const pipelineHref = (c: Pick<Candidate, "role" | "stage" | "dropped" | "trialEnded">) => {
  const col = columnOf(c);
  return `/team/hire/roles/${c.role}${col ? `?stage=${col}` : ""}`;
};

/* ------------------------------------------------------------- interviews */

/**
 * `roleSlug` / `candidate` — the role and pipeline card it was booked from, so a row can open them.
 * `offset` / `by` — the clock the slot was picked in (minutes off UTC) and whose it was; `auto` — held
 * on its own once the slot had passed, so it can still be marked as not having happened.
 */
export type Interview = { id: string; independent: string; role: string; roleSlug?: string; candidate?: string; when: string; offset?: number; by?: "team" | "independent"; format: string; link?: string; status: { label: string; tone: Tone }; past?: boolean; auto?: boolean };

export const INTERVIEW_DECLINED = "Interview declined";
export const INTERVIEW_CANCELLED = "Interview cancelled";
/** #313 — held on its own once the slot passed, then marked by the Team Builder as not having happened. */
export const INTERVIEW_MISSED = "Interview didn't happen";
/** IN-093 — the talent can't make the slot and asked for the one they named instead. */
export const NEW_TIME_REQUESTED = "New time requested";
/**
 * A candidate whose interview fell through — declined or asked to move by them, cancelled, or one
 * that didn't happen — and needs a new slot before anything else. Declining a slot they had already
 * confirmed used to leave the card at Confirmed, so "Mark interview done" and the proposal after it
 * stayed open.
 */
export const needsNewSlot = (c: { stage: string; status?: { label: string } }) =>
  (c.stage === "invited" || c.stage === "invite_accepted") && [INTERVIEW_DECLINED, INTERVIEW_CANCELLED, INTERVIEW_MISSED, NEW_TIME_REQUESTED].includes(c.status?.label ?? "");

export const interviews: Interview[] = [];

/* ----------------------------------------------------------------- offers */

export type Offer = {
  id: string;
  independent: string;
  role: string;
  sent: string;
  rate: string;
  start: string;
  /** A trial's last day. */
  end?: string;
  /** A part-time offer's hours a week. */
  hours?: number;
  /** Where the offer was sent from: the candidate's page, or the contract a post-trial offer follows. */
  href?: string;
  status: { label: string; tone: Tone };
  /** The kind of role the offer is for. */
  type: JobType;
  /**
   * TB-072 — the full-time or part-time offer after a trial, rather than the offer a proposal was
   * answered with. It is withdrawn and sent again rather than edited.
   */
  conversion?: boolean;
  /** IN-075 — the reason the talent gave for declining, when they gave one. */
  declineReason?: string;
};

export const offers: Offer[] = [];

/* -------------------------------------------------------------- contracts */

/** TB-067/081/117 — one submitted evaluation; a contract keeps a list of them. */
export type Evaluation = {
  stars: number;
  /** TB-067 — the five criteria scores behind the stars, so the talent sees what was scored. */
  scores?: { label: string; value: number }[];
  feedback: string;
  recommendation: string;
  date: string;
  /** TB-068 — the Trial Fit Score as it stood when this was submitted; none on a direct hire. */
  tfp?: number;
};

export type Contract = {
  slug: string;
  independent: string;
  role: string;
  /** What the contract is now: a trial, or the full-time / part-time role it is (or became). */
  type: JobType;
  /** Whether it started as a trial, or was a direct full-time / part-time hire with no trial. */
  origin: "trial" | "direct";
  status: { label: string; tone: Tone };
  /** The first day, while the contract is signed but hasn't started yet. */
  startsOn?: string;
  started: string;
  day: string;
  ends: string;
  /** Working days left in a trial (null once it's full-time or part-time), and whether its end date has come. */
  left: number | null;
  over: boolean;
  /** When it was ended, if the Team Builder ended it. */
  endedOn?: string;
  rate: string;
  /** A part-time contract's hours a week. */
  hours?: number;
  manager: string;
  tasks: Task[];
  /** TB-143 — the live contract's work as its Work tab opens on it (workTabItems): what its Overview and card count. Unset on a listed one, which counts all its tasks. */
  counted?: Task[];
  /** Null on a direct hire: there was no trial to score. */
  tfs: FitScore | null;
  phase: 3 | 4;
  /** TB-058 activity log — one tile per weekday: 0 nothing, 1 worked on tasks, 2 sent one for review. */
  activity: number[];
  streak: number;
  /** The match the application started on — what a direct hire shows in place of a trial score. */
  match: number;
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
  /** What the transaction's detail drawer shows. */
  detail: { time: string; drawerStatus: string; rows: [string, string][]; breakdown: [string, string][]; total: string; timeline: { title: string; date: string; done: boolean }[] };
};

export const transactions: Transaction[] = [];

/* Disputes live in @/lib/demo/disputes — one record the Independent and Admin portals read too. */

/** TB-101 — the plan on this account, and the ladder it sits on. */
export const PLAN = { name: "Growth", cycle: "Monthly", billedTo: "Visa ending 4242" };
/** When the monthly plan next renews: the 1st of next month. It read "1 Oct 2026" whatever the date, so it only fit September. */
export const planRenewal = (now = new Date()) => dayLabel(new Date(now.getFullYear(), now.getMonth() + 1, 1));

export const PLANS = [
  { name: "Starter", price: "$0", next: "Growth", features: ["1 active role at a time", "Trials of 30, 60 or 90 working days, with escrow", "Standard work style matching"] },
  { name: "Growth", price: "$149", next: "Scale", features: ["Up to 10 active roles", "Trials of 30, 60 or 90 working days, with escrow", "Priority work style matching", "Shared task lists and Trial fit score", "Dispute review within 5 working days"] },
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
  kind: NoteCategory;
  /** Who it is from: the Independent's photo, or Hireable support's. */
  avatar?: string;
  /** A notice from Hireable itself (a reminder, an expiry): drawn with its category's icon, not a face. */
  system?: boolean;
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
 * there is somebody to talk to: from the invite to apply or the application on. It is one thread
 * per person; the tabs filter it by stage: Candidates while they're in hiring, as "Juan D." (names
 * before hire), and Conversations once hired, by their full name. A brand-new demo opens on an
 * empty inbox.
 */
export function conversationsFor({ hired, inPipeline, role, contract }: { hired: boolean; inPipeline: boolean; role?: string; contract?: string }): Conversation[] {
  const person = byName("juan-dela-cruz");
  if (hired) return [{ id: "juan", name: person.name, sub: `${role ?? person.role} · ${contract ?? "Trial"}`, avatar: person.avatar, kind: "conversations" }];
  if (inPipeline) return [{ id: "juan", name: shortName(person.name), sub: `Candidate${role ? ` · ${role}` : ""}`, avatar: person.avatar, kind: "candidates" }];
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
type CompanyField = (typeof COMPANY_FIELDS)[number];

/** How a sentence names each field: "Add your company size to post a role". */
const COMPANY_FIELD_NAMES: Record<CompanyField, string> = { name: "company name", description: "company description", url: "website", industry: "industry", location: "location", size: "company size" };

/** The fields still empty, in the order the profile lists them. */
const missingCompanyFields = (c: CompanyProfile) => COMPANY_FIELDS.filter((k) => String(c[k]).trim() === "");

/** TB-125 — the description is public on every job post, so it is capped. */
export const COMPANY_DESC_MAX = 600;

/** TB-094 / TB-097 — the editable profile, seeded here and persisted in the store from then on. */
export type TeamProfile = { name: string; title: string; photo: string; memberSince: string; email: string; phone: string; timezone: string; about: string };
/** TB-127 — `location` is a city picked from a list (@/lib/portal/cities); a remote team is said by `remote`, not in the location. */
export type CompanyProfile = { name: string; description: string; url: string; industry: string; location: string; remote?: boolean; size: string; logo: string | null };

/** Where the company is, as independents read it: "New York, USA · Remote team". */
export const companyLocation = (c: Pick<CompanyProfile, "location" | "remote">) => [c.location, c.remote && "Remote team"].filter(Boolean).join(" · ");

export const TEAM_PROFILE: TeamProfile = {
  name: ME.name,
  title: ME.title,
  photo: ME.avatar,
  memberSince: "14 Aug 2025",
  email: "alex@nairobisolutions.com",
  phone: "+63 917 555 0142",
  /** "" = automatic: this device's time zone (TB-099 / IN-067). */
  timezone: "",
  about: "I hire and coach outbound sales teams for US fintechs. I run 30-day trials on a shared task list with weekly check-ins.",
};

export const COMPANY_PROFILE: CompanyProfile = {
  name: "Nairobi Solutions Inc.",
  description: "B2B SaaS agency based in New York. We build outbound teams for early-stage fintechs and keep them accountable with weekly metrics.",
  url: "www.nairobisolutions.com",
  industry: "Sales and marketing services",
  location: "New York, USA",
  remote: true,
  size: "",
  logo: null,
};

/** What the talent keeps on their own profile (@/lib/independent/account), as far as a Team Builder sees it. */
type TalentProfile = { name?: string; headline?: string; bio?: string; rate?: string; level?: string; location?: string; skills?: string[]; photo?: string; links?: Independent["links"] };
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
  // The talent's quiz answers, so their tags change when they retake it. The match stays the seeded
  // figure: the demo doesn't score it from the quiz (the real app's matching differs).
  const styled = { ...i, workStyle: { independent: storedWorkStyle("independent") } };
  const p = profileCache.profile;
  if (!p) return styled;
  return {
    ...styled,
    name: p.name?.trim() || i.name,
    role: p.headline?.trim() || i.role,
    bio: p.bio?.trim() || i.bio,
    rate: p.rate?.trim() ? `$${p.rate.trim().replace(/^\$/, "")} /month` : i.rate,
    level: p.level || i.level,
    location: p.location?.trim() || i.location,
    skills: p.skills?.length ? p.skills : i.skills,
    // A link the talent cleared stays cleared, so the saved set replaces the seed whole.
    links: p.links ?? i.links,
    // The two portals ship different crops of the same photo; only a real change replaces it.
    avatar: p.photo && p.photo !== TALENT_SEED_PHOTO ? p.photo : i.avatar,
  };
}

export const byName = (slug: string) => withLiveProfile(independents.find((i) => i.slug === slug) ?? independents[0]);

/** Every independent as a Team Builder sees them. Discover read the seed directly, so a profile edit never reached it. */
export const liveIndependents = () => independents.map(withLiveProfile);
