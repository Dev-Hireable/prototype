"use client";

import Link from "next/link";
import { useMemo, useRef, type DragEvent, type KeyboardEvent, type RefObject } from "react";
import { ICONS } from "@/components/icons";
import { DashboardSummaryCard } from "@/components/portal/dashboard";
import { StatusCircle } from "@/components/portal/tasks/task-bits";
import { slotAt, useCardDrag } from "@/components/workspace/card-drag";
import { stepByKey } from "@/components/workspace/group-actions";
import { firstName } from "@/components/workspace/labels";
import { ChangesChip, DueChip } from "@/components/workspace/meta";
import { placeAt } from "@/components/workspace/moves";
import { WorkMessages } from "@/components/workspace/work-messages";
import { agendaOf, type AgendaRow } from "@/lib/work/agenda";
import { todayDay, type Day } from "@/lib/work/dates";
import { refOf, STATUS_META, type Side, type WorkItem } from "@/lib/work/model";
import { reorderFor, type WorkAccess } from "@/lib/work/permissions";
import { useWork, useWorkActions } from "@/lib/work/store";

/** Rows the card lists; the rest are a click away in the contract's Work tab. */
const ROWS = 5;

type TasksProps = {
  side: Side;
  /** Who's looking, by full name: the moves are theirs, and the rules say which rows they may place. */
  me: string;
  /** The contract's page; a row adds `?task=`. */
  base: string;
  /** The Work tab, on what this person works on. */
  allHref: string;
  /** Which contract: "Brand Designer at Nairobi Solutions Inc.", "Juan Dela Cruz · Brand Designer". */
  about: string;
  /** The other side's first name. */
  counterpart: string;
  /** What needs this person before any task: the trial's evaluation, the hiring decision, an offer to answer. `overdue` draws its meta in red. */
  lead?: Lead;
  /** Said in place of the tasks while they can't move — a trial that's over and being decided. */
  frozen?: string;
};

/**
 * IN-090 / TB-147 — someone's open tasks on their dashboard, in the manual order (agendaOf): the one
 * order the Work tab's Manual sort shares, which they set right here by dragging a row onto another
 * or with Alt+Shift+↑/↓ on a focused one (TB-142). The Independent sees their own work; the Team
 * Builder sees the Independent's work waiting on their review, then their own and unassigned work.
 * Each row says why it's there (sent back with changes, overdue, due, with the other side for review)
 * and opens that task's sheet in the contract's Work tab, where a review is one click from Approve or
 * Request changes. Only the live contract has a work list, so the dashboards show this while there is one.
 */
export function DashboardTasks({ side, me, base, allHref, about, counterpart, lead, frozen }: TasksProps) {
  const work = useWork();
  const mover = useMover(side, me, counterpart, work.access);
  if (work.status !== "ready") return null;
  const today = todayDay();
  const rows = agendaOf(work.items, today, side);
  const summary = summaryOf(rows, side);

  return (
    <DashboardSummaryCard title="My tasks" subtitle={summary ? `${about} · ${summary}` : about} href={allHref} linkLabel={side === "independent" ? "See all my tasks" : "Open the Work tab"}>
      {lead && <LeadRow lead={lead} />}
      {frozen ? (
        <p className="flex flex-1 items-center justify-center rounded-lg bg-white px-4 py-6 text-center text-[12.5px] leading-[1.4] text-ink-2">{frozen}</p>
      ) : rows.length === 0 ? (
        <p className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white px-4 py-6 text-center text-[12px] leading-[1.4] text-ink-2">
          <ICONS.taskDone size={18} aria-hidden className="shrink-0 text-ok" />
          {side === "independent" ? "You're all caught up. Nothing is waiting on you." : "Nothing is waiting on you: no work to review, and none of your own open."}
        </p>
      ) : (
        <TaskList rows={rows} byId={work.byId} ctx={{ side, base, today, counterpart }} mover={mover} />
      )}
      {rows.length > ROWS && (
        <Link href={allHref} className="mt-3 self-start text-[13px] leading-[1.2] font-medium tracking-[0.2px] text-primary hover:underline">
          {rows.length - ROWS} more in the Work tab
        </Link>
      )}
      <WorkMessages />
    </DashboardSummaryCard>
  );
}

/** The person moving rows: their actions on the work, as the repository's person, and which rows the rules let them place (TB-142). */
function useMover(side: Side, me: string, counterpart: string, access: WorkAccess) {
  const role = side === "team" ? "manager" : "contributor";
  const names = side === "team" ? { team: firstName(me), independent: counterpart } : { team: counterpart, independent: firstName(me) };
  const actions = useWorkActions({ role, name: me }, names);
  return { actions, canMove: (t: WorkItem) => reorderFor(t, { role }, access, names).ok };
}

type Mover = ReturnType<typeof useMover>;

/** What a row needs besides its task: whose list it is, where its sheet opens, today, and the other side's first name. */
type RowCtx = { side: Side; base: string; today: Day; counterpart: string };

/** My tasks' one list, as the drag knows it. */
const LIST = "my-tasks";

/** Lands a dragged row at slot `index`: its new place in the manual order, in one save, unless that leaves it where it was. */
function dropRow({ actions }: Mover, items: readonly WorkItem[], t: WorkItem, index: number) {
  const place = placeAt(items, t.id, index);
  const now = placeAt(items, t.id, items.findIndex((x) => x.id === t.id));
  if (now.after === place.after && now.before === place.before) return;
  void actions.move(t, place, { announce: `Moved ${refOf(t)}` });
}

/**
 * The first ROWS rows, dragged the way the Board's cards are (card-drag): a row lifts out as a solid
 * copy under the pointer, the others part where it would land, and it takes that place in the
 * manual order when it's let go. Alt+Shift+↑/↓ moves a focused row a step. Either way it's one
 * save, shown at once, and the Work tab's order is the same one.
 */
function TaskList({ rows, byId, ctx, mover }: { rows: readonly AgendaRow[]; byId: ReadonlyMap<string, WorkItem>; ctx: RowCtx; mover: Mover }) {
  const items = useMemo(() => rows.map((r) => r.item), [rows]);
  const lists = useMemo(() => [{ key: LIST, items }], [items]);
  const dnd = useCardDrag(lists, byId);
  const cards = useRef(new Map<string, HTMLElement>());
  const { drag, over, setOver } = dnd;
  const rest = items.filter((t) => t.id !== drag?.id);
  const room = drag && over ? drag.room : 0;
  const step = (e: KeyboardEvent, t: WorkItem) => {
    if (e.altKey && e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) stepByKey(t, items, e, mover.actions);
  };
  return (
    <ul
      className="flex flex-col gap-2"
      onDragOver={(e) => {
        if (!drag) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const index = slotAt(items, e.clientY, drag.id, cards.current);
        if (over?.index !== index) setOver({ key: LIST, index });
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null);
      }}
      onDrop={(e) => {
        e.preventDefault();
        const t = dnd.dragged;
        const index = over?.index;
        dnd.onDragEnd();
        if (t && index !== undefined) dropRow(mover, items, t, index);
      }}
    >
      {rows.slice(0, ROWS).map((row) => (
        <li key={row.item.id} hidden={dnd.lifted === row.item.id} className={drag ? "transition-transform duration-200 ease-out" : undefined} style={over && rest.indexOf(row.item) >= over.index && room ? { transform: `translateY(${room}px)` } : undefined}>
          <TaskRow row={row} ctx={ctx} cards={cards} drag={mover.canMove(row.item) ? { onStart: (e) => dnd.onDragStart(row.item, e), onEnd: dnd.onDragEnd, onKey: (e) => step(e, row.item) } : undefined} />
        </li>
      ))}
      {/* After a row, -mt-2 takes back the list's gap before it, so a closed spacer adds nothing. */}
      {drag && <li aria-hidden className="-mt-2 shrink-0 transition-[height] duration-200 ease-out" style={{ height: room }} />}
    </ul>
  );
}

/** The card's count line, "2 to review · 1 to do": each side's own order, leaving out what has none. */
function summaryOf(rows: readonly AgendaRow[], side: Side) {
  const count = (keep: (r: AgendaRow) => boolean) => rows.filter(keep).length;
  return [
    side === "team" ? ([count((r) => r.reason === "review"), "to review"] as const) : null,
    [count((r) => r.item.status === "todo"), "to do"] as const,
    [count((r) => r.item.status === "doing"), "in progress"] as const,
    side === "independent" ? ([count((r) => r.reason === "review"), "in review"] as const) : null,
  ]
    .filter((part) => part !== null && part[0] > 0)
    .map((part) => `${part?.[0]} ${part?.[1]}`)
    .join(" · ");
}

type Lead = { href: string; title: string; meta: string; overdue?: boolean };

/** What needs this person before any task, above the list and outlined in the star's yellow; an overdue one says so in red. */
function LeadRow({ lead }: { lead: Lead }) {
  return (
    <Link href={lead.href} className="mb-2 flex min-h-12 items-center gap-3 rounded-lg bg-white px-3 py-2 outline -outline-offset-1 outline-[#f2c94c] hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary">
      <ICONS.star size={16} aria-hidden className="shrink-0 text-[#d99a00]" />
      <span className="min-w-0 flex-1 truncate text-[14px] leading-[1.3] font-medium tracking-[0.2px] text-ink">{lead.title}</span>
      <span className={`shrink-0 text-[12px] leading-[1.2] font-medium ${lead.overdue ? "text-danger" : "text-[#8e6f12]"}`}>{lead.meta}</span>
      <ICONS.chevronRight size={16} aria-hidden className="shrink-0 text-ink-2" />
    </Link>
  );
}

/** How a row this person places moves: dragged whole (its grip shows it can be), or Alt+Shift+↑/↓. */
type RowDrag = { onStart: (e: DragEvent) => void; onEnd: () => void; onKey: (e: KeyboardEvent) => void };

/** One task, opening its sheet: its status in words, number and title, then why it's on the list. It's in `cards` while it's drawn, for the drag to measure. */
function TaskRow({ row: { item: t, reason }, ctx: { side, base, today, counterpart }, cards, drag }: { row: AgendaRow; ctx: RowCtx; cards: RefObject<Map<string, HTMLElement>>; drag?: RowDrag }) {
  return (
    <Link
      href={`${base}?task=${encodeURIComponent(t.id)}`}
      ref={(el) => {
        if (el) cards.current.set(t.id, el);
        else cards.current.delete(t.id);
      }}
      data-item-id={t.id}
      draggable={!!drag}
      onDragStart={drag?.onStart}
      onDragEnd={drag?.onEnd}
      onKeyDown={drag?.onKey}
      aria-keyshortcuts={drag ? "Alt+Shift+ArrowUp Alt+Shift+ArrowDown" : undefined}
      className="group flex min-h-12 items-center gap-3 rounded-lg bg-white px-3 py-2 hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary"
    >
      {drag && <ICONS.drag size={16} aria-hidden className="-mx-1 shrink-0 cursor-grab text-[#c4c4c4] group-hover:text-ink-2" />}
      {/* No tooltip on the circle: a tooltip trigger can't sit inside a link. Its status is said in words instead. */}
      <StatusCircle status={t.status} size={16} />
      <span className="sr-only">{STATUS_META[t.status].label}:</span>
      {/* On a phone why it's here drops under the title, so neither is cut short. */}
      <span className="flex min-w-0 flex-1 items-center gap-3 max-sm:flex-col max-sm:items-start max-sm:gap-1">
        <span className="flex min-w-0 flex-1 items-baseline gap-1.5 leading-[1.3] tracking-[0.2px] max-sm:w-full">
          <span className="shrink-0 text-[12px] text-ink-2 tabular-nums">{refOf(t)}</span>
          <span className="truncate text-[14px] font-medium text-ink">{t.title}</span>
        </span>
        {/* Why it's here, in the words and chips the board uses. */}
        <span className="flex shrink-0 items-center gap-3">
          {reason === "changes" && <ChangesChip />}
          {side === "team" && t.assignee === null && <span className="text-[12px] leading-[1.2] text-ink-2">Unassigned</span>}
          {reason !== "review" && <DueChip item={t} today={today} />}
          {reason === "review" &&
            (side === "team" ? (
              // The row is the link; this only says what it leads to, the way the board card's Review button does.
              <span className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-[12px] leading-none font-medium text-white">Review</span>
            ) : (
              <span className="text-[12px] leading-[1.2] text-ink-2">With {counterpart} for review</span>
            ))}
        </span>
      </span>
      <ICONS.chevronRight size={16} aria-hidden className="shrink-0 text-ink-2" />
    </Link>
  );
}
