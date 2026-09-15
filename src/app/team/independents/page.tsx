"use client";

import { useState } from "react";
import { EmptyState, JobBadge, LinkButton, Page, Progress, SearchBox, Select, StatusDot } from "@/components/independent/ui";
import { Pagination, Person, Row, Table, Toolbar } from "@/components/team/ui";
import { CONTRACT_NAMES, byName, contracts } from "@/lib/team/data";

/** Figma columns: Independent flex · Type 110 · Status 150 · Trial progress 230 · Started 110 · Actions 130. */
const COLS = ["min-w-0 flex-1", "w-[110px]", "w-[150px]", "w-[230px]", "w-[110px]", "w-[130px]"];

/** Figma "Independents / All independents · list / · empty". */
export default function AllIndependents() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("Status: All");
  const [type, setType] = useState("Type: All");
  const list = contracts.filter((c) => {
    const name = CONTRACT_NAMES[c.slug] ?? byName(c.independent).name;
    if (q && !`${name} ${c.role}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (status !== "Status: All" && c.status.label !== status.replace("Status: ", "")) return false;
    if (type !== "Type: All" && c.type !== (type === "Type: Trial" ? "trial" : "full-time")) return false;
    return true;
  });

  return (
    <Page title="All independents">
      <Toolbar right={<span className="text-[14px] leading-[1.4] text-ink-2">{list.length + 18} independents</span>}>
        <SearchBox value={q} onChange={setQ} placeholder="Search independents" className="w-[360px]" />
        <Select options={["Status: All", "Status: On track", "Status: Active", "Status: Update pending", "Status: Evaluation due", "Status: Ended", "Status: Off track"]} value={status} onChange={(e) => setStatus(e.target.value)} className="!w-[170px]" />
        <Select options={["Type: All", "Type: Trial", "Type: Full-time"]} value={type} onChange={(e) => setType(e.target.value)} className="!w-[150px]" />
      </Toolbar>
      {list.length === 0 ? (
        <EmptyState title="No independents yet" body="When a candidate accepts an offer, their contract and tracker appear here." />
      ) : (
        <>
          <Table cols={COLS} head={["Independent", "Type", "Status", "Trial progress", "Started", "Actions"]}>
            {list.map((c) => {
              const p = byName(c.independent);
              return (
                <Row key={c.slug}>
                  <span className={COLS[0]}>
                    <Person name={CONTRACT_NAMES[c.slug] ?? p.name} role={c.role} avatar={p.avatar} href={`/team/independents/${c.slug}`} />
                  </span>
                  <span className={COLS[1]}>
                    <JobBadge type={c.type} />
                  </span>
                  <span className={COLS[2]}>
                    <StatusDot tone={c.status.tone}>{c.status.label}</StatusDot>
                  </span>
                  <span className={COLS[3]}>{c.progress === null ? <span className="text-[14px]">Hired full-time</span> : <Progress value={c.progress} tone={c.status.tone === "danger" ? "warn" : c.progress === 100 ? "ok" : "primary"} label className="w-[200px]" />}</span>
                  <span className={COLS[4]}>{c.started}</span>
                  <span className={COLS[5]}>
                    <LinkButton size="sm" href={`/team/independents/${c.slug}`}>
                      Open tracker
                    </LinkButton>
                  </span>
                </Row>
              );
            })}
          </Table>
          <Pagination last="4" />
        </>
      )}
    </Page>
  );
}
