"use client";

import { PAIR } from "@/lib/demo/live";
import { slotOffset } from "@/lib/portal/dates";
import { bothClocks, effectiveTimeZone, offsetOfLabel, slotClocks } from "@/lib/portal/timezones";
import { useIndependentAccount } from "./account";

/** An interview slot as saved: its date and time, and the clock (minutes off UTC) it was picked in. */
type Slot = { when: string; offset?: number };

const managerFirst = PAIR.team.name.split(" ")[0];

/**
 * Interview times as the Independent reads them, in their own clock (their saved time zone, or this
 * device's) with the Team Builder's beside it: `both` is the one line every screen shows, `mine` the
 * slot in their clock alone ("Tue 29 Sep, 10:00 AM"), for a sentence that already says whose it is.
 * The Team Builder's clock is the one the slot was booked in, unless `theirs` says otherwise (a time
 * the Independent asked for was picked in their own clock). `viewer` is their clock, minutes off UTC:
 * what a time they pick is saved with.
 */
export function useInterviewTime() {
  const { profile } = useIndependentAccount();
  const viewer = offsetOfLabel(effectiveTimeZone(profile.timezone));
  const booked = (slot: Slot) => slotOffset(slot.when, slot.offset);
  return {
    viewer,
    both: (slot: Slot, theirs = booked(slot)) => bothClocks(slot.when, booked(slot), viewer, { offset: theirs, first: managerFirst }),
    mine: (slot: Slot) => slotClocks(slot.when, booked(slot), viewer, viewer)?.mine ?? slot.when,
  };
}
