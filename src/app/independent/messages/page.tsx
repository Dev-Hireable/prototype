"use client";

import { useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Initials, Page, SearchBox, StatusDot } from "@/components/independent/ui";
import { conversations, thread as seed } from "@/lib/independent/data";

const DoneAll = ICONS.doneAll;
const Call = ICONS.call;
const Video = ICONS.video;
const Attach = ICONS.attach;

/**
 * Figma "Home / Messages": one #e3e8ed-stroked panel; 384px conversation list (search 44, 12.5px tabs, rows p 12 / gap 12)
 * and the thread (head px 18 / py 12, body p 20 / gap 12, 420px bubbles, composer px 18 / py 14).
 */
export default function Messages() {
  const [tab, setTab] = useState<"conversations" | "applications">("conversations");
  const [q, setQ] = useState("");
  const [active, setActive] = useState(conversations[0].id);
  const [thread, setThread] = useState(seed);
  const [draft, setDraft] = useState("");
  const conv = conversations.find((c) => c.id === active)!;
  const list = conversations.filter((c) => (c.name + c.sub).toLowerCase().includes(q.toLowerCase()));

  const send = () => {
    if (!draft.trim()) return;
    setThread((t) => [...t, { me: true, text: draft.trim(), time: "Now" }]);
    setDraft("");
  };

  return (
    <Page title="Messages" heading="default">
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg bg-white outline -outline-offset-1 outline-line">
        {/* Conversations */}
        <section className="flex w-[384px] shrink-0 flex-col border-r border-line">
          <div className="px-3 pt-3.5 pb-3">
            <SearchBox value={q} onChange={setQ} placeholder="Search by name or keyword" />
          </div>
          <div className="flex gap-5 border-b border-line pl-3.5 text-[12.5px] leading-[1.45] font-semibold">
            {(["conversations", "applications"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-selected={tab === t}
                className={`border-b-2 py-2 capitalize ${tab === t ? "border-primary text-ink-deep" : "border-transparent text-muted"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <ul className="flex flex-col gap-0.5 px-2 pt-2">
            {list.map((c) => {
              const on = c.id === active;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActive(c.id)}
                    aria-current={on}
                    className={`flex w-full gap-3 rounded-lg p-3 text-left leading-[1.45] ${on ? "bg-accent-bg" : "hover:bg-surface-alt"}`}
                  >
                    <Initials text={c.initials} className="size-[38px] rounded-full text-[12px]" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-start gap-2">
                        <span className={`min-w-0 flex-1 text-[13px] font-semibold ${on ? "text-accent-ink" : "text-ink-deep"}`}>{c.name}</span>
                        <span className={`text-[11px] ${on ? "text-[#6b7480]" : "text-muted"}`}>{c.time}</span>
                      </span>
                      <span className={`text-[11px] ${on ? "text-[#5b6b7a]" : "text-muted"}`}>{c.sub}</span>
                      <span className="flex items-center gap-[5px]">
                        <DoneAll size={16} aria-hidden className={on ? "text-primary" : "text-muted"} />
                        <span className={`min-w-0 flex-1 truncate text-[12px] ${on ? "text-[#3d4a57]" : "text-muted"}`}>{c.preview}</span>
                        {c.unread > 0 && (
                          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 text-[10.5px] leading-none font-semibold text-white">{c.unread}</span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Thread */}
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-line px-[18px] py-3">
            <Initials text={conv.initials} className="size-9 rounded-full text-[12px]" />
            <div className="flex min-w-0 flex-1 flex-col gap-px leading-[1.45] whitespace-nowrap">
              <p className="text-[14px] font-semibold text-ink-deep">{conv.name}</p>
              <p className="text-[11.5px] text-muted">{conv.sub}</p>
            </div>
            <StatusDot tone="trial">TRIAL · Day 18 of 30</StatusDot>
            <button type="button" aria-label="Call" className="flex size-9 items-center justify-center rounded-lg border border-border text-ink">
              <Call size={20} aria-hidden />
            </button>
            <button type="button" aria-label="Video call" className="flex size-9 items-center justify-center rounded-lg border border-border text-ink">
              <Video size={20} aria-hidden />
            </button>
          </header>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
            <p className="flex items-center justify-center gap-2 text-[10.5px] leading-[1.45] text-muted">
              <span className="font-semibold">Today</span>
              <span className="h-3 w-px bg-line" />
              10:02 AM
            </p>
            {thread.map((m, i) => (
              <div key={i} className={`flex items-end gap-2 ${m.me ? "justify-end" : ""}`}>
                {!m.me && <Initials text={conv.initials} className="size-[30px] rounded-full text-[10px]" />}
                <div
                  className={`flex w-[420px] flex-col gap-1 px-3.5 py-2.5 text-[13px] leading-[1.45] ${
                    m.me
                      ? "rounded-tl-xl rounded-tr-xl rounded-br rounded-bl-xl bg-primary text-white"
                      : "rounded-tl-xl rounded-tr-xl rounded-br-xl rounded-bl bg-white text-ink-deep outline -outline-offset-1 outline-line"
                  }`}
                >
                  {m.text}
                  <p className={`flex items-center gap-1 text-[10.5px] ${m.me ? "text-[#d9e8ff]" : "text-muted"}`}>
                    {m.me && <DoneAll size={16} aria-hidden />}
                    {m.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <form
            className="flex items-center gap-2.5 border-t border-line px-[18px] py-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <button type="button" aria-label="Attach file" className="flex size-11 items-center justify-center rounded-full border border-border text-ink">
              <Attach size={20} aria-hidden />
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Send a message…"
              className="h-11 min-w-0 flex-1 rounded-lg border border-border px-4 text-[14px] tracking-[0.2px] outline-none placeholder:text-ink-2 focus:border-primary"
            />
            <button type="submit" aria-label="Send" className="flex size-9 items-center justify-center rounded-full bg-primary text-[16px] leading-[1.45] font-semibold text-white">
              ↑
            </button>
          </form>
        </section>
      </div>
    </Page>
  );
}
