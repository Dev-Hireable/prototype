"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use, useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { BackLink, Button, Card, Chip, JobBadge, KeyValue, LinkButton, Modal, Page, PipelineTracker, Toast, WorkStyleChart, useToast } from "@/components/independent/ui";
import { useDeal } from "@/lib/demo/deal";
import { useJobView } from "@/lib/independent/job-view";
import { useDemo } from "@/lib/independent/store";
import { ReturnNav, useWithReturn } from "@/components/portal/return";

const Flag = ICONS.flag;
const Copy = ICONS.copy;
const Review = ICONS.notes;

const H2 = "text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink-deep";

/**
 * Figma "Interviews / Invited · Awaiting confirm · Invitation accepted · Incoming · Completed · Declined"
 * and "Proposals and offers / Proposal requested · Revision requested · Offer …": 576px role column + 385px
 * action column (gap 24), cards p 16 / gap 24; the action card changes with the pipeline stage.
 */
export default function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { applications, setStage, workStyle } = useDemo();
  const app = applications.find((a) => a.id === id);
  if (!app) notFound();
  const job = useJobView(app);
  const withReturn = useWithReturn();
  const deal = useDeal();
  /** TB-106 — the Team Builder's note and the version it applies to, off the shared engagement. */
  const revisionNote = deal?.roleSlug === app.roleSlug ? deal.revision : undefined;
  const proposalVersion = deal?.roleSlug === app.roleSlug ? deal.proposal?.version : undefined;
  const [declining, setDeclining] = useState(false);
  const [toast, setToast] = useToast();
  const declined = app.status?.label === "Declined";
  const revision = !!revisionNote || app.status?.label === "Revision requested";
  const offerUpdated = app.status?.label === "Offer updated";

  const accept = () => {
    // IN-070 names this status "Interview confirmed".
    setStage(app.id, "invite_accepted", { label: "Interview confirmed", tone: "info", meta: `${job.interview.date} · ${job.interview.time}` });
    setToast("Invitation accepted");
  };

  return (
    <Page title="My Applications" nav={<ReturnNav fallback={<BackLink href="/independent/jobs/applications">Back to pipeline</BackLink>} />}>
      <div className="flex flex-col gap-10 pb-14">
        <div className="flex items-start justify-center gap-6">
          <div className="flex w-[576px] flex-col gap-4">
            <Card className="flex min-h-[223px] flex-col gap-4 p-4">
              <h2 className="font-display text-[24px] leading-[1.5] font-semibold tracking-[0.2px] text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
                {job.title}
              </h2>
              <p className="flex items-center gap-2 text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
                <JobBadge type={job.contract === "Trial" ? "trial" : "full-time"} /> {job.posted}
              </p>
              <p className="text-[14px] leading-[1.2] tracking-[0.2px] whitespace-pre-line text-ink">{job.description}</p>
            </Card>
            <Card className="flex flex-col gap-6 p-4">
              <h3 className={H2}>Budget &amp; details</h3>
              <div className="flex gap-2">
                <KeyValue label="Budget" value={job.budget} />
                <KeyValue label="Duration" value={job.duration} />
                <KeyValue label="Experience" value={job.experience} />
              </div>
            </Card>
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
            {job.workStyle && <WorkStyleChart builder={job.workStyle} independent={workStyle} match={app.match} />}
          </div>

          <div className="flex w-[385px] shrink-0 flex-col gap-4">
            {/* Stage-specific action card */}
            {(app.stage === "invited" || app.stage === "invite_accepted") && (
              <Card className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-2">
                  {declined ? (
                    <Button size="lg" disabled>
                      Declined
                    </Button>
                  ) : app.stage === "invited" ? (
                    <>
                      <Button size="lg" variant="primary" onClick={accept}>
                        Accept invitation
                      </Button>
                      <Button size="lg" onClick={() => setDeclining(true)}>
                        Decline
                      </Button>
                    </>
                  ) : (
                    // IN-070: hidden once the status moves past Awaiting Confirmation.
                    <p className="rounded-lg bg-surface-2 px-4 py-3 text-[13px] leading-[1.45] text-ink-2">Interview confirmed. The meeting link is below.</p>
                  )}
                </div>
                <dl className="flex flex-col gap-3 text-[14px] leading-[1.2] tracking-[0.2px]">
                  <div className="flex flex-col gap-1">
                    <dt className="font-semibold text-ink">Date:</dt>
                    <dd className="text-ink">{job.interview.date}</dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="font-semibold text-ink">Time:</dt>
                    <dd className="text-ink">{job.interview.time}</dd>
                  </div>
                  {/* IN-070 — the link only appears once the invitation has been accepted. */}
                  {app.stage === "invite_accepted" ? (
                    <div className="flex flex-col gap-2">
                      <dt className="font-semibold text-ink">Meeting link</dt>
                      <dd className="truncate rounded-lg bg-surface-2 px-4 py-3 text-ink-2">{job.interview.link}</dd>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <dt className="font-semibold text-ink">Meeting link</dt>
                      <dd className="rounded-lg bg-surface-2 px-4 py-3 text-ink-2">Shared once you accept the invitation.</dd>
                    </div>
                  )}
                </dl>
                {/* IN-071 — only on a confirmed interview, and it opens the meeting itself. */}
                {app.stage === "invite_accepted" && (
                  <Button
                    size="lg"
                    variant="primary"
                    onClick={() => {
                      if (!job.interview.link) return setToast("No meeting link yet — ask the Team Builder to share one.");
                      window.open(job.interview.link, "_blank", "noopener");
                    }}
                  >
                    Join call
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(job.interview.link);
                    setToast("Link copied");
                  }}
                  className="flex items-center gap-2 self-start text-[14px] font-medium text-accent-ink"
                >
                  <Copy size={20} aria-hidden /> Copy link
                </button>
              </Card>
            )}

            {revision && (app.stage === "proposal_requested" || app.stage === "proposal_sent") && (
              <Card className="flex flex-col gap-4 p-4">
                <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Revision requested to Proposal v{proposalVersion ?? 1}</p>
                {revisionNote && <p className="rounded-lg bg-[#fff3cc] p-4 text-[14px] leading-[1.2] tracking-[0.2px] text-[#8e6f12]">{revisionNote.note}</p>}
                <LinkButton size="lg" variant="primary" href={`/independent/jobs/applications/${app.id}/proposal?revise=1`}>
                  Revise proposal
                </LinkButton>
              </Card>
            )}

            {!revision && (app.stage === "interviewed" || app.stage === "proposal_requested") && (
              <Card className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-2">
                  <LinkButton size="lg" variant="primary" href={`/independent/jobs/applications/${app.id}/proposal`}>
                    Submit proposal
                  </LinkButton>
                  <Link href={`/independent/jobs/applications/${app.id}/proposal?review=1`} className="flex items-center gap-2 text-[14px] font-medium text-accent-ink">
                    <Review size={20} aria-hidden /> Review trial expectations
                  </Link>
                </div>
              </Card>
            )}

            {!revision && app.stage === "proposal_sent" && (
              <Card className="flex flex-col gap-4 p-4">
                <Button size="lg" disabled>
                  Proposal sent
                </Button>
                <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">{job.company} is reviewing your proposal. You will hear back within 5 working days.</p>
              </Card>
            )}

            {(app.stage === "offer_received" || app.stage === "offer_accepted" || app.stage === "hired") && (
              <Card className="flex flex-col gap-2 p-4">
                {app.stage === "offer_received" ? (
                  <LinkButton size="lg" variant="primary" href={`/independent/jobs/applications/${app.id}/offer${offerUpdated ? "?updated=1" : ""}`}>
                    {offerUpdated ? "Review updated offer" : "Review offer"}
                  </LinkButton>
                ) : (
                  <>
                    <Button size="lg" disabled>
                      Offer accepted
                    </Button>
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

            <PipelineTracker stage={app.stage} mode="milestone" />

            <Card className="flex flex-col gap-6 p-4">
              <h3 className={H2}>About the team builder</h3>
              <div className="flex flex-col gap-4 text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">
                <p>{job.company}</p>
                {job.location && <p>{job.location}</p>}
                {job.industry && <p>{job.industry}</p>}
              </div>
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
                setStage(app.id, "invited", { label: "Declined", tone: "danger", meta: "--" });
                setDeclining(false);
                setToast("Invitation declined");
              }}
            >
              Decline
            </Button>
          </>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
