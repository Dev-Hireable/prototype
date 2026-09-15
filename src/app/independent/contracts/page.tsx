"use client";

import { useState } from "react";
import { EmptyState, Initials, JobBadge, LinkButton, Page, Progress, SearchBox, Select, StatusDot } from "@/components/independent/ui";
import { contracts } from "@/lib/independent/data";

/** Figma "Contracts / All contracts · list / · empty": toolbar (search 360, status 170, type 150) + 2-column cards p 20 / gap 12. */
export default function Contracts() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("Status: All");
  const [type, setType] = useState("Type: All");
  const list = contracts.filter((c) => {
    if (q && !`${c.title} ${c.company}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (type !== "Type: All" && c.type !== (type === "Type: Trial" ? "trial" : "full-time")) return false;
    if (status !== "Status: All" && c.status.label !== status.replace("Status: ", "")) return false;
    return true;
  });

  return (
    <Page title="All contracts">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SearchBox value={q} onChange={setQ} placeholder="Search contracts" className="w-[360px]" />
          <Select
            options={["Status: All", "Status: On track", "Status: Active", "Status: Update pending review", "Status: Evaluation received", "Status: Ended", "Status: Off track"]}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="!w-[170px]"
          />
          <Select options={["Type: All", "Type: Trial", "Type: Full-time"]} value={type} onChange={(e) => setType(e.target.value)} className="!w-[150px]" />
        </div>
        <span className="text-[14px] leading-[1.4] text-ink-2">{list.length} contracts</span>
      </div>
      {list.length === 0 ? (
        <EmptyState title="No contracts yet" body="When you accept an offer, the contract and its trial tracker appear here." />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {list.map((c) => (
            <article key={c.slug} className="flex h-[216px] flex-col gap-3 rounded-lg bg-white p-5 outline -outline-offset-1 outline-border">
              <div className="flex items-start gap-3">
                <Initials text={c.initials} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[18px] leading-[1.4] font-semibold text-ink">
                    {c.title} <JobBadge type={c.type} />
                  </p>
                  <p className="text-[14px] leading-[1.4] text-ink-2">
                    {c.company} · {c.location}
                  </p>
                </div>
              </div>
              <p className="text-[13px] leading-[1.4] text-ink-2">{c.line}</p>
              <div className="flex items-center gap-3 text-[13px] leading-[1.4] text-ink-2">
                <StatusDot tone={c.status.tone}>{c.status.label}</StatusDot>
                <span>{c.progressLabel}</span>
                <Progress value={c.progress} tone={c.progressTone} label />
              </div>
              <div className="mt-auto flex gap-2">
                <LinkButton size="sm" variant="primary" href={`/independent/contracts/${c.slug}`}>
                  Open tracker
                </LinkButton>
                <LinkButton size="sm" href={`/independent/contracts/${c.slug}/offer`}>
                  View contract
                </LinkButton>
              </div>
            </article>
          ))}
        </div>
      )}
    </Page>
  );
}
