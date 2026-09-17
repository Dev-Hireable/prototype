"use client";

import { useState } from "react";
import { Button, Card, Chip, EmptyState, Page, SearchBox, Select, StatusDot, Toast, useToast } from "@/components/independent/ui";
import { Drawer, Row, Table, Toolbar } from "@/components/team/ui";
import { transactions } from "@/lib/team/data";
import type { Transaction } from "@/lib/team/data";

/** Figma columns: Date 110 · Description flex · Independent 150 · Type 130 · Amount 110 · Status 132 · Actions 80. */
const COLS = ["w-[110px]", "min-w-0 flex-1", "w-[150px]", "w-[130px]", "w-[110px]", "w-[132px]", "w-[80px]"];
const DM = { fontVariationSettings: '"opsz" 14' } as const;

const TYPES = ["All types", "Payment Deposited", "Payment Released", "Payment Refunded"] as const;
const RANGES = { "All time": Infinity, "Last 30 days": 30, "Last 90 days": 90 } as const;
/** A screenful of ledger rows. Not tuned to force a second page out of six transactions — the
 * pager hides itself when everything fits, which is the behaviour worth showing. */
const PER_PAGE = 10;
/** Latest transaction in the seed — "last 30 days" is measured from the data, not the wall clock. */
const TODAY = Math.max(...transactions.map((t) => t.at));
/** yyyymmdd stamps, so the gap in days is close enough for a range filter. */
const daysBetween = (a: number, b: number) => {
  const d = (n: number) => new Date(Math.floor(n / 10000), (Math.floor(n / 100) % 100) - 1, n % 100).getTime();
  return Math.round((d(a) - d(b)) / 86400000);
};
/** "$1,400.00" → 1400 — the seed carries formatted strings, and the summary has to add them up. */
const money = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Figma "Payments / Transactions · list" + "Transaction · detail drawer". */
export default function Transactions() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("All types");
  const [contract, setContract] = useState("All contracts");
  const [range, setRange] = useState<keyof typeof RANGES>("All time");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [toast, setToast] = useToast();

  const contracts = ["All contracts", ...new Set(transactions.map((t) => t.contract))];
  /* TB-084 — newest first, before anything is filtered out of it. */
  const all = [...transactions].sort((a, b) => b.at - a.at);
  const rows = all.filter(
    (t) =>
      (type === "All types" || t.type === type) &&
      (contract === "All contracts" || t.contract === contract) &&
      daysBetween(TODAY, t.at) <= RANGES[range] &&
      // TB-086 searches the two names a Team Builder would actually recall.
      `${t.contract} ${t.independent}`.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const filtering = q.trim() !== "" || type !== "All types" || contract !== "All contracts" || range !== "All time";
  const clearAll = () => {
    setQ("");
    setType("All types");
    setContract("All contracts");
    setRange("All time");
    setPage(1);
  };

  /* TB-119 — every figure is added up from the ledger, so a new transaction moves it. */
  const spent = all.filter((t) => t.type === "Payment Released").reduce((n, t) => n + money(t.amount), 0);
  const held = all.filter((t) => t.type === "Payment Deposited").reduce((n, t) => n + money(t.amount), 0);
  const refunded = all.filter((t) => t.type === "Payment Refunded").reduce((n, t) => n + money(t.amount), 0);

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = rows.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return (
    <Page title="Transactions">
      <div className="flex gap-4 whitespace-nowrap">
        {(
          [
            [usd(spent), "Total spent", `${all.filter((t) => t.type === "Payment Released").length} released across ${new Set(all.map((t) => t.contract)).size} contracts`],
            [usd(held), "Held in escrow", `${all.filter((t) => t.type === "Payment Deposited").length} deposits not yet released`],
            [usd(refunded), "Refunded", `${all.filter((t) => t.type === "Payment Refunded").length} returned to your card`],
          ] as const
        ).map(([v, l, s]) => (
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
        <SearchBox
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder="Search by contract or independent"
          className="w-[300px]"
        />
        <Select
          options={[...TYPES]}
          value={type}
          onChange={(e) => {
            setType(e.target.value as (typeof TYPES)[number]);
            setPage(1);
          }}
          className="!w-[190px]"
        />
        <Select
          options={contracts}
          value={contract}
          onChange={(e) => {
            setContract(e.target.value);
            setPage(1);
          }}
          className="!w-[210px]"
        />
        <Select
          options={Object.keys(RANGES)}
          value={range}
          onChange={(e) => {
            setRange(e.target.value as keyof typeof RANGES);
            setPage(1);
          }}
          className="!w-[150px]"
        />
      </Toolbar>

      {/* TB-087 — what is filtering right now, and one click to undo all of it. */}
      {filtering && (
        <div className="flex flex-wrap items-center gap-2 text-[13px] leading-[1.3]">
          <span className="text-ink-2">Filtered by</span>
          {[q.trim() && `“${q.trim()}”`, type !== "All types" && type, contract !== "All contracts" && contract, range !== "All time" && range]
            .filter(Boolean)
            .map((f) => (
              <span key={String(f)} className="rounded-full bg-accent-bg px-3 py-1 font-semibold text-accent-ink">
                {f}
              </span>
            ))}
          <span className="text-ink-2">
            · {rows.length} of {all.length}
          </span>
          <Button size="sm" onClick={clearAll}>
            Clear filters
          </Button>
        </div>
      )}
      {/* TB-084 — nothing at all versus nothing matching are different dead ends. */}
      {all.length === 0 ? (
        <EmptyState title="No transactions yet" body="Escrow deposits, releases and refunds appear here as soon as a contract starts." />
      ) : rows.length === 0 ? (
        <EmptyState title="No transactions match" body="Try a different filter, or clear the search to see the full ledger." action={<Button size="lg" variant="primary" onClick={clearAll}>Clear filters</Button>} />
      ) : (
        <>
          <Table cols={COLS} head={["Date", "Contract", "Independent", "Type", "Amount", "Status", "Actions"]}>
            {shown.map((t) => (
              <Row key={t.id}>
                <span className={COLS[0]}>{t.date}</span>
                {/* TB-119 — the row itself opens the detail, not just the button at the end of it. */}
                <button type="button" onClick={() => setDetail(t)} className={`${COLS[1]} truncate text-left text-[14px] text-ink hover:text-primary`}>
                  {t.contract}
                </button>
                <span className={COLS[2]}>{t.independent}</span>
                <span className={COLS[3]}>
                  <Chip>{t.type.replace("Payment ", "")}</Chip>
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

          {/* TB-084 pagination — real page maths, not a fixed row of numbers. */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 text-[13px] leading-[1.3]">
              <Button size="sm" disabled={current === 1} onClick={() => setPage(current - 1)}>
                Previous
              </Button>
              {Array.from({ length: pages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-current={current === i + 1 ? "page" : undefined}
                  onClick={() => setPage(i + 1)}
                  className={`flex size-9 items-center justify-center rounded-lg font-medium ${current === i + 1 ? "bg-primary text-white" : "text-ink hover:bg-surface-alt"}`}
                >
                  {i + 1}
                </button>
              ))}
              <Button size="sm" disabled={current === pages} onClick={() => setPage(current + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}

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
