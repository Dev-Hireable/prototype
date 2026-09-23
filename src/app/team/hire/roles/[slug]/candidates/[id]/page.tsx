"use client";

import { notFound, useRouter } from "next/navigation";
import { use, useState } from "react";
import { MdOutlineFlag, MdOutlineThumbDown } from "react-icons/md";
import { Button, Field, JobBadge, LinkButton, Modal, Page, PipelineTracker, Select, Tabs, Textarea, Toast, useToast } from "@/components/independent/ui";
import { BreadcrumbBack } from "@/components/portal/nav";
import { IntroCard, ProfileColumn } from "@/components/team/ui";
import { InterviewDialog } from "@/components/team/InterviewDialog";
import { CompleteInterviewDialog, RequestProposalDialog } from "@/components/team/InterviewSteps";
import { SendOfferDialog } from "@/components/team/SendOfferDialog";
import { ProposalReview } from "@/components/team/ProposalReview";
import type { Proposal } from "@/components/team/ProposalReview";
import { useDeal } from "@/lib/demo/deal";
import type { DealProposal } from "@/lib/demo/deal";
import { EMPLOYER_STAGE_LABELS, INTERVIEW_DECLINED, byName, needsNewSlot } from "@/lib/team/data";
import { DEAL_ID } from "@/lib/team/deal-view";
import { useDemo } from "@/lib/team/store";
import { useWithReturn } from "@/components/portal/return";

/** The pair's submitted proposal in the review dialog's shape — targets, key results and the portfolio link included. */
const reviewFrom = (p: DealProposal): Proposal => ({
  version: p.version,
  sent: p.sent,
  rate: p.rate,
  letter: p.letter,
  portfolio: p.portfolio,
  objectives: p.objectives.map((o) => ({
    title: o.title,
    kind: o.kind,
    description: o.kind === "kpi" && o.target ? `Target: ${o.target} ${o.unit ?? ""}`.trim() : "",
    keyResults: (o.keyResults ?? []).map((title) => ({ title, description: "Marked done by the independent; the last one sends the objective for your approval." })),
  })),
});

/** Figma node 11338-10129 — the sample proposal the seeded (non-live) candidates show. */
const PROPOSAL: Proposal = {
  version: 1,
  sent: "7 Sep 2026",
  rate: "$1,500.00/mo",
  letter:
    "I am a results-driven specialist with over 5 years of experience in digital marketing, brand awareness, and campaign management. My approach combines data-driven strategy with creative execution to deliver measurable results.",
  objectives: [
    {
      title: "Drive Qualified Pipeline Through Outreach",
      kind: "okr",
      description: "Demonstrate the ability to identify, engage, and convert qualified prospects through a structured outreach process — proving readiness for a full-time marketing role.",
      keyResults: [
        { title: "Send Targeted Outreach Messages", description: "Reach out to at least 500 qualified prospects through email or LinkedIn to build a consistent top-of-funnel pipeline.", target: "500" },
        { title: "Book Discovery Calls", description: "Convert outreach into at least 12 booked discovery calls with decision makers in the target segment.", target: "12" },
        { title: "Build Outreach Playbook", description: "Document the sequences, templates and objection handling that worked, so the next rep can run it.", target: "1 playbook" },
      ],
    },
    {
      title: "Increase Click-Through Rate",
      kind: "kpi",
      description: "Lift email and paid click-through rates against the current baseline by testing subject lines, creative and audience segments each week.",
      keyResults: [
        { title: "Raise email CTR from 2.1% to 4%", description: "Run a weekly A/B test on subject line and preview text, keeping the winning variant each cycle.", target: "4%" },
        { title: "Report on every test", description: "A short weekly note on what was tested, what won, and what happens next.", target: "Weekly" },
      ],
    },
    {
      title: "Deliver Client-Ready Brand Awareness Campaign Assets",
      kind: "task",
      description: "Produce a complete campaign pack the team can ship without rework: copy, creative and a one-page results summary.",
      keyResults: [{ title: "Hand over the campaign pack", description: "Copy, creative and the results summary in the shared drive, reviewed and signed off.", target: "1 pack" }],
    },
  ],
};

const ThumbDown = MdOutlineThumbDown;

type Dialog = null | "invite" | "complete" | "drop" | "flag" | "request" | "proposal" | "decline" | "revision" | "offer";

/**
 * Figma "Candidate tracker / Candidate profile · matched … Hired": role header with tabs, "Back to pipeline",
 * left column 384 (intro video, two CTAs, pipeline tracker, flag) + right column 512 (profile, rate, work style, skills, history).
 */
export default function CandidateTracker({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);
  const router = useRouter();
  const { roles, candidates, interviews, completeInterview, requestProposal, requestRevision, declineProposal, setDropped, sendOffer, cards } = useDemo();
  const role = roles.find((r) => r.slug === slug);
  const cand = candidates.find((c) => c.id === id);
  const deal = useDeal();
  const withReturn = useWithReturn();
  const [dialog, setDialog] = useState<Dialog>(null);
  /** TB-106 — the revision note is required before the request can be sent. */
  const [revisionNote, setRevisionNote] = useState("");
  /** TB-107 — the reason the talent is told alongside the decline. */
  const [declineReason, setDeclineReason] = useState("Rate above budget");
  const [toast, setToast] = useToast();
  if (!role || !cand) notFound();
  const p = byName(cand.independent);
  const live = cand.id === DEAL_ID ? deal : null;
  /**
   * IN-072 — the live candidate's proposal is the one they submitted (null until they do); it used
   * to be a hard-coded sample, so the rate and objectives reviewed and signed were never theirs.
   */
  const proposal: Proposal | null = cand.id === DEAL_ID ? (deal?.proposal ? reviewFrom(deal.proposal) : null) : PROPOSAL;
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

  /** CTA pair per Figma frame (primary, secondary). */
  const cta = (() => {
    const message = <LinkButton size="lg" href={withReturn("/team/messages")} className="w-full">Message</LinkButton>;
    const request = (
      <Button size="lg" variant="primary" className="w-full" onClick={() => setDialog("request")}>
        Request proposal
      </Button>
    );
    if (cand.dropped)
      return (
        <>
          <Button size="lg" variant="primary" className="w-full" onClick={() => setDialog("drop")}>
            Undrop candidate
          </Button>
          <LinkButton size="lg" href={pipeline} className="w-full">
            Back to pipeline
          </LinkButton>
        </>
      );
    if (offerDeclined && proposal)
      return (
        <>
          <Button size="lg" variant="primary" className="w-full" onClick={() => setDialog("proposal")}>
            Send a new offer
          </Button>
          {message}
        </>
      );
    switch (cand.stage) {
      // TB-037 — a candidate or a match gets interviewed first; the proposal comes after it.
      case "applied":
      case "matched":
        return (
          <>
            <Button size="lg" variant="primary" className="w-full" onClick={() => setDialog("invite")}>
              Invite to interview
            </Button>
            {/* The thread opens with the interview invite; before that there is no one to message. */}
            <Button size="lg" className="w-full" disabled title="Messaging opens once you invite them to interview">
              Message
            </Button>
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
              <Button size="lg" variant="primary" className="w-full" onClick={() => setDialog("invite")}>
                Offer a new time
              </Button>
              {message}
            </>
          );
        return (
          <>
            <Button
              size="lg"
              variant="primary"
              className="w-full"
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
            <Button size="lg" variant="primary" className="w-full" disabled={!awaitingRevision || !proposal} onClick={() => setDialog("proposal")}>
              Review proposal
            </Button>
            {message}
          </>
        );
      case "proposal_sent":
        return (
          <>
            <Button size="lg" variant="primary" className="w-full" disabled={!proposal} onClick={() => setDialog("proposal")}>
              Review proposal
            </Button>
            {message}
          </>
        );
      case "offer_received":
      case "offer_accepted":
        return (
          <>
            <LinkButton size="lg" variant="primary" href={withReturn("/team/hire/offers")} className="w-full">
              Track offer
            </LinkButton>
            {message}
          </>
        );
      default:
        return (
          <>
            <LinkButton size="lg" variant="primary" href={withReturn(`/team/independents/${p.slug}`)} className="w-full">
              Track trial progress
            </LinkButton>
            {message}
          </>
        );
    }
  })();

  return (
    <Page
     
      title={
        <>
          {role.title} <JobBadge type={role.type} />
        </>
      }
      tabs={
        <Tabs
          className="px-4"
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
      <div className="flex flex-col gap-10 pb-14">
        <div className="flex items-start justify-center gap-6">
          {/* Left column */}
          <div className="flex w-[384px] shrink-0 flex-col gap-4">
            <IntroCard person={p} onPlay={() => setToast("Intro video plays here")} />
            <div className="flex flex-col gap-2">{cta}</div>
            {!cand.dropped && (cand.stage === "invited" || cand.stage === "invite_accepted") && (
              <p className="text-[13px] leading-[1.4] tracking-[0.2px] text-ink-2">
                {needsNewSlot(cand)
                  ? `${cand.status?.label === INTERVIEW_DECLINED ? `${first} declined the interview` : "The interview was cancelled"}. Offer a new time to keep going.`
                  : `${cand.stage === "invited" ? `Waiting for ${first} to confirm the interview. ` : ""}You can request a proposal once the interview is done.`}
              </p>
            )}
            {(cand.stage === "invited" || cand.stage === "invite_accepted") && !cand.dropped && !needsNewSlot(cand) && (
              <dl className="flex flex-col gap-4 text-[14px] leading-[1.2] tracking-[0.2px] text-ink">
                <div className="flex flex-col gap-2">
                  <dt className="font-semibold">Date:</dt>
                  <dd>{when}</dd>
                </div>
                <div className="flex flex-col gap-2">
                  <dt className="font-semibold">Time:</dt>
                  <dd>{at}</dd>
                </div>
                {link && (
                  <>
                    <div className="flex flex-col gap-2">
                      <dt className="font-semibold">Meeting link</dt>
                      <dd className="flex h-11 items-center truncate rounded-lg bg-[#e5e5e5] px-4 text-ink-2 outline -outline-offset-1 outline-border">{link}</dd>
                    </div>
                    <button type="button" onClick={() => { navigator.clipboard?.writeText(link); setToast("Meeting link copied"); }} className="flex items-center gap-1 self-start font-medium text-accent-ink">
                      Copy link
                    </button>
                  </>
                )}
              </dl>
            )}
            {/* What came with the application, the request and the answers — the talent wrote these for you. */}
            {live && (live.note || live.interview?.note || live.proposalRequest?.note || live.offer?.declineReason || live.proposalDeclined?.reason) && (
              <dl className="flex flex-col gap-3 rounded-lg bg-surface-2 p-4 text-[13px] leading-[1.4]">
                {live.note && <Note label={`${first}'s note with the application`} text={live.note} />}
                {live.quiz && <p className="text-ink-2">Hireable quiz results were shared with the application.</p>}
                {live.interview?.note && <Note label="Your note with the interview invite" text={live.interview.note} />}
                {live.proposalRequest?.note && <Note label="Your note with the proposal request" text={live.proposalRequest.note} />}
                {live.proposalDeclined?.reason && <Note label="Why you declined the proposal" text={live.proposalDeclined.reason} />}
                {live.offer?.status === "declined" && <Note label={`Why ${first} declined the offer`} text={live.offer.declineReason ?? "No reason given."} />}
              </dl>
            )}
            <PipelineTracker stage={cand.stage} labels={EMPLOYER_STAGE_LABELS} mode="milestone" />
            <div className="flex items-center gap-4 text-[14px] leading-[1.2] tracking-[0.2px] font-medium">
              <button type="button" onClick={() => setDialog("flag")} className="flex items-center gap-2 text-accent-ink">
                <MdOutlineFlag size={20} aria-hidden /> Flag candidate
              </button>
              {!cand.dropped && (
                <button type="button" onClick={() => setDialog("drop")} className="text-danger">
                  Drop candidate
                </button>
              )}
            </div>
          </div>

          <ProfileColumn person={p} />
        </div>
      </div>

      <InterviewDialog candidate={dialog === "invite" ? cand : null} onClose={() => setDialog(null)} onSent={(name) => setToast(`Interview invitation sent to ${name}`)} />

      <Modal
        open={dialog === "drop"}
        onClose={() => setDialog(null)}
        tone={cand.dropped ? "default" : "danger"}
        title={cand.dropped ? `Undrop ${first}?` : `Drop ${first} from this role?`}
        // TB-044 is explicit that neither dropping nor undropping notifies them, so the copy can't imply it does.
        description={cand.dropped ? "They return to their previous stage in the tracker. They are not notified either way." : "They move to the Dropped column and are not notified. You can undrop within 30 days; after that the application is closed."}
        footer={
          <>
            <Button size="lg" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button size="lg" variant={cand.dropped ? "primary" : "danger"} onClick={() => { setDropped(cand.id, !cand.dropped); setDialog(null); setToast(cand.dropped ? "Candidate restored" : "Candidate dropped"); }}>
              {cand.dropped ? "Undrop candidate" : "Drop candidate"}
            </Button>
          </>
        }
      />

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

      {/* Review proposal — Figma node 11338-10290: the dialog owns its header, panes and action bar. */}
      <Modal open={dialog === "proposal" && !!proposal} onClose={() => setDialog(null)} title={`${first}'s proposal for ${role.title}`} width={1100} bare>
        {proposal && (
          <ProposalReview
            person={p}
            role={role}
            proposal={proposal}
            onClose={() => setDialog(null)}
            actions={
              <>
                <Button size="xl" variant="primary" className="w-[280px]" disabled={awaitingRevision} onClick={() => setDialog("offer")}>
                  {offerDeclined ? "Send a new offer" : "Send offer"}
                </Button>
                {/* Only one revision request per round — asking again is what the resubmission is for. */}
                <Button size="xl" className="w-[280px]" disabled={awaitingRevision || offerDeclined} onClick={() => setDialog("revision")}>
                  Request revision
                </Button>
                <Button size="xl" className="!px-0 w-12" disabled={awaitingRevision || offerDeclined} onClick={() => setDialog("decline")}>
                  <ThumbDown size={20} aria-hidden />
                  <span className="sr-only">Decline proposal</span>
                </Button>
              </>
            }
          />
        )}
      </Modal>

      <Modal
        open={dialog === "revision"}
        onClose={() => setDialog(null)}
        title="Request a revision"
        description={`${first} gets your note and can resubmit. The current version stays in the history.`}
        footer={
          <>
            <Button size="lg" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant="primary"
              disabled={!revisionNote.trim()}
              onClick={() => {
                // TB-106 — the note travels with the request, so the talent revises against it.
                requestRevision(cand.id, revisionNote.trim());
                setRevisionNote("");
                setDialog(null);
                setToast("Revision requested");
              }}
            >
              Send request
            </Button>
          </>
        }
      >
        {/* TB-106: feedback is mandatory — "please revise" with no note isn't actionable. */}
        <Field label="What should change?">
          <Textarea rows={3} className="h-[78px]" value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} placeholder="e.g. Please update the lead generation target from 50 to 75." />
        </Field>
      </Modal>

      <Modal
        open={dialog === "decline"}
        onClose={() => setDialog(null)}
        tone="danger"
        title="Decline this proposal?"
        description={`${first} is told the proposal was declined and moves to the Dropped column. You can undrop them later if things change.`}
        footer={
          <>
            <Button size="lg" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant="danger"
              onClick={() => {
                // TB-107: a declined proposal belongs in Dropped, not back in the interview
                // column where it looked like they were still in the running — and the talent's
                // own card says it was declined, with the reason.
                declineProposal(cand.id, declineReason);
                setDialog(null);
                setToast("Proposal declined");
              }}
            >
              Decline proposal
            </Button>
          </>
        }
      >
        <Field label="Reason">
          <Select options={["Rate above budget", "Objectives not aligned", "Chose another candidate", "Other"]} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} />
        </Field>
      </Modal>

      {/* TB-105 — four-step send offer: letter → dates → deposit → sign. */}
      {proposal && (
        <SendOfferDialog
          open={dialog === "offer"}
          onClose={() => setDialog(null)}
          person={p}
          role={role}
          proposal={proposal}
          card={cards.find((c) => c.isDefault) ?? cards[0]}
          onSend={(terms) => {
            // TB-105 — the proposed rate and objectives travel with the offer, so the talent signs
            // what they proposed and the tracker is built from the same list — each objective with
            // its target or key results, and the escrow that was just funded.
            const proposed = live?.proposal?.objectives ?? [];
            sendOffer({
              rate: proposal.rate,
              start: terms.start,
              end: terms.end,
              deposit: terms.deposit,
              objectives: proposal.objectives.map((o, i) => ({
                id: `obj-${i + 1}`,
                title: o.title,
                kind: o.kind,
                target: proposed[i]?.target,
                unit: proposed[i]?.unit,
                keyResults: proposed[i]?.keyResults?.map((title, k) => ({ id: `kr-${k + 1}`, title })),
              })),
            });
            setToast("Offer sent to candidate");
          }}
        />
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** One line of what either side wrote along the way — shown where the next decision is made. */
function Note({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-semibold text-ink">{label}</dt>
      <dd className="text-ink-2">{text}</dd>
    </div>
  );
}
