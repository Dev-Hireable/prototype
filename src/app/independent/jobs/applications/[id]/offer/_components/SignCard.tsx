import { useState } from "react";
import { Button, Card, InfoBanner, LinkButton } from "@/components/independent/ui";
import { OfferFrom, Signature } from "@/components/portal/OfferParts";
import type { DealOffer } from "@/lib/demo/deal";
import { expiryOf } from "../_lib/terms";

type SignProps = {
  sent: DealOffer;
  from: string;
  contact: string;
  updated: boolean;
  /** The revision on screen, which is the one signed. */
  revision: number;
  /** Why it can't be signed right now: a newer revision to read first, or the talent's own open request. */
  blocked?: string;
  /** Whether changes can be asked for: not while a request is already open. */
  canRequest: boolean;
  contractHref: string;
  onAccept: () => void;
  onDecline: () => void;
  onRequest: () => void;
};

/**
 * The side card: who the offer is from, and signing it — the typed name and the tick, how long the
 * offer stands, which revision is being signed, and Accept, Ask for changes or Decline — or the
 * answer it already has.
 */
export function SignCard({ sent, from, contact, updated, revision, blocked, canRequest, contractHref, onAccept, onDecline, onRequest }: SignProps) {
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  // Read back from the shared engagement, so an answer given earlier still shows after a reload.
  const accepted = sent.status === "accepted";
  const declined = sent.status === "declined";
  const withdrawn = sent.status === "withdrawn";
  const expires = expiryOf(sent.updated ?? sent.sent);
  const signed = name.trim().length > 2 && agree;
  const open = !accepted && !declined && !withdrawn;
  return (
    <Card className="flex w-[360px] shrink-0 flex-col divide-y divide-[#e5e5e5]">
      <OfferFrom name={contact} company={from} />
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Sign contract</h3>
          <span className="text-[12.5px] text-ink-2">Revision {revision}</span>
        </div>
        <Signature name={name} onName={setName} agree={agree} onAgree={setAgree} disabled={!open} />
        {open && expires && <InfoBanner>{updated ? `This updated offer expires on ${expires}` : `This offer expires on ${expires}`}</InfoBanner>}
        {open ? <OpenAnswer signed={signed} blocked={blocked} canRequest={canRequest} onAccept={onAccept} onDecline={onDecline} onRequest={onRequest} /> : <Answered accepted={accepted} declined={declined} contractHref={contractHref} />}
      </div>
    </Card>
  );
}

/** While it's out: Accept once it's signed (and nothing blocks it), Ask for changes, or Decline. */
function OpenAnswer({ signed, blocked, canRequest, onAccept, onDecline, onRequest }: { signed: boolean; blocked?: string; canRequest: boolean; onAccept: () => void; onDecline: () => void; onRequest: () => void }) {
  return (
    <>
      <Button size="lg" variant="primary" disabled={!signed || !!blocked} onClick={onAccept}>
        Accept
      </Button>
      {blocked && (
        <p role="status" className="text-[12.5px] leading-[1.4] text-ink-2">
          {blocked}
        </p>
      )}
      {canRequest && (
        <Button size="lg" onClick={onRequest}>
          Ask for changes
        </Button>
      )}
      <Button size="lg" variant="danger" onClick={onDecline}>
        Decline
      </Button>
    </>
  );
}

/** The answer it already has, with the way into the contract once accepted. */
function Answered({ accepted, declined, contractHref }: { accepted: boolean; declined: boolean; contractHref: string }) {
  if (!accepted)
    return (
      <Button size="lg" disabled>
        {declined ? "Offer declined" : "Offer withdrawn"}
      </Button>
    );
  return (
    <>
      <Button size="lg" disabled>
        Accepted
      </Button>
      <LinkButton size="lg" href={contractHref}>
        Open contract
      </LinkButton>
    </>
  );
}
