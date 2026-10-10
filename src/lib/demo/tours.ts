"use client";

import { persisted, useStored } from "@/lib/demo/live";

/**
 * Which guided tours this browser has seen (@/lib/portal/tours). A tour starts on its own the
 * first time its screen opens; once it's finished or skipped it's on record and doesn't start
 * again. A skipped one keeps the step it stopped on, so the help menu can resume it there.
 * Reset demo clears it with the rest, and every tour plays again.
 */
export type TourRecord = { status: "done" | "skipped"; step: number };

const toursStore = persisted<Record<string, TourRecord>>("tours", {});

export const tourRecord = (id: string): TourRecord | undefined => toursStore.get()[id];

export function recordTour(id: string, record: TourRecord) {
  toursStore.set((all) => ({ ...all, [id]: record }));
}

export const useTourRecords = () => useStored(toursStore);
