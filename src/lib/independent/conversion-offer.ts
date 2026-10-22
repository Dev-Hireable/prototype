import type { ReactNode } from "react";
import { hoursLabel, JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import { lifecycleOfDeal, type ConversionOffer, type Deal } from "@/lib/demo/deal";
import { escrowOf, usd, type Dispute } from "@/lib/demo/disputes";
import { formatDate, fromISODate } from "@/lib/portal/dates";
import type { Contract } from "./data";

/** A post-trial offer's start (yyyy-mm-dd) as the offer reads it: "Mon 28 Sep 2026". */
export const offerDay = (iso: string) => {
  const d = fromISODate(iso);
  return d ? formatDate(d) : iso;
};

/** IN-084 — the offer's terms, a row each: the role, its pay (and a part-time role's hours), and how it's paid and reviewed. */
export function conversionRows(offer: ConversionOffer, contract: Pick<Contract, "title">): [string, ReactNode][] {
  return [
    ["Role", contract.title],
    ["Contract type", JOB_TYPE_LABEL[offer.type]],
    ["Start date", offerDay(offer.start)],
    // "Pay" on every type of contract; the value carries its unit.
    ["Pay", `${offer.salary} /month`],
    ...(offer.type === "part-time" ? ([["Hours", hoursLabel(offer.hours)]] as [string, ReactNode][]) : []),
    ["Payment", "Monthly, at the end of each month"],
    ["Review", "Quarterly, with evaluations as the work goes on"],
  ];
}

/**
 * Where the offer stands: still out (sent, and its start date hasn't gone by), expired (nobody
 * answered it by then, TB-072), and what accepting releases: what the trial's escrow still holds,
 * less what a dispute is keeping. Nothing, once the trial was ended and settled.
 */
export function conversionState(deal: Deal | null, offer: ConversionOffer, disputes: Dispute[]) {
  const open = offer.status === "sent" && lifecycleOfDeal(deal)?.phase === "offer";
  const escrow = escrowOf(deal, disputes);
  return {
    open,
    expired: offer.status === "expired" || (offer.status === "sent" && !open),
    releasing: escrow ? Math.max(0, escrow.held - escrow.onHold) : 0,
    ended: !!deal?.contract?.ended,
  };
}

/** The line under the offer's title: when it was sent and, while it's open, what accepting does and by when. */
export function conversionIntro(offer: ConversionOffer, { open, releasing }: { open: boolean; releasing: number }) {
  if (!open) return `Sent ${offer.sent}.`;
  const kind = JOB_TYPE_LABEL[offer.type].toLowerCase();
  const release = releasing > 0 ? `, and the ${usd(releasing)} still in the trial's escrow is released to you` : "";
  return `Sent ${offer.sent}. Accepting turns your trial into a ${kind} engagement${release}. Answer by ${offerDay(offer.start)}, its start date, or it expires.`;
}
