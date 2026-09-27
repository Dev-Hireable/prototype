"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import type { ProjectCtx, ProjectSummary, Scope } from "@/lib/work/projects";
import { useSearchParams } from "next/navigation";
import type { DraftStart } from "@/components/agreement/draft";
import type { TaskPeople } from "@/components/portal/tasks/task-bits";
import type { Day } from "@/lib/work/dates";
import type { AssigneeKey } from "@/lib/work/model";
import type { Actor, Names, WorkAccess } from "@/lib/work/permissions";
import { DEFAULT_SORT_DIR, parseQuery, serializeQuery, type WorkQuery } from "@/lib/work/query";
import type { WorkActions } from "@/lib/work/store";
import { writeParams } from "@/lib/portal/query-state";

/**
 * What every part of the workspace needs and rarely changes: who is looking, what they may do, the
 * actions, and a way to open an item. Cards, rows and menus read it from here rather than through
 * every view's props; the work list itself goes down as props, so a change to one item doesn't
 * re-render every memoised card through the context.
 */
export type WorkspaceEnv = {
  actor: Actor;
  names: Names;
  people: TaskPeople;
  access: WorkAccess;
  actions: WorkActions;
  today: Day;
  canCreate: boolean;
  canReorder: boolean;
  /** Opens an item's panel; `focus` puts the cursor where the reason for opening is. */
  openTask: (id: string, focus?: DetailFocus) => void;
  assigneeLabel: (k: AssigneeKey) => string;
  /** Colours chosen for tags on this contract; a tag's own is tagColorOf(tag, tagColors). */
  tagColors: Readonly<Record<string, string>>;
  /** TB-148 — the role's projects: where each item sits, every place work can sit, and which one is showing. */
  projects: WorkspaceProjects;
  /** On a trial: the Team Builder adds internal items of their own — kept apart from Add task, which a trial doesn't have. */
  canAddInternal: boolean;
  /** The contract's agreement, as the work sees it: amendments, and the contract tasks they'd change. */
  agreement: WorkspaceAgreement;
};

/** What the work needs of the agreement (@/lib/work/scope). */
export type WorkspaceAgreement = {
  /** Contract tasks the open amendment would change or remove, by id. */
  pending: ReadonlyMap<string, "change" | "remove">;
  /** The open amendment's number and who it waits on, for the banner. */
  open: { number: number; by: "team" | "independent"; byName: string; waiting: boolean } | null;
  /** Why this person can't propose a change right now, or null when they can. */
  blocked: string | null;
  /** Opens the amendment builder — on a task's change, or with a removal already in it. The task's sheet closes first. */
  propose: (start?: DraftStart) => void;
};

export type WorkspaceProjects = {
  /** Projects are on (the contract isn't a trial), and how to read an item's place. */
  ctx: ProjectCtx;
  /** Every place work can sit, in the picker's order, with its progress. */
  places: readonly ProjectSummary[];
  /** What the workspace is showing: "open", "all" or a place's key. */
  scope: Scope;
  /** The Team Builder can add, rename and finish projects, and move work between them. */
  canPlan: boolean;
  /**
   * Cards and rows say which project they're in: the view mixes places (Open work, All work) and
   * isn't already grouped by project.
   */
  showPlace: boolean;
};

/** Where an opened item starts. `comments` comes from a comment's notification (`?focus=comments`). */
export type DetailFocus = "changes" | "dates" | "title" | "comments";

const Ctx = createContext<WorkspaceEnv | null>(null);
export const WorkspaceProvider = Ctx.Provider;

/** The workspace, or null outside one — for small pieces (a tag chip) that also render elsewhere. */
export function useOptionalWorkspace(): WorkspaceEnv | null {
  return useContext(Ctx);
}

export function useWorkspace(): WorkspaceEnv {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkspace is only available inside ProjectWorkspace.");
  return v;
}

/**
 * The workspace's view, filters, sort and grouping, read from the URL and written back to it.
 * Switching views adds a history entry, so Back returns to the view (and the filters) you came
 * from; everything else replaces the current entry. Anything the URL holds that isn't valid reads
 * as the default.
 */
export function useWorkspaceQuery(): [WorkQuery, (patch: Partial<WorkQuery>) => void] {
  const search = useSearchParams().toString();
  const query = useMemo(() => parseQuery(new URLSearchParams(search)), [search]);
  const set = useCallback((patch: Partial<WorkQuery>) => {
    // From the address bar as it is now, not the last render — two quick changes both land.
    const current = parseQuery(new URLSearchParams(window.location.search));
    const next: WorkQuery = { ...current, ...patch };
    if (patch.sort && patch.dir === undefined) next.dir = DEFAULT_SORT_DIR[patch.sort];
    writeParams(serializeQuery(next), { push: patch.view !== undefined && patch.view !== current.view });
  }, []);
  return [query, set];
}
