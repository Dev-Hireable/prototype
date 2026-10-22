"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { Highlight, SearchBox } from "@/components/portal/ui";
import { ChatBubble, type Receipt } from "@/components/portal/chat-bubble";
import { TypingDots } from "@/components/portal/typing-dots";
import { ChatSourceLink, EntryDetails } from "@/components/portal/chat-source-link";
import { Inbox, ThreadBody, ThreadHeader } from "@/components/portal/inbox";
import { ReturnNav, useReturnTo, useWithReturn } from "@/components/portal/return";
import { MONTHS } from "@/lib/portal/dates";
import { entryDialogOf } from "@/lib/portal/entry-dialog";
import { savedOffset } from "@/lib/demo/clocks";
import { openChat, readBy, sendChat, taskHref, unreadChat, useLive, type ChatMsg, type ChatSource, type InterviewSlot, type Live, PAIR } from "@/lib/demo/live";
import { useDeal } from "@/lib/demo/deal";
import { fileDropHandlers, KEEP_FAILED, keepFiles, usePendingFiles } from "@/lib/demo/files";
import { markTyping, stopTyping, useTyping } from "@/lib/demo/typing";
import { AttachButton, FileTiles, PendingFiles } from "@/components/portal/attachments";
import { SendButton } from "@/components/portal/comment-box";
import { Tip } from "@/components/portal/tip";
import { keyed } from "@/lib/portal/keys";
import { readableRefs, taskOf, taskRefParts, tasksNamed } from "@/lib/work/refs";
import { todayDay } from "@/lib/work/dates";
import { TaskPreviews } from "@/components/workspace/task-preview";
import { bothClocks } from "@/lib/portal/timezones";
import { filesNote, refOf, type Side } from "@/lib/work/model";

const DoneAll = ICONS.doneAll;
const Check = ICONS.check;
const Pdf = ICONS.pdf;

/** A conversation in either portal's inbox: who it's with, and the tab it's filed under. */
type Thread<K extends string> = { id: string; name: string; sub: string; kind: K };

/** The other side's face at 38 (list), 36 (header) and 30 (beside their messages) pixels. */
export type Face<C> = (c: C, size: 38 | 36 | 30) => ReactNode;

/** The shared thread as this portal reads it: the live store, whose portal it is, and the other side. */
export type Chat = { live: Live; side: Side; other: Side };

/** What each portal's Messages page passes in: its conversations and tabs, and what the empty panes say. */
type MessagesPageProps<K extends string, C extends Thread<K>> = {
  side: Side;
  conversations: C[];
  tabs: readonly K[];
  /** What a tab with nothing in it says, when nothing is being searched for. */
  emptyTab: (tab: K) => string;
  /** What the thread pane says before there is anyone to talk to. */
  emptyThread: string;
  /** The other side's face at 38 (list), 36 (header) and 30 (beside their messages) pixels. */
  face: Face<C>;
  /** Beside the name in the thread's header: the trial's day. */
  badge?: ReactNode;
  /** #152 — where the engagement stands, tagged on the thread's row: Applied, Interview, Trial… */
  stage?: string;
  /** The other side's profile in a sheet, opened from the name in the thread's header. */
  profile?: (sheet: { open: boolean; onClose: () => void }) => ReactNode;
};

/**
 * Messages, in both portals: the conversation list and the thread. The thread is the shared one
 * from @/lib/demo/live, so what one side sends lands in the other's portal (TB-006 / IN-006 send,
 * TB-007 / IN-007 receive, TB-008 / IN-008 unread).
 */
export function MessagesPage<K extends string, C extends Thread<K>>({ side, conversations, tabs, emptyTab, emptyThread, face, badge, stage, profile }: MessagesPageProps<K, C>) {
  const other: Side = side === "team" ? "independent" : "team";
  const back = useReturnTo();
  const live = useLive();
  const [q, setQ] = useState("");
  const view = useThreadView(conversations[0]?.id);
  /** The tabs filter the one thread per person by stage: the first (still in hiring) until one is picked, or the tab of a `?with=` thread. */
  const [picked, setTab] = useState<K | null>(null);
  const tab = picked ?? conversations.find((c) => c.id === view.wanted)?.kind ?? tabs[0];
  const composer = useComposer(side);
  const conv = conversations.find((c) => c.id === view.active) ?? conversations[0];
  const chat: Chat = { live, side, other };
  /** TB-007 / IN-007 — the thread entry a notification opened (`?msg=`). */
  const focus = useSearchParams().get("msg");
  const [profileOpen, setProfileOpen] = useState(false);

  // TB-008 / IN-008: the count clears when the conversation is opened.
  useEffect(() => {
    openChat(side);
  }, [side, live.chat.length]);

  return (
    // A chat app, not a page with a card in it: the list and the thread are panels of their own beside the rail (@/components/portal/Inbox).
    <>
      <Inbox
        open={view.opened}
        nav={back ? <ReturnNav /> : undefined}
        list={
          <ConversationList
            chat={chat}
            conversations={conversations}
            tabs={tabs}
            tab={tab}
            onTab={setTab}
            q={q}
            onSearch={setQ}
            emptyTab={emptyTab}
            face={face}
            stage={stage}
            active={view.active}
            onOpen={view.open}
          />
        }
        thread={
          !conv ? (
            <NoConversations text={emptyThread} entry={focus ? live.chat.find((m) => m.id === focus && m.event) : undefined} side={side} />
          ) : (
            <>
              <ConversationHeader avatar={face(conv, 36)} name={conv.name} sub={conv.sub} badge={badge} onBack={view.back} onProfile={profile && (() => setProfileOpen(true))} />
              <ChatLog conv={conv} face={face} chat={chat} q={q} focus={focus} />
              <Composer {...composer} />
            </>
          )
        }
      />
      {profile?.({ open: profileOpen, onClose: () => setProfileOpen(false) })}
    </>
  );
}

/**
 * Which conversation is open, and whether its thread is the pane showing — on a phone the list and
 * the thread take turns.
 */
function useThreadView(first: string | undefined) {
  /** `?with=<id>` opens that thread — the contract page links here with its thread. The list hydrates after mount, so the id is
   *  kept even before it appears and takes effect as soon as the conversation does. */
  const params = useSearchParams();
  const wanted = params.get("with");
  const [active, setActive] = useState(wanted ?? first ?? "");
  /** On a phone the list and the thread take turns; a `?with=` or `?msg=` link lands on the thread. */
  const [opened, setOpened] = useState(!!wanted || params.has("msg"));
  const open = (id: string) => {
    setActive(id);
    setOpened(true);
  };
  return { active, wanted, opened, open, back: () => setOpened(false) };
}

/**
 * The composer's state, kept by the page so a draft stays put while the thread pane changes: the
 * message, the files waiting to go with it (or why one can't), and sending them together. Its keys
 * are the Composer's props.
 */
export function useComposer(side: Side) {
  const [draft, setDraft] = useState("");
  const pending = usePendingFiles();

  // TB-006 / IN-006: an empty message can't be sent. TB-010 / IN-010: the files waiting in the
  // composer go with it, kept in the browser's file store first so the other side can open them.
  const send = async () => {
    if (!draft.trim() && !pending.files.length) return;
    try {
      sendChat(side, draft, undefined, await keepFiles(pending.files));
    } catch {
      return pending.setError(KEEP_FAILED);
    }
    setDraft("");
    stopTyping(side);
    pending.clear();
  };
  // The other side sees typing dots while there's something in the box (@/lib/demo/typing).
  const onDraft = (text: string) => {
    setDraft(text);
    if (text.trim()) markTyping(side);
    else stopTyping(side);
  };

  return { draft, onDraft, pending: pending.files, onRemove: pending.remove, fileError: pending.error, onPick: pending.add, onSend: () => void send() };
}

/**
 * The thread pane before there is anyone to talk to. A notification can still open a step logged
 * before the thread did (an application), so that entry shows here, with its View details.
 */
function NoConversations({ text, entry, side }: { text: string; entry?: ChatMsg; side: Side }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      {entry?.event && <EventEntry m={entry} side={side} focused />}
      <div className="flex flex-col gap-2">
        <p className="text-[15px] leading-[1.4] font-semibold text-ink">No conversations yet</p>
        <p className="max-w-[360px] text-[13px] leading-[1.45] text-muted">{text}</p>
      </div>
    </div>
  );
}

/**
 * The conversation list: the search (names and what was said), the tabs, and a row per conversation
 * with the latest message, its receipt and the unread count.
 */
function ConversationList<K extends string, C extends Thread<K>>({ chat, conversations, tabs, tab, onTab, q, onSearch, emptyTab, face, stage, active, onOpen }: {
  chat: Chat;
  conversations: C[];
  tabs: readonly K[];
  tab: K;
  onTab: (tab: K) => void;
  q: string;
  onSearch: (q: string) => void;
  emptyTab: (tab: K) => string;
  face: Face<C>;
  stage?: string;
  active: string;
  onOpen: (id: string) => void;
}) {
  const { live } = chat;
  /** The contract's tasks, so a pasted task link reads as the task in a row and is found by its name. */
  const tasks = useDeal()?.contract?.tasks ?? [];
  const latest = latestOf(chat, tasks);
  // TB-009 / IN-009: match the conversation's name AND the message content.
  const hay = (c: C) => [c.name, c.sub, ...live.chat.filter((m) => seenBy(m, chat.side)).map((m) => previewOf(m, tasks))].join(" ").toLowerCase();
  const needle = q.trim().toLowerCase();
  // react-doctor-disable-next-line react-doctor/js-set-map-lookups -- `hay(c)` is a string: a substring search, not a list lookup
  const list = conversations.filter((c) => c.kind === tab && hay(c).includes(needle));
  return (
    <>
      <div className="shrink-0 px-4 pb-3">
        <SearchBox value={q} onChange={onSearch} placeholder="Search by name or keyword" />
      </div>
      <div className="flex shrink-0 gap-5 px-4 text-[12.5px] leading-[1.45] font-semibold shadow-[inset_0_-1px_0_var(--color-line)]">
        {tabs.map((t) => (
          <button key={t} type="button" onClick={() => onTab(t)} aria-pressed={tab === t} className={`border-b-2 py-2 capitalize ${tab === t ? "border-primary text-ink-deep" : "border-transparent text-muted"}`}>
            {t}
          </button>
        ))}
      </div>
      {list.length === 0 && (q.trim() || emptyTab(tab)) && <p className="px-4 py-10 text-center text-[12.5px] leading-[1.45] text-muted">{q.trim() ? `No conversations match “${q.trim()}”. Clear the search to see everyone.` : emptyTab(tab)}</p>}
      <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {list.map((c) => (
          <li key={c.id}>
            <ConversationRow name={c.name} sub={c.sub} stage={stage} avatar={face(c, 38)} on={c.id === active} q={q} latest={latest} onOpen={() => onOpen(c.id)} />
          </li>
        ))}
      </ul>
    </>
  );
}

/** The thread's latest message as the list shows it: when, what, its receipt (on one we sent), and the unread count. */
type Latest = { time?: string; text: string; receipt?: Receipt; unread: number };

/** Whether `side` sees a message: everything, but a step logged for the other side only. */
const seenBy = (m: ChatMsg, side: Side) => !m.event?.only || m.event.only === side;

/** A thread's tasks, as far as a message's line names them. */
type Tasks = Parameters<typeof readableRefs>[1];

/** What a message says in one line: its text (a pasted task link read as the task), its file, or its logged step. */
const previewOf = (m: ChatMsg, tasks: Tasks) => (m.text === undefined ? undefined : readableRefs(m.text, tasks)) ?? (m.files?.length ? filesNote(m.files) : undefined) ?? m.file?.name ?? m.event?.text ?? "";

/** The latest message, read once for every row (the demo has the one shared thread). Its time is the thread's last. */
function latestOf({ live, side, other }: Chat, tasks: Tasks): Latest {
  const index = live.chat.findLastIndex((m) => seenBy(m, side));
  const last = live.chat[index];
  return {
    time: last?.time,
    text: last ? previewOf(last, tasks) : "",
    receipt: last && !last.event && last.from === side ? (readBy(live, other, index) ? "seen" : "sent") : undefined,
    unread: unreadChat(live, side),
  };
}

/** A conversation in the list: their face and name, what it's about, and the latest message with its receipt and the unread count. */
function ConversationRow({ name, sub, stage, avatar, on, q, latest, onOpen }: { name: string; sub: string; stage?: string; avatar: ReactNode; on: boolean; q: string; latest: Latest; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} aria-current={on} className={`flex w-full gap-3 rounded-lg p-3 text-left leading-[1.45] ${on ? "bg-accent-bg" : "hover:bg-surface-alt"}`}>
      {avatar}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-start gap-2">
          <span className={`min-w-0 flex-1 text-[13px] font-semibold ${on ? "text-accent-ink" : "text-ink-deep"}`}>
            <Highlight text={name} query={q} />
          </span>
          {stage && <span className="rounded-full bg-surface-2 px-2 py-px text-[10.5px] font-semibold text-ink-2">{stage}</span>}
          <span className={`text-[11px] ${on ? "text-[#6b7480]" : "text-muted"}`}>{latest.time}</span>
        </span>
        <span className={`text-[11px] ${on ? "text-[#5b6b7a]" : "text-muted"}`}>{sub}</span>
        <span className="flex items-center gap-[5px]">
          {/* Only on a message we sent, and blue only once they have read it. */}
          {latest.receipt && (latest.receipt === "seen" ? <DoneAll size={16} aria-label="Seen" className="text-primary" /> : <Check size={16} aria-label="Sent" className="text-muted" />)}
          <span className={`min-w-0 flex-1 truncate text-[12px] ${on ? "text-[#3d4a57]" : "text-muted"}`}>
            <Highlight text={latest.text} query={q} />
          </span>
          {latest.unread > 0 && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 text-[10.5px] leading-none font-semibold text-white">{latest.unread > 9 ? "9+" : latest.unread}</span>}
        </span>
      </span>
    </button>
  );
}

/** The thread's top bar: who it's with — their face and name open their profile — and the badge beside them. */
function ConversationHeader({ avatar, name, sub, badge, onBack, onProfile }: { avatar: ReactNode; name: string; sub: string; badge?: ReactNode; onBack: () => void; onProfile?: () => void }) {
  const who = (
    <>
      {avatar}
      <span className="flex min-w-0 flex-col gap-px text-left leading-[1.45] whitespace-nowrap">
        <span className={`truncate text-[14px] font-semibold text-ink-deep ${onProfile ? "group-hover:text-primary group-hover:underline" : ""}`}>{name}</span>
        <span className="truncate text-[11.5px] text-muted">{sub}</span>
      </span>
    </>
  );
  return (
    <ThreadHeader onBack={onBack}>
      <div className="flex min-w-0 flex-1">
        {onProfile ? (
          <button type="button" onClick={onProfile} aria-label={`View ${name}'s profile`} className="group -m-1 flex min-w-0 items-center gap-3 rounded-lg p-1 focus-visible:outline-2 focus-visible:outline-primary">
            {who}
          </button>
        ) : (
          <div className="flex min-w-0 items-center gap-3">{who}</div>
        )}
      </div>
      {badge}
    </ThreadHeader>
  );
}

/** The thread, oldest first, under a divider for each day: logged steps, files to download, and bubbles with their receipts. */
export function ChatLog<C extends { id: string; name: string }>({ conv, face, chat: { live, side, other }, q, focus }: { conv: C; face: Face<C>; chat: Chat; q: string; focus: string | null }) {
  // Messages has no calls any more: one saved before they went isn't shown.
  const rows = live.chat.map((m, i) => ({ m, i })).filter(({ m }) => seenBy(m, side) && !("call" in m));
  const typing = useTyping(other);
  // The thread scrolls to its end as it opens; a notification's entry is then brought into view.
  useEffect(() => {
    if (focus) document.getElementById(`msg-${focus}`)?.scrollIntoView({ block: "center" });
  }, [focus, rows.length]);
  return (
    // Its end moves with a new message and with the other side's typing dots, so both come into view.
    <ThreadBody latest={`${conv.id}:${live.chat.length}:${typing}`}>
      {rows.length === 0 && <p className="py-6 text-center text-[12.5px] leading-[1.45] text-muted">No messages yet. Say hello. {conv.name} is notified.</p>}
      {rows.map(({ m, i }, n) => {
        const me = m.from === side;
        const day = dayOf(m.at);
        // A divider wherever the day changes, so a thread that runs over weeks can be followed.
        const divider = day && day !== dayOf(rows[n - 1]?.m.at) ? <DayDivider label={day} /> : null;
        if (m.event)
          return (
            <div key={m.id} className="flex flex-col gap-3">
              {divider}
              <EventEntry m={m} side={side} focused={m.id === focus} />
            </div>
          );
        return (
          <div key={m.id} className="flex flex-col gap-3">
            {divider}
            <div className={`flex items-end gap-2 ${me ? "justify-end" : ""}`}>
              {!me && face(conv, 30)}
              {m.file ? (
                <FileCard file={m.file} source={m.source} side={side} />
              ) : (
                <ChatBubble mine={me} time={m.time} receipt={readBy(live, other, i) ? "seen" : "sent"} className="max-w-[420px]" /* hugs its text; a note from a proposal says so, and opens it */ header={m.source && <ChatSourceLink source={m.source} side={side} mine={me} />}>
                  {/* TB-010 / IN-010: what was sent with it opens (an image, a PDF) or downloads straight from the thread. */}
                  {m.files?.length ? <FileTiles files={m.files} /> : null}
                  {m.text && <ChatText text={m.text} query={q} side={side} mine={me} />}
                </ChatBubble>
              )}
            </div>
          </div>
        );
      })}
      {typing && (
        <div className="flex items-end gap-2">
          {face(conv, 30)}
          <TypingDots tone="message" label={`${conv.name} is typing`} />
        </div>
      )}
    </ThreadBody>
  );
}

/**
 * A message's words, with each task on the contract it names a link that opens it on this side's
 * contract page, the task's name in its tip: a typed "#4" as typed, a pasted link (the sheet's Copy
 * link) as the task's name rather than its address. Those tasks show as cards under the words. Any
 * other "#n" or link stays as written, and what's searched for is marked throughout.
 */
function ChatText({ text, query, side, mine }: { text: string; query: string; side: Side; mine: boolean }) {
  const deal = useDeal();
  const tasks = deal?.contract?.tasks ?? [];
  const parts = taskRefParts(text);
  const named = deal ? tasksNamed(parts, tasks) : [];
  return (
    <>
      {/* One inline run: the bubble stacks its children, so the words and their links share one span. */}
      <span>
        {keyed(parts, (p) => p.text).map(({ item: p, key }) => {
          const t = deal ? taskOf(p, tasks) : undefined;
          if (!t || !deal) return <Highlight key={key} text={p.text} query={query} />;
          const name = `${refOf(t)} ${t.title}`;
          return (
            <Tip key={key} label={name}>
              <Link href={taskHref(side, deal.roleSlug, t.id)} aria-label={name} className={`rounded font-semibold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 ${mine ? "text-white underline focus-visible:outline-white" : "text-accent-ink focus-visible:outline-primary"}`}>
                <Highlight text={p.taskId ? t.title : p.text} query={query} />
              </Link>
            </Tip>
          );
        })}
      </span>
      {deal && named.length > 0 && <TaskPreviews tasks={named} today={todayDay()} names={PAIR_NAMES} open={(t) => ({ href: taskHref(side, deal.roleSlug, t.id) })} />}
    </>
  );
}

/** Who has a task, as its card in a message says: the two people on the thread. */
const PAIR_NAMES = { team: PAIR.team.name, independent: PAIR.independent.name };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Today", "Yesterday" or "Mon 21 Sep" for a message sent at `at`; nothing for one saved before messages were dated. */
function dayOf(at: number | undefined, now = new Date()): string | undefined {
  if (at === undefined) return undefined;
  const d = new Date(at);
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/**
 * #153 / #341 — an interview's time in both people's clocks, on both sides: "Tue 29 Sep, 10:00 AM
 * your time · 10:00 PM Juan's time". Each clock is that side's saved time zone (or its device's);
 * the slot keeps the clock it was booked in.
 */
function SlotTimes({ slot, side }: { slot: InterviewSlot; side: Side }) {
  const other: Side = side === "team" ? "independent" : "team";
  return <span className="w-full text-ink-deep">{bothClocks(slot.when, slot.offset, savedOffset(side), { offset: savedOffset(other), first: PAIR[other].name.split(" ")[0] })}</span>;
}

/** Between two days of the thread. */
function DayDivider({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-3 text-[11px] leading-[1.45] font-semibold text-muted">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </p>
  );
}

/**
 * TB-007 / IN-007 — a step logged in the thread (an application, an interview, an offer, a payment):
 * what happened and when, and View details, which opens it on this side: a proposal or an offer in
 * its dialog over the chat, anything else on its page. A link to the thread lands on its entry, which
 * is then highlighted.
 */
function EventEntry({ m, side, focused }: { m: ChatMsg; side: Side; focused: boolean }) {
  const withReturn = useWithReturn();
  const href = m.event?.href[side];
  const dialog = href ? entryDialogOf(href, side) : null;
  return (
    <p id={`msg-${m.id}`} className={`mx-auto flex max-w-[480px] flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-lg px-3 py-2 text-center text-[12.5px] leading-[1.45] ${focused ? "bg-accent-bg outline outline-accent" : "bg-surface-alt"}`}>
      <span className="font-medium text-ink-deep">{m.event?.text}</span>
      {m.event?.slot && <SlotTimes slot={m.event.slot} side={side} />}
      <span className="text-muted">{m.time}</span>
      {dialog ? (
        <EntryDetails dialog={dialog} side={side} />
      ) : (
        href && (
          <Link href={withReturn(href)} className="font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">
            View details
          </Link>
        )
      )}
    </p>
  );
}

/**
 * A file sent before messages kept theirs in the browser's file store: its name and size and the note
 * it came from. The file itself is gone, so there's nothing to open.
 */
function FileCard({ file, source, side }: { file: { name: string; meta: string }; source?: ChatSource; side: Side }) {
  return (
    <div className="flex w-[420px] max-w-full min-w-0 items-center gap-3 rounded-tl-xl rounded-tr-xl rounded-br-xl rounded-bl bg-white px-3.5 py-2.5 outline -outline-offset-1 outline-line">
      <span className="flex size-9 items-center justify-center rounded-lg bg-[#fdf2f2] text-danger">
        <Pdf size={20} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-[1.45]">
        <span className="truncate text-[13px] font-semibold text-ink-deep">{file.name}</span>
        <span className="text-[10.5px] text-muted">{file.meta}</span>
        {source && <ChatSourceLink source={source} side={side} mine={false} />}
      </span>
    </div>
  );
}

/**
 * The composer: the files waiting to go with the next send (or why one can't), then one box — the
 * paperclip at its start, the message, and the send glyph at its end, blue once there's something to
 * send. Files can be dropped on it or pasted into it too.
 */
export function Composer({ draft, onDraft, pending, onRemove, fileError, onPick, onSend }: { draft: string; onDraft: (text: string) => void; pending: readonly File[]; onRemove: (file: File) => void; fileError: string | null; onPick: (files: FileList | null) => void; onSend: () => void }) {
  return (
    <form
      className="flex flex-col gap-2 border-t border-line px-[18px] py-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
      {...fileDropHandlers(onPick)}
    >
      {/* TB-010 / IN-010: the files are previewed here before they're sent. */}
      {pending.length > 0 && (
        <div className="pt-1.5 pr-1.5">
          <PendingFiles files={pending} onRemove={onRemove} />
        </div>
      )}
      {fileError && (
        <p role="alert" className="self-start text-[12px] leading-[1.45] text-danger">
          {fileError}
        </p>
      )}
      <div className="flex h-11 items-center gap-1 rounded-lg border border-border px-1.5 focus-within:border-primary">
        <AttachButton onPick={onPick} />
        <input value={draft} onChange={(e) => onDraft(e.target.value)} aria-label="Message" placeholder="Send a message…" className="h-full min-w-0 flex-1 bg-transparent px-1.5 text-[14px] tracking-[0.2px] outline-none placeholder:text-ink-2" />
        <SendButton type="submit" disabled={!draft.trim() && !pending.length} />
      </div>
    </form>
  );
}
