"use client";

import { persisted, useStored } from "@/lib/demo/live";
import { today } from "@/lib/portal/dates";
import { INITIAL_SAVED } from "./data";

/** Roles the independent saved from the job board. */
const savedStore = persisted("ind.saved", INITIAL_SAVED);
/** When each saved role was saved ("21 Sep 2026"), by slug; roles saved before it was kept have none. */
const savedOnStore = persisted<Record<string, string>>("ind.savedOn", {});

function toggleSaved(slug: string) {
  const saving = !savedStore.get().includes(slug);
  savedStore.set((s) => (saving ? [...s, slug] : s.filter((x) => x !== slug)));
  savedOnStore.set(({ [slug]: _was, ...rest }) => (saving ? { ...rest, [slug]: today() } : rest));
}

export function useSavedRoles() {
  return { saved: useStored(savedStore), savedOn: useStored(savedOnStore), toggleSaved };
}
