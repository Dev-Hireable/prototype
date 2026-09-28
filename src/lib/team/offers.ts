"use client";

import { useMemo } from "react";
import { dayLabel, isoDay, today } from "@/lib/demo/dates";
import { lifecycleOfDeal, readDeal, updateDeal, useDeal } from "@/lib/demo/deal";
import type { ConversionStatus, Deal, DealOffer } from "@/lib/demo/deal";
import type { OngoingType } from "@/lib/demo/job-types";
import { move, PAIR, persisted, useStored } from "@/lib/demo/live";
import { offers as seedOffers } from "./data";
import type { Offer } from "./data";
import { DEAL_ID } from "./deal-view";

/*
 * Sent Offers: the offer the talent opens on their application, the post-trial offer that follows an
 * evaluated trial, and the seed's other offers. The live two sit on the shared engagement.
 */

const offersStore = persisted("team.offers", seedOffers);

/** The id the post-trial offer goes by in Sent Offers, beside the proposal's offer (DEAL_ID). */
export const CONVERSION_ID = "deal-hire";

/** Sent Offers' vocabulary for an offer's answer. */
const OFFER_STATUS: Record<ConversionStatus, Offer["status"]> = {
  sent: { label: "Pending", tone: "warn" },
  accepted: { label: "Accepted", tone: "ok" },
  declined: { label: "Declined", tone: "danger" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
  // TB-072 — a post-trial offer nobody answered by its start date.
  expired: { label: "Expired", tone: "neutral" },
};

function offersOf(deal: Deal | null, offers: Offer[]): Offer[] {
  const live: Offer[] = [];
  if (deal?.conversion)
    live.push({
      id: CONVERSION_ID,
      independent: PAIR.independent.slug,
      role: deal.title,
      sent: deal.conversion.sent,
      rate: `${deal.conversion.salary} /month`,
      start: dayLabel(deal.conversion.start),
      hours: deal.conversion.hours,
      href: `/team/independents/${PAIR.independent.slug}`,
      status: OFFER_STATUS[deal.conversion.status],
      type: deal.conversion.type,
      conversion: true,
      declineReason: deal.conversion.declineReason,
    });
  if (deal?.offer)
    live.push({
      id: DEAL_ID,
      independent: PAIR.independent.slug,
      role: deal.title,
      sent: deal.offer.sent,
      rate: deal.offer.rate,
      start: dayLabel(deal.offer.start),
      end: deal.offer.end ? dayLabel(deal.offer.end) : undefined,
      hours: deal.offer.hours,
      href: `/team/hire/roles/${deal.roleSlug}/candidates/${DEAL_ID}`,
      status: OFFER_STATUS[deal.offer.status],
      type: deal.offer.type,
      declineReason: deal.offer.declineReason,
    });
  return [...live, ...offers];
}

/**
 * Where the talent's side of the live contract is: their contract lives under the role's slug,
 * not the independent's slug these screens use. Notifications about the contract used to carry
 * ours, so every one of them opened a 404 in the talent's portal.
 */
const talentSide = (d: Deal) => ({ slug: d.roleSlug, title: d.title });

/**
 * TB-105 — the offer the talent actually opens: its type's terms, the tasks it commits them to,
 * and on a trial the escrow funded with it.
 */
function sendOffer(terms: Omit<DealOffer, "status" | "sent" | "declineReason">) {
  const d = readDeal();
  if (!d) return;
  move("offer_sent", talentSide(d), { type: terms.type });
  updateDeal((x) => ({ ...x, stage: "offer_received", dropped: false, proposalDeclined: undefined, offer: { ...terms, status: "sent", sent: today() } }));
}

/** The talent is told; the proposal is back in review, and a new offer can be sent. */
function withdrawOffer(id: string) {
  const d = readDeal();
  if (id === DEAL_ID && d?.offer?.status === "sent") {
    move("offer_withdrawn", talentSide(d));
    // Back to the proposal: it is still on file, and a new offer can go out from it.
    updateDeal((x) => (x.offer ? { ...x, stage: "proposal_sent", offer: { ...x.offer, status: "withdrawn" } } : x));
    return;
  }
  if (id === CONVERSION_ID && d?.conversion?.status === "sent") {
    move("hire_withdrawn", talentSide(d), { type: d.conversion.type });
    updateDeal((x) => (x.conversion ? { ...x, conversion: { ...x.conversion, status: "withdrawn" } } : x));
    return;
  }
  offersStore.set((os) => os.map((o) => (o.id === id ? { ...o, status: OFFER_STATUS.withdrawn } : o)));
}

/**
 * TB-072 — after an evaluated trial, the offer to hire them full-time or part-time, on the same
 * engagement. False when it can't go out: not at the decision, or a start date already gone by.
 */
function sendConversionOffer({ type, salary, start, benefits, hours }: { type: OngoingType; salary: string; start: string; benefits: string[]; hours?: number }) {
  const d = readDeal();
  // Only once the trial is evaluated and nothing else is out — never on an ended contract.
  if (!d?.contract || lifecycleOfDeal(d)?.phase !== "decision") return false;
  // It expires on its start date if unanswered, so a start already gone by would be dead on arrival.
  if (!start || start < isoDay()) return false;
  updateDeal((x) => ({ ...x, conversion: { type, salary: `$${salary.replace(/^\$/, "")}`, start, benefits: type === "full-time" ? benefits : [], hours: type === "part-time" ? hours : undefined, status: "sent", sent: today() } }));
  move("hire_offer", talentSide(d), { type });
  return true;
}

export function useOffers() {
  const deal = useDeal();
  const stored = useStored(offersStore);
  const offers = useMemo(() => offersOf(deal, stored), [deal, stored]);
  return { offers, sendOffer, withdrawOffer, sendConversionOffer };
}
