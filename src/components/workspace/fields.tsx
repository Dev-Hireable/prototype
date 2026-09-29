"use client";

import { useMemo, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { ICONS, type IconName } from "@/components/icons";
import { DatePicker } from "@/components/portal/date-picker";
import { PriorityMenu, PriorityPill, StatusCircle, StatusPill } from "@/components/portal/tasks/task-bits";
import { Tip } from "@/components/portal/tip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dayOf, isoOf, longLabel, relativeLabel, type Day } from "@/lib/work/dates";
import { ASSIGNEE_KEYS, assigneeKey, assigneeOf, EFFORT_HELP, EFFORT_MAX, EFFORT_PRESETS, isArchived, isCompleted, refOf, STATUS_META, TAG_COLOR_KEYS, TAG_COLORS, tagColorOf, TYPE_META, WORK_TYPES, type TagColor, type WorkItem, type WorkStatus } from "@/lib/work/model";
import { matchesSearch } from "@/lib/work/query";
import { capsFor, changeFor, targetsFor, transitionFor, type AgreedField, type TransitionKind, type WorkField } from "@/lib/work/permissions";
import { anyDateAllowed, checkDependency, checkEffort, checkTag, dateAllowed, normalizeTag, type DateRules } from "@/lib/work/validate";
import { movedTo, NO_PROJECT, NO_PROJECT_NAME, projectKeyOf } from "@/lib/work/projects";
import { LockedValue } from "./contract-lock";
import { lockable } from "./lockable";
import { useWorkspace, type WorkspaceEnv } from "./context";
import { AssigneeChip, TagChip, TypeChip } from "./meta";
import { fromISODate, isoDay } from "@/lib/portal/dates";
import { TYPE_ICON } from "./labels";

/**
 * The editors an item's fields are changed with — in the list's cells and in the item's panel.
 * Each asks the same permission functions the repository enforces; without the right, it shows
 * the value as plain text rather than a control that would only fail.
 */

const FIELD_TRIGGER =
  "inline-flex h-7 max-w-full min-w-0 items-center gap-1 rounded-md px-1.5 text-[13px] leading-[1.2] text-ink-2 transition hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary data-popup-open:bg-surface-2";

/**
 * A value that can't be changed, in the same 28px box and 6px inset as FIELD_TRIGGER — so plain and
 * editable values start on one line in the panel (they used to sit a few pixels apart, row to row).
 */
const READ_ONLY = "inline-flex h-7 max-w-full min-w-0 items-center gap-1 px-1.5 text-[13px] leading-[1.2] text-ink-2";

/** What trying a locked value does: the sheet's notice. Without one (a List cell) it's a toast. */
type OnLocked = (field: AgreedField) => void;

/** Whether this person can change `field` on `item` now — the same rule the repository saves by (changeFor). */
function useCanChange(item: WorkItem, field: WorkField): boolean {
  const { actor, access, names } = useWorkspace();
  return changeFor(item, actor, access, field, names).ok;
}

/**
 * A value this person can't change, where it would be edited: behind a lock when the signed offer set
 * it, so trying it says why; as plain text when it isn't theirs to change for who they are — or, with
 * a `reason` (no day is left to pick), as text that gives it on hover and focus.
 */
function ReadOnly({ item, field, onLocked, reason, children }: { item: WorkItem; field: WorkField; onLocked?: OnLocked; reason?: string; children: ReactNode }) {
  const { actor, access } = useWorkspace();
  if (lockable(item, field, actor.role, access))
    return (
      <LockedValue field={field} onLocked={onLocked}>
        {children}
      </LockedValue>
    );
  if (!reason) return <span className={READ_ONLY}>{children}</span>;
  return (
    <Tip label={reason}>
      {/* react-doctor-disable-next-line react-doctor/no-noninteractive-tabindex -- focusable so a keyboard can open the tip with the reason */}
      <span tabIndex={0} className={`${READ_ONLY} rounded-md focus-visible:outline-2 focus-visible:outline-primary`}>
        {children}
        <span className="sr-only">{` — ${reason}`}</span>
      </span>
    </Tip>
  );
}

const KIND_LABEL = (kind: TransitionKind, to: WorkStatus, names: { team: string }) =>
  ({
    start: "In progress",
    pause: "To do",
    submit: `Send to ${names.team} for review`,
    takeBack: `Take back to ${STATUS_META[to].label}`,
    approve: "Approve — mark Done",
    requestChanges: "Request changes…",
    complete: "Done",
    reopen: `Reopen as ${STATUS_META[to].label}`,
  })[kind];

/** Status as a pill, and a menu of the moves this person can make from it. */
export function StatusField({ item }: { item: WorkItem }) {
  const { actor, access, names, actions, openTask } = useWorkspace();
  const targets = isArchived(item) ? [] : targetsFor(item, actor, access);
  if (!targets.length)
    return (
      <span className={READ_ONLY}>
        <StatusPill status={item.status} />
      </span>
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Status: ${STATUS_META[item.status].label}. Change status`} className={FIELD_TRIGGER} onClick={(e) => e.stopPropagation()}>
        <StatusPill status={item.status} />
        <ICONS.chevron size={16} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60" onClick={(e) => e.stopPropagation()}>
        {targets.map((to) => {
          const t = transitionFor(item, actor, access, to, names);
          if (!t.ok) return null;
          return (
            <DropdownMenuItem
              key={to}
              onClick={() => {
                if (t.needsNote) openTask(item.id, "changes");
                else void actions.transition(item, to, undefined, { announce: `${refOf(item)} moved to ${STATUS_META[to].label}` });
              }}
            >
              <StatusCircle status={to} size={14} /> {KIND_LABEL(t.kind, to, names)}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AssigneeField({ item, onLocked }: { item: WorkItem; onLocked?: OnLocked }) {
  const { people, actions, assigneeLabel } = useWorkspace();
  const can = useCanChange(item, "assignee");
  if (!can)
    return (
      <ReadOnly item={item} field="assignee" onLocked={onLocked}>
        <AssigneeChip assignee={item.assignee} people={people} />
      </ReadOnly>
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Assignee: ${assigneeLabel(assigneeKey(item.assignee))}. Change assignee`} className={FIELD_TRIGGER} onClick={(e) => e.stopPropagation()}>
        <AssigneeChip assignee={item.assignee} people={people} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuRadioGroup
          value={assigneeKey(item.assignee)}
          onValueChange={(v) => {
            const assignee = assigneeOf(v as (typeof ASSIGNEE_KEYS)[number]);
            if (assignee !== item.assignee) void actions.patch(item, { assignee }, { announce: `${refOf(item)} assigned to ${assigneeLabel(v as (typeof ASSIGNEE_KEYS)[number])}` });
          }}
        >
          {ASSIGNEE_KEYS.map((k) => (
            <DropdownMenuRadioItem key={k} value={k} closeOnClick>
              <AssigneeChip assignee={assigneeOf(k)} people={people} />
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TypeField({ item, iconOnly = false, onLocked }: { item: WorkItem; iconOnly?: boolean; onLocked?: OnLocked }) {
  const { actions } = useWorkspace();
  const can = useCanChange(item, "type");
  if (!can)
    return (
      <ReadOnly item={item} field="type" onLocked={onLocked}>
        <TypeChip type={item.type} iconOnly={iconOnly} />
      </ReadOnly>
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Work type: ${TYPE_META[item.type].label}. Change work type`} className={FIELD_TRIGGER} onClick={(e) => e.stopPropagation()}>
        <TypeChip type={item.type} iconOnly={iconOnly} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-56" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuRadioGroup
          value={item.type}
          onValueChange={(v) => {
            const type = v as WorkItem["type"];
            if (type === item.type) return;
            // A milestone is a single date with no effort: clear them in the same save, and say so.
            const clears = type === "milestone" ? { ...(item.start ? { start: null } : {}), ...(item.effort !== undefined ? { effort: null } : {}) } : {};
            const cleared = Object.keys(clears).map((k) => (k === "start" ? "start date" : "effort"));
            void actions.patch(item, { type, ...clears }, cleared.length ? { success: `Now a milestone — its ${cleared.join(" and ")} ${cleared.length > 1 ? "were" : "was"} cleared, since a milestone is a single date.` } : { announce: `${refOf(item)} is now ${TYPE_META[type].label}` });
          }}
        >
          {WORK_TYPES.map((k) => {
            const Icon = ICONS[TYPE_ICON[k]];
            return (
              <DropdownMenuRadioItem key={k} value={k} closeOnClick>
                <Icon size={16} aria-hidden className="text-ink-2" />
                <span className="flex flex-col">
                  <span>{TYPE_META[k].label}</span>
                  <span className="text-[12px] text-ink-2">{TYPE_META[k].hint}</span>
                </span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * TB-148 — where an item sits: a project, or none. The Team Builder moves it into an active
 * project or out of one; everyone else reads it. The trial's finished work shows as "Trial".
 */
export function ProjectField({ item }: { item: WorkItem }) {
  const { actions, projects } = useWorkspace();
  const can = useCanChange(item, "project");
  const key = projectKeyOf(item, projects.ctx);
  const here = projects.places.find((p) => p.key === key);
  const name = here?.name ?? NO_PROJECT_NAME;
  const targets = projects.places.filter((p) => p.kind === "none" || (p.kind === "project" && !p.finished));
  const chip = (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-ink">
      <ICONS.project size={16} aria-hidden className="shrink-0 text-ink-2" />
      <span className="truncate">{name}</span>
    </span>
  );
  if (!projects.canPlan || !can) return <span className={READ_ONLY}>{chip}</span>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Project: ${name}. Move to another project`} className={FIELD_TRIGGER} onClick={(e) => e.stopPropagation()}>
        {chip}
        <ICONS.chevron size={16} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuRadioGroup
          value={key}
          onValueChange={(v) => {
            if (v === key) return;
            const to = targets.find((p) => p.key === v);
            void actions.patch(item, { project: v === NO_PROJECT ? null : v }, { announce: `${refOf(item)} moved ${movedTo(to)}` });
          }}
        >
          {targets.map((p) => (
            <DropdownMenuRadioItem key={p.key} value={p.key} closeOnClick>
              {p.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Priority: a menu for whoever plans the item; a task from the signed offer keeps the priority it agreed. */
export function PriorityField({ item, compact = false, onLocked }: { item: WorkItem; compact?: boolean; onLocked?: OnLocked }) {
  const { actions } = useWorkspace();
  const can = useCanChange(item, "priority");
  if (!can)
    return (
      <ReadOnly item={item} field="priority" onLocked={onLocked}>
        {item.priority ? <PriorityPill priority={item.priority} /> : compact ? "—" : "No priority"}
      </ReadOnly>
    );
  return (
    <span onClick={(e) => e.stopPropagation()} className="inline-flex">
      <PriorityMenu priority={item.priority} placeholder={compact ? "—" : undefined} onChange={(priority) => void actions.patch(item, { priority }, { announce: `Priority of ${refOf(item)} ${priority ? `set to ${priority}` : "cleared"}` })} />
    </span>
  );
}

/**
 * The start or the due date, on the app's DatePicker. Days that would break a rule — a due date in
 * the past, one before the start, anything after a trial's last day — can't be picked (checkDates
 * decides each day), and the same rules run again when the change is saved. A start with no day
 * left to pick, and none to clear, reads as text that says why.
 */
export function DateField({ item, which, compact = false, onLocked, ref }: { item: WorkItem; which: "start" | "due"; compact?: boolean; onLocked?: OnLocked; /** The picker's trigger — set only while there's a date to pick. */ ref?: Ref<HTMLButtonElement> }) {
  const env = useWorkspace();
  const { actions, today } = env;
  const rules: DateRules = { today, lastDay: dayOf(env.access.lastDay) };
  // A milestone is its due date alone.
  const can = useCanChange(item, which) && !(which === "start" && item.type === "milestone");
  const noDayLeft = can && which === "start" ? noStartReason(item, rules, env) : null;
  const value = dayOf(item[which]);
  const label = which === "start" ? "Start" : "Due";
  const late = which === "due" && value !== null && value < today && item.status !== "done";
  const face = <DateFace text={dateText(value, today, can && !noDayLeft, compact, label)} late={late} dated={value !== null} />;
  if (!can || noDayLeft)
    return (
      <ReadOnly item={item} field={which} onLocked={onLocked} reason={noDayLeft ?? undefined}>
        {face}
      </ReadOnly>
    );
  return (
    <span onClick={(e) => e.stopPropagation()} className="inline-flex min-w-0">
      <DatePicker
        ref={ref}
        value={value !== null ? fromISODate(isoOf(value)) : undefined}
        onChange={(d) => {
          const iso = d ? isoDay(d) : null;
          // Days that break a rule can't be picked; anything else the repository checks again and explains.
          void actions.patch(item, { [which]: iso }, { announce: `${label} date of ${refOf(item)} ${iso ? `set to ${longLabel(dayOf(iso) as number)}` : "cleared"}` });
        }}
        disabled={(d) => !dateAllowed(item, which, isoDay(d), rules)}
        aria-label={value !== null ? `${label} date: ${longLabel(value)}. Change ${label.toLowerCase()} date` : `Set ${label.toLowerCase()} date`}
        triggerClassName={FIELD_TRIGGER}
        clearLabel={`Clear ${label.toLowerCase()} date`}
      >
        {face}
      </DatePicker>
    </span>
  );
}

/** A date field's face: the calendar icon, then the words — in red, and saying so, once a due date has passed. */
function DateFace({ text, late, dated }: { text: string; late: boolean; dated: boolean }) {
  return (
    <>
      <ICONS.calendar size={14} aria-hidden className={late ? "text-danger" : "text-ink-2"} />
      <span className={`truncate ${late ? "font-medium text-danger" : dated ? "text-ink" : ""}`}>{late ? `${text} · overdue` : text}</span>
    </>
  );
}

/** What a date field says: how far off the day is; with no day, how to set one or that there's none — a dash in a compact cell. */
function dateText(value: Day | null, today: Day, can: boolean, compact: boolean, label: string): string {
  if (value !== null) return relativeLabel(value, today);
  if (compact) return "—";
  return `${can ? "Set" : "No"} ${label.toLowerCase()} date`;
}

/**
 * Why the start can't be set, when no day is left to pick for it (anyDateAllowed, from checkDates) and
 * there's none to clear; null while one can be. With no start, only a due date that has passed shuts
 * every day out — a trial's last day closes its work first — so that's the reason, and whoever may
 * move the due date is told to, first.
 */
function noStartReason(item: WorkItem, rules: DateRules, { actor, access, names }: WorkspaceEnv): string | null {
  if (item.start || anyDateAllowed(item, "start", rules)) return null;
  const why = "It's past its due date, so there's no day left to start it.";
  return changeFor(item, actor, access, "due", names).ok ? `${why} Move the due date first.` : why;
}

/** Effort: the presets, any whole number up to 999, or none. Relative — not hours. */
export function EffortField({ item, compact = false, onLocked }: { item: WorkItem; compact?: boolean; onLocked?: OnLocked }) {
  const { actions } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  // A milestone marks a date, so it has no effort.
  const milestone = item.type === "milestone";
  const can = useCanChange(item, "effort") && !milestone;
  const face = <EffortFace effort={item.effort} can={can} compact={compact} />;
  if (milestone) return <span className={READ_ONLY}>—</span>;
  if (!can)
    return (
      <ReadOnly item={item} field="effort" onLocked={onLocked}>
        {face}
      </ReadOnly>
    );
  const save = (effort: number | null) => {
    setOpen(false);
    if (effort === (item.effort ?? null)) return;
    void actions.patch(item, { effort }, { announce: `Effort of ${refOf(item)} ${effort === null ? "cleared" : `set to ${effort}`}` });
  };
  return (
    <span onClick={(e) => e.stopPropagation()} className="inline-flex">
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) setText(item.effort !== undefined ? String(item.effort) : "");
        }}
      >
        <PopoverTrigger aria-label={item.effort !== undefined ? `Effort: ${item.effort}. Change effort` : "Set effort"} className={FIELD_TRIGGER}>
          {face}
        </PopoverTrigger>
        <PopoverContent align="start" className="flex w-64 flex-col gap-3 p-3">
          <EffortPicker item={item} text={text} setText={setText} save={save} />
        </PopoverContent>
      </Popover>
    </span>
  );
}

/** Effort's face: the effort icon, then the number — or, with none, how to set it (a dash in a compact cell, or for someone who can't). */
function EffortFace({ effort, can, compact }: { effort?: number; can: boolean; compact: boolean }) {
  return (
    <>
      <ICONS.effort size={14} aria-hidden className="text-ink-2" />
      <span className={effort !== undefined ? "text-ink tabular-nums" : ""}>{effort !== undefined ? effort : can ? (compact ? "—" : "Set effort") : "—"}</span>
    </>
  );
}

/** The effort popover: what effort means, the presets, and any whole number — or Clear. What's typed is checked as it's typed. */
function EffortPicker({ item, text, setText, save }: { item: WorkItem; text: string; setText: (v: string) => void; save: (effort: number | null) => void }) {
  const n = Number(text);
  const error = text.trim() ? checkEffort(n, item.type)?.message : undefined;
  return (
    <>
      <p className="text-[13px] leading-[1.4] font-semibold text-ink">Effort</p>
      <p className="text-[12.5px] leading-[1.4] text-ink-2">{EFFORT_HELP}</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Effort presets">
        {EFFORT_PRESETS.map((p) => (
          <button key={p} type="button" aria-pressed={item.effort === p} onClick={() => save(p)} className={`h-8 min-w-9 rounded-md px-2 text-[13px] font-medium tabular-nums outline -outline-offset-1 ${item.effort === p ? "bg-primary text-white outline-primary" : "bg-white text-ink outline-border hover:bg-surface-2"}`}>
            {p}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return save(null);
          if (!error) save(n);
        }}
        className="flex items-center gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
          inputMode="numeric"
          aria-label="Effort, a whole number"
          aria-invalid={!!error}
          placeholder={`0–${EFFORT_MAX}`}
          className="h-9 w-20 rounded-md border border-border px-2 text-[14px] tabular-nums outline-none focus:border-primary"
        />
        <button type="submit" className="h-9 rounded-md bg-primary px-3 text-[13px] font-medium text-white disabled:bg-[#e5e5e5] disabled:text-[#c3c3c3]" disabled={!!error}>
          Set
        </button>
        {item.effort !== undefined && (
          <button type="button" onClick={() => save(null)} className="h-9 rounded-md px-2 text-[13px] text-ink-2 hover:bg-surface-2">
            Clear
          </button>
        )}
      </form>
      {error && (
        <p role="alert" className="text-[12.5px] text-danger">
          {error}
        </p>
      )}
    </>
  );
}

/**
 * The item's tags, each in its colour. Whoever may tag the item can remove a tag, add one, and
 * change a tag's colour from its name — for the whole contract, so the tag reads the same everywhere.
 */
export function TagsField({ item, known = [] }: { item: WorkItem; /** Every tag in use on this contract, most used first — suggested as you add one. */ known?: readonly string[] }) {
  const { actions, tagColors } = useWorkspace();
  const can = useCanChange(item, "tags");
  const [text, setText] = useState("");
  const tag = normalizeTag(text);
  const error = text.trim() ? checkTag(tag, item.tags)?.message : undefined;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {item.tags.length === 0 && !can && <span className={READ_ONLY}>No tags</span>}
      {item.tags.map((t) => (
        <TagChip
          key={t}
          tag={t}
          colors={tagColors}
          onRemove={can ? () => void actions.removeTag(item, t) : undefined}
          colorMenu={
            can
              ? (face) => (
                  <DropdownMenu>
                    <DropdownMenuTrigger aria-label={`Tag ${t}: ${TAG_COLORS[tagColorOf(t, tagColors)].label}. Change colour`} className="flex min-w-0 cursor-pointer items-center gap-1 rounded-sm decoration-1 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary">
                      {face}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>Tag colour</DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={tagColorOf(t, tagColors)} onValueChange={(v) => void actions.setTagColor(item, t, v as TagColor)}>
                          {TAG_COLOR_KEYS.map((k) => (
                            <DropdownMenuRadioItem key={k} value={k} closeOnClick>
                              <span aria-hidden className="size-4 shrink-0 rounded outline -outline-offset-1" style={{ background: TAG_COLORS[k].bg, outlineColor: TAG_COLORS[k].text }} />
                              {TAG_COLORS[k].label}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              : undefined
          }
        />
      ))}
      {can && <TagInput item={item} known={known} text={text} setText={setText} tag={tag} error={error} />}
    </div>
  );
}

/**
 * Adding a tag: type a new one, or pick one already used on this contract from the suggestions under
 * the box — the ones this item doesn't have yet, the most used first, narrowed as you type. The
 * arrow keys move through them, Enter adds the highlighted one (or what's typed, as a new tag), and
 * Escape closes the list. A combobox: the box keeps focus and names the highlighted option.
 */
function TagInput({ item, known, text, setText, tag, error }: { item: WorkItem; known: readonly string[]; text: string; setText: (v: string) => void; tag: string; error?: string }) {
  const { actions } = useWorkspace();
  const { matches, options } = tagOptions(item, known, tag, error);
  const list = useOptionList(options.length);
  const listId = `tag-options-${item.id}`;
  const add = (value: string) => {
    if (item.tags.includes(value)) return;
    void actions.addTag(item, value);
    setText("");
    list.setActive(0);
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (list.shown) return add(options[list.current].tag);
        if (!tag || error) return;
        add(text);
      }}
      className="relative flex min-w-32 flex-1 flex-col"
    >
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          list.setActive(0);
          list.setOpen(true);
        }}
        onFocus={() => list.setOpen(true)}
        // After a pick: the click on an option lands before this, so the list stays until then.
        onBlur={() => list.setOpen(false)}
        onKeyDown={list.onKeyDown}
        role="combobox"
        aria-expanded={list.shown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={list.shown ? `${listId}-${list.current}` : undefined}
        aria-label="Add a tag"
        aria-invalid={!!error}
        placeholder={item.tags.length ? "Add tag" : known.length ? "Add a tag — pick or type one" : "Add a tag — press Enter"}
        className="h-7 min-w-0 bg-transparent px-1.5 text-[13px] text-ink outline-none placeholder:text-ink-2"
      />
      {list.shown && <TagOptions id={listId} options={options} heading={matches.length > 0} current={list.current} onHover={list.setActive} onPick={add} />}
      {error && (
        <span role="alert" className="px-1 text-[12px] text-danger">
          {error}
        </span>
      )}
    </form>
  );
}

/**
 * What the tag box offers: the contract's tags this item hasn't got, narrowed by what's typed (six
 * at most) — and what's typed, as a new tag, when it's a good name that isn't a tag yet.
 */
function tagOptions(item: WorkItem, known: readonly string[], tag: string, error?: string) {
  const has = new Set(item.tags);
  const matches = known.filter((k) => !has.has(k) && (!tag || k.includes(tag))).slice(0, 6);
  /** A typed name that isn't a tag yet is offered too, after the suggestions. */
  const createNew = !!tag && !error && !known.includes(tag) && !has.has(tag);
  const options = [...matches.map((k) => ({ tag: k, isNew: false })), ...(createNew ? [{ tag, isNew: true }] : [])];
  return { matches, options };
}

/** A suggestion list's state: open or not, and the highlighted option — moved by the arrow keys, round from either end. Escape closes it. */
function useOptionList(count: number) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const shown = open && count > 0;
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && count) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (Math.min(a, count - 1) + 1) % count);
    } else if (e.key === "ArrowUp" && count) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (Math.min(a, count - 1) - 1 + count) % count);
    } else if (e.key === "Escape" && shown) {
      // Close the list, not the sheet.
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  };
  return { shown, current: Math.min(active, count - 1), setOpen, setActive, onKeyDown };
}

/** The suggestions under the tag box: the tags used on this contract, under their heading, then a new one to create. */
function TagOptions({ id, options, heading, current, onHover, onPick }: { id: string; options: { tag: string; isNew: boolean }[]; heading: boolean; current: number; onHover: (i: number) => void; onPick: (tag: string) => void }) {
  const { tagColors } = useWorkspace();
  return (
    <ul id={id} role="listbox" aria-label="Tags" className="absolute top-full left-0 z-20 mt-1 flex w-60 flex-col rounded-lg bg-white p-1 shadow-lg outline -outline-offset-1 outline-border">
      {heading && <li role="presentation" className="px-2 pt-1 pb-1.5 text-[11.5px] font-medium text-ink-2">Used on this contract</li>}
      {options.map((o, i) => (
        <li
          key={`${o.isNew ? "new" : "tag"}-${o.tag}`}
          id={`${id}-${i}`}
          role="option"
          aria-selected={i === current}
          // Keep the box's focus, so the pick doesn't blur it and close the list first.
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => onHover(i)}
          onClick={() => onPick(o.tag)}
          className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] ${i === current ? "bg-surface-2" : ""}`}
        >
          {o.isNew ? (
            <>
              <ICONS.add size={15} aria-hidden className="shrink-0 text-ink-2" />
              <span className="min-w-0 truncate text-ink">
                Create <TagChip tag={o.tag} colors={tagColors} />
              </span>
            </>
          ) : (
            <TagChip tag={o.tag} colors={tagColors} />
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * What this item waits on, and a picker to add one — the Team Builder's on any item, the
 * Independent's on their own work. A choice that would make a loop, or wait on itself, is refused
 * here with the reason — and again by the repository.
 */
export function DependenciesField({ item, items, byId }: { item: WorkItem; items: readonly WorkItem[]; byId: ReadonlyMap<string, WorkItem> }) {
  const dependents = items.filter((t) => !isArchived(t) && t.dependsOn.includes(item.id));
  return (
    <div className="flex flex-col gap-2">
      <WaitsOn item={item} items={items} byId={byId} />
      {dependents.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-[12px] font-medium tracking-[0.2px] text-ink-2">Blocking</p>
          <ul className="flex flex-col">
            {dependents.map((t) => (
              <DependencyRow key={t.id} item={t} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** What the item waits on, each with Stop waiting for whoever may change that — and, for them, "Add a dependency". */
function WaitsOn({ item, items, byId }: { item: WorkItem; items: readonly WorkItem[]; byId: ReadonlyMap<string, WorkItem> }) {
  const { actor, access, actions } = useWorkspace();
  const can = capsFor(item, actor, access).depend;
  const picker = useDependencyPicker(item, items, byId);
  const blockers = item.dependsOn.map((id) => byId.get(id)).filter((t): t is WorkItem => !!t);
  return (
    <div className="flex flex-col gap-1">
      {/* Only what's there is labelled — an empty list isn't a line of its own. */}
      {blockers.length > 0 && (
        <>
          <p className="text-[12px] font-medium tracking-[0.2px] text-ink-2">Waits on</p>
          <ul className="flex flex-col">
            {blockers.map((t) => (
              <DependencyRow key={t.id} item={t} onRemove={can ? () => void actions.removeDependency(item, t.id) : undefined} />
            ))}
          </ul>
        </>
      )}
      {can && (
        <Popover open={picker.open} onOpenChange={picker.onOpenChange}>
          <PopoverTrigger className="flex h-8 items-center gap-1.5 self-start rounded-md px-1.5 text-[13px] text-ink-2 hover:bg-surface-2 hover:text-ink">
            <ICONS.link size={15} aria-hidden /> Add a dependency
          </PopoverTrigger>
          <PopoverContent align="start" className="flex w-80 flex-col gap-2 p-2">
            <input autoFocus value={picker.q} onChange={(e) => picker.search(e.target.value)} aria-label="Find an item it waits on" placeholder="Search by name or #number" className="h-9 rounded-md border border-border px-2 text-[14px] outline-none focus:border-primary" />
            {picker.error && (
              <p role="alert" className="px-1 text-[12.5px] leading-[1.4] text-danger">
                {picker.error}
              </p>
            )}
            <ul role="listbox" aria-label="Items" className="flex max-h-64 flex-col overflow-y-auto">
              {picker.candidates.length === 0 && <li className="px-2 py-2 text-[13px] text-ink-2">No matching items.</li>}
              {picker.candidates.map((t) => (
                <Candidate key={t.id} item={t} onPick={() => picker.pick(t)} />
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

/**
 * "Add a dependency": open or not, what's searched, why the last pick was refused, and what's
 * offered. Picking one makes this item wait on it — unless that would make a loop.
 */
function useDependencyPicker(item: WorkItem, items: readonly WorkItem[], byId: ReadonlyMap<string, WorkItem>) {
  const { actions } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Only open work can hold anything up: done work (a finished project's, the trial's) isn't offered.
  const candidates = useMemo(() => {
    const waitsOn = new Set(item.dependsOn);
    return items.filter((t) => !isArchived(t) && !isCompleted(t.status) && t.id !== item.id && !waitsOn.has(t.id) && matchesSearch(t, q)).slice(0, 8);
  }, [items, item, q]);
  const onOpenChange = (o: boolean) => {
    setOpen(o);
    setQ("");
    setError(null);
  };
  const search = (value: string) => (setQ(value), setError(null));
  const pick = (t: WorkItem) => {
    const bad = checkDependency(item.id, t.id, byId);
    if (bad) return setError(bad.message);
    setOpen(false);
    void actions.addDependency(item, t);
  };
  return { open, q, error, candidates, onOpenChange, search, pick };
}

/** An item this one waits on, or one waiting on it: it opens the item, and — for whoever may — stops the waiting. */
function DependencyRow({ item: t, onRemove }: { item: WorkItem; onRemove?: () => void }) {
  const { openTask } = useWorkspace();
  return (
    <li className="flex min-h-8 items-center gap-2 text-[13px]">
      <StatusCircle status={t.status} size={14} label={STATUS_META[t.status].label} />
      <button type="button" onClick={() => openTask(t.id)} className="min-w-0 flex-1 truncate text-left text-ink hover:underline">
        <span className="text-ink-2 tabular-nums">{refOf(t)}</span> {t.title}
        {isArchived(t) && <span className="text-ink-2"> (deleted)</span>}
      </button>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Stop waiting on ${refOf(t)}`} className="flex size-6 items-center justify-center rounded text-ink-2 hover:bg-surface-2 hover:text-ink">
          <ICONS.close size={14} aria-hidden />
        </button>
      )}
    </li>
  );
}

/** One search result. The option is what's picked — a button inside it would lose its own semantics. */
function Candidate({ item: t, onPick }: { item: WorkItem; onPick: () => void }) {
  return (
    <li
      role="option"
      aria-selected={false}
      tabIndex={0}
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        onPick();
      }}
      className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
    >
      <StatusCircle status={t.status} size={14} />
      <span className="text-ink-2 tabular-nums">{refOf(t)}</span>
      <span className="min-w-0 flex-1 truncate text-ink">{t.title}</span>
    </li>
  );
}

/**
 * One property in the sheet's property list: an icon and label on the left, the value on the right,
 * a row each — read down the left for what's set, down the right for the values. The value's control
 * keeps its own 6px inset for its hover box, so it's pulled back by the same amount (`-mx-1.5`) and
 * the values start on one line. `flush` is for values that aren't one control (the tags).
 */
export function Prop({ label, icon, children, hint, flush = false, ref }: { label: string; icon: IconName; children: ReactNode; hint?: string; flush?: boolean; ref?: Ref<HTMLDivElement> }) {
  const Icon = ICONS[icon];
  return (
    <div ref={ref} className="grid min-h-10 grid-cols-[128px_minmax(0,1fr)] items-center gap-3 px-4 py-1 max-sm:grid-cols-[104px_minmax(0,1fr)]">
      <dt className="flex items-center gap-2 text-[13px] leading-none text-ink-2">
        <Icon size={16} aria-hidden className="shrink-0 text-[#8a8f98]" />
        {label}
        {hint && (
          <Tip label={hint}>
            <button type="button" aria-label={`About ${label.toLowerCase()}`} className="-ml-1 flex size-5 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2">
              <ICONS.info size={13} aria-hidden />
            </button>
          </Tip>
        )}
      </dt>
      <dd className={`flex min-h-8 min-w-0 items-center text-[13.5px] ${flush ? "" : "-mx-1.5"}`}>{children}</dd>
    </div>
  );
}
