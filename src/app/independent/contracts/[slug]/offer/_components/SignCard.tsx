import { useState } from "react";
import { Button, Card, LinkButton } from "@/components/independent/ui";
import { OfferFrom, Signature } from "@/components/portal/OfferParts";
import type { ConversionOffer } from "@/lib/demo/deal";
import type { Contract } from "@/lib/independent/data";

/**
 * The side card: the manager the offer is from, and signing it — the typed name and the tick with
 * Accept or Decline while it's open, or what became of it, with the way back to the contract.
 */
export function SignCard({ contract, offer, open, expired, back, onAccept, onDecline }: { contract: Contract; offer: ConversionOffer; open: boolean; expired: boolean; back: string; onAccept: () => void; onDecline: () => void }) {
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const signed = name.trim().length > 2 && agree;
  return (
    <Card className="flex w-[360px] shrink-0 flex-col divide-y divide-[#e5e5e5]">
      <OfferFrom name={contract.manager} company={contract.company} />
      <div className="flex flex-col gap-4 p-6">
        <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Sign contract</h3>
        {open ? (
          <>
            <Signature name={name} onName={setName} agree={agree} onAgree={setAgree} />
            <Button size="lg" variant="primary" disabled={!signed} onClick={onAccept}>
              Accept
            </Button>
            <Button size="lg" variant="danger" onClick={onDecline}>
              Decline
            </Button>
          </>
        ) : (
          <Answered offer={offer} expired={expired} back={back} />
        )}
      </div>
    </Card>
  );
}

/** No longer open: accepted, declined (with the talent's reason), expired or withdrawn — and the way back to the contract. */
function Answered({ offer, expired, back }: { offer: ConversionOffer; expired: boolean; back: string }) {
  return (
    <>
      <Button size="lg" disabled>
        {offer.status === "accepted" ? "Accepted" : offer.status === "declined" ? "Declined" : expired ? "Expired" : "Withdrawn"}
      </Button>
      {offer.status === "declined" && offer.declineReason && <p className="text-[13px] leading-[1.4] text-ink-2">Your reason: “{offer.declineReason}”</p>}
      <LinkButton size="lg" href={back}>
        Open contract
      </LinkButton>
    </>
  );
}
