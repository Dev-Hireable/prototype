"use client";

import { persisted, useStored } from "@/lib/demo/live";
import { INITIAL_SAVED } from "./data";

/** Independents the Team Builder saved from Discover (TB-018 / TB-022). */
const savedStore = persisted("team.saved", INITIAL_SAVED);

// Silent both ways: saving and unsaving notify no one.
const toggleSaved = (slug: string) => savedStore.set((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]));

export function useSavedTalent() {
  return { saved: useStored(savedStore), toggleSaved };
}
