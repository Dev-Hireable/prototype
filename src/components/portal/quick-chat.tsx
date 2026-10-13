"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ICONS } from "@/components/icons";
import { ChatLog, Composer, useComposer, type Face } from "@/components/portal/messages-page";
import { Tip } from "@/components/portal/tip";
import { Avatar, Initials } from "@/components/portal/ui";
import { openChat, useLive } from "@/lib/demo/live";
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

function QuickChatWindow({ side, target }: { side: Side; target: QuickChatTarget }) {
  const { minimized, close, toggle } = useQuickChat();
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

  return (
    <section
      ref={ref}
      aria-label={`Chat with ${target.name}`}
      className={`fixed right-6 bottom-0 z-40 flex w-[360px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-t-xl bg-white shadow-[0_8px_32px_rgba(0,0,0,.22)] outline -outline-offset-1 outline-line ${minimized ? "" : "h-[min(480px,calc(100dvh/var(--ui-scale)-96px))]"}`}
    >
      <header className="flex h-14 shrink-0 items-center gap-1 border-b border-line pr-2 pl-3">
        {/* The header folds the window down to itself and back, as a chat popup's does. */}
        <button type="button" onClick={toggle} aria-expanded={!minimized} aria-label={`${minimized ? "Open" : "Minimise"} chat with ${target.name}`} className="-my-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1 text-left focus-visible:outline-2 focus-visible:outline-primary">
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
          <button type="button" onClick={toggle} aria-label={minimized ? "Open chat" : "Minimise chat"} className={HEAD_BUTTON}>
            {minimized ? <ICONS.restore size={16} aria-hidden /> : <ICONS.minimize size={18} aria-hidden className="-translate-y-1" />}
          </button>
        </Tip>
        <Tip label="Close">
          <button type="button" onClick={close} aria-label="Close chat" className={HEAD_BUTTON}>
            <ICONS.close size={18} aria-hidden />
          </button>
        </Tip>
      </header>
      {!minimized && (
        <>
          <ChatLog conv={conv} face={face} chat={{ live, side, other: side === "team" ? "independent" : "team" }} q="" focus={null} />
          <Composer {...composer} />
        </>
      )}
    </section>
  );
}
