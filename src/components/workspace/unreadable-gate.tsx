"use client";

import type { ReactNode } from "react";
import { Page } from "@/components/portal/ui";
import { useDealStatus } from "@/lib/demo/deal";
import { CorruptWork } from "./states";

/**
 * A contract page whose saved data can't be read shows why (and keeps the data) instead of a 404 —
 * the page would otherwise find no contract and call notFound() before the workspace could say
 * anything.
 */
export function UnreadableGate({ title, children }: { title: string; children: ReactNode }) {
  const status = useDealStatus();
  if (status !== "corrupt") return children;
  return (
    <Page title={title} fill>
      <CorruptWork />
    </Page>
  );
}
