"use client";

import { lockedReason } from "@/lib/work/permissions";
import { projectKeyOf } from "@/lib/work/projects";
import { Tip } from "@/components/portal/tip";
import type { ReactNode } from "react";
import { ICONS } from "@/components/icons";
import type { ColumnColors } from "@/components/portal/board";
import { PersonChip } from "@/components/portal/tasks/task-bits";
import { TYPE_ICON, type TaskPeople } from "./labels";
import { dayOf, longLabel, relativeLabel, type Day } from "@/lib/work/dates";
import type { Group } from "@/lib/work/query";
import { useOptionalWorkspace } from "./context";
import { isOverdue, refOf, TAG_COLORS, tagColorOf, TYPE_META, type Assignee, type WorkItem, type WorkType } from "@/lib/work/model";

/**
 * How work reads in the workspace — the look that goes with the domain's tables (@/lib/work/model):
 * an icon per work type, the column palette per status, and the small chips cards and rows are
 * made of. Every chip says what it means in words; colour only reinforces it.
 */

/** A group's name and count on its colours — the heading of a List group and a Timeline band. */
export function GroupLabel({ group, colors, children }: { group: Group; colors: ColumnColors; children?: ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-2 text-[13px] leading-[1.2] font-semibold whitespace-nowrap" style={{ color: colors.text }}>
      <span className="truncate">{group.label}</span>
      <span className="min-w-6 rounded px-1.5 py-0.5 text-center text-[12px] font-medium tabular-nums" style={{ background: colors.count }}>
        {group.items.length}
        <span className="sr-only">{group.items.length === 1 ? " item" : " items"}</span>
      </span>
      {children}
    </span>
  );
}

const CHIP = "inline-flex h-6 max-w-full items-center gap-1 rounded px-1.5 text-[12px] leading-[1.2] font-medium whitespace-nowrap";

/** A fact on a card's details line: an icon and a few words, grey, with no box around it. */
const FACT = "inline-flex max-w-full items-center gap-1 text-[12px] leading-[1.2] whitespace-nowrap text-ink-2";

export function TypeChip({ type, iconOnly = false, plain = false }: { type: WorkType; iconOnly?: boolean; /** A card's details line: no box. */ plain?: boolean }) {
  const Icon = ICONS[TYPE_ICON[type]];
  if (iconOnly) return <Icon size={15} aria-label={TYPE_META[type].label} className="shrink-0 text-ink-2" />;
  if (plain)
    return (
      <span className={FACT}>
        <Icon size={14} aria-hidden className="shrink-0" />
        {TYPE_META[type].label}
      </span>
    );
  return (
    <span className={`${CHIP} bg-surface-2 text-ink-2`}>
      <Icon size={14} aria-hidden className="shrink-0" />
      {TYPE_META[type].label}
    </span>
  );
}

/**
 * "#12" — quiet, for finding an item again, set just before its name as the list, calendar and
 * timeline set it. An inline block, so a done item's line-through doesn't strike it too. Nothing
 * until the item has its number: the card already says it's saving.
 */
export function Ref({ item }: { item: Pick<WorkItem, "number"> }) {
  if (!item.number) return null;
  return <span className="mr-1.5 inline-block text-[12px] leading-none font-normal text-ink-2 tabular-nums">{refOf(item)}</span>;
}

/** The due date: "Today", "30 Sep" — and in words when it has gone by. */
export function DueChip({ item, today }: { item: WorkItem; today: Day }) {
  const due = dayOf(item.due);
  if (due === null) return null;
  const late = isOverdue(item, today);
  return (
    <span className={`${FACT} ${late ? "font-medium !text-danger" : ""}`} aria-label={`${late ? "Overdue, was due" : "Due"} ${longLabel(due)}`}>
      <ICONS.calendar size={13} aria-hidden className="shrink-0" />
      {late ? `Overdue · ${relativeLabel(due, today)}` : relativeLabel(due, today)}
    </span>
  );
}

export function EffortChip({ effort }: { effort?: number }) {
  if (effort === undefined) return null;
  return (
    <span className={`${FACT} tabular-nums`} aria-label={`Effort ${effort}`}>
      <ICONS.effort size={13} aria-hidden className="shrink-0" />
      {effort}
    </span>
  );
}

/** Priority as a flag in its colour and the word, quiet enough to sit among the other facts. */
export function PriorityFact({ priority }: { priority: WorkItem["priority"] }) {
  if (!priority) return null;
  const tone = { high: "text-danger", medium: "text-[#d99a00]", low: "text-primary" }[priority];
  return (
    <span className={FACT}>
      <ICONS.flag size={14} aria-hidden className={`shrink-0 ${tone}`} />
      {PRIORITY_WORD[priority]}
    </span>
  );
}

const PRIORITY_WORD = { high: "High", medium: "Medium", low: "Low" } as const;

export function BlockedChip({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className={`${CHIP} bg-[#fcf2f2] text-danger`}>
      <ICONS.blocked size={13} aria-hidden className="shrink-0" />
      Blocked
      {count > 1 ? ` by ${count}` : ""}
    </span>
  );
}

/**
 * A tag in its colour — the one chosen for it on this contract, else the one its name gives it. The
 * chosen colours come from the workspace, so no card or row can show a stale one by leaving them
 * out (the board's cards did, and kept the default after a tag was recoloured); `colors` overrides.
 */
export function TagChip({ tag, colors, onRemove, colorMenu }: { tag: string; colors?: Readonly<Record<string, string>>; onRemove?: () => void; /** The palette, when the tag's colour can be changed: the chip's name opens it. */ colorMenu?: (trigger: ReactNode) => ReactNode }) {
  const env = useOptionalWorkspace();
  const c = TAG_COLORS[tagColorOf(tag, colors ?? env?.tagColors)];
  const name = (
    <>
      <ICONS.tag size={12} aria-hidden className="shrink-0" />
      <span className="truncate">{tag}</span>
    </>
  );
  return (
    <span className={CHIP} style={{ background: c.bg, color: c.text }}>
      {colorMenu ? colorMenu(name) : name}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove tag ${tag}`} className="-mr-0.5 flex size-4 items-center justify-center rounded hover:bg-white/70">
          <ICONS.close size={12} aria-hidden />
        </button>
      )}
    </span>
  );
}

/** Who does it: their photo and first name, or "Unassigned". */
export function AssigneeChip({ assignee, people, size = 20 }: { assignee: Assignee | null; people: TaskPeople; size?: number }) {
  if (!assignee)
    return (
      <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] leading-[1.2] text-ink-2">
        <span className="flex shrink-0 items-center justify-center rounded-full bg-surface-2" style={{ width: size, height: size }}>
          <ICONS.unassigned size={size - 7} aria-hidden />
        </span>
        Unassigned
      </span>
    );
  return <PersonChip {...people[assignee]} size={size} />;
}

/** The same shape as Blocked: both say the item can't simply go on. */
export function ChangesChip() {
  return (
    <span className={`${CHIP} bg-warn-bg text-[#7a5e0a]`}>
      <ICONS.undo size={13} aria-hidden className="shrink-0" />
      Changes requested
    </span>
  );
}

/**
 * One figure in the Work tab's summary strip: a mark (an icon, a dot, a small bar), then the words
 * with the number in ink and the rest in grey. The strip puts a hairline between figures.
 */
export function SummaryStat({ mark, tone = "", children }: { mark?: ReactNode; tone?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${tone}`}>
      {mark}
      <span>{children}</span>
    </span>
  );
}

/** A coloured dot for a summary figure. */
export const StatDot = ({ className }: { className: string }) => <span aria-hidden className={`size-2 shrink-0 rounded-full ${className}`} />;

/**
 * TB-148 — where an item sits, on its card or row when the view mixes places: its project, or the
 * trial. Nothing for work outside a project — that's the default, and saying so on every card is noise.
 */
export function PlaceChip({ item }: { item: WorkItem }) {
  const env = useOptionalWorkspace();
  if (!env?.projects.showPlace) return null;
  const place = env.projects.places.find((p) => p.key === projectKeyOf(item, env.projects.ctx));
  if (!place || place.kind === "none") return null;
  return (
    <span className={`${FACT} min-w-0`}>
      <ICONS.project size={14} aria-hidden className="shrink-0" />
      <span className="truncate">{place.name}</span>
      <span className="sr-only">{place.kind === "trial" ? " (the trial)" : " (project)"}</span>
    </span>
  );
}

/** Finished work — a finished project's, the trial's — reads as read-only, saying why on hover. */
export function LockChip({ item }: { item: WorkItem }) {
  const env = useOptionalWorkspace();
  const why = env ? lockedReason(item, env.access) : null;
  if (!why) return null;
  return (
    <Tip label={why}>
      <span className={FACT} aria-label={`Read-only: ${why}`}>
        <ICONS.lock size={14} aria-hidden /> Read-only
      </span>
    </Tip>
  );
}
