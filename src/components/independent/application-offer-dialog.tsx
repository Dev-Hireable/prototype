"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Agreement, DeclineOfferDialog, OfferDivider, OfferFrom, OfferTerms, Signature } from "@/components/portal/offer-parts";
import { TaskPlanList } from "@/components/portal/tasks/task-plan";
import { Button, Card, InfoBanner, LinkButton, Modal } from "@/components/portal/ui";
import { useDeal, type DealOffer } from "@/lib/demo/deal";
import { PAIR } from "@/lib/demo/live";
import { useIndependentAccount } from "@/lib/independent/account";
import { useApplications } from "@/lib/independent/applications";
import type { Application } from "@/lib/independent/data";
import { useJobView, type JobView } from "@/lib/independent/job-view";
import { expiryOf, offerRows, offerTotal } from "@/lib/independent/offer-terms";
import { signatureMatches } from "@/lib/portal/names";

/** Which of the offer's dialogs shows: the offer itself, the decline confirmation, or the word that it's accepted. */
type Step = "offer" | "decline" | "accepted";

/**
 * IN-074 / IN-075 — the trial offer, over its application: everything on it is what the Team
 * Builder sent (the terms the proposal settled, the tasks, the escrow, their name and photo), and
 * the talent signs it with their account's name and accepts it, or declines it. One dialog shows at
 * a time: declining asks in the offer's place, and accepting says so in it.
 */
export function ApplicationOfferDialog({ app, open, onClose }: { app: Application; open: boolean; onClose: () => void }) {
  const { acceptOffer, declineOffer } = useApplications();
  const { profile } = useIndependentAccount();
  const job = useJobView(app);
  const deal = useDeal();
  const router = useRouter();
  const [step, setStep] = useState<Step>("offer");
  const sent = deal?.roleSlug === app.roleSlug ? deal.offer : undefined;
  if (!sent) return null;
  const from = job.company;
  const contractHref = `/independent/contracts/${app.roleSlug}`;
  const close = () => {
    setStep("offer");
    onClose();
  };
  const accept = (name: string) => {
    // IN-074 — saved on the click, signature and all; the next dialog only reports it.
    acceptOffer(app.id, name);
    setStep("accepted");
  };
  return (
    <>
      <Modal open={open && step === "offer"} onClose={close} title={`Offer from ${from}`} width={1100} closeButton>
        {sent.status === "withdrawn" && <InfoBanner tone="warn">{from} withdrew this offer, so it can no longer be accepted. Your proposal is still with them.</InfoBanner>}
        <div className="flex items-start gap-6 max-lg:flex-col max-lg:items-stretch">
          <OfferCard job={job} sent={sent} from={from} />
          <SignCard sent={sent} from={from} fullName={profile.name} contractHref={contractHref} onAccept={accept} onDecline={() => setStep("decline")} />
        </div>
      </Modal>
      <AcceptedDialog open={open && step === "accepted"} from={from} onClose={close} onOpenContract={() => router.push(contractHref)} />
      <DeclineOfferDialog
        open={open && step === "decline"}
        onClose={() => setStep("offer")}
        // IN-075 — the reason reaches the Team Builder; the offer then reads as declined.
        onDecline={(reason) => {
          declineOffer(app.id, reason);
          setStep("offer");
        }}
        title="Decline this offer?"
        description={`${PAIR.team.name} will be notified, with your reason if you add one. You can't accept this offer after declining.`}
        placeholder="For example rate, timing or scope."
      />
    </>
  );
}

/** The offer itself: the role, its terms, the tasks the Team Builder set, and the services agreement. */
function OfferCard({ job, sent, from }: { job: JobView; sent: DealOffer; from: string }) {
  const trial = sent.type === "trial";
  return (
    <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-col gap-4 px-6 pt-6 text-ink">
        <h3 className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px]">{job.title}</h3>
        {job.description && <p className="text-[14px] leading-[1.2] tracking-[0.2px]">{job.description}</p>}
      </div>
      <OfferDivider />
      <div className="flex flex-col gap-4 px-6 pb-6">
        <OfferTerms rows={offerRows(sent, job, offerTotal(sent))} />
      </div>
      <OfferDivider />
      <div className="flex flex-col gap-4 px-6 pb-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Tasks</h3>
          {sent.tasks.length > 0 && (
            <p className="text-[13px] leading-[1.4] text-ink-2">
              {from} set these. {trial ? "The trial's" : "The contract's"} shared task list starts from them when you sign, each due week counted from the start date.
            </p>
          )}
        </div>
        <TaskPlanList tasks={sent.tasks} start={sent.start} lastDay={trial ? sent.end : undefined} empty={`No tasks yet. ${from} adds them once you start.`} />
      </div>
      <OfferDivider />
      <div className="flex flex-col gap-6 px-6 pb-6">
        <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Services Agreement</h3>
        <Agreement type={sent.type} title="Services Agreement" />
      </div>
    </Card>
  );
}

/**
 * The side card: who the offer is from, and signing it — the account's name typed and the tick, how
 * long the offer stands, and Accept or Decline — or the answer it already has, with the signature it
 * was accepted under.
 */
function SignCard({ sent, from, fullName, contractHref, onAccept, onDecline }: { sent: DealOffer; from: string; fullName: string; contractHref: string; onAccept: (name: string) => void; onDecline: () => void }) {
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  // Read back from the shared engagement, so an answer given earlier still shows after a reload.
  const open = sent.status === "sent";
  const expires = expiryOf(sent.sent);
  /** Why Accept waits, as its tip: the account's name, then the tick. */
  const waiting = !signatureMatches(name, fullName) ? "Type your full name as on your account to accept." : !agree ? "Tick the agreement to accept." : undefined;
  // Offers accepted before the signature was kept read as the account's name, with no date.
  const signed = sent.status === "accepted" ? (sent.signed ?? { name: fullName }) : undefined;
  return (
    <Card className="flex w-[360px] shrink-0 flex-col divide-y divide-[#e5e5e5] max-lg:w-full">
      <OfferFrom name={PAIR.team.name} company={from} />
      <div className="flex flex-col gap-4 p-6">
        <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Sign contract</h3>
        <Signature name={name} onName={setName} agree={agree} onAgree={setAgree} disabled={!open} fullName={fullName} signed={signed} />
        {open && expires && <InfoBanner>This offer expires on {expires}</InfoBanner>}
        <Answer status={sent.status} waiting={waiting} contractHref={contractHref} onAccept={() => onAccept(name)} onDecline={onDecline} />
      </div>
    </Card>
  );
}

/** Accept once it's signed, or Decline — or the answer it already has, with the way into the contract once accepted. */
function Answer({ status, waiting, contractHref, onAccept, onDecline }: { status: DealOffer["status"]; waiting?: string; contractHref: string; onAccept: () => void; onDecline: () => void }) {
  if (status === "declined" || status === "withdrawn")
    return (
      <Button size="lg" disabled>
        {status === "declined" ? "Offer declined" : "Offer withdrawn"}
      </Button>
    );
  if (status === "accepted")
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
  return (
    <>
      <Button size="lg" variant="primary" disabled={!!waiting} title={waiting} onClick={onAccept}>
        Accept
      </Button>
      <Button size="lg" variant="danger" onClick={onDecline}>
        Decline
      </Button>
    </>
  );
}

/** Accepted: the Team Builder has been told, and the contract is ready, one button away. */
function AcceptedDialog({ open, from, onClose, onOpenContract }: { open: boolean; from: string; onClose: () => void; onOpenContract: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Offer accepted"
      description={`${from} has been notified. Your contract is ready.`}
      footer={
        <Button size="lg" variant="primary" onClick={onOpenContract}>
          Open contract
        </Button>
      }
    />
  );
}
