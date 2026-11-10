"use client";

import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { TRAY, TRAY_PANEL } from "@/components/portal/styles";

/**
 * Messages, laid out like a chat app rather than a page: beside the Home panel, the conversation
 * list and thread in one inset panel. Messages is a `bare` menu item, so it supplies its own frame.
 * Only the list and the thread scroll; the heading, search, thread header and composer stay put.
 *
 * On a narrow screen there's room for one panel: the list, then the thread once one is `open`.
 */
export function Inbox({ nav, list, thread, open }: { nav?: ReactNode; list: ReactNode; thread: ReactNode; open: boolean }) {
  return (
    <div className={`flex min-h-0 min-w-0 flex-1 ${TRAY} max-md:p-0 max-md:outline-none`}>
      <div className={`flex min-h-0 min-w-0 flex-1 overflow-hidden ${TRAY_PANEL} max-md:rounded-none`}>
        <aside className={`flex min-h-0 w-[320px] shrink-0 flex-col border-r border-line max-lg:w-[280px] max-md:w-auto max-md:min-w-0 max-md:flex-1 max-md:border-r-0 ${open ? "max-md:hidden" : ""}`}>
          {nav && <div className="shrink-0 px-4 pt-3">{nav}</div>}
          <h1 className="flex h-14 shrink-0 items-center px-4 font-display text-[24px] leading-[1.5] font-semibold tracking-[0.2px] text-ink max-md:text-[20px]" style={{ fontVariationSettings: '"opsz" 14' }}>
            Messages
          </h1>
          {list}
        </aside>
        <section className={`flex min-h-0 min-w-0 flex-1 flex-col ${open ? "" : "max-md:hidden"}`}>{thread}</section>
      </div>
    </div>
  );
}

/**
 * The thread's top bar. It ends short of the Reset demo button floating in the corner (md:pr-36 is
 * CLEAR_DEMO_RESET, @/components/portal/styles); a phone has no corner button, and there the bar
 * leads back to the list.
 */
export function ThreadHeader({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  const Back = ICONS.chevronLeft;
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line pl-[18px] max-md:pr-3 md:pr-36">
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
    <div ref={ref} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-6">
      {children}
    </div>
  );
}
