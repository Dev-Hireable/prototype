"use client";

import { useMemo } from "react";
import { dayStamp, parseDay, today } from "@/lib/portal/dates";
import type { Deal } from "@/lib/demo/deal";
import { escrowOf, usd } from "@/lib/demo/disputes";
import { persisted, useLive, useStored } from "@/lib/demo/live";
import type { LivePayment } from "@/lib/demo/live";
import { payoutMethods as seedPayouts, transactions as seedTransactions } from "./data";
import type { PayoutMethod, Transaction } from "./data";
import { useIdVerification } from "./kyc";

/* The independent's wallet: the ledger, the balance it adds up to, and where payouts go. */

const payoutsStore = persisted("ind.payouts", seedPayouts);
/** Withdrawals made in this browser; they join the ledger like any other transaction. */
const withdrawalsStore = persisted<Transaction[]>("ind.withdrawals", []);

const amountOf = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;
/** To the cent, so a payout that uses a payment up leaves exactly nothing of it. */
const cents = (n: number) => Math.round(n * 100) / 100;

/** The ledger as it was recorded: the shared store's payments (newest first), the withdrawals, then the seed. */
function recordedOf(payments: LivePayment[], withdrawals: Transaction[]): Transaction[] {
  return [
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
}

/**
 * Rows oldest first, the order payouts use released payments up in. A row carries only its day and
 * the ledger keeps the newest first, so a day's own rows go in the reverse of the order they're kept:
 * the order they were recorded in. (By day alone, a day's stayed newest first, and a payout could be
 * put against the later of two payments that day.)
 */
const oldestFirst = (rows: Transaction[]) => rows.map((t, i) => ({ t, i })).sort((a, b) => a.t.at - b.t.at || b.i - a.i).map(({ t }) => t);

/** A released payment's status, from what's `left` of it to withdraw. */
function releaseStatus(amount: number, left: number): Transaction["status"] {
  if (left <= 0) return { label: "Paid out", tone: "neutral" };
  return left < amount ? { label: "Partly paid out", tone: "ok" } : { label: "Available", tone: "ok" };
}

/**
 * IN-051 / IN-052 / IN-053 — a payment recorded on the other side of the demo has to show up here
 * immediately, so the ledger is the seed plus whatever the shared store has collected since, newest
 * first. Payouts use up the oldest released payments first, and each payment says what's `left` of
 * it: Available, Partly paid out or Paid out. What's `available` is what's left on them all, so the
 * rows add up to the balance (a payout that took part of a payment used to leave all of it Available).
 */
function ledgerOf(payments: LivePayment[], withdrawals: Transaction[]) {
  const recorded = recordedOf(payments, withdrawals);
  let paidOut = recorded.filter((t) => t.type === "Payout").reduce((n, t) => n + amountOf(t.amount), 0);
  const left = new Map<Transaction, number>();
  for (const t of oldestFirst(recorded.filter((x) => x.type === "Payment Released"))) {
    const amount = amountOf(t.amount);
    const used = Math.min(amount, paidOut);
    paidOut = cents(paidOut - used);
    left.set(t, cents(amount - used));
  }
  const transactions = recorded.map((t) => {
    const l = left.get(t);
    return l === undefined ? t : { ...t, left: l, status: releaseStatus(amountOf(t.amount), l) };
  });
  return { transactions, available: cents([...left.values()].reduce((n, l) => n + l, 0)) };
}

/**
 * IN-052 — the trial's escrow as Earnings lists it: deposited the day the offer went out with it,
 * Held while any of it is still in escrow (what's `left`), then Released, or Refunded if all of it
 * went back to the company. A direct hire had no escrow, so it has no row.
 */
export function escrowRow(deal: Deal | null): Transaction | null {
  const escrow = escrowOf(deal, []);
  if (!deal?.contract || !escrow) return null;
  const funded = parseDay(escrow.funded);
  const refunded = escrow.total > 0 && escrow.refunded >= escrow.total;
  const status: Transaction["status"] = escrow.held > 0 ? { label: "Held", tone: "warn" } : refunded ? { label: "Refunded", tone: "neutral" } : { label: "Released", tone: "neutral" };
  return { date: escrow.funded, at: funded ? dayStamp(funded) : 0, desc: `Escrow deposit · ${deal.title}`, party: deal.company, type: "Payment Deposited", contract: deal.roleSlug, contractTitle: deal.title, amount: usd(escrow.total), status, left: escrow.held };
}

const isVerified = (m: PayoutMethod) => m.verified.startsWith("Verified");

/** Why nothing can be withdrawn right now, or undefined when it can: something available, the ID check (KYC) done, and a verified method to send it to. */
function withdrawBlocker(available: number, payouts: readonly PayoutMethod[], idVerified: boolean): string | undefined {
  if (available <= 0) return "Nothing is available to withdraw yet.";
  if (!idVerified) return "Verify your ID to withdraw.";
  return payouts.some(isVerified) ? undefined : "No verified payout method to send it to yet.";
}

/** Why `raw` can't be withdrawn out of `available`, or undefined when it can: dollars and cents, above $0, no more than there is. */
export function withdrawalProblem(raw: string, available: number): string | undefined {
  const s = raw.trim().replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return "Enter an amount in dollars, like 1,600.00.";
  const n = Number(s);
  if (n <= 0) return "Enter an amount above $0.";
  return n > available + 0.005 ? `You can withdraw up to ${usd(available)}.` : undefined;
}

/**
 * The method as saved, which is what the toasts go by: only a verified method becomes the default,
 * so a new one, pending verification, leaves the default where it was whatever the tick said.
 */
function addPayout(m: PayoutMethod) {
  const saved = { ...m, isDefault: m.isDefault && isVerified(m) };
  payoutsStore.set((p) => (saved.isDefault ? p.map((x) => ({ ...x, isDefault: false })) : p).concat(saved));
  return saved;
}

/**
 * Why `m` can't be removed, or undefined when it can. One rule for Earnings and Settings: never the
 * only method, and never the default, which another method takes over first.
 */
export function removeBlocker(m: PayoutMethod, count: number): string | undefined {
  if (count === 1) return "Your only payout method can't be removed. Add another first.";
  return m.isDefault ? "Set another method as default to remove this one." : undefined;
}

/** Only a method that isn't the default is removed (removeBlocker), so the default stays where it is. */
const removePayout = (id: string) => payoutsStore.set((p) => p.filter((x) => x.id !== id));
const setDefaultPayout = (id: string) => payoutsStore.set((p) => p.map((x) => ({ ...x, isDefault: x.id === id && isVerified(x) })));

/** A new account starts with no payout method: one is asked for before its first proposal. */
export const clearPayouts = () => payoutsStore.set([]);

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
  const { verified } = useIdVerification();
  const { transactions, available } = useMemo(() => ledgerOf(payments, withdrawals), [payments, withdrawals]);
  /** Why Withdraw is off right now (withdrawBlocker), or undefined while it's on. */
  const withdrawOff = withdrawBlocker(available, payouts, verified);
  /** A withdrawal, made by hand: `amount` of what's available, to the verified method `id`. Nothing goes while withdrawing is off, or past what's available. */
  const withdrawFunds = (id: string, amount: number) => {
    const method = payouts.find((p) => p.id === id && isVerified(p));
    if (withdrawOff || !method || !(amount > 0) || amount > available + 0.005) return;
    withdrawalsStore.set((all) => [
      { date: today(), at: dayStamp(), desc: `Payout to ${method.brand} ····${method.last4}`, party: "—", type: "Payout" as const, amount: `−${usd(amount)}`, status: { label: "Paid", tone: "ok" as const } },
      ...all,
    ]);
  };
  return { transactions, available, withdrawOff, withdrawFunds, payouts, addPayout, removePayout, setDefaultPayout };
}
