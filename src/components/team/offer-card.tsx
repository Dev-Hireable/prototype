"use client";

import { useState } from "react";
import { Button, Card, StatusDot } from "@/components/portal/ui";
import { OfferDialog, WithdrawOfferDialog } from "@/components/team/offer-dialog";
import { hoursLabel, payFor } from "@/lib/contract/job-types";
import { dayRangeLabel } from "@/lib/portal/dates";
import type { SetToast } from "@/lib/portal/toast";
import type { Offer } from "@/lib/team/data";
import { DEAL_ID } from "@/lib/team/deal-view";

/** "12 Oct 2026" → "12 Oct": an offer starts within weeks. */
const dayMonth = (d: string) => d.replace(/\s\d{4}$/, "");

/** What the pay covers: a trial's dates, or when an ongoing role starts and, part-time, its hours. */
const termsOf = (o: Offer) => (o.type === "trial" ? (o.end ? dayRangeLabel(o.start, o.end) : `From ${o.start}`) : `From ${dayMonth(o.start)}${o.hours ? ` · ${hoursLabel(o.hours)}` : ""}`);

/**
 * TB-037 — the offer sent to this candidate, on their card in the pipeline: where it stands, its
 * pay and dates, View offer for the whole of it (its terms and tasks, in a pop-up), and, while it
 * waits on them, Withdraw. Their reason for turning it down is in Notes. Its terms were settled in
 * the proposal, so it isn't edited: changing them takes a revision and a new offer (TB-106).
 */
export function OfferCard({ offer, name, onWithdraw, onToast }: { offer: Offer; name: string; onWithdraw: (id: string) => void; onToast: SetToast }) {
  const [withdrawing, setWithdrawing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const pending = offer.status.label === "Pending";
  /** Only the live engagement's offer has its terms and tasks on file to show. */
  const live = offer.id === DEAL_ID;
  return (
    <Card
      title="Offer"
      aside={
        <span className="shrink-0">
          <StatusDot tone={offer.status.tone}>{offer.status.label}</StatusDot>
        </span>
      }
      label="Offer"
      className="p-4"
    >
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-4 text-[14px] leading-[1.2] tracking-[0.2px] text-ink">
          <OfferFact label="Pay" value={payFor(offer.type, offer.rate)} />
          <OfferFact label={offer.type === "trial" ? "Trial" : "Starts"} value={termsOf(offer)} />
          <OfferFact label="Sent" value={offer.sent} />
        </dl>
        {(live || pending) && (
          <div className="flex flex-wrap gap-2">
            {live && (
              <Button size="sm" onClick={() => setViewing(true)}>
                View offer
              </Button>
            )}
            {pending && (
              <Button size="sm" variant="danger" onClick={() => setWithdrawing(true)}>
                Withdraw offer
              </Button>
            )}
          </div>
        )}
        <WithdrawOfferDialog
          open={withdrawing}
          name={name}
          onClose={() => setWithdrawing(false)}
          onWithdraw={() => {
            onWithdraw(offer.id);
            setWithdrawing(false);
            onToast("Offer withdrawn");
          }}
        />
        {live && <OfferDialog open={viewing} onClose={() => setViewing(false)} onToast={onToast} />}
      </div>
    </Card>
  );
}

function OfferFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <dt className="font-semibold">{label}</dt>
      <dd className="text-ink-2 [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}
