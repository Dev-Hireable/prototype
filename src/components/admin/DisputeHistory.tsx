"use client";

import { DataTable } from "@/components/admin/ui";
import { Badge } from "@/components/portal/Badge";
import { dateOf, otherParty, partyName, STATUS_TONE, usd, useDisputes } from "@/lib/demo/disputes";
import type { Dispute, DisputeParty } from "@/lib/demo/disputes";

/**
 * AD-011 / AD-022 — every dispute filed by or against this account: date, opposing party,
 * amount, reason and status, each opening the dispute. Read from the shared dispute record.
 */
export function DisputeHistory({ party, slug }: { party: DisputeParty; slug: string }) {
  const rows = useDisputes()
    .filter((d) => (party === "team" ? d.team.slug : d.independent.slug) === slug)
    .sort((a, b) => b.at - a.at);
  return (
    <DataTable<Dispute>
      caption="Dispute history"
      rows={rows}
      rowHref={(d) => `/admin/disputes/${d.id}`}
      empty="No disputes filed by or against this account."
      columns={[
        { header: "Date", cell: (d) => dateOf(d.at), width: "14%" },
        { header: "Opposing party", cell: (d) => `${partyName(d, otherParty(party))}${d.filedBy === party ? " · filed by this account" : " · filed against it"}`, width: "34%" },
        { header: "Amount", cell: (d) => usd(d.amount), width: "14%" },
        { header: "Reason", cell: (d) => d.reason, width: "22%" },
        { header: "Status", cell: (d) => <Badge tone={STATUS_TONE[d.status]}>{d.status}</Badge>, width: "16%" },
      ]}
    />
  );
}
