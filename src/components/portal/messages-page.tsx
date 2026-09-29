"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { Highlight, SearchBox } from "@/components/portal/ui";
import { CallDialog } from "@/components/portal/call-dialog";
import { ChatBubble, type Receipt } from "@/components/portal/chat-bubble";
import { ChatSourceLink } from "@/components/portal/chat-source-link";
import { Inbox, ThreadBody, ThreadHeader } from "@/components/portal/inbox";
import { ReturnNav, useReturnTo } from "@/components/portal/return";
import { ACCEPTED_FILES, checkFile, fileMeta, fileUrl, openChat, readBy, sendChat, sendFile, startCall, unreadChat, useLive, type ChatSource, type Live } from "@/lib/demo/live";
import type { Side } from "@/lib/work/model";

const DoneAll = ICONS.doneAll;
const Check = ICONS.check;
const Call = ICONS.call;
const Video = ICONS.video;
const Attach = ICONS.attach;
const Pdf = ICONS.pdf;
const Download = ICONS.download;

/** A conversation in either portal's inbox: who it's with, and the tab it's filed under. */
type Thread<K extends string> = { id: string; name: string; sub: string; kind: K };

/** The other side's face at 38 (list), 36 (header) and 30 (beside their messages) pixels. */
type Face<C> = (c: C, size: 38 | 36 | 30) => ReactNode;

/** The shared thread as this portal reads it: the live store, whose portal it is, and the other side. */
type Chat = { live: Live; side: Side; other: Side };

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
  /** A video call button beside the call button. */
  video?: boolean;
};

/**
 * Messages, in both portals: the conversation list and the thread. The thread is the shared one
 * from @/lib/demo/live, so what one side sends lands in the other's portal (TB-006 / IN-006 send,
 * TB-007 / IN-007 receive, TB-008 / IN-008 unread).
 */
export function MessagesPage<K extends string, C extends Thread<K>>({ side, conversations, tabs, emptyTab, emptyThread, face, badge, video = false }: MessagesPageProps<K, C>) {
  const other: Side = side === "team" ? "independent" : "team";
  const back = useReturnTo();
  const live = useLive();
  /** Opens on the tab that holds the thread until one is picked — it opened on an empty tab. */
  const [picked, setTab] = useState<K | null>(null);
  const tab = picked ?? conversations[0]?.kind ?? tabs[0];
  const [q, setQ] = useState("");
  const view = useThreadView(conversations[0]?.id);
  const composer = useComposer(side);
  const call = useCall(side);
  const conv = conversations.find((c) => c.id === view.active) ?? conversations[0];
  const chat: Chat = { live, side, other };

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
            active={view.active}
            onOpen={view.open}
          />
        }
        thread={
          !conv ? (
            <NoConversations text={emptyThread} />
          ) : (
            <>
              <ConversationHeader avatar={face(conv, 36)} name={conv.name} sub={conv.sub} badge={badge} video={video} onCall={call.start} onBack={view.back} />
              {call.link && <CallBanner name={conv.name} onJoin={call.enter} onDismiss={call.dismiss} />}
              <ChatLog conv={conv} face={face} chat={chat} q={q} onJoin={call.join} />
              <Composer {...composer} />
            </>
          )
        }
      />
      <CallDialog open={call.inCall} link={call.link} withWhom={conv?.name ?? ""} onEnd={call.end} />
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
  const wanted = useSearchParams().get("with");
  const [active, setActive] = useState(wanted ?? first ?? "");
  /** On a phone the list and the thread take turns; a `?with=` link lands on the thread. */
  const [opened, setOpened] = useState(!!wanted);
  const open = (id: string) => {
    setActive(id);
    setOpened(true);
  };
  return { active, opened, open, back: () => setOpened(false) };
}

/**
 * The composer's state, kept by the page so a draft stays put while the thread pane changes: the
 * message, the attachment waiting to go with it (or why it can't), and sending both. Its keys are
 * the Composer's props.
 */
function useComposer(side: Side) {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const send = () => {
    // TB-010 / IN-010: an attachment queued in the composer goes with this send.
    if (pending) {
      sendFile(side, pending);
      setPending(null);
    }
    sendChat(side, draft); // TB-006 / IN-006: an empty message can't be sent
    setDraft("");
  };

  /** TB-010 / IN-010 — validate type and size, then hold the file for preview before sending. */
  const pick = (file: File | undefined) => {
    if (!file) return;
    const problem = checkFile(file);
    setFileError(problem);
    setPending(problem ? null : file);
  };

  return { draft, onDraft: setDraft, pending, onRemove: () => setPending(null), fileError, onPick: pick, onSend: send };
}

/**
 * TB-011 / IN-011 — the call: its link once one is started or joined, whether this side is on it,
 * and the ways in and out.
 */
function useCall(side: Side) {
  const [link, setLink] = useState<string | null>(null);
  const [inCall, setInCall] = useState(false);

  /** TB-011 / IN-011: starts a call session and notifies the other party. */
  const start = () => {
    setLink(startCall(side));
    setInCall(true);
  };

  /** Joins a call from the thread, the one a call message links to. */
  const join = (to: string) => {
    setLink(to);
    setInCall(true);
  };

  return { link, inCall, start, join, enter: () => setInCall(true), dismiss: () => setLink(null), end: () => setInCall(false) };
}

/** The thread pane before there is anyone to talk to. */
function NoConversations({ text }: { text: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
      <p className="text-[15px] leading-[1.4] font-semibold text-ink">No conversations yet</p>
      <p className="max-w-[360px] text-[13px] leading-[1.45] text-muted">{text}</p>
    </div>
  );
}

/**
 * The conversation list: the search (names and what was said), the tabs, and a row per conversation
 * with the latest message, its receipt and the unread count.
 */
function ConversationList<K extends string, C extends Thread<K>>({ chat, conversations, tabs, tab, onTab, q, onSearch, emptyTab, face, active, onOpen }: {
  chat: Chat;
  conversations: C[];
  tabs: readonly K[];
  tab: K;
  onTab: (tab: K) => void;
  q: string;
  onSearch: (q: string) => void;
  emptyTab: (tab: K) => string;
  face: Face<C>;
  active: string;
  onOpen: (id: string) => void;
}) {
  const { live } = chat;
  const latest = latestOf(chat);
  // TB-009 / IN-009: match the conversation's name AND the message content.
  const hay = (c: C) => [c.name, c.sub, ...live.chat.map((m) => m.text ?? m.file?.name ?? "")].join(" ").toLowerCase();
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
      {list.length === 0 && <p className="px-4 py-10 text-center text-[12.5px] leading-[1.45] text-muted">{q.trim() ? `No conversations match “${q.trim()}”. Clear the search to see everyone.` : emptyTab(tab)}</p>}
      <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {list.map((c) => (
          <li key={c.id}>
            <ConversationRow name={c.name} sub={c.sub} avatar={face(c, 38)} on={c.id === active} q={q} latest={latest} onOpen={() => onOpen(c.id)} />
          </li>
        ))}
      </ul>
    </>
  );
}

/** The thread's latest message as the list shows it: when, what, its receipt (on one we sent), and the unread count. */
type Latest = { time?: string; text: string; receipt?: Receipt; unread: number };

/** The latest message, read once for every row — the demo has the one shared thread. */
function latestOf({ live, side, other }: Chat): Latest {
  const last = live.chat[live.chat.length - 1];
  return {
    time: last?.time,
    text: last?.text ?? last?.file?.name ?? "",
    receipt: last?.from === side ? (readBy(live, other, live.chat.length - 1) ? "seen" : "sent") : undefined,
    unread: unreadChat(live, side),
  };
}

/** A conversation in the list: their face and name, what it's about, and the latest message with its receipt and the unread count. */
function ConversationRow({ name, sub, avatar, on, q, latest, onOpen }: { name: string; sub: string; avatar: ReactNode; on: boolean; q: string; latest: Latest; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} aria-current={on} className={`flex w-full gap-3 rounded-lg p-3 text-left leading-[1.45] ${on ? "bg-accent-bg" : "hover:bg-surface-alt"}`}>
      {avatar}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-start gap-2">
          <span className={`min-w-0 flex-1 text-[13px] font-semibold ${on ? "text-accent-ink" : "text-ink-deep"}`}>
            <Highlight text={name} query={q} />
          </span>
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

/** The thread's top bar: who it's with, the badge beside them, and the call buttons. */
function ConversationHeader({ avatar, name, sub, badge, video, onCall, onBack }: { avatar: ReactNode; name: string; sub: string; badge?: ReactNode; video: boolean; onCall: () => void; onBack: () => void }) {
  return (
    <ThreadHeader onBack={onBack}>
      {avatar}
      <div className="flex min-w-0 flex-1 flex-col gap-px leading-[1.45] whitespace-nowrap">
        <p className="truncate text-[14px] font-semibold text-ink-deep">{name}</p>
        <p className="truncate text-[11.5px] text-muted">{sub}</p>
      </div>
      {badge}
      <button type="button" aria-label="Start call" onClick={onCall} className="flex size-9 items-center justify-center rounded-lg border border-border text-ink hover:bg-surface-alt">
        <Call size={20} aria-hidden />
      </button>
      {video && (
        <button type="button" aria-label="Start video call" onClick={onCall} className="flex size-9 items-center justify-center rounded-lg border border-border text-ink hover:bg-surface-alt">
          <Video size={20} aria-hidden />
        </button>
      )}
    </ThreadHeader>
  );
}

/** Under the header once a call is started: the other side has been told, with Join call and Dismiss. */
function CallBanner({ name, onJoin, onDismiss }: { name: string; onJoin: () => void; onDismiss: () => void }) {
  return (
    <p className="flex items-center gap-2 border-b border-line bg-[#f0f7ff] px-[18px] py-2.5 text-[12.5px] leading-[1.45] text-ink-deep">
      Call started — {name} has been notified.
      {/* IN-011 / TB-011 — opens the in-call surface with mute, camera and end call. */}
      <button type="button" onClick={onJoin} className="font-semibold text-primary underline underline-offset-2">
        Join call
      </button>
      <button type="button" onClick={onDismiss} className="ml-auto text-muted hover:text-ink">
        Dismiss
      </button>
    </p>
  );
}

/** The thread's messages, oldest first: calls to join, files to download, and bubbles with their receipts. */
function ChatLog<C extends { id: string; name: string }>({ conv, face, chat: { live, side, other }, q, onJoin }: { conv: C; face: Face<C>; chat: Chat; q: string; onJoin: (link: string) => void }) {
  return (
    <ThreadBody latest={`${conv.id}:${live.chat.length}`}>
      {/* When the thread started — it read "Today · 10:02 AM" whatever the time, even with nothing in it. */}
      {live.chat.length === 0 ? (
        <p className="py-6 text-center text-[12.5px] leading-[1.45] text-muted">No messages yet. Say hello — {conv.name} is notified.</p>
      ) : (
        <p className="flex items-center justify-center gap-2 text-[10.5px] leading-[1.45] text-muted">
          <span className="font-semibold">Started</span>
          <span className="h-3 w-px bg-line" />
          {live.chat[0].time}
        </p>
      )}
      {live.chat.map((m, i) => {
        const me = m.from === side;
        return (
          <div key={m.id} className={`flex items-end gap-2 ${me ? "justify-end" : ""}`}>
            {!me && face(conv, 30)}
            {m.call ? (
              <CallCard mine={me} name={conv.name} link={m.call.link} onJoin={onJoin} />
            ) : m.file ? (
              <FileCard id={m.id} file={m.file} source={m.source} side={side} />
            ) : (
              <ChatBubble mine={me} time={m.time} receipt={readBy(live, other, i) ? "seen" : "sent"} className="max-w-[420px]" /* hugs its text; a note from a proposal says so, and opens it */ header={m.source && <ChatSourceLink source={m.source} side={side} mine={me} />}>
                <Highlight text={m.text ?? ""} query={q} />
              </ChatBubble>
            )}
          </div>
        );
      })}
    </ThreadBody>
  );
}

/** A call in the thread: who started it, its link, and Join. */
function CallCard({ mine, name, link, onJoin }: { mine: boolean; name: string; link: string; onJoin: (link: string) => void }) {
  return (
    <div className="flex w-[420px] min-w-0 items-center gap-3 rounded-xl bg-white px-3.5 py-2.5 outline -outline-offset-1 outline-line">
      <span className="flex size-9 items-center justify-center rounded-lg bg-[#eef6ff] text-primary">
        <Call size={20} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-[1.45]">
        <span className="text-[13px] font-semibold text-ink-deep">{mine ? "You started a call" : `${name} started a call`}</span>
        <span className="truncate text-[10.5px] text-muted">{link}</span>
      </span>
      <button type="button" onClick={() => onJoin(link)} className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-[12px] leading-none font-semibold text-white">
        Join
      </button>
    </div>
  );
}

/** A file in the thread: its name and size, the note it came from, and its download — greyed out once the file is gone from this browser. */
function FileCard({ id, file, source, side }: { id: string; file: { name: string; meta: string }; source?: ChatSource; side: Side }) {
  return (
    <div className="flex w-[420px] min-w-0 items-center gap-3 rounded-tl-xl rounded-tr-xl rounded-br-xl rounded-bl bg-white px-3.5 py-2.5 outline -outline-offset-1 outline-line">
      <span className="flex size-9 items-center justify-center rounded-lg bg-[#fdf2f2] text-danger">
        <Pdf size={20} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-[1.45]">
        <span className="truncate text-[13px] font-semibold text-ink-deep">{file.name}</span>
        <span className="text-[10.5px] text-muted">{file.meta}</span>
        {source && <ChatSourceLink source={source} side={side} mine={false} />}
      </span>
      {/* TB-010 / IN-010: the recipient downloads the attachment straight from the thread. */}
      <a
        href={fileUrl(id) ?? undefined}
        download={file.name}
        aria-label={`Download ${file.name}`}
        aria-disabled={fileUrl(id) ? undefined : "true"}
        className={`flex size-8 items-center justify-center rounded-full border border-border ${fileUrl(id) ? "text-ink hover:bg-surface-alt" : "pointer-events-none text-ink-2 opacity-50"}`}
      >
        <Download size={18} aria-hidden />
      </a>
    </div>
  );
}

/** The composer: the attachment waiting to go with the next send (or why it can't), attach, the message and Send. */
function Composer({
  draft,
  onDraft,
  pending,
  onRemove,
  fileError,
  onPick,
  onSend,
}: {
  draft: string;
  onDraft: (text: string) => void;
  pending: File | null;
  onRemove: () => void;
  fileError: string | null;
  onPick: (file: File | undefined) => void;
  onSend: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <form
      className="flex flex-col gap-2 border-t border-line px-[18px] py-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
    >
      {/* TB-010 / IN-010: the attachment is previewed here before it is sent. */}
      {pending && (
        <div className="flex items-center gap-2.5 self-start rounded-lg bg-surface-alt px-3 py-2 text-[12px] leading-[1.45]">
          <Pdf size={16} aria-hidden className="text-danger" />
          <span className="font-semibold text-ink-deep">{pending.name}</span>
          <span className="text-muted">{fileMeta(pending)}</span>
          <button type="button" aria-label="Remove attachment" onClick={onRemove} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>
      )}
      {fileError && <p className="self-start text-[12px] leading-[1.45] text-danger">{fileError}</p>}
      <div className="flex items-center gap-2.5">
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED_FILES}
          className="hidden"
          onChange={(e) => {
            onPick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button type="button" aria-label="Attach file" onClick={() => fileInput.current?.click()} className="flex size-11 items-center justify-center rounded-full border border-border text-ink hover:bg-surface-alt">
          <Attach size={20} aria-hidden />
        </button>
        <input value={draft} onChange={(e) => onDraft(e.target.value)} aria-label="Message" placeholder="Send a message…" className="h-11 min-w-0 flex-1 rounded-lg border border-border px-4 text-[14px] tracking-[0.2px] outline-none placeholder:text-ink-2 focus:border-primary" />
        <button type="submit" aria-label="Send" disabled={!draft.trim() && !pending} className="flex size-9 items-center justify-center rounded-full bg-primary text-[16px] leading-[1.45] font-semibold text-white disabled:bg-ink-2">
          ↑
        </button>
      </div>
    </form>
  );
}
