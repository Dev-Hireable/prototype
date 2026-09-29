"use client";

import { memo, useCallback, useRef, useState, type DragEvent, type KeyboardEvent, type RefObject } from "react";
import { ICONS } from "@/components/icons";
import { KanbanColumn, KanbanEmpty, KanbanList, type ColumnFrame } from "@/components/portal/board";
import { StatusCircle } from "@/components/portal/tasks/task-bits";
import { Tip } from "@/components/portal/tip";
import { dayOf } from "@/lib/work/dates";
import { isArchived, isCompleted, openBlockers, progressOf, refOf, STATUS_META, TYPE_META, type WorkItem } from "@/lib/work/model";
import { capsFor, lockedReason, targetsFor, transitionFor } from "@/lib/work/permissions";
import type { Group, WorkQuery } from "@/lib/work/query";
import { useWorkspace, type WorkspaceEnv } from "./context";
import { addToGroup, groupEffort, stepByKey, takesNewWork, useMenuModel } from "./group-actions";
import { ItemMenu, ItemMenuTrigger, useItemMenuHandle, type ItemMenuHandle } from "./item-menu";
import { itemData } from "./item-data";
import { AssigneeChip, BlockedChip, ChangesChip, DueChip, EffortChip, LockChip, PlaceChip, PriorityFact, Ref, TagChip, TypeChip } from "./meta";
import { dropPlan, placeAt, refusal, runPlan, type DropPlan } from "./moves";
import { QuickAdd } from "./quick-add";
import { useTimedMessage } from "./timed-message";
import { focusItem, useProgressive } from "./util";
import { groupColors } from "./labels";

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
  const handle = useItemMenuHandle();
  const reorderable = env.canReorder && query.sort === "manual" && !query.archived;
  // A refusal explains itself for a few seconds, then gets out of the way.
  const [hint, setHint] = useTimedMessage();
  const dnd = useCardDrag(groups, byId, setHint);
  const cards = useRef(new Map<string, HTMLElement>());
  const onKeyMove = useCallback((t: WorkItem, e: KeyboardEvent) => keyMove(t, e, { groups, env, reorderable, setHint }), [groups, env, reorderable, setHint]);
  const menuModel = useMenuModel(byId, groups, env, reorderable);
  const kit: CardKit = { byId, pendingIds, handle, onDragStart: dnd.onDragStart, onDragEnd: dnd.onDragEnd, onKeyMove };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {hint && (
        <p role="status" className="mx-[var(--ws-gutter,1rem)] mt-3 rounded-lg bg-warn-bg px-3 py-2 text-[13px] leading-[1.4] text-[#7a5e0a]">
          {hint}
        </p>
      )}
      {/* Positioned, like the List's scroller, so nothing a column places absolutely passes through it to stretch the page. */}
      <div className="relative flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto px-[var(--ws-gutter,1rem)] pt-3 pb-4" data-testid="board">
        {groups.map((g) => (
          <BoardColumn key={g.key} group={g} dnd={dnd} cards={cards} reorderable={reorderable} archived={query.archived} kit={kit} />
        ))}
      </div>
      <ItemMenu handle={handle} model={menuModel} />
    </div>
  );
}

/** The card being dragged, and the column it was picked up from. */
type Dragging = { id: string; from: string };

/** The column the dragged card is over, and the slot in it where it would land. */
type Over = { key: string; index: number };

/**
 * A card on the move: which one and the column it left, the column and slot it's over, and when
 * it fades. However the drag ends, it clears the lot — and the refusal said above the board.
 */
function useCardDrag(groups: Group[], byId: ReadonlyMap<string, WorkItem>, setHint: (hint: string | null) => void) {
  const [drag, setDrag] = useState<Dragging | null>(null);
  /** The card being dragged fades once the browser has its drag image (not before, or the image fades too). */
  const [fading, setFading] = useState<string | null>(null);
  const [over, setOver] = useState<Over | null>(null);
  const groupOf = useCallback((id: string) => groups.find((g) => g.items.some((t) => t.id === id)), [groups]);

  const onDragStart = useCallback(
    (t: WorkItem, e: DragEvent) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", t.id);
      setDrag({ id: t.id, from: groupOf(t.id)?.key ?? "" });
      setTimeout(() => setFading(t.id), 0);
    },
    [groupOf],
  );

  const onDragEnd = useCallback(() => {
    setDrag(null);
    setFading(null);
    setOver(null);
    setHint(null);
  }, [setHint]);

  return { drag, dragged: drag ? byId.get(drag.id) : undefined, fading, over, setOver, onDragStart, onDragEnd };
}

type CardDrag = ReturnType<typeof useCardDrag>;

/** What a keyboard move on the board works from: the columns, the workspace, whether the order is manual, and where a refusal is said. */
type BoardKeys = { groups: Group[]; env: WorkspaceEnv; reorderable: boolean; setHint: (hint: string) => void };

/** Alt+Shift+arrows: next column this card can go to, or up / down within its column. */
function keyMove(t: WorkItem, e: KeyboardEvent, keys: BoardKeys) {
  if (!e.altKey || !e.shiftKey) return;
  const at = keys.groups.findIndex((g) => g.items.some((x) => x.id === t.id));
  if (at < 0) return;
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") return keyAcross(t, e, at, keys);
  if ((e.key === "ArrowUp" || e.key === "ArrowDown") && keys.reorderable) stepByKey(t, keys.groups[at].items, e, keys.env.actions);
}

/** Alt+Shift+← or →: into the nearest column that way that takes the card — or, when none does, why not. */
function keyAcross(t: WorkItem, e: KeyboardEvent, at: number, { groups, env, reorderable, setHint }: BoardKeys) {
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
}

/** Whether the dragged card can land in this column, and how. */
function landingIn(g: Group, dragged: WorkItem | undefined, env: WorkspaceEnv, reorderable: boolean): DropPlan | null {
  if (!dragged) return null;
  const plan = dropPlan(dragged, g.value, env);
  if (!plan) return null;
  if (plan.kind === "reorder" && !reorderable) return null;
  return plan;
}

/**
 * How column `g` meets the card being dragged: the plan for dropping it here, the column's frame
 * (open to the card, with the card over it, or at rest), faded where the card can't go — and why not.
 */
function columnDrop({ drag, dragged, over }: CardDrag, g: Group, env: WorkspaceEnv, reorderable: boolean) {
  const plan = drag ? landingIn(g, dragged, env, reorderable) : null;
  const target = !!plan;
  const denied = !!drag && !plan && g.key !== drag.from ? (dragged ? refusal(dragged, g.value, env) : null) : null;
  const frame: ColumnFrame = over?.key === g.key ? "over" : target && drag?.from !== g.key ? "target" : "rest";
  return { plan, denied, frame, dimmed: !!drag && !target && drag.from !== g.key, state: drag ? (target ? "allowed" : "denied") : undefined };
}

/** The slot a card dragged to height `y` lands in: after every other card in the column whose middle is above it. */
function slotAt(g: Group, y: number, dragId: string | undefined, cards: ReadonlyMap<string, HTMLElement>) {
  let i = 0;
  for (const t of g.items) {
    if (t.id === dragId) continue;
    const el = cards.get(t.id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (y > r.top + r.height / 2) i++;
  }
  return i;
}

/** Drops the card at slot `index` of column `g`: the plan and the new place in one save — unless it's a reorder that leaves the card where it was. */
function dropCard(env: WorkspaceEnv, t: WorkItem, plan: DropPlan, g: Group, index: number, reorderable: boolean) {
  const place = reorderable ? placeAt(g.items, t.id, index) : null;
  if (plan.kind === "reorder") {
    const now = placeAt(g.items, t.id, g.items.findIndex((x) => x.id === t.id));
    if (place && now.after === place.after && now.before === place.before) return;
  }
  runPlan(env, t, plan, place);
}

/**
 * One column: lit up where the dragged card may land, faded — saying why — where it may not; its
 * total effort (or that it's finished); its cards; and an add row at its foot where new work can start.
 */
function BoardColumn({ group: g, dnd, cards, reorderable, archived, kit }: { group: Group; dnd: CardDrag; cards: RefObject<Map<string, HTMLElement>>; reorderable: boolean; archived: boolean; kit: CardKit }) {
  const env = useWorkspace();
  const { drag, over, setOver } = dnd;
  const { plan, denied, frame, dimmed, state } = columnDrop(dnd, g, env, reorderable);
  return (
    <KanbanColumn
      label={g.label}
      count={g.items.length}
      colors={groupColors(g)}
      frame={frame}
      dimmed={dimmed}
      data-column={g.key}
      data-drop={state}
      onDragOver={(e) => {
        if (!plan) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const index = reorderable ? slotAt(g, e.clientY, drag?.id, cards.current) : g.items.length;
        if (over?.key !== g.key || over.index !== index) setOver({ key: g.key, index });
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver((o) => (o?.key === g.key ? null : o));
      }}
      onDrop={(e) => {
        e.preventDefault();
        const t = dnd.dragged;
        dnd.onDragEnd();
        if (t && plan) dropCard(env, t, plan, g, over?.key === g.key ? over.index : g.items.length, reorderable);
      }}
      aside={<ColumnAside group={g} />}
      notice={
        denied && (
          <p className="mx-2 mt-2 rounded-md bg-white/80 px-2 py-1.5 text-[12px] leading-[1.35] text-ink-2" aria-live="polite">
            {denied}
          </p>
        )
      }
      footer={takesNewWork(env, g, archived) && <QuickAdd variant="card" onAdd={(title) => addToGroup(env, g, reorderable, title)} hint={g.value.field === "assignee" ? `Assigned to ${env.assigneeLabel(g.value.value)}` : g.value.field === "status" ? undefined : `In ${g.label}`} />}
    >
      <Column items={g.items} over={over?.key === g.key ? over.index : null} dragId={drag?.id ?? null} fading={dnd.fading} showLine={reorderable} cards={cards} kit={kit} emptyLabel={archived ? "Nothing deleted here" : "Nothing here"} />
    </KanbanColumn>
  );
}

/** A column that's a finished project (grouped by project): "Finished", "Archived" — or nothing. */
function finishedPlace(g: Group, places: WorkspaceEnv["projects"]["places"]) {
  if (g.value.field !== "project") return null;
  const p = places.find((x) => x.key === g.value.value);
  return p?.finished ? (p.archived ? "Archived" : "Finished") : null;
}

/** The right of a column's header: that its project is finished, or else the column's total effort (none when there's none). */
function ColumnAside({ group: g }: { group: Group }) {
  const { projects } = useWorkspace();
  const finished = finishedPlace(g, projects.places);
  const effort = groupEffort(g);
  // A finished project's column says so: its work is read-only (TB-148).
  if (finished)
    return (
      <span className="flex shrink-0 items-center gap-1 text-[12px] font-medium" aria-label={`${finished}, read-only`}>
        <ICONS.lock size={13} aria-hidden /> {finished}
      </span>
    );
  return effort > 0 ? (
    <span className="flex shrink-0 items-center gap-1 text-[12px] font-normal tabular-nums" aria-label={`Total effort ${effort}`}>
      <ICONS.effort size={13} aria-hidden /> {effort}
    </span>
  ) : null;
}

/**
 * What the cards are handed from the board: the item lookup and the saving set (each card takes
 * its own count and flag from them), the one shared menu, and the drag and keyboard moves.
 */
type CardKit = Pick<WorkCardProps, "handle" | "onDragStart" | "onDragEnd" | "onKeyMove"> & { byId: ReadonlyMap<string, WorkItem>; pendingIds: ReadonlySet<string> };

/** A column's cards, a slice at a time — and, when the order is manual, a line where the dragged card would land. */
function Column({ items, over, dragId, fading, showLine, cards, kit, emptyLabel }: { items: WorkItem[]; over: number | null; dragId: string | null; fading: string | null; showLine: boolean; cards: RefObject<Map<string, HTMLElement>>; kit: CardKit; emptyLabel: string }) {
  const { shown, sentinel } = useProgressive(items.length, 60);
  const rest = items.filter((t) => t.id !== dragId);
  const line = <li aria-hidden className="h-0.5 shrink-0 rounded-full bg-primary" />;
  return (
    <KanbanList>
      {items.slice(0, shown).map((t) => {
        const at = rest.indexOf(t);
        return (
          <FragmentWithLine key={t.id} line={showLine && over !== null && at === over ? line : null}>
            <WorkCard item={t} blockers={openBlockers(t, kit.byId).length} pending={kit.pendingIds.has(t.id)} dragging={fading === t.id} handle={kit.handle} onDragStart={kit.onDragStart} onDragEnd={kit.onDragEnd} onKeyMove={kit.onKeyMove} cards={cards} />
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

/** A card's item and its state — how many open items it waits on, saving, being dragged — and what every card shares. */
type WorkCardProps = {
  item: WorkItem;
  blockers: number;
  pending: boolean;
  dragging: boolean;
  handle: ItemMenuHandle;
  onDragStart: (t: WorkItem, e: DragEvent) => void;
  onDragEnd: () => void;
  onKeyMove: (t: WorkItem, e: KeyboardEvent) => void;
  cards: RefObject<Map<string, HTMLElement>>;
};

/**
 * A card: the status circle (the next step for whoever's looking), the name, what's due and how
 * big it is, and who has it. Memoised — a change to another item doesn't re-render it.
 */
const WorkCard = memo(function WorkCard({ item: t, blockers, pending, dragging, handle, onDragStart, onDragEnd, onKeyMove, cards }: WorkCardProps) {
  const env = useWorkspace();
  const { openTask } = env;
  const { draggable, why } = dragRule(t, env);
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
      {...itemData(t, pending)}
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
      <CardHead item={t} handle={handle} />
      <div className="flex flex-col gap-2 pl-[26px]">
        <CardBlockers item={t} blockers={blockers} />
        <CardWhen item={t} />
        <CardTags tags={t.tags} />
        <CardFooter item={t} pending={pending} />
      </div>
    </div>
  );
  return <li className="list-none">{why && !why.ok ? <Tip label={why.reason}>{body}</Tip> : body}</li>;
});

/**
 * Whether this person can pick the card up — to another column, or to reorder it — and, when they
 * can't, what the status rules say about moving it on, which the card shows on hover.
 */
function dragRule(t: WorkItem, { actor, access, names, canReorder }: Pick<WorkspaceEnv, "actor" | "access" | "names" | "canReorder">) {
  const caps = capsFor(t, actor, access);
  const targets = isArchived(t) ? [] : targetsFor(t, actor, access);
  const draggable = !isArchived(t) && (targets.length > 0 || canReorder || caps.assign || caps.plan);
  const why = !draggable && !isArchived(t) && actor.role !== "viewer" ? transitionFor(t, actor, access, t.status === "todo" ? "doing" : "todo", names) : null;
  return { draggable, why };
}

/** The card's first line: the status circle, the number and name, and the card's menu. */
function CardHead({ item: t, handle }: { item: WorkItem; handle: ItemMenuHandle }) {
  const env = useWorkspace();
  const next = nextStep(t, env);
  return (
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
  );
}

/**
 * What's in the way, first and only when something is: it's blocked, or changes were asked for.
 * Work waiting on review needs no button — the column says so, and the card opens it.
 */
function CardBlockers({ item: t, blockers }: { item: WorkItem; blockers: number }) {
  const changes = !!t.changes && (t.status === "todo" || t.status === "doing");
  if (!(blockers > 0 || changes)) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <BlockedChip count={blockers} />
      {changes && <ChangesChip />}
    </div>
  );
}

/** When and how urgent, as one quiet line — and no empty line when there's neither. */
function CardWhen({ item: t }: { item: WorkItem }) {
  const { projects, access, today } = useWorkspace();
  /** Whether the details line carries a place or a read-only chip (PlaceChip, LockChip). */
  const placed = (projects.showPlace && !!t.project) || (projects.showPlace && !!t.trial) || !!lockedReason(t, access);
  if (!(dayOf(t.due) !== null || !!t.priority || isArchived(t) || placed)) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <DueChip item={t} today={today} />
      <PriorityFact priority={t.priority} />
      {/* Which project, when the view mixes them; and read-only, when it's finished work. */}
      <PlaceChip item={t} />
      <LockChip item={t} />
      {isArchived(t) && <span className="text-[12px] font-medium text-ink-2">Deleted</span>}
    </div>
  );
}

/** The card's first two tags, and how many more it has. */
function CardTags({ tags }: { tags: readonly string[] }) {
  const { tagColors } = useWorkspace();
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.slice(0, 2).map((tag) => (
        <TagChip key={tag} tag={tag} colors={tagColors} />
      ))}
      {tags.length > 2 && <span className="text-[12px] text-ink-2">+{tags.length - 2}</span>}
    </div>
  );
}

/** Who has it; then what kind of work, how big, and how far along the checklist and the talk are. */
function CardFooter({ item: t, pending }: { item: WorkItem; pending: boolean }) {
  const { people } = useWorkspace();
  const progress = progressOf(t);
  const subsDone = t.subtasks.filter((s) => s.done).length;
  return (
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
  );
}

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
