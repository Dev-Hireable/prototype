"use client";

import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { ApplicationProposalDialog } from "@/components/independent/ApplicationProposalDialog";
import { Button, Card, Chip, JobBadge, LinkButton, Modal, Page, PipelineTracker, StatusDot, Toast, useToast } from "@/components/independent/ui";
import { BreadcrumbBack } from "@/components/portal/nav";
import { FactStrip } from "@/components/portal/PageParts";
import { TaskPlanList } from "@/components/portal/tasks/TaskPlan";
import { Tip } from "@/components/portal/Tip";
import { WorkStyleMatch } from "@/components/portal/WorkStyleMatch";
import { useDeal } from "@/lib/demo/deal";
import { JOB_TYPE_LABEL, jobFacts } from "@/lib/demo/job-types";
import { PAIR } from "@/lib/demo/live";
import { storedWorkStyle } from "@/lib/demo/work-style";
import { useJobView } from "@/lib/independent/job-view";
import { useDemo } from "@/lib/independent/store";
import { ReturnNav, useWithReturn } from "@/components/portal/return";

const Flag = ICONS.flag;
const Copy = ICONS.copy;
const Review = ICONS.notes;
const Video = ICONS.video;
const Calendar = ICONS.calendar;
const Clock = ICONS.clock;
const Pin = ICONS.location;
const Business = ICONS.business;

const H2 = "text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink-deep";

/**
 * Figma "Interviews / Invited · Awaiting confirm · Invitation accepted · Incoming · Completed · Declined"
 * and "Proposals and offers / Proposal requested · Revision requested · Offer …": 576px role column + 385px
 * action column (gap 24), cards p 16 / gap 24; the action card changes with the pipeline stage.
 */
export default function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { applications, setStage, declineInterview, workStyle } = useDemo();
  const app = applications.find((a) => a.id === id);
  if (!app) notFound();
  const job = useJobView(app);
  const withReturn = useWithReturn();
  /** `?proposal=1` — a deep link that lands with the proposal dialog open. */
  const search = useSearchParams();
  const deal = useDeal();
  /** TB-106 — the Team Builder's note and the version it applies to, off the shared engagement. */
  const live = deal?.roleSlug === app.roleSlug ? deal : null;
  const revisionNote = live?.revision;
  const proposalVersion = live?.proposal?.version;
  const [declining, setDeclining] = useState(false);
  /** TB-106 — their proposal as the Team Builder reads it, with its history (the same dialog). */
  const [reading, setReading] = useState(() => search.get("proposal") === "1");
  const proposal = live?.proposal;
  const [toast, setToast] = useToast();
  const declined = app.status?.label === "Interview declined";
  /** TB-037 — the Team Builder called it off; the application stays open for a new slot. */
  const cancelled = app.status?.label === "Interview cancelled";
  const revision = !!revisionNote || app.status?.label === "Revision requested";
  const offerUpdated = app.status?.label === "Offer updated";
  /** IN-075 / TB-105 — the offer's answer, or the Team Builder taking it back. */
  const offerStatus = live?.offer?.status;
  /** TB-107 — declined, with the reason they gave; it used to keep reading "reviewing your proposal". */
  const proposalDeclined = live?.proposalDeclined;
  /** TB-044 — dropped by the company, without declining the proposal: it says so, and there's nothing left to do. */
  const notMovingForward = !!live?.dropped && !proposalDeclined && !live.contract;
  /** TB-025 — a trial's tasks are shared once the company has matched with the talent or invited them. */
  const tasksShared = job.type === "trial" && app.stage !== "applied";
  /** The company's quiz answers, from the Team Builder's portal — what its badges say about how it works. */
  const theirs = job.company === PAIR.team.company ? storedWorkStyle("team") : [];
  const initials = job.company.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const copyLink = () => {
    navigator.clipboard?.writeText(job.interview.link);
    setToast("Link copied");
  };

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
            {tasksShared && (
              <Card className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-1">
                  <h3 className={H2}>Trial tasks</h3>
                  <p className="text-[13px] leading-[1.4] text-ink-2">{job.company} set these for the trial. Your proposal prices them, and they become its task list once the offer is signed.</p>
                </div>
                <TaskPlanList tasks={job.tasks} empty={`${job.company} hasn't listed the trial's tasks yet — they're set in the offer.`} />
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
              <WorkStyleMatch company={job.company} theirs={theirs} mine={workStyle} />
            </Card>
          </div>

          {/* The next step stays in view while the application scrolls — 24px down, below the scroller's
              top fade (ScrollFade's RAMP), so the fade never thins it. */}
          <div className="sticky top-6 flex w-[385px] shrink-0 flex-col gap-4">
            {/* Stage-specific action card — or, once the company has dropped the application (TB-044), one
                card saying so: there's nothing left to act on, and nothing reads as still in review. */}
            {notMovingForward ? (
              <Card className="flex flex-col gap-2 p-4">
                <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{job.company} isn&apos;t moving forward</p>
                <p className="text-[14px] leading-[1.4] tracking-[0.2px] text-ink-2">They&apos;ve closed your application for this role. It stays here in your history, and you&apos;re free to apply to other roles.</p>
              </Card>
            ) : (
              <>
              {(app.stage === "invited" || app.stage === "invite_accepted") && (declined || cancelled) && (
                <Card className="flex flex-col gap-2 p-4">
                  <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{declined ? "You declined this interview" : "Interview cancelled"}</p>
                  <p className="text-[14px] leading-[1.4] tracking-[0.2px] text-ink-2">
                    {declined ? `${job.company} was told, and your application stays open. If they offer another time, it shows up here.` : `${job.company} cancelled the ${job.interview.date} slot. Your application stays open — a new time shows up here.`}
                  </p>
                </Card>
              )}

              {(app.stage === "invited" || app.stage === "invite_accepted") && !declined && !cancelled && (
                <Card className="flex flex-col gap-4 p-4">
                  {/* IN-070 — where the invitation stands, in place of a sentence saying so. */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-[15px] leading-[1.3] font-semibold text-ink">
                      <Video size={20} aria-hidden className="text-primary" /> Interview
                    </span>
                    <StatusDot tone={app.stage === "invite_accepted" ? "ok" : "warn"}>{app.stage === "invite_accepted" ? "Confirmed" : "Awaiting your reply"}</StatusDot>
                  </div>
                  <ul className="flex flex-col gap-2.5 text-[14px] leading-[1.3] text-ink">
                    <li className="flex items-center gap-2.5">
                      <Calendar size={18} aria-hidden className="shrink-0 text-ink-2" /> {job.interview.date}
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Clock size={18} aria-hidden className="shrink-0 text-ink-2" /> {job.interview.time}
                    </li>
                    {live?.interview?.format && (
                      <li className="flex items-center gap-2.5">
                        <Video size={18} aria-hidden className="shrink-0 text-ink-2" /> {live.interview.format}
                      </li>
                    )}
                  </ul>
                  {/* IN-070 — the link only appears once the invitation has been accepted. */}
                  {app.stage === "invite_accepted" ? (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[12.5px] leading-[1.3] font-medium text-ink-2">Meeting link</span>
                      <div className="flex items-center gap-1 rounded-lg bg-surface-2 py-1 pr-1 pl-3">
                        <span className="min-w-0 flex-1 truncate text-[13.5px] leading-[1.3] text-ink">{job.interview.link || "Not shared yet"}</span>
                        {job.interview.link && (
                          <Tip label="Copy link">
                            <button type="button" onClick={copyLink} aria-label="Copy meeting link" className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-2 transition hover:bg-white hover:text-ink focus-visible:outline-2 focus-visible:outline-primary">
                              <Copy size={16} aria-hidden />
                            </button>
                          </Tip>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-lg bg-surface-2 px-3 py-2.5 text-[13px] leading-[1.4] text-ink-2">The meeting link is shared once you accept the invitation.</p>
                  )}
                  {live?.interview?.note && (
                    <div className="flex flex-col gap-1 text-[14px] leading-[1.4]">
                      <span className="font-semibold text-ink">Note from {job.company}</span>
                      <span className="text-ink-2">{live.interview.note}</span>
                    </div>
                  )}
                  {app.stage === "invited" ? (
                    // IN-070: hidden once the status moves past Awaiting Confirmation.
                    <div className="flex flex-col gap-2">
                      <Button size="lg" variant="primary" onClick={accept}>
                        Accept invitation
                      </Button>
                      <Button size="lg" variant="danger" onClick={() => setDeclining(true)}>
                        Decline
                      </Button>
                    </div>
                  ) : (
                    // IN-071 — only on a confirmed interview, and it opens the meeting itself.
                    <Button
                      size="lg"
                      variant="primary"
                      onClick={() => {
                        if (!job.interview.link) return setToast("No meeting link yet — ask the Team Builder to share one.");
                        window.open(job.interview.link, "_blank", "noopener");
                      }}
                    >
                      <Video size={18} aria-hidden /> Join call
                    </Button>
                  )}
                </Card>
              )}

              {app.stage === "interviewed" && (
                <Card className="flex flex-col gap-2 p-4">
                  <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Interview completed</p>
                  <p className="text-[14px] leading-[1.4] tracking-[0.2px] text-ink-2">{job.company} will ask for your proposal if they want to move ahead. You get a notification when they do.</p>
                </Card>
              )}

              {revision && (app.stage === "proposal_requested" || app.stage === "proposal_sent") && (
                <Card className="flex flex-col gap-4 p-4">
                  <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Revision requested to Proposal v{proposalVersion ?? 1}</p>
                  {revisionNote && <p className="rounded-lg bg-[#fff3cc] p-4 text-[14px] leading-[1.2] tracking-[0.2px] whitespace-pre-line text-[#8e6f12] [overflow-wrap:anywhere]">{revisionNote.note}</p>}
                  <LinkButton size="lg" variant="primary" href={`/independent/jobs/applications/${app.id}/proposal?revise=1`}>
                    Revise proposal
                  </LinkButton>
                </Card>
              )}

              {/* IN-072: only once a proposal has been requested — finishing the interview isn't an
                  invitation to propose; the Team Builder's request (TB-103) is. */}
              {!revision && app.stage === "proposal_requested" && (
                <Card className="flex flex-col gap-4 p-4">
                  {/* TB-103 — the note sent with the request, beside the button that answers it. */}
                  {live?.proposalRequest?.note && (
                    <p className="rounded-lg bg-surface-2 p-3 text-[14px] leading-[1.4] whitespace-pre-line text-ink [overflow-wrap:anywhere]">
                      <span className="block text-[12.5px] font-semibold text-ink-2">Note from {job.company}</span>
                      {live.proposalRequest.note}
                    </p>
                  )}
                  <div className="flex flex-col gap-2">
                    <LinkButton size="lg" variant="primary" href={`/independent/jobs/applications/${app.id}/proposal`}>
                      Submit proposal
                    </LinkButton>
                    <Link href={`/independent/jobs/applications/${app.id}/proposal?review=1`} className="flex items-center gap-2 text-[14px] font-medium text-accent-ink">
                      <Review size={20} aria-hidden /> {job.type === "trial" ? "Review the trial's tasks" : "Review the role"}
                    </Link>
                  </div>
                </Card>
              )}

              {proposalDeclined ? (
                <Card className="flex flex-col gap-2 p-4">
                  <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{job.company} declined your proposal</p>
                  <p className="text-[14px] leading-[1.4] tracking-[0.2px] text-ink-2">{proposalDeclined.reason ? `Their reason: ${proposalDeclined.reason}.` : "They did not give a reason."} They are not moving forward on this role.</p>
                </Card>
              ) : (
                !revision &&
                app.stage === "proposal_sent" && (
                  <Card className="flex flex-col gap-4 p-4">
                    {offerStatus === "withdrawn" && <p className="rounded-lg bg-surface-2 p-3 text-[13px] leading-[1.4] text-ink-2">{job.company} withdrew the offer they sent. Your proposal is still with them, and they can send a new one.</p>}
                    <Button size="lg" disabled>
                      Proposal sent
                    </Button>
                    <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">{job.company} is reviewing your proposal. You will hear back within 5 working days.</p>
                  </Card>
                )
              )}

              {(app.stage === "offer_received" || app.stage === "offer_accepted" || app.stage === "hired") && (
                <Card className="flex flex-col gap-2 p-4">
                  {app.stage === "offer_received" && offerStatus === "declined" ? (
                    <>
                      <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">You declined this offer</p>
                      <p className="text-[14px] leading-[1.4] tracking-[0.2px] text-ink-2">
                        {job.company} was told{live?.offer?.declineReason ? `, with your reason: “${live.offer.declineReason}”` : ""}. If they send a new offer, it shows up here.
                      </p>
                      <LinkButton size="lg" href={`/independent/jobs/applications/${app.id}/offer`}>
                        View declined offer
                      </LinkButton>
                    </>
                  ) : app.stage === "offer_received" ? (
                    <LinkButton size="lg" variant="primary" href={`/independent/jobs/applications/${app.id}/offer${offerUpdated ? "?updated=1" : ""}`}>
                      {offerUpdated ? "Review updated offer" : "Review offer"}
                    </LinkButton>
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
              )}

              {(app.stage === "applied" || app.stage === "matched") && (
                <Card className="flex flex-col gap-2 p-4">
                  <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{app.stage === "matched" ? "You are matched" : "Application received"}</p>
                  <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">
                    {app.stage === "matched" ? `${job.company} can now invite you to an interview.` : `${job.company} is reviewing applications.`}
                  </p>
                </Card>
              )}

              </>
            )}

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
                <Button size="lg" onClick={() => setReading(true)}>
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
            <button type="button" onClick={() => setToast("Thanks — our team will review this post")} className="flex items-center gap-2 text-[14px] font-medium text-accent-ink">
              <Flag size={20} aria-hidden /> Flag job post
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={declining}
        onClose={() => setDeclining(false)}
        tone="danger"
        title="Decline this invitation?"
        description={`${job.company} gets a note and your application stays open. You can ask to reschedule from Messages.`}
        footer={
          <>
            <Button size="lg" onClick={() => setDeclining(false)}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant="danger"
              onClick={() => {
                declineInterview(app.id);
                setDeclining(false);
                setToast("Invitation declined");
              }}
            >
              Decline
            </Button>
          </>
        }
      />
      {/* The same Review proposal dialog the Team Builder opens: one layout, one history, both sides. */}
      <ApplicationProposalDialog app={app} open={reading} onClose={() => setReading(false)} onToast={setToast} />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
