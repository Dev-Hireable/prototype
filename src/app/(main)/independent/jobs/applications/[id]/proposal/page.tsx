"use client";

import { use } from "react";
import { Button, InfoBanner, LinkButton, Modal, Page, Toast } from "@/components/portal/ui";
import { TaskPlanList } from "@/components/portal/tasks/task-plan";
import type { Deal } from "@/lib/demo/deal";
import type { JobView } from "@/lib/independent/job-view";
import type { Application } from "@/lib/independent/data";
import { JobPost } from "./_components/job-post";
import { ProposalSteps } from "./_components/proposal-steps";
import { introLine, pageTitle } from "./_lib/proposal";
import { useProposalWizard } from "./_lib/wizard";

/**
 * IN-072 — the proposal: rate, cover letter, review and send (or revise). The Team Builder sets the
 * work — a trial's tasks are in its job post, and every role's go into the offer — so the proposal
 * is the talent's terms and pitch for it: the trial's tasks are shown alongside, read-only, to price
 * against.
 */
export default function ProposalWizard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const wizard = useProposalWizard(id);
  const { app, job, revise, reviewOnly, open, sent, back, close } = wizard;
  const trial = job.type === "trial";

  /** The trial's tasks as its Team Builder set them — what the rate is for. */
  const trialTasks = trial ? <TaskPlanList tasks={job.tasks} empty={`${job.company} hasn't listed the trial's tasks yet. They're agreed in the proposal, before any offer.`} /> : null;

  // Not once it has just been sent: the stage has moved on, and the confirmation belongs on top of the form.
  if (!reviewOnly && !open && !sent) return <NothingToSubmit stage={app.stage} company={job.company} back={back} onClose={close} />;

  return (
    <Page title={pageTitle(revise, reviewOnly, trial)} heading="modal" onClose={close} padded={false}>
      <div className="mx-auto flex w-[720px] flex-col gap-10 pt-10 pb-20">
        <Intro job={job} revise={revise} reviewOnly={reviewOnly} previous={wizard.previous} />
        <Notes live={wizard.live} revise={revise} reviewOnly={reviewOnly} company={job.company} fromDraft={wizard.form.fromDraft} />

        {!reviewOnly && <ProposalSteps wizard={wizard} trialTasks={trialTasks} />}

        {/* The job post, beside the steps that write the proposal (Review & send shows it inside the proposal). */}
        {reviewOnly ? (
          <JobPost job={job} back={back} trialTasks={trialTasks} startHref={open ? `/independent/jobs/applications/${app.id}/proposal` : undefined} />
        ) : (
          wizard.step < 2 && <JobPost job={job} back={back} trialTasks={null} />
        )}
      </div>

      <SentDialog open={sent} company={job.company} onClose={close} />
      <Toast toast={wizard.toast} onClose={() => wizard.setToast(null)} />
    </Page>
  );
}

/** When no proposal is asked for right now: where the application stands, and the way back to it. */
function NothingToSubmit({ stage, company, back, onClose }: { stage: Application["stage"]; company: string; back: string; onClose: () => void }) {
  return (
    <Page title="Submit proposal" heading="modal" onClose={onClose} padded={false}>
      <div className="mx-auto flex w-[720px] flex-col gap-4 pt-10">
        <InfoBanner tone="warn">
          {stage === "proposal_sent"
            ? `Your proposal is with ${company} — you can revise it if they ask for changes.`
            : stage === "offer_received" || stage === "offer_accepted" || stage === "hired"
              ? `Your proposal has been answered with an offer, so there is nothing to submit here.`
              : `There is no proposal to submit right now — ${company} asks for one after the interview.`}
        </InfoBanner>
        <LinkButton size="lg" href={back} className="self-start">
          Back to application
        </LinkButton>
      </div>
    </Page>
  );
}

/** The heading, and a line on what this page is for: a new proposal, a revision, or the role's details alone. */
function Intro({ job, revise, reviewOnly, previous }: { job: JobView; revise: boolean; reviewOnly: boolean; previous?: { version: number; sent: string } }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-[32px] leading-[1.5] font-semibold text-black" style={{ fontVariationSettings: '"opsz" 14' }}>
        {reviewOnly ? job.title : `${revise ? "Revise proposal" : "Proposal"} — ${job.title}`}
      </h2>
      <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">{introLine(job, revise, reviewOnly, previous)}</p>
    </div>
  );
}

/** Above the steps: the Team Builder's note on a revision or on the request, and a draft picked up. */
function Notes({ live, revise, reviewOnly, company, fromDraft }: { live: Deal | null; revise: boolean; reviewOnly: boolean; company: string; fromDraft: boolean }) {
  const revision = revise ? live?.revision?.note : undefined;
  const request = revise ? undefined : live?.proposalRequest?.note;
  return (
    <>
      {revision && (
        <InfoBanner tone="warn">
          <span className="font-semibold">Revision requested to Proposal v{live?.proposal?.version ?? 1}:</span> {revision}
        </InfoBanner>
      )}
      {request && (
        <InfoBanner>
          <span className="font-semibold">Note from {company}:</span> {request}
        </InfoBanner>
      )}
      {fromDraft && !reviewOnly && <InfoBanner>Picked up from the draft you saved.</InfoBanner>}
    </>
  );
}

/** The confirmation once it's sent: the company has been told, and the pipeline shows it as submitted. */
function SentDialog({ open, company, onClose }: { open: boolean; company: string; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Proposal submitted"
      description={`${company} has been notified. Your proposal now shows as Proposal submitted in the pipeline.`}
      footer={
        <Button size="lg" variant="primary" onClick={onClose}>
          Back to application
        </Button>
      }
    />
  );
}
