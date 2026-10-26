"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { AddPayoutModal } from "@/components/independent/add-payout-modal";
import { Button, Card, Chip, EmptyState, Field, InfoBanner, Input, KebabMenu, LinkButton, Modal, Page, Row, SearchBox, Select, StatusDot, Table, Toast } from "@/components/portal/ui";
import { LEDGER_COLS as COLS, PHONE_FILTER_ROW } from "@/components/portal/styles";
import { MenuAction } from "@/components/portal/controls";
import { FactsBox } from "@/components/portal/facts-box";
import { useDeal } from "@/lib/demo/deal";
import { useDisputes, type Dispute } from "@/lib/demo/disputes";
import { PAIR } from "@/lib/demo/live";
import { EARNINGS_LABEL, EARNINGS_TYPES } from "@/lib/independent/data";
import type { PayoutMethod, Transaction } from "@/lib/independent/data";
import { escrowRow, payoutTitle, removeBlocker, useWallet, withdrawalProblem } from "@/lib/independent/wallet";
import { useIndependentContracts } from "@/lib/independent/contracts";
import { keyed } from "@/lib/portal/keys";
import { useToast } from "@/lib/portal/toast";

const Verified = ICONS.checkCircle;
const Check = ICONS.check;
const SetDefault = ICONS.checkCircleOutline;
const History = ICONS.history;
const Trash = ICONS.trash;

/** The payout cards' brand wordmarks. Bank has no mark. */
const BRAND: Partial<Record<PayoutMethod["brand"], { src: string; w: number; cls: string }>> = {
  Maya: { src: "/brands/maya.png", w: 90, cls: "h-[26px] w-[90px]" },
  GCash: { src: "/brands/gcash.png", w: 110, cls: "h-[26px] w-[110px]" },
};

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
/** The balance card that holds Withdraw on a phone. */
const AVAILABLE = "Available to withdraw";

type ContractName = (t: Transaction) => string;

export default function Wallet() {
  const { payouts, setDefaultPayout, removePayout, available, withdrawOff, withdrawFunds, transactions } = useWallet();
  const allDisputes = useDisputes();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<PayoutMethod | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  /** IN-054 — one transaction, read-only. */
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [toast, setToast] = useToast();
  const { all, contractName, filters } = useLedger(transactions);
  const withdraw = () => setWithdrawing(true);

  return (
    <Page title="Earnings">
      <div className="flex flex-col gap-6">
        {/* A phone has Withdraw in the Available card; wider screens have it over the ledger. */}
        <Balances all={all} available={available} withdraw={<CardWithdraw off={withdrawOff} available={available} onClick={withdraw} />} />

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
          <WithdrawButton off={withdrawOff} onClick={withdraw} className="ml-auto max-md:hidden" />
        </FilterBar>

        <TransactionList all={all} filters={filters} contractName={contractName} onView={setDetail} />

        {/* IN-059 / IN-080 — filed disputes have their own page; this is the pointer to it. */}
        <DisputesNote all={allDisputes} />
      </div>

      <TransactionDetail detail={detail} contractName={contractName} onClose={() => setDetail(null)} onReceipt={() => setToast("Receipt downloaded")} />

      <AddPayoutModal open={adding} onClose={() => setAdding(false)} onAdded={(m) => setToast(`${m.brand} ····${m.last4} added${m.isDefault ? " and set as default" : ""}`)} />
      <RemoveMethod method={removing} onClose={() => setRemoving(null)} onRemove={() => { if (removing) removePayout(removing.id); setRemoving(null); setToast("Payout method removed"); }} />
      {/* Mounted as it opens, so each time it starts on the default method and all that's available. */}
      {withdrawing && (
        <WithdrawDialog
          available={available}
          methods={payouts.filter((m) => m.verified.startsWith("Verified"))}
          onClose={() => setWithdrawing(false)}
          onWithdraw={(to, amount) => { withdrawFunds(to.id, amount); setWithdrawing(false); setToast(`${money(amount)} on its way to ${to.brand} ····${to.last4}`); }}
        />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** The rows the page lists, the contract each one belongs to, and the filters over them. */
function useLedger(transactions: Transaction[]) {
  const { contracts } = useIndependentContracts();
  /** The live trial's escrow, a row of its own: Held until it's paid out, so the Held in escrow total has a row behind it. */
  const deposit = escrowRow(useDeal());
  /** IN-053 — newest first, before anything is filtered out of it. */
  const all = (deposit ? [deposit, ...transactions] : [...transactions]).sort((a, b) => b.at - a.at);
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

/** Removing a payout method, never the default (removeBlocker): a payout already on its way to it still arrives. */
function RemoveMethod({ method, onClose, onRemove }: { method: PayoutMethod | null; onClose: () => void; onRemove: () => void }) {
  return (
    <Modal
      open={!!method}
      onClose={onClose}
      tone="danger"
      title={`Remove ${method?.brand} ····${method?.last4}?`}
      description="Payouts already on the way to this account will still arrive. No new payouts will be sent here."
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

/**
 * Withdrawing by hand: which verified method it goes to (the default to start with) and how much (all
 * that's available to start with, never more).
 */
function WithdrawDialog({ available, methods, onClose, onWithdraw }: { available: number; methods: PayoutMethod[]; onClose: () => void; onWithdraw: (to: PayoutMethod, amount: number) => void }) {
  const [to, setTo] = useState<PayoutMethod | undefined>(() => methods.find((m) => m.isDefault) ?? methods[0]);
  const [amount, setAmount] = useState(() => available.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const problem = withdrawalProblem(amount, available);
  return (
    <Modal
      open
      onClose={onClose}
      title="Withdraw"
      description={`${money(available)} is available. Payouts usually arrive within one working day.`}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" disabled={!!problem || !to} title={problem} onClick={() => to && onWithdraw(to, amountOf(amount))}>
            Withdraw
          </Button>
        </>
      }
    >
      <Field label="Payout method">
        <Select options={methods.map(payoutTitle)} value={to ? payoutTitle(to) : ""} onChange={(e) => setTo(methods.find((m) => payoutTitle(m) === e.target.value))} />
      </Field>
      <Field label="Amount (USD)" required error={problem}>
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" required />
      </Field>
    </Modal>
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

/**
 * Earnings' one action: off, with why as its tip, until something is available, the ID is verified
 * and a verified method can take it. The span is the Earnings tour's anchor (@/lib/portal/tours):
 * Button takes no extra props. There are two, one for a phone and one for wider screens, and the
 * tour points at whichever is on screen.
 */
function WithdrawButton({ off, onClick, className = "", full = false }: { off: string | undefined; onClick: () => void; className?: string; full?: boolean }) {
  return (
    <span data-tour="withdraw" className={className}>
      <Button variant="primary" size="lg" disabled={!!off} title={off} onClick={onClick} className={full ? "w-full" : ""}>
        Withdraw
      </Button>
    </span>
  );
}

/**
 * Withdraw where a phone has it, in the Available card, full width under the thumb, with the reason
 * it's off written under it: a finger can't hover for the tip. With nothing available the card's own
 * figure and line already say why, so there's no line then.
 */
function CardWithdraw({ off, available, onClick }: { off: string | undefined; available: number; onClick: () => void }) {
  return (
    <div className="mt-3 flex flex-col gap-1.5 md:hidden">
      <WithdrawButton off={off} onClick={onClick} className="flex" full />
      {off && available > 0 && <p className="text-[12px] leading-[1.4] text-ink-2">{off}</p>}
    </div>
  );
}

/**
 * IN-052 — every figure is added up from the ledger, so a recorded payment moves it at once. `withdraw`
 * goes in the Available card, which a phone puts first and across the full width, as the one to act on.
 */
function Balances({ all, available, withdraw }: { all: Transaction[]; available: number; withdraw: ReactNode }) {
  const received = all.filter((t) => t.type === "Payment Released").reduce((n, t) => n + amountOf(t.amount), 0);
  // What's still in escrow is what's left on the deposit rows: a split or a refund takes part of one.
  const heldRows = all.filter((t) => t.type === "Payment Deposited" && (t.left ?? 0) > 0);
  const held = heldRows.reduce((n, t) => n + (t.left ?? 0), 0);
  const heldTrials = heldRows.length;
  const withdrawals = all.filter((t) => t.type === "Payout");
  const withdrawn = withdrawals.reduce((n, t) => n + amountOf(t.amount), 0);
  const releases = all.filter((t) => t.type === "Payment Released");
  const payingContracts = new Set(releases.map((t) => t.contract)).size;
  return (
    // Side by side; a tablet or a phone wraps them two to a row, the odd one out across the full width.
    <div data-tour="earnings-totals" className="flex gap-4 whitespace-nowrap max-lg:flex-wrap max-lg:gap-3 max-lg:whitespace-normal">
      {[
        [money(received), "Received, all time", `${releases.length} ${releases.length === 1 ? "payment" : "payments"} received from ${payingContracts} ${payingContracts === 1 ? "contract" : "contracts"}`],
        [money(available), AVAILABLE, available ? "released and not yet withdrawn" : received ? "withdrawn already" : "nothing released yet"],
        [money(held), "Held in escrow", `${heldTrials} ${heldTrials === 1 ? "trial" : "trials"} funded and not yet released`],
        [money(withdrawn), "Withdrawn to payout method", `${withdrawals.length === 1 ? "one payout" : `${withdrawals.length} payouts`} so far`],
      ].map(([v, l, s]) => (
        <Card key={l} className={`flex min-w-0 flex-1 flex-col gap-0.5 p-4 max-lg:basis-[150px] ${l === AVAILABLE ? "max-md:order-first max-md:basis-full" : ""}`}>
          <p className="font-display text-[22px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
            {v}
          </p>
          <p className="text-[13px] leading-[1.4] font-medium text-ink-2">{l}</p>
          <p className="text-[12px] leading-[1.4] text-ink-2">{s}</p>
          {l === AVAILABLE && withdraw}
        </Card>
      ))}
    </div>
  );
}

/** The payout cards, each with its ⋮ menu, under the one Add payout method; wrapped as the Earnings tour's anchor (Card takes no extra props). */
function PayoutMethods({ payouts, onAdd, onSetDefault, onHistory, onRemove }: { payouts: PayoutMethod[]; onAdd: () => void; onSetDefault: (m: PayoutMethod) => void; onHistory: () => void; onRemove: (m: PayoutMethod) => void }) {
  const [menu, setMenu] = useState<string | null>(null);
  return (
    <div data-tour="payout-methods">
      <Card
        title="Payout methods"
        sub="Released pay waits in your balance until you withdraw it to a verified payout method."
        aside={
          <Button variant="primary" size="lg" onClick={onAdd}>
            Add payout method
          </Button>
        }
        className="flex flex-col gap-4 p-6"
      >
        {payouts.length === 0 ? (
          <EmptyState title="No payout method yet" body="You'll be asked for one before your first proposal." />
        ) : (
          <div className="grid grid-cols-3 gap-4 pt-3.5 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {payouts.map((m) => (
              <PayoutCard
                key={m.id}
                method={m}
                open={menu === m.id}
                onOpenChange={(open) => setMenu(open ? m.id : null)}
                removeOff={removeBlocker(m, payouts.length)}
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
          </div>
        )}
        <InfoBanner>Payouts usually arrive within one working day.</InfoBanner>
      </Card>
    </div>
  );
}

/**
 * One payout method: its brand, the last four digits, who holds it and whether it's verified.
 * `removeOff` says why Remove is off (removeBlocker). A phone stacks the cards one under another, so
 * there each is only as tall as its lines rather than a fixed card shape.
 */
function PayoutCard({ method: m, open, onOpenChange, removeOff, onSetDefault, onHistory, onRemove }: { method: PayoutMethod; open: boolean; onOpenChange: (open: boolean) => void; removeOff: string | undefined; onSetDefault: () => void; onHistory: () => void; onRemove: () => void }) {
  const brand = BRAND[m.brand];
  const verified = m.verified.startsWith("Verified");
  return (
    <div
      className={`relative flex h-[190px] flex-col justify-between rounded-2xl p-5 drop-shadow-[0_6px_8px_rgba(26,31,46,0.08)] max-md:h-auto max-md:gap-3 ${m.isDefault ? "border-2 border-ok" : "border border-[#e3e6ea]"}`}
      style={{ backgroundImage: "linear-gradient(151.55deg, #ffffff 0%, #f2f4f7 71.429%)" }}
    >
      {m.isDefault && (
        <span className="absolute bottom-full left-5 flex items-center gap-[5px] rounded-t-lg bg-ok pt-[5px] pr-[11px] pb-1 pl-[9px] text-[9.5px] leading-[1.2] font-semibold tracking-[0.57px] text-white">
          <span className="flex size-3.5 items-center justify-center rounded-[7px] bg-white text-ok">
            <Check size={10} aria-hidden />
          </span>
          DEFAULT
        </span>
      )}
      <div className="flex items-center gap-2">
        {brand ? <Image src={brand.src} alt={m.brand} width={brand.w} height={26} className={`${brand.cls} object-contain`} loading="eager" /> : <span className="h-[26px] text-[20px] leading-[26px] font-bold text-ink">Bank</span>}
        <span className="flex-1" />
        <KebabMenu label="Payout method actions" open={open} onOpenChange={onOpenChange} buttonClassName="!size-7">
          <MenuAction disabled={m.isDefault || !verified} title={m.isDefault ? "This is already your default." : verified ? undefined : "It can be your default once it's verified."} onClick={onSetDefault} icon={<SetDefault size={18} aria-hidden />}>
            Set as default
          </MenuAction>
          <MenuAction onClick={onHistory} icon={<History size={18} aria-hidden />}>
            View payout history
          </MenuAction>
          <MenuAction destructive disabled={!!removeOff} title={removeOff} onClick={onRemove} icon={<Trash size={18} aria-hidden />}>
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
          <span className={`flex items-center gap-1 text-[12px] ${verified ? "text-ink" : "text-warn-ink"}`}>
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
      <div className={`flex flex-wrap items-center gap-3 ${PHONE_FILTER_ROW}`}>
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
  if (all.length === 0) return <EmptyState title="No transactions yet" body="Transactions will appear here once activity is recorded for a contract." />;
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
    <Table cols={COLS} head={["Date", "Contract", "Company", "Type", "Amount", "Status", "Actions"]}>
      {/* Date + description repeat when two payments land on one contract the same day (a
          dispute release, then End Contract): keyed() numbers exact repeats. */}
      {keyed(rows, (t) => `${t.date}-${t.desc}-${t.amount}`).map(({ item: t, key }) => (
        <LedgerRow key={key} t={t} contract={contractName(t)} onView={() => onView(t)} />
      ))}
    </Table>
  );
}

/**
 * One row of the ledger. A withdrawal has no contract or company: the table keeps a "—" in both
 * columns, while a phone's card, which has no columns to keep, names it by what it was ("Payout to
 * Maya ····4471") and leaves the company out.
 */
function LedgerRow({ t, contract, onView }: { t: Transaction; contract: string; onView: () => void }) {
  const what = contract === "—" ? (
    <>
      <span className="max-md:hidden">—</span>
      <span className="md:hidden">{t.desc}</span>
    </>
  ) : (
    contract
  );
  return (
    <Row>
      <span className={COLS[0]}>{t.date}</span>
      <span className={`${COLS[1]} truncate text-[14px]`}>{what}</span>
      <span className={`${COLS[2]} ${t.party === "—" ? "max-md:hidden" : ""}`}>{t.party}</span>
      <span className={COLS[3]}>
        <Chip>{EARNINGS_LABEL[t.type] ?? t.type}</Chip>
      </span>
      <span className={`${COLS[4]} text-[14px] font-medium`}>{t.amount}</span>
      <span className={COLS[5]}>
        <StatusDot tone={t.status.tone}>{t.status.label}</StatusDot>
      </span>
      <span className={COLS[6]}>
        <Button size="sm" onClick={onView}>
          View
        </Button>
      </span>
    </Row>
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
      {detail && <FactsBox rows={detailRows(detail, contractName)} columns />}
    </Modal>
  );
}

/** A row's lines in its detail, with what's still open on it when that's only part of it: a payment partly withdrawn, or escrow partly paid out. */
function detailRows(t: Transaction, contractName: ContractName): [string, string][] {
  const left = t.left ?? 0;
  const part: [string, string][] = left > 0 && left < amountOf(t.amount) ? [[t.type === "Payment Deposited" ? "Still in escrow" : "Still to withdraw", money(left)]] : [];
  return [["Date", t.date], ["Contract", contractName(t)], ["Company", t.party], ["Type", EARNINGS_LABEL[t.type] ?? t.type], ["Amount", t.amount], ["Status", t.status.label], ...part, ["Reference", t.desc]];
}
