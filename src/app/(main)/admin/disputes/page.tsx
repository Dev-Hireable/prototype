"use client";

import { Page } from "@/components/kit/page";
import { SearchBox } from "@/components/kit/search-box";
import { Select } from "@/components/kit/select";
import { Toolbar } from "@/components/kit/toolbar";
import { useState } from "react";
import { DataTable, StatCard, StatGrid } from "@/components/admin/ui";
import { Badge } from "@/components/kit/badge";
import { ageOf, contractName, dateOf, daysOpen, DISPUTE_REASONS, DISPUTE_STATUSES, holds, leftLabel, otherParty, partyName, partyTurn, SLA_DAYS, STATUS_TONE, unseenByAdmin, usd, useDisputes, waitingOn } from "@/lib/demo/disputes";
import { useNow } from "@/lib/portal/use-now";
import type { Dispute } from "@/lib/demo/disputes";

/**
 * AD-032 — every dispute on the platform, newest first, with both parties, the amount, the
 * reason and the status, filterable by status and reason. It used to be five hardcoded rows, so
 * a dispute filed in either portal never reached it and its filters did nothing.
 */
export default function AllDisputes() {
  const all = useDisputes();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [reason, setReason] = useState("All reasons");
  const unseen = new Set(unseenByAdmin(all).map((d) => d.id));
  const now = useNow();
  const rows = matching(all, q, status, reason);

  return (
    <Page title="All disputes">
      <DisputeStats all={all} />

      <Toolbar>
        <SearchBox placeholder="Search by party, contract or reason" value={q} onChange={setQ} className="w-[320px]" />
        <Select aria-label="Status" options={["All statuses", ...DISPUTE_STATUSES]} value={status} onChange={(e) => setStatus(e.target.value)} className="!w-[180px]" />
        <Select aria-label="Reason" options={["All reasons", ...DISPUTE_REASONS]} value={reason} onChange={(e) => setReason(e.target.value)} className="!w-[220px]" />
      </Toolbar>

      <DataTable<Dispute>
        rows={rows}
        rowHref={(d) => `/admin/disputes/${d.id}`}
        empty={all.length === 0 ? "No disputes filed yet. When a Team Builder or an independent files one, it lands here for review." : "No disputes match these filters."}
        columns={[
          {
            header: "Dispute",
            cell: (d) => (
              <span className="flex flex-wrap items-center gap-2">
                {d.reason} · {d.title}
                {/* TB-093 / IN-082 — a filing, a withdrawal or a new statement is flagged until opened. */}
                {unseen.has(d.id) && <Badge tone="accent">New</Badge>}
              </span>
            ),
          },
          { header: "Date filed", cell: (d) => dateOf(d.at), col: "w-[100px]" },
          { header: "Filed by", cell: (d) => partyName(d, d.filedBy), col: "w-[130px]" },
          { header: "Against", cell: (d) => partyName(d, otherParty(d.filedBy)), col: "w-[130px]" },
          { header: "Amount", cell: (d) => usd(d.amount), col: "w-[90px]" },
          { header: "Waiting on", cell: (d) => waitingCell(d, now), col: "w-[150px]" },
          { header: "Age", cell: (d) => ageOf(d), col: "w-[70px]" },
          { header: "Status", cell: (d) => <Badge tone={STATUS_TONE[d.status]}>{d.status}</Badge>, col: "w-[120px]" },
        ]}
      />
    </Page>
  );
}

/** The figures over the list: support's own queue against the SLA, what's past it, what waits on release, and the money held. */
function DisputeStats({ all }: { all: Dispute[] }) {
  const pending = all.filter((d) => d.status === "Pending");
  return (
    <StatGrid>
      <StatCard label="Waiting on support" value={String(pending.filter((d) => waitingOn(d) === "support").length)} sub={`of ${pending.length} open · SLA ${SLA_DAYS} days`} />
      <StatCard label="Past SLA" value={String(pending.filter((d) => daysOpen(d) > SLA_DAYS).length)} sub="pending longer than 5 days" />
      <StatCard label="Awaiting release" value={String(all.filter((d) => d.resolution?.payment === "awaiting release").length)} sub="ruled for the independent" />
      <StatCard label="Held for disputes" value={usd(all.filter(holds).reduce((n, d) => n + d.amount, 0))} sub="in escrow, or kept back from pay" />
    </StatGrid>
  );
}

/** The disputes the toolbar leaves, newest first: by status, by reason, and by the search over both parties, the contract and the reason. */
function matching(all: Dispute[], q: string, status: string, reason: string) {
  return [...all]
    .sort((a, b) => b.at - a.at)
    .filter(
      (d) =>
        (status === "All statuses" || d.status === status) &&
        (reason === "All reasons" || d.reason === reason) &&
        `${partyName(d, "team")} ${partyName(d, "independent")} ${contractName(d)} ${d.reason}`.toLowerCase().includes(q.trim().toLowerCase()),
    );
}

/** Whose move it is: support's own queue first, then who each other case waits on. */
function waitingCell(d: Dispute, now: number) {
  const w = waitingOn(d);
  const t = partyTurn(d);
  if (!w) return "—";
  if (w === "support") return "Support";
  return `${partyName(d, w)} · ${t ? leftLabel(t.due, now).toLowerCase() : ""}`;
}
