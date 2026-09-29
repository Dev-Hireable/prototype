"use client";

import { notFound, useRouter } from "next/navigation";
import { use, useState } from "react";
import { InfoBanner, Page } from "@/components/portal/ui";
import { durationDays, trialMonths } from "@/lib/portal/dates";
import { useDeal } from "@/lib/demo/deal";
import type { DealOffer } from "@/lib/demo/deal";
import { rateAmount } from "@/lib/demo/disputes";
import { PAIR } from "@/lib/demo/live";
import { useJobView } from "@/lib/independent/job-view";
import { useApplications } from "@/lib/independent/applications";
import { OfferCard } from "./_components/offer-card";
import { AcceptedDialog, DeclineDialog } from "./_components/offer-dialogs";
import { SignCard } from "./_components/sign-card";

/**
 * Everything on it is the offer the Team Builder sent: the terms, the escrow funded for them, their
 * name and photo. It carries what the proposal settled — the tasks, the dates, the pay — so the
 * talent signs it or declines it; changes go back through the proposal, before an offer (IN-073).
 */
export default function Offer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { applications, setStage, declineOffer } = useApplications();
  const app = applications.find((a) => a.id === id);
  const router = useRouter();
  const deal = useDeal();
  const job = useJobView(app ?? { id, roleSlug: "", title: "", company: "", match: 0, submitted: "", stage: "applied" });
  /** Shows the confirmation; the acceptance itself is already saved by the time it opens. */
  const [justAccepted, setJustAccepted] = useState(false);
  const [declining, setDeclining] = useState(false);
  const sent = app && deal?.roleSlug === app.roleSlug ? deal.offer : undefined;
  if (!app || !sent) notFound();
  const back = `/independent/jobs/applications/${app.id}`;
  const from = job.company;
  const contact = PAIR.team.name;
  const months = trialMonths(durationDays(job.duration));
  /** The whole trial is paid from the escrow funded with the offer. */
  const total = sent.deposit?.escrow ?? rateAmount(sent.rate) * months;

  const accept = () => {
    // IN-074 — accepting is saved on the click; the confirmation only reports it.
    setStage(app.id, "hired", { label: "Waiting to start", tone: "ok" });
    setJustAccepted(true);
  };
  const decline = (reason: string) => {
    setDeclining(false);
    // IN-075 — the reason reaches the Team Builder; it used to be dropped here.
    declineOffer(app.id, reason);
  };

  return (
    <Page title="Offer" heading="modal" onClose={() => router.push(back)} padded={false}>
      <div className="mx-auto flex w-[1080px] flex-col gap-10 pt-10 pb-20">
        <OfferIntro from={from} sent={sent} />

        <div className="flex items-start gap-6">
          <OfferCard job={job} sent={sent} from={from} total={total} />
          <SignCard sent={sent} from={from} contact={contact} contractHref={`/independent/contracts/${app.roleSlug}`} onAccept={accept} onDecline={() => setDeclining(true)} />
        </div>
      </div>

      <AcceptedDialog open={justAccepted} sent={sent} from={from} total={total} onClose={() => router.push(back)} onOpenContract={() => router.push(`/independent/contracts/${app.roleSlug}`)} />
      <DeclineDialog open={declining} contact={contact} onClose={() => setDeclining(false)} onDecline={decline} />
    </Page>
  );
}

/** The heading, and — once it's withdrawn — why it can't be accepted. */
function OfferIntro({ from, sent }: { from: string; sent: DealOffer }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[32px] leading-[1.5] font-semibold text-black" style={{ fontVariationSettings: '"opsz" 14' }}>
          Offer from {from}
        </h2>
        <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">
          Review the full proposal, sign the contract, and confirm your offer
        </p>
      </div>
      {sent.status === "withdrawn" && <InfoBanner tone="warn">{from} withdrew this offer, so it can no longer be accepted. Your proposal is still with them.</InfoBanner>}
    </>
  );
}
