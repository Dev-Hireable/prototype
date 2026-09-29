"use client";

import { notFound, useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { ICONS } from "@/components/icons";
import { ApplicationProposalDialog } from "@/components/independent/application-proposal-dialog";
import { Button, Card, Chip, JobBadge, Modal, Page, PipelineTracker, Toast } from "@/components/portal/ui";
import { BreadcrumbBack } from "@/components/portal/nav";
import { FactStrip } from "@/components/portal/page-parts";
import { TaskPlanList } from "@/components/portal/tasks/task-plan";
import { WorkStyleMatch } from "@/components/portal/work-style-match";
import { useDeal } from "@/lib/demo/deal";
import { jobFacts } from "@/lib/contract/job-types";
import { PAIR } from "@/lib/demo/live";
import { storedWorkStyle } from "@/lib/demo/work-style";
import { useJobView, type JobView } from "@/lib/independent/job-view";
import { useApplications } from "@/lib/independent/applications";
import { useIndependentAccount } from "@/lib/independent/account";
import { useToast } from "@/lib/portal/toast";
import { ReturnNav } from "@/components/portal/return";
import { NextStep } from "./_components/next-step";
import type { InterviewActions, StepProps } from "./_lib/steps";

const Flag = ICONS.flag;
const Pin = ICONS.location;
const Business = ICONS.business;

const H2 = "text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink-deep";

/**
 * An application: the role beside an action card that changes with the pipeline stage, from the
 * interview invite through the proposal to the offer.
 */
export default function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { workStyle } = useIndependentAccount();
  const { applications, setStage, declineInterview } = useApplications();
  const app = applications.find((a) => a.id === id);
  if (!app) notFound();
  const job = useJobView(app);
  /** `?proposal=1` — a deep link that lands with the proposal dialog open. */
  const search = useSearchParams();
  const deal = useDeal();
  /** TB-106 — the Team Builder's note and the version it applies to, off the shared engagement. */
  const live = deal?.roleSlug === app.roleSlug ? deal : null;
  const [declining, setDeclining] = useState(false);
  /** TB-106 — their proposal as the Team Builder reads it, with its history (the same dialog). */
  const [reading, setReading] = useState(() => search.get("proposal") === "1");
  const [toast, setToast] = useToast();

  const accept = () => {
    // IN-070 names this status "Interview confirmed".
    setStage(app.id, "invite_accepted", { label: "Interview confirmed", tone: "info", meta: `${job.interview.date} · ${job.interview.time}` });
    setToast("Invitation accepted");
  };

  return (
    <Page title="My Applications" nav={<ReturnNav fallback={<BreadcrumbBack href="/independent/jobs/applications">Back to pipeline</BreadcrumbBack>} />}>
      <div className="flex flex-col gap-10 pb-14">
        {/* pt-4: both columns start 24px down, where the right one sticks (below the scroller's top
            fade), so they line up at rest and the right one doesn't jump when it catches. */}
        <div className="flex items-start justify-center gap-6 pt-4">
          <RoleColumn job={job} tasksShared={job.type === "trial" && app.stage !== "applied"} mine={workStyle} />
          <ActionColumn app={app} job={job} live={live} onAccept={accept} onDecline={() => setDeclining(true)} onToast={setToast} onReadProposal={() => setReading(true)} />
        </div>
      </div>

      <DeclineInvitation
        open={declining}
        company={job.company}
        onClose={() => setDeclining(false)}
        onDecline={() => {
          declineInterview(app.id);
          setDeclining(false);
          setToast("Invitation declined");
        }}
      />
      {/* The same Review proposal dialog the Team Builder opens: one layout, one history, both sides. */}
      <ApplicationProposalDialog app={app} open={reading} onClose={() => setReading(false)} onToast={setToast} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** The role, as its job post has it: what it is, its pay and terms, a trial's tasks, the skills and how the company works. */
function RoleColumn({ job, tasksShared, mine }: { job: JobView; tasksShared: boolean; mine: readonly number[] }) {
  /** The company's quiz answers, from the Team Builder's portal — what its badges say about how it works. */
  const theirs = job.company === PAIR.team.company ? storedWorkStyle("team") : [];
  return (
    <div className="flex w-[576px] flex-col gap-4">
      <Card className="flex min-h-[223px] flex-col gap-4 p-4">
        <h2 className="font-display text-[24px] leading-[1.5] font-semibold tracking-[0.2px] text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
          {job.title}
        </h2>
        <p className="flex items-center gap-2 text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
          <JobBadge type={job.type} /> {job.posted}
        </p>
        <p className="text-[14px] leading-[1.2] tracking-[0.2px] whitespace-pre-line text-ink">{job.description}</p>
      </Card>
      <Card className="flex flex-col gap-4 p-4">
        <h3 className={H2}>Budget &amp; details</h3>
        {/* The job page's facts strip, so a role reads the same wherever it's shown. */}
        <FactStrip size="sm" cells={jobFacts({ type: job.type, pay: job.budget, duration: job.duration, hours: job.hours, level: job.experience })} />
      </Card>
      {/* TB-025 — a trial's tasks are shared once the company has matched with the talent or invited them. */}
      {tasksShared && (
        <Card className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1">
            <h3 className={H2}>Trial tasks</h3>
            <p className="text-[13px] leading-[1.4] text-ink-2">{job.company} set these for the trial. Your proposal prices them, and they become its task list once the offer is signed.</p>
          </div>
          <TaskPlanList tasks={job.tasks} empty={`${job.company} hasn't listed the trial's tasks yet. They're agreed in the proposal, before any offer.`} />
        </Card>
      )}
      <Card className="flex flex-col gap-6 p-4">
        <h3 className={H2}>Skills</h3>
        <div className="flex flex-wrap gap-2">
          {job.skills.map((s) => (
            <Chip key={s} size="sm">
              {s}
            </Chip>
          ))}
        </div>
      </Card>
      {/* Where the work-style chart was: the company's Workplace Tags beside the talent's, trait by trait. */}
      <Card className="flex flex-col gap-4 p-4">
        <h3 className={H2}>Work style</h3>
        <WorkStyleMatch company={job.company} theirs={theirs} mine={mine} />
      </Card>
    </div>
  );
}

/**
 * The action column: the stage's next step, the proposal as the Team Builder reads it, where the
 * pipeline has got to, the note sent with the application, the company, and flagging the post.
 */
function ActionColumn({ app, job, live, onReadProposal, ...actions }: StepProps & InterviewActions & { onReadProposal: () => void }) {
  const proposal = live?.proposal;
  return (
    // The next step stays in view while the application scrolls — 24px down, below the scroller's
    // top fade (ScrollFade's RAMP), so the fade never thins it.
    <div className="sticky top-6 flex w-[385px] shrink-0 flex-col gap-4">
      <NextStep app={app} job={job} live={live} {...actions} />

      {/* TB-106 — the proposal they sent, as the Team Builder reads it, with its history: every
          version, revision request and note. At every stage from the first submission on. */}
      {proposal && live && (
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className={H2}>Your proposal</h3>
            <span className="text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
              v{proposal.version} · {proposal.sent}
            </span>
          </div>
          <p className="text-[14px] leading-[1.4] tracking-[0.2px] text-ink-2">See it as {job.company} does, with every version, revision request and note in its history.</p>
          <Button size="lg" onClick={onReadProposal}>
            View proposal &amp; history
          </Button>
        </Card>
      )}

      <PipelineTracker stage={app.stage} mode="milestone" />

      {live?.note && (
        <Card className="flex flex-col gap-2 p-4">
          <h3 className={H2}>Your note with the application</h3>
          <p className="text-[14px] leading-[1.4] tracking-[0.2px] text-ink-2">{live.note}</p>
        </Card>
      )}

      <AboutCompany job={job} />
      <button type="button" onClick={() => actions.onToast("Thanks — our team will review this post")} className="flex items-center gap-2 text-[14px] font-medium text-accent-ink">
        <Flag size={20} aria-hidden /> Flag job post
      </button>
    </div>
  );
}

/** The company behind the role: its name, where it is and what it does. */
function AboutCompany({ job }: { job: JobView }) {
  const initials = job.company.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Card className="flex flex-col gap-4 p-4">
      <h3 className={H2}>About the team builder</h3>
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#5b5bd6] text-[15px] leading-none font-semibold text-white">{initials}</span>
        <span className="min-w-0 truncate text-[15px] leading-[1.3] font-semibold text-ink">{job.company}</span>
      </div>
      <ul className="flex flex-col gap-2.5 text-[14px] leading-[1.3] text-ink">
        {job.location && (
          <li className="flex items-center gap-2">
            <Pin size={18} aria-hidden className="shrink-0 text-ink-2" /> {job.location}
          </li>
        )}
        {job.industry && (
          <li className="flex items-center gap-2">
            <Business size={18} aria-hidden className="shrink-0 text-ink-2" /> {job.industry}
          </li>
        )}
      </ul>
    </Card>
  );
}

/** Declining the interview invitation: the company gets a note, and the application stays open. */
function DeclineInvitation({ open, company, onClose, onDecline }: { open: boolean; company: string; onClose: () => void; onDecline: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      tone="danger"
      title="Decline this invitation?"
      description={`${company} gets a note and your application stays open. You can ask to reschedule from Messages.`}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="danger" onClick={onDecline}>
            Decline
          </Button>
        </>
      }
    />
  );
}
