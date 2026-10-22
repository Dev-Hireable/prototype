"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode, type Ref, type RefObject } from "react";
import { ICONS } from "@/components/icons";
import { Button, Checkbox, Drawer, InfoBanner, KebabMenu, Textarea } from "@/components/portal/ui";
import { Badge } from "@/components/portal/badge";
import { MenuAction } from "@/components/portal/controls";
import { CommentBox } from "@/components/portal/comment-box";
import { Tip } from "@/components/portal/tip";
import { EFFORT_HELP, hearsComments, isArchived, isCompleted, openBlockers, refOf, unfinishedOf, type Subtask, type WorkItem } from "@/lib/work/model";
import { capsFor, changeFor, tickRefusal, transitionFor, type AgreedField, type Caps } from "@/lib/work/permissions";
import { checkComment, checkSubtaskTitle, checkTitle } from "@/lib/work/validate";
import { useWorkspace, type DetailFocus, type WorkspaceEnv } from "./context";
import { AssigneeField, DateField, DependenciesField, EffortField, PriorityField, ProjectField, Prop, StatusField, TagsField, TypeField } from "./fields";
import { AgreedNotice } from "./contract-lock";
import { lockable, lockLabel } from "./lockable";
import { ActivityStream } from "./activity-feed";
import { QuickAdd } from "./quick-add";

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
  const env = useWorkspace();
  const step = stepFor(item, env);
  const canComment = capsFor(item, env.actor, env.access).comment;
  /** The agreed part someone just tried to change on a task from the signed offer: its notice shows until they close it. */
  const [locked, setLocked] = useState<AgreedField | null>(null);
  /** The first date this person can change (PlanDates): where the sheet starts when it's opened to set dates. */
  const firstDate = useRef<HTMLButtonElement>(null);
  /** The question a send for review of unfinished work asks (SendAnyway): where the sheet starts when it's opened to send it. */
  const confirm = useRef<HTMLDivElement>(null);
  /** The Activity section — where a comment's notification and a comment just sent scroll to. */
  const activity = useRef<HTMLElement>(null);
  /** A comment sent from the foot: the stream scrolls to it. */
  const sent = () => requestAnimationFrame(() => activity.current?.scrollIntoView({ block: "end", behavior: "smooth" }));
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`${refOf(item)} ${item.title}`}
      width={560}
      testId="task-panel"
      // The header's first control is the name: opening on it would put the name mid-edit every time.
      // Opened to set its dates, it starts on the first one this person can change — and on the close
      // button still when neither is theirs. Opened to send unfinished work, it starts on the question.
      initialFocus={focus === "dates" ? firstDate : focus === "submit" ? confirm : "close"}
      header={<PanelHeading item={item} byId={byId} focus={focus} pending={pending} onLocked={setLocked} />}
      actions={<PanelActions item={item} />}
      footer={(step || canComment) && <SheetFoot key={item.id} item={item} byId={byId} step={step} focus={focus} canComment={canComment} confirmRef={confirm} onSent={sent} />}
    >
      <DetailBody item={item} items={items} byId={byId} focus={focus} firstDate={firstDate} locked={locked} onLocked={setLocked} activityRef={activity} />
    </Drawer>
  );
}

/**
 * The item's name and where it stands, in the sheet's header, so they stay in view while the sheet
 * scrolls — the header used to hold only its number ("#1"), with the name down in the body. The
 * number and the name share the line beside the close; a long name ends in "…" with the whole of it
 * in a tooltip, and scrolls while it's edited. Whether a change is still saving follows them.
 */
function PanelHeading({ item: t, byId, focus, pending, onLocked }: { item: WorkItem; byId: ReadonlyMap<string, WorkItem>; focus?: DetailFocus; pending: boolean; onLocked: (field: AgreedField) => void }) {
  const { actor, access, actions, names } = useWorkspace();
  const canRename = changeFor(t, actor, access, "title", names).ok;
  const blockers = isCompleted(t.status) ? [] : openBlockers(t, byId);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex h-8 min-w-0 items-center gap-1">
        {t.number ? <span className="shrink-0 font-display text-[18px] leading-none font-semibold text-ink-2 tabular-nums">{refOf(t)}</span> : null}
        <DraftText
          oneLine
          key={`title-${t.id}`}
          label="Name"
          value={t.title}
          editable={canRename}
          lock={lockable(t, "title", actor.role, access) ? { field: "title", onLocked } : undefined}
          autoFocus={focus === "title"}
          updatedBy={t.updatedBy}
          validate={(v) => checkTitle(v)?.message ?? null}
          onSave={(next, base) => void actions.patch({ ...t, title: base }, { title: next })}
          className={`font-display text-[18px] leading-[1.35] font-semibold ${isCompleted(t.status) ? "text-ink-2" : "text-ink"}`}
        />
        {pending && (
          <span role="status" className="shrink-0 text-[12px] font-medium text-ink-2">
            Saving…
          </span>
        )}
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


/** How an item's creation reads in its history, whichever way it was made. */
const CREATED = /^(Added by |Agreed in the signed offer)/;

function DetailBody({ item: t, items, byId, focus, firstDate, locked, onLocked, activityRef }: { item: WorkItem; items: readonly WorkItem[]; byId: ReadonlyMap<string, WorkItem>; focus?: DetailFocus; firstDate: Ref<HTMLButtonElement>; locked: AgreedField | null; onLocked: (field: AgreedField | null) => void; activityRef: RefObject<HTMLElement | null> }) {
  const { actor, access, names } = useWorkspace();
  const caps = capsFor(t, actor, access);
  const canDescribe = changeFor(t, actor, access, "description", names).ok;
  /** A comment's notification opens the item on its comments: the conversation comes into view. */
  useEffect(() => {
    if (focus === "comments") activityRef.current?.scrollIntoView({ block: "start" });
  }, [focus, activityRef]);
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

      <ActivitySection ref={activityRef} item={t} changes={changes} review={review} canComment={caps.comment} />
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

/** Changes asked for: who asked and when, and their note. What to do next is the foot's Send for review, not said again here. */
function ChangesBanner({ changes }: { changes: NonNullable<WorkItem["changes"]> }) {
  const { names } = useWorkspace();
  return (
    <InfoBanner tone="warn">
      <span className="font-semibold">{changes.by || names.team} asked for changes</span> · {changes.at}
      {changes.note && <span className="mt-1 block">“{changes.note}”</span>}
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
          placeholder="Name the step (Enter adds another)"
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

/** The comment box's prompt: who a comment notifies, or that the Independent can read it but won't hear. */
function commentPlaceholder(t: WorkItem, talent: boolean, names: WorkspaceEnv["names"]) {
  if (talent) return `Add a comment. ${names.team} will be notified.`;
  return hearsComments(t, "independent") ? `Add a comment. ${names.independent} will be notified.` : `Add a comment. ${names.independent} can read it but won't be notified.`;
}

/**
 * The item's activity: one stream of what people said and what happened, in time order, as in a
 * work chat. "Comments only" hides what happened, when there's both to tell apart. `ref` is how a
 * comment's notification, and a comment just sent from the foot, scroll here.
 */
function ActivitySection({ ref, item: t, changes, review, canComment }: { ref: Ref<HTMLElement>; item: WorkItem; canComment: boolean } & ReturnType<typeof neededNow>) {
  const { actor, people, names } = useWorkspace();
  /** Whether only the talk shows; back to everything when another item opens. */
  const [only, setOnly] = useState<{ id: string; on: boolean }>({ id: t.id, on: false });
  const onlyComments = only.id === t.id && only.on;
  const feed = historyOf(t, people, { changes, review });
  const comments = feed.filter((f) => f.kind === "comment").length;
  const toggle = comments > 0 && comments < feed.length && (
    <button type="button" aria-pressed={onlyComments} onClick={() => setOnly({ id: t.id, on: !onlyComments })} className={`ml-auto rounded-full px-2.5 py-1 text-[12px] leading-[1.2] font-medium transition-colors ${onlyComments ? "bg-accent-bg text-accent-ink" : "text-ink-2 hover:bg-surface-2"}`}>
      Comments only
    </button>
  );
  return (
    <Section title="Activity" ref={ref} aside={toggle}>
      <ActivityStream key={t.id} feed={onlyComments ? feed.filter((f) => f.kind === "comment") : feed} empty={conversationEmpty(t, actor.role === "contributor", names, canComment)} />
    </Section>
  );
}

/** An empty stream (a task nobody has touched or said anything on): who a first comment reaches — or, for someone who can't comment, just that there's none. */
function conversationEmpty(t: WorkItem, talent: boolean, names: WorkspaceEnv["names"], canComment: boolean) {
  if (!canComment) return "No comments on this task.";
  if (talent) return `No comments yet. Ask ${names.team} a question or share an update. They'll get a notification.`;
  return hearsComments(t, "independent")
    ? `No comments yet. Ask ${names.independent} a question or share an update. They'll get a notification.`
    : `No comments yet. ${names.independent} can read what you write here but won't be notified.`;
}

/** A text box a step opens in the foot: what should change (the review), or the note with a review request (the send). */
type FootBox = "changes" | "note";

/**
 * Something in the foot that opening the item for a reason opens (`focus`: asking for changes, a send
 * that asks first): open from the start when it's opened for that, and again whenever it's opened for
 * it anew. Otherwise it opens and closes by hand.
 */
function useOpenedBy<T extends string>(focus: DetailFocus | undefined, reason: DetailFocus, value: T) {
  const [open, setOpen] = useState<T | null>(focus === reason ? value : null);
  const [seen, setSeen] = useState(focus);
  if (seen !== focus) {
    setSeen(focus);
    if (focus === reason) setOpen(value);
  }
  return [open, setOpen] as const;
}

/**
 * The sheet's foot, pinned under the scroll: the next step on the item, if there is one, and the
 * comment box — always in reach, as in a work chat, however far down the sheet is scrolled. A step's
 * own text box (what should change, the note with a review request) has the foot to itself while
 * it's open: one box at a time, never two alike stacked up.
 */
function SheetFoot({ item: t, byId, step, focus, canComment, confirmRef, onSent }: { item: WorkItem; byId: ReadonlyMap<string, WorkItem>; step: Step | null; focus?: DetailFocus; canComment: boolean; confirmRef: RefObject<HTMLDivElement | null>; onSent: () => void }) {
  const { actor, actions, names } = useWorkspace();
  const [box, setBox] = useOpenedBy<FootBox>(focus, "changes", "changes");
  const writing = (box === "changes" && step === "review") || (box === "note" && step === "submit") ? box : null;
  return (
    <div className="flex flex-col gap-3">
      {step && <NextStep key={step} kind={step} item={t} byId={byId} focus={focus} box={writing} onBox={setBox} confirmRef={confirmRef} />}
      {canComment && !writing && (
        <CommentBox
          label="Add a comment"
          placeholder={commentPlaceholder(t, actor.role === "contributor", names)}
          maxLength={2000}
          validate={(v) => checkComment(v)?.message ?? null}
          onSend={(text) => {
            void actions.comment(t, text);
            onSent();
          }}
        />
      )}
    </div>
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

/** The footer for step `kind`, each with its own controls; `box` is the text box it has open, if any. */
function NextStep({ kind, item, byId, focus, box, onBox, confirmRef }: { kind: Step; item: WorkItem; byId: ReadonlyMap<string, WorkItem>; focus?: DetailFocus; box: FootBox | null; onBox: (box: FootBox | null) => void; confirmRef: RefObject<HTMLDivElement | null> }) {
  if (kind === "submit") return <SubmitStep item={item} byId={byId} focus={focus} noting={box === "note"} onNoting={(on) => onBox(on ? "note" : null)} confirmRef={confirmRef} />;
  if (kind === "takeBack") return <TakeBackStep item={item} />;
  if (kind === "review") return <ReviewStep item={item} focus={focus} asking={box === "changes"} onAsking={(on) => onBox(on ? "changes" : null)} />;
  if (kind === "complete") return <CompleteStep item={item} />;
  return <ReopenStep item={item} />;
}

/**
 * The Independent's: send it for review, with a note for the Team Builder if they want one. Work that
 * still waits on something or has subtasks open can go too, once one question has said what's open.
 */
function SubmitStep({ item: t, byId, focus, noting, onNoting, confirmRef }: { item: WorkItem; byId: ReadonlyMap<string, WorkItem>; focus?: DetailFocus; noting: boolean; onNoting: (on: boolean) => void; confirmRef: RefObject<HTMLDivElement | null> }) {
  const { actions, names, openTask } = useWorkspace();
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useOpenedBy(focus, "submit", "ask");
  const unfinished = unfinishedOf(t, byId);
  const asking = !!confirming && !!unfinished;
  // The button that asked is gone: the question takes the focus.
  useEffect(() => {
    if (asking) confirmRef.current?.focus();
  }, [asking, confirmRef]);
  /** Done with what the sheet was opened for, so opening it for that again asks again. */
  const settle = () => {
    setConfirming(null);
    if (focus === "submit") openTask(t.id);
  };
  const send = () => {
    void actions.transition(t, "review", noting ? note : undefined, { success: `Sent ${refOf(t)} to ${names.team} for review` });
    setNote("");
    onNoting(false);
    settle();
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (unfinished && !asking) setConfirming("ask");
        else send();
      }}
      className="flex flex-col gap-3"
    >
      {noting && <Textarea rows={2} autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder={`What ${names.team} should look at: links, anything to check`} aria-label="Note with your review request" maxLength={1000} />}
      {asking && unfinished ? (
        <SendAnyway ref={confirmRef} question={unfinishedQuestion(t, unfinished)} onCancel={settle} />
      ) : (
        <div className="flex items-center justify-between gap-3">
          <NoteToggle
            noting={noting}
            onToggle={() => {
              onNoting(!noting);
              setNote("");
            }}
          />
          <Button type="submit" size="lg" variant="primary">
            Send for review
          </Button>
        </div>
      )}
    </form>
  );
}

/** The note for the reviewer is optional, so it's a link until it's wanted: then its box has the foot, in place of the comment box. */
function NoteToggle({ noting, onToggle }: { noting: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">
      {noting ? (
        "Remove the note"
      ) : (
        <>
          <ICONS.add size={16} aria-hidden /> Add a note with your review request
        </>
      )}
    </button>
  );
}

/** The one question before unfinished work goes for review, and its two answers: send it anyway (the form's submit), or not now. */
function SendAnyway({ ref, question, onCancel }: { ref: Ref<HTMLDivElement>; question: string; onCancel: () => void }) {
  const id = useId();
  return (
    <div ref={ref} tabIndex={-1} role="group" aria-labelledby={id} className="flex flex-col gap-3 rounded-md outline-none focus-visible:outline-2 focus-visible:outline-primary">
      <p id={id} className="text-[13.5px] leading-[1.4] text-ink">
        {question}
      </p>
      <div className="flex justify-end gap-2">
        <Button size="lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="lg" variant="primary">
          Send for review
        </Button>
      </div>
    </div>
  );
}

/** "#3 is waiting on #2 Draft two logo directions and has 1 open subtask. Send it for review anyway?" */
function unfinishedQuestion(t: WorkItem, { blockers, openSubtasks }: NonNullable<ReturnType<typeof unfinishedOf>>) {
  const waits = blockers.length ? `is waiting on ${listed(blockers.map((b) => `${refOf(b)} ${b.title}`))}` : null;
  const subs = openSubtasks ? `has ${openSubtasks} open ${openSubtasks === 1 ? "subtask" : "subtasks"}` : null;
  const what = waits && subs ? `${waits}${blockers.length > 1 ? "," : ""} and ${subs}` : (waits ?? subs);
  return `${refOf(t)} ${what}. Send it for review anyway?`;
}

/** "a", "a and b", "a, b and c". */
const listed = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** The Independent's, while it waits on review: take it back to keep working on it. */
function TakeBackStep({ item: t }: { item: WorkItem }) {
  const { actions } = useWorkspace();
  return (
    <div className="flex justify-end">
      <Button size="lg" onClick={() => void actions.transition(t, "doing", undefined, { success: `Took ${refOf(t)} back. It's In progress again.` })}>
        <ICONS.undo size={16} aria-hidden /> Take back to keep working
      </Button>
    </div>
  );
}

/**
 * The Team Builder's, on work in review: approve it, or ask for changes. Asking opens one labelled box
 * for what should change, which has the foot to itself until it's sent or put away. Where nothing can
 * be sent back (a trial that's over), Request changes says why instead.
 */
function ReviewStep({ item: t, focus, asking, onAsking }: { item: WorkItem; focus?: DetailFocus; asking: boolean; onAsking: (on: boolean) => void }) {
  const { actor, access, actions, names, openTask } = useWorkspace();
  const sendBack = transitionFor(t, actor, access, "doing", names);
  /** Done with what the sheet was opened for (asking for changes), so opening it for that again opens the box again. */
  const settle = () => {
    onAsking(false);
    if (focus === "changes") openTask(t.id);
  };
  if (asking && sendBack.ok) return <ChangesBox item={t} onDone={settle} />;
  return (
    <div className="flex justify-end gap-2">
      <Button size="lg" disabled={!sendBack.ok} title={sendBack.ok ? undefined : sendBack.reason} onClick={() => onAsking(true)}>
        Request changes
      </Button>
      <Button
        size="lg"
        variant="primary"
        onClick={() => {
          void actions.transition(t, "done", undefined, { success: `Approved ${refOf(t)}. ${names.independent} has been told.` });
          settle();
        }}
      >
        Approve
      </Button>
    </div>
  );
}

/** What should change: the box's label says who it's for, and Send request waits for words, saying so beside it. */
function ChangesBox({ item: t, onDone }: { item: WorkItem; onDone: () => void }) {
  const { actions, names } = useWorkspace();
  const [changes, setChanges] = useState("");
  const id = useId();
  const empty = !changes.trim();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] leading-[1.4] font-semibold text-ink">
        What should {names.independent} change?
      </label>
      <Textarea id={id} rows={3} autoFocus value={changes} onChange={(e) => setChanges(e.target.value)} maxLength={1000} />
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
        {empty && <span className="text-[12.5px] leading-[1.4] text-ink-2">Write what should change first.</span>}
        <Button size="lg" onClick={onDone}>
          Cancel
        </Button>
        <Button
          size="lg"
          variant="primary"
          disabled={empty}
          onClick={() => {
            void actions.transition(t, "doing", changes, { success: `Sent ${refOf(t)} back to ${names.independent} with your note` });
            onDone();
          }}
        >
          Send request
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
      <p className="text-[13px] leading-[1.4] text-ink-2">{t.assignee === "team" ? "Your own item, so it doesn't go through review." : "Nobody is assigned. Assign it, or mark it done yourself."}</p>
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
function DraftText(props: DraftTextProps) {
  if (props.oneLine) return <OneLineText {...props} />;
  return <WrappingText {...props} />;
}

function WrappingText({ value, editable, lock, onSave, label, multiline = false, placeholder, empty, className = "", autoFocus, updatedBy, validate }: DraftTextProps) {
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

/**
 * Whether the text in `ref`'s element is cut short: read from the element itself, again whenever it
 * resizes or the component redraws (a new `value`), so a tooltip that holds the whole of it is already
 * on before the pointer arrives.
 */
function useCut() {
  const [el, ref] = useState<HTMLElement | null>(null);
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!el) return () => {};
      const observer = new ResizeObserver(notify);
      observer.observe(el);
      return () => observer.disconnect();
    },
    [el],
  );
  const cut = useSyncExternalStore(subscribe, () => !!el && el.scrollWidth > el.clientWidth + 1, () => false);
  return { ref, cut };
}

/**
 * DraftText on one line (the header's name): cut to "…" when it doesn't fit, with the whole of it in
 * a tooltip — only when it is cut, and not while it's being edited, when the field scrolls instead.
 */
function OneLineText({ value, editable, lock, onSave, label, empty, className = "", autoFocus, updatedBy, validate }: DraftTextProps) {
  const draft = useTextDraft(value, onSave, validate);
  const { ref: measure, cut } = useCut();
  const box = `min-w-0 flex-1 truncate rounded-md px-1 py-0.5 ${className}`;
  if (!editable && lock)
    return (
      <Tip label={cut ? `${value} · Agreed in the signed offer` : "Agreed in the signed offer"}>
        <button ref={measure} type="button" onClick={() => lock.onLocked(lock.field)} aria-label={lockLabel(lock.field)} className={`${box} flex items-center gap-2 text-left hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary`}>
          <span className="min-w-0 flex-1 truncate">{value || empty}</span>
          <ICONS.lock size={14} aria-hidden className="shrink-0 text-ink-2" />
        </button>
      </Tip>
    );
  if (!editable)
    return (
      <Tip label={value} off={!cut}>
        <p ref={measure} className={`${box} ${!value ? "text-ink-2" : ""}`}>
          {value || empty}
        </p>
      </Tip>
    );
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <Tip label={value} off={!cut || draft.editing}>
        {/* Enter saves; out of focus, text-overflow cuts the name to "…". */}
        <input
          value={draft.value}
          aria-label={label}
          aria-invalid={!!draft.error}
          autoFocus={autoFocus}
          maxLength={400}
          {...draft.handlers}
          ref={measure}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
            if (e.key === "Escape") draft.escape(e);
          }}
          className={`${box} w-full text-ellipsis outline-none hover:bg-surface-2 focus:bg-white focus:ring-2 focus:ring-primary/30`}
          style={{ fontVariationSettings: '"opsz" 14' }}
        />
      </Tip>
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
  /** The header's name: one line, cut to "…" with a tooltip (OneLineText). */
  oneLine?: boolean;
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
  const escape = (e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    e.preventDefault();
    leaveOnly(e);
    setDraft(null);
    setError(null);
    e.currentTarget.blur();
  };
  return { value: draft ?? value, editing, error, theirs: editing && value !== base, handlers, escape, takeTheirs: () => (setDraft(null), setBase(value)) };
}

/** Someone else changed the text mid-edit: said, with Use theirs — or keep typing, and the save checks first. */
function TheirChange({ updatedBy, onUseTheirs }: { updatedBy?: string; onUseTheirs: () => void }) {
  return (
    <span role="status" className="flex flex-wrap items-center gap-2 rounded-md bg-warn-bg px-2 py-1.5 text-[12.5px] text-warn-ink">
      {updatedBy ?? "Someone"} changed this while you were editing.
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onUseTheirs} className="font-semibold underline">
        Use theirs
      </button>
      <span>or keep typing. Saving will check first.</span>
    </span>
  );
}
