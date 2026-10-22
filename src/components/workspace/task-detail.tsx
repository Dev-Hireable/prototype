"use client";

import { useEffect, useId, useRef, useState, type Ref, type RefObject } from "react";
import { flushSync } from "react-dom";
import { ICONS } from "@/components/icons";
import { Avatar, Button, Drawer, InfoBanner, KebabMenu } from "@/components/portal/ui";
import { Badge } from "@/components/portal/badge";
import { MenuAction } from "@/components/portal/controls";
import { CommentBox } from "@/components/portal/comment-box";
import { Tip } from "@/components/portal/tip";
import { ICON_BUTTON } from "@/components/portal/styles";
import { KEEP_FAILED, keepFiles } from "@/lib/demo/files";
import { hearsComments, isArchived, isCompleted, isOverdue, openBlockers, refOf, type WorkFile, type WorkItem } from "@/lib/work/model";
import { capsFor, changeFor, type AgreedField } from "@/lib/work/permissions";
import { checkComment, checkTitle } from "@/lib/work/validate";
import { taskLinkAt, taskLinkHtml } from "@/lib/work/refs";
import { notice } from "@/lib/work/store";
import { useWorkspace, type DetailFocus, type WorkspaceEnv } from "./context";
import { DateField, StatusField } from "./fields";
import { AgreedNotice } from "./contract-lock";
import { lockable } from "./lockable";
import { ActivityStream } from "./activity-feed";
import { DraftText } from "./draft-text";
import { LockChip } from "./meta";
import { openBox, stepFor, useStepBox, type Step, type StepBox } from "./next-step";
import { StepButtons, StepPanel } from "./task-step";
import { TaskProps } from "./task-props";

/**
 * TB-063 / IN-077 — an item opened in full, in a sheet that holds the focus until it's closed. Its
 * top bar says where it stands and holds its next step (Send for review, Approve…), with any words
 * that step needs in a panel under it; then come its dates and name, its properties as rows of icons
 * in one gutter, and one history of everything that happened, comments included. The comment box
 * is pinned at the foot. Each thing is said once: nothing in the history is repeated as a property,
 * and what a callout shows isn't repeated in the history. Whatever isn't this person's to change
 * reads as plain text.
 */
export function TaskDetail({ open, item, items, byId, focus, pending, onClose }: { open: boolean; item: WorkItem; items: readonly WorkItem[]; byId: ReadonlyMap<string, WorkItem>; focus?: DetailFocus; pending: boolean; onClose: () => void }) {
  const env = useWorkspace();
  const step = stepFor(item, env);
  const canComment = capsFor(item, env.actor, env.access).comment;
  /** The agreed part someone just tried to change on a task from the signed offer: its notice shows until they close it. */
  const [locked, setLocked] = useState<AgreedField | null>(null);
  /** The first date this person can change (DatesLine): where the sheet starts when it's opened to set dates. */
  const firstDate = useRef<HTMLButtonElement>(null);
  /** The note with a review request: where the sheet starts when it's opened to send unfinished work, the question read with it. */
  const note = useRef<HTMLTextAreaElement>(null);
  /** The Activity section — where a comment's notification and a comment just sent scroll to. */
  const activity = useRef<HTMLElement>(null);
  /** The top bar: where the focus goes back to when the step's panel closes. */
  const top = useRef<HTMLDivElement>(null);
  const [opened, setBox] = useStepBox(focus);
  const box = openBox(step, opened);
  /**
   * Done with the step's panel — and with what the sheet was opened for, so opening it for that again
   * opens the panel again. The panel shuts at once, so the focus moves on before the button that had
   * it is gone: left on the page for a moment, the sheet would take it back itself.
   */
  const closeBox = (sent: boolean) => {
    flushSync(() => setBox(null));
    focusAfterPanel(top.current, sent);
    if (focus === "submit" || focus === "changes") env.openTask(item.id);
  };
  /** A comment sent from the foot: the stream scrolls to it. */
  const sent = () => requestAnimationFrame(() => activity.current?.scrollIntoView({ block: "end", behavior: "smooth" }));
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`${refOf(item)} ${item.title}`}
      width={560}
      testId="task-panel"
      // The name is a field: opening on it would put it mid-edit every time. Opened to set its dates,
      // the sheet starts on the first one this person can change — and on the close button still
      // when neither is theirs. Opened to send unfinished work, it starts on the note, with the question.
      initialFocus={focus === "dates" ? firstDate : focus === "submit" ? note : "close"}
      header={<TopBar ref={top} item={item} byId={byId} step={step} box={box} onBox={setBox} />}
      actions={<PanelActions item={item} />}
      subheader={box && <StepPanel box={box} item={item} byId={byId} firstRef={note} onDone={closeBox} />}
      // While a step's panel is open the comment box steps aside: one box to write in at a time.
      footer={canComment && !box && <SheetFoot item={item} onSent={sent} />}
    >
      <TitleBlock item={item} focus={focus} pending={pending} firstDate={firstDate} onLocked={setLocked} />
      <DetailBody item={item} items={items} byId={byId} focus={focus} locked={locked} onLocked={setLocked} activityRef={activity} />
    </Drawer>
  );
}

/**
 * The top bar, after the »: where the item stands — its status (a menu of the moves this person can
 * make), Blocked while it waits on open work, Read-only (and why) when it's part of finished work —
 * and, at the bar's end beside the ⋯, its next step (Send for review, Approve…), which steps aside
 * while its panel is open. On a phone the step wraps under the status, still at the end.
 */
function TopBar({ ref, item: t, byId, step, box, onBox }: { ref: Ref<HTMLDivElement>; item: WorkItem; byId: ReadonlyMap<string, WorkItem>; step: Step | null; box: StepBox | null; onBox: (box: StepBox) => void }) {
  const blockers = isCompleted(t.status) ? [] : openBlockers(t, byId);
  return (
    <div ref={ref} className="flex min-h-9 min-w-0 flex-1 flex-wrap items-center gap-2">
      <span data-status className="inline-flex">
        <StatusField item={t} />
      </span>
      {blockers.length > 0 && (
        <Tip label={`Waits on ${blockers.map((b) => `${refOf(b)} ${b.title}`).join(", ")}`}>
          <span className="inline-flex">
            <Badge tone="danger" icon={<ICONS.blocked aria-hidden />}>
              Blocked
            </Badge>
          </span>
        </Tip>
      )}
      <LockChip item={t} />
      {step && !box && (
        <span data-step className="ml-auto flex flex-wrap items-center gap-2">
          <StepButtons step={step} item={t} onBox={onBox} />
        </span>
      )}
    </div>
  );
}

/**
 * The top bar's end: Copy link, for anyone — the item's link, which opens it, and which shows as a card
 * with its name when pasted in a comment or a message (TaskPreviews) — then deleting, from the ⋯ menu.
 * Restoring a deleted item is the deleted banner's one action, not a second copy here.
 */
function PanelActions({ item }: { item: WorkItem }) {
  const { actor, access, actions } = useWorkspace();
  return (
    <>
      {item.number ? (
        <Tip label="Copy link">
          <button type="button" aria-label={`Copy link to ${refOf(item)}`} onClick={() => void copyLink(item)} className={`${ICON_BUTTON} size-8`}>
            <ICONS.link size={18} aria-hidden />
          </button>
        </Tip>
      ) : null}
      {!isArchived(item) && capsFor(item, actor, access).archive && (
        <KebabMenu label="Item actions" icon="horizontal" iconSize={20} menuWidth={200}>
          <MenuAction destructive onClick={() => void actions.archive(item)} icon={<ICONS.trash size={18} aria-hidden />}>
            Delete task
          </MenuAction>
        </KebabMenu>
      )}
    </>
  );
}

/**
 * Copies the task's link as Copy link does anywhere: its address as text, and a link named after the
 * task ("#4 Pick a typography pairing") for wherever formatting pastes, like Slack, Docs or an email.
 * The toast names the task, or says this browser wouldn't allow it.
 */
async function copyLink(item: WorkItem) {
  const url = taskLinkAt(window.location, item.id);
  try {
    await writeLink(url, taskLinkHtml(url, `${refOf(item)} ${item.title}`));
    notice(`Copied the link to “${item.title}”`);
  } catch {
    notice(`Couldn't copy the link to “${item.title}”: this browser didn't allow it.`, "danger");
  }
}

/** Both forms on the clipboard where the browser takes formatted copies, the address alone where it takes only text. */
function writeLink(url: string, html: string) {
  if (typeof ClipboardItem === "undefined") return navigator.clipboard.writeText(url);
  return navigator.clipboard.write([new ClipboardItem({ "text/plain": new Blob([url], { type: "text/plain" }), "text/html": new Blob([html], { type: "text/html" }) })]);
}

/**
 * Where the focus goes once the step's panel, which had it, closes: back to the step that opened it,
 * or, once sent, to the status the step moved — or to the close, when that isn't this person's to move.
 */
function focusAfterPanel(bar: HTMLElement | null, sent: boolean) {
  const to = (sent ? null : bar?.querySelector<HTMLElement>("[data-step] button")) ?? bar?.querySelector<HTMLElement>("[data-status] button") ?? bar?.closest('[data-slot="sheet-content"]')?.querySelector<HTMLElement>("button");
  to?.focus();
}

/**
 * When it's planned, then its number and name, heading the body. The name stays in view while the
 * rest scrolls: it sticks under the top bar, with a hairline once the body runs beneath it. A long
 * name ends in "…" with the whole of it in a tooltip, and scrolls while it's edited. Whether a change
 * is still saving follows it.
 */
function TitleBlock({ item: t, focus, pending, firstDate, onLocked }: { item: WorkItem; focus?: DetailFocus; pending: boolean; firstDate: Ref<HTMLButtonElement>; onLocked: (field: AgreedField) => void }) {
  const { actor, access, actions, names } = useWorkspace();
  const canRename = changeFor(t, actor, access, "title", names).ok;
  return (
    <>
      <DatesLine item={t} firstDate={firstDate} onLocked={onLocked} />
      {/* `-top-6`: a sticky box keeps clear of its scroller's padding, so it's pulled up by as much to sit flush under the top bar. */}
      <div className="stuck-edge sticky -top-6 z-10 -mx-6 -my-2 flex min-w-0 items-center gap-1 bg-white px-6 py-2">
        {t.number ? <span className="shrink-0 font-display text-[20px] leading-none font-semibold text-ink-2 tabular-nums">{refOf(t)}</span> : null}
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
          className={`font-display text-[20px] leading-[1.35] font-semibold ${isCompleted(t.status) ? "text-ink-2" : "text-ink"}`}
        />
        {pending && (
          <span role="status" className="shrink-0 text-[12px] font-medium text-ink-2">
            Saving…
          </span>
        )}
      </div>
    </>
  );
}


/**
 * When it's planned, over its name: start → due, or a milestone's one date, each changed in place. A
 * date that isn't set and isn't this person's to set isn't shown, and a date shown alone says which
 * it is. `firstDate` goes on the first of them this person can change. The calendar turns red once
 * the due date has passed.
 */
function DatesLine({ item: t, firstDate, onLocked }: { item: WorkItem; firstDate: Ref<HTMLButtonElement>; onLocked: (field: AgreedField) => void }) {
  const env = useWorkspace();
  const first = firstDateOf(t, env);
  const milestone = t.type === "milestone";
  const shows = (which: "start" | "due") => !!t[which] || changeFor(t, env.actor, env.access, which).ok;
  const start = !milestone && shows("start");
  const due = shows("due");
  if (!start && !due) return null;
  return (
    <div className="flex min-h-7 min-w-0 items-center gap-1.5 text-[13px]">
      <ICONS.calendar size={16} aria-hidden className={`shrink-0 ${isOverdue(t, env.today) ? "text-danger" : "text-muted-2"}`} />
      <span className="flex min-w-0 flex-wrap items-center gap-x-0.5">
        {start && <DateField bare prefix={due ? undefined : "Starts"} ref={first === "start" ? firstDate : undefined} item={t} which="start" onLocked={onLocked} />}
        {/* Start – deadline, as every date range in the app reads. */}
        {start && due && (
          <span aria-hidden className="text-ink-2">
            –
          </span>
        )}
        {due && <DateField bare prefix={start || milestone ? undefined : "Due"} ref={first === "due" ? firstDate : undefined} item={t} which="due" onLocked={onLocked} />}
      </span>
    </div>
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

/** How an item's creation reads in its history, whichever way it was made. */
const CREATED = /^(Added by |Agreed in the signed offer)/;

function DetailBody({ item: t, items, byId, focus, locked, onLocked, activityRef }: { item: WorkItem; items: readonly WorkItem[]; byId: ReadonlyMap<string, WorkItem>; focus?: DetailFocus; locked: AgreedField | null; onLocked: (field: AgreedField | null) => void; activityRef: RefObject<HTMLElement | null> }) {
  const { actor, access } = useWorkspace();
  const caps = capsFor(t, actor, access);
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

      <TaskProps item={t} items={items} byId={byId} onLocked={onLocked} />

      <ActivitySection ref={activityRef} item={t} items={items} changes={changes} review={review} canComment={caps.comment} />
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

/**
 * The sheet's notes run its full width, level with the rows under them. A page banner ends with its
 * text; in the sheet, a short one beside full-width rows looked cut off.
 */
const SHEET_NOTE = "w-full rounded-lg";

/** A deleted item says so, and by whom; restoring it is this banner's one action. */
function DeletedBanner({ item: t, restorable }: { item: WorkItem; restorable: boolean }) {
  const { actions } = useWorkspace();
  return (
    <InfoBanner className={SHEET_NOTE}>
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

/** Changes asked for: who asked and when, and their note. What to do next is the top bar's Send for review, not said again here. */
function ChangesBanner({ changes }: { changes: NonNullable<WorkItem["changes"]> }) {
  const { names } = useWorkspace();
  return (
    <InfoBanner tone="warn" className={SHEET_NOTE}>
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
    <InfoBanner className={SHEET_NOTE}>
      <span className="font-semibold">{talent ? `With ${names.team} for review` : `${names.independent} sent this for review`}</span> · {review.at}
      {review.note && <span className="mt-1 block">“{review.note}”</span>}
    </InfoBanner>
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

/**
 * The item's activity: one stream of what people said and what happened, in time order, as in a work
 * chat — set off from the properties by a band across the sheet, as the reference sets off its
 * comments. "Comments only" hides what happened, when there's both to tell apart. `ref` is how a
 * comment's notification, and a comment just sent from the foot, scroll here — clear of the name
 * that sticks at the top. An item a comment names, by a typed "#4" or its pasted link, opens from it
 * and shows as a card under it (`items`).
 */
function ActivitySection({ ref, item: t, items, changes, review, canComment }: { ref: Ref<HTMLElement>; item: WorkItem; items: readonly WorkItem[]; canComment: boolean } & ReturnType<typeof neededNow>) {
  const { actor, people, names } = useWorkspace();
  /** Whether only the talk shows; back to everything when another item opens. */
  const [only, setOnly] = useState<{ id: string; on: boolean }>({ id: t.id, on: false });
  const onlyComments = only.id === t.id && only.on;
  const feed = historyOf(t, people, { changes, review });
  const comments = feed.filter((f) => f.kind === "comment").length;
  return (
    <section ref={ref} aria-label="Activity" className="-mx-6 flex scroll-mt-14 flex-col gap-2.5 border-t-[6px] border-[#f5f5f5] px-6 pt-4">
      <h3 className="flex items-center gap-3 text-[14px] leading-[1.4] font-semibold text-ink">
        Activity
        {comments > 0 && comments < feed.length && (
          <button type="button" aria-pressed={onlyComments} onClick={() => setOnly({ id: t.id, on: !onlyComments })} className={`ml-auto rounded-full px-2.5 py-1 text-[12px] leading-[1.2] font-medium transition-colors ${onlyComments ? "bg-accent-bg text-accent-ink" : "text-ink-2 hover:bg-surface-2"}`}>
            Comments only
          </button>
        )}
      </h3>
      <ActivityStream key={t.id} feed={onlyComments ? feed.filter((f) => f.kind === "comment") : feed} items={items} empty={conversationEmpty(t, actor.role === "contributor", names, canComment)} />
    </section>
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

/**
 * The sheet's foot, pinned under the scroll: the comment box — always in reach, as in a work chat,
 * however far down the sheet is scrolled — and who a comment reaches. Files go with a comment, kept
 * in this browser's file store first so the comment that names them opens them for either side.
 */
function SheetFoot({ item: t, onSent }: { item: WorkItem; onSent: () => void }) {
  const { actions } = useWorkspace();
  const notified = useId();
  const send = async (text: string, picked: File[]) => {
    let files: WorkFile[];
    try {
      files = await keepFiles(picked);
    } catch {
      return KEEP_FAILED;
    }
    void actions.comment(t, text, files);
    onSent();
    return null;
  };
  return (
    <div className="flex flex-col gap-2">
      <CommentBox attach label="Add a comment" placeholder="Add a comment" maxLength={2000} describedBy={notified} validate={(v) => checkComment(v)?.message ?? null} onSend={send} />
      <Notified id={notified} item={t} />
    </div>
  );
}

/**
 * Who a comment reaches, where the reference lists a task's subscribers: the other side's photo and
 * that they'll be told — or, on the Team Builder's own items, that the Independent can read it but
 * won't be. Nobody follows or unfollows a task, so there's no one to add.
 */
function Notified({ id, item: t }: { id: string; item: WorkItem }) {
  const { actor, people, names } = useWorkspace();
  const talent = actor.role === "contributor";
  const hears = talent || hearsComments(t, "independent");
  const name = talent ? names.team : names.independent;
  return (
    <p id={id} className="flex items-center gap-2 text-[12.5px] leading-[1.3] text-ink-2">
      <Avatar src={people[talent ? "team" : "independent"].avatar} size={20} className={hears ? "" : "opacity-50 grayscale"} />
      {hears ? `${name} will be notified` : `${name} can read it but won't be notified`}
    </p>
  );
}
