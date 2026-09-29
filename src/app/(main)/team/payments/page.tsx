"use client";

import { useState } from "react";
import { Button, Card, Chip, Drawer, EmptyState, LinkButton, Page, Row, SearchBox, Select, StatusDot, Table, Toast, Toolbar } from "@/components/portal/ui";
import { useToast, type SetToast } from "@/lib/portal/toast";
import type { Transaction } from "@/lib/team/data";
import { useLedger } from "@/lib/team/contracts";

const COLS = ["w-[110px]", "min-w-0 flex-1", "w-[150px]", "w-[130px]", "w-[110px]", "w-[132px]", "w-[80px]"];
const DM = { fontVariationSettings: '"opsz" 14' } as const;

const TYPES = ["All types", "Payment Deposited", "Payment Released", "Payment Refunded"] as const;
const RANGES = { "All time": Infinity, "Last 30 days": 30, "Last 90 days": 90 } as const;
/** A screenful of ledger rows. Not tuned to force a second page out of six transactions — the
 * pager hides itself when everything fits, which is the behaviour worth showing. */
const PER_PAGE = 10;
/** Today as a yyyymmdd stamp. The ledger is live now, so "last 30 days" runs from the real date. */
const todayStamp = () => {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};
/** yyyymmdd stamps, so the gap in days is close enough for a range filter. */
const daysBetween = (a: number, b: number) => {
  const d = (n: number) => new Date(Math.floor(n / 10000), (Math.floor(n / 100) % 100) - 1, n % 100).getTime();
  return Math.round((d(a) - d(b)) / 86400000);
};
/** "$1,400.00" → 1400 — the seed carries formatted strings, and the summary has to add them up. */
const money = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function Transactions() {
  const transactions = useLedger();
  const filters = useFilters(transactions);
  const [detail, setDetail] = useState<Transaction | null>(null);
  /** The transaction on screen, kept while the drawer slides out so it doesn't empty mid-animation. */
  const [viewing, setViewing] = useState(detail);
  if (detail && detail !== viewing) setViewing(detail);
  const [toast, setToast] = useToast();

  return (
    <Page title="Transactions">
      <Totals all={filters.all} />
      <LedgerToolbar filters={filters} onExport={() => setToast("Statement exported as CSV")} />

      {/* TB-087 — what is filtering right now, and one click to undo all of it. */}
      {filters.filtering && <FilterSummary filters={filters} />}
      {/* TB-084 — nothing at all versus nothing matching are different dead ends. */}
      <TransactionTable filters={filters} onView={setDetail} />

      <TransactionDrawer open={!!detail} viewing={viewing} onClose={() => setDetail(null)} onToast={setToast} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** The ledger's search, type, contract and date-range filters, which combine, and the page of what they leave. */
function useFilters(transactions: Transaction[]) {
  // Never earlier than the newest row, so a seeded row dated ahead of the clock still counts.
  const TODAY = Math.max(todayStamp(), ...transactions.map((t) => t.at));
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("All types");
  const [contract, setContract] = useState("All contracts");
  const [range, setRange] = useState<keyof typeof RANGES>("All time");
  const [page, setPage] = useState(1);

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

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = rows.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  return { q, setQ, type, setType, contract, setContract, range, setRange, setPage, contracts, all, rows, filtering, clearAll, pages, current, shown };
}

type Filters = ReturnType<typeof useFilters>;

/** Search and the type, contract and date-range filters — any change goes back to the first page — and Export CSV. */
function LedgerToolbar({ filters, onExport }: { filters: Filters; onExport: () => void }) {
  const { q, setQ, type, setType, contract, setContract, range, setRange, setPage, contracts } = filters;
  return (
    <Toolbar
      right={
        <Button size="lg" className="!px-5" onClick={onExport}>
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
  );
}

/** The three figures over the ledger: spent, still held in escrow, and refunded. */
function Totals({ all }: { all: Transaction[] }) {
  /* TB-119 — every figure is added up from the ledger, so a new transaction moves it. */
  const spent = all.filter((t) => t.type === "Payment Released").reduce((n, t) => n + money(t.amount), 0);
  const refunded = all.filter((t) => t.type === "Payment Refunded").reduce((n, t) => n + money(t.amount), 0);
  // What is still in escrow: deposits less what has since been released or refunded out of them.
  const held = Math.max(0, all.filter((t) => t.type === "Payment Deposited").reduce((n, t) => n + money(t.amount), 0) - spent - refunded);
  return (
    <div className="flex gap-4 whitespace-nowrap">
      {(
        [
          [usd(spent), "Total spent", `${all.filter((t) => t.type === "Payment Released").length} released across ${plural(new Set(all.map((t) => t.contract)).size, "contract")}`],
          [usd(held), "Held in escrow", held > 0 ? "not yet released or refunded" : "nothing held right now"],
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
  );
}

/** The filters in force as chips, how many rows they leave, and Clear filters. */
function FilterSummary({ filters }: { filters: Filters }) {
  const { q, type, contract, range, rows, all, clearAll } = filters;
  return (
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
  );
}

/** The ledger table and its pager — or, when there's nothing to list, the empty state that says why. */
function TransactionTable({ filters, onView }: { filters: Filters; onView: (t: Transaction) => void }) {
  const { all, rows, shown, pages, current, setPage, clearAll } = filters;
  return all.length === 0 ? (
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
            <button type="button" onClick={() => onView(t)} className={`${COLS[1]} truncate text-left text-[14px] text-ink hover:text-primary`}>
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
              <Button size="sm" onClick={() => onView(t)}>
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
  );
}

/** One transaction in the drawer: amount and status, its details, breakdown and timeline, a receipt, and the way to report a problem. */
function TransactionDrawer({ open, viewing, onClose, onToast }: { open: boolean; viewing: Transaction | null; onClose: () => void; onToast: SetToast }) {
  return (
    <Drawer open={open} onClose={onClose} title="Transaction">
      {viewing && (
        <>
          <div className="flex items-center justify-between">
            <p className="font-display text-[28px] leading-[1.5] font-semibold text-ink" style={DM}>
              {viewing.amount}
            </p>
            <StatusDot tone={viewing.status.tone}>{viewing.detail.drawerStatus}</StatusDot>
          </div>
          <div className="flex items-center gap-2">
            <Chip>{viewing.type}</Chip>
            <span className="text-[13px] leading-[1.4] text-ink-2">{viewing.detail.time}</span>
          </div>
          <dl className="flex flex-col gap-2 rounded-lg bg-[#fafafa] p-4 text-[13px] leading-[1.4]">
            <dt className="font-medium text-ink-2">Details</dt>
            <DetailRows rows={viewing.detail.rows} />
          </dl>
          <dl className="flex flex-col gap-2 text-[13px] leading-[1.4]">
            <dt className="font-medium text-ink-2">Breakdown</dt>
            <DetailRows rows={viewing.detail.breakdown} />
            <div className="flex items-center justify-between border-t border-border pt-2 text-[14px] font-semibold text-ink">
              <span>Total charged</span>
              <span>{viewing.detail.total}</span>
            </div>
          </dl>
          <Timeline steps={viewing.detail.timeline} />
          <div className="flex gap-3 pt-2">
            <Button size="lg" className="flex-1" onClick={() => onToast("Receipt downloaded")}>
              Download receipt
            </Button>
            {/* A payment is disputed from its contract, where the escrow and the dispute live —
                this used to show a toast about a Messages form that doesn't exist. */}
            {viewing.contractHref && (
              <LinkButton size="lg" className="flex-1 justify-center" href={viewing.contractHref}>
                Report a problem
              </LinkButton>
            )}
          </div>
        </>
      )}
    </Drawer>
  );
}

/** A drawer list's label and value rows — the transaction's details, or its breakdown. */
function DetailRows({ rows }: { rows: [string, string][] }) {
  return (
    <>
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-4">
          <span className="w-40 shrink-0 text-ink-2">{k}</span>
          <span className="min-w-0 flex-1 text-ink">{v}</span>
        </div>
      ))}
    </>
  );
}

/** Where the payment has got to: each step, done or still to come, with its date. */
function Timeline({ steps }: { steps: Transaction["detail"]["timeline"] }) {
  return (
    <div className="flex flex-col">
      <p className="text-[13px] leading-[1.4] font-medium text-ink-2">Timeline</p>
      {steps.map((step) => (
        <div key={step.title} className="flex items-center gap-3 py-2.5">
          <span className={`size-2.5 shrink-0 rounded-full ${step.done ? "bg-ok" : "bg-[#e5e5e5]"}`} />
          <div className={`flex flex-col leading-[1.4] whitespace-nowrap ${step.done ? "" : "text-ink-2"}`}>
            <p className={`text-[13px] font-medium ${step.done ? "text-ink" : ""}`}>{step.title}</p>
            <p className="text-[12px] text-ink-2">{step.date}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
