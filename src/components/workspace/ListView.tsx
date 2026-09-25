"use client";

import { memo, useCallback, useMemo, useState, type KeyboardEvent } from "react";
import { ICONS } from "@/components/admin/icons";
import { StatusCircle } from "@/components/portal/tasks/task-bits";
import { isArchived, isCompleted, openBlockers, progressOf, refOf, STATUS_META, type WorkItem } from "@/lib/work/model";
import { transitionFor } from "@/lib/work/permissions";
import { DEFAULT_SORT_DIR, type Group, type SortKey, type WorkQuery } from "@/lib/work/query";
import { useWorkspace } from "./context";
import { AssigneeField, DateField, EffortField, PriorityField, StatusField, TypeField } from "./fields";
import { ItemMenu, ItemMenuTrigger, useItemMenuHandle, type ItemMenuHandle, type MenuModel } from "./ItemMenu";
import { BlockedChip, ChangesChip, GroupLabel, groupColors, LockChip, PlaceChip, TagChip } from "./meta";
import { dropPlan, newItemPlace, runPlan, takesWork } from "./moves";
import { QuickAdd } from "./QuickAdd";
import { ago, focusItem, useProgressive, useWidth } from "./util";

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

export function ListView({ groups, byId, query, setQuery, pendingIds }: { groups: Group[]; byId: ReadonlyMap<string, WorkItem>; query: WorkQuery; setQuery: (p: Partial<WorkQuery>) => void; pendingIds: ReadonlySet<string> }) {
  const env = useWorkspace();
  const { actions, canCreate, canReorder, assigneeLabel } = env;
  const handle = useItemMenuHandle();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const reorderable = canReorder && query.sort === "manual" && !query.archived;
  const [frameRef, frameWidth] = useWidth<HTMLDivElement>();
  const cols = visibleCols(frameWidth);
  const tableWidth = cols.reduce((n, c) => n + c.width, 0);
  /** Kept by value, so the memoised rows re-render only when a column comes or goes. */
  const shownKey = cols.map((c) => c.key).join(",");
  const shown = useMemo(() => new Set(shownKey.split(",") as ColKey[]), [shownKey]);
  const single = groups.length === 1 && groups[0].value.field === "none";

  const sortBy = (key: SortKey) => {
    if (query.sort === key) setQuery({ sort: key, dir: query.dir === "asc" ? "desc" : "asc" });
    else setQuery({ sort: key, dir: DEFAULT_SORT_DIR[key] });
  };

  const onKeyMove = useCallback(
    (t: WorkItem, e: KeyboardEvent) => {
      if (!e.altKey || !e.shiftKey || !reorderable || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
      const g = groups.find((x) => x.items.some((y) => y.id === t.id));
      if (!g) return;
      const col = g.items;
      const i = col.findIndex((x) => x.id === t.id);
      e.preventDefault();
      const place = e.key === "ArrowUp" ? (i > 0 ? { after: col[i - 2]?.id, before: col[i - 1].id } : null) : i < col.length - 1 ? { after: col[i + 1].id, before: col[i + 2]?.id } : null;
      if (!place) return;
      void actions.move(t, place, { announce: `Moved ${refOf(t)} ${e.key === "ArrowUp" ? "up" : "down"}` });
      focusItem(t.id);
    },
    [groups, reorderable, actions],
  );

  const menuModel = useCallback(
    (id: string): MenuModel | null => {
      const t = byId.get(id);
      if (!t) return null;
      const at = groups.findIndex((g) => g.items.some((x) => x.id === id));
      const col = at >= 0 ? groups[at].items : [];
      const i = col.findIndex((x) => x.id === id);
      const moves = groups
        .filter((_, j) => j !== at)
        .map((g) => ({ g, plan: dropPlan(t, g.value, env) }))
        .filter((x) => !!x.plan && x.plan.kind !== "reorder")
        .map(({ g, plan }) => ({ key: g.key, label: g.label, run: () => runPlan(env, t, plan as NonNullable<typeof plan>, reorderable ? { after: g.items.at(-1)?.id } : null) }));
      const move = (place: { after?: string; before?: string }, word: string) => () => void actions.move(t, place, { announce: `Moved ${refOf(t)} ${word}` });
      const order =
        reorderable && i >= 0
          ? {
              up: i > 0 ? move({ after: col[i - 2]?.id, before: col[i - 1].id }, "up") : undefined,
              down: i < col.length - 1 ? move({ after: col[i + 1].id, before: col[i + 2]?.id }, "down") : undefined,
              top: i > 0 ? move({ before: col[0].id }, "to the top") : undefined,
              bottom: i < col.length - 1 ? move({ after: col.at(-1)?.id }, "to the bottom") : undefined,
            }
          : undefined;
      return { item: t, moves, order };
    },
    [byId, groups, env, reorderable, actions],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col px-[var(--ws-gutter,1rem)] pt-3 pb-4">
      {/* The border is on this frame and the table scrolls inside it. On the scroller itself it was
          an outline, which the pinned header and name column paint over — so the edge came and went. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-white">
        <div ref={frameRef} className="min-h-0 flex-1 overflow-auto" data-testid="list">
          <table className="w-full table-fixed border-separate border-spacing-0 text-[13px] leading-[1.4]" style={{ minWidth: tableWidth }} aria-label="Work items">
            <colgroup>
              {cols.map((c) => (
                <col key={c.key} style={{ width: c.width }} />
              ))}
            </colgroup>
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
            {groups.map((g) => {
              const closed = collapsed.has(g.key);
              const colors = groupColors(g);
              const effort = g.items.reduce((n, t) => n + (t.effort ?? 0), 0);
              const addHere = canCreate && !query.archived && (g.value.field !== "status" || g.value.value === "todo") && (g.value.field !== "project" || takesWork(env, g.value.value));
              return (
                <tbody key={g.key} data-group={g.key}>
                  {!single && (
                    <tr>
                      {/* The heading stays put while you scroll: it sticks under the column headers
                          while its group is in view, and its label stays at the left edge when the
                          table scrolls sideways (the cell spans every column, so the label pins
                          itself inside it). */}
                      <th colSpan={cols.length} scope="rowgroup" className="sticky top-9 z-[15] border-b border-[#e3e3e3] p-0 text-left" style={{ background: colors.bg }}>
                        <button
                          type="button"
                          aria-expanded={!closed}
                          onClick={() => setCollapsed((s) => {
                            const n = new Set(s);
                            if (n.has(g.key)) n.delete(g.key);
                            else n.add(g.key);
                            return n;
                          })}
                          className="flex w-full text-left hover:bg-black/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                        >
                          <span className="sticky left-0 flex items-center gap-2 px-3 py-2.5">
                            <ICONS.chevron size={18} aria-hidden className={`transition-transform ${closed ? "-rotate-90" : ""}`} style={{ color: colors.text }} />
                            <GroupLabel group={g} colors={colors}>
                              {effort > 0 && <span className="text-[12.5px] font-normal opacity-80 tabular-nums">effort {effort}</span>}
                            </GroupLabel>
                          </span>
                        </button>
                      </th>
                    </tr>
                  )}
                  {!closed && <Rows visible={shown} items={g.items} byId={byId} pendingIds={pendingIds} handle={handle} onKeyMove={onKeyMove} />}
                  {!closed && g.items.length === 0 && !addHere && (
                    <tr>
                      <td colSpan={cols.length} className="border-b border-[#eeeeee] p-0 text-[12.5px] text-ink-2">
                        <span className="sticky left-0 block w-fit py-2.5 pr-4 pl-12">Nothing here.</span>
                      </td>
                    </tr>
                  )}
                  {!closed && addHere && (
                    <tr>
                      <td colSpan={cols.length} className="border-b border-[#eeeeee] bg-white p-0">
                        <div className="sticky left-0 max-w-[720px] [&>form]:border-t-0 [&>button]:border-t-0">
                          <QuickAdd
                            onAdd={(title) =>
                              actions.create(
                                {
                                  title,
                                  ...(g.value.field === "assignee" ? { assignee: g.value.value === "none" ? null : g.value.value } : {}),
                                  ...(g.value.field === "type" ? { type: g.value.value } : {}),
                                  ...(g.value.field === "priority" && g.value.value !== "none" ? { priority: g.value.value } : {}),
                          ...newItemPlace(env, g.value),
                                  ...(reorderable && g.items.length ? { after: g.items.at(-1)?.id } : {}),
                                },
                                { announce: `Added “${title}”` },
                              )
                            }
                            hint={g.value.field === "assignee" ? `Assigned to ${assigneeLabel(g.value.value)}` : g.value.field === "status" || g.value.field === "none" ? undefined : `In ${g.label}`}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}
          </table>
        </div>
      </div>
      <ItemMenu handle={handle} model={menuModel} />
    </div>
  );
}

function Rows({ items, byId, pendingIds, handle, onKeyMove, visible }: { items: WorkItem[]; byId: ReadonlyMap<string, WorkItem>; pendingIds: ReadonlySet<string>; handle: ItemMenuHandle; onKeyMove: (t: WorkItem, e: KeyboardEvent) => void; visible: ReadonlySet<ColKey> }) {
  const { shown, sentinel } = useProgressive(items.length, 80, "tr");
  return (
    <>
      {items.slice(0, shown).map((t) => (
        <Row shown={visible} key={t.id} item={t} blockers={openBlockers(t, byId).length} pending={pendingIds.has(t.id)} handle={handle} onKeyMove={onKeyMove} />
      ))}
      {sentinel}
    </>
  );
}

const CELL = "border-b border-[#eeeeee] px-2 py-1 align-middle";

const Row = memo(function Row({ item: t, blockers, pending, handle, onKeyMove, shown }: { item: WorkItem; blockers: number; pending: boolean; handle: ItemMenuHandle; onKeyMove: (t: WorkItem, e: KeyboardEvent) => void; shown: ReadonlySet<ColKey> }) {
  const env = useWorkspace();
  const { openTask, actor, access, actions, names } = env;
  const progress = progressOf(t);
  const circle =
    actor.role === "contributor" && (t.status === "todo" || t.status === "doing") && transitionFor(t, actor, access, "review").ok
      ? { label: `Send to ${names.team} for review`, run: () => void actions.transition(t, "review", undefined, { success: `Sent ${refOf(t)} to ${names.team} for review` }) }
      : actor.role === "manager" && !isCompleted(t.status) && transitionFor(t, actor, access, "done").ok && t.status !== "review"
        ? { label: "Mark done", run: () => void actions.transition(t, "done", undefined, { announce: `${refOf(t)} marked done` }) }
        : null;
  return (
    <tr
      data-item-id={t.id}
      data-status={t.status}
      data-assignee={t.assignee ?? "none"}
      data-due={t.due ?? ""}
      data-start={t.start ?? ""}
      data-effort={t.effort ?? ""}
      data-pending={pending ? "true" : undefined}
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
      {shown.has("progress") && (
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
      )}
      {shown.has("updated") && <td className={`${CELL} text-[12.5px] text-ink-2`}>{t.version ? ago(t.updatedAt) : "Saving…"}</td>}
    </tr>
  );
});
