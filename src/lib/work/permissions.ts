import { isArchived, isCompleted, STATUS_META, type Side, type WorkItem, type WorkStatus } from "./model";

/**
 * Who may do what to a contract's work. The repository enforces these on every change — they are
 * the prototype's authorization — and the UI asks the same functions which controls to offer, so
 * a button is only ever shown for a change that would be accepted.
 *
 *   manager      the Team Builder: plans the work, creates and assigns items, reviews the
 *                Independent's work, and works their own items straight to Done;
 *   contributor  the Independent: moves their own items, breaks them into subtasks, says what they
 *                wait on and when they start, sends them for review and can take a submission back;
 *   viewer       Hireable admin: reads everything, changes nothing.
 *
 * The signed offer's tasks (`agreed`) are what both sides signed: nobody rewords, reschedules,
 * re-estimates, reassigns or deletes one. What was agreed was settled in the proposal, before the
 * offer went out. Running the work — its status, start, priority, tags, subtasks and comments — works
 * the same on every item.
 */

export type Role = "manager" | "contributor" | "viewer";
export type Actor = { role: Role; name: string };

export const sideOf = (a: Pick<Actor, "role">): Side | null => (a.role === "manager" ? "team" : a.role === "contributor" ? "independent" : null);

/** Where the contract is, as far as work goes. */
export type WorkAccess = {
  /** Takes new work: live and, on a trial, before its last day. */
  open: boolean;
  /** Not ended: submissions can still be ruled on, and both sides can comment. */
  reviewOpen: boolean;
  trial: boolean;
  /** A trial's last day (yyyy-mm-dd): nothing can be scheduled after it. */
  lastDay?: string;
  /**
   * The trial is over and hasn't turned into anything yet (it's being evaluated and decided): the
   * Team Builder can approve what's in review and wrap up their own items, but nothing is sent back
   * to the Independent — they couldn't act on it.
   */
  trialClosed?: boolean;
  /** A full-time or part-time role's first day (yyyy-mm-dd): what closes a converted trial's chapter (./projects). */
  roleSince?: string;
  /** TB-148 — the projects marked finished (archived ones too): their work is read-only (lockedReason). */
  finishedProjects?: string[];
  /** The first day, while it's still to come ("28 Sep 2026"): the Independent's work opens then. */
  startsOn?: string;
  /** Why no new work is taken, for the UI. */
  closedReason?: string;
};

export const CLOSED: WorkAccess = { open: false, reviewOpen: false, trial: false, closedReason: "This contract isn't open." };

/** First names, for reasons a person reads. */
export type Names = { team: string; independent: string };
const DEFAULT_NAMES: Names = { team: "the Team Builder", independent: "the Independent" };

export type Caps = {
  /** Rename it or change its description. */
  editText: boolean;
  /** Type, priority, start, due, effort, tags and project. The start has its own cap too (`start`), which the Independent shares. */
  plan: boolean;
  /**
   * The part of the plan a signed offer sets: the due date, the effort and the work type. On one of
   * its tasks (`agreed`) they stay as agreed; priority, tags and the project stay everyday planning.
   */
  scope: boolean;
  /** What it waits on. Whoever does the work knows that too, so it isn't only the plan's. */
  depend: boolean;
  /** When it starts. Also the Independent's on their own open work — they know when they begin it; the due date stays the plan's. */
  start: boolean;
  assign: boolean;
  /** Add or remove subtasks. */
  subtasks: boolean;
  /** Tick subtasks off. */
  tick: boolean;
  comment: boolean;
  archive: boolean;
  restore: boolean;
};

const NONE: Caps = { editText: false, plan: false, scope: false, depend: false, start: false, assign: false, subtasks: false, tick: false, comment: false, archive: false, restore: false };

const isActive = (s: WorkStatus) => s === "todo" || s === "doing";

/**
 * TB-148 — why an item is read-only as part of finished work, if it is: it sits in a project marked
 * finished (or archived), or in the trial's chapter once the contract has become a role — trial work
 * finished before the role's first day (./projects). Nothing on it changes — no edits, moves, status
 * changes, subtasks or comments — until its project is reopened; the trial's chapter stays as it was.
 * `capsFor` and `transitionFor` answer from this, and the repository refuses with its reason.
 */
export function lockedReason(t: Pick<WorkItem, "project" | "trial" | "status" | "completedAt">, access: WorkAccess): string | null {
  if (access.trial) return null;
  if (t.project && access.finishedProjects?.includes(t.project)) return "Its project is finished, so its work is read-only. Reopen the project to change it.";
  if (!t.project && t.trial && isCompleted(t.status)) {
    const since = access.roleSince ? new Date(`${access.roleSince}T00:00:00`).getTime() : undefined;
    if (t.completedAt === undefined || since === undefined || t.completedAt < since) return "It's part of the finished trial, so it stays as it was.";
  }
  return null;
}

export function capsFor(t: WorkItem, actor: Pick<Actor, "role">, access: WorkAccess): Caps {
  if (actor.role === "viewer") return NONE;
  if (lockedReason(t, access)) return NONE;
  const manager = actor.role === "manager";
  const side: Side = manager ? "team" : "independent";
  const mine = t.addedBy === side;
  if (isArchived(t)) return { ...NONE, restore: access.open && mine && !t.agreed };
  const active = isActive(t.status);
  const completed = isCompleted(t.status);
  if (manager)
    return {
      editText: access.open && mine && !t.agreed && active,
      plan: access.open && !completed,
      scope: access.open && !completed && !t.agreed,
      depend: access.open && !completed,
      start: access.open && !completed,
      // Moving an agreed item off the Independent would take it out of the trial's score.
      assign: access.open && active && !t.agreed,
      subtasks: access.open && !completed,
      tick: access.open && active && t.assignee !== "independent",
      comment: access.reviewOpen,
      // Not the Independent's work once it's submitted or approved — that is what they're scored on.
      archive: access.open && mine && !t.agreed && (active || t.assignee !== "independent"),
      restore: false,
    };
  const theirs = t.assignee === "independent";
  return {
    editText: access.open && mine && !t.agreed && active,
    plan: false,
    scope: false,
    // Their own work only: what someone else's item waits on is that person's call.
    depend: access.open && theirs && !completed,
    // Only while they're still working it: once it's sent for review, its dates are the Team Builder's.
    start: access.open && theirs && active,
    assign: false,
    subtasks: access.open && theirs && !completed,
    tick: access.open && theirs && active,
    comment: access.reviewOpen,
    archive: access.open && mine && !t.agreed && active,
    restore: false,
  };
}

/**
 * TB-064 — only the Team Builder adds work, and only to a full-time or part-time role. A trial's
 * work is the task list agreed in its signed offer, which the escrow and the Trial Fit Score were
 * set on, so nothing is added to it.
 */
export const canCreate = (actor: Pick<Actor, "role">, access: WorkAccess) => actor.role === "manager" && access.open && !access.trial;

/** Why a task from the signed offer can't be reworded, rescheduled, re-estimated, reassigned or deleted. */
export const AGREED = "It was agreed in the signed offer, so it stays as agreed.";

/**
 * TB-148 — projects are a role's, not a trial's (the trial is one plan already), and they're the
 * Team Builder's to run: add, rename, finish and reopen them, and move work between them.
 */
export const canPlanProjects = (actor: Pick<Actor, "role">, access: WorkAccess) => actor.role === "manager" && access.open && !access.trial;

/** Manual order is the Team Builder's plan. */
export const canReorder = (actor: Pick<Actor, "role">, access: WorkAccess) => actor.role === "manager" && access.open;

/* ------------------------------------------------------------ transitions */

export type TransitionKind =
  | "start" // To do → In progress
  | "pause" // In progress → To do
  | "submit" // → In review (the Independent)
  | "takeBack" // In review → To do / In progress (the Independent)
  | "approve" // In review → Done (the Team Builder)
  | "requestChanges" // In review → In progress, with a note (the Team Builder)
  | "complete" // → Done, on the Team Builder's own items
  | "reopen"; // Done → To do / In progress, on the Team Builder's own items

export type Transition = { ok: true; kind: TransitionKind; needsNote: boolean } | { ok: false; reason: string };

const no = (reason: string): Transition => ({ ok: false, reason });
const yes = (kind: TransitionKind, needsNote = false): Transition => ({ ok: true, kind, needsNote });

/**
 * Whether `actor` can move `t` to `to`, and what that move means. Board drops, the Move menu, the
 * status menus, the keyboard shortcuts and the repository all ask this one function.
 */
export function transitionFor(t: WorkItem, actor: Pick<Actor, "role">, access: WorkAccess, to: WorkStatus, names: Names = DEFAULT_NAMES): Transition {
  const from = t.status;
  if (actor.role === "viewer") return no("Admins can see this workspace but can't change it.");
  if (isArchived(t)) return no("It's deleted. Restore it to change its status.");
  const lock = lockedReason(t, access);
  if (lock) return no(lock);
  if (from === to) return no(`It's already ${STATUS_META[to].label}.`);
  const closed = access.closedReason ?? "This contract isn't taking new work.";

  if (actor.role === "manager") {
    if (t.assignee === "independent") {
      if (from === "review" && to === "done") return access.reviewOpen ? yes("approve") : no(closed);
      if (from === "review" && to === "doing") {
        if (!access.reviewOpen) return no(closed);
        // Sent back after the trial's last day, it could never come back: the Independent can't work it any more.
        if (access.trialClosed) return no(`The trial is over, so ${names.independent} can't make changes now. Approve it, or leave it for your evaluation.`);
        return yes("requestChanges", true);
      }
      if (from === "review") return no(access.trialClosed ? "The trial is over: approve it, or leave it for your evaluation." : "Send it back with Request changes, so there's a note on what to fix.");
      return no(`${names.independent} moves their own work. You can approve it or ask for changes once it's in review.`);
    }
    // Their own and unassigned items: while a closed trial is wrapped up, they can still be finished.
    if (!access.open && !(access.trialClosed && access.reviewOpen)) return no(closed);
    if (to === "review") return no(`In review is for ${names.independent}'s work. Your own items go straight to Done.`);
    if (to === "done") return yes("complete");
    if (isCompleted(from)) return yes("reopen");
    return yes(to === "doing" ? "start" : "pause");
  }

  // The Independent.
  if (t.assignee !== "independent") return no(t.assignee === "team" ? `This is ${names.team}'s item, so only they move it.` : `Nobody is assigned to it yet — ${names.team} assigns work.`);
  if (!access.open) return no(access.trialClosed ? `The trial is over, so its work is with ${names.team} for the evaluation.` : closed);
  if (access.startsOn) return no(`The contract starts on ${access.startsOn}, so work opens then.`);
  if (isCompleted(from)) return no("It's been approved, so it stays Done.");
  if (to === "done") return no(`Only ${names.team} can mark it Done. Send it for review instead.`);
  if (to === "review") return yes("submit");
  if (from === "review") return yes("takeBack");
  return yes(to === "doing" ? "start" : "pause");
}

/** The statuses `actor` could move `t` to right now. */
export function targetsFor(t: WorkItem, actor: Pick<Actor, "role">, access: WorkAccess): WorkStatus[] {
  return (["todo", "doing", "review", "done"] as const).filter((s) => transitionFor(t, actor, access, s).ok);
}

/** Why nothing on the list can be changed by this person, if that's the case. */
export function readOnlyReason(actor: Pick<Actor, "role">, access: WorkAccess): string | null {
  if (actor.role === "viewer") return "You're viewing this workspace as an admin. It's read-only.";
  if (!access.reviewOpen) return access.closedReason ?? "This contract has ended, so its work is read-only.";
  return null;
}
