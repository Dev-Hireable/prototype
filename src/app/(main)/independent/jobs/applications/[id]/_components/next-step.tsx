import type { ReactNode } from "react";
import { Button, Card, LinkButton } from "@/components/portal/ui";
import { useWithReturn } from "@/components/portal/return";
import { JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import type { Application } from "@/lib/independent/data";
import type { JobView } from "@/lib/independent/job-view";
import { useInterviewTime } from "@/lib/independent/interview-time";
import { proposalSetupNote, useIdVerification } from "@/lib/independent/kyc";
import { useWallet } from "@/lib/independent/wallet";
import { slotOffset } from "@/lib/portal/dates";
import type { InterviewActions, StepProps } from "../_lib/steps";
import { InterviewCard } from "./interview-card";

/**
 * The stage's action card — or, once the company has dropped the application (TB-044) or the talent
 * withdrew it, one card saying so: there's nothing left to act on, and nothing reads as still in review.
 */
export function NextStep({ app, job, live, onReviewOffer, ...actions }: StepProps & InterviewActions & { onReviewOffer: () => void }) {
  // #132 — withdrawn: kept under Closed, with the engagement behind it gone.
  if (app.closed && !live) return <Status title="You withdrew this application">{`${job.company} was told. It stays here in your history.`}</Status>;
  // TB-044 — dropped by the company, without declining the proposal: it says so, and there's nothing left to do.
  if (live?.dropped && !live.proposalDeclined && !live.contract) {
    return <Status title={`${job.company} isn't moving forward`}>They&apos;ve closed your application for this role. It stays here in your history, and you&apos;re free to apply to other roles.</Status>;
  }
  return (
    <>
      <InterviewStep app={app} job={job} live={live} {...actions} />
      <ProposalStep app={app} job={job} live={live} />
      {(app.stage === "offer_received" || app.stage === "offer_accepted" || app.stage === "hired") && <OfferCard app={app} job={job} live={live} onReviewOffer={onReviewOffer} />}

      {(app.stage === "applied" || app.stage === "matched") && (
        <Card className="flex flex-col gap-2 p-4">
          <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{app.stage === "matched" ? "You are matched" : "Application received"}</p>
          <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">{app.stage === "matched" ? `${job.company} can now invite you to an interview.` : `${job.company} is reviewing applications.`}</p>
        </Card>
      )}
    </>
  );
}

/** A short card: what happened, what it means for the application, and the one thing to do about it. */
function Status({ title, children, action }: { title: string; children: string; action?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{title}</p>
      <p className="text-[14px] leading-[1.4] tracking-[0.2px] text-ink-2">{children}</p>
      {action && <div className="mt-2 flex flex-col">{action}</div>}
    </Card>
  );
}

/** The interview stages: the invitation to answer or join, a declined or cancelled one, or one that's done. */
function InterviewStep({ app, job, live, ...actions }: StepProps & InterviewActions) {
  const clock = useInterviewTime();
  if (app.stage === "interviewed") return <Status title="Interview completed">{`${job.company} will ask for your proposal if they want to move ahead. You get a notification when they do.`}</Status>;
  if (app.stage !== "invited" && app.stage !== "invite_accepted") return null;
  const declined = app.status?.label === "Interview declined";
  /** TB-037 — the Team Builder called it off; the application stays open for a new slot. */
  const cancelled = app.status?.label === "Interview cancelled";
  /** IN-093 — waiting on the Team Builder to confirm the time they asked for. */
  const requested = live?.interview?.outcome === "reschedule" ? live.interview.requested : undefined;
  // Asked for in their own clock; the Team Builder's is the one the slot it replaces was booked in.
  if (requested)
    return (
      <Status title="New time requested" action={<Button size="lg" onClick={actions.onReschedule}>Ask for a different time</Button>}>
        {`You asked ${job.company} for ${clock.both(requested, slotOffset(job.interview.when, job.interview.offset))}. Once they confirm it, the meeting link shows up here.`}
      </Status>
    );
  if (!declined && !cancelled) return <InterviewCard app={app} job={job} live={live} {...actions} />;
  return (
    <Status title={declined ? "You declined this interview" : "Interview cancelled"} action={declined ? <Button size="lg" onClick={actions.onReschedule}>Ask for a new time</Button> : undefined}>
      {declined ? `${job.company} was told, and your application stays open. Ask for a time that works, or wait for them to offer one.` : `${job.company} cancelled the ${clock.mine(job.interview)} slot. Your application stays open, and a new time shows up here.`}
    </Status>
  );
}

/** The proposal stages: requested, sent back for a revision, sent, or declined. */
function ProposalStep({ app, job, live }: StepProps) {
  const revision = !!live?.revision || app.status?.label === "Revision requested";
  /** TB-107 — declined, with the reason they gave; it used to keep reading "reviewing your proposal". */
  const proposalDeclined = live?.proposalDeclined;
  return (
    <>
      {revision && (app.stage === "proposal_requested" || app.stage === "proposal_sent") && (
        <Card className="flex flex-col gap-4 p-4">
          <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Revision requested to Proposal v{live?.proposal?.version ?? 1}</p>
          {live?.revision && <p className="rounded-lg bg-warn-bg p-4 text-[14px] leading-[1.2] tracking-[0.2px] whitespace-pre-line text-warn-ink [overflow-wrap:anywhere]">{live.revision.note}</p>}
          <LinkButton size="lg" variant="primary" href={`/independent/jobs/applications/${app.id}/proposal?revise=1`}>
            Revise proposal
          </LinkButton>
        </Card>
      )}

      {/* IN-072: only once a proposal has been requested — finishing the interview isn't an
          invitation to propose; the Team Builder's request (TB-103) is. */}
      {!revision && app.stage === "proposal_requested" && <ProposalRequest app={app} job={job} note={live?.proposalRequest?.note} />}

      {proposalDeclined ? (
        <Status title={`${job.company} declined your proposal`}>{`${proposalDeclined.reason ? `Their reason: ${proposalDeclined.reason}.` : "They did not give a reason."} They are not moving forward on this role.`}</Status>
      ) : (
        !revision &&
        app.stage === "proposal_sent" && (
          <Card className="flex flex-col gap-4 p-4">
            {live?.offer?.status === "withdrawn" && <p className="rounded-lg bg-surface-2 p-3 text-[13px] leading-[1.4] text-ink-2">{job.company} withdrew the offer they sent. Your proposal is still with them, and they can send a new one.</p>}
            <Button size="lg" disabled>
              Proposal sent
            </Button>
            <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">{job.company} is reviewing your proposal. You will be notified when they reply.</p>
          </Card>
        )
      )}
    </>
  );
}

/**
 * TB-103 — the request for a proposal: the note sent with it, beside the button that answers it, and
 * (IN-072) what's still to set up before a first proposal can go, said here rather than at the end.
 */
function ProposalRequest({ app, job, note }: { app: Application; job: JobView; note: string | undefined }) {
  const { payouts } = useWallet();
  const { verified } = useIdVerification();
  const setup = proposalSetupNote(payouts, verified);
  return (
    <Card className="flex flex-col gap-4 p-4">
      {note && (
        <p className="rounded-lg bg-surface-2 p-3 text-[14px] leading-[1.4] whitespace-pre-line text-ink [overflow-wrap:anywhere]">
          <span className="block text-[12.5px] font-semibold text-ink-2">Note from {job.company}</span>
          {note}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <LinkButton size="lg" variant="primary" href={`/independent/jobs/applications/${app.id}/proposal`}>
          Submit proposal
        </LinkButton>
        {setup && <p className="text-[13px] leading-[1.4] tracking-[0.2px] text-ink-2">{setup}</p>}
      </div>
    </Card>
  );
}

/**
 * IN-075 / TB-105 — the offer: open to review (over the page, `onReviewOffer`), declined, or signed
 * with its contract (and a post-trial offer after it).
 */
function OfferCard({ app, job, live, onReviewOffer }: StepProps & { onReviewOffer: () => void }) {
  const withReturn = useWithReturn();
  const received = app.stage === "offer_received";
  return (
    <Card className="flex flex-col gap-2 p-4">
      {received && live?.offer?.status === "declined" ? (
        <>
          <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">You declined this offer</p>
          <p className="text-[14px] leading-[1.4] tracking-[0.2px] text-ink-2">
            {job.company} was told{live.offer.declineReason ? `, with your reason: “${live.offer.declineReason}”` : ""}. If they send a new offer, it shows up here.
          </p>
          <Button size="lg" onClick={onReviewOffer}>
            View declined offer
          </Button>
        </>
      ) : received ? (
        <Button size="lg" variant="primary" onClick={onReviewOffer}>
          Review offer
        </Button>
      ) : (
        <>
          <Button size="lg" disabled>
            Offer accepted
          </Button>
          {/* IN-084 — the full-time or part-time offer that followed the trial, while it waits on an answer. */}
          {live?.conversion?.status === "sent" && (
            <LinkButton size="lg" variant="primary" href={`/independent/contracts/${app.roleSlug}/offer`}>
              Review {JOB_TYPE_LABEL[live.conversion.type].toLowerCase()} offer
            </LinkButton>
          )}
          <LinkButton size="lg" href={withReturn(`/independent/contracts/${app.roleSlug}`)}>
            Open contract
          </LinkButton>
        </>
      )}
    </Card>
  );
}
