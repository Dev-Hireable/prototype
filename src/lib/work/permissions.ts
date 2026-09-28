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
 * TB-077 — a task from the signed offer (`agreed`) is an ordinary task, minus what the offer set: the
 * fields its task plan carries — the name, the details, the due date its due week became and the
 * priority — and who does it, since the offer is made to the Independent (AGREED_FIELDS). Nobody
 * changes those, or deletes the task; what was agreed was settled in the proposal, before the offer
 * went out. Everything else on it — status, start, effort, work type, tags, dependencies, subtasks and
 * comments — is worked like any other task. A trial's agreement holds while the contract is a trial;
 * once it has converted, what the trial left open is the role's work (agreedNow).
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
  /**
   * Type, priority, due, effort, tags and project. The start has its own cap (`start`), which the
   * Independent shares. What a signed offer set of the plan stays as agreed: ask changeFor per field.
   */
  plan: boolean;
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

const NONE: Caps = { editText: false, plan: false, depend: false, start: false, assign: false, subtasks: false, tick: false, comment: false, archive: false, restore: false };

const isActive = (s: WorkStatus) => s === "todo" || s === "doing";

/* ------------------------------------------------------- what was agreed */

/** What a person changes on an item: the repository's patch fields (WorkPatch), and its tags. */
export type WorkField = "title" | "description" | "type" | "priority" | "assignee" | "start" | "due" | "effort" | "project" | "tags";

/**
 * TB-077 — what a signed offer sets on each of its tasks, so nobody changes it once it's signed:
 * every field its task plan carries (@/lib/demo/tasks PlannedTask — the name, the details, the due
 * week that becomes the due date, and the priority), even one left blank, and who does it, since the
 * offer is made to the Independent. tests/unit/permissions.spec holds this to what signing copies.
 */
export const AGREED_FIELDS = ["title", "description", "due", "priority", "assignee"] as const satisfies readonly WorkField[];
export type AgreedField = (typeof AGREED_FIELDS)[number];

/**
 * Whether the signed offer's terms still hold on `t`. A trial's hold while the contract is a trial —
 * before it starts, while it runs, and while it's evaluated and decided. Once it has converted, the
 * trial has been evaluated and paid and its score is frozen, so what it left open is the role's work
 * like any other; what it finished stays read-only, as its chapter (lockedReason).
 */
export const agreedNow = (t: Pick<WorkItem, "agreed" | "trial">, access: Pick<WorkAccess, "trial">) => !!t.agreed && !(t.trial && !access.trial);

/** Whether `field` on `t` is one the signed offer set, while its terms hold. */
export const isAgreed = (t: Pick<WorkItem, "agreed" | "trial">, access: Pick<WorkAccess, "trial">, field: WorkField): field is AgreedField => agreedNow(t, access) && (AGREED_FIELDS as readonly WorkField[]).includes(field);

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
  const agreed = agreedNow(t, access);
  if (isArchived(t)) return { ...NONE, restore: access.open && mine && !agreed };
  const active = isActive(t.status);
  const completed = isCompleted(t.status);
  if (manager)
    return {
      editText: access.open && mine && !agreed && active,
      plan: access.open && !completed,
      depend: access.open && !completed,
      start: access.open && !completed,
      // Moving an agreed item off the Independent would take it out of the trial's score.
      assign: access.open && active && !agreed,
      subtasks: access.open && !completed,
      tick: access.open && active && t.assignee !== "independent",
      comment: access.reviewOpen,
      // Not the Independent's work once it's submitted or approved — that is what they're scored on.
      archive: access.open && mine && !agreed && (active || t.assignee !== "independent"),
      restore: false,
    };
  const theirs = t.assignee === "independent";
  return {
    editText: access.open && mine && !agreed && active,
    plan: false,
    // Their own work only: what someone else's item waits on is that person's call.
    depend: access.open && theirs && !completed,
    // Only while they're still working it: once it's sent for review, its dates are the Team Builder's.
    start: access.open && theirs && active,
    assign: false,
    subtasks: access.open && theirs && !completed,
    tick: access.open && theirs && active,
    comment: access.reviewOpen,
    archive: access.open && mine && !agreed && active,
    restore: false,
  };
}

/* ---------------------------------------------------------------- fields */

/** Why a task from the signed offer can't be reworded, rescheduled, reprioritised, reassigned or deleted. */
export const AGREED = "It was agreed in the signed offer, so it stays as agreed.";

/** Why a trial has no projects (canPlanProjects). */
export const PROJECTS_LATER = "Projects start once the trial becomes a full-time or part-time role.";

export const VIEWER_ONLY = "Admins can see this workspace but can't change it.";

/** Why nothing on a deleted item changes. */
const DELETED = "It's deleted. Restore it to change it.";

/** Whether someone can change one of an item's fields now; if not, why — and whether the signed offer set it, which reads as a lock. */
export type FieldChange = { ok: true } | { ok: false; reason: string; agreed: boolean };

const ALLOWED: FieldChange = { ok: true };
const refused = (reason: string, agreed = false): FieldChange => ({ ok: false, reason, agreed });

/**
 * TB-077 / TB-063 — whether `actor` can change `field` on `t` right now, and why not: the fields'
 * counterpart of transitionFor. Every editor, board drop, calendar and timeline drag, keyboard move
 * and the repository ask this one function, so a control is only offered for a change that saves,
 * and a field the signed offer set reads the same everywhere.
 */
export function changeFor(t: WorkItem, actor: Pick<Actor, "role">, access: WorkAccess, field: WorkField, names: Names = DEFAULT_NAMES): FieldChange {
  if (actor.role === "viewer") return refused(VIEWER_ONLY);
  const lock = lockedReason(t, access);
  if (lock) return refused(lock);
  if (isArchived(t)) return refused(DELETED);
  if (!access.open) return refused(access.closedReason ?? "This contract isn't taking new work.");
  if (field === "project" && access.trial) return refused(PROJECTS_LATER);
  if (isAgreed(t, access, field)) return refused(AGREED, true);
  return capOf(capsFor(t, actor, access), field) ? ALLOWED : refused(roleReason(t, actor, field, names));
}

/** The cap each field needs: its wording, who does it and when it starts have their own; the rest is the plan. */
function capOf(caps: Caps, field: WorkField): boolean {
  if (field === "title" || field === "description") return caps.editText;
  if (field === "assignee") return caps.assign;
  if (field === "start") return caps.start;
  return caps.plan;
}

/** Why a field the signed offer didn't set isn't this person's to change, on an open contract. */
function roleReason(t: WorkItem, actor: Pick<Actor, "role">, field: WorkField, names: Names): string {
  if (field === "title" || field === "description") return t.status === "review" || t.status === "done" ? "It can't be reworded once it's been sent for review." : "Only whoever added it can reword it.";
  if (actor.role === "contributor" && field === "start") return t.assignee !== "independent" ? `It isn't yours to work on, so ${names.team} sets when it starts.` : "Its start is set once it's been sent for review.";
  if (actor.role === "contributor") return `${names.team} plans the work — the due dates, effort, work type, priority, tags and who does it.`;
  if (field === "assignee") return "It can only be reassigned while it's To do or In progress.";
  return "It's done, so its plan is final. Reopen it to change it.";
}

/* -------------------------------------------------------------- subtasks */

/**
 * TB-075 / IN-041 — why `actor` can't tick `t`'s subtasks off (or back on) right now, or null when
 * they can (`tick` in capsFor): whoever does the work ticks them, while it's being worked. The
 * repository refuses with this and the sheet's checkboxes say it, so both read the same.
 */
export function tickRefusal(t: WorkItem, actor: Pick<Actor, "role">, access: WorkAccess): string | null {
  if (actor.role === "viewer") return VIEWER_ONLY;
  const lock = lockedReason(t, access);
  if (lock) return lock;
  if (isArchived(t)) return DELETED;
  if (capsFor(t, actor, access).tick) return null;
  if (!access.open) return access.closedReason ?? "This contract isn't taking new work.";
  return t.status === "review" || t.status === "done" ? "Its subtasks are locked while it's in review or done." : "Whoever does the work ticks its subtasks off.";
}

/**
 * TB-064 — only the Team Builder adds work, and only to a full-time or part-time role. A trial's
 * work is the task list agreed in its signed offer, which the escrow and the Trial Fit Score were
 * set on, so nothing is added to it.
 */
export const canCreate = (actor: Pick<Actor, "role">, access: WorkAccess) => actor.role === "manager" && access.open && !access.trial;

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
