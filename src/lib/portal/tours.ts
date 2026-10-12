/**
 * The guided tours: one per screen that needs explaining, in each portal, told by that side's quiz
 * assistant — Hiro for a Team Builder, Hira for an Independent — so the voice someone met in
 * onboarding is the one that shows them round.
 *
 * A step points at its element with a CSS selector (`target`). One with no target, or whose
 * element isn't on screen right now (a phone hides the section panel, a board can be empty),
 * shows in the middle of the screen instead, so a tour never gets stuck.
 */

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
  /** What the help menu calls it. */
  name: string;
  steps: TourStep[];
};

/** Each side's guide, as the onboarding quiz has them. */
export const GUIDES: Record<TourSide, { name: string; avatar: string }> = {
  team: { name: "Hiro", avatar: "/images/employer-success.svg" },
  independent: { name: "Hira", avatar: "/images/talent-success.svg" },
};

const rail = (href: string) => `nav[aria-label="Sections"] a[href="${href}"]`;
const SEARCH = 'label:has(input[placeholder^="Search"])';
const HELP = '[data-tour="help"]';

/**
 * The contract workspace, the same on both sides: its sections, where it stands, the views, the
 * toolbar and a task. `task` is what this side does with one.
 */
function contractSteps(task: string): TourStep[] {
  return [
    { target: '[role="tablist"][aria-label="Contract sections"]', title: "Everything in one place", body: "Work holds the tasks. Overview shows progress, and Contract & Payment the terms and the money. A trial adds Evaluation when it ends." },
    { target: 'p[aria-label="Summary"]', title: "Where it stands", body: "How far into the contract you are, and on a trial the Trial Fit Score, which moves as the work gets done." },
    { target: '[role="tablist"][aria-label="Views"]', title: "See the work your way", body: "Board, List, Calendar, Timeline and Workload all show the same tasks. Pick whichever suits the moment." },
    { target: '[role="toolbar"][aria-label="Search, filter, sort and group"]', title: "Find what matters now", body: "Search, filter, sort and group the tasks, for example to see only what's overdue." },
    { target: '[data-testid="workspace"] [role="group"][aria-label^="#"]', title: "A task", body: task },
  ];
}

/** Messages, the same on both sides: the conversations and the composer. `who` is the other side. */
function messageSteps(who: string): TourStep[] {
  return [
    { target: "aside", title: "Your conversations", body: `A thread opens with each ${who} once an interview is booked, and stays through the contract. Search by name or by what was said.` },
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
      { target: '[data-tour="setup"]', title: "Finish your setup", body: "This checklist shows what's left before you can hire. Each item opens the page that completes it." },
      { target: '[data-tour="create-role"]', title: "Create a role", body: "Start here. Post a paid trial or an ongoing role, and Independents who fit your work style can apply." },
      { target: rail("/team/discover"), title: "Discover Independents", body: "Browse Independents matched to your work style. Save the ones you like and invite them to apply." },
      { target: rail("/team/hire"), title: "Hire", body: "Your roles, candidates, interviews and sent offers live here. Move each candidate from interview to offer." },
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
      { target: 'a[href="/team/hire/new?type=trial"]', title: "A paid trial", body: "Work together on real tasks for 30, 60 or 90 days before you commit. Pick this to test the fit first." },
      { target: 'a[href="/team/hire/new?type=full-time"]', title: "An ongoing role", body: "Hire straight into a full-time or part-time role with set hours or a salary." },
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
      { target: '[data-tour="setup"]', title: "Finish your profile", body: "Team Builders see your bio, skills and rate first. Each item opens the page that completes it." },
      { target: '[data-tour="find-role"]', title: "Find your next role", body: "Roles are ranked by how well they fit your work style. Apply with a short note." },
      { target: rail("/independent/jobs"), title: "Job Board", body: "Discover roles, track your applications and answer interview invites here." },
      { target: rail("/independent/contracts"), title: "Contracts", body: "When you accept an offer, your trial or role opens here with its tasks, reviews and evaluations." },
      { target: rail("/independent/wallet"), title: "Earnings", body: "See what you've been paid, what's held in escrow for you, and any disputes." },
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
      { target: "aside", title: "Narrow it down", body: "Filter by role type, experience, rate and skills, then apply the filters." },
      { target: "article", title: "A role for you", body: "The match score shows how well the company's work style fits yours. Open the role to read it in full and apply." },
    ],
  },
  {
    id: "independent.applications",
    side: "independent",
    path: "/independent/jobs/applications",
    name: "My applications",
    steps: [
      { target: "section[aria-label]", title: "Where each one stands", body: "Every application moves along these columns, from applied to interview, proposal and offer." },
      { target: "section[aria-label] li", title: "An application", body: "Open it to answer an interview invite, send your proposal or review an offer." },
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
export const tourFor = (pathname: string) => TOURS.find((t) => onTourPath(t.path, pathname));

/** A side's getting-started tour: the one on its dashboard. */
export const homeTour = (side: TourSide) => TOURS.find((t) => t.side === side && t.path === `/${side}`)!;

export const tourById = (id: string) => TOURS.find((t) => t.id === id);
