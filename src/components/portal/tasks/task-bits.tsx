"use client";

import { ICONS } from "@/components/icons";
import { Avatar, StatusDot } from "@/components/portal/ui";
import type { Tone } from "@/lib/portal/tone";
import { Tip } from "@/components/portal/tip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { firstName } from "@/components/workspace/labels";
import { PRIORITY_LABEL, TASK_STATUS_LABEL, weekLabel } from "@/lib/demo/tasks";
import type { TaskPriority, TaskStatus } from "@/lib/demo/tasks";
import { PRIORITIES } from "@/lib/work/model";

/**
 * The small parts a task is drawn from, shared by the contract workspace (@/components/workspace)
 * and the job post / offer task editor (TaskPlan). They are the app's own pieces (StatusDot, Avatar,
 * Tip) and shadcn's DropdownMenu, so a task looks like everything else in the portals.
 */

const STATUS_TONE: Record<TaskStatus, Tone> = { todo: "neutral", doing: "info", review: "warn", done: "ok" };
const PRIORITY_TONE: Record<TaskPriority, Tone> = { high: "danger", medium: "warn", low: "info" };

export function StatusPill({ status }: { status: TaskStatus }) {
  return <StatusDot tone={STATUS_TONE[status]}>{TASK_STATUS_LABEL[status]}</StatusDot>;
}

export function PriorityPill({ priority }: { priority: TaskPriority }) {
  return <StatusDot tone={PRIORITY_TONE[priority]}>{PRIORITY_LABEL[priority]}</StatusDot>;
}

/**
 * The circle at the front of a task, as in Notion and Asana: an empty ring to do, then filled in
 * the status's colour — solid blue while it's in progress, solid amber while it waits on review,
 * green with a tick once it's done. In progress and review carry no glyph (the user's call: plain
 * colour reads cleaner); the status name is still in its tooltip and label, and beside it wherever
 * the circle stands alone. With `onClick` it is the task's next step — for the talent, sending it
 * for review — and hovering previews the tick.
 */
export function StatusCircle({ status, onClick, label, size = 18 }: { status: TaskStatus; onClick?: () => void; label?: string; size?: number }) {
  const Check = ICONS.check;
  const fill = {
    todo: "border-[#a6a6a6] bg-white",
    doing: "border-primary bg-primary text-white",
    review: "border-warn bg-warn text-[#4d3800]",
    done: "border-ok bg-ok text-white",
  }[status];
  const hover = !!onClick;
  const body = (
    <span className={`relative flex shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${fill} ${hover ? "group-hover/circle:border-ok group-hover/circle:bg-[#eef9f2]" : ""}`} style={{ width: size, height: size }}>
      {status === "done" ? (
        <Check size={size - 6} aria-hidden />
      ) : (
        hover && <Check size={size - 6} aria-hidden className="absolute text-ok opacity-0 group-hover/circle:opacity-100" />
      )}
    </span>
  );
  if (!onClick) return label ? <Tip label={label}>{body}</Tip> : body;
  return (
    <Tip label={label}>
      <button type="button" aria-label={label} onClick={onClick} className="group/circle flex shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        {body}
      </button>
    </Tip>
  );
}

/** A compact control that looks like its value: a pill, a date, a placeholder until something is set. */
const TRIGGER = "inline-flex h-7 max-w-full items-center gap-1 rounded-md px-1.5 text-[13px] leading-[1.2] text-ink-2 transition hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary data-popup-open:bg-surface-2";

/** Priority as a pill, and a menu to change it when this side can. */
export function PriorityMenu({ priority, onChange, placeholder = "Set priority" }: { priority?: TaskPriority; onChange?: (p: TaskPriority | null) => void; /** What an unset priority reads as while it can be set. */ placeholder?: string }) {
  const current = priority ? <PriorityPill priority={priority} /> : <span className="text-ink-2">{onChange ? placeholder : "—"}</span>;
  if (!onChange) return <span className="inline-flex h-7 items-center px-1.5 text-[13px]">{current}</span>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={priority ? `Priority: ${PRIORITY_LABEL[priority]}` : "Set priority"} className={TRIGGER}>
        {current}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {/* A label has to sit in a group (Base UI's GroupLabel throws outside one). */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Priority</DropdownMenuLabel>
          {PRIORITIES.map((p) => (
            <DropdownMenuItem key={p} onClick={() => onChange(p)}>
              <PriorityPill priority={p} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {priority && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onChange(null)}>No priority</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** A due week on a proposed task ("Week 2"), and a menu of the weeks the proposal can plan across. */
export function WeekMenu({ week, weeks, onChange }: { week?: number; weeks: number; onChange: (w: number | undefined) => void }) {
  const Icon = ICONS.calendar;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={week ? `Due ${weekLabel(week)}` : "Set a due week"} className={TRIGGER}>
        <Icon size={14} aria-hidden className="text-ink-2" />
        <span className={week ? "text-ink" : ""}>{week ? weekLabel(week) : "Due week"}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Due by the end of</DropdownMenuLabel>
          {Array.from({ length: weeks }, (_, i) => i + 1).map((w) => (
            <DropdownMenuItem key={w} onClick={() => onChange(w)}>
              {weekLabel(w)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {week && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onChange(undefined)}>No due week</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** A person's photo and first name, in the app's Avatar. */
export function PersonChip({ name, avatar, size = 20 }: { name: string; avatar: string; size?: number }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] leading-[1.2] text-ink">
      <Avatar src={avatar} size={size} />
      <span className="truncate">{firstName(name)}</span>
    </span>
  );
}
