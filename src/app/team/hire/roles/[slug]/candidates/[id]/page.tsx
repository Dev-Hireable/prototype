"use client";

import { notFound, useRouter, useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, Card, CardTitle, Field, JobBadge, LinkButton, MessageButton, Modal, Page, PipelineTracker, Select, Tabs, Textarea, Toast, useToast } from "@/components/independent/ui";
import { BreadcrumbBack } from "@/components/portal/nav";
import { Tip } from "@/components/portal/Tip";
import { SaveButton, TeamProfile } from "@/components/team/ui";
import { DropDialog } from "@/components/team/DropDialog";
import { InterviewDialog } from "@/components/team/InterviewDialog";
import { CompleteInterviewDialog, RequestProposalDialog } from "@/components/team/InterviewSteps";
import { ProposalReviewDialog } from "@/components/team/ProposalReviewDialog";
import { useDeal } from "@/lib/demo/deal";
import { EMPLOYER_STAGE_LABELS, INTERVIEW_DECLINED, awaitsApplication, byName, needsNewSlot } from "@/lib/team/data";
import { DEAL_ID } from "@/lib/team/deal-view";
import { useDemo } from "@/lib/team/store";
import { useWithReturn } from "@/components/portal/return";

const Flag = ICONS.flag;

type Dialog = null | "invite" | "complete" | "drop" | "flag" | "request" | "proposal";

/**
 * Figma "Candidate tracker / Candidate profile · matched … Hired": the role's header with its tabs and
 * "Back to pipeline", then the candidate as the same Contra-style profile Discover and the talent
 * themselves read (TeamProfile). The Figma frame's two CTAs are the hero's actions, with what they're
 * waiting on under them; the interview, the notes, the pipeline tracker and Flag / Drop run down the
 * column under the intro, beside About / History / Portfolio.
 */
export default function CandidateTracker({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);
  const router = useRouter();
  const { roles, candidates, interviews, completeInterview, requestProposal } = useDemo();
  const role = roles.find((r) => r.slug === slug);
  const cand = candidates.find((c) => c.id === id);
  const deal = useDeal();
  const withReturn = useWithReturn();
  /** `?proposal=1` — a deep link that lands with Review proposal open. */
  const search = useSearchParams();
  const [dialog, setDialog] = useState<Dialog>(() => (search.get("proposal") === "1" ? "proposal" : null));
  const [toast, setToast] = useToast();
  if (!role || !cand) notFound();
  const p = byName(cand.independent);
  const live = cand.id === DEAL_ID ? deal : null;
  /**
   * IN-072 — the proposal is the one the live candidate submitted (null until they do). Only the
   * shared engagement has a talent who can write one; it used to fall back to a hard-coded sample.
   */
  const proposal = live?.proposal ?? null;
  const first = p.name.split(" ")[0];
  /** TB-106 — a revision was requested and the independent hasn't resubmitted yet. */
  const awaitingRevision = cand.status?.label === "Revision requested";
  /** IN-075 — they turned the offer down; the next move is a new offer, built from the same proposal. */
  const offerDeclined = live?.offer?.status === "declined";
  // Date, time and link all come off the booking itself, so they survive a reload together.
  const booked = interviews.find((i) => i.independent === cand.independent);
  const [when = "—", at = "—"] = booked?.when.split(", ") ?? [];
  const link = booked?.link;
  const pipeline = `/team/hire/roles/${role.slug}`;

  /** The Figma frame's CTA pair (primary, secondary): the hero's actions, as Invite to apply is on Discover. */
  const cta = (() => {
    const message = <MessageButton href={withReturn("/team/messages")} />;
    const request = (
      <Button variant="primary" onClick={() => setDialog("request")}>
        Request proposal
      </Button>
    );
    // "Back to pipeline" used to be the second button here; the page's own back link is right above.
    if (cand.dropped)
      return (
        <Button variant="primary" onClick={() => setDialog("drop")}>
          Undrop candidate
        </Button>
      );
    if (offerDeclined && proposal)
      return (
        <>
          <Button variant="primary" onClick={() => setDialog("proposal")}>
            Send a new offer
          </Button>
          {message}
        </>
      );
    switch (cand.stage) {
      // TB-037 — a candidate who has applied gets interviewed first; the proposal comes after it. A
      // match invited to apply hasn't applied yet, so there's nothing to interview them about.
      case "applied":
      case "matched":
        return (
          <>
            <Tip label={awaitsApplication(cand) ? `${first} hasn't applied yet — you can invite them to interview once they do` : undefined} wrap={awaitsApplication(cand)}>
              <Button variant="primary" disabled={awaitsApplication(cand)} onClick={() => setDialog("invite")}>
                Invite to interview
              </Button>
            </Tip>
            {/* The thread opens with the interview invite; before that there is no one to message. */}
            <Tip label="Messaging opens once you invite them to interview" wrap>
              <Button disabled>Message</Button>
            </Tip>
          </>
        );
      // IN-018 / TB-103 — the interview is marked done (once they've confirmed it), and only then
      // can a proposal be requested: two confirmed steps, so neither happens on a single click.
      case "invited":
      case "invite_accepted":
        // They declined it, or it was cancelled: offering a new slot is the next step.
        if (needsNewSlot(cand))
          return (
            <>
              <Button variant="primary" onClick={() => setDialog("invite")}>
                Offer a new time
              </Button>
              {message}
            </>
          );
        return (
          <>
            <Button
              variant="primary"
              disabled={cand.stage === "invited"}
              title={cand.stage === "invited" ? `Waiting for ${first} to confirm the interview` : undefined}
              onClick={() => setDialog("complete")}
            >
              Mark interview as done
            </Button>
            {message}
          </>
        );
      case "interviewed":
        return (
          <>
            {request}
            {message}
          </>
        );
      case "proposal_requested":
        return (
          <>
            {/* TB-106 — once a revision has been asked for there is a submitted proposal to track,
                so the button stays live and opens it read-only. Before the first submission there
                is nothing to open, and it stays disabled. */}
            <Button variant="primary" disabled={!awaitingRevision || !proposal} onClick={() => setDialog("proposal")}>
              Review proposal
            </Button>
            {message}
          </>
        );
      case "proposal_sent":
        return (
          <>
            <Button variant="primary" disabled={!proposal} onClick={() => setDialog("proposal")}>
              Review proposal
            </Button>
            {message}
          </>
        );
      case "offer_received":
      case "offer_accepted":
        return (
          <>
            <LinkButton variant="primary" href={withReturn("/team/hire/offers")}>
              Track offer
            </LinkButton>
            {message}
          </>
        );
      default:
        return (
          <>
            <LinkButton variant="primary" href={withReturn(`/team/independents/${p.slug}`)}>
              {role.type === "trial" ? "Track trial progress" : "Open contract"}
            </LinkButton>
            {message}
          </>
        );
    }
  })();

  /** Booked and not declined or cancelled: when it is, and the link to join. */
  const interviewSet = (cand.stage === "invited" || cand.stage === "invite_accepted") && !cand.dropped && !needsNewSlot(cand);
  /** What either side wrote along the way — the talent wrote some of these for you. */
  const notes = live && (live.note || live.interview?.note || live.proposalRequest?.note || live.offer?.declineReason || live.proposalDeclined?.reason) ? live : null;

  return (
    <Page
     
      title={
        <>
          {role.title} <JobBadge type={role.type} />
        </>
      }
      tabs={
        <Tabs
          value="interested"
          onChange={(v) => v === "details" && router.push(`${pipeline}?tab=details`)}
          options={[
            { value: "interested", label: "Interested" },
            { value: "details", label: "Role details" },
          ]}
        />
      }
      nav={<BreadcrumbBack href={pipeline}>Back to pipeline</BreadcrumbBack>}
    >
      <TeamProfile
        person={p}
        onPlayIntro={() => setToast("Intro video plays here")}
        actions={
          <>
            {cta}
            <SaveButton person={p} />
          </>
        }
        note={
          !cand.dropped &&
          (cand.stage === "invited" || cand.stage === "invite_accepted") && (
            <p className="text-[13px] leading-[1.4] tracking-[0.2px] text-ink-2">
              {needsNewSlot(cand)
                ? `${cand.status?.label === INTERVIEW_DECLINED ? `${first} declined the interview` : "The interview was cancelled"}. Offer a new time to keep going.`
                : `${cand.stage === "invited" ? `Waiting for ${first} to confirm the interview. ` : ""}You can request a proposal once the interview is done.`}
            </p>
          )
        }
        aside={
          <>
            {interviewSet && (
              <Card className="flex flex-col gap-4 p-4">
                <CardTitle>Interview</CardTitle>
                <dl className="grid grid-cols-2 gap-4 text-[14px] leading-[1.2] tracking-[0.2px] text-ink">
                  <div className="flex flex-col gap-2">
                    <dt className="font-semibold">Date</dt>
                    <dd>{when}</dd>
                  </div>
                  <div className="flex flex-col gap-2">
                    <dt className="font-semibold">Time</dt>
                    <dd>{at}</dd>
                  </div>
                  {link && (
                    <div className="col-span-2 flex flex-col gap-2">
                      <dt className="font-semibold">Meeting link</dt>
                      <dd className="h-11 truncate rounded-lg bg-[#e5e5e5] px-4 leading-[44px] text-ink-2 outline -outline-offset-1 outline-border">{link}</dd>
                    </div>
                  )}
                </dl>
                {link && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(link);
                      setToast("Meeting link copied");
                    }}
                    className="self-start text-[14px] leading-[1.2] font-medium tracking-[0.2px] text-accent-ink hover:underline"
                  >
                    Copy link
                  </button>
                )}
              </Card>
            )}
            {notes && (
              <Card className="flex flex-col gap-4 p-4">
                <CardTitle>Notes</CardTitle>
                <dl className="flex flex-col gap-3 text-[13px] leading-[1.4]">
                  {notes.note && <Note label={`${first}'s note with the application`} text={notes.note} />}
                  {notes.interview?.note && <Note label="Your note with the interview invite" text={notes.interview.note} />}
                  {notes.proposalRequest?.note && <Note label="Your note with the proposal request" text={notes.proposalRequest.note} />}
                  {notes.proposalDeclined?.reason && <Note label="Why you declined the proposal" text={notes.proposalDeclined.reason} />}
                  {notes.offer?.status === "declined" && <Note label={`Why ${first} declined the offer`} text={notes.offer.declineReason ?? "No reason given."} />}
                </dl>
                {notes.quiz && <p className="text-[13px] leading-[1.4] text-ink-2">Hireable quiz results were shared with the application.</p>}
              </Card>
            )}
            <PipelineTracker stage={cand.stage} labels={EMPLOYER_STAGE_LABELS} mode="milestone" />
            <div className="flex items-center gap-4 text-[14px] leading-[1.2] font-medium tracking-[0.2px]">
              <button type="button" onClick={() => setDialog("flag")} className="flex items-center gap-2 text-accent-ink hover:underline">
                <Flag size={20} aria-hidden /> Flag candidate
              </button>
              {!cand.dropped && (
                <button type="button" onClick={() => setDialog("drop")} className="text-danger hover:underline">
                  Drop candidate
                </button>
              )}
            </div>
          </>
        }
      />

      <InterviewDialog candidate={dialog === "invite" ? cand : null} onClose={() => setDialog(null)} onSent={(name) => setToast(`Interview invitation sent to ${name}`)} />

      {/* TB-044 — the same Drop / Undrop decision the board's card opens. */}
      <DropDialog candidate={dialog === "drop" ? cand : null} role={role.title} onClose={() => setDialog(null)} onDone={setToast} />

      <Modal
        open={dialog === "flag"}
        onClose={() => setDialog(null)}
        title={`Flag ${p.name}`}
        description="Hireable reviews flags within 2 working days. The candidate is not told who flagged them."
        footer={
          <>
            <Button size="lg" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" onClick={() => { setDialog(null); setToast("Thanks — our team will review this candidate"); }}>
              Send flag
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Reason">
            <Select options={["Misrepresented experience", "No-show to interview", "Inappropriate conduct", "Other"]} />
          </Field>
          <Field label="Details">
            <Textarea rows={3} className="h-[78px]" placeholder="What happened?" />
          </Field>
        </div>
      </Modal>

      <CompleteInterviewDialog
        open={dialog === "complete"}
        name={first}
        when={booked?.when}
        onClose={() => setDialog(null)}
        onConfirm={() => {
          completeInterview(cand.id);
          setDialog(null);
          setToast(`Interview with ${first} marked done`);
        }}
      />

      <RequestProposalDialog
        open={dialog === "request"}
        name={first}
        onClose={() => setDialog(null)}
        onSend={(note) => {
          requestProposal(cand.id, note);
          setDialog(null);
          setToast(`Proposal requested from ${first}`);
        }}
      />

      <ProposalReviewDialog candidate={cand} role={role} open={dialog === "proposal"} onClose={() => setDialog(null)} onToast={setToast} />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** One line of what either side wrote along the way — shown where the next decision is made. */
function Note({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-semibold text-ink">{label}</dt>
      <dd className="whitespace-pre-line text-ink-2 [overflow-wrap:anywhere]">{text}</dd>
    </div>
  );
}
