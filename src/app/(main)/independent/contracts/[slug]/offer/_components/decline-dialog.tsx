import { DeclineOfferDialog } from "@/components/portal/offer-parts";

/** Declining the offer: the manager is told, with the talent's reason if they give one. */
export function DeclineDialog({ open, kind, manager, onClose, onDecline }: { open: boolean; kind: string; manager: string; onClose: () => void; onDecline: (reason: string) => void }) {
  return (
    <DeclineOfferDialog
      open={open}
      onClose={onClose}
      onDecline={onDecline}
      title={`Decline the ${kind.toLowerCase()} offer?`}
      description={`${manager} is told, with your reason if you give one. Your trial record stays on the contract.`}
      placeholder="Pay, hours, start date, or anything else they should know."
    />
  );
}
