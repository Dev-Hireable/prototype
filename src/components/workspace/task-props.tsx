"use client";

import type { ReactNode } from "react";
import { ICONS, type IconName } from "@/components/icons";
import { Checkbox } from "@/components/portal/ui";
import { MiniBar } from "@/components/portal/meter";
import { InfoTip, Tip } from "@/components/portal/tip";
import { EFFORT_HELP, isArchived, type Subtask, type WorkItem } from "@/lib/work/model";
import { capsFor, changeFor, tickRefusal, type AgreedField, type Caps } from "@/lib/work/permissions";
import { checkSubtaskTitle } from "@/lib/work/validate";
import { useWorkspace } from "./context";
import { DraftText } from "./draft-text";
import { AssigneeField, DependenciesField, EffortField, PriorityField, ProjectField, TagsField, TypeField } from "./fields";
import { lockable } from "./lockable";
import { QuickAdd } from "./quick-add";

type OnLocked = (field: AgreedField) => void;

/**
 * The item's properties, a row each: its icon in one gutter down the left, its value beside it, edited
 * in place — or plain text, or a lock that says why, where it isn't this person's to change. The plan
 * first (who, how pressing, how much, what kind, where it sits, its tags), then what the work is: its
 * description, subtasks and what it waits on. An empty property is a quiet "Add …" row; one that's
 * empty and can't be filled in isn't shown.
 */
export function TaskProps({ item, items, byId, onLocked }: { item: WorkItem; items: readonly WorkItem[]; byId: ReadonlyMap<string, WorkItem>; onLocked: OnLocked }) {
  return (
    <dl className="flex flex-col">
      <PlanRows item={item} items={items} onLocked={onLocked} />
      <WorkRows item={item} items={items} byId={byId} onLocked={onLocked} />
    </dl>
  );
}

/** Who does it, how pressing it is, how much work, what kind, which project (a role's work only) and its tags. */
function PlanRows({ item: t, items, onLocked }: { item: WorkItem; items: readonly WorkItem[]; onLocked: OnLocked }) {
  const { actor, access, names, projects } = useWorkspace();
  const canTag = changeFor(t, actor, access, "tags", names).ok;
  return (
    <>
      <Row icon="person" label="Assignee">
        <AssigneeField item={t} onLocked={onLocked} />
      </Row>
      <Row icon="flag" label="Priority">
        <PriorityField item={t} onLocked={onLocked} />
      </Row>
      {/* A milestone marks a date, so it has no effort. */}
      {t.type !== "milestone" && (
        <Row icon="effort" label="Effort">
          <EffortField bare item={t} onLocked={onLocked} />
          <InfoTip label={EFFORT_HELP} about="effort" />
        </Row>
      )}
      <Row icon="work" label="Work type">
        <TypeField item={t} onLocked={onLocked} />
      </Row>
      {/* A role's work sits in a project or none; a trial has no projects. */}
      {projects.ctx.split && (
        <Row icon="project" label="Project">
          <ProjectField item={t} />
        </Row>
      )}
      {(t.tags.length > 0 || canTag) && (
        <Row icon="tag" label="Tags">
          <TagsField item={t} known={tagsInUse(items)} />
        </Row>
      )}
    </>
  );
}

/** What the work is: what done looks like, its steps, and what it waits on or holds up. */
function WorkRows({ item: t, items, byId, onLocked }: { item: WorkItem; items: readonly WorkItem[]; byId: ReadonlyMap<string, WorkItem>; onLocked: OnLocked }) {
  const { actor, access, names } = useWorkspace();
  const caps = capsFor(t, actor, access);
  const canDescribe = changeFor(t, actor, access, "description", names).ok;
  return (
    <>
      {(t.description || canDescribe) && (
        <Row icon="notes" label="Description" top>
          <Description item={t} editable={canDescribe} onLocked={onLocked} />
        </Row>
      )}
      {(t.subtasks.length > 0 || caps.subtasks) && (
        <Row icon="checklist" label="Subtasks" top>
          <Subtasks item={t} caps={caps} />
        </Row>
      )}
      {(hasDependencies(t, items) || caps.depend) && (
        <Row icon="link" label="Dependencies" top>
          <DependenciesField item={t} items={items} byId={byId} />
        </Row>
      )}
    </>
  );
}

/**
 * One property: its icon in the sheet's gutter, then its value. The icon's tip names it, and so does
 * the term, hidden, for screen readers. A control keeps its own 6px inset for its hover box, so the
 * value is pulled back by as much (`-mx-1.5`) and every value starts on one line. A `top` row runs to
 * several lines, its icon level with the first.
 */
function Row({ icon, label, top = false, children }: { icon: IconName; label: string; top?: boolean; children: ReactNode }) {
  const Icon = ICONS[icon];
  return (
    <div className={`flex gap-3 ${top ? "items-start py-1" : "min-h-10 items-center"}`}>
      <dt className="flex h-8 w-5 shrink-0 items-center justify-center">
        <Tip label={label}>
          <span className="flex text-muted-2">
            <Icon size={18} aria-hidden />
          </span>
        </Tip>
        <span className="sr-only">{label}</span>
      </dt>
      <dd className={`-mx-1.5 flex min-h-8 min-w-0 flex-1 gap-1 text-[13.5px] ${top ? "flex-col" : "items-center"}`}>{children}</dd>
    </div>
  );
}

/** The contract's tags, the most used first (then by name): what adding a tag suggests. */
function tagsInUse(items: readonly WorkItem[]): string[] {
  const uses = new Map<string, number>();
  for (const it of items) if (!isArchived(it)) for (const tag of it.tags) uses.set(tag, (uses.get(tag) ?? 0) + 1);
  return [...uses].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag]) => tag);
}

/** Whether there's anything to say about dependencies: what this waits on, or live work waiting on it. */
function hasDependencies(t: WorkItem, items: readonly WorkItem[]) {
  return t.dependsOn.length > 0 || items.some((x) => !isArchived(x) && x.dependsOn.includes(t.id));
}

/** What done looks like, edited in place by whoever may change the item's text: its quiet "Add a description" row while there's none. */
function Description({ item: t, editable, onLocked }: { item: WorkItem; editable: boolean; onLocked: OnLocked }) {
  const { actions, actor, access } = useWorkspace();
  return (
    <DraftText
      key={`desc-${t.id}`}
      label="Description"
      value={t.description ?? ""}
      editable={editable}
      lock={lockable(t, "description", actor.role, access) ? { field: "description", onLocked } : undefined}
      updatedBy={t.updatedBy}
      placeholder="Add a description"
      onSave={(next, base) => void actions.patch({ ...t, description: base || undefined }, { description: next || null })}
      className="text-[14px] leading-[1.5] text-ink"
    />
  );
}

/** The subtasks and how many are done: ticked off unless `tickRefusal` says why not, added and removed with `caps.subtasks`. */
function Subtasks({ item: t, caps }: { item: WorkItem; caps: Caps }) {
  const { actions, actor, access } = useWorkspace();
  const subs = t.subtasks;
  const done = subs.filter((s) => s.done).length;
  const untickable = tickRefusal(t, actor, access);
  return (
    <>
      {subs.length > 0 && (
        <>
          <p className="flex h-8 items-center gap-3 px-1.5 text-[12.5px] text-ink-2">
            <span className="tabular-nums">
              {done} of {subs.length} done
            </span>
            <MiniBar value={done} total={subs.length} className="max-w-40 flex-1" />
          </p>
          <ul className="flex flex-col">
            {subs.map((s) => (
              <SubtaskRow key={s.id} item={t} sub={s} untickable={untickable} removable={caps.subtasks} />
            ))}
          </ul>
        </>
      )}
      {/* "Add subtask" opens a row drawn as the subtask it becomes, with the cursor in it. */}
      {caps.subtasks && (
        <QuickAdd
          key={t.id}
          variant="prop"
          label="Add subtask"
          fieldLabel="New subtask"
          placeholder="Name the step (Enter adds another)"
          check={checkSubtaskTitle}
          marker={<span aria-hidden className="size-4 shrink-0 rounded-[4px] border border-input bg-white" />}
          onAdd={(title) => actions.addSubtask(t, title)}
        />
      )}
    </>
  );
}

/**
 * One subtask: its box, and × for whoever may remove it. A box this person can't tick is greyed
 * out, and hovering it says why (`untickable`) — a disabled box takes no pointer, so the tip hangs
 * on the span Tip wraps it in.
 */
function SubtaskRow({ item: t, sub: s, untickable, removable }: { item: WorkItem; sub: Subtask; untickable: string | null; removable: boolean }) {
  const { actions } = useWorkspace();
  return (
    <li className="group flex min-h-9 items-center gap-2 border-t border-[#eeeeee] px-1.5 first:border-t-0">
      <Tip label={untickable} wrap wrapClassName="min-w-0 flex-1">
        <Checkbox checked={s.done} disabled={untickable !== null} onChange={(v) => void actions.toggleSubtask(t, s.id, v)} className="min-w-0 flex-1">
          <span className={`min-w-0 flex-1 ${s.done ? "text-ink-2 line-through" : ""}`}>{s.title}</span>
        </Checkbox>
      </Tip>
      {removable && (
        <button type="button" aria-label={`Remove subtask ${s.title}`} onClick={() => void actions.removeSubtask(t, s.id)} className="flex size-7 items-center justify-center rounded-md text-ink-2 opacity-0 group-hover:opacity-100 hover:bg-danger/10 hover:text-danger focus-visible:opacity-100">
          <ICONS.close size={14} aria-hidden />
        </button>
      )}
    </li>
  );
}
