"use client";

import { useSyncExternalStore } from "react";
import { nextRetake, type WorkStyleSide } from "@/lib/demo/work-style";

/** Nothing to subscribe to: the quiz's date is written on the quiz's own page, and this reads it as a page loads. */
const NO_SUBSCRIBE = () => () => {};

/**
 * The day this side may take the work style quiz again (nextRetake), or null when it may now. Read
 * after hydration: the date is kept in this browser, and the server has no storage.
 */
export function useNextRetake(side: WorkStyleSide): Date | null {
  const at = useSyncExternalStore(NO_SUBSCRIBE, () => nextRetake(side)?.getTime() ?? 0, () => 0);
  return at ? new Date(at) : null;
}
