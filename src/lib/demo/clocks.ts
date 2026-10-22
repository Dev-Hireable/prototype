"use client";

import { effectiveTimeZone, offsetOfLabel } from "@/lib/portal/timezones";
import type { Side } from "@/lib/work/model";

/** Where each portal keeps its profile, and with it the time zone ("" = this device's). */
const PROFILE_KEY: Record<Side, string> = { team: "hireable.demo.team.profile", independent: "hireable.demo.ind.profile" };

/**
 * A side's clock in minutes off UTC: the time zone saved on its profile, or this device's while it's
 * automatic. Each portal keeps its own profile, so this is how one side reads the other's clock
 * (an interview logged in the thread shows both). Off the browser, with no storage, it's automatic.
 */
export function savedOffset(side: Side): number {
  let saved = "";
  try {
    if (typeof window !== "undefined") saved = (JSON.parse(localStorage.getItem(PROFILE_KEY[side]) ?? "null") as { timezone?: string } | null)?.timezone ?? "";
  } catch {
    /* unreadable: automatic */
  }
  return offsetOfLabel(effectiveTimeZone(saved));
}
