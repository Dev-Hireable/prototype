"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { Matcher } from "react-day-picker";
import { ICONS, type IconName } from "@/components/admin/icons";
import { DatePicker, fromISODate, toISODate } from "@/components/portal/DatePicker";
import { PriorityMenu, StatusCircle, StatusPill } from "@/components/portal/tasks/task-bits";
import { Tip } from "@/components/portal/Tip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dayOf, isoOf, longLabel, relativeLabel } from "@/lib/work/dates";
import { ASSIGNEE_KEYS, assigneeKey, assigneeOf, EFFORT_HELP, EFFORT_MAX, EFFORT_PRESETS, isArchived, isCompleted, refOf, STATUS_META, TAG_COLOR_KEYS, TAG_COLORS, tagColorOf, TYPE_META, WORK_TYPES, type TagColor, type WorkItem, type WorkStatus } from "@/lib/work/model";
import { matchesSearch } from "@/lib/work/query";
import { capsFor, targetsFor, transitionFor, type TransitionKind } from "@/lib/work/permissions";
import { checkDependency, checkEffort, checkTag, normalizeTag } from "@/lib/work/validate";
import { movedTo, NO_PROJECT, NO_PROJECT_NAME, projectKeyOf } from "@/lib/work/projects";
import { useWorkspace } from "./context";
import { AssigneeChip, TagChip, TYPE_ICON, TypeChip } from "./meta";

/**
 * The editors an item's fields are changed with — in the list's cells and in the item's panel.
 * Each asks the same permission functions the repository enforces; without the right, it shows
 * the value as plain text rather than a control that would only fail.
 */

export const FIELD_TRIGGER =
  "inline-flex h-7 max-w-full min-w-0 items-center gap-1 rounded-md px-1.5 text-[13px] leading-[1.2] text-ink-2 transition hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary data-popup-open:bg-surface-2";

/**
 * A value that can't be changed, in the same 28px box and 6px inset as FIELD_TRIGGER — so plain and
 * editable values start on one line in the panel (they used to sit a few pixels apart, row to row).
 */
const READ_ONLY = "inline-flex h-7 max-w-full min-w-0 items-center gap-1 px-1.5 text-[13px] leading-[1.2] text-ink-2";

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

export function AssigneeField({ item }: { item: WorkItem }) {
  const { actor, access, people, actions, assigneeLabel } = useWorkspace();
  const can = capsFor(item, actor, access).assign;
  if (!can)
    return (
      <span className={READ_ONLY}>
        <AssigneeChip assignee={item.assignee} people={people} />
      </span>
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

export function TypeField({ item, iconOnly = false }: { item: WorkItem; iconOnly?: boolean }) {
  const { actor, access, actions } = useWorkspace();
  if (!capsFor(item, actor, access).plan)
    return (
      <span className={READ_ONLY}>
        <TypeChip type={item.type} iconOnly={iconOnly} />
      </span>
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
  const { actor, access, actions, projects } = useWorkspace();
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
  if (!projects.canPlan || !capsFor(item, actor, access).plan) return <span className={READ_ONLY}>{chip}</span>;
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

export function PriorityField({ item, compact = false }: { item: WorkItem; compact?: boolean }) {
  const { actor, access, actions } = useWorkspace();
  const can = capsFor(item, actor, access).plan;
  return (
    <span onClick={(e) => e.stopPropagation()} className="inline-flex">
      <PriorityMenu priority={item.priority} placeholder={compact ? "—" : undefined} onChange={can ? (priority) => void actions.patch(item, { priority }, { announce: `Priority of ${refOf(item)} ${priority ? `set to ${priority}` : "cleared"}` }) : undefined} />
    </span>
  );
}

/**
 * The start or the due date, on the app's DatePicker. Days that would break a rule — a due date in
 * the past, one before the start, anything after a trial's last day — can't be picked, and the
 * same rules run again when the change is saved.
 */
export function DateField({ item, which, compact = false }: { item: WorkItem; which: "start" | "due"; compact?: boolean }) {
  const { actor, access, actions, today } = useWorkspace();
  const caps = capsFor(item, actor, access);
  const can = which === "start" ? caps.start && item.type !== "milestone" : caps.plan;
  const value = dayOf(item[which]);
  const other = dayOf(item[which === "start" ? "due" : "start"]);
  const last = dayOf(access.lastDay);
  const label = which === "start" ? "Start" : "Due";
  const late = which === "due" && value !== null && value < today && item.status !== "done";
  const text = value !== null ? relativeLabel(value, today) : can ? (compact ? "—" : `Set ${label.toLowerCase()} date`) : "—";
  const face = (
    <>
      <ICONS.calendar size={14} aria-hidden className={late ? "text-danger" : "text-ink-2"} />
      <span className={`truncate ${late ? "font-medium text-danger" : value !== null ? "text-ink" : ""}`}>{late ? `${text} · overdue` : text}</span>
    </>
  );
  if (!can) return <span className={READ_ONLY}>{face}</span>;
  const disabled: Matcher[] = [];
  if (which === "due") disabled.push({ before: fromISODate(isoOf(Math.max(today, other ?? today))) as Date });
  if (which === "start") disabled.push({ before: fromISODate(isoOf(today)) as Date });
  if (which === "start" && other !== null) disabled.push({ after: fromISODate(isoOf(other)) as Date });
  if (last !== null) disabled.push({ after: fromISODate(isoOf(last)) as Date });
  return (
    <span onClick={(e) => e.stopPropagation()} className="inline-flex min-w-0">
      <DatePicker
        value={value !== null ? fromISODate(isoOf(value)) : undefined}
        onChange={(d) => {
          const iso = d ? toISODate(d) : null;
          // Days that break a rule can't be picked; anything else the repository checks again and explains.
          void actions.patch(item, { [which]: iso }, { announce: `${label} date of ${refOf(item)} ${iso ? `set to ${longLabel(dayOf(iso) as number)}` : "cleared"}` });
        }}
        disabled={disabled}
        aria-label={value !== null ? `${label} date: ${longLabel(value)}. Change ${label.toLowerCase()} date` : `Set ${label.toLowerCase()} date`}
        triggerClassName={FIELD_TRIGGER}
        clearLabel={`Clear ${label.toLowerCase()} date`}
      >
        {face}
      </DatePicker>
    </span>
  );
}

/** Effort: the presets, any whole number up to 999, or none. Relative — not hours. */
export function EffortField({ item, compact = false }: { item: WorkItem; compact?: boolean }) {
  const { actor, access, actions } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const can = capsFor(item, actor, access).plan && item.type !== "milestone";
  const face = (
    <>
      <ICONS.effort size={14} aria-hidden className="text-ink-2" />
      <span className={item.effort !== undefined ? "text-ink tabular-nums" : ""}>{item.effort !== undefined ? item.effort : can ? (compact ? "—" : "Set effort") : "—"}</span>
    </>
  );
  if (!can) return <span className={READ_ONLY}>{item.type === "milestone" ? <span className="text-ink-2">—</span> : face}</span>;
  const n = Number(text);
  const error = text.trim() ? checkEffort(n, item.type)?.message : undefined;
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
        </PopoverContent>
      </Popover>
    </span>
  );
}

/**
 * The item's tags, each in its colour. Whoever may tag the item can remove a tag, add one, and
 * change a tag's colour from its name — for the whole contract, so the tag reads the same everywhere.
 */
export function TagsField({ item, known = [] }: { item: WorkItem; /** Every tag in use on this contract, most used first — suggested as you add one. */ known?: readonly string[] }) {
  const { actor, access, actions, tagColors } = useWorkspace();
  const can = capsFor(item, actor, access).plan;
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
  const { actions, tagColors } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = `tag-options-${item.id}`;
  const matches = known.filter((k) => !item.tags.includes(k) && (!tag || k.includes(tag))).slice(0, 6);
  /** A typed name that isn't a tag yet is offered too, after the suggestions. */
  const createNew = !!tag && !error && !known.includes(tag) && !item.tags.includes(tag);
  const options = [...matches.map((k) => ({ tag: k, isNew: false })), ...(createNew ? [{ tag, isNew: true }] : [])];
  const shown = open && options.length > 0;
  const current = Math.min(active, options.length - 1);
  const add = (value: string) => {
    if (item.tags.includes(value)) return;
    void actions.addTag(item, value);
    setText("");
    setActive(0);
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (shown) return add(options[current].tag);
        if (!tag || error) return;
        add(text);
      }}
      className="relative flex min-w-32 flex-1 flex-col"
    >
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // After a pick: the click on an option lands before this, so the list stays until then.
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && options.length) {
            e.preventDefault();
            setOpen(true);
            setActive((a) => (Math.min(a, options.length - 1) + 1) % options.length);
          } else if (e.key === "ArrowUp" && options.length) {
            e.preventDefault();
            setOpen(true);
            setActive((a) => (Math.min(a, options.length - 1) - 1 + options.length) % options.length);
          } else if (e.key === "Escape" && shown) {
            // Close the list, not the sheet.
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
          }
        }}
        role="combobox"
        aria-expanded={shown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={shown ? `${listId}-${current}` : undefined}
        aria-label="Add a tag"
        aria-invalid={!!error}
        placeholder={item.tags.length ? "Add tag" : known.length ? "Add a tag — pick or type one" : "Add a tag — press Enter"}
        className="h-7 min-w-0 bg-transparent px-1.5 text-[13px] text-ink outline-none placeholder:text-ink-2"
      />
      {shown && (
        <ul id={listId} role="listbox" aria-label="Tags" className="absolute top-full left-0 z-20 mt-1 flex w-60 flex-col rounded-lg bg-white p-1 shadow-lg outline -outline-offset-1 outline-border">
          {matches.length > 0 && <li role="presentation" className="px-2 pt-1 pb-1.5 text-[11.5px] font-medium text-ink-2">Used on this contract</li>}
          {options.map((o, i) => (
            <li
              key={`${o.isNew ? "new" : "tag"}-${o.tag}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === current}
              // Keep the box's focus, so the pick doesn't blur it and close the list first.
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => add(o.tag)}
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
      )}
      {error && (
        <span role="alert" className="px-1 text-[12px] text-danger">
          {error}
        </span>
      )}
    </form>
  );
}

/**
 * What this item waits on, and a picker to add one — the Team Builder's on any item, the
 * Independent's on their own work. A choice that would make a loop, or wait on itself, is refused
 * here with the reason — and again by the repository.
 */
export function DependenciesField({ item, items, byId }: { item: WorkItem; items: readonly WorkItem[]; byId: ReadonlyMap<string, WorkItem> }) {
  const { actor, access, actions, openTask } = useWorkspace();
  const can = capsFor(item, actor, access).depend;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const blockers = item.dependsOn.map((id) => byId.get(id)).filter((t): t is WorkItem => !!t);
  const dependents = items.filter((t) => !isArchived(t) && t.dependsOn.includes(item.id));
  // Only open work can hold anything up: done work (a finished project's, the trial's) isn't offered.
  const candidates = useMemo(() => items.filter((t) => !isArchived(t) && !isCompleted(t.status) && t.id !== item.id && !item.dependsOn.includes(t.id) && matchesSearch(t, q)).slice(0, 8), [items, item, q]);
  const row = (t: WorkItem, onRemove?: () => void) => (
    <li key={t.id} className="flex min-h-8 items-center gap-2 text-[13px]">
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
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        {/* Only what's there is labelled — an empty list isn't a line of its own. */}
        {blockers.length > 0 && (
          <>
            <p className="text-[12px] font-medium tracking-[0.2px] text-ink-2">Waits on</p>
            <ul className="flex flex-col">{blockers.map((t) => row(t, can ? () => void actions.removeDependency(item, t.id) : undefined))}</ul>
          </>
        )}
        {can && (
          <Popover
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              setQ("");
              setError(null);
            }}
          >
            <PopoverTrigger className="flex h-8 items-center gap-1.5 self-start rounded-md px-1.5 text-[13px] text-ink-2 hover:bg-surface-2 hover:text-ink">
              <ICONS.link size={15} aria-hidden /> Add a dependency
            </PopoverTrigger>
            <PopoverContent align="start" className="flex w-80 flex-col gap-2 p-2">
              <input autoFocus value={q} onChange={(e) => (setQ(e.target.value), setError(null))} aria-label="Find an item it waits on" placeholder="Search by name or #number" className="h-9 rounded-md border border-border px-2 text-[14px] outline-none focus:border-primary" />
              {error && (
                <p role="alert" className="px-1 text-[12.5px] leading-[1.4] text-danger">
                  {error}
                </p>
              )}
              <ul role="listbox" aria-label="Items" className="flex max-h-64 flex-col overflow-y-auto">
                {candidates.length === 0 && <li className="px-2 py-2 text-[13px] text-ink-2">No matching items.</li>}
                {candidates.map((t) => (
                  <li key={t.id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onClick={() => {
                        const bad = checkDependency(item.id, t.id, byId);
                        if (bad) return setError(bad.message);
                        setOpen(false);
                        void actions.addDependency(item, t);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
                    >
                      <StatusCircle status={t.status} size={14} />
                      <span className="text-ink-2 tabular-nums">{refOf(t)}</span>
                      <span className="min-w-0 flex-1 truncate text-ink">{t.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        )}
      </div>
      {dependents.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-[12px] font-medium tracking-[0.2px] text-ink-2">Blocking</p>
          <ul className="flex flex-col">{dependents.map((t) => row(t))}</ul>
        </div>
      )}
    </div>
  );
}

/**
 * One property in the sheet's property list: an icon and label on the left, the value on the right,
 * a row each — read down the left for what's set, down the right for the values. The value's control
 * keeps its own 6px inset for its hover box, so it's pulled back by the same amount (`-mx-1.5`) and
 * the values start on one line. `flush` is for values that aren't one control (the tags).
 */
export function Prop({ label, icon, children, hint, flush = false }: { label: string; icon: IconName; children: ReactNode; hint?: string; flush?: boolean }) {
  const Icon = ICONS[icon];
  return (
    <div className="grid min-h-10 grid-cols-[128px_minmax(0,1fr)] items-center gap-3 px-4 py-1 max-sm:grid-cols-[104px_minmax(0,1fr)]">
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
