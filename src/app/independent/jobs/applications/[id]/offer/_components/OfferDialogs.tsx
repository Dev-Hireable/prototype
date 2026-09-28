import { Button, Modal } from "@/components/independent/ui";
import { DeclineOfferDialog } from "@/components/portal/OfferParts";
import type { DealOffer } from "@/lib/demo/deal";
import { usd } from "@/lib/demo/disputes";
import { JOB_TYPE_LABEL } from "@/lib/demo/job-types";
import { pretty } from "../_lib/terms";

/** "Offer accepted · confirm": the acceptance is already saved; this says what happens next and opens the contract. */
export function AcceptedDialog({ open, sent, from, total, onClose, onOpenContract }: { open: boolean; sent: DealOffer; from: string; total: number; onClose: () => void; onOpenContract: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="You’ve accepted the offer"
      description={sent.type === "trial" ? `${from} has been notified. The ${usd(total)} escrow they funded is held for the trial, and the contract and its task list are under Contracts.` : `${from} has been notified. Your ${JOB_TYPE_LABEL[sent.type].toLowerCase()} contract starts ${pretty(sent.start)}, and it and its task list are under Contracts.`}
      footer={
        <Button size="lg" variant="primary" onClick={onOpenContract}>
          Open contract
        </Button>
      }
    />
  );
}

/** "Decline offer · modal": the Team Builder is told, with the talent's reason if they give one. */
export function DeclineDialog({ open, contact, onClose, onDecline }: { open: boolean; contact: string; onClose: () => void; onDecline: (reason: string) => void }) {
  return (
    <DeclineOfferDialog
      open={open}
      onClose={onClose}
      onDecline={onDecline}
      title="Decline this offer?"
      description={`${contact} is told you have declined, with your reason if you give one. The offer stays in My Applications so you can look back at the terms, but you cannot accept it afterwards.`}
      placeholder="Anything you want the Team Builder to know — rate, timing, or scope."
    />
  );
}
