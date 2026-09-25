"use client";

import Image from "next/image";
import { useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { AddPayoutModal } from "@/components/independent/AddPayoutModal";
import { Button, Card, Chip, EmptyState, InfoBanner, KebabMenu, LinkButton, Modal, Page, SearchBox, Select, StatusDot, Toast, useToast } from "@/components/independent/ui";
import { MenuAction } from "@/components/portal/controls";
import { useDeal } from "@/lib/demo/deal";
import { escrowOf, useDisputes } from "@/lib/demo/disputes";
import { PAIR } from "@/lib/demo/live";
import { EARNINGS_LABEL, EARNINGS_TYPES } from "@/lib/independent/data";
import type { PayoutMethod, Transaction } from "@/lib/independent/data";
import { useDemo } from "@/lib/independent/store";

const Verified = ICONS.checkCircle;
const Check = ICONS.check;
const Add = ICONS.add;
const SetDefault = ICONS.checkCircleOutline;
const History = ICONS.history;
const Trash = ICONS.trash;

/** Figma "payout cards": brand wordmarks are 26 tall — Maya 90 wide, GCash 110. Bank has no mark. */
const BRAND: Partial<Record<PayoutMethod["brand"], { src: string; w: number; cls: string }>> = {
  Maya: { src: "/brands/maya.png", w: 90, cls: "h-[26px] w-[90px]" },
  GCash: { src: "/brands/gcash.png", w: 110, cls: "h-[26px] w-[110px]" },
};

/** Figma table columns: Date 110 · Contract flex · Company 150 · Type 150 · Amount 110 · Status 120 · Actions 80. */
const COLS = ["w-[110px]", "min-w-0 flex-1", "w-[150px]", "w-[150px]", "w-[110px]", "w-[120px]", "w-[80px]"];
/** IN-078 date ranges, measured from the newest row rather than the wall clock. */
const RANGES = { "All time": Infinity, "Last 30 days": 30, "Last 90 days": 90 } as const;
/** A screenful of rows; the pager hides itself when everything fits. */
const PER_PAGE = 8;
const daysBetween = (a: number, b: number) => {
  const d = (n: number) => new Date(Math.floor(n / 10000), (Math.floor(n / 100) % 100) - 1, n % 100).getTime();
  return Math.round((d(a) - d(b)) / 86400000);
};
/** The seed carries formatted strings, and the summary has to add them up. */
const amountOf = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;

/** Figma "Wallet / Independent": DM Sans 24 header; balances; payout cards (190 tall, radius 16) with ⋮ menu; transactions table. */
export default function Wallet() {
  const { payouts, setDefaultPayout, removePayout, available, withdrawFunds, transactions, contracts } = useDemo();
  /** Every dispute the independent is a party to — their own and the ones filed against them. */
  const allDisputes = useDisputes();
  const disputes = allDisputes.filter((d) => d.independent.slug === PAIR.independent.slug);
  /** The live trial's escrow, as its contract tab shows it — the ledger has no row for a deposit. */
  const liveEscrow = escrowOf(useDeal(), allDisputes);
  const pendingDisputes = disputes.filter((d) => d.status === "Pending").length;
  const [menu, setMenu] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<PayoutMethod | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [q, setQ] = useState("");
  const [type, setType] = useState("All types");
  /** IN-078 — contract and date range filter alongside the type, and they combine. */
  const [contract, setContract] = useState("All contracts");
  const [range, setRange] = useState<keyof typeof RANGES>("All time");
  const [page, setPage] = useState(1);
  /** IN-054 — one transaction, read-only. */
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [toast, setToast] = useToast();
  const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  /** IN-053 — newest first, before anything is filtered out of it. */
  const all = [...transactions].sort((a, b) => b.at - a.at);
  const newest = Math.max(...all.map((t) => t.at), 0);
  /** The contract a row belongs to, by the title it was recorded with — it looked names up in an empty seed, so every row said "—". */
  const contractName = (t: (typeof all)[number]) => t.contractTitle ?? contracts.find((c) => c.slug === t.contract)?.title ?? "—";
  const contractOptions = ["All contracts", ...new Set(all.map(contractName).filter((n) => n !== "—"))];
  // IN-078: the filters combine, and each one used to be decorative — the list never changed.
  const rows = all.filter(
    (t) =>
      (type === "All types" || EARNINGS_LABEL[t.type] === type) &&
      (contract === "All contracts" || contractName(t) === contract) &&
      daysBetween(newest, t.at) <= RANGES[range] &&
      `${contractName(t)} ${t.desc} ${t.party}`.toLowerCase().includes(q.trim().toLowerCase()),
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
  /** IN-052 — every figure is added up from the ledger, so a recorded payment moves it at once. */
  const received = all.filter((t) => t.type === "Payment Released").reduce((n, t) => n + amountOf(t.amount), 0);
  const heldRows = all.filter((t) => t.type === "Payment Deposited" && t.status.label === "Held");
  const held = heldRows.reduce((n, t) => n + amountOf(t.amount), 0) + (liveEscrow?.held ?? 0);
  const heldTrials = heldRows.length + ((liveEscrow?.held ?? 0) > 0 ? 1 : 0);
  const withdrawn = all.filter((t) => t.type === "Payout").reduce((n, t) => n + amountOf(t.amount), 0);
  const defaultPayout = payouts.find((p) => p.isDefault);
  const canWithdraw = available > 0 && !!defaultPayout?.verified.startsWith("Verified");
  const releases = all.filter((t) => t.type === "Payment Released");
  const payingContracts = new Set(releases.map((t) => t.contract)).size;

  return (
    <Page title="Earnings">
      <div className="flex flex-col gap-6" onClick={() => setMenu(null)}>
        <div className="flex gap-4 whitespace-nowrap">
          {[
            [money(received), "Received, all time", `${releases.length} ${releases.length === 1 ? "payment" : "payments"} received from ${payingContracts} ${payingContracts === 1 ? "contract" : "contracts"}`],
            [money(available), "Available to withdraw", available ? "released and not yet withdrawn" : received ? "withdrawn already" : "nothing released yet"],
            [money(held), "Held in escrow", `${heldTrials} ${heldTrials === 1 ? "trial" : "trials"} funded and not yet released`],
            [money(withdrawn), "Withdrawn to payout method", `${all.filter((t) => t.type === "Payout").length === 1 ? "one payout" : `${all.filter((t) => t.type === "Payout").length} payouts`} so far`],
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

        <Card className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
              Payout methods
            </h2>
            <Button variant="primary" size="lg" onClick={() => setAdding(true)}>
              Add payout method
            </Button>
          </div>
          <p className="text-[13px] leading-[1.4] text-ink-2">
            Trial, full-time and part-time payments are released to your default method at the end of each payment cycle. The ⋮ menu on each card opens Set as default, View payout history and Remove.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-3.5">
            {payouts.map((m) => (
              <div
                key={m.id}
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
                  {BRAND[m.brand] ? (
                    <Image src={BRAND[m.brand]!.src} alt={m.brand} width={BRAND[m.brand]!.w} height={26} className={`${BRAND[m.brand]!.cls} object-contain`} />
                  ) : (
                    <span className="h-[26px] text-[20px] leading-[26px] font-bold text-ink">Bank</span>
                  )}
                  <span className="flex-1" />
                  <KebabMenu label="Payout method actions" open={menu === m.id} onOpenChange={(open) => setMenu(open ? m.id : null)} buttonClassName="!size-7">
                    <MenuAction disabled={m.isDefault || !m.verified.startsWith("Verified")} onClick={() => { setDefaultPayout(m.id); setMenu(null); setToast(`${m.brand} ····${m.last4} is now your default`); }} icon={<SetDefault size={18} aria-hidden />}>
                      Set as default
                    </MenuAction>
                    <MenuAction onClick={() => { setMenu(null); setToast("Payout history opens below"); }} icon={<History size={18} aria-hidden />}>
                      View payout history
                    </MenuAction>
                    <MenuAction destructive disabled={payouts.length === 1} onClick={() => { setRemoving(m); setMenu(null); }} icon={<Trash size={18} aria-hidden />}>
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
                    <span className={`flex items-center gap-1 text-[12px] ${m.verified.startsWith("Verified") ? "text-ink" : "text-warn"}`}>
                      {m.verified.startsWith("Verified") && <Verified size={14} aria-hidden className="text-ok" />} {m.verified}
                    </span>
                  </span>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setAdding(true)}
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

        {/* IN-078 — contract, type and date range, combinable, with the active ones spelled out. */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <SearchBox value={q} onChange={setQ} placeholder="Search by contract or company" className="w-[280px]" />
            <Select options={contractOptions} value={contractOptions.includes(contract) ? contract : "All contracts"} onChange={(e) => { setContract(e.target.value); setPage(1); }} className="!w-[230px]" />
            <Select options={["All types", ...EARNINGS_TYPES]} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="!w-[190px]" />
            <Select options={Object.keys(RANGES)} value={range} onChange={(e) => { setRange(e.target.value as keyof typeof RANGES); setPage(1); }} className="!w-[160px]" />
            <Button variant="primary" size="lg" className="ml-auto" disabled={!canWithdraw} onClick={() => setWithdrawing(true)}>
              Withdraw {money(available)}
            </Button>
          </div>
          {filtering && (
            <div className="flex flex-wrap items-center gap-2 text-[13px] leading-[1.4] text-ink-2">
              <span>
                Showing {rows.length} of {all.length === 1 ? "1 transaction" : `${all.length} transactions`}
              </span>
              {q.trim() && <Chip>Search: {q.trim()}</Chip>}
              {contract !== "All contracts" && <Chip>{contract}</Chip>}
              {type !== "All types" && <Chip>{type}</Chip>}
              {range !== "All time" && <Chip>{range}</Chip>}
              <Button size="sm" onClick={clearAll}>
                Clear filters
              </Button>
            </div>
          )}
        </div>

        {/* IN-053 — every row across every contract, newest first, paginated. */}
        {all.length === 0 ? (
          <EmptyState title="No transactions yet" body="Escrow deposits, released payments and withdrawals appear here as soon as a contract starts." />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No transactions match"
            body="Try a different contract, type or date range."
            action={
              <Button size="lg" variant="primary" onClick={clearAll}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-lg outline -outline-offset-1 outline-border">
              <div className="flex items-center gap-4 bg-surface-2 px-4 py-3 text-[13px] leading-[1.4] font-medium whitespace-nowrap text-ink-2">
                {["Date", "Contract", "Company", "Type", "Amount", "Status", "Actions"].map((h, i) => (
                  <span key={h} className={COLS[i]}>
                    {h}
                  </span>
                ))}
              </div>
              {/* Date + description repeat when two payments land on one contract the same day (a
                  dispute release, then End Contract), so the amount and position go in the key too. */}
              {shown.map((t, i) => (
                <div key={`${i}-${t.date}-${t.desc}-${t.amount}`} className="flex items-center gap-4 border-t border-border px-4 py-3 text-[13px] leading-[1.4] whitespace-nowrap text-ink">
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
                    <Button size="sm" onClick={() => setDetail(t)}>
                      View
                    </Button>
                  </span>
                </div>
              ))}
            </div>
            {pages > 1 && (
              <div className="flex items-center justify-end gap-2">
                <Button size="sm" disabled={current === 1} onClick={() => setPage(current - 1)}>
                  Previous
                </Button>
                <span className="text-[13px] leading-[1.4] text-ink-2">
                  Page {current} of {pages}
                </span>
                <Button size="sm" disabled={current === pages} onClick={() => setPage(current + 1)}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* IN-059 / IN-080 — filed disputes have their own page; this is the pointer to it. */}
        {disputes.length > 0 && (
          <p className="text-[13px] leading-[1.4] text-ink-2">
            {pendingDisputes > 0 ? `${pendingDisputes} ${pendingDisputes === 1 ? "dispute is" : "disputes are"} under review. ` : ""}
            <LinkButton size="sm" href="/independent/wallet/disputes">
              View disputes
            </LinkButton>
          </p>
        )}
      </div>

      {/* IN-054 — date, contract, company, type, amount and status. Nothing here is editable. */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Transaction"
        description={detail ? `${detail.date} · ${EARNINGS_LABEL[detail.type] ?? detail.type}` : undefined}
        footer={
          <>
            <Button size="lg" onClick={() => setToast("Receipt downloaded")}>
              Download receipt
            </Button>
            <Button size="lg" variant="primary" onClick={() => setDetail(null)}>
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

      <AddPayoutModal open={adding} onClose={() => setAdding(false)} onAdded={(m) => setToast(`${m.brand} ····${m.last4} added${m.isDefault ? " and set as default" : ""}`)} />
      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        tone="danger"
        title={`Remove ${removing?.brand} ····${removing?.last4}?`}
        description={removing?.isDefault ? "This is your default method. Your next payout goes to the remaining method instead." : "Payouts already scheduled to this method complete; nothing new is sent here."}
        footer={
          <>
            <Button size="lg" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button size="lg" variant="danger" onClick={() => { if (removing) removePayout(removing.id); setRemoving(null); setToast("Payout method removed"); }}>
              Remove
            </Button>
          </>
        }
      />
      <Modal
        open={withdrawing}
        onClose={() => setWithdrawing(false)}
        title={`Withdraw ${money(available)}?`}
        description={`Sent to your default method (${payouts.find((p) => p.isDefault)?.brand ?? "—"} ····${payouts.find((p) => p.isDefault)?.last4 ?? ""}). Usually lands within one working day.`}
        footer={
          <>
            <Button size="lg" onClick={() => setWithdrawing(false)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" onClick={() => { withdrawFunds(); setWithdrawing(false); setToast(`${money(available)} on its way`); }}>
              Withdraw
            </Button>
          </>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
