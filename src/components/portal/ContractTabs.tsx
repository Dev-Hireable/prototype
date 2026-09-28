"use client";

import { Tabs } from "@/components/independent/ui";
import type { CONTRACT_TABS } from "@/lib/contract/view";

type Section = (typeof CONTRACT_TABS)[number];

/** A contract page's section tabs, the same on the talent's contract and the Team Builder's tracker. */
export function ContractTabs({ value, onChange }: { value: Section; onChange: (tab: Section) => void }) {
  return (
    <Tabs
      value={value}
      onChange={onChange}
      aria-label="Contract sections"
      options={[
        { value: "tasks", label: "Work" },
        { value: "overview", label: "Overview" },
        { value: "contract", label: "Contract & Payment" },
        { value: "evaluation", label: "Evaluation" },
      ]}
    />
  );
}
