"use client";

import { useSearchParams } from "next/navigation";
import { ChatBubble } from "@/components/portal/ChatBubble";
import { ChatSourceLink } from "@/components/portal/ChatSourceLink";
import { useEffect, useRef, useState } from "react";
import { ReturnNav, useReturnTo } from "@/components/portal/return";
import { ICONS } from "@/components/admin/icons";
import { CallDialog } from "@/components/portal/CallDialog";
import { Badge } from "@/components/portal/Badge";
import { Highlight, SearchBox } from "@/components/independent/ui";
import { Inbox, ThreadBody, ThreadHeader } from "@/components/portal/Inbox";
import { Avatar } from "@/components/team/ui";
import { JOB_TYPE_LABEL } from "@/lib/demo/job-types";
import { ACCEPTED_FILES, checkFile, fileMeta, fileUrl, openChat, sendChat, sendFile, readBy, startCall, unreadChat, useLive } from "@/lib/demo/live";
import { conversationsFor } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";

const DoneAll = ICONS.doneAll;
const Check = ICONS.check;
const Call = ICONS.call;
const Attach = ICONS.attach;
const Pdf = ICONS.pdf;
const Download = ICONS.download;

/**
 * Figma "Home / Messages" (Team Builder). The thread is the shared one from @/lib/demo/live,
 * so sending here lands in the Independent portal (TB-006 send, TB-007 receive, TB-008 unread).
 */
export default function Messages() {
  const back = useReturnTo();
  const live = useLive();
  const { contracts, canChat, candidates, roles } = useDemo();
  const trial = contracts.find((c) => c.type === "trial" && c.status.label !== "Ended");
  const contract = contracts[0];
  const pipelineRole = roles.find((r) => r.slug === candidates.find((c) => c.independent === "juan-dela-cruz")?.role)?.title;
  // TB-006 — a candidate thread opens when they are invited to interview, not when they apply.
  const conversations = conversationsFor({
    hired: contracts.length > 0,
    inPipeline: canChat,
    role: contract?.role ?? pipelineRole,
    contract: contract ? (contract.status.label === "Ended" ? "Ended" : JOB_TYPE_LABEL[contract.type]) : undefined,
  });
  /** Opens on the tab that holds the thread until one is picked — it opened on an empty Conversations tab. */
  const [picked, setTab] = useState<"conversations" | "candidates" | null>(null);
  const tab = picked ?? conversations[0]?.kind ?? "conversations";
  const [q, setQ] = useState("");
  /** `?with=<id>` opens that thread — the contract page links here with the independent's thread. The list hydrates after mount, so the id is
   *  kept even before it appears and takes effect as soon as the conversation does. */
  const wanted = useSearchParams().get("with");
  const [active, setActive] = useState(wanted ?? conversations[0]?.id ?? "");
  /** On a phone the list and the thread take turns; a `?with=` link lands on the thread. */
  const [opened, setOpened] = useState(!!wanted);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [callLink, setCallLink] = useState<string | null>(null);
  const [inCall, setInCall] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const conv = conversations.find((c) => c.id === active) ?? conversations[0];
  const unread = unreadChat(live, "team");
  const last = live.chat[live.chat.length - 1];

  // TB-008: the count clears when the conversation is opened.
  useEffect(() => {
    openChat("team");
  }, [live.chat.length]);

  /**
   * TB-009: match the conversation name AND the message content. The two tabs split the list the
   * way the sheet defines them — Conversations is talent under an active contract, Candidates is
   * anyone with an offer sent or an interview scheduled.
   */
  const hay = (c: (typeof conversations)[number]) => [c.name, c.sub, ...live.chat.map((m) => m.text ?? m.file?.name ?? "")].join(" ").toLowerCase();
  const list = conversations.filter((c) => c.kind === tab && hay(c).includes(q.trim().toLowerCase()));

  const send = () => {
    // TB-010: an attachment queued in the composer goes with this send.
    if (pending) {
      sendFile("team", pending);
      setPending(null);
    }
    sendChat("team", draft); // TB-006: empty message cannot be sent
    setDraft("");
  };

  /** TB-010 — validate type and size, then hold the file for preview before sending. */
  const pick = (file: File | undefined) => {
    if (!file) return;
    const problem = checkFile(file);
    setFileError(problem);
    setPending(problem ? null : file);
  };

  return (
    // A chat app, not a page with a card in it: the list and the thread are panels of their own beside the rail (@/components/portal/Inbox).
    <>
      <Inbox
        open={opened}
        nav={back ? <ReturnNav /> : undefined}
        list={
          <>
            <div className="shrink-0 px-4 pb-3">
              <SearchBox value={q} onChange={setQ} placeholder="Search by name or keyword" />
            </div>
            <div className="flex shrink-0 gap-5 border-b border-line px-4 text-[12.5px] leading-[1.45] font-semibold">
              {(["conversations", "candidates"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)} aria-selected={tab === t} className={`border-b-2 py-2 capitalize ${tab === t ? "border-primary text-ink-deep" : "border-transparent text-muted"}`}>
                  {t}
                </button>
              ))}
            </div>
            {list.length === 0 && (
              <p className="px-4 py-10 text-center text-[12.5px] leading-[1.45] text-muted">
                {q.trim()
                  ? `No conversations match “${q.trim()}”. Clear the search to see everyone.`
                  : tab === "candidates"
                    ? conversations.length > 0
                      ? "This thread moved to Conversations when they were hired."
                      : "No candidate threads yet — one opens when you invite someone to interview."
                    : conversations.length > 0
                      ? "No contract threads yet — the candidate thread is under Candidates."
                      : "No active contracts yet."}
              </p>
            )}
            <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2">
              {list.map((c) => {
                const on = c.id === active;
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => { setActive(c.id); setOpened(true); }} aria-current={on} className={`flex w-full gap-3 rounded-lg p-3 text-left leading-[1.45] ${on ? "bg-accent-bg" : "hover:bg-surface-alt"}`}>
                      <Avatar src={c.avatar} size={38} />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-start gap-2">
                          <span className={`min-w-0 flex-1 text-[13px] font-semibold ${on ? "text-accent-ink" : "text-ink-deep"}`}><Highlight text={c.name} query={q} /></span>
                          <span className={`text-[11px] ${on ? "text-[#6b7480]" : "text-muted"}`}>{last?.time}</span>
                        </span>
                        <span className={`text-[11px] ${on ? "text-[#5b6b7a]" : "text-muted"}`}>{c.sub}</span>
                        <span className="flex items-center gap-[5px]">
                          {/* Only on a message we sent, and blue only once they have read it. */}
                          {last?.from === "team" && (readBy(live, "independent", live.chat.length - 1) ? <DoneAll size={16} aria-label="Seen" className="text-primary" /> : <Check size={16} aria-label="Sent" className="text-muted" />)}
                          <span className={`min-w-0 flex-1 truncate text-[12px] ${on ? "text-[#3d4a57]" : "text-muted"}`}><Highlight text={last?.text ?? last?.file?.name ?? ""} query={q} /></span>
                          {unread > 0 && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 text-[10.5px] leading-none font-semibold text-white">{unread > 9 ? "9+" : unread}</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        }
        thread={
          !conv ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
              <p className="text-[15px] leading-[1.4] font-semibold text-ink">No conversations yet</p>
              <p className="max-w-[360px] text-[13px] leading-[1.45] text-muted">Invite a candidate to interview, or start a trial, and your thread with them opens here.</p>
            </div>
          ) : (
            <>
              <ThreadHeader onBack={() => setOpened(false)}>
                <Avatar src={conv.avatar} size={36} />
                <div className="flex min-w-0 flex-1 flex-col gap-px leading-[1.45] whitespace-nowrap">
                  <p className="truncate text-[14px] font-semibold text-ink-deep">{conv.name}</p>
                  <p className="truncate text-[11.5px] text-muted">{conv.sub}</p>
                </div>
                {trial && <Badge variant="solid" tone="trial">TRIAL · {trial.day}</Badge>}
                {/* TB-011: starts a call session and notifies the other party. */}
                <button type="button" aria-label="Start call" onClick={() => { setCallLink(startCall("team")); setInCall(true); }} className="flex size-9 items-center justify-center rounded-lg border border-border text-ink hover:bg-surface-alt">
                  <Call size={20} aria-hidden />
                </button>
              </ThreadHeader>
              {callLink && (
                <p className="flex items-center gap-2 border-b border-line bg-[#f0f7ff] px-[18px] py-2.5 text-[12.5px] leading-[1.45] text-ink-deep">
                  Call started — {conv.name} has been notified.
                  {/* IN-011 / TB-011 — opens the in-call surface with mute, camera and end call. */}
                  <button type="button" onClick={() => setInCall(true)} className="font-semibold text-primary underline underline-offset-2">
                    Join call
                  </button>
                  <button type="button" onClick={() => setCallLink(null)} className="ml-auto text-muted hover:text-ink">
                    Dismiss
                  </button>
                </p>
              )}
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
                  const me = m.from === "team";
                  return (
                    <div key={m.id} className={`flex items-end gap-2 ${me ? "justify-end" : ""}`}>
                      {!me && <Avatar src={conv.avatar} size={30} />}
                      {m.call ? (
                        <div className="flex w-[420px] min-w-0 items-center gap-3 rounded-xl bg-white px-3.5 py-2.5 outline -outline-offset-1 outline-line">
                          <span className="flex size-9 items-center justify-center rounded-lg bg-[#eef6ff] text-primary">
                            <Call size={20} aria-hidden />
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col leading-[1.45]">
                            <span className="text-[13px] font-semibold text-ink-deep">{me ? "You started a call" : `${conv.name} started a call`}</span>
                            <span className="truncate text-[10.5px] text-muted">{m.call.link}</span>
                          </span>
                          <button type="button" onClick={() => { setCallLink(m.call!.link); setInCall(true); }} className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-[12px] leading-none font-semibold text-white">
                            Join
                          </button>
                        </div>
                      ) : m.file ? (
                        <div className="flex w-[420px] min-w-0 items-center gap-3 rounded-tl-xl rounded-tr-xl rounded-br-xl rounded-bl bg-white px-3.5 py-2.5 outline -outline-offset-1 outline-line">
                          <span className="flex size-9 items-center justify-center rounded-lg bg-[#fdf2f2] text-danger">
                            <Pdf size={20} aria-hidden />
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col leading-[1.45]">
                            <span className="truncate text-[13px] font-semibold text-ink-deep">{m.file.name}</span>
                            <span className="text-[10.5px] text-muted">{m.file.meta}</span>
                            {m.source && <ChatSourceLink source={m.source} side="team" mine={false} />}
                          </span>
                          {/* TB-010: the recipient downloads the attachment straight from the thread. */}
                          <a
                            href={fileUrl(m.id) ?? undefined}
                            download={m.file.name}
                            aria-label={`Download ${m.file.name}`}
                            aria-disabled={fileUrl(m.id) ? undefined : "true"}
                            className={`flex size-8 items-center justify-center rounded-full border border-border ${fileUrl(m.id) ? "text-ink hover:bg-surface-alt" : "pointer-events-none text-ink-2 opacity-50"}`}
                          >
                            <Download size={18} aria-hidden />
                          </a>
                        </div>
                      ) : (
                        <ChatBubble mine={me} time={m.time} receipt={readBy(live, "independent", i) ? "seen" : "sent"} className="max-w-[420px]" /* hugs its text; a note from a proposal says so, and opens it */ header={m.source && <ChatSourceLink source={m.source} side="team" mine={me} />}>
                          <Highlight text={m.text ?? ""} query={q} />
                        </ChatBubble>
                      )}
                    </div>
                  );
                })}
              </ThreadBody>
              <form
                className="flex flex-col gap-2 border-t border-line px-[18px] py-3.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                {/* TB-010: the attachment is previewed here before it is sent. */}
                {pending && (
                  <div className="flex items-center gap-2.5 self-start rounded-lg bg-surface-alt px-3 py-2 text-[12px] leading-[1.45]">
                    <Pdf size={16} aria-hidden className="text-danger" />
                    <span className="font-semibold text-ink-deep">{pending.name}</span>
                    <span className="text-muted">{fileMeta(pending)}</span>
                    <button type="button" aria-label="Remove attachment" onClick={() => setPending(null)} className="text-muted hover:text-ink">
                      ✕
                    </button>
                  </div>
                )}
                {fileError && <p className="self-start text-[12px] leading-[1.45] text-danger">{fileError}</p>}
                <div className="flex items-center gap-2.5">
                  <input ref={fileInput} type="file" accept={ACCEPTED_FILES} className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
                  <button type="button" aria-label="Attach file" onClick={() => fileInput.current?.click()} className="flex size-11 items-center justify-center rounded-full border border-border text-ink hover:bg-surface-alt">
                    <Attach size={20} aria-hidden />
                  </button>
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Send a message…" className="h-11 min-w-0 flex-1 rounded-lg border border-border px-4 text-[14px] tracking-[0.2px] outline-none placeholder:text-ink-2 focus:border-primary" />
                  <button type="submit" aria-label="Send" disabled={!draft.trim() && !pending} className="flex size-9 items-center justify-center rounded-full bg-primary text-[16px] leading-[1.45] font-semibold text-white disabled:bg-ink-2">
                    ↑
                  </button>
                </div>
              </form>
            </>
          )
        }
      />
      <CallDialog open={inCall} link={callLink} withWhom={conv?.name ?? ""} onEnd={() => setInCall(false)} />
    </>
  );
}
