/**
 * The guided tours: one per screen that needs explaining, in each portal, told by that side's quiz
 * assistant — Hiro for a Team Builder, Hira for an Independent — so the voice someone met in
 * onboarding is the one that shows them round.
 *
 * A step points at its element with a CSS selector (`target`). One with no target, or whose
 * element isn't on screen right now (a phone hides the section panel, a board can be empty),
 * shows in the middle of the screen instead, so a tour never gets stuck.
 */

import { workingDaysLabel } from "@/lib/portal/dates";

export type TourSide = "team" | "independent";

export type TourStep = {
  /** What to highlight; omitted for a step about the screen as a whole. */
  target?: string;
  title: string;
  body: string;
  /** The first key action, on the step that ends a tour: finishing it opens this. */
  action?: { label: string; href: string };
};

export type Tour = {
  id: string;
  side: TourSide;
  /** The screen it explains, as a pathname; `[slug]` stands for one segment (a contract's). */
  path: string;
  /** Pages beside it that its `[slug]` would match but are screens of their own (Saved roles beside a role). */
  except?: string[];
  /** What the help menu calls it. */
  name: string;
  steps: TourStep[];
};

/**
 * Each side's guide, as the onboarding quiz has them: the round portrait (`avatar`) and the same
 * character cut out (`figure`), which peeks over the top of a tour's card.
 */
export const GUIDES: Record<TourSide, { name: string; avatar: string; figure: string }> = {
  team: { name: "Hiro", avatar: "/images/employer-success.svg", figure: "/images/guide-hiro.webp" },
  independent: { name: "Hira", avatar: "/images/talent-success.svg", figure: "/images/guide-hira.webp" },
};

const rail = (href: string) => `nav[aria-label="Sections"] a[href="${href}"]`;
const SEARCH = 'label:has(input[placeholder^="Search"])';
const HELP = '[data-tour="help"]';
/** The dashboard's My tasks card, shown while a contract with a work list is live. */
const MY_TASKS = 'section[aria-label="My tasks"]';

/**
 * The contract workspace, the same on both sides: its sections, where it stands, the views, the
 * toolbar and a task. `task` is what this side does with one.
 */
function contractSteps(task: string): TourStep[] {
  return [
    { target: '[role="tablist"][aria-label="Contract sections"]', title: "Everything in one place", body: "Work holds the tasks. Overview shows progress, and Contract & Payment the terms and the money. A trial adds Evaluation when it ends." },
    { target: 'p[aria-label="Summary"]', title: "Where it stands", body: "How far into the contract you are, and on a trial the trial fit score, which moves as the work gets done." },
    { target: '[role="tablist"][aria-label="Views"]', title: "See the work your way", body: "Board, List, Calendar, Timeline and Workload all show the same tasks. Pick whichever suits the moment." },
    { target: '[role="toolbar"][aria-label="Search, filter, sort and group"]', title: "Find what matters now", body: "Search, filter, sort and group the tasks, for example to see only what's overdue." },
    { target: '[data-testid="workspace"] [role="group"][aria-label^="#"]', title: "A task", body: task },
  ];
}

/** Messages, the same on both sides: the conversations and the composer. `who` is the other side. */
function messageSteps(who: string): TourStep[] {
  return [
    { target: "aside", title: "Your conversations", body: `A thread opens with each ${who} at the first invite or application, and stays through the contract. Search by name or by what was said.` },
    { target: 'form:has(input[aria-label="Message"])', title: "Send a message", body: "Type a reply or attach a file. Each message shows when it's been sent and when it's been seen." },
  ];
}

const TEAM: Tour[] = [
  {
    id: "team.home",
    side: "team",
    path: "/team",
    name: "Getting started",
    steps: [
      { title: "Hey, I'm Hiro", body: "I'll show you where hiring happens on Hireable. It takes a minute, and you can skip any time." },
      { target: '[data-tour="setup"]', title: "Finish your setup", body: "This shows what's left before you can hire, and each item opens its page. Once you're set, it shows the work style tags Independents are matched on." },
      { target: '[data-tour="create-role"]', title: "Create a role", body: "Start here. Post a paid trial or an ongoing role, and Independents who fit your work style can apply." },
      { target: MY_TASKS, title: "My tasks", body: "What's waiting on you across your contracts, like work sent for your review. Drag a row to put the list in your own order." },
      { target: rail("/team/discover"), title: "Discover Independents", body: "Browse Independents matched to your work style. Save the ones you like and invite them to apply." },
      { target: rail("/team/hire"), title: "Hire", body: "Create roles here, and follow each one's candidates from application to interview, proposal and offer." },
      { target: rail("/team/independents"), title: "Your Independents", body: "Once someone accepts your offer, their trial or role opens here with its tasks, reviews and evaluations." },
      { target: HELP, title: "Help is always here", body: "Open this any time to replay a tour or pick up where you left off.", action: { label: "Create your first role", href: "/team/hire" } },
    ],
  },
  {
    id: "team.discover",
    side: "team",
    path: "/team/discover",
    name: "Discover Independents",
    steps: [
      { target: SEARCH, title: "Search", body: "Look people up by title or skill." },
      { target: "aside", title: "Narrow it down", body: "Filter by experience, rate and skills, then apply the filters." },
      { target: "article", title: "A matched Independent", body: "The match score shows how closely their work style fits yours. Open the card for the full profile, save them, or invite them to apply." },
    ],
  },
  {
    id: "team.contract",
    side: "team",
    path: "/team/independents/[slug]",
    name: "The contract workspace",
    steps: contractSteps("Open one for its details, subtasks and comments. When it's sent to you for review, approve it or ask for changes."),
  },
  {
    id: "team.messages",
    side: "team",
    path: "/team/messages",
    name: "Messages",
    steps: messageSteps("Independent"),
  },
  {
    id: "team.hire",
    side: "team",
    path: "/team/hire",
    name: "Creating a role",
    steps: [
      { target: 'a[href="/team/hire/new?type=trial"]', title: "A paid trial", body: `Work together on real tasks for 30, 60 or ${workingDaysLabel(90)} before you commit. Pick this to test the fit first.` },
      { target: 'a[href="/team/hire/new?type=full-time"]', title: "An ongoing role", body: "Hire straight into a full-time or part-time role with set hours or a salary." },
    ],
  },
  {
    id: "team.role",
    side: "team",
    path: "/team/hire/roles/[slug]",
    name: "A role's candidates",
    steps: [
      { target: '[role="tablist"][aria-label="Role sections"]', title: "Candidates and the role", body: "Candidates is where you hire. Role details shows the post as Independents read it." },
      { target: '[data-tour="role-board"]', title: "Where each one stands", body: "Every candidate sits in a column for their stage, from applied and matched to interview, proposal, offer and hired." },
      { target: '[data-tour="candidate"]', title: "A candidate", body: "Their match, and the next step for their stage: invite to interview, ask for a proposal, review it, or send the offer." },
      { target: 'a[href^="/team/discover?from="]', title: "Find more people", body: "Invite Independents who fit this role to apply. Their applications land on this board." },
    ],
  },
  {
    id: "team.candidate",
    side: "team",
    // `[slug]` stands for any one segment: the candidate's id here.
    path: "/team/hire/roles/[slug]/candidates/[slug]",
    name: "A candidate",
    steps: [
      { target: '[data-tour="talent-head"]', title: "Who they are", body: "Their match with your work style, rate, level and experience. Until you hire, you see a first name and initial, and no links." },
      { target: '[data-tour="candidate-step"]', title: "The next step", body: "This moves them on: invite to interview, ask for a proposal, review it to send your offer, or follow the trial." },
      { target: '[data-tour="candidate-stage"]', title: "Where they stand", body: "Their stage, and what it's waiting on, such as an interview time they haven't accepted yet." },
      { target: "aside", title: "Interview, offer and notes", body: "The interview, the offer you sent and your private notes on them. Flag or decline them from here too." },
    ],
  },
  {
    id: "team.payments",
    side: "team",
    path: "/team/payments",
    name: "Payments",
    steps: [
      { target: '[data-tour="payment-totals"]', title: "Your spending", body: "What you've paid out, what's held in escrow for a trial, and what came back to you after a dispute." },
      { target: SEARCH, title: "Find a payment", body: "Search by contract or Independent, filter by type, contract or dates, or export the list as a CSV file." },
      { target: '[data-tour="payment-ledger"]', title: "Every payment", body: "Escrow deposits, releases and refunds, newest first. Open one to see its breakdown." },
      { target: 'a[href="/team/payments/disputes"]', title: "Disputes", body: "Follow any disputes here. Money under dispute stays held until it's settled." },
    ],
  },
];

const INDEPENDENT: Tour[] = [
  {
    id: "independent.home",
    side: "independent",
    path: "/independent",
    name: "Getting started",
    steps: [
      { title: "Hey! I'm Hira", body: "Let me show you around so you can land your first role. It's quick, and you can skip any time." },
      { target: '[data-tour="setup"]', title: "Finish your profile", body: "Team Builders see your bio, skills and rate first, and each item opens its page. Once you're set, it shows the work style tags companies match you on." },
      { target: '[data-tour="find-role"]', title: "Find your next role", body: "Roles are ranked by how well they fit your work style. Apply with a short note." },
      { target: MY_TASKS, title: "My tasks", body: "Your open tasks, most pressing first. Drag a row to put them in the order you'll work on them." },
      { target: rail("/independent/jobs"), title: "Job Board", body: "Discover roles, track your applications and answer interview invites here." },
      { target: rail("/independent/contracts"), title: "Contracts", body: "When you accept an offer, your trial or role opens here with its tasks, reviews and evaluations." },
      { target: rail("/independent/wallet"), title: "Earnings", body: "See what you've earned and what's held in escrow for you, withdraw it to your payout method when you choose, and follow any disputes." },
      { target: HELP, title: "Help is always here", body: "Open this any time to replay a tour or pick up where you left off.", action: { label: "Find a role", href: "/independent/jobs" } },
    ],
  },
  {
    id: "independent.contract",
    side: "independent",
    path: "/independent/contracts/[slug]",
    name: "Your contract",
    steps: contractSteps("Open one for its details, subtasks and comments. Tick its circle when it's ready to send for review."),
  },
  {
    id: "independent.messages",
    side: "independent",
    path: "/independent/messages",
    name: "Messages",
    steps: messageSteps("Team Builder"),
  },
  {
    id: "independent.jobs",
    side: "independent",
    path: "/independent/jobs",
    name: "Discover roles",
    steps: [
      { target: SEARCH, title: "Search", body: "Look roles up by title, company or skill." },
      { target: "aside", title: "Narrow it down", body: "Filter by role type, experience, rate and skills. The list changes as you tick them." },
      { target: "article", title: "A role for you", body: "The match score shows how well the company's work style fits yours. Open the role to read it in full and apply." },
    ],
  },
  {
    id: "independent.applications",
    side: "independent",
    path: "/independent/jobs/applications",
    name: "My applications",
    steps: [
      { target: '[data-tour="applications"] section[aria-label]', title: "Where each one stands", body: "Every application moves along these columns, from applied to interview, proposal and offer. One that's turned down or withdrawn moves to Closed." },
      { target: '[data-tour="applications"] li', title: "An application", body: "Open it to answer an interview invite, send your proposal or review an offer." },
    ],
  },
  {
    id: "independent.application",
    side: "independent",
    // `[slug]` stands for any one segment: the application's id here.
    path: "/independent/jobs/applications/[slug]",
    name: "Your application",
    steps: [
      { target: '[data-tour="application-stage"]', title: "Where it stands", body: "Its stage, from applied to interview, proposal and offer, then Trial started once you've signed." },
      { target: '[data-tour="application-step"]', title: "Your next step", body: "What to do now: answer an interview invite, send your proposal, review the offer, or open your contract." },
    ],
  },
  {
    id: "independent.role",
    side: "independent",
    path: "/independent/jobs/[slug]",
    except: ["/independent/jobs/applications", "/independent/jobs/saved", "/independent/jobs/interviews"],
    name: "A role",
    steps: [
      { target: '[data-tour="role-head"]', title: "The role", body: "Who's hiring, the kind of role, your match, and the pay, length and level." },
      { target: '[data-tour="role-style"]', title: "Work style", body: "The company's work style tags beside yours. The more they share, the higher your match." },
      { target: '[data-tour="role-apply"]', title: "Apply", body: "Apply with a short note. Once you have, this opens your application instead." },
    ],
  },
  {
    id: "independent.wallet",
    side: "independent",
    path: "/independent/wallet",
    name: "Earnings",
    steps: [
      { target: '[data-tour="earnings-totals"]', title: "Your money", body: "What you've received, what's ready to withdraw, what's held in escrow for a trial, and what you've withdrawn." },
      { target: '[data-tour="payout-methods"]', title: "Payout methods", body: "Where your money goes. Add a bank or e-wallet, pick your default, or remove one." },
      { target: '[data-tour="withdraw"]', title: "Withdraw", body: "Send what's available to a payout method, in the amount you choose, once escrow has released your pay." },
    ],
  },
];

export const TOURS: Tour[] = [...TEAM, ...INDEPENDENT];

/** The side a pathname belongs to, or null outside the two portals (Admin, onboarding). */
export function sideOf(pathname: string): TourSide | null {
  if (pathname === "/team" || pathname.startsWith("/team/")) return "team";
  if (pathname === "/independent" || pathname.startsWith("/independent/")) return "independent";
  return null;
}

/** Whether a pathname is the screen a tour's `path` names, a `[slug]` in it standing for any one segment. */
export function onTourPath(path: string, pathname: string): boolean {
  const want = path.split("/");
  const got = pathname.split("/");
  return want.length === got.length && want.every((part, i) => (part === "[slug]" ? got[i] !== "" : part === got[i]));
}

/** The tour for this screen, if it has one. */
export const tourFor = (pathname: string) => TOURS.find((t) => onTourPath(t.path, pathname) && !t.except?.includes(pathname));

/** A side's getting-started tour: the one on its dashboard. */
export const homeTour = (side: TourSide) => TOURS.find((t) => t.side === side && t.path === `/${side}`)!;

export const tourById = (id: string) => TOURS.find((t) => t.id === id);
