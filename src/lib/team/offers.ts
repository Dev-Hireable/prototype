"use client";

import { useMemo } from "react";
import { currentRevision, openRequest, revisionOf, unanswered, type OfferEvent } from "@/lib/contract/negotiation";
import { dayLabel, isoDay, momentLabel, today } from "@/lib/demo/dates";
import type { SuggestionDecision } from "@/lib/demo/suggestions";
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
      sent: deal.offer.updated ?? deal.offer.sent,
      rate: deal.offer.rate,
      start: dayLabel(deal.offer.start),
      end: deal.offer.end ? dayLabel(deal.offer.end) : undefined,
      hours: deal.offer.hours,
      href: `/team/hire/roles/${deal.roleSlug}/candidates/${DEAL_ID}`,
      // IN-092 — the talent asked for changes: the next revision is the Team Builder's to send.
      status: openRequest(deal.offer) ? { label: "Changes requested", tone: "warn" } : OFFER_STATUS[deal.offer.status],
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

/** A line on the offer's log for the Team Builder's step. */
const teamEvent = (kind: OfferEvent["kind"], revision: number): OfferEvent => ({ kind, revision, at: momentLabel(), ts: Date.now(), by: "team", name: PAIR.team.name });

/**
 * TB-105 — the offer the talent actually opens: its type's terms, the tasks it commits them to,
 * and on a trial the escrow funded with it. After a declined or withdrawn one, the new offer is
 * the next revision, so its history reads on from the last.
 */
function sendOffer(terms: Omit<DealOffer, "status" | "sent" | "updated" | "declineReason">) {
  const d = readDeal();
  if (!d) return;
  move("offer_sent", talentSide(d), { type: terms.type });
  updateDeal((x) => {
    const revision = x.offer ? revisionOf(x.offer) + 1 : 1;
    const history = x.offer ? [...(x.offer.history ?? []), currentRevision(x.offer)] : [];
    return { ...x, stage: "offer_received", dropped: false, proposalDeclined: undefined, offer: { ...terms, status: "sent", sent: today(), revision, history, log: [...(x.offer?.log ?? []), teamEvent("sent", revision)] } };
  });
}

/** The offer's next revision: `terms` over the last, which is kept as it was, and the talent's open request answered with `decisions`. */
function revised(o: DealOffer, terms: Pick<DealOffer, "rate" | "start" | "end" | "deposit" | "hours" | "tasks">, decisions: Readonly<Record<string, SuggestionDecision>> | undefined): DealOffer {
  const revision = revisionOf(o) + 1;
  const request = openRequest(o);
  const answers = request ? Object.fromEntries(request.suggestions.map((s) => [s.id, decisions?.[s.id] ?? "ignored"])) : undefined;
  return {
    ...o,
    ...terms,
    status: "sent",
    updated: today(),
    declineReason: undefined,
    revision,
    history: [...(o.history ?? []), currentRevision(o)],
    request: request ? { ...request, status: "answered", decisions: answers, answeredIn: revision } : o.request,
    log: [...(o.log ?? []), teamEvent("revised", revision)],
  };
}

/**
 * TB-105 / IN-092 — the next revision of a sent offer; the talent is told and signs it, not the one
 * before. While they've asked for changes, every suggestion needs an answer (`decisions`) first, so
 * nothing they asked is left unresolved. False when it can't go: answered since the editor opened
 * (accepted in the talent's tab, say), or a suggestion still unanswered.
 */
function updateOffer(terms: Pick<DealOffer, "rate" | "start" | "end" | "deposit" | "hours" | "tasks">, decisions?: Readonly<Record<string, SuggestionDecision>>) {
  const d = readDeal();
  if (d?.offer?.status !== "sent" || unanswered(openRequest(d.offer), decisions) > 0) return false;
  move("offer_updated", talentSide(d), { type: d.offer.type });
  updateDeal((x) => (x.offer?.status === "sent" ? { ...x, stage: "offer_received", offer: revised(x.offer, terms, decisions) } : x));
  return true;
}

/** The talent is told; the proposal is back in review, and a new offer can be sent. */
function withdrawOffer(id: string) {
  const d = readDeal();
  if (id === DEAL_ID && d?.offer?.status === "sent") {
    move("offer_withdrawn", talentSide(d));
    // Back to the proposal: it is still on file, and a new offer can go out from it.
    updateDeal((x) => (x.offer ? { ...x, stage: "proposal_sent", offer: { ...x.offer, status: "withdrawn", log: [...(x.offer.log ?? []), teamEvent("withdrawn", revisionOf(x.offer))] } } : x));
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
  return { offers, sendOffer, updateOffer, withdrawOffer, sendConversionOffer };
}
