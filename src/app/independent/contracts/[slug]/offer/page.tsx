"use client";

import { notFound, useRouter } from "next/navigation";
import { use, useState } from "react";
import { InfoBanner, Page, Toast } from "@/components/independent/ui";
import { lifecycleOfDeal, useDeal } from "@/lib/demo/deal";
import type { ConversionOffer } from "@/lib/demo/deal";
import { escrowOf, usd, useDisputes } from "@/lib/demo/disputes";
import { JOB_TYPE_LABEL } from "@/lib/demo/job-types";
import { useIndependentContracts } from "@/lib/independent/contracts";
import { useToast } from "@/lib/portal/toast";
import { DeclineDialog } from "./_components/DeclineDialog";
import { OfferCard } from "./_components/OfferCard";
import { SignCard } from "./_components/SignCard";
import { pretty } from "./_lib/terms";

/**
 * TB-072 / IN-084 — the offer that follows an evaluated trial, for a full-time role (salary, start
 * date and the benefits the Team Builder picked) or a part-time one (monthly rate, hours a week and
 * start date), signed or declined here.
 */
export default function ContractOffer({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { contracts, acceptConversion, declineConversion } = useIndependentContracts();
  const deal = useDeal();
  const disputes = useDisputes();
  const router = useRouter();
  const [declining, setDeclining] = useState(false);
  const [toast, setToast] = useToast();
  const contract = contracts.find((c) => c.slug === slug);
  const offer = deal?.roleSlug === slug ? deal.conversion : undefined;
  if (!contract || !offer) notFound();
  const back = `/independent/contracts/${contract.slug}`;
  /** Still out: sent, and its start date hasn't gone by — one nobody answered by then expired (TB-072). */
  const open = offer.status === "sent" && lifecycleOfDeal(deal)?.phase === "offer";
  const expired = offer.status === "expired" || (offer.status === "sent" && !open);
  /** What accepting releases — nothing once the trial was ended and settled, less while a dispute holds part of it. */
  const escrow = escrowOf(deal, disputes);
  const releasing = escrow ? Math.max(0, escrow.held - escrow.onHold) : 0;

  const kind = JOB_TYPE_LABEL[offer.type];

  const accept = () => {
    const r = acceptConversion();
    setToast(r.ok ? `You're ${kind.toLowerCase()} with ${contract.company}` : r.error, r.ok ? "success" : "danger");
  };
  const decline = (reason: string) => {
    const r = declineConversion(reason);
    setDeclining(false);
    setToast(r.ok ? `${kind} offer declined` : r.error, r.ok ? "success" : "danger");
  };

  return (
    <Page title={`${kind} offer`} heading="modal" onClose={() => router.push(back)} padded={false}>
      <div className="mx-auto flex w-[1080px] flex-col gap-10 pt-10 pb-20">
        <OfferIntro kind={kind} company={contract.company} offer={offer} open={open} expired={expired} releasing={releasing} ended={deal?.contract?.ended} />

        <div className="flex items-start gap-6">
          <OfferCard offer={offer} contract={contract} />

          <SignCard contract={contract} offer={offer} open={open} expired={expired} back={back} onAccept={accept} onDecline={() => setDeclining(true)} />
        </div>
      </div>

      <DeclineDialog open={declining} kind={kind} manager={contract.manager} onClose={() => setDeclining(false)} onDecline={decline} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/**
 * The heading: when the offer was sent and, while it's open, what accepting does and by when — or,
 * withdrawn or expired, why it can't be accepted any more.
 */
function OfferIntro({ kind, company, offer, open, expired, releasing, ended }: { kind: string; company: string; offer: ConversionOffer; open: boolean; expired: boolean; releasing: number; ended?: boolean }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[32px] leading-[1.5] font-semibold text-black" style={{ fontVariationSettings: '"opsz" 14' }}>
          {kind} offer from {company}
        </h2>
        <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">
          Sent {offer.sent}.
          {open && ` Accepting turns your trial into a ${kind.toLowerCase()} engagement${releasing > 0 ? `, and the ${usd(releasing)} still in the trial's escrow is released to you` : ""}. Answer by ${pretty(offer.start)}, its start date, or it expires.`}
        </p>
      </div>
      {offer.status === "withdrawn" && <InfoBanner tone="warn">{ended ? `${company} ended the contract, so this offer was withdrawn and can no longer be accepted.` : `${company} withdrew this offer, so it can no longer be accepted.`}</InfoBanner>}
      {expired && <InfoBanner tone="warn">{`This offer expired on ${pretty(offer.start)}, its start date, without an answer, so it can no longer be accepted. ${company} can send you a new one.`}</InfoBanner>}
    </>
  );
}
