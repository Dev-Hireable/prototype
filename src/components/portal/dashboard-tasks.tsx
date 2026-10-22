"use client";

import Link from "next/link";
import { useState, type DragEvent, type KeyboardEvent } from "react";
import { ICONS } from "@/components/icons";
import { DashboardSummaryCard } from "@/components/portal/dashboard";
import { StatusCircle } from "@/components/portal/tasks/task-bits";
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
        <TaskList rows={rows} ctx={{ side, base, today, counterpart }} mover={mover} />
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

/** The rows with the dragged one moved to where it's being dragged. */
function movedTo(rows: readonly AgendaRow[], { id, at }: { id: string; at: number }): readonly AgendaRow[] {
  const from = rows.findIndex((r) => r.item.id === id);
  if (from < 0) return rows;
  const rest = rows.filter((r) => r.item.id !== id);
  return [...rest.slice(0, at), rows[from], ...rest.slice(at)];
}

/**
 * The first ROWS rows. A row dragged onto another takes its place there and then, the others making
 * room, and lands in the manual order when it's let go; Alt+Shift+↑/↓ moves a focused row a step.
 * Either way it's one save, shown at once, and the Work tab's order is the same one.
 */
function TaskList({ rows, ctx, mover }: { rows: readonly AgendaRow[]; ctx: RowCtx; mover: Mover }) {
  const items = rows.map((r) => r.item);
  const [drag, setDrag] = useState<{ id: string; at: number } | null>(null);
  const shown = rows.slice(0, ROWS);
  const order = drag ? movedTo(shown, drag) : shown;
  const grab = (e: DragEvent, id: string, at: number) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    setDrag({ id, at });
  };
  const over = (e: DragEvent, at: number) => {
    if (!drag) return;
    e.preventDefault();
    if (drag.at !== at) setDrag({ ...drag, at });
  };
  /** Let go over the list: one save of the row's new place, unless it's back where it was. */
  const drop = (e: DragEvent) => {
    if (!drag) return;
    e.preventDefault();
    const t = items.find((x) => x.id === drag.id);
    if (t && items.indexOf(t) !== drag.at) void mover.actions.move(t, placeAt(items, t.id, drag.at), { announce: `Moved ${refOf(t)}` });
    setDrag(null);
  };
  const step = (e: KeyboardEvent, t: WorkItem) => {
    if (e.altKey && e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) stepByKey(t, items, e, mover.actions);
  };
  return (
    <ul className="flex flex-col gap-2" onDragOver={(e) => over(e, drag?.at ?? 0)} onDrop={drop}>
      {order.map((row, i) => (
        <li key={row.item.id} onDragOver={(e) => over(e, i)} className={drag?.id === row.item.id ? "opacity-50" : undefined}>
          <TaskRow row={row} ctx={ctx} drag={mover.canMove(row.item) ? { onStart: (e) => grab(e, row.item.id, i), onEnd: () => setDrag(null), onKey: (e) => step(e, row.item) } : undefined} />
        </li>
      ))}
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

/** One task, opening its sheet: its status in words, number and title, then why it's on the list. */
function TaskRow({ row: { item: t, reason }, ctx: { side, base, today, counterpart }, drag }: { row: AgendaRow; ctx: RowCtx; drag?: RowDrag }) {
  return (
    <Link
      href={`${base}?task=${encodeURIComponent(t.id)}`}
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
