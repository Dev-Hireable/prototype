"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ICONS } from "@/components/icons";
import { ChatLog, Composer, useComposer, type Face } from "@/components/portal/messages-page";
import { Tip } from "@/components/portal/tip";
import { Avatar, Initials } from "@/components/portal/ui";
import { openChat, unreadChat, useLive } from "@/lib/demo/live";
import { PHONE, useMedia } from "@/lib/portal/media";
import { sideOf } from "@/lib/portal/tours";
import { useQuickChat, type QuickChatTarget } from "@/lib/portal/quick-chat";
import type { Side } from "@/lib/work/model";

const HEAD_BUTTON = "flex size-8 items-center justify-center rounded-full text-ink-2 hover:bg-surface-alt hover:text-ink focus-visible:outline-2 focus-visible:outline-primary";

/**
 * The quick chat (@/lib/portal/quick-chat): the shared thread in a small window at the bottom right,
 * over whatever screen opened it, as a chat app's popup — the thread and the composer of Messages,
 * folded to its header with a click on it, and one click from the full thread. It reads as seen while
 * it's open, and stays out of the way on Messages itself, where the thread already is.
 */
export function QuickChat() {
  const pathname = usePathname();
  const side = sideOf(pathname);
  const { target } = useQuickChat();
  if (!side || !target || pathname.endsWith("/messages")) return null;
  return <QuickChatWindow side={side} target={target} />;
}

/**
 * On a phone, the folded chat is a chat head: the person's photo in a round button over the bottom
 * right corner, above the tab bar, with the unread count. A tap opens the thread again; the small ×
 * on its shoulder closes it.
 */
function ChatHead({ side, target }: { side: Side; target: QuickChatTarget }) {
  const { close, toggle } = useQuickChat();
  const unread = unreadChat(useLive(), side);
  return (
    <div className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 size-14">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Open chat with ${target.name}${unread ? `, ${unread} unread` : ""}`}
        className="size-14 overflow-hidden rounded-full bg-white shadow-[0_6px_20px_rgba(0,0,0,.25)] outline-2 outline-white focus-visible:outline-primary"
      >
        {target.avatar ? <Avatar src={target.avatar} size={56} /> : <Initials text={target.initials ?? ""} className="size-14 rounded-full text-[16px]" />}
      </button>
      {unread > 0 && (
        <span aria-hidden className="pointer-events-none absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] leading-none font-semibold text-white">
          <span className="badge-count">{unread > 9 ? "9+" : unread}</span>
        </span>
      )}
      <button type="button" onClick={close} aria-label="Close chat" className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-ink text-white shadow focus-visible:outline-2 focus-visible:outline-primary">
        <ICONS.close size={14} aria-hidden />
      </button>
    </div>
  );
}

function QuickChatWindow({ side, target }: { side: Side; target: QuickChatTarget }) {
  const { minimized, close, toggle } = useQuickChat();
  const phone = useMedia(PHONE);
  const live = useLive();
  const composer = useComposer(side);
  const ref = useRef<HTMLElement>(null);
  const conv = { id: "quick", name: target.name };
  const face: Face<typeof conv> = (_, size) => (target.avatar ? <Avatar src={target.avatar} size={size} /> : <Initials text={target.initials ?? ""} className="size-[30px] rounded-full text-[10px]" />);

  // Read while it's open, as the full thread is (TB-008 / IN-008).
  useEffect(() => {
    if (!minimized) openChat(side);
  }, [minimized, side, live.chat.length]);
  // Opened or unfolded, the keyboard goes to the composer, ready to type.
  useEffect(() => {
    if (!minimized) ref.current?.querySelector<HTMLInputElement>('input[aria-label="Message"]')?.focus({ preventScroll: true });
  }, [minimized, target]);

  if (phone && minimized) return <ChatHead side={side} target={target} />;
  return (
    // On a phone it's a sheet across the full width, rising over the tab bar to most of the screen;
    // folded, it's a chat head (ChatHead).
    <section
      ref={ref}
      aria-label={`Chat with ${target.name}`}
      className={`fixed right-6 bottom-0 z-40 flex w-[360px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-t-xl bg-white shadow-[0_8px_32px_rgba(0,0,0,.22)] outline -outline-offset-1 outline-line max-md:right-0 max-md:w-full max-md:max-w-none max-md:rounded-t-2xl ${
        minimized ? "" : "h-[min(480px,calc(100dvh/var(--ui-scale)-96px))] max-md:h-[85dvh] max-md:pb-[env(safe-area-inset-bottom)]"
      }`}
    >
      <ChatWindowHeader target={target} minimized={minimized} onToggle={toggle} onClose={close} />
      {!minimized && (
        <>
          <ChatLog conv={conv} face={face} chat={{ live, side, other: side === "team" ? "independent" : "team" }} q="" focus={null} />
          <Composer {...composer} />
        </>
      )}
    </section>
  );
}

/** The window's header: who it's with (a click folds the window to it and back), Open in Messages, Minimise and Close. */
function ChatWindowHeader({ target, minimized, onToggle, onClose }: { target: QuickChatTarget; minimized: boolean; onToggle: () => void; onClose: () => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-1 border-b border-line pr-2 pl-3">
      {/* The header folds the window down to itself and back, as a chat popup's does. */}
      <button type="button" onClick={onToggle} aria-expanded={!minimized} aria-label={`${minimized ? "Open" : "Minimise"} chat with ${target.name}`} className="-my-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1 text-left focus-visible:outline-2 focus-visible:outline-primary">
        {target.avatar ? <Avatar src={target.avatar} size={32} /> : <Initials text={target.initials ?? ""} className="size-8 rounded-full text-[11px]" />}
        <span className="flex min-w-0 flex-col leading-[1.35]">
          <span className="truncate text-[14px] font-semibold text-ink-deep">{target.name}</span>
          <span className="truncate text-[11.5px] text-muted">{target.sub}</span>
        </span>
      </button>
      <Tip label="Open in Messages">
        <Link href={target.href} aria-label="Open in Messages" className={HEAD_BUTTON}>
          <ICONS.northEast size={18} aria-hidden />
        </Link>
      </Tip>
      <Tip label={minimized ? "Open" : "Minimise"}>
        <button type="button" onClick={onToggle} aria-label={minimized ? "Open chat" : "Minimise chat"} className={HEAD_BUTTON}>
          {minimized ? <ICONS.restore size={16} aria-hidden /> : <ICONS.minimize size={18} aria-hidden className="-translate-y-1" />}
        </button>
      </Tip>
      <Tip label="Close">
        <button type="button" onClick={onClose} aria-label="Close chat" className={HEAD_BUTTON}>
          <ICONS.close size={18} aria-hidden />
        </button>
      </Tip>
    </header>
  );
}
