"use client";

import { DisputesPage } from "@/components/portal/disputes";

/** The disputes you sent (TB-091 / TB-092 / TB-093), plus the disputes filed against you. */
export default function Disputes() {
  return <DisputesPage side="team" />;
}
