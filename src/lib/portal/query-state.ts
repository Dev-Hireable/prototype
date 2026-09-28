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
  const set = (next: T) => writeParam(key, next === fallback ? null : next);
  return [value, set];
}

function writeParam(key: string, value: string | null) {
  writeParams({ [key]: value });
}

/**
 * Several keys at once, null removing one. It starts from `window.location` — updated the moment
 * the history call returns — rather than useSearchParams, which only catches up on the next render,
 * so two quick writes can't undo each other. `push` adds a history entry (a view switch, so Back
 * returns to the previous view); otherwise the current entry is replaced. A write that changes
 * nothing is skipped, and the #hash is kept. Next patches both history calls to keep
 * useSearchParams in sync, and restores the state on Back/Forward.
 */
export function writeParams(patch: Record<string, string | null>, opts: { push?: boolean } = {}) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
  if (opts.push) window.history.pushState(null, "", next);
  else window.history.replaceState(null, "", next);
}
