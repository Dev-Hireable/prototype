import { dayOf, isoOf, stampLabel, type Day } from "./dates";
import { COMMENT_MAX, DESCRIPTION_MAX, EFFORT_MAX, isArchived, isCompleted, NOTE_MAX, PROJECT_NAME_MAX, refOf, TAG_MAX, TAGS_PER_ITEM, TITLE_MAX, type ById, type WorkItem, type WorkProject, type WorkType } from "./model";

/**
 * The rules a work item has to satisfy, as pure checks. The repository runs them on every save, and
 * the UI runs the same ones as the user types, so a message shown inline is the message a save
 * would have failed with. Each returns null when the value is fine.
 */

export type Invalid = { field: string; message: string };

export function checkTitle(raw: string): Invalid | null {
  const t = raw.trim();
  if (!t) return { field: "title", message: "Give it a name." };
  if (t.length > TITLE_MAX) return { field: "title", message: `Keep the name under ${TITLE_MAX} characters.` };
  return null;
}

/** A project's name: there, short, and not one another project on the contract already has (case aside). */
export function checkProjectName(raw: string, projects: readonly WorkProject[], self?: string): Invalid | null {
  const name = raw.trim();
  if (!name) return { field: "name", message: "Give the project a name." };
  if (name.length > PROJECT_NAME_MAX) return { field: "name", message: `Keep the name under ${PROJECT_NAME_MAX} characters.` };
  const lower = name.toLowerCase();
  if (["no project", "trial"].includes(lower)) return { field: "name", message: `“${name}” is already how the workspace names part of the work. Pick another name.` };
  if (projects.some((p) => p.id !== self && p.name.trim().toLowerCase() === lower)) return { field: "name", message: `There's already a project called “${name}”.` };
  return null;
}

export function checkDescription(raw: string | undefined): Invalid | null {
  if ((raw ?? "").length > DESCRIPTION_MAX) return { field: "description", message: `Keep the description under ${DESCRIPTION_MAX.toLocaleString("en-US")} characters.` };
  return null;
}

export type DateRules = {
  today: Day;
  /** A trial's last day: nothing can start or be due after it. */
  lastDay?: Day | null;
};

/**
 * Start and due together. `before` is what was saved, so only a date being set or changed is held
 * to "not in the past" and "not after the trial" — an old item isn't blocked from other edits by a
 * date it already had.
 */
export function checkDates(next: { start?: string; due?: string; type: WorkType }, before: { start?: string; due?: string } | null, rules: DateRules): Invalid | null {
  const start = next.start ? dayOf(next.start) : null;
  const due = next.due ? dayOf(next.due) : null;
  if (next.start && start === null) return { field: "start", message: "That start date isn't a real date." };
  if (next.due && due === null) return { field: "due", message: "That due date isn't a real date." };
  if (next.type === "milestone" && start !== null) return { field: "start", message: "A milestone has a single date — its due date. Clear the start date first." };
  if (start !== null && due !== null && start > due) return { field: "due", message: "The due date can't be before the start date." };
  const dueChanged = next.due !== before?.due;
  const startChanged = next.start !== before?.start;
  if (due !== null && dueChanged && due < rules.today) return { field: "due", message: "The due date can't be in the past." };
  // Work already under way keeps its start, and can be moved later (a timeline drag) — just not earlier into the past.
  const was = before?.start ? dayOf(before.start) : null;
  if (start !== null && startChanged && start < rules.today && (was === null || start < was)) return { field: "start", message: "The start date can't be in the past." };
  const last = rules.lastDay ?? null;
  if (last !== null) {
    const after = `The trial ends on ${stampLabel(last)}, so nothing can be scheduled after it.`;
    if (due !== null && dueChanged && due > last) return { field: "due", message: after };
    if (start !== null && startChanged && start > last) return { field: "start", message: after };
  }
  return null;
}

/** An item's dates, as checkDates reads them. */
type Dated = { start?: string; due?: string; type: WorkType };

/**
 * Whether `t`'s `which` date can be set to `iso`: checkDates on the item with that day, against the
 * item as it's saved. A date picker asks this of each day, so it offers exactly what a save accepts.
 */
export function dateAllowed(t: Dated, which: "start" | "due", iso: string, rules: DateRules): boolean {
  const next = { start: t.start, due: t.due, type: t.type };
  next[which] = iso;
  return checkDates(next, t, rules) === null;
}

/**
 * Whether any day but the one it has can be picked for `t`'s `which` date — none can for the start of
 * work left overdue without one. checkDates compares a day only with the days it's given (today, a
 * trial's last day, the item's start and due), so its answer can only change at one of those: trying
 * each, and the day either side of it, tries every stretch of the calendar.
 */
export function anyDateAllowed(t: Dated, which: "start" | "due", rules: DateRules): boolean {
  const marks = [rules.today, rules.lastDay, dayOf(t.start), dayOf(t.due)].filter((d): d is Day => typeof d === "number");
  return marks.some((m) => [m, m + 1, m - 1].some((d) => isoOf(d) !== t[which] && dateAllowed(t, which, isoOf(d), rules)));
}

export function checkEffort(effort: number | undefined, type: WorkType): Invalid | null {
  if (effort === undefined) return null;
  if (type === "milestone") return { field: "effort", message: "A milestone marks a date, so it has no effort. Clear the effort first." };
  if (!Number.isInteger(effort) || effort < 0 || effort > EFFORT_MAX) return { field: "effort", message: `Effort is a whole number from 0 to ${EFFORT_MAX}.` };
  return null;
}

/** "Q3 Launch " → "q3-launch": lower case, dashes for spaces, letters, digits, - and _ only. */
export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function checkTag(tag: string, existing: readonly string[]): Invalid | null {
  if (!tag) return { field: "tags", message: "Tags use letters, numbers, - and _." };
  if (tag.length > TAG_MAX) return { field: "tags", message: `Keep tags under ${TAG_MAX} characters.` };
  if (!existing.includes(tag) && existing.length >= TAGS_PER_ITEM) return { field: "tags", message: `An item can have up to ${TAGS_PER_ITEM} tags.` };
  return null;
}

/**
 * Whether `itemId` can start waiting on `onId`: not itself, not twice, not an archived or missing
 * item, and not something that already waits on it — directly or down a chain, which would leave
 * neither ever able to start. The loop is named so the user can see which link to remove.
 */
export function checkDependency(itemId: string, onId: string, byId: ById): Invalid | null {
  const item = byId.get(itemId);
  const on = byId.get(onId);
  if (itemId === onId) return { field: "dependsOn", message: "An item can't depend on itself." };
  if (!item) return { field: "dependsOn", message: "That item no longer exists." };
  if (!on) return { field: "dependsOn", message: "The item it would wait on no longer exists." };
  if (isArchived(on)) return { field: "dependsOn", message: `${refOf(on)} is deleted. Restore it before depending on it.` };
  // Done work blocks nothing, so waiting on it means nothing — a finished project's or the trial's
  // included (all their work is done). Links made before it finished stay, and read as done.
  if (isCompleted(on.status)) return { field: "dependsOn", message: `${refOf(on)} is already done, so there's nothing to wait on.` };
  if (item.dependsOn.includes(onId)) return { field: "dependsOn", message: `${refOf(item)} already waits on ${refOf(on)}.` };
  const loop = pathTo(onId, itemId, byId);
  if (loop) {
    const chain = [item, ...loop].map(refOf).join(" → ");
    return { field: "dependsOn", message: `That would create a loop: ${chain}. An item can't wait on work that waits on it.` };
  }
  return null;
}

/** The chain of dependsOn links from `from` to `to`, as items (both ends included), or null. */
function pathTo(from: string, to: string, byId: ById): WorkItem[] | null {
  const seen = new Set<string>();
  const walk = (id: string): WorkItem[] | null => {
    const node = byId.get(id);
    if (!node || seen.has(id)) return null;
    if (id === to) return [node];
    seen.add(id);
    for (const next of node.dependsOn) {
      const rest = walk(next);
      if (rest) return [node, ...rest];
    }
    return null;
  };
  return walk(from);
}

export function checkNote(raw: string | undefined, required: boolean, field = "note"): Invalid | null {
  const t = (raw ?? "").trim();
  if (required && !t) return { field, message: "Say what should change, so they know what to fix." };
  if (t.length > NOTE_MAX) return { field, message: `Keep the note under ${NOTE_MAX.toLocaleString("en-US")} characters.` };
  return null;
}

export function checkComment(raw: string): Invalid | null {
  const t = raw.trim();
  if (!t) return { field: "comment", message: "Write something first." };
  if (t.length > COMMENT_MAX) return { field: "comment", message: `Keep comments under ${COMMENT_MAX.toLocaleString("en-US")} characters.` };
  return null;
}

export function checkSubtaskTitle(raw: string): Invalid | null {
  const t = raw.trim();
  if (!t) return { field: "subtask", message: "Give the subtask a name." };
  if (t.length > TITLE_MAX) return { field: "subtask", message: `Keep it under ${TITLE_MAX} characters.` };
  return null;
}
