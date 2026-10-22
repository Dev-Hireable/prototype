"use client";

import { useSyncExternalStore } from "react";
import type { Side } from "@/lib/work/model";

/**
 * Who's writing a message right now, across this browser's tabs. The demo plays both sides, so with
 * the Team Builder in one tab and the Independent in the other, a message being written in one shows
 * as typing dots in the other: the browser tells other tabs of a storage write, never the writer's own.
 *
 * A side counts as typing for a few seconds after its last keystroke. Sending, or emptying the box,
 * stops it at once.
 */

const KEY = "hireable.demo.typing";
/** How long after the last keystroke a side still counts as typing. */
export const FRESH_MS = 4000;
/** Keystrokes are written at most this often, so typing stays cheap. */
const WRITE_EVERY_MS = 1000;

/** Each side's last keystroke, in milliseconds since the epoch. */
export type Typing = Partial<Record<Side, number>>;

function read(): Typing {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Typing;
  } catch {
    return {};
  }
}

function write(typing: Typing) {
  try {
    localStorage.setItem(KEY, JSON.stringify(typing));
  } catch {
    /* private mode: no dots */
  }
}

let lastWrite = 0;

/** A keystroke in this side's message box. */
export function markTyping(side: Side, now = Date.now()) {
  if (now - lastWrite < WRITE_EVERY_MS) return;
  lastWrite = now;
  write({ ...read(), [side]: now });
}

/** This side sent its message, or emptied the box: it isn't typing any more. */
export function stopTyping(side: Side) {
  lastWrite = 0;
  const { [side]: gone, ...rest } = read();
  if (gone !== undefined) write(rest);
}

/** Whether `side`'s last keystroke is recent enough to still count as typing. */
export const isTyping = (typing: Typing, side: Side, now: number) => {
  const at = typing[side];
  return at !== undefined && now - at < FRESH_MS;
};

/** Told when another tab writes, and every half second, so dots that have gone stale go away. */
function subscribe(changed: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) changed();
  };
  addEventListener("storage", onStorage);
  const tick = setInterval(changed, 500);
  return () => {
    removeEventListener("storage", onStorage);
    clearInterval(tick);
  };
}

/** Whether `side` is writing a message right now, in another tab. */
export const useTyping = (side: Side) => useSyncExternalStore(subscribe, () => isTyping(read(), side, Date.now()), () => false);
