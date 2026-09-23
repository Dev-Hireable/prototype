"use client";

import { useSearchParams } from "next/navigation";

/**
 * A tab or filter kept in the URL instead of component state, so a link out records it (see
 * useWithReturn) and coming back restores it. Writes with history.replaceState, which Next keeps in
 * sync with useSearchParams: no navigation, and no history entry per click. The default value is
 * left out of the URL, and anything not in `allowed` reads as the default.
 */
export function useQueryState<T extends string>(key: string, fallback: T, allowed: readonly T[]): [T, (next: T) => void] {
  const raw = useSearchParams().get(key);
  const value = allowed.includes(raw as T) ? (raw as T) : fallback;
  const set = (next: T) => {
    const query = new URLSearchParams(window.location.search);
    if (next === fallback) query.delete(key);
    else query.set(key, next);
    const search = query.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
  };
  return [value, set];
}
