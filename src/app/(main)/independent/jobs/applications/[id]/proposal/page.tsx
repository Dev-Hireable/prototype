"use client";

import { use } from "react";
import { InfoBanner, LinkButton, Modal, Page, Toast } from "@/components/portal/ui";
import type { Deal } from "@/lib/demo/deal";
import type { JobView } from "@/lib/independent/job-view";
import type { Application } from "@/lib/independent/data";
import { JobPost } from "./_components/job-post";
import { ProposalSteps } from "./_components/proposal-steps";
import { pageTitle, proposalHeading, revisionLine } from "./_lib/proposal";
import { useProposalWizard } from "./_lib/wizard";

/**
 * IN-072 — the proposal: pay, cover letter, review and send (or revise). The Team Builder sets the
 * work, and a trial's tasks are shared with the offer, once the proposal is accepted — so the
 * proposal is the talent's terms and pitch: the pay (and a part-time role's hours), the day they'd
 * start, and the cover letter.
 */
export default function ProposalWizard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const wizard = useProposalWizard(id);
  const { app, job, revise, open, sent, back, close } = wizard;

  // Not once it has just been sent: the stage has moved on, and the confirmation belongs on top of the form.
  if (!open && !sent) return <NothingToSubmit stage={app.stage} company={job.company} back={back} onClose={close} />;

  return (
    <Page title={pageTitle(revise)} heading="modal" onClose={close} padded={false}>
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-10 pt-10 pb-20">
        <Intro job={job} revise={revise} previous={wizard.previous} />
        <Notes live={wizard.live} revise={revise} company={job.company} fromDraft={wizard.form.fromDraft} />

        <ProposalSteps wizard={wizard} />

        {/* The role it answers, beside the steps that write the proposal (Review & send shows it inside the proposal). */}
        {wizard.step < 2 && <JobPost job={job} back={back} />}
      </div>

      <SentDialog open={sent} company={job.company} back={back} onClose={close} />
      <Toast toast={wizard.toast} onClose={() => wizard.setToast(null)} />
    </Page>
  );
}

/** When no proposal is asked for right now: where the application stands, and the way back to it. */
function NothingToSubmit({ stage, company, back, onClose }: { stage: Application["stage"]; company: string; back: string; onClose: () => void }) {
  return (
    <Page title="Submit proposal" heading="modal" onClose={onClose} padded={false}>
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 pt-10">
        <InfoBanner tone="warn">
          {stage === "proposal_sent"
            ? `Your proposal is with ${company}. You can revise it if they ask for changes.`
            : stage === "offer_received" || stage === "offer_accepted" || stage === "hired"
              ? `Your proposal has been answered with an offer, so there is nothing to submit here.`
              : `There is no proposal to submit right now. ${company} asks for one after the interview.`}
        </InfoBanner>
        <LinkButton size="lg" href={back} className="self-start">
          Back to application
        </LinkButton>
      </div>
    </Page>
  );
}

/** The heading, and on a revision the version it revises. */
function Intro({ job, revise, previous }: { job: JobView; revise: boolean; previous?: { version: number; sent: string } }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-[32px] leading-[1.5] font-semibold text-black" style={{ fontVariationSettings: '"opsz" 14' }}>
        {proposalHeading(job.title, revise)}
      </h2>
      {revise && <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">{revisionLine(previous)}</p>}
    </div>
  );
}

/** Above the steps: the Team Builder's note on a revision or on the request, and a draft picked up. */
function Notes({ live, revise, company, fromDraft }: { live: Deal | null; revise: boolean; company: string; fromDraft: boolean }) {
  const revision = revise ? live?.revision?.note : undefined;
  const request = revise ? undefined : live?.proposalRequest?.note;
  return (
    <>
      {revision && (
        <InfoBanner tone="warn">
          <span className="font-semibold">{company} asked for a change:</span> {revision}
        </InfoBanner>
      )}
      {request && (
        <InfoBanner>
          <span className="font-semibold">Note from {company}:</span> {request}
        </InfoBanner>
      )}
      {fromDraft && <InfoBanner>Picked up from the draft you saved.</InfoBanner>}
    </>
  );
}

/** The confirmation once it's sent: the company has been told, and the thread links the proposal from now on. */
function SentDialog({ open, company, back, onClose }: { open: boolean; company: string; back: string; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Proposal sent"
      description={`${company} has been notified. You can open it any time from your Messages thread.`}
      footer={
        <>
          <LinkButton size="lg" href="/independent/messages">
            Open messages
          </LinkButton>
          <LinkButton size="lg" variant="primary" href={back}>
            Back to application
          </LinkButton>
        </>
      }
    />
  );
}
