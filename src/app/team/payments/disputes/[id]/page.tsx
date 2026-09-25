"use client";

import { use } from "react";
import { DisputeCasePage } from "@/components/portal/DisputeCase";

/** TB-092 — one dispute as a case: whose turn it is, the timeline both sides share, replies and settlements. */
export default function DisputeCase({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DisputeCasePage side="team" id={id} />;
}
