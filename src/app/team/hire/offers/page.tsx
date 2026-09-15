"use client";

import { useState } from "react";
import { Button, LinkButton, Modal, Page, SearchBox, Select, StatusDot, Toast, useToast } from "@/components/independent/ui";
import { Person, Row, Table, Toolbar } from "@/components/team/ui";
import { byName } from "@/lib/team/data";
import type { Offer } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";

/** Figma columns: Candidate flex · Role 170 · Sent 100 · Rate 130 · Start date 105 · Status 105 · Actions 170. */
const COLS = ["min-w-0 flex-1", "w-[170px]", "w-[100px]", "w-[130px]", "w-[105px]", "w-[105px]", "w-[170px]"];

/** Figma "Hire / Offers sent · list / Withdraw sent offer · confirm"; Edit opens the full-page "Edit sent offer". */
export default function OffersSent() {
  const { offers, setOffer } = useDemo();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [withdrawing, setWithdrawing] = useState<Offer | null>(null);
  const [toast, setToast] = useToast();
  const list = offers.filter((o) => (status === "All statuses" || o.status.label === status) && `${byName(o.independent).name} ${o.role}`.toLowerCase().includes(q.toLowerCase()));
  const pending = offers.filter((o) => o.status.label === "Pending").length;

  return (
    <Page title="Offers sent">
      <Toolbar
        right={
          <span className="text-[14px] leading-[1.4] text-ink-2">
            {offers.length} offers · {pending} pending
          </span>
        }
      >
        <SearchBox value={q} onChange={setQ} placeholder="Search offers" className="w-[320px]" />
        <Select options={["All roles", "Sales Manager", "Customer Success Lead", "Sales Development Rep"]} className="!w-[180px]" />
        <Select options={["All statuses", "Pending", "Accepted", "Declined", "Withdrawn"]} value={status} onChange={(e) => setStatus(e.target.value)} className="!w-[160px]" />
      </Toolbar>
      <Table cols={COLS} head={["Candidate", "Role", "Sent", "Rate", "Start date", "Status", "Actions"]}>
        {list.map((o) => {
          const p = byName(o.independent);
          return (
            <Row key={o.id}>
              <span className={COLS[0]}>
                <Person name={p.name} role={p.role} avatar={p.avatar} href={`/team/discover/${p.slug}`} />
              </span>
              <span className={`${COLS[1]} text-[14px]`}>{o.role}</span>
              <span className={`${COLS[2]} text-ink-2`}>{o.sent}</span>
              <span className={`${COLS[3]} text-[14px]`}>{o.rate}</span>
              <span className={`${COLS[4]} text-ink-2`}>{o.start}</span>
              <span className={COLS[5]}>
                <StatusDot tone={o.status.tone}>{o.status.label}</StatusDot>
              </span>
              <span className={`${COLS[6]} flex gap-2`}>
                {o.status.label === "Pending" ? (
                  <LinkButton size="sm" href={`/team/hire/offers/${o.id}/edit`}>
                    Edit
                  </LinkButton>
                ) : (
                  <Button size="sm" disabled>
                    Edit
                  </Button>
                )}
                <Button size="sm" disabled={o.status.label !== "Pending"} onClick={() => setWithdrawing(o)}>
                  Withdraw
                </Button>
              </span>
            </Row>
          );
        })}
      </Table>

      <Modal
        open={!!withdrawing}
        onClose={() => setWithdrawing(null)}
        tone="danger"
        title="Withdraw this offer?"
        description={`${withdrawing ? byName(withdrawing.independent).name : "The candidate"} is told the offer was withdrawn. Nothing is charged and you can send a new offer later.`}
        footer={
          <>
            <Button size="lg" onClick={() => setWithdrawing(null)}>
              Cancel
            </Button>
            <Button size="lg" variant="danger" onClick={() => { if (withdrawing) setOffer(withdrawing.id, { status: { label: "Withdrawn", tone: "danger" } }); setWithdrawing(null); setToast("Offer withdrawn"); }}>
              Withdraw offer
            </Button>
          </>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
