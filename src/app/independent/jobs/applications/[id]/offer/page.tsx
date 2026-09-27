"use client";

import { notFound, useRouter } from "next/navigation";
import { use, useState } from "react";
import { Button, InfoBanner, Page, Toast } from "@/components/independent/ui";
import { Callout } from "@/components/portal/Callout";
import { OfferChanges } from "@/components/portal/OfferChanges";
import { openRequest, revisionOf, type OfferRequest } from "@/lib/contract/negotiation";
import { durationDays, trialMonths } from "@/lib/demo/dates";
import { useDeal } from "@/lib/demo/deal";
import type { DealOffer } from "@/lib/demo/deal";
import { rateAmount } from "@/lib/demo/disputes";
import { PAIR } from "@/lib/demo/live";
import type { Application } from "@/lib/independent/data";
import { useJobView, type JobView } from "@/lib/independent/job-view";
import { useApplications } from "@/lib/independent/applications";
import { acceptOffer, withdrawOfferRequest } from "@/lib/independent/offer";
import { useToast } from "@/lib/portal/toast";
import { OfferCard } from "./_components/OfferCard";
import { AcceptedDialog, DeclineDialog } from "./_components/OfferDialogs";
import { RequestChanges } from "./_components/RequestChanges";
import { SignCard } from "./_components/SignCard";

/**
 * Figma "Offer · unsigned / · signed / Offer accepted · confirm / Decline offer · modal / Offer updated".
 * Frame: px 140, pt 40, pb 80, gap 40, content 1080 wide; sections p 24 separated by 48px dividers.
 *
 * Everything on it is the offer the Team Builder sent: the terms, the escrow funded for them, their
 * name and photo. It's one revision of the offer (IN-092): what changed since the last is shown, the
 * talent can ask for changes instead of signing, and they sign only the revision they read — one
 * that arrives while they're reading has to be read before it can be signed.
 */
export default function Offer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { applications, declineOffer } = useApplications();
  const app = applications.find((a) => a.id === id);
  const deal = useDeal();
  const job = useJobView(app ?? { id, roleSlug: "", title: "", company: "", match: 0, submitted: "", stage: "applied" });
  const sent = app && deal?.roleSlug === app.roleSlug ? deal.offer : undefined;
  if (!app || !sent) notFound();
  return <OfferView app={app} sent={sent} job={job} declineOffer={declineOffer} />;
}

/** The offer, its changes and the side card to sign it, with the dialogs that confirm, decline or ask for changes. */
function OfferView({ app, sent, job, declineOffer }: { app: Application; sent: DealOffer; job: JobView; declineOffer: (id: string, reason: string) => void }) {
  const router = useRouter();
  /** Shows the confirmation; the acceptance itself is already saved by the time it opens. */
  const [justAccepted, setJustAccepted] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [toast, setToast] = useToast();
  const seen = useSeenRevision(sent);
  const back = `/independent/jobs/applications/${app.id}`;
  const from = job.company;
  const contact = PAIR.team.name;
  const revision = revisionOf(sent);
  const request = openRequest(sent);
  const updated = revision > 1 && sent.status === "sent";
  const months = trialMonths(durationDays(job.duration));
  /** The whole trial is paid from the escrow funded with the offer. */
  const total = sent.deposit?.escrow ?? rateAmount(sent.rate) * months;
  const blocked = blockedBy(seen, request, revision);

  const accept = () => {
    // IN-074 — the revision read, or nothing: one sent meanwhile is refused with the reason.
    const done = acceptOffer(seen.revision);
    if (!done.ok) return setToast(done.error, "danger");
    setJustAccepted(true);
  };
  const decline = (reason: string) => {
    setDeclining(false);
    // IN-075 — the reason reaches the Team Builder.
    declineOffer(app.id, reason);
  };
  const withdraw = () => {
    const done = withdrawOfferRequest(revision);
    setToast(done.ok ? `Request withdrawn — revision ${revision} stands as ${from} sent it` : done.error, done.ok ? "success" : "danger");
  };

  return (
    <Page title="Offer" heading="modal" onClose={() => router.push(back)} padded={false}>
      <div className="mx-auto flex w-[1080px] flex-col gap-10 pt-10 pb-20">
        <div className="flex flex-col gap-4">
          <OfferIntro from={from} sent={sent} updated={updated} revision={revision} />
          <Notices seen={seen} request={request} revision={revision} from={from} contact={contact} onWithdraw={withdraw} />
        </div>
        {sent.status === "sent" && <OfferChanges offer={sent} from={from} viewer="independent" />}

        <div className="flex items-start gap-6">
          <OfferCard job={job} sent={sent} from={from} total={total} />
          <SignCard sent={sent} from={from} contact={contact} updated={updated} revision={revision} blocked={blocked} canRequest={!request} contractHref={`/independent/contracts/${app.roleSlug}`} onAccept={accept} onDecline={() => setDeclining(true)} onRequest={() => setRequesting(true)} />
        </div>
      </div>

      <AcceptedDialog open={justAccepted} sent={sent} from={from} total={total} onClose={() => router.push(back)} onOpenContract={() => router.push(`/independent/contracts/${app.roleSlug}`)} />
      <DeclineDialog open={declining} contact={contact} onClose={() => setDeclining(false)} onDecline={decline} />
      <RequestChanges open={requesting} offer={sent} revision={revision} company={from} contact={contact.split(" ")[0]} days={durationDays(job.duration)} onClose={() => setRequesting(false)} onSent={(m) => setToast(m)} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

type Seen = ReturnType<typeof useSeenRevision>;

/** Why signing waits: a newer revision to read first, or the talent's own open request for changes. */
function blockedBy(seen: Seen, request: OfferRequest | undefined, revision: number): string | undefined {
  if (seen.stale) return `Read revision ${revision} first — it arrived while you were reading revision ${seen.revision}.`;
  if (request) return `You asked for changes to revision ${request.revision}. Withdraw your request to sign it as it stands.`;
  return undefined;
}

/** A revision that arrived while they read, and their own request for changes — with the way out of each. */
function Notices({ seen, request, revision, from, contact, onWithdraw }: { seen: Seen; request: OfferRequest | undefined; revision: number; from: string; contact: string; onWithdraw: () => void }) {
  return (
    <>
      {seen.stale && (
        <Callout tone="warn" action={<Button size="sm" onClick={seen.catchUp}>Read revision {revision}</Button>}>
          {from} sent revision {revision} while you were reading revision {seen.revision}. What changed is below.
        </Callout>
      )}
      {request && (
        <Callout action={<Button size="sm" onClick={onWithdraw}>Withdraw request</Button>}>
          You asked {contact.split(" ")[0]} for changes to revision {request.revision} on {request.at}. They answer each in the next revision.
        </Callout>
      )}
    </>
  );
}

/**
 * The revision this reader has in front of them. It's taken when the offer first shows; a newer one
 * that arrives while they read makes it `stale` until they `catchUp` — so the one they sign is the one
 * they read, never one that changed under them.
 */
function useSeenRevision(offer: DealOffer | undefined) {
  const [seen, setSeen] = useState<number | null>(null);
  const now = offer ? revisionOf(offer) : null;
  if (seen === null && now !== null) setSeen(now);
  const revision = seen ?? now ?? 1;
  return { revision, stale: now !== null && revision !== now && offer?.status === "sent", catchUp: () => setSeen(now) };
}

/** The heading — a revised offer says which revision it is and that the earlier one no longer applies — and, once it's withdrawn, why it can't be accepted. */
function OfferIntro({ from, sent, updated, revision }: { from: string; sent: DealOffer; updated: boolean; revision: number }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[32px] leading-[1.5] font-semibold text-black" style={{ fontVariationSettings: '"opsz" 14' }}>
          {updated ? `Updated offer from ${from}` : `Offer from ${from}`}
        </h2>
        <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">
          {updated ? `Revision ${revision}, sent ${sent.updated}. What changed is below; the earlier revision no longer applies.` : "Review the full proposal, sign the contract, and confirm your offer"}
        </p>
      </div>
      {sent.status === "withdrawn" && <InfoBanner tone="warn">{from} withdrew this offer, so it can no longer be accepted. Your proposal is still with them.</InfoBanner>}
    </>
  );
}
