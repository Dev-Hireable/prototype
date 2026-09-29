"use client";

import { memo, useCallback, useMemo, useState, type KeyboardEvent } from "react";
import { ICONS } from "@/components/icons";
import { StatusCircle } from "@/components/portal/tasks/task-bits";
import { isArchived, isCompleted, openBlockers, progressOf, refOf, STATUS_META, type WorkItem } from "@/lib/work/model";
import { transitionFor } from "@/lib/work/permissions";
import { DEFAULT_SORT_DIR, type Group, type SortKey, type WorkQuery } from "@/lib/work/query";
import { useWorkspace, type WorkspaceEnv } from "./context";
import { AssigneeField, DateField, EffortField, PriorityField, StatusField, TypeField } from "./fields";
import { addToGroup, groupEffort, stepByKey, takesNewWork, useMenuModel } from "./group-actions";
import { ItemMenu, ItemMenuTrigger, useItemMenuHandle, type ItemMenuHandle } from "./item-menu";
import { itemData } from "./item-data";
import { BlockedChip, ChangesChip, GroupLabel, LockChip, PlaceChip, TagChip } from "./meta";
import { QuickAdd } from "./quick-add";
import { ago, useProgressive, useWidth } from "./util";
import { groupColors } from "./labels";

/**
 * The List: every item as a dense row — name, status, assignee, type, priority, dates, effort,
 * progress, last change — grouped the way the toolbar says, each group collapsible, with an add row
 * per group that inherits the group's value. Cells edit in place with the same editors the item's
 * panel uses. Column headers sort; the sort is the workspace's, so it carries to every view.
 */

type ColKey = "name" | "status" | "assignee" | "type" | "priority" | "start" | "due" | "effort" | "progress" | "updated";
type Col = { key: ColKey; label: string; width: number; sort?: SortKey };
const COLS: Col[] = [
  { key: "name", label: "Name", width: 280, sort: "name" },
  { key: "status", label: "Status", width: 136 },
  { key: "assignee", label: "Assignee", width: 140 },
  { key: "type", label: "Type", width: 128 },
  { key: "priority", label: "Priority", width: 104, sort: "priority" },
  { key: "start", label: "Start", width: 112, sort: "start" },
  { key: "due", label: "Due", width: 128, sort: "due" },
  { key: "effort", label: "Effort", width: 76, sort: "effort" },
  { key: "progress", label: "Progress", width: 100 },
  { key: "updated", label: "Updated", width: 112, sort: "updated" },
];
/**
 * What goes first when the list is narrower than its columns — a 14" laptop, a half-width window:
 * when it was last changed, then its subtasks' progress, then its start date. Every one is still in
 * the item's sheet. Past these it scrolls, the name pinned on the left.
 */
const DROP_ORDER: ColKey[] = ["updated", "progress", "start"];

/** The columns that fit `width` (0 while it's unmeasured: all of them). */
function visibleCols(width: number): Col[] {
  let cols = COLS;
  for (const key of DROP_ORDER) {
    if (!width || cols.reduce((n, c) => n + c.width, 0) <= width) break;
    cols = cols.filter((c) => c.key !== key);
  }
  return cols;
}

/** The keys of the columns showing. Kept by value, so the memoised rows re-render only when a column comes or goes. */
function useColumnSet(cols: readonly Col[]): ReadonlySet<ColKey> {
  const shownKey = cols.map((c) => c.key).join(",");
  return useMemo(() => new Set(shownKey.split(",") as ColKey[]), [shownKey]);
}

export function ListView({ groups, byId, query, setQuery, pendingIds }: { groups: Group[]; byId: ReadonlyMap<string, WorkItem>; query: WorkQuery; setQuery: (p: Partial<WorkQuery>) => void; pendingIds: ReadonlySet<string> }) {
  const env = useWorkspace();
  const { actions, canReorder } = env;
  const handle = useItemMenuHandle();
  const [collapsed, toggle] = useCollapsed();
  const reorderable = canReorder && query.sort === "manual" && !query.archived;
  const [frameRef, frameWidth] = useWidth<HTMLDivElement>();
  const cols = visibleCols(frameWidth);
  const tableWidth = cols.reduce((n, c) => n + c.width, 0);
  const shown = useColumnSet(cols);
  const single = groups.length === 1 && groups[0].value.field === "none";

  const onKeyMove = useCallback(
    (t: WorkItem, e: KeyboardEvent) => {
      if (!e.altKey || !e.shiftKey || !reorderable || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
      const g = groups.find((x) => x.items.some((y) => y.id === t.id));
      if (g) stepByKey(t, g.items, e, actions);
    },
    [groups, reorderable, actions],
  );

  const menuModel = useMenuModel(byId, groups, env, reorderable);
  const kit: RowKit = { byId, pendingIds, handle, onKeyMove, visible: shown };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-[var(--ws-gutter,1rem)] pt-3 pb-4">
      {/* The border is on this frame and the table scrolls inside it. On the scroller itself it was
          an outline, which the pinned header and name column paint over — so the edge came and went.
          The scroller is positioned so it holds the cells' screen-reader text (sr-only is absolute):
          with nothing positioned above it, a row below the fold stretched the page and it scrolled. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-white">
        <div ref={frameRef} className="relative min-h-0 flex-1 overflow-auto" data-testid="list">
          <table className="w-full table-fixed border-separate border-spacing-0 text-[13px] leading-[1.4]" style={{ minWidth: tableWidth }} aria-label="Work items">
            <colgroup>
              {cols.map((c) => (
                <col key={c.key} style={{ width: c.width }} />
              ))}
            </colgroup>
            <ListHead cols={cols} query={query} setQuery={setQuery} />
            {groups.map((g) => (
              <ListGroup key={g.key} group={g} span={cols.length} heading={!single} closed={collapsed.has(g.key)} onToggle={() => toggle(g.key)} archived={query.archived} reorderable={reorderable} kit={kit} />
            ))}
          </table>
        </div>
      </div>
      <ItemMenu handle={handle} model={menuModel} />
    </div>
  );
}

/** Which groups are folded away, and a toggle for one. */
function useCollapsed() {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  return [collapsed, toggle] as const;
}

/** The column headers, pinned at the top. A sortable one sorts by its column — and, sorted already, turns the sort around. */
function ListHead({ cols, query, setQuery }: { cols: Col[]; query: WorkQuery; setQuery: (p: Partial<WorkQuery>) => void }) {
  const sortBy = (key: SortKey) => {
    if (query.sort === key) setQuery({ sort: key, dir: query.dir === "asc" ? "desc" : "asc" });
    else setQuery({ sort: key, dir: DEFAULT_SORT_DIR[key] });
  };
  return (
    <thead>
      <tr>
        {cols.map((c, i) => {
          const active = c.sort && query.sort === c.sort;
          return (
            <th
              key={c.key}
              scope="col"
              aria-sort={active ? (query.dir === "asc" ? "ascending" : "descending") : undefined}
              className={`sticky top-0 z-20 h-9 border-b border-border bg-surface-2 px-2 py-2 text-left text-[12.5px] font-medium whitespace-nowrap text-ink-2 ${i === 0 ? "left-0 z-30 pl-4" : ""}`}
            >
              {c.sort ? (
                <button type="button" onClick={() => sortBy(c.sort as SortKey)} className="inline-flex items-center gap-1 rounded hover:text-ink focus-visible:outline-2 focus-visible:outline-primary">
                  {c.label}
                  {active ? <ICONS.chevron size={16} aria-hidden className={query.dir === "asc" ? "rotate-180" : ""} /> : <ICONS.sort size={14} aria-hidden className="opacity-40" />}
                </button>
              ) : (
                c.label
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

/**
 * What the rows are handed from the list: the item lookup and the saving set (each row takes its
 * own count and flag from them), the one shared menu, the keyboard moves, and the columns showing.
 */
type RowKit = { byId: ReadonlyMap<string, WorkItem>; pendingIds: ReadonlySet<string>; handle: ItemMenuHandle; onKeyMove: (t: WorkItem, e: KeyboardEvent) => void; visible: ReadonlySet<ColKey> };

/** A group as a table body: its heading (when the list is grouped), its rows, and its add row — or, where nothing can be added, "Nothing here." */
function ListGroup({ group: g, span, heading, closed, onToggle, archived, reorderable, kit }: { group: Group; span: number; heading: boolean; closed: boolean; onToggle: () => void; archived: boolean; reorderable: boolean; kit: RowKit }) {
  const env = useWorkspace();
  const addHere = takesNewWork(env, g, archived);
  return (
    <tbody data-group={g.key}>
      {heading && <GroupHeading group={g} span={span} closed={closed} onToggle={onToggle} />}
      {!closed && <Rows items={g.items} kit={kit} />}
      {!closed && g.items.length === 0 && !addHere && (
        <tr>
          <td colSpan={span} className="border-b border-[#eeeeee] p-0 text-[12.5px] text-ink-2">
            <span className="sticky left-0 block w-fit py-2.5 pr-4 pl-12">Nothing here.</span>
          </td>
        </tr>
      )}
      {!closed && addHere && <GroupAdd group={g} span={span} reorderable={reorderable} />}
    </tbody>
  );
}

/** A group's heading: its name, count and effort on the group's colours, and the button that folds it away. */
function GroupHeading({ group: g, span, closed, onToggle }: { group: Group; span: number; closed: boolean; onToggle: () => void }) {
  const colors = groupColors(g);
  const effort = groupEffort(g);
  return (
    <tr>
      {/* The heading stays put while you scroll: it sticks under the column headers
          while its group is in view, and its label stays at the left edge when the
          table scrolls sideways (the cell spans every column, so the label pins
          itself inside it). */}
      <th colSpan={span} scope="rowgroup" className="sticky top-9 z-[15] border-b border-[#e3e3e3] p-0 text-left" style={{ background: colors.bg }}>
        <button type="button" aria-expanded={!closed} onClick={onToggle} className="flex w-full text-left hover:bg-black/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
          <span className="sticky left-0 flex items-center gap-2 px-3 py-2.5">
            <ICONS.chevron size={18} aria-hidden className={`transition-transform ${closed ? "-rotate-90" : ""}`} style={{ color: colors.text }} />
            <GroupLabel group={g} colors={colors}>
              {effort > 0 && <span className="text-[12.5px] font-normal opacity-80 tabular-nums">effort {effort}</span>}
            </GroupLabel>
          </span>
        </button>
      </th>
    </tr>
  );
}

/** A group's add row: the new task gets the group's assignee, work type, priority or project, and says so. */
function GroupAdd({ group: g, span, reorderable }: { group: Group; span: number; reorderable: boolean }) {
  const env = useWorkspace();
  return (
    <tr>
      <td colSpan={span} className="border-b border-[#eeeeee] bg-white p-0">
        <div className="sticky left-0 max-w-[720px] [&>form]:border-t-0 [&>button]:border-t-0">
          <QuickAdd onAdd={(title) => addToGroup(env, g, reorderable, title)} hint={g.value.field === "assignee" ? `Assigned to ${env.assigneeLabel(g.value.value)}` : g.value.field === "status" || g.value.field === "none" ? undefined : `In ${g.label}`} />
        </div>
      </td>
    </tr>
  );
}

/** A group's rows, a slice at a time. */
function Rows({ items, kit }: { items: WorkItem[]; kit: RowKit }) {
  const { shown, sentinel } = useProgressive(items.length, 80, "tr");
  return (
    <>
      {items.slice(0, shown).map((t) => (
        <Row shown={kit.visible} key={t.id} item={t} blockers={openBlockers(t, kit.byId).length} pending={kit.pendingIds.has(t.id)} handle={kit.handle} onKeyMove={kit.onKeyMove} />
      ))}
      {sentinel}
    </>
  );
}

const CELL = "border-b border-[#eeeeee] px-2 py-1 align-middle";

const Row = memo(function Row({ item: t, blockers, pending, handle, onKeyMove, shown }: { item: WorkItem; blockers: number; pending: boolean; handle: ItemMenuHandle; onKeyMove: (t: WorkItem, e: KeyboardEvent) => void; shown: ReadonlySet<ColKey> }) {
  const { openTask } = useWorkspace();
  return (
    <tr
      {...itemData(t, pending)}
      tabIndex={0}
      aria-label={`${refOf(t)} ${t.title}`}
      onClick={() => openTask(t.id)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter") {
          e.preventDefault();
          openTask(t.id);
        } else onKeyMove(t, e);
      }}
      className={`group/row cursor-pointer hover:bg-surface-alt focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${pending ? "opacity-80" : ""} ${isArchived(t) ? "bg-surface-alt" : ""}`}
    >
      <NameCell item={t} blockers={blockers} handle={handle} />
      <td className={CELL} onClick={(e) => e.stopPropagation()}>
        <StatusField item={t} />
      </td>
      <td className={CELL} onClick={(e) => e.stopPropagation()}>
        <AssigneeField item={t} />
      </td>
      <td className={CELL} onClick={(e) => e.stopPropagation()}>
        <TypeField item={t} />
      </td>
      <td className={CELL} onClick={(e) => e.stopPropagation()}>
        <PriorityField item={t} compact />
      </td>
      {shown.has("start") && (
        <td className={CELL} onClick={(e) => e.stopPropagation()}>
          <DateField item={t} which="start" compact />
        </td>
      )}
      <td className={CELL} onClick={(e) => e.stopPropagation()}>
        <DateField item={t} which="due" compact />
      </td>
      <td className={CELL} onClick={(e) => e.stopPropagation()}>
        <EffortField item={t} compact />
      </td>
      {shown.has("progress") && <ProgressCell item={t} />}
      {shown.has("updated") && <td className={`${CELL} text-[12.5px] text-ink-2`}>{t.version ? ago(t.updatedAt) : "Saving…"}</td>}
    </tr>
  );
});

/**
 * The row's first cell, pinned on the left: the status circle, the number and name, what's in the
 * way, its first tag, where it sits — and the item's menu at the end.
 */
function NameCell({ item: t, blockers, handle }: { item: WorkItem; blockers: number; handle: ItemMenuHandle }) {
  const env = useWorkspace();
  const circle = circleStep(t, env);
  return (
    <td className={`${CELL} sticky left-0 z-10 bg-white pl-4 group-hover/row:bg-surface-alt`}>
      <span className="flex min-w-0 items-center gap-2">
        <span className="flex" onClick={(e) => e.stopPropagation()}>
          <StatusCircle status={t.status} onClick={circle?.run} label={circle?.label ?? STATUS_META[t.status].label} />
        </span>
        <span className="shrink-0 text-[12px] text-ink-2 tabular-nums">{t.number ? refOf(t) : "…"}</span>
        <span className={`min-w-0 truncate text-[14px] ${isCompleted(t.status) ? "text-ink-2 line-through" : "text-ink"}`}>{t.title}</span>
        <span className="flex shrink-0 items-center gap-1">
          <BlockedChip count={blockers} />
          {t.changes && (t.status === "todo" || t.status === "doing") && <ChangesChip />}
          {t.tags.slice(0, 1).map((tag) => (
            <TagChip key={tag} tag={tag} colors={env.tagColors} />
          ))}
          <PlaceChip item={t} />
          <LockChip item={t} />
          {isArchived(t) && <span className="text-[12px] font-medium text-ink-2">Deleted</span>}
        </span>
        <span className="ml-auto flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
          <ItemMenuTrigger handle={handle} item={t} className="opacity-60 group-hover/row:opacity-100 focus-visible:opacity-100" />
        </span>
      </span>
    </td>
  );
}

/**
 * What clicking a row's status circle does for this person: send their work for review, or mark it
 * done — or nothing; the row's Status menu has every other move.
 */
function circleStep(t: WorkItem, { actor, access, actions, names }: Pick<WorkspaceEnv, "actor" | "access" | "actions" | "names">): { label: string; run: () => void } | null {
  if (actor.role === "contributor" && (t.status === "todo" || t.status === "doing") && transitionFor(t, actor, access, "review").ok)
    return { label: `Send to ${names.team} for review`, run: () => void actions.transition(t, "review", undefined, { success: `Sent ${refOf(t)} to ${names.team} for review` }) };
  if (actor.role === "manager" && !isCompleted(t.status) && transitionFor(t, actor, access, "done").ok && t.status !== "review")
    return { label: "Mark done", run: () => void actions.transition(t, "done", undefined, { announce: `${refOf(t)} marked done` }) };
  return null;
}

/** How far along the item's subtasks are: a bar and "2/5" — or a dash when it has none. */
function ProgressCell({ item: t }: { item: WorkItem }) {
  const progress = progressOf(t);
  return (
    <td className={CELL}>
      {progress === null ? (
        <span className="px-1.5 text-ink-2">—</span>
      ) : (
        <span className="flex items-center gap-2 px-1.5" aria-label={`${t.subtasks.filter((s) => s.done).length} of ${t.subtasks.length} subtasks done`}>
          <span className="h-1.5 w-12 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-full bg-ok" style={{ width: `${Math.round(progress * 100)}%` }} />
          </span>
          <span className="text-[12px] text-ink-2 tabular-nums">
            {t.subtasks.filter((s) => s.done).length}/{t.subtasks.length}
          </span>
        </span>
      )}
    </td>
  );
}
