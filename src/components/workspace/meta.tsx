"use client";

import { lockedReason } from "@/lib/work/permissions";
import { projectKeyOf } from "@/lib/work/projects";
import { Tip } from "@/components/portal/tip";
import type { ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { CountPill, type ColumnColors } from "@/components/portal/board";
import { PersonChip } from "@/components/portal/tasks/task-bits";
import { Badge } from "@/components/portal/badge";
import { Avatar } from "@/components/portal/ui";
import { firstName, TYPE_ICON, type TaskPeople } from "./labels";
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
      <CountPill background={colors.count}>
        {group.items.length}
        <span className="sr-only">{group.items.length === 1 ? " item" : " items"}</span>
      </CountPill>
      {children}
    </span>
  );
}

/** A tag's chip: the badge's shape, coloured from the tag palette rather than a badge tone. */
const CHIP = "inline-flex h-6 max-w-full items-center gap-1 rounded px-1.5 text-[12px] leading-[1.2] font-medium whitespace-nowrap";

/** A fact on a card's details line: an icon and a few words, grey, with no box around it. */
const FACT = "inline-flex max-w-full items-center gap-1 text-[12px] leading-[1.2] whitespace-nowrap text-ink-2";

/**
 * A fact's words, trimmed to their capitals so the icon beside them centres on the letters, not on
 * a line box Chrome rounds (up to a pixel off). Cut short with an ellipsis that clips sideways only,
 * so a "y" or "g" still hangs below.
 */
export function FactText({ children, truncate = false }: { children: ReactNode; truncate?: boolean }) {
  return <span className={`trim-to-caps ${truncate ? "min-w-0 overflow-x-clip text-ellipsis" : ""}`}>{children}</span>;
}

export function TypeChip({ type, iconOnly = false, plain = false }: { type: WorkType; iconOnly?: boolean; /** A card's details line: no box. */ plain?: boolean }) {
  const Icon = ICONS[TYPE_ICON[type]];
  if (iconOnly) return <Icon size={15} aria-label={TYPE_META[type].label} className="shrink-0 text-ink-2" />;
  if (plain)
    return (
      <span className={FACT}>
        <Icon size={14} aria-hidden className="shrink-0" />
        <FactText>{TYPE_META[type].label}</FactText>
      </span>
    );
  return (
    <Badge icon={<Icon aria-hidden />}>{TYPE_META[type].label}</Badge>
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
      <FactText>{late ? `Overdue · ${relativeLabel(due, today)}` : relativeLabel(due, today)}</FactText>
    </span>
  );
}

export function EffortChip({ effort }: { effort?: number }) {
  if (effort === undefined) return null;
  return (
    <span className={`${FACT} tabular-nums`} aria-label={`Effort ${effort}`}>
      <ICONS.effort size={13} aria-hidden className="shrink-0" />
      <FactText>{effort}</FactText>
    </span>
  );
}

export function BlockedChip({ count }: { count: number }) {
  if (!count) return null;
  return (
    <Badge tone="danger" icon={<ICONS.blocked aria-hidden />}>
      Blocked
      {count > 1 ? ` by ${count}` : ""}
    </Badge>
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
  // On a phone the × is the chip's height, a little further from the name, and a 32px target on touch:
  // at 16px it sat flush against the name, which opens the colours.
  return (
    <span className={`${CHIP} ${onRemove ? "max-md:gap-1.5" : ""}`} style={{ background: c.bg, color: c.text }}>
      {colorMenu ? colorMenu(name) : name}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove tag ${tag}`} className="hit-area -mr-0.5 flex size-4 items-center justify-center rounded [--hit:32px] hover:bg-white/70 max-md:-mr-1.5 max-md:size-6">
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

/**
 * Who does it, as their photo alone — or the unassigned mark — with the name as its tip and its
 * accessible name: for a column too narrow for names (the Workload's, on a phone).
 */
export function AssigneeAvatar({ assignee, people, size = 28 }: { assignee: Assignee | null; people: TaskPeople; size?: number }) {
  const name = assignee ? firstName(people[assignee].name) : "Unassigned";
  return (
    <Tip label={name} tap>
      <span role="img" aria-label={name} className="inline-flex">
        {assignee ? (
          <Avatar src={people[assignee].avatar} size={size} />
        ) : (
          <span className="flex items-center justify-center rounded-full bg-surface-2 text-ink-2" style={{ width: size, height: size }}>
            <ICONS.unassigned size={size - 10} aria-hidden />
          </span>
        )}
      </span>
    </Tip>
  );
}

/** The same badge as Blocked: both say the item can't simply go on. */
export function ChangesChip() {
  return (
    <Badge tone="warn" icon={<ICONS.undo aria-hidden />}>
      Changes requested
    </Badge>
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
      <FactText truncate>{place.name}</FactText>
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
        <ICONS.lock size={14} aria-hidden className="shrink-0" />
        <FactText>Read-only</FactText>
      </span>
    </Tip>
  );
}
