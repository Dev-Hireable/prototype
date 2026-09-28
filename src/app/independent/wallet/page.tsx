"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { ICONS } from "@/components/admin/icons";
import { AddPayoutModal } from "@/components/independent/AddPayoutModal";
import { Button, Card, Chip, EmptyState, InfoBanner, KebabMenu, LinkButton, Modal, Page, SearchBox, Select, StatusDot, Toast } from "@/components/independent/ui";
import { MenuAction } from "@/components/portal/controls";
import { useDeal } from "@/lib/demo/deal";
import { escrowOf, useDisputes, type Dispute } from "@/lib/demo/disputes";
import { PAIR } from "@/lib/demo/live";
import { EARNINGS_LABEL, EARNINGS_TYPES } from "@/lib/independent/data";
import type { PayoutMethod, Transaction } from "@/lib/independent/data";
import { heirOf, useWallet } from "@/lib/independent/wallet";
import { useIndependentContracts } from "@/lib/independent/contracts";
import { keyed } from "@/lib/portal/keys";
import { useToast } from "@/lib/portal/toast";

const Verified = ICONS.checkCircle;
const Check = ICONS.check;
const Add = ICONS.add;
const SetDefault = ICONS.checkCircleOutline;
const History = ICONS.history;
const Trash = ICONS.trash;

/** The payout cards' brand wordmarks. Bank has no mark. */
const BRAND: Partial<Record<PayoutMethod["brand"], { src: string; w: number; cls: string }>> = {
  Maya: { src: "/brands/maya.png", w: 90, cls: "h-[26px] w-[90px]" },
  GCash: { src: "/brands/gcash.png", w: 110, cls: "h-[26px] w-[110px]" },
};

const COLS = ["w-[110px]", "min-w-0 flex-1", "w-[150px]", "w-[150px]", "w-[110px]", "w-[120px]", "w-[80px]"];
/** IN-078 date ranges, measured from the newest row rather than the wall clock. */
const RANGES = { "All time": Infinity, "Last 30 days": 30, "Last 90 days": 90 } as const;
type Range = keyof typeof RANGES;
/** A screenful of rows; the pager hides itself when everything fits. */
const PER_PAGE = 8;
const daysBetween = (a: number, b: number) => {
  const d = (n: number) => new Date(Math.floor(n / 10000), (Math.floor(n / 100) % 100) - 1, n % 100).getTime();
  return Math.round((d(a) - d(b)) / 86400000);
};
/** The seed carries formatted strings, and the summary has to add them up. */
const amountOf = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;
const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type ContractName = (t: Transaction) => string;

export default function Wallet() {
  const { payouts, setDefaultPayout, removePayout, available, withdrawFunds, transactions } = useWallet();
  const allDisputes = useDisputes();
  /** The live trial's escrow, as its contract tab shows it — the ledger has no row for a deposit. */
  const liveEscrow = escrowOf(useDeal(), allDisputes);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<PayoutMethod | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  /** IN-054 — one transaction, read-only. */
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [toast, setToast] = useToast();
  const { all, contractName, filters } = useLedger(transactions);
  const defaultPayout = payouts.find((p) => p.isDefault);
  /** Why Withdraw is off, shown as its tip; nothing while it's on. */
  const noWithdraw = available <= 0 ? "Nothing is available to withdraw yet." : defaultPayout?.verified.startsWith("Verified") ? undefined : "No verified payout method to send it to yet.";

  return (
    <Page title="Earnings">
      <div className="flex flex-col gap-6">
        <Balances all={all} available={available} escrowHeld={liveEscrow?.held ?? 0} />

        <PayoutMethods
          payouts={payouts}
          onAdd={() => setAdding(true)}
          onSetDefault={(m) => {
            setDefaultPayout(m.id);
            setToast(`${m.brand} ····${m.last4} is now your default`);
          }}
          onHistory={() => setToast("Payout history opens below", "info")}
          onRemove={setRemoving}
        />

        <FilterBar filters={filters} total={all.length}>
          <Button variant="primary" size="lg" className="ml-auto" disabled={!!noWithdraw} title={noWithdraw} onClick={() => setWithdrawing(true)}>
            Withdraw {money(available)}
          </Button>
        </FilterBar>

        <TransactionList all={all} filters={filters} contractName={contractName} onView={setDetail} />

        {/* IN-059 / IN-080 — filed disputes have their own page; this is the pointer to it. */}
        <DisputesNote all={allDisputes} />
      </div>

      <TransactionDetail detail={detail} contractName={contractName} onClose={() => setDetail(null)} onReceipt={() => setToast("Receipt downloaded")} />

      <AddPayoutModal open={adding} onClose={() => setAdding(false)} onAdded={(m) => setToast(`${m.brand} ····${m.last4} added${m.isDefault ? " and set as default" : ""}`)} />
      <RemoveMethod method={removing} heir={removing ? heirOf(payouts, removing.id) : undefined} onClose={() => setRemoving(null)} onRemove={() => { if (removing) removePayout(removing.id); setRemoving(null); setToast("Payout method removed"); }} />
      <WithdrawDialog open={withdrawing} amount={available} to={defaultPayout} onClose={() => setWithdrawing(false)} onWithdraw={() => { withdrawFunds(); setWithdrawing(false); setToast(`${money(available)} on its way`); }} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** The rows the page lists, the contract each one belongs to, and the filters over them. */
function useLedger(transactions: Transaction[]) {
  const { contracts } = useIndependentContracts();
  /** IN-053 — newest first, before anything is filtered out of it. */
  const all = [...transactions].sort((a, b) => b.at - a.at);
  /** The contract a row belongs to, by the title it was recorded with — it looked names up in an empty seed, so every row said "—". */
  const contractName: ContractName = (t) => t.contractTitle ?? contracts.find((c) => c.slug === t.contract)?.title ?? "—";
  const filters = useFilters(all, contractName);
  return { all, contractName, filters };
}

/** How many of the talent's disputes are under review, and the way to the page that lists them all — once there are any. */
function DisputesNote({ all }: { all: Dispute[] }) {
  /** Every dispute the independent is a party to — their own and the ones filed against them. */
  const disputes = all.filter((d) => d.independent.slug === PAIR.independent.slug);
  const pendingDisputes = disputes.filter((d) => d.status === "Pending").length;
  if (disputes.length === 0) return null;
  return (
    <p className="text-[13px] leading-[1.4] text-ink-2">
      {pendingDisputes > 0 ? `${pendingDisputes} ${pendingDisputes === 1 ? "dispute is" : "disputes are"} under review. ` : ""}
      <LinkButton size="sm" href="/independent/wallet/disputes">
        View disputes
      </LinkButton>
    </p>
  );
}

/** What removing `method` means: for the default, the method that takes over (`heir`), or that none can yet. */
function removalNote(method: PayoutMethod | null, heir: PayoutMethod | undefined) {
  if (!method?.isDefault) return "Payouts already scheduled to this method complete; nothing new is sent here.";
  return heir ? `This is your default method. Your next payout goes to ${heir.brand} ····${heir.last4} instead.` : "This is your default method, and no other is verified yet: withdrawing waits until one is.";
}

/** Removing a payout method: what's already scheduled to it still arrives — and, for the default, where the next payout goes. */
function RemoveMethod({ method, heir, onClose, onRemove }: { method: PayoutMethod | null; heir: PayoutMethod | undefined; onClose: () => void; onRemove: () => void }) {
  return (
    <Modal
      open={!!method}
      onClose={onClose}
      tone="danger"
      title={`Remove ${method?.brand} ····${method?.last4}?`}
      description={removalNote(method, heir)}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="danger" onClick={onRemove}>
            Remove
          </Button>
        </>
      }
    />
  );
}

/** Withdrawing everything available, to the default payout method. */
function WithdrawDialog({ open, amount, to, onClose, onWithdraw }: { open: boolean; amount: number; to: PayoutMethod | undefined; onClose: () => void; onWithdraw: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Withdraw ${money(amount)}?`}
      description={`Sent to your default method (${to?.brand ?? "—"} ····${to?.last4 ?? ""}). Usually lands within one working day.`}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" onClick={onWithdraw}>
            Withdraw
          </Button>
        </>
      }
    />
  );
}

/** IN-078 — search, contract, type and date range. They combine, and picking one goes back to the first page. */
function useFilters(all: Transaction[], contractName: ContractName) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("All types");
  /** IN-078 — contract and date range filter alongside the type, and they combine. */
  const [contract, setContract] = useState("All contracts");
  const [range, setRange] = useState<Range>("All time");
  const [page, setPage] = useState(1);
  const newest = Math.max(...all.map((t) => t.at), 0);
  const contractOptions = ["All contracts", ...new Set(all.map(contractName).filter((n) => n !== "—"))];
  // IN-078: the filters combine, and each one used to be decorative — the list never changed.
  const rows = all.filter(
    (t) =>
      (type === "All types" || EARNINGS_LABEL[t.type] === type) &&
      (contract === "All contracts" || contractName(t) === contract) &&
      daysBetween(newest, t.at) <= RANGES[range] &&
      `${contractName(t)} ${t.desc} ${t.party}`.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const current = Math.min(page, pages);
  return {
    q,
    setQ,
    type,
    contract,
    range,
    contractOptions,
    rows,
    filtering: q.trim() !== "" || type !== "All types" || contract !== "All contracts" || range !== "All time",
    pages,
    current,
    shown: rows.slice((current - 1) * PER_PAGE, current * PER_PAGE),
    setPage,
    pickType: (v: string) => {
      setType(v);
      setPage(1);
    },
    pickContract: (v: string) => {
      setContract(v);
      setPage(1);
    },
    pickRange: (v: Range) => {
      setRange(v);
      setPage(1);
    },
    clearAll: () => {
      setQ("");
      setType("All types");
      setContract("All contracts");
      setRange("All time");
      setPage(1);
    },
  };
}

type Filters = ReturnType<typeof useFilters>;

/** IN-052 — every figure is added up from the ledger, so a recorded payment moves it at once. */
function Balances({ all, available, escrowHeld }: { all: Transaction[]; available: number; escrowHeld: number }) {
  const received = all.filter((t) => t.type === "Payment Released").reduce((n, t) => n + amountOf(t.amount), 0);
  const heldRows = all.filter((t) => t.type === "Payment Deposited" && t.status.label === "Held");
  const held = heldRows.reduce((n, t) => n + amountOf(t.amount), 0) + escrowHeld;
  const heldTrials = heldRows.length + (escrowHeld > 0 ? 1 : 0);
  const withdrawals = all.filter((t) => t.type === "Payout");
  const withdrawn = withdrawals.reduce((n, t) => n + amountOf(t.amount), 0);
  const releases = all.filter((t) => t.type === "Payment Released");
  const payingContracts = new Set(releases.map((t) => t.contract)).size;
  return (
    <div className="flex gap-4 whitespace-nowrap">
      {[
        [money(received), "Received, all time", `${releases.length} ${releases.length === 1 ? "payment" : "payments"} received from ${payingContracts} ${payingContracts === 1 ? "contract" : "contracts"}`],
        [money(available), "Available to withdraw", available ? "released and not yet withdrawn" : received ? "withdrawn already" : "nothing released yet"],
        [money(held), "Held in escrow", `${heldTrials} ${heldTrials === 1 ? "trial" : "trials"} funded and not yet released`],
        [money(withdrawn), "Withdrawn to payout method", `${withdrawals.length === 1 ? "one payout" : `${withdrawals.length} payouts`} so far`],
      ].map(([v, l, s]) => (
        <Card key={l} className="flex min-w-0 flex-1 flex-col gap-0.5 p-4">
          <p className="font-display text-[22px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
            {v}
          </p>
          <p className="text-[13px] leading-[1.4] font-medium text-ink-2">{l}</p>
          <p className="text-[12px] leading-[1.4] text-ink-2">{s}</p>
        </Card>
      ))}
    </div>
  );
}

/** The payout cards, each with its ⋮ menu, and a tile that adds another. */
function PayoutMethods({ payouts, onAdd, onSetDefault, onHistory, onRemove }: { payouts: PayoutMethod[]; onAdd: () => void; onSetDefault: (m: PayoutMethod) => void; onHistory: () => void; onRemove: (m: PayoutMethod) => void }) {
  const [menu, setMenu] = useState<string | null>(null);
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
          Payout methods
        </h2>
        <Button variant="primary" size="lg" onClick={onAdd}>
          Add payout method
        </Button>
      </div>
      <p className="text-[13px] leading-[1.4] text-ink-2">
        Trial, full-time and part-time payments are released to your default method at the end of each payment cycle. The ⋮ menu on each card opens Set as default, View payout history and Remove.
      </p>
      <div className="grid grid-cols-3 gap-4 pt-3.5">
        {payouts.map((m) => (
          <PayoutCard
            key={m.id}
            method={m}
            open={menu === m.id}
            onOpenChange={(open) => setMenu(open ? m.id : null)}
            removable={payouts.length !== 1}
            onSetDefault={() => {
              onSetDefault(m);
              setMenu(null);
            }}
            onHistory={() => {
              setMenu(null);
              onHistory();
            }}
            onRemove={() => {
              onRemove(m);
              setMenu(null);
            }}
          />
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="flex h-[190px] flex-col items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-border bg-[#fafbfc] text-ink hover:bg-surface-alt"
        >
          <Add size={24} aria-hidden />
          <span className="text-[13px] leading-[1.3] font-semibold">Add payout method</span>
          <span className="text-[11px] leading-[1.3] text-ink-2">Bank · GCash · Maya</span>
        </button>
      </div>
      <div className="w-[530px]">
        <InfoBanner>Bank (InstaPay / PESONet), GCash and Maya are supported. Payouts usually land within one working day of release.</InfoBanner>
      </div>
    </Card>
  );
}

/** One payout method: its brand, the last four digits, who holds it and whether it's verified. */
function PayoutCard({ method: m, open, onOpenChange, removable, onSetDefault, onHistory, onRemove }: { method: PayoutMethod; open: boolean; onOpenChange: (open: boolean) => void; removable: boolean; onSetDefault: () => void; onHistory: () => void; onRemove: () => void }) {
  const brand = BRAND[m.brand];
  const verified = m.verified.startsWith("Verified");
  return (
    <div
      className={`relative flex h-[190px] flex-col justify-between rounded-2xl p-5 drop-shadow-[0_6px_8px_rgba(26,31,46,0.08)] ${m.isDefault ? "border-[1.5px] border-ok" : "border border-[#e3e6ea]"}`}
      style={{ backgroundImage: "linear-gradient(151.55deg, #ffffff 0%, #f2f4f7 71.429%)" }}
    >
      {m.isDefault && (
        <span className="absolute top-[-21.5px] left-5 flex items-center gap-[5px] rounded-t-lg bg-ok pt-[5px] pr-[11px] pb-1 pl-[9px] text-[9.5px] leading-[1.2] font-semibold tracking-[0.57px] text-white">
          <span className="flex size-3.5 items-center justify-center rounded-[7px] bg-white text-ok">
            <Check size={10} aria-hidden />
          </span>
          DEFAULT
        </span>
      )}
      <div className="flex items-center gap-2">
        {brand ? <Image src={brand.src} alt={m.brand} width={brand.w} height={26} className={`${brand.cls} object-contain`} /> : <span className="h-[26px] text-[20px] leading-[26px] font-bold text-ink">Bank</span>}
        <span className="flex-1" />
        <KebabMenu label="Payout method actions" open={open} onOpenChange={onOpenChange} buttonClassName="!size-7">
          <MenuAction disabled={m.isDefault || !verified} title={m.isDefault ? "This is already your default." : verified ? undefined : "It can be your default once it's verified."} onClick={onSetDefault} icon={<SetDefault size={18} aria-hidden />}>
            Set as default
          </MenuAction>
          <MenuAction onClick={onHistory} icon={<History size={18} aria-hidden />}>
            View payout history
          </MenuAction>
          <MenuAction destructive disabled={!removable} title={removable ? undefined : "Your only payout method can't be removed. Add another first."} onClick={onRemove} icon={<Trash size={18} aria-hidden />}>
            Remove
          </MenuAction>
        </KebabMenu>
      </div>
      <p className="text-[20px] leading-[1.3] font-semibold tracking-[1px] whitespace-pre text-ink">{`••••  ••••  ${m.last4}`}</p>
      <div className="flex items-end gap-4 text-[10px] leading-[1.3] font-semibold whitespace-nowrap">
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="tracking-[0.8px] text-muted-2 uppercase">Account holder</span>
          <span className="text-[13px] text-ink">{m.holder}</span>
        </span>
        <span className="flex flex-col items-end gap-[3px]">
          <span className="tracking-[0.8px] text-muted-2 uppercase">Status</span>
          <span className={`flex items-center gap-1 text-[12px] ${verified ? "text-ink" : "text-warn"}`}>
            {verified && <Verified size={14} aria-hidden className="text-ok" />} {m.verified}
          </span>
        </span>
      </div>
    </div>
  );
}

/** IN-078 — contract, type and date range, combinable, with the active ones spelled out. */
function FilterBar({ filters: f, total, children }: { filters: Filters; total: number; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <SearchBox value={f.q} onChange={f.setQ} placeholder="Search by contract or company" className="w-[280px]" />
        <Select options={f.contractOptions} value={f.contractOptions.includes(f.contract) ? f.contract : "All contracts"} onChange={(e) => f.pickContract(e.target.value)} className="!w-[230px]" />
        <Select options={["All types", ...EARNINGS_TYPES]} value={f.type} onChange={(e) => f.pickType(e.target.value)} className="!w-[190px]" />
        <Select options={Object.keys(RANGES)} value={f.range} onChange={(e) => f.pickRange(e.target.value as Range)} className="!w-[160px]" />
        {children}
      </div>
      {f.filtering && (
        <div className="flex flex-wrap items-center gap-2 text-[13px] leading-[1.4] text-ink-2">
          <span>
            Showing {f.rows.length} of {total === 1 ? "1 transaction" : `${total} transactions`}
          </span>
          {f.q.trim() && <Chip>Search: {f.q.trim()}</Chip>}
          {f.contract !== "All contracts" && <Chip>{f.contract}</Chip>}
          {f.type !== "All types" && <Chip>{f.type}</Chip>}
          {f.range !== "All time" && <Chip>{f.range}</Chip>}
          <Button size="sm" onClick={f.clearAll}>
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}

/** IN-053 — every row across every contract, newest first, paginated. */
function TransactionList({ all, filters: f, contractName, onView }: { all: Transaction[]; filters: Filters; contractName: ContractName; onView: (t: Transaction) => void }) {
  if (all.length === 0) return <EmptyState title="No transactions yet" body="Escrow deposits, released payments and withdrawals appear here as soon as a contract starts." />;
  if (f.rows.length === 0) {
    return (
      <EmptyState
        title="No transactions match"
        body="Try a different contract, type or date range."
        action={
          <Button size="lg" variant="primary" onClick={f.clearAll}>
            Clear filters
          </Button>
        }
      />
    );
  }
  return (
    <>
      <TransactionTable rows={f.shown} contractName={contractName} onView={onView} />
      {f.pages > 1 && <Pager current={f.current} pages={f.pages} onPage={f.setPage} />}
    </>
  );
}

/** One page of the ledger: date, contract, company, type, amount and status, and a View button on each row. */
function TransactionTable({ rows, contractName, onView }: { rows: Transaction[]; contractName: ContractName; onView: (t: Transaction) => void }) {
  return (
    <div className="overflow-hidden rounded-lg outline -outline-offset-1 outline-border">
      <div className="flex items-center gap-4 bg-surface-2 px-4 py-3 text-[13px] leading-[1.4] font-medium whitespace-nowrap text-ink-2">
        {["Date", "Contract", "Company", "Type", "Amount", "Status", "Actions"].map((h, i) => (
          <span key={h} className={COLS[i]}>
            {h}
          </span>
        ))}
      </div>
      {/* Date + description repeat when two payments land on one contract the same day (a
          dispute release, then End Contract): keyed() numbers exact repeats. */}
      {keyed(rows, (t) => `${t.date}-${t.desc}-${t.amount}`).map(({ item: t, key }) => (
        <div key={key} className="flex items-center gap-4 border-t border-border px-4 py-3 text-[13px] leading-[1.4] whitespace-nowrap text-ink">
          <span className={COLS[0]}>{t.date}</span>
          <span className={`${COLS[1]} truncate text-[14px]`}>{contractName(t)}</span>
          <span className={COLS[2]}>{t.party}</span>
          <span className={COLS[3]}>
            <Chip>{EARNINGS_LABEL[t.type] ?? t.type}</Chip>
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
        </div>
      ))}
    </div>
  );
}

/** Previous and Next either side of which page this is, once the rows run past one page. */
function Pager({ current, pages, onPage }: { current: number; pages: number; onPage: (page: number) => void }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button size="sm" disabled={current === 1} onClick={() => onPage(current - 1)}>
        Previous
      </Button>
      <span className="text-[13px] leading-[1.4] text-ink-2">
        Page {current} of {pages}
      </span>
      <Button size="sm" disabled={current === pages} onClick={() => onPage(current + 1)}>
        Next
      </Button>
    </div>
  );
}

/** IN-054 — date, contract, company, type, amount and status. Nothing here is editable. */
function TransactionDetail({ detail, contractName, onClose, onReceipt }: { detail: Transaction | null; contractName: ContractName; onClose: () => void; onReceipt: () => void }) {
  return (
    <Modal
      open={!!detail}
      onClose={onClose}
      title="Transaction"
      description={detail ? `${detail.date} · ${EARNINGS_LABEL[detail.type] ?? detail.type}` : undefined}
      footer={
        <>
          <Button size="lg" onClick={onReceipt}>
            Download receipt
          </Button>
          <Button size="lg" variant="primary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {detail && (
        <dl className="flex flex-col gap-2 rounded-lg bg-[#fafafa] p-4 text-[13px] leading-[1.45] outline -outline-offset-1 outline-border">
          {(
            [
              ["Date", detail.date],
              ["Contract", contractName(detail)],
              ["Company", detail.party],
              ["Type", EARNINGS_LABEL[detail.type] ?? detail.type],
              ["Amount", detail.amount],
              ["Status", detail.status.label],
              ["Reference", detail.desc],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="flex gap-4">
              <span className="w-[130px] shrink-0 text-ink-2">{k}</span>
              <span className="min-w-0 flex-1 text-ink">{v}</span>
            </div>
          ))}
        </dl>
      )}
    </Modal>
  );
}
