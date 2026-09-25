"use client";

import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { ICONS } from "@/components/admin/icons";

/** The shell's panel: white, 8px corners, the 1px #c3c3c3 stroke inside — the same as the section panel and the page panel. */
const PANEL = "flex min-h-0 flex-col overflow-clip rounded-lg bg-white shadow-[inset_0_0_0_1px_#c3c3c3]";

/**
 * Messages, laid out like a chat app rather than a page: beside the Home panel, the conversation
 * list as its own panel, then the thread filling the rest. Messages is a `bare` menu item, so the
 * shell draws no page panel around it — these two panels are the page.
 * Only the list and the thread scroll; the heading, search, thread header and composer stay put.
 *
 * On a narrow screen there's room for one panel: the list, then the thread once one is `open`.
 */
export function Inbox({ nav, list, thread, open }: { nav?: ReactNode; list: ReactNode; thread: ReactNode; open: boolean }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 gap-1">
      <aside className={`${PANEL} w-[360px] shrink-0 max-lg:w-[300px] max-md:w-auto max-md:flex-1 ${open ? "max-md:hidden" : ""}`}>
        {nav && <div className="shrink-0 px-4 pt-3">{nav}</div>}
        <h1 className="flex h-14 shrink-0 items-center px-4 font-display text-[24px] leading-[1.5] font-semibold tracking-[0.2px] text-ink max-md:pr-36" style={{ fontVariationSettings: '"opsz" 14' }}>
          Messages
        </h1>
        {list}
      </aside>
      <section className={`${PANEL} min-w-0 flex-1 ${open ? "" : "max-md:hidden"}`}>{thread}</section>
    </div>
  );
}

/**
 * The thread's top bar. It ends short of the Reset demo button floating in the corner; on a phone,
 * where that would leave the name no room, it drops below the button instead, and leads back to the list.
 * md:pr-36 / max-md:pr-36 are CLEAR_DEMO_RESET (@/components/portal/styles), written out so Tailwind sees them.
 */
export function ThreadHeader({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  const Back = ICONS.chevronLeft;
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line pl-[18px] max-md:mt-11 max-md:pr-3 md:pr-36">
      <button type="button" aria-label="Back to conversations" onClick={onBack} className="-ml-1.5 flex size-8 items-center justify-center rounded-lg text-ink hover:bg-surface-alt md:hidden">
        <Back size={20} aria-hidden />
      </button>
      {children}
    </header>
  );
}

/**
 * The messages themselves — the one part of the thread that scrolls. It opens on the newest message
 * and follows new ones in, so what just arrived is on screen without scrolling down to find it.
 * `latest` changes whenever the thread does (another message, another conversation).
 */
export function ThreadBody({ latest, children }: { latest: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [latest]);
  return (
    // The page's 40px gutter above the first message and below the last, inside the scroller so it scrolls with them.
    <div ref={ref} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-10">
      {children}
    </div>
  );
}
