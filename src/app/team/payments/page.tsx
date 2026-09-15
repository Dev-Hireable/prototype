"use client";

import { useState } from "react";
import { Button, Card, Chip, Page, SearchBox, Select, StatusDot, Toast, useToast } from "@/components/independent/ui";
import { Drawer, Row, Table, Toolbar } from "@/components/team/ui";
import { transactions } from "@/lib/team/data";
import type { Transaction } from "@/lib/team/data";

/** Figma columns: Date 110 · Description flex · Independent 150 · Type 130 · Amount 110 · Status 132 · Actions 80. */
const COLS = ["w-[110px]", "min-w-0 flex-1", "w-[150px]", "w-[130px]", "w-[110px]", "w-[132px]", "w-[80px]"];
const DM = { fontVariationSettings: '"opsz" 14' } as const;

/** Figma "Payments / Transactions · list" + "Transaction · detail drawer". */
export default function Transactions() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("All types");
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [toast, setToast] = useToast();
  const rows = transactions.filter((t) => (type === "All types" || t.type === type) && `${t.desc} ${t.independent} ${t.detail.rows[0][1]}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Page title="Transactions">
      <div className="flex gap-4 whitespace-nowrap">
        {[
          ["$1,600.00", "Held in escrow", "1 active trial"],
          ["$4,200.00", "Paid this month", "3 payouts"],
          ["$1,200.00", "Pending", "releases 30 Sep 2026"],
        ].map(([v, l, s]) => (
          <Card key={l} className="flex min-w-0 flex-1 flex-col gap-0.5 p-4">
            <p className="font-display text-[22px] leading-[1.5] font-semibold text-ink" style={DM}>
              {v}
            </p>
            <p className="text-[13px] leading-[1.4] font-medium text-ink-2">{l}</p>
            <p className="text-[12px] leading-[1.4] text-ink-2">{s}</p>
          </Card>
        ))}
      </div>
      <Toolbar
        right={
          <Button size="lg" className="!px-5" onClick={() => setToast("Statement exported as CSV")}>
            Export CSV
          </Button>
        }
      >
        <SearchBox value={q} onChange={setQ} placeholder="Search by independent, role or reference" className="w-[340px]" />
        <Select options={["All types", "Escrow deposit", "Full-time salary", "Trial payout", "Refund"]} value={type} onChange={(e) => setType(e.target.value)} className="!w-[160px]" />
        <Select options={["Last 90 days", "Last 30 days", "All time"]} className="!w-[160px]" />
      </Toolbar>
      <Table cols={COLS} head={["Date", "Description", "Independent", "Type", "Amount", "Status", "Actions"]}>
        {rows.map((t) => (
          <Row key={t.id}>
            <span className={COLS[0]}>{t.date}</span>
            <span className={`${COLS[1]} truncate text-[14px]`}>{t.desc}</span>
            <span className={COLS[2]}>{t.independent}</span>
            <span className={COLS[3]}>
              <Chip>{t.type}</Chip>
            </span>
            <span className={`${COLS[4]} text-[14px] font-medium`}>{t.amount}</span>
            <span className={COLS[5]}>
              <StatusDot tone={t.status.tone}>{t.status.label}</StatusDot>
            </span>
            <span className={COLS[6]}>
              <Button size="sm" onClick={() => setDetail(t)}>
                View
              </Button>
            </span>
          </Row>
        ))}
      </Table>

      <Drawer open={!!detail} onClose={() => setDetail(null)} title="Transaction">
        {detail && (
          <>
            <div className="flex items-center justify-between">
              <p className="font-display text-[28px] leading-[1.5] font-semibold text-ink" style={DM}>
                {detail.amount}
              </p>
              <StatusDot tone={detail.status.tone}>{detail.detail.drawerStatus}</StatusDot>
            </div>
            <div className="flex items-center gap-2">
              <Chip>{detail.type}</Chip>
              <span className="text-[13px] leading-[1.4] text-ink-2">{detail.detail.time}</span>
            </div>
            <dl className="flex flex-col gap-2 rounded-lg bg-[#fafafa] p-4 text-[13px] leading-[1.4]">
              <dt className="font-medium text-ink-2">Details</dt>
              {detail.detail.rows.map(([k, v]) => (
                <div key={k} className="flex gap-4">
                  <span className="w-40 shrink-0 text-ink-2">{k}</span>
                  <span className="min-w-0 flex-1 text-ink">{v}</span>
                </div>
              ))}
            </dl>
            <dl className="flex flex-col gap-2 text-[13px] leading-[1.4]">
              <dt className="font-medium text-ink-2">Breakdown</dt>
              {detail.detail.breakdown.map(([k, v]) => (
                <div key={k} className="flex gap-4">
                  <span className="w-40 shrink-0 text-ink-2">{k}</span>
                  <span className="min-w-0 flex-1 text-ink">{v}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-2 text-[14px] font-semibold text-ink">
                <span>Total charged</span>
                <span>{detail.detail.total}</span>
              </div>
            </dl>
            <div className="flex flex-col">
              <p className="text-[13px] leading-[1.4] font-medium text-ink-2">Timeline</p>
              {detail.detail.timeline.map((step) => (
                <div key={step.title} className="flex items-center gap-3 py-2.5">
                  <span className={`size-2.5 shrink-0 rounded-full ${step.done ? "bg-ok" : "bg-[#e5e5e5]"}`} />
                  <div className={`flex flex-col leading-[1.4] whitespace-nowrap ${step.done ? "" : "text-ink-2"}`}>
                    <p className={`text-[13px] font-medium ${step.done ? "text-ink" : ""}`}>{step.title}</p>
                    <p className="text-[12px] text-ink-2">{step.date}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <Button size="lg" className="flex-1" onClick={() => setToast("Receipt downloaded")}>
                Download receipt
              </Button>
              <Button size="lg" className="flex-1" onClick={() => { setDetail(null); setToast("Dispute form opens in Messages with Hireable support"); }}>
                Report a problem
              </Button>
            </div>
          </>
        )}
      </Drawer>
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
