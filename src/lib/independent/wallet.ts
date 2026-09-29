"use client";

import { useMemo } from "react";
import { dayStamp, today } from "@/lib/portal/dates";
import { usd } from "@/lib/demo/disputes";
import { persisted, useLive, useStored } from "@/lib/demo/live";
import type { LivePayment } from "@/lib/demo/live";
import { payoutMethods as seedPayouts, transactions as seedTransactions } from "./data";
import type { PayoutMethod, Transaction } from "./data";

/* The independent's wallet: the ledger, the balance it adds up to, and where payouts go. */

const payoutsStore = persisted("ind.payouts", seedPayouts);
/** Withdrawals made in this browser; they join the ledger like any other transaction. */
const withdrawalsStore = persisted<Transaction[]>("ind.withdrawals", []);

const amountOf = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;

/**
 * IN-051 / IN-052 / IN-053 — a payment recorded on the other side of the demo has to show up here
 * immediately, so the ledger is the seed plus whatever the shared store has collected since, newest
 * first. What's `available` is released payments minus what has been paid out: it used to be a stored
 * number that no transaction moved, so the balance and the ledger could disagree.
 */
function ledgerOf(payments: LivePayment[], withdrawals: Transaction[]) {
  const recorded: Transaction[] = [
    ...payments.map((p) =>
      // A dispute ruled for the Team Builder sends escrow back to them: on the contract's history
      // (IN-032), never in this balance.
      p.kind === "refunded"
        ? { date: p.date, at: p.at, desc: `Refunded to ${p.company} after a dispute ruling · ${p.title}`, party: p.company, type: "Payment Refunded" as const, contract: p.contract, contractTitle: p.title, amount: p.amount, status: { label: "Refunded", tone: "neutral" as const } }
        : { date: p.date, at: p.at, desc: `Payment released · ${p.title}`, party: p.company, type: "Payment Released" as const, contract: p.contract, contractTitle: p.title, amount: `+${p.amount}`, status: { label: "Available", tone: "ok" as const } },
    ),
    ...withdrawals,
    ...seedTransactions,
  ];
  const released = recorded.filter((t) => t.type === "Payment Released").reduce((n, t) => n + amountOf(t.amount), 0);
  const paidOut = recorded.filter((t) => t.type === "Payout").reduce((n, t) => n + amountOf(t.amount), 0);
  const available = Math.max(0, released - paidOut);

  // A released payment reads "Available" until a payout covers it, oldest first — it used to stay
  // Available after the money had been withdrawn.
  let covered = paidOut;
  const settled = new Set<Transaction>();
  for (const t of recorded.filter((x) => x.type === "Payment Released").sort((a, b) => a.at - b.at)) {
    const amount = amountOf(t.amount);
    if (covered >= amount - 0.001) settled.add(t);
    covered = Math.max(0, covered - amount);
  }
  const transactions = recorded.map((t) => (settled.has(t) ? { ...t, status: { label: "Paid out", tone: "neutral" as const } } : t));
  return { transactions, available };
}

const isVerified = (m: PayoutMethod) => m.verified.startsWith("Verified");

/**
 * The method as saved, which is what the toasts go by: only a verified method becomes the default,
 * so a new one, pending verification, leaves the default where it was whatever the tick said.
 */
function addPayout(m: PayoutMethod) {
  const saved = { ...m, isDefault: m.isDefault && isVerified(m) };
  payoutsStore.set((p) => (saved.isDefault ? p.map((x) => ({ ...x, isDefault: false })) : p).concat(saved));
  return saved;
}

/** Where the default goes when `id`, the default, is removed: the first other verified method, if any. */
export const heirOf = (payouts: PayoutMethod[], id: string) => payouts.find((x) => x.id !== id && isVerified(x));

/** Removing the default hands it on (heirOf), so Withdraw still has somewhere to send the money. */
const removePayout = (id: string) =>
  payoutsStore.set((p) => {
    const rest = p.filter((x) => x.id !== id);
    const heir = p.find((x) => x.id === id)?.isDefault ? heirOf(p, id) : undefined;
    return heir ? rest.map((x) => ({ ...x, isDefault: x.id === heir.id })) : rest;
  });
const setDefaultPayout = (id: string) => payoutsStore.set((p) => p.map((x) => ({ ...x, isDefault: x.id === id && isVerified(x) })));

/** A method as the settings list titles it: the bank and the account's last digits, or the e-wallet and its number. */
export function payoutTitle(m: PayoutMethod) {
  // New methods keep "BDO · InstaPay / PESONet" or "GCash · 0917 555 1234"; the seed's bank has no prefix, and is BPI.
  const [lead, rest] = m.detail.split(" · ");
  if (m.brand === "Bank") return `${rest ? lead : "BPI"} · account ending ${m.last4}`;
  return `${m.brand} · ${m.brand === "GCash" && rest ? rest : `····${m.last4}`}`;
}

export function useWallet() {
  const { payments } = useLive();
  const withdrawals = useStored(withdrawalsStore);
  const payouts = useStored(payoutsStore);
  const { transactions, available } = useMemo(() => ledgerOf(payments, withdrawals), [payments, withdrawals]);
  /** Everything available, to the default verified method. */
  const withdrawFunds = () => {
    const method = payouts.find((p) => p.isDefault && p.verified.startsWith("Verified"));
    if (available <= 0 || !method) return;
    withdrawalsStore.set((all) => [
      { date: today(), at: dayStamp(), desc: `Payout to ${method.brand} ····${method.last4}`, party: "—", type: "Payout" as const, amount: `−${usd(available)}`, status: { label: "Paid", tone: "ok" as const } },
      ...all,
    ]);
  };
  return { transactions, available, withdrawFunds, payouts, addPayout, removePayout, setDefaultPayout };
}
