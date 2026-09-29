"use client";

import { DataTable } from "@/components/admin/ui";
import { Badge } from "@/components/portal/badge";
import type { Tone } from "@/lib/portal/tone";
import type { AttentionItem } from "@/lib/admin/data/home";
import { ageOf, holds, partyName, useDisputes, waitingOn } from "@/lib/demo/disputes";
import { JOB_TYPE_LABEL } from "@/lib/contract/job-types";

/**
 * AD-001 "Needs attention" — every dispute still waiting on Hireable (pending, or ruled for the
 * independent but not paid out) ahead of the sample items. The dispute row used to be static and
 * pointed at a dispute that did not exist.
 */
export function NeedsAttention({ items }: { items: AttentionItem[] }) {
  const open: AttentionItem[] = useDisputes()
    .filter(holds)
    .map((d) => ({
      item: `${d.reason} — ${d.title} ${JOB_TYPE_LABEL[d.type].toLowerCase()}`,
      type: "Dispute",
      raisedBy: partyName(d, d.filedBy),
      age: ageOf(d),
      status: d.status !== "Pending" ? "Awaiting release" : waitingOn(d) === "support" ? "Waiting on support" : `Waiting on ${partyName(d, waitingOn(d) as "team" | "independent")}`,
      tone: "warn" satisfies Tone,
      href: `/admin/disputes/${d.id}`,
    }));

  return (
    <DataTable<AttentionItem>
      caption="Needs attention"
      rows={[...open, ...items]}
      rowHref={(r) => r.href}
      columns={[
        { header: "Item", cell: (r) => r.item },
        { header: "Type", cell: (r) => r.type, width: 150 },
        { header: "Raised by", cell: (r) => r.raisedBy, width: 200 },
        { header: "Age", cell: (r) => r.age, width: 110 },
        { header: "Status", cell: (r) => <Badge tone={r.tone}>{r.status}</Badge>, width: 140 },
      ]}
    />
  );
}
