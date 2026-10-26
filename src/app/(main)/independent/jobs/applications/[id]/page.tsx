"use client";

import { notFound, useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { ICONS } from "@/components/icons";
import { ApplicationOfferDialog } from "@/components/independent/application-offer-dialog";
import { ApplicationProposalDialog } from "@/components/independent/application-proposal-dialog";
import { AboutCompany } from "@/components/independent/about-company";
import { RescheduleDialog } from "@/components/independent/reschedule-dialog";
import { LockedTasks } from "@/components/portal/tasks/locked-tasks";
import { Button, Card, Chip, JobBadge, Modal, Page, StatusDot, Toast } from "@/components/portal/ui";
import { BreadcrumbBack } from "@/components/portal/nav";
import { FactStrip } from "@/components/portal/page-parts";
import { TaskPlanList } from "@/components/portal/tasks/task-plan";
import { WorkStyleMatch } from "@/components/portal/work-style-match";
import { useDeal } from "@/lib/demo/deal";
import { jobFacts } from "@/lib/contract/job-types";
import { PAIR } from "@/lib/demo/live";
import { storedWorkStyle } from "@/lib/demo/work-style";
import { trialTasksShared, useJobView, type JobView } from "@/lib/independent/job-view";
import { useApplications } from "@/lib/independent/applications";
import { useIndependentAccount } from "@/lib/independent/account";
import { useInterviewTime } from "@/lib/independent/interview-time";
import { useToast, type SetToast } from "@/lib/portal/toast";
import { ReturnNav } from "@/components/portal/return";
import { NextStep } from "./_components/next-step";
import { stageBadgeOf, type InterviewActions, type StepProps } from "./_lib/steps";

const Flag = ICONS.flag;
const Pin = ICONS.location;

/**
 * Below lg the two columns become one, and their cards take turns in it: the role and the stage it's
 * at, what to do next, what the talent sent, then the role's pay, tasks, skills and work style, and
 * last the company and the way to flag the role. Each column is `max-lg:contents` there, so its cards
 * are the one column's own items, ordered by these.
 */
const ORDER = {
  role: "max-lg:order-1",
  next: "max-lg:order-2",
  proposal: "max-lg:order-3",
  note: "max-lg:order-4",
  pay: "max-lg:order-5",
  tasks: "max-lg:order-6",
  skills: "max-lg:order-7",
  style: "max-lg:order-8",
  company: "max-lg:order-9",
  flag: "max-lg:order-10",
} as const;

/**
 * An application: the role beside an action card that changes with the pipeline stage, from the
 * interview invite through the proposal to the offer.
 */
export default function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { workStyle } = useIndependentAccount();
  const { applications, withdrawnApplications, setStage } = useApplications();
  /** A withdrawn application still opens, from Closed (#132). */
  const app = applications.find((a) => a.id === id) ?? withdrawnApplications.find((a) => a.id === id);
  if (!app) notFound();
  const job = useJobView(app);
  /** `?proposal=1` — a deep link that lands with the proposal dialog open. */
  const search = useSearchParams();
  const deal = useDeal();
  /** TB-106 — the Team Builder's note and the version it applies to, off the shared engagement. A withdrawn one has none left. */
  const live = deal?.roleSlug === app.roleSlug && applications.includes(app) ? deal : null;
  const [declining, setDeclining] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  /** TB-106 — their proposal as the Team Builder reads it, with its history (the same dialog). */
  const [reading, setReading] = useState(() => search.get("proposal") === "1");
  /** IN-074 — the offer, over the application; `?offer=1` (an old link to its page, a thread entry) lands with it open. */
  const [offering, setOffering] = useState(() => search.get("offer") === "1");
  const [toast, setToast] = useToast();

  const accept = () => {
    // IN-070 names this status "Interview confirmed".
    setStage(app.id, "invite_accepted", { label: "Interview confirmed", tone: "info", slot: job.interview });
    setToast("Invitation accepted");
  };

  return (
    <Page title="My Applications" nav={<ReturnNav fallback={<BreadcrumbBack href="/independent/jobs/applications">Back to pipeline</BreadcrumbBack>} />}>
      <div className="flex flex-col gap-10 pb-14">
        {/* pt-4: both columns start 24px down, where the right one sticks (below the scroller's top
            fade), so they line up at rest and the right one doesn't jump when it catches. Below lg
            there's one column: the two columns' cards interleave in it (ORDER). */}
        <div className="flex items-start justify-center gap-6 pt-4 max-lg:flex-col max-lg:items-stretch max-lg:gap-4">
          <RoleColumn job={job} stage={stageBadgeOf(app)} tasksShared={trialTasksShared(app.stage) && !app.closed} mine={workStyle} />
          <ActionColumn app={app} job={job} live={live} onAccept={accept} onDecline={() => setDeclining(true)} onReschedule={() => setRescheduling(true)} onToast={setToast} onReadProposal={() => setReading(true)} onReviewOffer={() => setOffering(true)} />
        </div>
      </div>

      <InvitationDialogs appId={app.id} job={job} declining={declining} rescheduling={rescheduling} onDeclining={setDeclining} onRescheduling={setRescheduling} onToast={setToast} />
      {/* The same Review proposal dialog the Team Builder opens: one layout, one history, both sides. */}
      <ApplicationProposalDialog app={app} open={reading} onClose={() => setReading(false)} />
      <ApplicationOfferDialog app={app} open={offering} onClose={() => setOffering(false)} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** Answering the interview invitation other than with Accept: declining it, or asking for a new time. */
function InvitationDialogs({ appId, job, declining, rescheduling, onDeclining, onRescheduling, onToast }: {
  appId: string;
  job: JobView;
  declining: boolean;
  rescheduling: boolean;
  onDeclining: (open: boolean) => void;
  onRescheduling: (open: boolean) => void;
  onToast: SetToast;
}) {
  const { declineInterview, requestReschedule } = useApplications();
  const clock = useInterviewTime();
  return (
    <>
      <DeclineInvitation
        open={declining}
        onClose={() => onDeclining(false)}
        onDecline={() => {
          declineInterview(appId);
          onDeclining(false);
          onToast("Invitation declined");
        }}
        onReschedule={() => {
          onDeclining(false);
          onRescheduling(true);
        }}
      />
      <RescheduleDialog
        open={rescheduling}
        company={job.company}
        when={clock.mine(job.interview)}
        onClose={() => onRescheduling(false)}
        onSend={(when, note) => {
          requestReschedule(appId, when, note, clock.viewer);
          onToast(`New time sent to ${job.company}`);
        }}
      />
    </>
  );
}

/**
 * The role, as its job post has it: the stage the application is at, what the role is, its pay and
 * terms, a trial's tasks, the skills and how the company works.
 */
function RoleColumn({ job, stage, tasksShared, mine }: { job: JobView; stage: ReturnType<typeof stageBadgeOf>; tasksShared: boolean; mine: readonly number[] }) {
  /** The company's quiz answers, from the Team Builder's portal — what its tags say about how it works. */
  const theirs = job.company === PAIR.team.company ? storedWorkStyle("team") : [];
  return (
    <div className="flex w-[576px] min-w-0 flex-col gap-4 max-lg:contents">
      {/* As tall as the next step beside it; alone in a column, as tall as what it says. */}
      <Card className={`flex flex-col gap-4 p-4 lg:min-h-[223px] ${ORDER.role}`}>
        {/* Where the pipeline tracker was: the stage, as one badge beside the title. */}
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-[24px] leading-[1.5] font-semibold tracking-[0.2px] text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
            {job.title}
          </h2>
          {/* data-tour: the application's tour points at where it stands and at the next step (@/lib/portal/tours). */}
          <span data-tour="application-stage" className="mt-1.5 shrink-0">
            <StatusDot tone={stage.tone}>{stage.label}</StatusDot>
          </span>
        </div>
        <p className="flex items-center gap-2 text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
          <JobBadge type={job.type} /> {job.posted}
        </p>
        <p className="text-[14px] leading-[1.2] tracking-[0.2px] whitespace-pre-line text-ink">{job.description}</p>
      </Card>
      <Card title="Pay & details" className={`flex flex-col gap-4 p-4 ${ORDER.pay}`}>
        {/* The job page's facts strip, so a role reads the same wherever it's shown. */}
        <FactStrip size="sm" cells={jobFacts({ type: job.type, pay: job.budget, duration: job.duration, hours: job.hours, level: job.experience })} />
      </Card>
      {/* TB-025 — a trial's tasks are shared once the talent's proposal is accepted (the offer); until then, how many. */}
      {job.type === "trial" && (
        <Card title="Trial tasks" sub={tasksShared && `${job.company} set these for the trial. They become its task list once you sign the offer.`} className={`flex flex-col gap-4 p-4 ${ORDER.tasks}`}>
          {tasksShared ? <TaskPlanList tasks={job.tasks} empty={`${job.company} hasn't listed the trial's tasks yet.`} /> : <LockedTasks company={job.company} count={job.tasks.length} />}
        </Card>
      )}
      <Card title="Skills" className={`flex flex-col gap-6 p-4 ${ORDER.skills}`}>
        <div className="flex flex-wrap gap-2">
          {job.skills.map((s) => (
            <Chip key={s} size="sm">
              {s}
            </Chip>
          ))}
        </div>
      </Card>
      {/* Where the work-style chart was: the company's Workplace Tags beside the talent's, trait by trait. */}
      <Card title="Work style" className={`flex flex-col gap-4 p-4 ${ORDER.style}`}>
        <WorkStyleMatch company={job.company} theirs={theirs} mine={mine} />
      </Card>
    </div>
  );
}

/**
 * The action column: the stage's next step, the proposal as the Team Builder reads it, the note
 * sent with the application, the company, and flagging the role. (The stage itself is the badge by
 * the role's title, where a pipeline tracker used to stand here.)
 */
function ActionColumn({ app, job, live, onReadProposal, onReviewOffer, ...actions }: StepProps & InterviewActions & { onReadProposal: () => void; onReviewOffer: () => void }) {
  const proposal = live?.proposal;
  return (
    // The next step stays in view while the application scrolls — 24px down, below the scroller's
    // top fade (ScrollFade's RAMP), so the fade never thins it.
    <div className="sticky top-6 flex w-[385px] shrink-0 flex-col gap-4 max-lg:contents">
      <div data-tour="application-step" className={`flex flex-col gap-4 ${ORDER.next}`}>
        <NextStep app={app} job={job} live={live} onReviewOffer={onReviewOffer} {...actions} />
      </div>

      {/* TB-106 — the proposal they sent, as the Team Builder reads it, opened over the page. At
          every stage from the first submission on. */}
      {proposal && live && (
        <Card
          title="Your proposal"
          aside={
            <span className="shrink-0 text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
              v{proposal.version} · {proposal.sent}
            </span>
          }
          className={`flex flex-col gap-3 p-4 ${ORDER.proposal}`}
        >
          {/* A finger gets a tap 45px tall on the link without the card moving. */}
          <button type="button" onClick={onReadProposal} className="self-start text-[14px] font-medium text-accent-ink hover:underline focus-visible:outline-2 focus-visible:outline-primary pointer-coarse:-my-3 pointer-coarse:py-3">
            View proposal
          </button>
        </Card>
      )}

      {live?.note && (
        <Card title="Your note with the application" className={`flex flex-col gap-2 p-4 ${ORDER.note}`}>
          <p className="text-[14px] leading-[1.4] tracking-[0.2px] text-ink-2">{live.note}</p>
        </Card>
      )}

      <JobCompany job={job} className={ORDER.company} />
      {/* As wide as its words in the one column too, not a full-width strip that flags on any tap
          beside it; a finger gets a tap 45px tall without the line moving. */}
      <button
        type="button"
        onClick={() => actions.onToast("Thanks. Our team will review this role.")}
        className={`flex items-center gap-2 text-[14px] font-medium text-accent-ink max-lg:self-start pointer-coarse:-my-3 pointer-coarse:py-3 ${ORDER.flag}`}
      >
        <Flag size={20} aria-hidden /> Flag role
      </button>
    </div>
  );
}

/** The company behind the role: the same block as the role page's, its name and industry and where it is. */
function JobCompany({ job, className = "" }: { job: JobView; className?: string }) {
  const initials = job.company.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Card title="About the Team Builder" className={`flex flex-col gap-4 p-4 ${className}`}>
      <AboutCompany name={job.company} initials={initials} industry={job.industry} facts={[{ icon: Pin, text: job.location }]} />
    </Card>
  );
}

/**
 * Declining the interview invitation: the company gets a note, and the application stays open but
 * goes no further until a new slot is agreed. If it's only the time, asking for another is one click.
 */
function DeclineInvitation({ open, onClose, onDecline, onReschedule }: { open: boolean; onClose: () => void; onDecline: () => void; onReschedule: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      tone="danger"
      title="Decline this invitation?"
      description="Can't make it? Ask for another time, or decline. Your application stays open either way."
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={onReschedule}>
            Ask for a new time
          </Button>
          <Button size="lg" variant="danger" onClick={onDecline}>
            Decline
          </Button>
        </>
      }
    />
  );
}
