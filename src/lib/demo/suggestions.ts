import { weekLabel, type PlannedTask } from "./tasks";

/**
 * IN-073 / TB-106 — changes the talent suggests to a trial's tasks when they revise their proposal.
 * The tasks stay the Team Builder's: a suggestion is a request, with the talent's reason, and the
 * Team Builder accepts or ignores each one when they review the proposal. What they accept goes into
 * the offer's tasks as it stands (applySuggestions) — the offer doesn't edit them (TB-105), and once
 * it's signed what each task's plan sets stays as agreed (TB-077).
 *
 *   change  a task, with a new name and/or a different due week
 *   remove  a task that shouldn't be there
 *   add     a task that's missing
 */
export type TaskSuggestion =
  | { id: string; kind: "change"; task: number; was: string; title?: string; week?: number; note: string }
  | { id: string; kind: "remove"; task: number; was: string; note: string }
  | { id: string; kind: "add"; title: string; week?: number; note: string };

export type SuggestionDecision = "accepted" | "ignored";

export const SUGGESTION_NOTE_MAX = 300;
const SUGGESTION_TITLE_MAX = 200;

/** Why a suggestion can't be sent yet, or null. The form and the save read the same rule. */
export function checkSuggestion(s: TaskSuggestion, tasks: readonly PlannedTask[]): string | null {
  const note = s.note.trim();
  if (!note) return "Say why — it's what the company decides on.";
  if (note.length > SUGGESTION_NOTE_MAX) return `Keep the reason under ${SUGGESTION_NOTE_MAX} characters.`;
  if (s.kind === "add") {
    if (!s.title.trim()) return "Name the task you'd add.";
    if (s.title.trim().length > SUGGESTION_TITLE_MAX) return `Keep the name under ${SUGGESTION_TITLE_MAX} characters.`;
    return null;
  }
  const t = tasks[s.task];
  if (!t) return "That task isn't on the list any more.";
  if (s.kind === "change") {
    const title = s.title?.trim();
    if (title && title.length > SUGGESTION_TITLE_MAX) return `Keep the name under ${SUGGESTION_TITLE_MAX} characters.`;
    const renamed = !!title && title !== t.title;
    const moved = s.week !== undefined && s.week !== t.week;
    if (!renamed && !moved) return "Change its name or its week — or suggest removing it.";
  }
  return null;
}

/** One line saying what's suggested: "Move “Take over inbox triage” to Week 2". */
export function describeSuggestion(s: TaskSuggestion): string {
  if (s.kind === "add") return `Add “${s.title.trim()}”${s.week ? ` in ${weekLabel(s.week)}` : ""}`;
  if (s.kind === "remove") return `Remove “${s.was}”`;
  const title = s.title?.trim();
  const parts = [title && title !== s.was ? `rename it “${title}”` : null, s.week ? `move it to ${weekLabel(s.week)}` : null].filter(Boolean);
  return `“${s.was}”: ${parts.join(" and ")}`;
}

/**
 * The tasks with the accepted suggestions applied — what the offer starts from. A suggestion finds
 * its task by position, and by name if the list has moved since; one whose task has gone is skipped.
 */
export function applySuggestions(tasks: readonly PlannedTask[], suggestions: readonly TaskSuggestion[] | undefined, decisions: Readonly<Record<string, SuggestionDecision>> | undefined): PlannedTask[] {
  const accepted = (suggestions ?? []).filter((s) => decisions?.[s.id] === "accepted");
  if (!accepted.length) return [...tasks];
  const find = (s: { task: number; was: string }) => (tasks[s.task]?.title === s.was ? s.task : tasks.findIndex((t) => t.title === s.was));
  const removed = new Set<number>();
  const changed = new Map<number, Partial<PlannedTask>>();
  for (const s of accepted) {
    if (s.kind === "add") continue;
    const i = find(s);
    if (i < 0) continue;
    if (s.kind === "remove") removed.add(i);
    else changed.set(i, { ...changed.get(i), ...(s.title?.trim() ? { title: s.title.trim() } : {}), ...(s.week !== undefined ? { week: s.week } : {}) });
  }
  const kept = tasks.flatMap((t, i) => (removed.has(i) ? [] : [{ ...t, ...changed.get(i) }]));
  const added = accepted.flatMap((s) => (s.kind === "add" ? [{ title: s.title.trim(), ...(s.week ? { week: s.week } : {}) }] : []));
  return [...kept, ...added];
}
