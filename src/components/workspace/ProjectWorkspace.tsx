"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ICONS, type IconName } from "@/components/admin/icons";
import { Button, InfoBanner, Toast } from "@/components/independent/ui";
import type { TaskPeople } from "@/components/portal/tasks/task-bits";
import { ViewTabsList } from "@/components/portal/ViewSwitch";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { writeParams } from "@/lib/portal/query-state";
import { todayDay, type Day } from "@/lib/work/dates";
import { countsOf, isArchived, type AssigneeKey, type WorkItem } from "@/lib/work/model";
import { canCreate, canPlanProjects, canReorder, readOnlyReason, type Actor, type WorkAccess } from "@/lib/work/permissions";
import { ALL, inScope, knownScope, NO_PROJECT, OPEN, projectCtx, projectKeyOf, summarize, type ProjectSummary, type Scope } from "@/lib/work/projects";
import { activeFilterCount, applyFilters, EMPTY_FILTERS, groupItems, sortItems, VIEW_LABEL, VIEWS, type Group, type ViewKey, type WorkQuery } from "@/lib/work/query";
import { onWorkMessage, useWork, useWorkActions, type WorkActions, type WorkMessage, type WorkSnapshot } from "@/lib/work/store";
import { BoardView } from "./BoardView";
import { CalendarView } from "./CalendarView";
import { useWorkspace, useWorkspaceQuery, WorkspaceProvider, type DetailFocus, type WorkspaceEnv } from "./context";
import { ListView } from "./ListView";
import { StatDot, SummaryStat } from "./meta";
import { NewTaskDialog } from "./NewTaskDialog";
import { ProjectPicker } from "./ProjectPicker";
import { CorruptWork, MissingContract, NoMatches, NoWork, ViewBoundary, WorkspaceSkeleton } from "./states";
import { TaskDetail } from "./TaskDetail";
import { TimelineView } from "./TimelineView";
import { FilterChips, Toolbar } from "./Toolbar";
import { focusItem, useWidth } from "./util";
import { WorkloadView } from "./WorkloadView";
import { firstName, assigneeLabel as labelOf } from "@/components/workspace/labels";

const VIEW_ICON: Record<ViewKey, IconName> = { board: "viewBoard", list: "viewList", calendar: "viewCalendar", timeline: "viewTimeline", workload: "viewWorkload" };
const VIEW_OPTIONS = VIEWS.map((v) => ({ value: v, label: VIEW_LABEL[v], icon: VIEW_ICON[v] }));

/**
 * The contract's work, full width: Board, List, Calendar, Timeline and Workload over one list of
 * work items, with one toolbar (search, filters, sort, grouping) that every view shares and the URL
 * keeps. It's the same component in all three portals — the Team Builder (who plans and reviews),
 * the Independent (who does the work) and Hireable admin (read-only); what each can change comes
 * from the permission rules, which the repository enforces again on every save.
 *
 * It takes no task data: it reads the saved contract itself (useWork), so no page can hand it a
 * stale copy, and it doesn't use either portal's store, so admin can render it too.
 */
export function ProjectWorkspace({ actor, people, context, closedNote }: WorkspaceProps) {
  const work = useWork();
  const [query, setQuery] = useWorkspaceQuery();
  const { taskId, focus, open, shown, openTask, closeTask } = useOpenTask(work.byId);
  const [adding, setAdding] = useState(false);
  const [rootRef, width] = useWidth<HTMLDivElement>();
  const { env, projectScope } = useWorkspaceEnv(actor, people, work, query, openTask);
  const { split, scope, closedPlaceNote } = projectScope;
  useE2ESeam(env.actions.repo);
  const { toast, closeToast, live } = useWorkMessages();
  const list = useWorkList(work, query, env.today, env.assigneeLabel, projectScope);
  const clearFilters = () => setQuery({ ...EMPTY_FILTERS, q: "" });

  if (work.status === "loading") return <WorkspaceSkeleton view={query.view} />;
  if (work.status === "corrupt") return <CorruptWork />;
  if (work.status === "missing") return <MissingContract />;

  const empty = emptyStateOf(list, query, split, scope);
  return (
    <WorkspaceProvider value={env}>
      <div ref={rootRef} className="flex min-h-0 min-w-0 flex-1 flex-col" data-testid="workspace" data-view={query.view} data-role={env.actor.role}>
        <Tabs value={query.view} onValueChange={(v) => setQuery({ view: v as ViewKey })} className="flex min-h-0 flex-1 flex-col gap-0">
          <WorkspaceHead context={context} list={list} split={split} scope={scope} query={query} setQuery={setQuery} onAdd={() => setAdding(true)} />
          <ReadOnlyNote closedNote={closedNote} closedPlaceNote={closedPlaceNote} />
          {taskId && !open && <MissingItemNote onDismiss={closeTask} />}
          <TabsContent value={query.view} className="flex min-h-0 min-w-0 flex-1 flex-col text-[14px]">
            <ViewBoundary key={query.view} label={VIEW_LABEL[query.view].toLowerCase()}>
              {empty ? (
                <EmptyWork kind={empty} archived={query.archived} onAdd={() => setAdding(true)} onClear={clearFilters} />
              ) : (
                <CurrentView query={query} setQuery={setQuery} groups={list.groups} sorted={list.sorted} byId={work.byId} pendingIds={work.pendingIds} width={width} />
              )}
            </ViewBoundary>
          </TabsContent>
        </Tabs>
        <ItemSheet shown={shown} open={!!open} work={work} focus={focus} onClose={closeTask} />
        {env.canCreate && <NewTaskDialog open={adding} onClose={() => setAdding(false)} />}
        <WorkToast toast={toast} onClose={closeToast} />
        {/* Stays audible while an item's sheet is open: the modal hides the page but keeps [aria-live]. */}
        <p aria-live="polite" className="sr-only" data-testid="announcer">
          {live}
        </p>
      </div>
    </WorkspaceProvider>
  );
}

type WorkspaceProps = {
  actor: Actor;
  people: TaskPeople;
  /** The page's own facts for the summary line: "Day 12 of 30", "Trial Fit Score 82%". */
  context?: ReactNode;
  /** Said when the contract takes no new work (a trial that's over, an ended contract). */
  closedNote?: string;
};

/**
 * What every part of the workspace reads from it (WorkspaceEnv) — who is looking and what they may
 * do, the actions, the projects showing — and the projects' scope for the list. Each part is kept
 * stable by value, so a page's fresh objects, or a save elsewhere, don't re-render every card.
 */
function useWorkspaceEnv(actor: Actor, people: TaskPeople, work: WorkSnapshot, query: WorkQuery, openTask: WorkspaceEnv["openTask"]) {
  const { who2, names } = usePeople(people);
  const { role, name } = actor;
  const who = useMemo(() => ({ role, name }), [role, name]);
  const actions = useWorkActions(who, names);
  const today = useMemo(() => todayDay(), []);
  // One access object per state of the contract, so a save elsewhere doesn't re-render every card.
  const access = useByValue(work.access);
  const assigneeLabel = useCallback((k: AssigneeKey) => labelOf(k, who2), [who2]);
  const projectScope = useProjectScope(work, access, query, who);
  const { projects, closedPlace } = projectScope;
  // Kept by value, like `access`: every save re-reads the contract, and a new-but-equal map would re-render every card.
  const tagColors = useByValue(work.tagColors);
  const env = useMemo<WorkspaceEnv>(
    () => ({ actor: who, names, people: who2, access, actions, today, canCreate: canCreate(who, access) && !closedPlace, canReorder: canReorder(who, access) && !closedPlace, openTask, assigneeLabel, tagColors, projects }),
    [who, names, who2, access, actions, today, openTask, assigneeLabel, tagColors, projects, closedPlace],
  );
  return { env, projectScope };
}

/** The two people as the workspace shows them, and their first names. */
function usePeople(people: TaskPeople) {
  // Kept stable by value, so a page can pass a fresh object on every render.
  const teamName = people.team.name;
  const teamAvatar = people.team.avatar;
  const indName = people.independent.name;
  const indAvatar = people.independent.avatar;
  const who2 = useMemo(() => ({ team: { name: teamName, avatar: teamAvatar }, independent: { name: indName, avatar: indAvatar } }), [teamName, teamAvatar, indName, indAvatar]);
  const names = useMemo(() => ({ team: firstName(teamName), independent: firstName(indName) }), [teamName, indName]);
  return { who2, names };
}

/** `value`, as the same object for as long as what's in it stays the same. */
function useByValue<T>(value: T): T {
  const key = JSON.stringify(value);
  return useMemo(() => value, [key]); // oxlint-disable-line react-hooks/exhaustive-deps
}

/** The test seam: the repository these actions save through, for the E2E suite to reach. */
function useE2ESeam(repo: WorkActions["repo"]) {
  // The E2E build puts this portal's repository on window.__hireable. The check is written out
  // here, not imported, so the bundler sees a constant and leaves the seam out of every other build.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_E2E !== "1") return;
    void import("@/lib/work/e2e-seam").then((m) => m.installSeam(repo));
  }, [repo]);
}

/** Above the view: the summary line, the place picker and view tabs, the toolbar, and the filters that are on. */
function WorkspaceHead({ context, list, split, scope, query, setQuery, onAdd }: { context?: ReactNode; list: WorkList; split: boolean; scope: Scope; query: WorkQuery; setQuery: (p: Partial<WorkQuery>) => void; onAdd: () => void }) {
  const { assigneeLabel } = useWorkspace();
  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-border px-[var(--ws-gutter,1rem)] pt-1 pb-3">
      <SummaryLine context={context} counts={list.counts} split={split} scope={scope} />
      <ViewBar split={split} setQuery={setQuery} inReview={list.inReview} onAdd={onAdd} />
      <Toolbar
        query={query}
        setQuery={setQuery}
        assigneeLabel={assigneeLabel}
        tags={list.tags}
        shown={list.sorted.length}
        total={list.total}
        groupable={list.groupable}
        projects={split}
        sortable={query.view !== "workload" && query.view !== "calendar"}
      />
      <FilterChips query={query} setQuery={setQuery} assigneeLabel={assigneeLabel} />
    </div>
  );
}

/**
 * The item the URL opens (`?task=`, and `?focus=comments` from a comment's notification), and the
 * ways to open and close one: both write the URL, and closing puts the focus back on the item.
 */
function useOpenTask(byId: ReadonlyMap<string, WorkItem>) {
  const params = useSearchParams();
  const taskId = params.get("task");
  const [picked, setFocus] = useState<DetailFocus | undefined>();
  // A comment's notification opens its item on the comments.
  const focus = picked ?? (params.get("focus") === "comments" ? "comments" : undefined);
  const openTask = useCallback((id: string, f?: DetailFocus) => {
    setFocus(f);
    writeParams({ task: id, focus: null });
  }, []);
  const closeTask = useCallback(() => {
    const id = new URLSearchParams(window.location.search).get("task");
    setFocus(undefined);
    writeParams({ task: null, focus: null });
    if (id) focusItem(id);
  }, []);
  const open = taskId ? byId.get(taskId) : undefined;
  /** The item on screen, kept while the sheet slides out so it doesn't empty mid-animation. */
  const [shown, setShown] = useState(open);
  if (open && open !== shown) setShown(open);
  return { taskId, focus, open, shown, openTask, closeTask };
}

/**
 * TB-148 — a role's work sits in the projects the Team Builder makes (or none); the workspace opens on the
 * open work, so finished projects and the trial's chapter leave the board. A trial has no
 * projects: it shows everything, as before.
 */
function useProjectScope(work: WorkSnapshot, access: WorkAccess, query: WorkQuery, who: Actor) {
  const pool = work.items;
  const split = !access.trial;
  /** The role's first day, local midnight — the trial's chapter is what was finished before it. */
  const roleSince = access.roleSince ? new Date(`${access.roleSince}T00:00:00`).getTime() : undefined;
  const pctx = useMemo(() => projectCtx(split, work.projects, roleSince), [split, work.projects, roleSince]);
  const places = useMemo(() => summarize(pool, work.projects, pctx), [pool, work.projects, pctx]);
  const scope = split ? knownScope(query.project, places) : ALL;
  const [now] = useState(() => Date.now());
  const scoped = useMemo(() => (split ? pool.filter((t) => inScope(t, scope, { ...pctx, now })) : pool), [split, pool, scope, pctx, now]);
  const keyOf = useCallback((t: WorkItem) => projectKeyOf(t, pctx), [pctx]);
  const canPlan = canPlanProjects(who, access);
  const showPlace = split && (scope === OPEN || scope === ALL) && query.group !== "project" && places.some((p) => p.kind !== "none" && p.total > 0);
  const projects = useMemo(() => ({ ctx: pctx, places, scope, canPlan, showPlace }), [pctx, places, scope, canPlan, showPlace]);
  /**
   * TB-148 — the place showing is finished work: the trial's chapter, or a finished (or archived)
   * project. It's read-only — nothing is added here (a task used to be filed outside any project
   * instead), and the banner says why.
   */
  const shownPlace = split ? places.find((p) => p.key === scope) : undefined;
  const closedPlace = !!shownPlace?.finished;
  const closedPlaceNote = closedPlaceNoteOf(shownPlace, canPlan);
  return { split, places, scope, scoped, keyOf, projects, closedPlace, closedPlaceNote };
}

type ProjectScope = ReturnType<typeof useProjectScope>;

/** The banner's words while finished work is showing — the trial's chapter, or a finished or archived project — else nothing. */
function closedPlaceNoteOf(shownPlace: ProjectSummary | undefined, canPlan: boolean): string | null {
  return !shownPlace?.finished ? null : shownPlace.kind === "trial" ? "The trial is over. Its work stays as it was finished, for the record." : `“${shownPlace.name}” is ${shownPlace.archived ? "archived" : "finished"}, so its work is read-only.${canPlan ? " Reopen it to change anything." : ""}`;
}

/** What the actions have to say: a toast for what matters, and every outcome read out. */
function useWorkMessages() {
  const [toast, setToast] = useState<WorkMessage | null>(null);
  const closeToast = useCallback(() => setToast(null), []);
  const [live, setLive] = useState("");
  useEffect(
    () =>
      onWorkMessage((m) => {
        setLive(m.message);
        if (!m.quiet) setToast(m);
      }),
    [],
  );
  return { toast, closeToast, live };
}

/**
 * The work the views draw — what's in scope, filtered, sorted and (where the view groups) grouped
 * the way the toolbar says — and the figures the header shows.
 */
function useWorkList(work: WorkSnapshot, query: WorkQuery, today: Day, assigneeLabel: (k: AssigneeKey) => string, { split, places, scoped, keyOf }: ProjectScope) {
  const pool = work.items;
  const filtered = useMemo(() => applyFilters(scoped, query, { today, byId: work.byId }), [scoped, query, today, work.byId]);
  const sorted = useMemo(() => sortItems(filtered, query.sort, query.dir), [filtered, query.sort, query.dir]);
  const groupable = query.view === "board" || query.view === "list" || query.view === "timeline";
  const groups = useMemo(() => groupItems(sorted, groupable ? query.group : "none", { assignee: assigneeLabel, project: split ? { places, keyOf } : undefined }), [sorted, groupable, query.group, assigneeLabel, split, places, keyOf]);
  const live$ = useMemo(() => pool.filter((t) => !isArchived(t)), [pool]);
  /** What the summary counts: the work that's showing — the open work, or the project picked. */
  const counts = useMemo(() => countsOf(scoped, today), [scoped, today]);
  const scopedLive = useMemo(() => scoped.filter((t) => !isArchived(t)), [scoped]);
  const tags = useMemo(() => [...new Set(pool.flatMap((t) => t.tags))].sort(), [pool]);
  const total = query.archived ? scoped.filter(isArchived).length : scopedLive.length;
  const inReview = useMemo(() => live$.filter((t) => t.status === "review" && t.assignee === "independent"), [live$]);
  return { sorted, groupable, groups, live$, counts, scopedLive, tags, total, inReview };
}

type WorkList = ReturnType<typeof useWorkList>;

/** The empty states that can stand in for a view. */
type EmptyKind = "noWork" | "noMatches" | "emptyScope";

/**
 * Which empty state stands in for the view, if any: no work on the contract yet, nothing matching
 * the search or filters, or nothing in the place picked. Calendar and Workload keep their grid for
 * the last two.
 */
function emptyStateOf({ live$, sorted, scopedLive }: WorkList, query: WorkQuery, split: boolean, scope: Scope): EmptyKind | null {
  const nothing = live$.length === 0 && !query.archived;
  const filtersOn = activeFilterCount(query) > 0;
  if (nothing) return "noWork";
  if (sorted.length === 0 && (filtersOn || query.archived) && query.view !== "calendar" && query.view !== "workload") return "noMatches";
  if (split && scope !== ALL && scopedLive.length === 0 && query.view !== "calendar" && query.view !== "workload") return "emptyScope";
  return null;
}

/** The contract's figures, then the list's, a hairline between each. */
function SummaryLine({ context, counts, split, scope }: { context?: ReactNode; counts: WorkList["counts"]; split: boolean; scope: Scope }) {
  const { access } = useWorkspace();
  return (
    <p className="flex flex-wrap items-center gap-y-1 text-[13px] leading-[1.4] text-ink-2 [&>*]:border-l [&>*]:border-border [&>*]:px-3 [&>*:first-child]:border-l-0 [&>*:first-child]:pl-0" aria-label="Summary">
      {context}
      {counts.total === 0 ? (
        // A trial takes no new tasks, so an empty one isn't waiting on any.
        <SummaryStat>{split && scope !== ALL ? "Nothing open here" : access.trial ? "No trial tasks" : "Nothing on the list yet"}</SummaryStat>
      ) : (
        <SummaryStat
          mark={
            <span aria-hidden className="h-1.5 w-12 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-ok" style={{ width: `${(counts.done / counts.total) * 100}%` }} />
            </span>
          }
        >
          <b className="font-semibold text-ink">{counts.done}</b> of {counts.total} done
        </SummaryStat>
      )}
      {counts.review > 0 && (
        <SummaryStat mark={<StatDot className="bg-warn" />}>
          <b className="font-semibold text-ink">{counts.review}</b> in review
        </SummaryStat>
      )}
      {counts.overdue > 0 && (
        <SummaryStat mark={<StatDot className="bg-danger" />} tone="font-medium text-danger">
          {counts.overdue} overdue
        </SummaryStat>
      )}
    </p>
  );
}

/** The place picker and the view tabs; then, at the end, Review for work waiting on the Team Builder, and Add task. */
function ViewBar({ split, setQuery, inReview, onAdd }: { split: boolean; setQuery: (p: Partial<WorkQuery>) => void; inReview: WorkItem[]; onAdd: () => void }) {
  const env = useWorkspace();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {split && <ProjectPicker setQuery={setQuery} />}
      <ViewTabsList options={VIEW_OPTIONS} />
      <span className="flex-1" />
      {inReview.length > 0 && env.actor.role === "manager" && env.access.reviewOpen && (
        <Button size="md" onClick={() => env.openTask(inReview[0].id)}>
          Review {inReview.length === 1 ? "1 item" : `${inReview.length} items`}
        </Button>
      )}
      {env.canCreate && (
        <Button size="md" variant="primary" onClick={onAdd}>
          <ICONS.add size={18} aria-hidden /> Add task
        </Button>
      )}
    </div>
  );
}

/**
 * Why nothing here can be changed, when that's so: why this person can only read the work, the
 * page's note for a contract that takes no new work, or why the finished place showing is read-only.
 */
function ReadOnlyNote({ closedNote, closedPlaceNote }: { closedNote?: string; closedPlaceNote: string | null }) {
  const { actor, access } = useWorkspace();
  const readOnly = readOnlyReason(actor, access);
  if (!(readOnly || (!access.open && closedNote) || closedPlaceNote)) return null;
  return (
    <div className="shrink-0 px-[var(--ws-gutter,1rem)] pt-3">
      <InfoBanner>{readOnly ?? (!access.open && closedNote ? closedNote : closedPlaceNote)}</InfoBanner>
    </div>
  );
}

/** The URL names an item the contract doesn't have (any more): said, with Dismiss. */
function MissingItemNote({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="shrink-0 px-[var(--ws-gutter,1rem)] pt-3" role="alert">
      {/* As wide as its message, with Dismiss beside it — full width left a one-line note stranded at one end and its action at the other. */}
      <InfoBanner tone="warn" className="w-fit max-w-full rounded-lg">
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          That item doesn't exist any more.
          <button type="button" onClick={onDismiss} className="font-semibold underline">
            Dismiss
          </button>
        </span>
      </InfoBanner>
    </div>
  );
}

/** The empty state `kind` names, with its way out: Add task for whoever can add work, or Clear filters. */
function EmptyWork({ kind, archived, onAdd, onClear }: { kind: EmptyKind; archived: boolean; onAdd: () => void; onClear: () => void }) {
  const env = useWorkspace();
  if (kind === "noWork") return <NoWork role={env.actor.role} team={env.names.team} independent={env.names.independent} trial={env.access.trial} onAdd={env.canCreate ? onAdd : undefined} />;
  if (kind === "noMatches") return <NoMatches onClear={onClear} archived={archived} />;
  const { places, scope } = env.projects;
  const place = places.find((p) => p.key === scope);
  return <EmptyScope name={place?.name} unfiled={scope === NO_PROJECT} onAdd={env.canCreate && !place?.finished ? onAdd : undefined} />;
}

/** The view the tabs picked, over the work as the toolbar filters, sorts and groups it. */
function CurrentView({ query, setQuery, groups, sorted, byId, pendingIds, width }: { query: WorkQuery; setQuery: (p: Partial<WorkQuery>) => void; groups: Group[]; sorted: WorkItem[]; byId: ReadonlyMap<string, WorkItem>; pendingIds: ReadonlySet<string>; width: number }) {
  if (query.view === "board") return <BoardView groups={groups} byId={byId} query={query} pendingIds={pendingIds} />;
  if (query.view === "list") return <ListView groups={groups} byId={byId} query={query} setQuery={setQuery} pendingIds={pendingIds} />;
  if (query.view === "calendar") return <CalendarView items={sorted} query={query} setQuery={setQuery} narrow={width > 0 && width < 640} />;
  if (query.view === "timeline") return <TimelineView groups={groups} byId={byId} query={query} setQuery={setQuery} />;
  return <WorkloadView items={sorted} query={query} setQuery={setQuery} />;
}

/** The open item's sheet. While it slides out it keeps the item it showed — as the list has it now, while it's still there. */
function ItemSheet({ shown, open, work, focus, onClose }: { shown: WorkItem | undefined; open: boolean; work: WorkSnapshot; focus?: DetailFocus; onClose: () => void }) {
  if (!shown) return null;
  return <TaskDetail key={shown.id} open={open} item={work.byId.get(shown.id) ?? shown} items={work.items} byId={work.byId} focus={focus} pending={work.pendingIds.has(shown.id)} onClose={onClose} />;
}

/** The toast for what an action had to say, with its button when it offers one. */
function WorkToast({ toast, onClose }: { toast: WorkMessage | null; onClose: () => void }) {
  return <Toast toast={toast} action={toast?.action ? { label: toast.action.label, onClick: toast.action.run } : undefined} onClose={onClose} />;
}

/** A project with nothing in it yet, or the open work with nothing open — said plainly, with the way to add some. */
function EmptyScope({ name, unfiled = false, onAdd }: { name?: string; unfiled?: boolean; onAdd?: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <ICONS.project size={28} aria-hidden className="text-ink-2" />
      <p className="text-[15px] font-semibold text-ink">{name ? (unfiled ? "Everything is in a project" : `Nothing in “${name}” yet`) : "Nothing open right now"}</p>
      <p className="max-w-sm text-[13px] leading-[1.45] text-ink-2">{name ? (unfiled ? "Add a task here to keep it outside a project." : "Add a task here, or move work in from another project.") : "Everything open is done. Pick a project to see its work, or All work for everything."}</p>
      {onAdd && (
        <Button size="md" variant="primary" onClick={onAdd}>
          <ICONS.add size={18} aria-hidden /> Add task
        </Button>
      )}
    </div>
  );
}
