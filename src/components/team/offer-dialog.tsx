"use client";

import { useState } from "react";
import { Button, Modal, StatusDot } from "@/components/portal/ui";
import { OfferTerms } from "@/components/portal/offer-parts";
import { TaskPlanList } from "@/components/portal/tasks/task-plan";
import { hoursLabel, JOB_TYPE_LABEL, payFor } from "@/lib/contract/job-types";
import { useDeal, type DealOffer } from "@/lib/demo/deal";
import { usd } from "@/lib/demo/disputes";
import { PAIR } from "@/lib/demo/live";
import { dayLabel, durationDays, trialLength } from "@/lib/portal/dates";
import { shortName } from "@/lib/portal/names";
import type { SetToast } from "@/lib/portal/toast";
import type { Offer } from "@/lib/team/data";
import { DEAL_ID } from "@/lib/team/deal-view";
import { useOffers } from "@/lib/team/offers";
import { useRoles } from "@/lib/team/roles";

/** The offer's terms, a row each, for the kind of role it's for. */
function offerRows(sent: DealOffer, title: string, duration: string | undefined): [string, string][] {
  const head: [string, string][] = [
    ["Role", title],
    ["Contract type", JOB_TYPE_LABEL[sent.type]],
  ];
  if (sent.type === "trial")
    return [
      ...head,
      ["Duration", trialLength(durationDays(duration))],
      ["Start date", dayLabel(sent.start)],
      ["End date", dayLabel(sent.end)],
      ["Pay", payFor(sent.type, sent.rate)],
      ...(sent.deposit
        ? ([
            ["In escrow", usd(sent.deposit.escrow)],
            ["Platform fee", usd(sent.deposit.fee)],
          ] as [string, string][])
        : []),
    ];
  return [
    ...head,
    ["Start date", dayLabel(sent.start)],
    ["Pay", payFor(sent.type, sent.rate)],
    sent.type === "part-time" ? ["Hours", hoursLabel(sent.hours)] : ["Benefits", sent.benefits?.length ? sent.benefits.join(", ") : "None"],
    ["Payment", "Monthly, at the end of each month"],
  ];
}

/**
 * TB-105 — the offer sent from the proposal, as a pop-up: where it stands, its terms and the tasks it
 * sets, and Withdraw while it waits on the talent. It's read here, not edited: changing it takes a
 * revision and a new offer (TB-106). The candidate's Offer card opens it, as can the offer's entry
 * in Messages. The talent is named "Juan D." until the offer is signed.
 */
export function OfferDialog({ open, onClose, onToast }: { open: boolean; onClose: () => void; onToast: SetToast }) {
  const deal = useDeal();
  const { offers, withdrawOffer } = useOffers();
  const { roles } = useRoles();
  const [withdrawing, setWithdrawing] = useState(false);
  const offer = offers.find((o) => o.id === DEAL_ID);
  const sent = deal?.offer;
  if (!deal || !offer || !sent) return null;
  const name = deal.contract ? PAIR.independent.name : shortName(PAIR.independent.name);
  const pending = offer.status.label === "Pending";
  return (
    <>
      <Modal
        open={open && !withdrawing}
        onClose={onClose}
        width={560}
        title={`Your offer to ${name}`}
        description={`Sent ${sent.sent}`}
        footer={
          <>
            <Button size="lg" onClick={onClose}>
              Close
            </Button>
            {pending && (
              <Button size="lg" variant="danger" onClick={() => setWithdrawing(true)}>
                Withdraw offer
              </Button>
            )}
          </>
        }
      >
        <SentOffer status={offer.status} sent={sent} rows={offerRows(sent, deal.title, roles.find((r) => r.slug === deal.roleSlug)?.duration)} />
      </Modal>
      <WithdrawOfferDialog
        open={open && withdrawing}
        name={name}
        onClose={() => setWithdrawing(false)}
        onWithdraw={() => {
          withdrawOffer(DEAL_ID);
          setWithdrawing(false);
          onClose();
          onToast("Offer withdrawn");
        }}
      />
    </>
  );
}

/** The offer itself: where it stands (with the talent's reason if they declined), its terms, and the tasks it sets. */
function SentOffer({ status, sent, rows }: { status: Offer["status"]; sent: DealOffer; rows: [string, string][] }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2 text-[14px] leading-[1.4] text-ink-2">
        <StatusDot tone={status.tone}>{status.label}</StatusDot>
        {sent.status === "declined" && (sent.declineReason ? `Their reason: “${sent.declineReason}”` : "No reason given.")}
      </div>
      <div className="flex flex-col">
        <OfferTerms rows={rows} />
      </div>
      <section aria-label="Tasks" className="flex flex-col gap-3">
        <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Tasks</h3>
        <TaskPlanList tasks={sent.tasks} start={sent.start} lastDay={sent.type === "trial" ? sent.end : undefined} empty={sent.type === "trial" ? "No trial tasks." : "None yet. The work is added once the contract starts."} />
      </section>
    </div>
  );
}

/** Withdrawing a pending offer, once confirmed: the candidate is told and can no longer accept it. */
export function WithdrawOfferDialog({ open, name, onClose, onWithdraw }: { open: boolean; name: string; onClose: () => void; onWithdraw: () => void }) {
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
