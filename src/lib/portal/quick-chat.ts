"use client";

import { useSyncExternalStore } from "react";

/** Who a quick chat is with, as its header shows them, and the full thread in Messages. */
export type QuickChatTarget = { name: string; sub: string; avatar?: string; initials?: string; href: string };

/** The open quick chat, if any, and whether it's folded down to its header. */
type QuickChatState = { target: QuickChatTarget | null; minimized: boolean };

let state: QuickChatState = { target: null, minimized: false };
const listeners = new Set<() => void>();
const set = (next: QuickChatState) => {
  state = next;
  listeners.forEach((fn) => fn());
};

/**
 * The quick chat: a "Message …" button on a work screen opens the thread in a small window over the
 * page, as a chat app's popup does, rather than leaving for Messages. One at a time; it lasts as
 * long as the tab, not across reloads.
 */
export function useQuickChat() {
  const current = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state,
    () => state,
  );
  return {
    ...current,
    open: (target: QuickChatTarget) => set({ target, minimized: false }),
    close: () => set({ target: null, minimized: false }),
    toggle: () => set({ ...state, minimized: !state.minimized }),
  };
}
