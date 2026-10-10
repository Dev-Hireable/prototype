"use client";

import { useState } from "react";
import { Button, Card, CardTitle, Modal, StatusDot } from "@/components/portal/ui";
import { hoursLabel } from "@/lib/contract/job-types";
import type { SetToast } from "@/lib/portal/toast";
import type { Offer } from "@/lib/team/data";

/** "12 Oct 2026" → "12 Oct": an offer starts within weeks, and a trial's end date carries the year. */
const dayMonth = (d: string) => d.replace(/\s\d{4}$/, "");

/** What the pay covers: a trial's dates, or when an ongoing role starts and, part-time, its hours. */
const termsOf = (o: Offer) => (o.type === "trial" ? (o.end ? `${dayMonth(o.start)} – ${o.end}` : `From ${o.start}`) : `From ${dayMonth(o.start)}${o.hours ? ` · ${hoursLabel(o.hours)}` : ""}`);

/**
 * TB-037 — the offer sent to this candidate, on their card in the pipeline: where it stands, its
 * pay and dates, and, while it waits on them, Withdraw. Their reason for turning it down is in Notes.
 * Its terms were settled in the proposal, so it isn't edited: changing them takes a revision and a
 * new offer (TB-106).
 */
export function OfferCard({ offer, name, onWithdraw, onToast }: { offer: Offer; name: string; onWithdraw: (id: string) => void; onToast: SetToast }) {
  const [withdrawing, setWithdrawing] = useState(false);
  const pending = offer.status.label === "Pending";
  return (
    <Card className="p-4">
      <section aria-label="Offer" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Offer</CardTitle>
          <StatusDot tone={offer.status.tone}>{offer.status.label}</StatusDot>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-[14px] leading-[1.2] tracking-[0.2px] text-ink">
          <OfferFact label="Rate" value={offer.rate} />
          <OfferFact label={offer.type === "trial" ? "Trial" : "Starts"} value={termsOf(offer)} />
          <OfferFact label="Sent" value={offer.sent} />
        </dl>
        {pending && (
          <Button size="sm" variant="danger" className="self-start" onClick={() => setWithdrawing(true)}>
            Withdraw offer
          </Button>
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
      </section>
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

/** Withdrawing a pending offer, once confirmed: the candidate is told and can no longer accept it. */
function WithdrawOfferDialog({ open, name, onClose, onWithdraw }: { open: boolean; name: string; onClose: () => void; onWithdraw: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      tone="danger"
      title="Withdraw this offer?"
      description={`${name} is told the offer was withdrawn and can no longer accept it. Their proposal stays on file, so you can send a new offer from it.`}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="danger" onClick={onWithdraw}>
            Withdraw offer
          </Button>
        </>
      }
    />
  );
}
