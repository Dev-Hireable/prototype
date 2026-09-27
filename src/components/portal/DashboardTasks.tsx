"use client";

import Link from "next/link";
import { ICONS } from "@/components/admin/icons";
import { DashboardSummaryCard } from "@/components/portal/dashboard";
import { StatusCircle } from "@/components/portal/tasks/task-bits";
import { ChangesChip, DueChip } from "@/components/workspace/meta";
import { agendaOf, type AgendaRow } from "@/lib/work/agenda";
import { todayDay, type Day } from "@/lib/work/dates";
import { refOf, STATUS_META, type Side } from "@/lib/work/model";
import { useWork } from "@/lib/work/store";

/** Rows the card lists; the rest are a click away in the contract's Work tab. */
const ROWS = 5;

/**
 * IN-090 / TB-147 — someone's open tasks on their dashboard, most pressing first (see agendaOf).
 * The Independent sees what came back with changes, what's overdue, what's under way and what's
 * next, then what's waiting on review. The Team Builder sees the Independent's work waiting on
 * their review first, then their own and unassigned work. Each row opens that task's sheet in the
 * contract's Work tab, where a review is one click from Approve or Request changes. Only the live
 * contract has a work list, so the dashboards show this while there is one.
 */
export function DashboardTasks({
  side,
  base,
  allHref,
  about,
  counterpart,
  lead,
  frozen,
}: {
  side: Side;
  /** The contract's page; a row adds `?task=`. */
  base: string;
  /** The Work tab, on what this person works on. */
  allHref: string;
  /** Which contract: "Brand Designer at Nairobi Solutions Inc.", "Juan Dela Cruz · Brand Designer". */
  about: string;
  /** The other side's first name. */
  counterpart: string;
  /** What needs this person before any task: the trial's evaluation, the hiring decision, an offer to answer. */
  lead?: { href: string; title: string; meta: string };
  /** Said in place of the tasks while they can't move — a trial that's over and being decided. */
  frozen?: string;
}) {
  const work = useWork();
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
          {side === "independent" ? "You're all caught up — nothing is waiting on you." : "Nothing is waiting on you — no work to review, and none of your own open."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.slice(0, ROWS).map((row) => (
            <li key={row.item.id}>
              <TaskRow row={row} side={side} href={`${base}?task=${encodeURIComponent(row.item.id)}`} today={today} counterpart={counterpart} />
            </li>
          ))}
        </ul>
      )}
      {rows.length > ROWS && (
        <Link href={allHref} className="mt-3 self-start text-[13px] leading-[1.2] font-medium tracking-[0.2px] text-primary hover:underline">
          {rows.length - ROWS} more in the Work tab
        </Link>
      )}
    </DashboardSummaryCard>
  );
}

/** The card's count line, "2 to review · 1 to do": each side's own order, leaving out what has none. */
function summaryOf(rows: AgendaRow[], side: Side) {
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

/** What needs this person before any task, above the list and outlined in the star's yellow. */
function LeadRow({ lead }: { lead: { href: string; title: string; meta: string } }) {
  return (
    <Link href={lead.href} className="mb-2 flex min-h-12 items-center gap-3 rounded-lg bg-white px-3 py-2 outline -outline-offset-1 outline-[#f2c94c] hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary">
      <ICONS.star size={16} aria-hidden className="shrink-0 text-[#d99a00]" />
      <span className="min-w-0 flex-1 truncate text-[14px] leading-[1.3] font-medium tracking-[0.2px] text-ink">{lead.title}</span>
      <span className="shrink-0 text-[12px] leading-[1.2] font-medium text-[#8e6f12]">{lead.meta}</span>
      <ICONS.chevronRight size={16} aria-hidden className="shrink-0 text-ink-2" />
    </Link>
  );
}

/** One task, opening its sheet: its status in words, number and title, then why it's on the list. */
function TaskRow({ row: { item: t, reason }, side, href, today, counterpart }: { row: AgendaRow; side: Side; href: string; today: Day; counterpart: string }) {
  return (
    <Link href={href} className="flex min-h-12 items-center gap-3 rounded-lg bg-white px-3 py-2 hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary">
      {/* No tooltip on the circle: a tooltip trigger can't sit inside a link. Its status is said in words instead. */}
      <StatusCircle status={t.status} size={16} />
      <span className="sr-only">{STATUS_META[t.status].label}:</span>
      <span className="flex min-w-0 flex-1 items-baseline gap-1.5 leading-[1.3] tracking-[0.2px]">
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
      <ICONS.chevronRight size={16} aria-hidden className="shrink-0 text-ink-2" />
    </Link>
  );
}
