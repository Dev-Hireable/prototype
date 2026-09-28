"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, Checkbox, InfoBanner, KebabMenu, Pills, Textarea } from "@/components/independent/ui";
import { Badge } from "@/components/portal/Badge";
import { MenuAction } from "@/components/portal/controls";
import { CommentBox } from "@/components/portal/CommentBox";
import { Tip } from "@/components/portal/Tip";
import { Avatar, Drawer } from "@/components/team/ui";
import { EFFORT_HELP, hearsComments, isArchived, isCompleted, openBlockers, refOf, type Subtask, type WorkItem } from "@/lib/work/model";
import { capsFor, changeFor, sideOf, tickRefusal, transitionFor, type AgreedField, type Caps } from "@/lib/work/permissions";
import { checkComment, checkSubtaskTitle, checkTitle } from "@/lib/work/validate";
import { keyed } from "@/lib/portal/keys";
import { useWorkspace, type DetailFocus, type WorkspaceEnv } from "./context";
import { AssigneeField, DateField, DependenciesField, EffortField, PriorityField, ProjectField, Prop, StatusField, TagsField, TypeField } from "./fields";
import { AgreedNotice } from "./contract-lock";
import { lockable, lockLabel } from "./lockable";
import { QuickAdd } from "./QuickAdd";

/**
 * TB-063 / IN-077 — an item opened in full, in a sheet that holds the focus until it's closed.
 * Top to bottom in order of what matters: its name and where it stands; what's needed now
 * (changes asked for, a submission waiting on review); the plan — who, when, how much; what done
 * looks like; subtasks; what it waits on; and one history of everything that happened, comments
 * included. The next step is pinned in the footer. Each thing is said once: nothing in the history
 * is repeated as a property, and what a callout shows isn't repeated in the history. Whatever
 * isn't this person's to change reads as plain text.
 */
export function TaskDetail({ open, item, items, byId, focus, pending, onClose }: { open: boolean; item: WorkItem; items: readonly WorkItem[]; byId: ReadonlyMap<string, WorkItem>; focus?: DetailFocus; pending: boolean; onClose: () => void }) {
  const step = stepFor(item, useWorkspace());
  /** The agreed part someone just tried to change on a task from the signed offer: its notice shows until they close it. */
  const [locked, setLocked] = useState<AgreedField | null>(null);
  /** The first date this person can change (PlanDates): where the sheet starts when it's opened to set dates. */
  const firstDate = useRef<HTMLButtonElement>(null);
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`${refOf(item)} ${item.title}`}
      width={560}
      testId="task-panel"
      // The header's first control is the name: opening on it would put the name mid-edit every time.
      // Opened to set its dates, it starts on the first one this person can change — and on the close
      // button still when neither is theirs.
      initialFocus={focus === "dates" ? firstDate : "close"}
      header={<PanelHeading item={item} byId={byId} focus={focus} pending={pending} onLocked={setLocked} />}
      actions={<PanelActions item={item} />}
      footer={step && <NextStep key={step} kind={step} item={item} focus={focus} />}
    >
      <DetailBody item={item} items={items} byId={byId} focus={focus} firstDate={firstDate} locked={locked} onLocked={setLocked} />
    </Drawer>
  );
}

/**
 * The item's name and where it stands, in the sheet's header, so they stay in view while the sheet
 * scrolls — the header used to hold only its number ("#1"), with the name down in the body. The
 * number sits over the name, where it's found again, with whether a change is still saving.
 */
function PanelHeading({ item: t, byId, focus, pending, onLocked }: { item: WorkItem; byId: ReadonlyMap<string, WorkItem>; focus?: DetailFocus; pending: boolean; onLocked: (field: AgreedField) => void }) {
  const { actor, access, actions, names } = useWorkspace();
  const canRename = changeFor(t, actor, access, "title", names).ok;
  const blockers = isCompleted(t.status) ? [] : openBlockers(t, byId);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      {(t.number || pending) && (
        <p className="flex h-5 items-center gap-2 text-[12px] leading-none font-medium text-ink-2">
          {t.number ? <span className="tabular-nums">{refOf(t)}</span> : null}
          {pending && <span role="status">Saving…</span>}
        </p>
      )}
      {/* -mx-1 lines the text up with the number above it; the field keeps its own 4px inset for its hover box. */}
      <div className="-mx-1">
        <DraftText
          key={`title-${t.id}`}
          label="Name"
          value={t.title}
          editable={canRename}
          lock={lockable(t, "title", actor.role, access) ? { field: "title", onLocked } : undefined}
          autoFocus={focus === "title"}
          updatedBy={t.updatedBy}
          validate={(v) => checkTitle(v)?.message ?? null}
          onSave={(next, base) => void actions.patch({ ...t, title: base }, { title: next })}
          className={`font-display text-[20px] leading-[1.35] font-semibold ${isCompleted(t.status) ? "text-ink-2" : "text-ink"}`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusField item={t} />
        {blockers.length > 0 && (
          <Tip label={`Waits on ${blockers.map((b) => `${refOf(b)} ${b.title}`).join(", ")}`}>
            <span className="inline-flex">
              <Badge tone="danger" icon={<ICONS.blocked aria-hidden />}>
                Blocked
              </Badge>
            </span>
          </Tip>
        )}
      </div>
    </div>
  );
}

/** Deleting, from the menu. Restoring a deleted item is the deleted banner's one action, not a second copy here. */
function PanelActions({ item }: { item: WorkItem }) {
  const { actor, access, actions } = useWorkspace();
  if (isArchived(item) || !capsFor(item, actor, access).archive) return null;
  return (
    <KebabMenu label="Item actions" icon="horizontal" iconSize={20} menuWidth={200}>
      <MenuAction destructive onClick={() => void actions.archive(item)} icon={<ICONS.trash size={18} aria-hidden />}>
        Delete task
      </MenuAction>
    </KebabMenu>
  );
}

/** One of the sheet's sections, under a hairline, so the sheet reads as parts instead of one list. */
function Section({ title, aside, children, ref }: { title: string; aside?: ReactNode; children: ReactNode; ref?: Ref<HTMLElement> }) {
  return (
    <section ref={ref} aria-label={title} className="flex scroll-mt-4 flex-col gap-2.5 border-t border-[#eeeeee] pt-4">
      <h3 className="flex items-center gap-3 text-[14px] leading-[1.4] font-semibold text-ink">
        {title}
        {aside}
      </h3>
      {children}
    </section>
  );
}

/** The contract's tags, the most used first (then by name). */
function tagsInUse(items: readonly WorkItem[]): string[] {
  const uses = new Map<string, number>();
  for (const it of items) if (!isArchived(it)) for (const tag of it.tags) uses.set(tag, (uses.get(tag) ?? 0) + 1);
  return [...uses].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag]) => tag);
}

/** How many of the newest entries the history opens with; the rest are one click away. */
const FEED_LATEST = 6;

/**
 * The history, newest at the foot, in the sheet's own scroll. It used to be a 320px box that
 * scrolled by itself inside the sheet, and held on to the wheel at its ends (overscroll-contain), so
 * scrolling stopped dead there. A long one opens on its latest entries instead, with the earlier
 * ones behind "Show earlier" — the comment box stays close, and one scroll moves the whole sheet.
 */
function ActivityFeed({ items }: { items: ReactNode[] }) {
  const [all, setAll] = useState(false);
  const hidden = all ? 0 : Math.max(0, items.length - FEED_LATEST);
  return (
    <div className="flex flex-col gap-3">
      {hidden > 0 && (
        <button type="button" onClick={() => setAll(true)} className="flex items-center gap-1.5 self-start rounded-md px-1.5 py-1 text-[13px] font-medium text-accent-ink hover:bg-surface-2">
          <ICONS.chevron size={16} aria-hidden className="rotate-180" />
          Show {hidden} earlier
        </button>
      )}
      <ol aria-label="Activity history" className="flex flex-col gap-3 empty:hidden">
        {items.slice(hidden)}
      </ol>
    </div>
  );
}

/** The Activity filter: everything, only what people said, or only what happened. */
type FeedFilter = "all" | "comments" | "updates";

/** How an item's creation reads in its history, whichever way it was made. */
const CREATED = /^(Added by |Agreed in the signed offer)/;

function DetailBody({ item: t, items, byId, focus, firstDate, locked, onLocked }: { item: WorkItem; items: readonly WorkItem[]; byId: ReadonlyMap<string, WorkItem>; focus?: DetailFocus; firstDate: Ref<HTMLButtonElement>; locked: AgreedField | null; onLocked: (field: AgreedField | null) => void }) {
  const { actor, access, names } = useWorkspace();
  const caps = capsFor(t, actor, access);
  const canDescribe = changeFor(t, actor, access, "description", names).ok;
  /** A comment's notification opens the item on its comments: the history comes into view. */
  const activity = useRef<HTMLElement>(null);
  useEffect(() => {
    if (focus === "comments") activity.current?.scrollIntoView({ block: "start" });
  }, [focus]);
  const { changes, review } = neededNow(t);

  return (
    <>
      {/* What's needed now. */}
      {isArchived(t) && <DeletedBanner item={t} restorable={caps.restore} />}
      {locked && <AgreedNotice field={locked} onClose={() => onLocked(null)} />}
      {changes && <ChangesBanner changes={changes} />}
      {review && <ReviewBanner review={review} />}

      {/* The plan: who, when, how much. A property list, a row each, on a white card with a hairline and a whisper of shadow. */}
      <PlanCard item={t} items={items} dates={focus === "dates"} firstDate={firstDate} onLocked={onLocked} />

      {/* Nothing to read and nothing to write: no empty section. */}
      {(t.description || canDescribe) && <DescriptionSection item={t} editable={canDescribe} onLocked={onLocked} />}

      {(t.subtasks.length > 0 || caps.subtasks) && <SubtasksSection item={t} caps={caps} />}

      {(hasDependencies(t, items) || caps.depend) && (
        <Section title="Dependencies">
          <DependenciesField item={t} items={items} byId={byId} />
        </Section>
      )}

      <ActivitySection ref={activity} item={t} changes={changes} review={review} canComment={caps.comment} />
    </>
  );
}

/** What's needed now, if anything — said once, in a callout, and left out of the history below. */
function neededNow(t: WorkItem) {
  return {
    changes: t.changes && (t.status === "todo" || t.status === "doing") ? t.changes : null,
    review: t.status === "review" ? t.submitted : undefined,
  };
}

/** Whether there's anything to say under Dependencies: what this waits on, or live work waiting on it. */
function hasDependencies(t: WorkItem, items: readonly WorkItem[]) {
  return t.dependsOn.length > 0 || items.some((x) => !isArchived(x) && x.dependsOn.includes(t.id));
}

/** A deleted item says so, and by whom; restoring it is this banner's one action. */
function DeletedBanner({ item: t, restorable }: { item: WorkItem; restorable: boolean }) {
  const { actions } = useWorkspace();
  return (
    <InfoBanner>
      Deleted{t.archivedBy ? ` by ${t.archivedBy}` : ""}. It&apos;s out of every view and count until it&apos;s restored.
      {restorable && (
        <span className="mt-2 block">
          <Button size="sm" onClick={() => void actions.restore(t)}>
            <ICONS.unarchive size={16} aria-hidden /> Restore
          </Button>
        </span>
      )}
    </InfoBanner>
  );
}

/** Changes asked for: who asked and when, their note, and — for the Independent — what to do about it. */
function ChangesBanner({ changes }: { changes: NonNullable<WorkItem["changes"]> }) {
  const { actor, names } = useWorkspace();
  const talent = actor.role === "contributor";
  return (
    <InfoBanner tone="warn">
      <span className="font-semibold">{changes.by || names.team} asked for changes</span> · {changes.at}
      {changes.note && <span className="mt-1 block">“{changes.note}”</span>}
      {talent && <span className="mt-1 block">Make the changes, then send it for review again.</span>}
    </InfoBanner>
  );
}

/** The submission waiting on review: whose hands it's in, when it was sent, and the note for the reviewer. */
function ReviewBanner({ review }: { review: NonNullable<WorkItem["submitted"]> }) {
  const { actor, names } = useWorkspace();
  const talent = actor.role === "contributor";
  return (
    <InfoBanner>
      <span className="font-semibold">{talent ? `With ${names.team} for review` : `${names.independent} sent this for review`}</span> · {review.at}
      {review.note && <span className="mt-1 block">“{review.note}”</span>}
    </InfoBanner>
  );
}

/** The plan's properties, each a field this person can change or plain text where they can't. */
function PlanCard({ item: t, items, dates, firstDate, onLocked }: { item: WorkItem; items: readonly WorkItem[]; dates: boolean; firstDate: Ref<HTMLButtonElement>; onLocked: (field: AgreedField) => void }) {
  const { projects } = useWorkspace();
  /** Every tag in use on the contract, the most used first, to suggest when adding one. */
  const knownTags = tagsInUse(items);
  return (
    <dl className="flex flex-col rounded-xl border border-[#ebebeb] bg-white py-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <Prop label="Assignee" icon="person">
        <AssigneeField item={t} onLocked={onLocked} />
      </Prop>
      {/* A role's work sits in a project or none; a trial has no projects. */}
      {projects.ctx.split && (
        <Prop label="Project" icon="project">
          <ProjectField item={t} />
        </Prop>
      )}
      <Prop label="Priority" icon="flag">
        <PriorityField item={t} onLocked={onLocked} />
      </Prop>
      <PlanDates item={t} dates={dates} firstDate={firstDate} onLocked={onLocked} />
      {t.type !== "milestone" && (
        <Prop label="Effort" icon="effort" hint={EFFORT_HELP}>
          <EffortField item={t} onLocked={onLocked} />
        </Prop>
      )}
      <Prop label="Work type" icon="work">
        <TypeField item={t} onLocked={onLocked} />
      </Prop>
      <Prop label="Tags" icon="tag" flush>
        <TagsField item={t} known={knownTags} />
      </Prop>
    </dl>
  );
}

/**
 * When it's planned: its start and due date, or a milestone's one date. `firstDate` goes on the first
 * of them this person can change. Opened to set them (`dates`), they come into view — the due date is
 * the last of them, so with it in view, the start above it is too.
 */
function PlanDates({ item: t, dates, firstDate, onLocked }: { item: WorkItem; dates: boolean; firstDate: Ref<HTMLButtonElement>; onLocked: (field: AgreedField) => void }) {
  const first = firstDateOf(t, useWorkspace());
  const due = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (dates) due.current?.scrollIntoView({ block: "nearest" });
  }, [dates]);
  return (
    <>
      {t.type !== "milestone" && (
        <Prop label="Start" icon="calendar">
          <DateField ref={first === "start" ? firstDate : undefined} item={t} which="start" onLocked={onLocked} />
        </Prop>
      )}
      <Prop ref={due} label={t.type === "milestone" ? "Date" : "Due"} icon="schedule">
        <DateField ref={first === "due" ? firstDate : undefined} item={t} which="due" onLocked={onLocked} />
      </Prop>
    </>
  );
}

/**
 * The first date this person can change, top down (changeFor): the start — a milestone has none — then
 * the due date. A task from the signed offer keeps the due date it agreed, so its start is the one.
 * Null when neither is theirs to change.
 */
function firstDateOf(t: WorkItem, { actor, access }: Pick<WorkspaceEnv, "actor" | "access">): "start" | "due" | null {
  if (t.type !== "milestone" && changeFor(t, actor, access, "start").ok) return "start";
  return changeFor(t, actor, access, "due").ok ? "due" : null;
}

/** What done looks like, edited in place by whoever may change the item's text. */
function DescriptionSection({ item: t, editable, onLocked }: { item: WorkItem; editable: boolean; onLocked: (field: AgreedField) => void }) {
  const { actions, actor, access } = useWorkspace();
  return (
    <Section title="Description">
      <DraftText
        key={`desc-${t.id}`}
        label="Description"
        multiline
        value={t.description ?? ""}
        editable={editable}
        lock={lockable(t, "description", actor.role, access) ? { field: "description", onLocked } : undefined}
        updatedBy={t.updatedBy}
        placeholder="What done looks like, links, anything to check"
        onSave={(next, base) => void actions.patch({ ...t, description: base || undefined }, { description: next || null })}
        className="text-[14px] leading-[1.5] text-ink"
      />
    </Section>
  );
}

/** The subtasks and how many are done: ticked off unless `tickRefusal` says why not, added and removed with `caps.subtasks`. */
function SubtasksSection({ item: t, caps }: { item: WorkItem; caps: Caps }) {
  const { actions, actor, access } = useWorkspace();
  const subs = t.subtasks;
  const done = subs.filter((s) => s.done).length;
  const untickable = tickRefusal(t, actor, access);
  return (
    <Section
      title="Subtasks"
      aside={
        subs.length > 0 && (
          <>
            <span className="h-1.5 max-w-40 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <span className="block h-full rounded-full bg-ok transition-[width]" style={{ width: `${(done / subs.length) * 100}%` }} />
            </span>
            <span className="text-[12.5px] font-normal text-ink-2 tabular-nums">
              {done} of {subs.length} done
            </span>
          </>
        )
      }
    >
      {subs.length > 0 && (
        <ul className="flex flex-col">
          {subs.map((s) => (
            <SubtaskRow key={s.id} item={t} sub={s} untickable={untickable} removable={caps.subtasks} />
          ))}
        </ul>
      )}
      {/* "+ Add subtask" opens a row drawn as the subtask it becomes, with the cursor in it. */}
      {caps.subtasks && (
        <QuickAdd
          key={t.id}
          variant="inline"
          label="Add subtask"
          fieldLabel="New subtask"
          placeholder="Name the step — Enter to add another"
          check={checkSubtaskTitle}
          marker={<span aria-hidden className="size-4 shrink-0 rounded-[4px] border border-input bg-white" />}
          onAdd={(title) => actions.addSubtask(t, title)}
        />
      )}
    </Section>
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
    <li className="group flex min-h-9 items-center gap-2 border-t border-[#eeeeee] first:border-t-0">
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

/**
 * Everything that happened, oldest first, with the comments in between. Where it came from is
 * its first line — from the log, or from the item itself when the log doesn't say. The event a
 * callout above already shows (this review, these changes) isn't said twice.
 */
function historyOf(t: WorkItem, people: WorkspaceEnv["people"], { changes, review }: ReturnType<typeof neededNow>) {
  const events = [...t.activity].reverse();
  const origin = events.some((e) => CREATED.test(e.text)) ? [] : [{ ts: t.createdAt, at: t.created, text: t.agreed ? "Agreed in the signed offer" : `Added by ${t.createdBy ?? people[t.addedBy].name}` }];
  const inCallout = (e: { at: string; text: string }) => (!!changes && e.at === changes.at && e.text.startsWith("Changes requested")) || (!!review && e.at === review.at && e.text.startsWith("Sent for review"));
  return [
    ...[...origin, ...events].filter((e) => !inCallout(e)).map((e) => ({ kind: "event" as const, ...e })),
    ...t.comments.map((c) => ({ kind: "comment" as const, ...c })),
  ].sort((a, b) => a.ts - b.ts);
}

/** The comment box's prompt: who a comment notifies — or that the Independent can read it but won't hear. */
function commentPlaceholder(t: WorkItem, talent: boolean, names: WorkspaceEnv["names"]) {
  if (talent) return `Add a comment — ${names.team} gets a notification`;
  return hearsComments(t, "independent") ? `Add a comment — ${names.independent} gets a notification` : `Add a comment — ${names.independent} can read it but won't be notified`;
}

/** The history, filtered by kind, and the comment box under it. `ref` is how a comment's notification scrolls here. */
function ActivitySection({ ref, item: t, changes, review, canComment }: { ref: Ref<HTMLElement>; item: WorkItem; canComment: boolean } & ReturnType<typeof neededNow>) {
  const { actor, actions, people, names } = useWorkspace();
  const talent = actor.role === "contributor";
  /** Which part of the history is showing; back to all of it when another item opens. */
  const [shown, setShown] = useState<{ id: string; kind: FeedFilter }>({ id: t.id, kind: "all" });
  if (shown.id !== t.id) setShown({ id: t.id, kind: "all" });
  const feed = historyOf(t, people, { changes, review });
  const comments = feed.filter((f) => f.kind === "comment").length;
  const filter = shown.id === t.id ? shown.kind : "all";
  const visible = filter === "all" ? feed : feed.filter((f) => (filter === "comments" ? f.kind === "comment" : f.kind === "event"));

  return (
    <Section title="Activity" ref={ref}>
      {/* Only worth filtering when there's both talk and history to tell apart. */}
      {comments > 0 && comments < feed.length && (
        <Pills<FeedFilter>
          aria-label="Show in activity"
          value={filter}
          onChange={(kind) => setShown({ id: t.id, kind })}
          options={[
            { value: "all", label: `All (${feed.length})` },
            { value: "comments", label: `Comments (${comments})` },
            { value: "updates", label: `Updates (${feed.length - comments})` },
          ]}
        />
      )}
      {feed.length === 0 && <p className="text-[13px] leading-[1.4] text-ink-2">Nothing yet.</p>}
      <ActivityFeed
        key={`${t.id}:${filter}`}
        items={keyed(visible, (f) => (f.kind === "event" ? `e-${f.ts}` : (f.id ?? `c-${f.ts}`))).map(({ item: f, key }) => (f.kind === "event" ? <EventEntry key={key} event={f} /> : <CommentEntry key={key} comment={f} />))}
      />
      {canComment && (
        <CommentBox
          label="Add a comment"
          placeholder={commentPlaceholder(t, talent, names)}
          maxLength={2000}
          validate={(v) => checkComment(v)?.message ?? null}
          onSend={(text) => void actions.comment(t, text)}
        />
      )}
    </Section>
  );
}

/** One entry in the history: something that happened, or a comment. */
type HistoryEntry = ReturnType<typeof historyOf>[number];

/** What happened: a quiet line, its dot on the avatars' centre line so the thread reads as one column. */
function EventEntry({ event: f }: { event: Extract<HistoryEntry, { kind: "event" }> }) {
  return (
    <li className="flex gap-3 text-[12.5px] leading-[1.45] text-ink-2">
      <span aria-hidden className="flex w-7 shrink-0 justify-center pt-[7px]">
        <span className="size-1.5 rounded-full bg-[#c3c3c3]" />
      </span>
      <span className="min-w-0 flex-1">
        {f.text} {f.at && <span className="whitespace-nowrap text-muted-2">· {f.at}</span>}
      </span>
    </li>
  );
}

/** What someone said: a comment as work tools show one — who, when, then the words — the same for both sides. */
function CommentEntry({ comment: f }: { comment: Extract<HistoryEntry, { kind: "comment" }> }) {
  const { actor, people } = useWorkspace();
  /** Which side the reader is on: their own comments say so. */
  const me = sideOf(actor);
  return (
    <li>
      <article aria-label={`Comment from ${f.name || people[f.side].name}`} className="flex gap-3">
        <Avatar src={people[f.side].avatar} size={28} />
        <div className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2.5 outline -outline-offset-1 outline-border">
          <p className="flex flex-wrap items-baseline gap-x-2 text-[13px] leading-[1.3]">
            <span className="font-semibold text-ink">{f.name || people[f.side].name}</span>
            {f.side === me && <span className="text-[12px] text-ink-2">(you)</span>}
            <span className="text-[12px] text-ink-2">{f.at}</span>
          </p>
          <p className="mt-1 text-[14px] leading-[1.45] whitespace-pre-line text-ink [overflow-wrap:anywhere]">{f.text}</p>
        </div>
      </article>
    </li>
  );
}

/**
 * The next step on this item for whoever's looking, pinned under the panel: send it for review
 * (with a note), take it back, approve it or ask for changes, or — on the Team Builder's own work —
 * mark it done or reopen it.
 */
type Step = "submit" | "takeBack" | "review" | "complete" | "reopen";

/** Which next step this person has on the item, if any — the sheet has no footer without one. */
function stepFor(t: WorkItem, { actor, access, names }: Pick<WorkspaceEnv, "actor" | "access" | "names">): Step | null {
  const can = (to: WorkItem["status"]) => transitionFor(t, actor, access, to, names).ok;
  if (actor.role === "contributor" && can("review")) return "submit";
  if (actor.role === "contributor" && t.status === "review" && can("doing")) return "takeBack";
  if (t.status === "review" && can("done")) return "review";
  if (actor.role !== "manager" || t.assignee === "independent") return null;
  if (!isCompleted(t.status)) return can("done") ? "complete" : null;
  return can("todo") ? "reopen" : null;
}

/** The footer for step `kind`, each with its own controls. */
function NextStep({ kind, item, focus }: { kind: Step; item: WorkItem; focus?: DetailFocus }) {
  if (kind === "submit") return <SubmitStep item={item} />;
  if (kind === "takeBack") return <TakeBackStep item={item} />;
  if (kind === "review") return <ReviewStep item={item} focus={focus} />;
  if (kind === "complete") return <CompleteStep item={item} />;
  return <ReopenStep item={item} />;
}

/** The Independent's: send it for review — with a note for the Team Builder, if they want one. */
function SubmitStep({ item: t }: { item: WorkItem }) {
  const { actions, names } = useWorkspace();
  const [note, setNote] = useState("");
  /** The note for the reviewer is optional, so it's a link until it's wanted — not a second text box beside the comment box. */
  const [noting, setNoting] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void actions.transition(t, "review", noting ? note : undefined, { success: `Sent ${refOf(t)} to ${names.team} for review` });
        setNote("");
        setNoting(false);
      }}
      className="flex flex-col gap-3"
    >
      {noting && <Textarea rows={2} autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder={`What ${names.team} should look at — links, anything to check`} aria-label={`Note for ${names.team}`} maxLength={1000} />}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setNoting((n) => !n);
            setNote("");
          }}
          className="inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {noting ? (
            "Remove the note"
          ) : (
            <>
              <ICONS.add size={16} aria-hidden /> Add a note for {names.team}
            </>
          )}
        </button>
        <Button type="submit" size="lg" variant="primary">
          Send for review
        </Button>
      </div>
    </form>
  );
}

/** The Independent's, while it waits on review: take it back to keep working on it. */
function TakeBackStep({ item: t }: { item: WorkItem }) {
  const { actions } = useWorkspace();
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-[13px] leading-[1.4] text-ink-2">Changed your mind? Take it back to keep working on it.</p>
      <Button size="lg" onClick={() => void actions.transition(t, "doing", undefined, { success: `Took ${refOf(t)} back — it's In progress again` })}>
        <ICONS.undo size={16} aria-hidden /> Take back
      </Button>
    </div>
  );
}

/** The Team Builder's, on work in review: approve it, or ask for changes — which takes a note first. */
function ReviewStep({ item: t, focus }: { item: WorkItem; focus?: DetailFocus }) {
  const { actions, names } = useWorkspace();
  const [changes, setChanges] = useState("");
  return (
    <div className="flex flex-col gap-3">
      <Textarea rows={2} autoFocus={focus === "changes"} value={changes} onChange={(e) => setChanges(e.target.value)} placeholder={`To ask for changes, say what ${names.independent} should fix`} aria-label="What should change" maxLength={1000} />
      <div className="flex justify-end gap-2">
        <Button
          size="lg"
          disabled={!changes.trim()}
          title={changes.trim() ? undefined : "Write what should change first"}
          onClick={() => {
            void actions.transition(t, "doing", changes, { success: `Sent ${refOf(t)} back to ${names.independent} with your note` });
            setChanges("");
          }}
        >
          Request changes
        </Button>
        <Button size="lg" variant="primary" onClick={() => void actions.transition(t, "done", undefined, { success: `Approved ${refOf(t)} — ${names.independent} has been told` })}>
          Approve
        </Button>
      </div>
    </div>
  );
}

/** The Team Builder's, on their own item or one nobody has: mark it done — it doesn't go through review. */
function CompleteStep({ item: t }: { item: WorkItem }) {
  const { actions } = useWorkspace();
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-[13px] leading-[1.4] text-ink-2">{t.assignee === "team" ? "Your own item — it doesn't go through review." : "Nobody is assigned. Assign it, or mark it done yourself."}</p>
      <Button size="lg" variant="primary" onClick={() => void actions.transition(t, "done", undefined, { success: `Marked ${refOf(t)} done` })}>
        <ICONS.check size={16} aria-hidden /> Mark done
      </Button>
    </div>
  );
}

/** The Team Builder's, on finished work of their own: reopen it. */
function ReopenStep({ item: t }: { item: WorkItem }) {
  const { actions } = useWorkspace();
  return (
    <div className="flex items-center justify-end gap-3">
      <Button size="lg" onClick={() => void actions.transition(t, "todo", undefined, { announce: `Reopened ${refOf(t)}` })}>
        <ICONS.undo size={16} aria-hidden /> Reopen
      </Button>
    </div>
  );
}

/**
 * Escape in a field leaves the field; the next one closes the sheet. The sheet listens on the
 * document as well as on itself, so stopping the bubble alone doesn't keep it open.
 */
function leaveOnly(e: KeyboardEvent) {
  e.stopPropagation();
  e.nativeEvent.stopImmediatePropagation();
}

/**
 * A name or description edited in place. What's typed is a draft: it saves on Enter (the name) or
 * when focus leaves, Escape throws it away, and if someone else changes the same text meanwhile the
 * draft isn't wiped — it says so, and the save is checked against what was there when editing
 * began, so it can't silently overwrite theirs.
 */
function DraftText({ value, editable, lock, onSave, label, multiline = false, placeholder, empty, className = "", autoFocus, updatedBy, validate }: DraftTextProps) {
  const draft = useTextDraft(value, onSave, validate);
  // The same lock as every other agreed value (LockedValue), laid out for text that wraps.
  if (!editable && lock)
    return (
      <Tip label="Agreed in the signed offer">
        <button type="button" onClick={() => lock.onLocked(lock.field)} aria-label={lockLabel(lock.field)} className={`${className} flex w-full items-start gap-2 rounded-md px-1 py-1 text-left whitespace-pre-line break-words hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary`}>
          <span className="min-w-0 flex-1">{value || empty}</span>
          <ICONS.lock size={14} aria-hidden className="mt-1 shrink-0 text-ink-2" />
        </button>
      </Tip>
    );
  if (!editable) return <p className={`${className} px-1 whitespace-pre-line break-words ${!value ? "text-ink-2" : ""}`}>{value || empty}</p>;

  const common = { value: draft.value, "aria-label": label, "aria-invalid": !!draft.error, placeholder, autoFocus, ...draft.handlers };
  return (
    <div className="flex flex-col gap-1">
      {multiline ? (
        <Textarea
          {...common}
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Escape") draft.escape(e);
          }}
          className={className}
        />
      ) : (
        // A one-line value that still wraps: a long name reads in full instead of being cut at the
        // sheet's edge. Enter saves rather than breaking the line, and a pasted line break is a space.
        <textarea
          {...common}
          rows={1}
          maxLength={400}
          onChange={(e) => common.onChange({ target: { value: e.target.value.replace(/\s*\n\s*/g, " ") } })}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLTextAreaElement).blur();
            }
            if (e.key === "Escape") draft.escape(e);
          }}
          className={`field-sizing-content min-w-0 resize-none rounded-md px-1 py-1 outline-none hover:bg-surface-2 focus:bg-white focus:ring-2 focus:ring-primary/30 ${className}`}
          style={{ fontVariationSettings: '"opsz" 14' }}
        />
      )}
      {draft.error && (
        <span role="alert" className="px-1 text-[12.5px] text-danger">
          {draft.error}
        </span>
      )}
      {draft.theirs && <TheirChange updatedBy={updatedBy} onUseTheirs={draft.takeTheirs} />}
    </div>
  );
}

type DraftTextProps = {
  value: string;
  editable: boolean;
  /** Text the signed offer agreed: which field it is, and what trying to change it does — say why it can't be. */
  lock?: { field: AgreedField; onLocked: (field: AgreedField) => void };
  onSave: (next: string, base: string) => void;
  label: string;
  multiline?: boolean;
  placeholder?: string;
  empty?: string;
  className?: string;
  autoFocus?: boolean;
  updatedBy?: string;
  validate?: (v: string) => string | null;
};

/**
 * The draft over a saved text, from the moment the field takes focus: `base` is the value editing
 * began from, so `theirs` can say someone else has changed it since, and the save is checked
 * against it. `handlers` go on the field; `escape` throws the draft away.
 */
function useTextDraft(value: string, onSave: (next: string, base: string) => void, validate?: (v: string) => string | null) {
  const [draft, setDraft] = useState<string | null>(null);
  const [base, setBase] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const editing = draft !== null;
  // Not being edited: follow the saved value, including other people's changes.
  if (!editing && base !== value) setBase(value);

  const commit = () => {
    if (draft === null) return;
    const next = draft.trim();
    const bad = validate?.(next) ?? null;
    if (bad) {
      setError(bad);
      return;
    }
    setDraft(null);
    setError(null);
    if (next !== base.trim()) onSave(next, base);
  };
  const handlers = {
    onFocus: () => {
      if (draft === null) {
        setDraft(value);
        setBase(value);
      }
    },
    onChange: (e: { target: { value: string } }) => {
      setDraft(e.target.value);
      setError(null);
    },
    // Leaving for another window or tab isn't a decision: the draft waits. Clicking elsewhere
    // on the page saves it.
    onBlur: () => {
      if (typeof document !== "undefined" && !document.hasFocus()) return;
      commit();
    },
  };
  /** Escape: the draft is thrown away, and the field — only the field — is left. */
  const escape = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    leaveOnly(e);
    setDraft(null);
    setError(null);
    (e.target as HTMLTextAreaElement).blur();
  };
  return { value: draft ?? value, error, theirs: editing && value !== base, handlers, escape, takeTheirs: () => (setDraft(null), setBase(value)) };
}

/** Someone else changed the text mid-edit: said, with Use theirs — or keep typing, and the save checks first. */
function TheirChange({ updatedBy, onUseTheirs }: { updatedBy?: string; onUseTheirs: () => void }) {
  return (
    <span role="status" className="flex flex-wrap items-center gap-2 rounded-md bg-warn-bg px-2 py-1.5 text-[12.5px] text-[#7a5e0a]">
      {updatedBy ?? "Someone"} changed this while you were editing.
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onUseTheirs} className="font-semibold underline">
        Use theirs
      </button>
      <span>or keep typing — saving will check first.</span>
    </span>
  );
}
