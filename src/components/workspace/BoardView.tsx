"use client";

import { memo, useCallback, useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { ICONS } from "@/components/admin/icons";
import { KanbanColumn, KanbanEmpty, KanbanList } from "@/components/portal/board";
import { StatusCircle } from "@/components/portal/tasks/task-bits";
import { Tip } from "@/components/portal/Tip";
import { dayOf } from "@/lib/work/dates";
import { isArchived, isCompleted, openBlockers, progressOf, refOf, STATUS_META, TYPE_META, type WorkItem } from "@/lib/work/model";
import { capsFor, lockedReason, targetsFor, transitionFor } from "@/lib/work/permissions";
import type { Group, WorkQuery } from "@/lib/work/query";
import { useWorkspace } from "./context";
import { ItemMenu, ItemMenuTrigger, useItemMenuHandle, type ItemMenuHandle, type MenuModel } from "./ItemMenu";
import { AssigneeChip, BlockedChip, ChangesChip, DueChip, EffortChip, groupColors, LockChip, PlaceChip, PriorityFact, Ref, TagChip, TypeChip } from "./meta";
import { dropPlan, newItemPlace, placeAt, refusal, runPlan, takesWork } from "./moves";
import { QuickAdd } from "./QuickAdd";
import { focusItem, useProgressive } from "./util";

/**
 * TB-116 / IN-029 — the Board: a column per status (or per assignee, work type or priority, as
 * grouped), cards dragged between them. A card can only be dropped where the rules let this person
 * put it — the other columns don't take it — and within a column it lands where it's dropped when
 * the order is manual. The keyboard does the same with Alt+Shift+arrows on a focused card, or the
 * card's menu (Move to / Move up / Move down). Each move shows at once and is taken back with a
 * message if it can't be saved.
 */
export function BoardView({ groups, byId, query, pendingIds }: { groups: Group[]; byId: ReadonlyMap<string, WorkItem>; query: WorkQuery; pendingIds: ReadonlySet<string> }) {
  const env = useWorkspace();
  const { actions, canCreate, canReorder, assigneeLabel } = env;
  const handle = useItemMenuHandle();
  const reorderable = canReorder && query.sort === "manual" && !query.archived;
  /** A column that's a finished project (grouped by project): "Finished", "Archived" — or nothing. */
  const finishedPlace = (g: Group) => {
    if (g.value.field !== "project") return null;
    const p = env.projects.places.find((x) => x.key === g.value.value);
    return p?.finished ? (p.archived ? "Archived" : "Finished") : null;
  };
  const [drag, setDrag] = useState<{ id: string; from: string } | null>(null);
  /** The card being dragged fades once the browser has its drag image (not before, or the image fades too). */
  const [fading, setFading] = useState<string | null>(null);
  const [over, setOver] = useState<{ key: string; index: number } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const cards = useRef(new Map<string, HTMLElement>());
  const dragged = drag ? byId.get(drag.id) : undefined;

  // A refusal explains itself for a few seconds, then gets out of the way.
  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 5000);
    return () => clearTimeout(t);
  }, [hint]);

  const groupOf = useCallback((id: string) => groups.find((g) => g.items.some((t) => t.id === id)), [groups]);

  /** Whether the dragged card can land in this column, and how. */
  const planFor = useCallback(
    (g: Group) => {
      if (!dragged) return null;
      const plan = dropPlan(dragged, g.value, env);
      if (!plan) return null;
      if (plan.kind === "reorder" && !reorderable) return null;
      return plan;
    },
    [dragged, env, reorderable],
  );

  const onDragStart = useCallback((t: WorkItem, e: DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", t.id);
    setDrag({ id: t.id, from: groupOf(t.id)?.key ?? "" });
    setTimeout(() => setFading(t.id), 0);
  }, [groupOf]);

  const onDragEnd = useCallback(() => {
    setDrag(null);
    setFading(null);
    setOver(null);
    setHint(null);
  }, []);

  const indexAt = (g: Group, y: number) => {
    let i = 0;
    for (const t of g.items) {
      if (t.id === drag?.id) continue;
      const el = cards.current.get(t.id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (y > r.top + r.height / 2) i++;
    }
    return i;
  };

  const drop = (g: Group, index: number) => {
    const t = dragged;
    const plan = planFor(g);
    onDragEnd();
    if (!t || !plan) return;
    const place = reorderable ? placeAt(g.items, t.id, index) : null;
    if (plan.kind === "reorder") {
      const now = placeAt(g.items, t.id, g.items.findIndex((x) => x.id === t.id));
      if (place && now.after === place.after && now.before === place.before) return;
    }
    runPlan(env, t, plan, place);
  };

  /** Alt+Shift+arrows: next column this card can go to, or up / down within its column. */
  const onKeyMove = useCallback(
    (t: WorkItem, e: KeyboardEvent) => {
      if (!e.altKey || !e.shiftKey) return;
      const at = groups.findIndex((g) => g.items.some((x) => x.id === t.id));
      if (at < 0) return;
      const column = groups[at].items;
      const i = column.findIndex((x) => x.id === t.id);
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const step = e.key === "ArrowLeft" ? -1 : 1;
        for (let j = at + step; j >= 0 && j < groups.length; j += step) {
          const plan = dropPlan(t, groups[j].value, env);
          if (!plan || plan.kind === "reorder") continue;
          runPlan(env, t, plan, reorderable ? { after: groups[j].items.at(-1)?.id } : null);
          focusItem(t.id);
          return;
        }
        const reason = groups.map((g) => refusal(t, g.value, env)).find(Boolean);
        setHint(reason ?? "It can't move any further that way.");
        return;
      }
      if ((e.key === "ArrowUp" || e.key === "ArrowDown") && reorderable) {
        e.preventDefault();
        const place = e.key === "ArrowUp" ? (i > 0 ? { after: column[i - 2]?.id, before: column[i - 1].id } : null) : i < column.length - 1 ? { after: column[i + 1].id, before: column[i + 2]?.id } : null;
        if (!place) return;
        void actions.move(t, place, { announce: `Moved ${refOf(t)} ${e.key === "ArrowUp" ? "up" : "down"}` });
        focusItem(t.id);
      }
    },
    [groups, env, reorderable, actions],
  );

  const menuModel = useCallback(
    (id: string): MenuModel | null => {
      const t = byId.get(id);
      if (!t) return null;
      const at = groups.findIndex((g) => g.items.some((x) => x.id === id));
      const column = at >= 0 ? groups[at].items : [];
      const i = column.findIndex((x) => x.id === id);
      const moves = groups
        .filter((g, j) => j !== at)
        .map((g) => ({ g, plan: dropPlan(t, g.value, env) }))
        .filter((x): x is { g: Group; plan: NonNullable<ReturnType<typeof dropPlan>> } => !!x.plan && x.plan.kind !== "reorder")
        .map(({ g, plan }) => ({ key: g.key, label: g.label, run: () => runPlan(env, t, plan, reorderable ? { after: g.items.at(-1)?.id } : null) }));
      const move = (place: { after?: string; before?: string }, word: string) => () => void actions.move(t, place, { announce: `Moved ${refOf(t)} ${word}` });
      const order = reorderable && i >= 0
        ? {
            up: i > 0 ? move({ after: column[i - 2]?.id, before: column[i - 1].id }, "up") : undefined,
            down: i < column.length - 1 ? move({ after: column[i + 1].id, before: column[i + 2]?.id }, "down") : undefined,
            top: i > 0 ? move({ before: column[0].id }, "to the top") : undefined,
            bottom: i < column.length - 1 ? move({ after: column.at(-1)?.id }, "to the bottom") : undefined,
          }
        : undefined;
      return { item: t, moves, order };
    },
    [byId, groups, env, reorderable, actions],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {hint && (
        <p role="status" className="mx-[var(--ws-gutter,1rem)] mt-3 rounded-lg bg-warn-bg px-3 py-2 text-[13px] leading-[1.4] text-[#7a5e0a]">
          {hint}
        </p>
      )}
      <div className="flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto px-[var(--ws-gutter,1rem)] pt-3 pb-4" data-testid="board">
        {groups.map((g) => {
          const plan = drag ? planFor(g) : null;
          const target = !!plan;
          const denied = !!drag && !plan && g.key !== drag.from ? (dragged ? refusal(dragged, g.value, env) : null) : null;
          const colors = groupColors(g);
          const effort = g.items.reduce((n, t) => n + (t.effort ?? 0), 0);
          const addHere = canCreate && !query.archived && (g.value.field !== "status" || g.value.value === "todo") && (g.value.field !== "project" || takesWork(env, g.value.value));
          return (
            <KanbanColumn
              key={g.key}
              label={g.label}
              count={g.items.length}
              colors={colors}
              frame={over?.key === g.key ? "over" : target && drag?.from !== g.key ? "target" : "rest"}
              dimmed={!!drag && !target && drag.from !== g.key}
              data-column={g.key}
              data-drop={drag ? (target ? "allowed" : "denied") : undefined}
              onDragOver={(e) => {
                if (!plan) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                const index = reorderable ? indexAt(g, e.clientY) : g.items.length;
                if (over?.key !== g.key || over.index !== index) setOver({ key: g.key, index });
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver((o) => (o?.key === g.key ? null : o));
              }}
              onDrop={(e) => {
                e.preventDefault();
                drop(g, over?.key === g.key ? over.index : g.items.length);
              }}
              aside={
                // A finished project's column says so: its work is read-only (TB-148).
                finishedPlace(g) ? (
                  <span className="flex shrink-0 items-center gap-1 text-[12px] font-medium" aria-label={`${finishedPlace(g)}, read-only`}>
                    <ICONS.lock size={13} aria-hidden /> {finishedPlace(g)}
                  </span>
                ) : effort > 0 && (
                  <span className="flex shrink-0 items-center gap-1 text-[12px] font-normal tabular-nums" aria-label={`Total effort ${effort}`}>
                    <ICONS.effort size={13} aria-hidden /> {effort}
                  </span>
                )
              }
              notice={
                denied && (
                  <p className="mx-2 mt-2 rounded-md bg-white/80 px-2 py-1.5 text-[12px] leading-[1.35] text-ink-2" aria-live="polite">
                    {denied}
                  </p>
                )
              }
              footer={
                addHere && (
                  <QuickAdd
                    variant="card"
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
                    hint={g.value.field === "assignee" ? `Assigned to ${assigneeLabel(g.value.value)}` : g.value.field === "status" ? undefined : `In ${g.label}`}
                  />
                )
              }
            >
              <Column items={g.items} over={over?.key === g.key ? over.index : null} dragId={drag?.id ?? null} fading={fading} showLine={reorderable} cards={cards} pendingIds={pendingIds} byId={byId} handle={handle} onDragStart={onDragStart} onDragEnd={onDragEnd} onKeyMove={onKeyMove} emptyLabel={query.archived ? "Nothing deleted here" : "Nothing here"} />
            </KanbanColumn>
          );
        })}
      </div>
      <ItemMenu handle={handle} model={menuModel} />
    </div>
  );
}

function Column({
  items,
  over,
  dragId,
  fading,
  showLine,
  cards,
  pendingIds,
  byId,
  handle,
  onDragStart,
  onDragEnd,
  onKeyMove,
  emptyLabel,
}: {
  items: WorkItem[];
  over: number | null;
  dragId: string | null;
  fading: string | null;
  showLine: boolean;
  cards: React.RefObject<Map<string, HTMLElement>>;
  pendingIds: ReadonlySet<string>;
  byId: ReadonlyMap<string, WorkItem>;
  handle: ItemMenuHandle;
  onDragStart: (t: WorkItem, e: DragEvent) => void;
  onDragEnd: () => void;
  onKeyMove: (t: WorkItem, e: KeyboardEvent) => void;
  emptyLabel: string;
}) {
  const { shown, sentinel } = useProgressive(items.length, 60);
  const rest = items.filter((t) => t.id !== dragId);
  const line = <li aria-hidden className="h-0.5 shrink-0 rounded-full bg-primary" />;
  return (
    <KanbanList>
      {items.slice(0, shown).map((t) => {
        const at = rest.indexOf(t);
        return (
          <FragmentWithLine key={t.id} line={showLine && over !== null && at === over ? line : null}>
            <WorkCard item={t} blockers={openBlockers(t, byId).length} pending={pendingIds.has(t.id)} dragging={fading === t.id} handle={handle} onDragStart={onDragStart} onDragEnd={onDragEnd} onKeyMove={onKeyMove} cards={cards} />
          </FragmentWithLine>
        );
      })}
      {showLine && over !== null && over >= rest.length && line}
      {sentinel}
      {items.length === 0 && <KanbanEmpty>{emptyLabel}</KanbanEmpty>}
    </KanbanList>
  );
}

function FragmentWithLine({ line, children }: { line: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      {line}
      {children}
    </>
  );
}

/**
 * A card: the status circle (the next step for whoever's looking), the name, what's due and how
 * big it is, and who has it. Memoised — a change to another item doesn't re-render it.
 */
const WorkCard = memo(function WorkCard({
  item: t,
  blockers,
  pending,
  dragging,
  handle,
  onDragStart,
  onDragEnd,
  onKeyMove,
  cards,
}: {
  item: WorkItem;
  blockers: number;
  pending: boolean;
  dragging: boolean;
  handle: ItemMenuHandle;
  onDragStart: (t: WorkItem, e: DragEvent) => void;
  onDragEnd: () => void;
  onKeyMove: (t: WorkItem, e: KeyboardEvent) => void;
  cards: React.RefObject<Map<string, HTMLElement>>;
}) {
  const env = useWorkspace();
  const { actor, access, people, today, openTask, names, canReorder } = env;
  const caps = capsFor(t, actor, access);
  const targets = isArchived(t) ? [] : targetsFor(t, actor, access);
  const draggable = !isArchived(t) && (targets.length > 0 || canReorder || caps.assign || caps.plan);
  const why = !draggable && !isArchived(t) && actor.role !== "viewer" ? transitionFor(t, actor, access, t.status === "todo" ? "doing" : "todo", names) : null;
  const progress = progressOf(t);
  /** Whether the details line carries a place or a read-only chip (PlaceChip, LockChip). */
  const placed = (env.projects.showPlace && !!t.project) || (env.projects.showPlace && !!t.trial) || !!lockedReason(t, env.access);
  const next = nextStep(t, env);
  const subsDone = t.subtasks.filter((s) => s.done).length;
  const changes = !!t.changes && (t.status === "todo" || t.status === "doing");
  const ref = (el: HTMLElement | null) => {
    if (el) cards.current.set(t.id, el);
    else cards.current.delete(t.id);
  };

  const body = (
    <div
      ref={ref}
      tabIndex={0}
      role="group"
      aria-roledescription="card"
      aria-label={`${refOf(t)} ${t.title}. ${STATUS_META[t.status].label}.${blockers ? " Blocked." : ""}`}
      data-item-id={t.id}
      data-status={t.status}
      data-assignee={t.assignee ?? "none"}
      data-due={t.due ?? ""}
      data-start={t.start ?? ""}
      data-effort={t.effort ?? ""}
      data-pending={pending ? "true" : undefined}
      draggable={draggable}
      onDragStart={(e) => onDragStart(t, e)}
      onDragEnd={onDragEnd}
      onClick={() => openTask(t.id)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openTask(t.id);
        } else onKeyMove(t, e);
      }}
      className={`group/card flex cursor-pointer flex-col gap-2.5 rounded-lg bg-white p-3 outline -outline-offset-1 outline-border transition [contain-intrinsic-size:auto_104px] [content-visibility:auto] hover:outline-[#a6a6a6] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${dragging ? "opacity-40" : ""} ${pending ? "opacity-80" : ""} ${isArchived(t) ? "bg-surface-alt" : ""}`}
    >
      {/* The name after its status circle, with its number ("#4") just before it. Everything under it starts where the name does. */}
      <div className="flex items-start gap-2">
        <span className="flex pt-px" onClick={(e) => e.stopPropagation()}>
          <StatusCircle status={t.status} onClick={next?.run} label={next?.label ?? STATUS_META[t.status].label} />
        </span>
        <p className={`line-clamp-3 min-w-0 flex-1 text-[14px] leading-[1.35] font-medium break-words ${isCompleted(t.status) ? "text-ink-2 line-through" : "text-ink"}`}>
          <Ref item={t} />
          {t.title}
        </p>
        <ItemMenuTrigger handle={handle} item={t} className="-my-0.5 opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100" />
      </div>
      <div className="flex flex-col gap-2 pl-[26px]">
        {/* What's in the way, first and only when something is: it's blocked, or changes were asked for. Work waiting on review needs no button — the column says so, and the card opens it. */}
        {(blockers > 0 || changes) && (
          <div className="flex flex-wrap items-center gap-1.5">
            <BlockedChip count={blockers} />
            {changes && <ChangesChip />}
          </div>
        )}
        {/* When and how urgent, as one quiet line — and no empty line when there's neither. */}
        {(dayOf(t.due) !== null || !!t.priority || isArchived(t) || placed) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <DueChip item={t} today={today} />
            <PriorityFact priority={t.priority} />
            {/* Which project, when the view mixes them; and read-only, when it's finished work. */}
            <PlaceChip item={t} />
            <LockChip item={t} />
            {isArchived(t) && <span className="text-[12px] font-medium text-ink-2">Deleted</span>}
          </div>
        )}
        {t.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {t.tags.slice(0, 2).map((tag) => (
              <TagChip key={tag} tag={tag} colors={env.tagColors} />
            ))}
            {t.tags.length > 2 && <span className="text-[12px] text-ink-2">+{t.tags.length - 2}</span>}
          </div>
        )}
        {/* Who has it; then what kind of work, how big, and how far along the checklist and the talk are. */}
        <div className="flex min-h-6 items-center gap-2.5">
          <span className="min-w-0 flex-1">
            <AssigneeChip assignee={t.assignee} people={people} />
          </span>
          {t.type !== "task" && (
            <Tip label={TYPE_META[t.type].label}>
              <span className="inline-flex">
                <TypeChip type={t.type} iconOnly />
              </span>
            </Tip>
          )}
          <EffortChip effort={t.effort} />
          {progress !== null && (
            <span className="inline-flex items-center gap-1 text-[12px] text-ink-2 tabular-nums" aria-label={`${subsDone} of ${t.subtasks.length} subtasks done`}>
              <ICONS.checklist size={14} aria-hidden /> {subsDone}/{t.subtasks.length}
            </span>
          )}
          {t.comments.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[12px] text-ink-2 tabular-nums" aria-label={`${t.comments.length} ${t.comments.length === 1 ? "comment" : "comments"}`}>
              <ICONS.messages size={13} aria-hidden /> {t.comments.length}
            </span>
          )}
          {pending && <span className="text-[11.5px] text-ink-2">Saving…</span>}
        </div>
      </div>
    </div>
  );
  return <li className="list-none">{why && !why.ok ? <Tip label={why.reason}>{body}</Tip> : body}</li>;
});

/** What clicking the status circle does for this person: send for review, mark done — or nothing. */
function nextStep(t: WorkItem, env: ReturnType<typeof useWorkspace>): { label: string; run: () => void } | null {
  const { actor, access, names, actions, openTask } = env;
  if (isArchived(t)) return null;
  if (t.status === "review" && transitionFor(t, actor, access, "done").ok) return { label: "Review this item", run: () => openTask(t.id) };
  if (actor.role === "contributor" && (t.status === "todo" || t.status === "doing") && transitionFor(t, actor, access, "review").ok)
    return { label: `Send to ${names.team} for review`, run: () => void actions.transition(t, "review", undefined, { success: `Sent ${refOf(t)} to ${names.team} for review` }) };
  if (actor.role === "manager" && !isCompleted(t.status) && transitionFor(t, actor, access, "done").ok) return { label: "Mark done", run: () => void actions.transition(t, "done", undefined, { announce: `${refOf(t)} marked done` }) };
  return null;
}
