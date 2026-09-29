"use client";

import { DisputesPage } from "@/components/portal/disputes";

/** IN-080 / IN-081 / IN-082 — every dispute the independent filed, plus the ones filed against them. */
export default function SentDisputes() {
  return <DisputesPage side="independent" />;
}
