"use client";

import Image from "next/image";
import { useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { AddPayoutModal } from "@/components/independent/AddPayoutModal";
import { Button, Card, Chip, InfoBanner, Modal, Page, SearchBox, Select, StatusDot, Toast, useToast } from "@/components/independent/ui";
import { transactions } from "@/lib/independent/data";
import type { PayoutMethod } from "@/lib/independent/data";
import { useDemo } from "@/lib/independent/store";

const More = ICONS.moreV;
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

/** Figma table columns: Date 110 · Description flex · Counterparty 150 · Type 130 · Amount 110 · Status 120 · Actions 80. */
const COLS = ["w-[110px]", "min-w-0 flex-1", "w-[150px]", "w-[130px]", "w-[110px]", "w-[120px]", "w-[80px]"];

/** Figma "Wallet / Independent": DM Sans 24 header; balances; payout cards (190 tall, radius 16) with ⋮ menu; transactions table. */
export default function Wallet() {
  const { payouts, setDefaultPayout, removePayout, available, withdrawFunds } = useDemo();
  const [menu, setMenu] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<PayoutMethod | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [q, setQ] = useState("");
  const [toast, setToast] = useToast();
  const rows = transactions.filter((t) => `${t.desc} ${t.party}`.toLowerCase().includes(q.toLowerCase()));
  const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <Page title="Wallet">
      <div className="flex flex-col gap-6" onClick={() => setMenu(null)}>
        <div className="flex gap-4 whitespace-nowrap">
          {[
            [money(available), "Available to withdraw", available ? "from 1 released payment" : "withdrawn today"],
            ["$1,600.00", "Held in escrow", "Sales Manager trial · releases 30 Sep"],
            [money(6200 + (available ? 0 : 1400)), "Paid out, all time", `${available ? 5 : 6} payouts since June`],
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
            Trial and full-time payments are released to your default method at the end of each payment cycle. The ⋮ menu on each card opens Set as default, View payout history and Remove.
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
                  <button
                    type="button"
                    aria-label="Payout method actions"
                    aria-expanded={menu === m.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenu(menu === m.id ? null : m.id);
                    }}
                    className={`flex size-7 items-center justify-center rounded-full text-ink ${menu === m.id ? "bg-accent-bg" : ""}`}
                  >
                    <More size={18} aria-hidden />
                  </button>
                </div>
                <p className="text-[20px] leading-[1.3] font-semibold tracking-[1px] whitespace-pre text-ink">{`••••  ••••  ${m.last4}`}</p>
                <div className="flex items-end gap-4 text-[10px] leading-[1.3] font-semibold whitespace-nowrap">
                  <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="tracking-[0.8px] text-muted-2 uppercase">Account holder</span>
                    <span className="text-[13px] text-ink">{m.holder}</span>
                  </span>
                  <span className="flex flex-col items-end gap-[3px]">
                    <span className="tracking-[0.8px] text-muted-2 uppercase">Status</span>
                    <span className="flex items-center gap-1 text-[12px] text-ink">
                      <Verified size={14} aria-hidden className="text-ok" /> {m.verified}
                    </span>
                  </span>
                </div>
                {menu === m.id && (
                  <div
                    role="menu"
                    className="absolute top-12 right-5 z-10 flex w-[172px] flex-col rounded-lg rounded-tr-none border border-[#e3e6ea] bg-white py-1.5 text-[12.5px] leading-[1.3] whitespace-nowrap drop-shadow-[0_6px_9px_rgba(0,0,0,0.14)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button role="menuitem" type="button" disabled={m.isDefault} onClick={() => { setDefaultPayout(m.id); setMenu(null); setToast(`${m.brand} ····${m.last4} is now your default`); }} className="flex items-center gap-2.5 px-3.5 py-[9px] text-left hover:bg-surface-alt disabled:text-[#c3c3c3]">
                      <SetDefault size={18} aria-hidden /> Set as default
                    </button>
                    <button role="menuitem" type="button" onClick={() => { setMenu(null); setToast("Payout history opens below"); }} className="flex items-center gap-2.5 px-3.5 py-[9px] text-left hover:bg-surface-alt">
                      <History size={18} aria-hidden /> View payout history
                    </button>
                    <button role="menuitem" type="button" disabled={payouts.length === 1} onClick={() => { setRemoving(m); setMenu(null); }} className="flex items-center gap-2.5 px-3.5 py-[9px] text-left text-[#eb5757] hover:bg-surface-alt disabled:text-[#c3c3c3] disabled:[&_svg]:text-[#c3c3c3]">
                      <Trash size={18} aria-hidden className="text-[#c0392b]" /> Remove
                    </button>
                  </div>
                )}
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

        <div className="flex items-center gap-3">
          <SearchBox value={q} onChange={setQ} placeholder="Search by contract or reference" className="w-[340px]" />
          <Select options={["All types", "Released", "Escrow", "Payout"]} className="!w-[160px]" />
          <Select options={["Last 90 days", "Last 30 days", "All time"]} className="!w-[160px]" />
          <Button variant="primary" size="lg" className="ml-auto" disabled={!available} onClick={() => setWithdrawing(true)}>
            Withdraw {money(available)}
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg outline -outline-offset-1 outline-border">
          <div className="flex items-center gap-4 bg-surface-2 px-4 py-3 text-[13px] leading-[1.4] font-medium whitespace-nowrap text-ink-2">
            {["Date", "Description", "Counterparty", "Type", "Amount", "Status", "Actions"].map((h, i) => (
              <span key={h} className={COLS[i]}>
                {h}
              </span>
            ))}
          </div>
          {rows.map((t) => (
            <div key={t.date + t.desc} className="flex items-center gap-4 border-t border-border px-4 py-3 text-[13px] leading-[1.4] whitespace-nowrap text-ink">
              <span className={COLS[0]}>{t.date}</span>
              <span className={`${COLS[1]} truncate text-[14px]`}>{t.desc}</span>
              <span className={COLS[2]}>{t.party}</span>
              <span className={COLS[3]}>
                <Chip>{t.type}</Chip>
              </span>
              <span className={`${COLS[4]} text-[14px] font-medium`}>{t.amount}</span>
              <span className={COLS[5]}>
                <StatusDot tone={t.status.tone}>{t.status.label}</StatusDot>
              </span>
              <span className={COLS[6]}>
                <Button size="sm" onClick={() => setToast(`Receipt for ${t.desc}`)}>
                  View
                </Button>
              </span>
            </div>
          ))}
        </div>
      </div>

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
