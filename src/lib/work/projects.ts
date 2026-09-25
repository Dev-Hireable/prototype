import { isArchived, isCompleted, type WorkItem, type WorkProject } from "./model";

/**
 * Projects on a full-time or part-time contract (TB-148). The Team Builder makes every project —
 * none comes built in, so a routine list is one they add ("Day-to-day" is a fine name). Work that
 * isn't in a project is "No project", and that only shows as a place while there's work in it.
 * While the contract is a trial there are no projects: the trial is one plan.
 *
 * When the trial becomes a role, the trial closes as a chapter of its own, "Trial": the work
 * finished before the role's first day. Whatever it left unfinished carries on outside a project,
 * so nothing is stranded in a chapter that's over.
 *
 * What the workspace opens on is the open work: work outside a project and the active projects. A
 * finished project leaves it, the trial is never in it, and work outside a project finished more
 * than RECENT_DONE_DAYS ago drops out too — nothing is deleted, "All work" still has it. That's
 * what keeps a role that runs for years from piling up.
 */

/** Where an item sits: a project's id, or one of these. */
export const NO_PROJECT = "none";
export const TRIAL = "trial";
export const NO_PROJECT_NAME = "No project";

/** What the workspace shows: the open work (the default), everything, or one place's key. */
export type Scope = string;
export const OPEN = "open";
export const ALL = "all";

/** How long finished work outside a project stays in the open work. */
export const RECENT_DONE_DAYS = 14;
const DAY_MS = 86_400_000;

export type ProjectCtx = {
  /** Projects are on: the contract isn't a trial (any more). */
  split: boolean;
  byId: ReadonlyMap<string, WorkProject>;
  /** The role's first day (ms, local midnight) — what closes the trial's chapter. */
  roleSince?: number;
};

export const projectCtx = (split: boolean, projects: readonly WorkProject[], roleSince?: number): ProjectCtx => ({ split, byId: new Map(projects.map((p) => [p.id, p])), roleSince });

/**
 * The trial's chapter: trial work finished before the role began (or before finishing was dated).
 * Trial work still open at the conversion, or finished after it, carries on outside a project.
 */
function inTrialChapter(t: Pick<WorkItem, "trial" | "status" | "completedAt">, ctx: ProjectCtx): boolean {
  if (!t.trial || !isCompleted(t.status)) return false;
  return t.completedAt === undefined || ctx.roleSince === undefined || t.completedAt < ctx.roleSince;
}

/** The key of the place an item sits. A project that's gone (it can't be, but data can lie) reads as no project. */
export function projectKeyOf(t: Pick<WorkItem, "project" | "trial" | "status" | "completedAt">, ctx: ProjectCtx): string {
  if (t.project && ctx.byId.has(t.project)) return t.project;
  return ctx.split && inTrialChapter(t, ctx) ? TRIAL : NO_PROJECT;
}

export type ProjectSummary = {
  key: string;
  name: string;
  kind: "project" | "none" | "trial";
  /** Out of the open work: a project marked finished, or the trial's chapter. */
  finished: boolean;
  /** A finished project put away: listed under Archived, not Finished. */
  archived: boolean;
  total: number;
  done: number;
  open: number;
  project?: WorkProject;
};

const tally = (xs: readonly WorkItem[]) => {
  const done = xs.filter((t) => isCompleted(t.status)).length;
  return { total: xs.length, done, open: xs.length - done };
};

/**
 * Every place work can sit, in the picker's order: no project, then the active projects (by their
 * order); then what's finished — the trial's chapter, and the finished projects, latest first; then
 * the archived projects. Archived items don't count. No project is always here, as a place work can
 * be moved to; the picker leaves it out while it's empty.
 */
export function summarize(items: readonly WorkItem[], projects: readonly WorkProject[], ctx: ProjectCtx): ProjectSummary[] {
  const live = items.filter((t) => !isArchived(t));
  const of = (key: string) => live.filter((t) => projectKeyOf(t, ctx) === key);
  const project = (p: WorkProject): ProjectSummary => ({ key: p.id, name: p.name, kind: "project", finished: p.status === "done", archived: p.status === "done" && p.archivedAt !== undefined, project: p, ...tally(of(p.id)) });
  const active = projects.filter((p) => p.status === "active").sort((a, b) => a.order - b.order).map(project);
  const done = projects.filter((p) => p.status === "done").sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)).map(project);
  const none: ProjectSummary = { key: NO_PROJECT, name: NO_PROJECT_NAME, kind: "none", finished: false, archived: false, ...tally(of(NO_PROJECT)) };
  const trialItems = ctx.split ? of(TRIAL) : [];
  const trial: ProjectSummary[] = trialItems.length ? [{ key: TRIAL, name: "Trial", kind: "trial", finished: true, archived: false, ...tally(trialItems) }] : [];
  return [none, ...active, ...trial, ...done.filter((p) => !p.archived), ...done.filter((p) => p.archived)];
}

/** Whether an item is in what `scope` shows, at `now`. With projects off everything is. */
export function inScope(t: WorkItem, scope: Scope, ctx: ProjectCtx & { now: number }): boolean {
  if (!ctx.split || scope === ALL) return true;
  const key = projectKeyOf(t, ctx);
  if (scope !== OPEN) return key === scope;
  if (key === TRIAL) return false;
  if (key !== NO_PROJECT) return ctx.byId.get(key)?.status === "active";
  if (!isCompleted(t.status)) return true;
  // Finished work outside a project stays a while, so the week's progress shows, then drops out.
  return t.completedAt !== undefined && ctx.now - t.completedAt <= RECENT_DONE_DAYS * DAY_MS;
}

/** A scope as the picker names it. */
export function scopeLabel(scope: Scope, summaries: readonly ProjectSummary[]): string {
  if (scope === OPEN) return "Open work";
  if (scope === ALL) return "All work";
  return summaries.find((s) => s.key === scope)?.name ?? "Open work";
}

/** Where a move lands, as a sentence ends: "out of its project", "to the trial", "to “Brand refresh”". */
export const movedTo = (p: Pick<ProjectSummary, "kind" | "name"> | undefined) => (!p || p.kind === "none" ? "out of its project" : p.kind === "trial" ? "to the trial" : `to “${p.name}”`);

/** A scope the URL asked for that doesn't exist (a project id from another contract) reads as the open work. */
export const knownScope = (scope: string | null, summaries: readonly ProjectSummary[]): Scope => (scope === ALL || (scope && summaries.some((s) => s.key === scope)) ? (scope as Scope) : OPEN);
