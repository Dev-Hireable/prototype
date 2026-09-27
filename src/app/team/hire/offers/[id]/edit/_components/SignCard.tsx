import { Button, Card, InfoBanner } from "@/components/independent/ui";
import { Signature } from "@/components/portal/OfferParts";
import { Avatar } from "@/components/team/ui";
import { usd } from "@/lib/demo/disputes";
import type { Independent, Role } from "@/lib/team/data";
import { FEE_RATE, type OfferEdit } from "../_lib/edit";

/** The side card: who the offer goes to, the signature, what a trial's escrow does, and Send or Cancel. */
export function SignCard({
  person,
  role,
  edit,
  name,
  onName,
  agree,
  onAgree,
  onSend,
  onCancel,
}: {
  person: Independent;
  role: Role;
  edit: OfferEdit;
  name: string;
  onName: (name: string) => void;
  agree: boolean;
  onAgree: (agree: boolean) => void;
  onSend: () => void;
  onCancel: () => void;
}) {
  const { trial, delta, funded, escrow, signed, valid, changed } = edit;
  return (
    <Card className="flex w-[360px] shrink-0 flex-col divide-y divide-[#e5e5e5]">
      <div className="flex flex-col gap-4 p-6">
        <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Send Offer to</h3>
        <div className="flex items-center gap-3">
          <Avatar src={person.avatar} size={48} />
          <div>
            <p className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px] text-primary">{person.name}</p>
            <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">{role.title}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4 p-6">
        <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Sign contract</h3>
        <Signature name={name} onName={onName} agree={agree} onAgree={onAgree} />
        {/* A trial's escrow follows the terms: more is charged, or the difference goes back to the card. */}
        {trial && (
          <InfoBanner>
            {delta > 0
              ? `The escrow goes from ${usd(funded)} to ${usd(escrow)}: ${usd(delta)} more, plus its ${usd(delta * FEE_RATE)} fee, is charged to your card.`
              : delta < 0
                ? `The escrow goes from ${usd(funded)} to ${usd(escrow)}: ${usd(-delta)} is refunded to your card.`
                : `The ${usd(funded)} already in escrow covers these terms.`}
          </InfoBanner>
        )}
        <Button size="lg" variant="primary" disabled={!signed || !valid || !changed} onClick={onSend}>
          Send updated offer
        </Button>
        <Button size="lg" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
