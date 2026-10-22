"use client";

import { use } from "react";
import { DisputeCasePage } from "@/components/portal/dispute-case";
import { useIndependentAccount } from "@/lib/independent/account";
import { effectiveTimeZone, offsetOfLabel } from "@/lib/portal/timezones";

/**
 * IN-081 — one dispute as a case: whose turn it is, the timeline both sides share, replies and
 * settlements, read in the Independent's own time zone (Settings, or this device's).
 */
export default function DisputeCase({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { profile } = useIndependentAccount();
  return <DisputeCasePage side="independent" id={id} offset={offsetOfLabel(effectiveTimeZone(profile.timezone))} />;
}
