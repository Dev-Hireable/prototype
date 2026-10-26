"use client";

import { useState } from "react";
import { Button, Card, InfoBanner, Modal, StatusDot } from "@/components/portal/ui";
import { Agreement, DeclineOfferDialog, OfferTerms, SignCard, Signature } from "@/components/portal/offer-parts";
import { FT_BENEFITS, JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import { useDeal, type ConversionOffer } from "@/lib/demo/deal";
import { useDisputes } from "@/lib/demo/disputes";
import { useIndependentAccount } from "@/lib/independent/account";
import { conversionIntro, conversionRows, conversionState, offerDay } from "@/lib/independent/conversion-offer";
import { useIndependentContracts } from "@/lib/independent/contracts";
import type { Contract } from "@/lib/independent/data";
import { signatureMatches } from "@/lib/portal/names";
import type { SetToast } from "@/lib/portal/toast";

const HEADING = "text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink";

/**
 * TB-072 / IN-084 — the offer that follows an evaluated trial, for a full-time role (pay, start date
 * and the benefits the Team Builder picked) or a part-time one (pay, hours a week and start date),
 * signed or declined in a dialog over the contract it continues: opened from the contract's banner,
 * or from the offer's entry in Messages. It was a page of its own. Declining takes the dialog's place
 * and gives it back on Cancel.
 */
export function ConversionOfferDialog({ slug, open, onClose, onToast }: { slug: string; open: boolean; onClose: () => void; onToast: SetToast }) {
  const { contracts, acceptConversion, declineConversion } = useIndependentContracts();
  const { profile } = useIndependentAccount();
  const deal = useDeal();
  const disputes = useDisputes();
  const [declining, setDeclining] = useState(false);
  const contract = contracts.find((c) => c.slug === slug);
  const offer = deal?.roleSlug === slug ? deal.conversion : undefined;
  if (!contract || !offer) return null;
  const state = conversionState(deal, offer, disputes);
  const kind = JOB_TYPE_LABEL[offer.type];
  const accept = () => {
    const r = acceptConversion();
    onToast(r.ok ? `You're ${kind.toLowerCase()} with ${contract.company}` : r.error, r.ok ? "success" : "danger");
  };
  const decline = (reason: string) => {
    const r = declineConversion(reason);
    setDeclining(false);
    onToast(r.ok ? `${kind} offer declined` : r.error, r.ok ? "success" : "danger");
  };
  return (
    <>
      <Modal open={open && !declining} onClose={onClose} title={`${kind} offer from ${contract.company}`} description={conversionIntro(offer, state)} width={1040} closeButton>
        <OfferBanners offer={offer} company={contract.company} expired={state.expired} ended={state.ended} />
        <div className="flex items-start gap-6 max-lg:flex-col">
          <OfferBody offer={offer} contract={contract} />
          <Signing contract={contract} offer={offer} open={state.open} expired={state.expired} fullName={profile.name} onAccept={accept} onDecline={() => setDeclining(true)} onClose={onClose} />
        </div>
      </Modal>
      <DeclineOfferDialog
        open={open && declining}
        onClose={() => setDeclining(false)}
        onDecline={decline}
        title={`Decline the ${kind.toLowerCase()} offer?`}
        description={`We'll let ${contract.managerFirst} know, along with your reason if you add one. Your trial history stays on your record.`}
        placeholder="Pay, hours, start date, or anything else they should know."
      />
    </>
  );
}

/** Why a withdrawn or expired offer can't be accepted any more. */
function OfferBanners({ offer, company, expired, ended }: { offer: ConversionOffer; company: string; expired: boolean; ended: boolean }) {
  return (
    <>
      {offer.status === "withdrawn" && <InfoBanner tone="warn">{ended ? `${company} ended the contract, so this offer was withdrawn and can no longer be accepted.` : `${company} withdrew this offer, so it can no longer be accepted.`}</InfoBanner>}
      {expired && <InfoBanner tone="warn">{`This offer expired on ${offerDay(offer.start)}, its start date, without an answer, so it can no longer be accepted. ${company} can send you a new one.`}</InfoBanner>}
    </>
  );
}

/** The offer itself: its terms, a full-time role's benefits, and the services agreement it's signed under. */
function OfferBody({ offer, contract }: { offer: ConversionOffer; contract: Contract }) {
  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-6 p-6 max-lg:w-full">
      <div className="flex flex-col gap-4">
        <OfferTerms rows={conversionRows(offer, contract)} />
      </div>
      {offer.type === "full-time" && <Benefits included={offer.benefits} />}
      <div className="flex flex-col gap-3">
        <h3 className={HEADING}>Services Agreement</h3>
        <Agreement type={offer.type} height="h-[260px]" />
      </div>
    </Card>
  );
}

/** Every full-time benefit, each marked included or not as the Team Builder picked them. */
function Benefits({ included }: { included: string[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className={HEADING}>Benefits</h3>
      <ul className="flex flex-col gap-2 text-[14px] leading-[1.4]">
        {FT_BENEFITS.map((b) => (
          <li key={b} className="flex items-center justify-between gap-4">
            <span className="text-ink">{b}</span>
            <StatusDot tone={included.includes(b) ? "ok" : "neutral"}>{included.includes(b) ? "Included" : "Not included"}</StatusDot>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The side card: the manager the offer is from, and signing it: the account's name typed and the
 * tick, with Accept or Decline while it's open, or what became of it.
 */
function Signing({ contract, offer, open, expired, fullName, onAccept, onDecline, onClose }: { contract: Contract; offer: ConversionOffer; open: boolean; expired: boolean; fullName: string; onAccept: () => void; onDecline: () => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const signed = signatureMatches(name, fullName) && agree;
  return (
    <SignCard name={contract.manager} company={contract.company}>
      {open ? (
        <>
          <Signature name={name} onName={setName} agree={agree} onAgree={setAgree} fullName={fullName} />
          <Button size="lg" variant="primary" disabled={!signed} title={signed ? undefined : `Type ${fullName} and tick the box to accept`} onClick={onAccept}>
            Accept
          </Button>
          <Button size="lg" variant="danger" onClick={onDecline}>
            Decline
          </Button>
        </>
      ) : (
        <Answered offer={offer} expired={expired} fullName={fullName} onClose={onClose} />
      )}
    </SignCard>
  );
}

/** No longer open: accepted (and who signed it), declined with the talent's reason, expired or withdrawn. */
function Answered({ offer, expired, fullName, onClose }: { offer: ConversionOffer; expired: boolean; fullName: string; onClose: () => void }) {
  return (
    <>
      {offer.status === "accepted" && <Signature name={fullName} onName={() => {}} agree onAgree={() => {}} signed={{ name: fullName, on: offer.accepted }} />}
      <Button size="lg" disabled>
        {offer.status === "accepted" ? "Accepted" : offer.status === "declined" ? "Declined" : expired ? "Expired" : "Withdrawn"}
      </Button>
      {offer.status === "declined" && offer.declineReason && <p className="text-[13px] leading-[1.4] text-ink-2">Your reason: “{offer.declineReason}”</p>}
      <Button size="lg" onClick={onClose}>
        Back to the contract
      </Button>
    </>
  );
}
