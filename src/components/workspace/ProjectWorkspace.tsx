"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ICONS, type IconName } from "@/components/admin/icons";
import { Button, InfoBanner, Toast } from "@/components/independent/ui";
import { firstName, type TaskPeople } from "@/components/portal/tasks/task-bits";
import { ViewTabsList } from "@/components/portal/ViewSwitch";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { writeParams } from "@/lib/portal/query-state";
import { todayDay } from "@/lib/work/dates";
import { countsOf, isArchived, type AssigneeKey, type WorkItem } from "@/lib/work/model";
import { canCreate, canPlanProjects, canReorder, readOnlyReason, type Actor } from "@/lib/work/permissions";
import { ALL, inScope, knownScope, NO_PROJECT, OPEN, projectCtx, projectKeyOf, summarize } from "@/lib/work/projects";
import { activeFilterCount, applyFilters, EMPTY_FILTERS, groupItems, sortItems, VIEW_LABEL, VIEWS, type ViewKey } from "@/lib/work/query";
import { onWorkMessage, useWork, useWorkActions, type WorkMessage } from "@/lib/work/store";
import { BoardView } from "./BoardView";
import { CalendarView } from "./CalendarView";
import { useWorkspaceQuery, WorkspaceProvider, type DetailFocus, type WorkspaceEnv } from "./context";
import { ListView } from "./ListView";
import { assigneeLabel as labelOf, StatDot, SummaryStat } from "./meta";
import { NewTaskDialog } from "./NewTaskDialog";
import { ProjectPicker } from "./ProjectPicker";
import { CorruptWork, MissingContract, NoMatches, NoWork, ViewBoundary, WorkspaceSkeleton } from "./states";
import { TaskDetail } from "./TaskDetail";
import { TimelineView } from "./TimelineView";
import { FilterChips, Toolbar } from "./Toolbar";
import { focusItem, useWidth } from "./util";
import { WorkloadView } from "./WorkloadView";

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
export function ProjectWorkspace({
  actor,
  people,
  context,
  closedNote,
}: {
  actor: Actor;
  people: TaskPeople;
  /** The page's own facts for the summary line: "Day 12 of 30", "Trial Fit Score 82%". */
  context?: ReactNode;
  /** Said when the contract takes no new work (a trial that's over, an ended contract). */
  closedNote?: string;
}) {
  const work = useWork();
  // Kept stable by value, so a page can pass a fresh object on every render.
  const teamName = people.team.name;
  const teamAvatar = people.team.avatar;
  const indName = people.independent.name;
  const indAvatar = people.independent.avatar;
  const who2 = useMemo(() => ({ team: { name: teamName, avatar: teamAvatar }, independent: { name: indName, avatar: indAvatar } }), [teamName, teamAvatar, indName, indAvatar]);
  const names = useMemo(() => ({ team: firstName(teamName), independent: firstName(indName) }), [teamName, indName]);
  const { role, name } = actor;
  const who = useMemo(() => ({ role, name }), [role, name]);
  const actions = useWorkActions(who, names);
  const [query, setQuery] = useWorkspaceQuery();
  const params = useSearchParams();
  const taskId = params.get("task");
  const [picked, setFocus] = useState<DetailFocus | undefined>();
  // A comment's notification opens its item on the comments.
  const focus = picked ?? (params.get("focus") === "comments" ? "comments" : undefined);
  const [adding, setAdding] = useState(false);
  const [rootRef, width] = useWidth<HTMLDivElement>();
  const today = useMemo(() => todayDay(), []);

  // One access object per state of the contract, so a save elsewhere doesn't re-render every card.
  const accessKey = JSON.stringify(work.access);
  const access = useMemo(() => work.access, [accessKey]); // oxlint-disable-line react-hooks/exhaustive-deps

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

  const assigneeLabel = useCallback((k: AssigneeKey) => labelOf(k, who2), [who2]);

  /*
   * TB-148 — a role's work sits in the projects the Team Builder makes (or none); the workspace opens on the
   * open work, so finished projects and the trial's chapter leave the board. A trial has no
   * projects: it shows everything, as before.
   */
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
  const closedPlaceNote = !shownPlace?.finished ? null : shownPlace.kind === "trial" ? "The trial is over. Its work stays as it was finished, for the record." : `“${shownPlace.name}” is ${shownPlace.archived ? "archived" : "finished"}, so its work is read-only.${canPlan ? " Reopen it to change anything." : ""}`;
  // Kept by value, like `access`: every save re-reads the contract, and a new-but-equal map would re-render every card.
  const tagKey = JSON.stringify(work.tagColors);
  const tagColors = useMemo(() => work.tagColors, [tagKey]); // oxlint-disable-line react-hooks/exhaustive-deps
  const env = useMemo<WorkspaceEnv>(
    () => ({ actor: who, names, people: who2, access, actions, today, canCreate: canCreate(who, access) && !closedPlace, canReorder: canReorder(who, access) && !closedPlace, openTask, assigneeLabel, tagColors, projects }),
    [who, names, who2, access, actions, today, openTask, assigneeLabel, tagColors, projects, closedPlace],
  );

  // The E2E build puts this portal's repository on window.__hireable. The check is written out
  // here, not imported, so the bundler sees a constant and leaves the seam out of every other build.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_E2E !== "1") return;
    void import("@/lib/work/e2e-seam").then((m) => m.installSeam(actions.repo));
  }, [actions.repo]);

  // What the actions have to say: a toast for what matters, and every outcome read out.
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
  const open = taskId ? work.byId.get(taskId) : undefined;
  /** The item on screen, kept while the sheet slides out so it doesn't empty mid-animation. */
  const [shown, setShown] = useState(open);
  if (open && open !== shown) setShown(open);
  const readOnly = readOnlyReason(who, access);
  const filtersOn = activeFilterCount(query) > 0;
  const clearFilters = () => setQuery({ ...EMPTY_FILTERS, q: "" });

  if (work.status === "loading") return <WorkspaceSkeleton view={query.view} />;
  if (work.status === "corrupt") return <CorruptWork />;
  if (work.status === "missing") return <MissingContract />;

  const nothing = live$.length === 0 && !query.archived;
  let view: ReactNode;
  if (nothing) view = <NoWork role={who.role} team={names.team} onAdd={env.canCreate ? () => setAdding(true) : undefined} />;
  else if (sorted.length === 0 && (filtersOn || query.archived) && query.view !== "calendar" && query.view !== "workload") view = <NoMatches onClear={clearFilters} archived={query.archived} />;
  else if (split && scope !== ALL && scopedLive.length === 0 && query.view !== "calendar" && query.view !== "workload") view = <EmptyScope name={places.find((p) => p.key === scope)?.name} unfiled={scope === NO_PROJECT} onAdd={env.canCreate && !places.find((p) => p.key === scope)?.finished ? () => setAdding(true) : undefined} />;
  else if (query.view === "board") view = <BoardView groups={groups} byId={work.byId} query={query} pendingIds={work.pendingIds} />;
  else if (query.view === "list") view = <ListView groups={groups} byId={work.byId} query={query} setQuery={setQuery} pendingIds={work.pendingIds} />;
  else if (query.view === "calendar") view = <CalendarView items={sorted} query={query} setQuery={setQuery} narrow={width > 0 && width < 640} />;
  else if (query.view === "timeline") view = <TimelineView groups={groups} byId={work.byId} query={query} setQuery={setQuery} />;
  else view = <WorkloadView items={sorted} query={query} setQuery={setQuery} />;

  return (
    <WorkspaceProvider value={env}>
      <div ref={rootRef} className="flex min-h-0 min-w-0 flex-1 flex-col" data-testid="workspace" data-view={query.view} data-role={who.role}>
        <Tabs value={query.view} onValueChange={(v) => setQuery({ view: v as ViewKey })} className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="flex shrink-0 flex-col gap-3 border-b border-border px-[var(--ws-gutter,1rem)] pt-1 pb-3">
            {/* The contract's figures, then the list's, a hairline between each. */}
            <p className="flex flex-wrap items-center gap-y-1 text-[13px] leading-[1.4] text-ink-2 [&>*]:border-l [&>*]:border-border [&>*]:px-3 [&>*:first-child]:border-l-0 [&>*:first-child]:pl-0" aria-label="Summary">
              {context}
              {counts.total === 0 ? (
                <SummaryStat>{split && scope !== ALL ? "Nothing open here" : "Nothing on the list yet"}</SummaryStat>
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
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {split && <ProjectPicker setQuery={setQuery} />}
              <ViewTabsList options={VIEW_OPTIONS} />
              <span className="flex-1" />
              {inReview.length > 0 && who.role === "manager" && access.reviewOpen && (
                <Button size="md" onClick={() => openTask(inReview[0].id)}>
                  Review {inReview.length === 1 ? "1 item" : `${inReview.length} items`}
                </Button>
              )}
              {env.canCreate && (
                <Button size="md" variant="primary" onClick={() => setAdding(true)}>
                  <ICONS.add size={18} aria-hidden /> Add task
                </Button>
              )}
            </div>
            <Toolbar
              query={query}
              setQuery={setQuery}
              assigneeLabel={assigneeLabel}
              tags={tags}
              shown={sorted.length}
              total={total}
              groupable={groupable}
              projects={split}
              sortable={query.view !== "workload" && query.view !== "calendar"}
            />
            <FilterChips query={query} setQuery={setQuery} assigneeLabel={assigneeLabel} />
          </div>
          {(readOnly || (!access.open && closedNote) || closedPlaceNote) && (
            <div className="shrink-0 px-[var(--ws-gutter,1rem)] pt-3">
              <InfoBanner>{readOnly ?? (!access.open && closedNote ? closedNote : closedPlaceNote)}</InfoBanner>
            </div>
          )}
          {taskId && !open && (
            <div className="shrink-0 px-[var(--ws-gutter,1rem)] pt-3" role="alert">
              {/* As wide as its message, with Dismiss beside it — full width left a one-line note stranded at one end and its action at the other. */}
              <InfoBanner tone="warn" className="w-fit max-w-full rounded-lg">
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  That item doesn't exist any more.
                  <button type="button" onClick={closeTask} className="font-semibold underline">
                    Dismiss
                  </button>
                </span>
              </InfoBanner>
            </div>
          )}
          <TabsContent value={query.view} className="flex min-h-0 min-w-0 flex-1 flex-col text-[14px]">
            <ViewBoundary key={query.view} label={VIEW_LABEL[query.view].toLowerCase()}>
              {view}
            </ViewBoundary>
          </TabsContent>
        </Tabs>
        {shown && <TaskDetail key={shown.id} open={!!open} item={work.byId.get(shown.id) ?? shown} items={pool} byId={work.byId} focus={focus} pending={work.pendingIds.has(shown.id)} onClose={closeTask} />}
        {env.canCreate && <NewTaskDialog open={adding} onClose={() => setAdding(false)} />}
        <Toast message={toast?.message ?? null} tone={toast?.tone} action={toast?.action ? { label: toast.action.label, onClick: toast.action.run } : undefined} onClose={closeToast} />
        {/* Stays audible while an item's sheet is open: the modal hides the page but keeps [aria-live]. */}
        <p aria-live="polite" className="sr-only" data-testid="announcer">
          {live}
        </p>
      </div>
    </WorkspaceProvider>
  );
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
