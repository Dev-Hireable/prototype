"use client";

import { persisted, useStored } from "@/lib/demo/live";
import { INITIAL_SAVED } from "./data";

/** Roles the independent saved from the job board. */
const savedStore = persisted("ind.saved", INITIAL_SAVED);

const toggleSaved = (slug: string) => savedStore.set((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]));

export function useSavedRoles() {
  return { saved: useStored(savedStore), toggleSaved };
}
