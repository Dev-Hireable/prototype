"use client";

import { use } from "react";
import { DisputeCasePage } from "@/components/portal/dispute-case";
import { effectiveTimeZone, offsetOfLabel } from "@/lib/portal/timezones";
import { useTeamAccount } from "@/lib/team/account";

/**
 * TB-092 — one dispute as a case: whose turn it is, the timeline both sides share, replies and
 * settlements, read in the Team Builder's own time zone (Settings, or this device's).
 */
export default function DisputeCase({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { profile } = useTeamAccount();
  return <DisputeCasePage side="team" id={id} offset={offsetOfLabel(effectiveTimeZone(profile.timezone))} />;
}
