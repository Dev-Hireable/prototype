import { useState } from "react";
import { Button, Card, InfoBanner, LinkButton } from "@/components/independent/ui";
import { OfferFrom, Signature } from "@/components/portal/OfferParts";
import type { DealOffer } from "@/lib/demo/deal";
import { expiryOf } from "../_lib/terms";

/**
 * The side card: who the offer is from, and signing it — the typed name and the tick, how long the
 * offer stands, and Accept or Decline, or the answer it already has.
 */
export function SignCard({ sent, from, contact, contractHref, onAccept, onDecline }: { sent: DealOffer; from: string; contact: string; contractHref: string; onAccept: () => void; onDecline: () => void }) {
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  // Read back from the shared engagement, so an answer given earlier still shows after a reload.
  const accepted = sent.status === "accepted";
  const declined = sent.status === "declined";
  const withdrawn = sent.status === "withdrawn";
  const expires = expiryOf(sent.sent);
  const signed = name.trim().length > 2 && agree;
  return (
    <Card className="flex w-[360px] shrink-0 flex-col divide-y divide-[#e5e5e5]">
      <OfferFrom name={contact} company={from} />
      <div className="flex flex-col gap-4 p-6">
        <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Sign contract</h3>
        <Signature name={name} onName={setName} agree={agree} onAgree={setAgree} disabled={accepted || declined || withdrawn} />
        {!accepted && !declined && !withdrawn && expires && <InfoBanner>This offer expires on {expires}</InfoBanner>}
        <Answer accepted={accepted} declined={declined} withdrawn={withdrawn} signed={signed} contractHref={contractHref} onAccept={onAccept} onDecline={onDecline} />
      </div>
    </Card>
  );
}

/** Accept once it's signed, or Decline — or the answer it already has, with the way into the contract once accepted. */
function Answer({ accepted, declined, withdrawn, signed, contractHref, onAccept, onDecline }: { accepted: boolean; declined: boolean; withdrawn: boolean; signed: boolean; contractHref: string; onAccept: () => void; onDecline: () => void }) {
  return declined ? (
    <Button size="lg" disabled>
      Offer declined
    </Button>
  ) : withdrawn ? (
    <Button size="lg" disabled>
      Offer withdrawn
    </Button>
  ) : accepted ? (
    <>
      <Button size="lg" disabled>
        Accepted
      </Button>
      <LinkButton size="lg" href={contractHref}>
        Open contract
      </LinkButton>
    </>
  ) : (
    <>
      <Button size="lg" variant="primary" disabled={!signed} onClick={onAccept}>
        Accept
      </Button>
      <Button size="lg" variant="danger" onClick={onDecline}>
        Decline
      </Button>
    </>
  );
}
