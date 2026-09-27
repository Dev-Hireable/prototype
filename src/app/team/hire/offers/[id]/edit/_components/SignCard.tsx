import { Button, Card, InfoBanner } from "@/components/independent/ui";
import { Signature } from "@/components/portal/OfferParts";
import { Avatar } from "@/components/team/ui";
import { usd } from "@/lib/demo/disputes";
import type { Independent, Role } from "@/lib/team/data";
import { FEE_RATE, type OfferEdit } from "../_lib/edit";

/** Who the offer goes to. */
function Recipient({ person, role }: { person: Independent; role: Role }) {
  return (
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
  );
}

/** A trial's escrow follows the terms: more is charged, or the difference goes back to the card. */
function EscrowNote({ edit }: { edit: OfferEdit }) {
  const { delta, funded, escrow } = edit;
  return (
    <InfoBanner>
      {delta > 0
        ? `The escrow goes from ${usd(funded)} to ${usd(escrow)}: ${usd(delta)} more, plus its ${usd(delta * FEE_RATE)} fee, is charged to your card.`
        : delta < 0
          ? `The escrow goes from ${usd(funded)} to ${usd(escrow)}: ${usd(-delta)} is refunded to your card.`
          : `The ${usd(funded)} already in escrow covers these terms.`}
    </InfoBanner>
  );
}

/** The side card: who the offer goes to, the signature, what a trial's escrow does, and Send (as the next revision) or Cancel. */
export function SignCard({
  person,
  role,
  edit,
  next,
  answering,
  unanswered,
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
  /** The revision it goes out as. */
  next: number;
  /** It answers the talent's request: it can go even with the terms as they were. */
  answering: boolean;
  /** Changes the talent asked for that have no answer yet. */
  unanswered: number;
  name: string;
  onName: (name: string) => void;
  agree: boolean;
  onAgree: (agree: boolean) => void;
  onSend: () => void;
  onCancel: () => void;
}) {
  const { trial, signed, valid, changed } = edit;
  return (
    <Card className="flex w-[360px] shrink-0 flex-col divide-y divide-[#e5e5e5]">
      <Recipient person={person} role={role} />
      <div className="flex flex-col gap-4 p-6">
        <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Sign contract</h3>
        <Signature name={name} onName={onName} agree={agree} onAgree={onAgree} />
        {trial && <EscrowNote edit={edit} />}
        <Button size="lg" variant="primary" disabled={!signed || !valid || (!changed && !answering) || unanswered > 0} onClick={onSend}>
          Send revision {next}
        </Button>
        {unanswered > 0 && (
          <p role="status" className="text-[12.5px] leading-[1.4] text-ink-2">
            Answer each change {person.name.split(" ")[0]} asked for first.
          </p>
        )}
        <Button size="lg" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
