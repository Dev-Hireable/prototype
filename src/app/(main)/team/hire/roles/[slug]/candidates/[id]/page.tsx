"use client";

import { notFound, useRouter, useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { ICONS } from "@/components/icons";
import { Button, Card, CardTitle, Field, JobBadge, LinkButton, MessageButton, Modal, Page, PipelineTracker, Select, Tabs, Textarea, Toast } from "@/components/portal/ui";
import { BreadcrumbBack } from "@/components/portal/nav";
import { Tip } from "@/components/portal/tip";
import { SaveButton, TeamProfile } from "@/components/team/ui";
import { DropDialog } from "@/components/team/drop-dialog";
import { InterviewDialog } from "@/components/team/interview-dialog";
import { CompleteInterviewDialog, RequestProposalDialog } from "@/components/team/interview-steps";
import { ProposalReviewDialog } from "@/components/team/proposal-review-dialog";
import { useDeal } from "@/lib/demo/deal";
import type { Deal } from "@/lib/demo/deal";
import { useToast, type SetToast } from "@/lib/portal/toast";
import { EMPLOYER_STAGE_LABELS, INTERVIEW_DECLINED, awaitsApplication, byName, needsNewSlot } from "@/lib/team/data";
import type { Candidate, Independent, Interview, Role } from "@/lib/team/data";
import { DEAL_ID } from "@/lib/team/deal-view";
import { useRoles } from "@/lib/team/roles";
import { usePipeline } from "@/lib/team/pipeline";
import { useWithReturn } from "@/components/portal/return";

const Flag = ICONS.flag;

type Dialog = null | "invite" | "complete" | "drop" | "flag" | "request" | "proposal";

/** The candidate as the page's parts read them: the application, the role, who they are, the live engagement when it's theirs, and the interview booked with them. */
type CandidateView = { cand: Candidate; role: Role; person: Independent; first: string; live: Deal | null; booked: Interview | undefined };

/**
 * A candidate's profile, from matched to hired: the role's header with its tabs and "Back to
 * pipeline", then the candidate as the same Contra-style profile Discover and the talent themselves
 * read (TeamProfile). The two CTAs are the hero's actions, with what they're waiting on under them;
 * the interview, the notes, the pipeline tracker and Flag / Drop run down the column under the
 * intro, beside About / History / Portfolio.
 */
export default function CandidateTracker({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);
  const { candidates, interviews } = usePipeline();
  const { roles } = useRoles();
  const role = roles.find((r) => r.slug === slug);
  const cand = candidates.find((c) => c.id === id);
  const deal = useDeal();
  /** `?proposal=1` — a deep link that lands with Review proposal open. */
  const search = useSearchParams();
  const [dialog, setDialog] = useState<Dialog>(() => (search.get("proposal") === "1" ? "proposal" : null));
  const [toast, setToast] = useToast();
  if (!role || !cand) notFound();
  const p = byName(cand.independent);
  const live = cand.id === DEAL_ID ? deal : null;
  const first = p.name.split(" ")[0];
  // Date, time and link all come off the booking itself, so they survive a reload together.
  const booked = interviews.find((i) => i.independent === cand.independent);
  const view: CandidateView = { cand, role, person: p, first, live, booked };
  const pipeline = `/team/hire/roles/${role.slug}`;

  return (
    <Page
      title={
        <>
          {role.title} <JobBadge type={role.type} />
        </>
      }
      tabs={<RoleTabs pipeline={pipeline} />}
      nav={<BreadcrumbBack href={pipeline}>Back to pipeline</BreadcrumbBack>}
    >
      <TeamProfile
        person={p}
        onPlayIntro={() => setToast("Intro video plays here", "info")}
        actions={
          <>
            <NextAction cand={cand} role={role} person={p} live={live} onOpen={setDialog} />
            <SaveButton person={p} />
          </>
        }
        note={<StageNote cand={cand} first={first} />}
        aside={<ProfileAside view={view} onOpen={setDialog} onToast={setToast} />}
      />

      <CandidateDialogs view={view} dialog={dialog} onClose={() => setDialog(null)} onToast={setToast} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** The role's header tabs: Interested is where this page sits; Role details opens the pipeline's other tab. */
function RoleTabs({ pipeline }: { pipeline: string }) {
  const router = useRouter();
  return (
    <Tabs
      value="interested"
      onChange={(v) => v === "details" && router.push(`${pipeline}?tab=details`)}
      options={[
        { value: "interested", label: "Interested" },
        { value: "details", label: "Role details" },
      ]}
    />
  );
}

/** The column under the intro: the booked interview, the notes, the pipeline tracker, and Flag / Drop. */
function ProfileAside({ view, onOpen, onToast }: { view: CandidateView; onOpen: (d: Dialog) => void; onToast: SetToast }) {
  const { cand, live, first, booked } = view;
  /** Booked and not declined or cancelled: when it is, and the link to join. */
  const interviewSet = (cand.stage === "invited" || cand.stage === "invite_accepted") && !cand.dropped && !needsNewSlot(cand);
  return (
    <>
      {interviewSet && <InterviewCard when={booked?.when} link={booked?.link} onCopied={() => onToast("Meeting link copied")} />}
      <NotesCard live={live} first={first} />
      <PipelineTracker stage={cand.stage} labels={EMPLOYER_STAGE_LABELS} mode="milestone" />
      <div className="flex items-center gap-4 text-[14px] leading-[1.2] font-medium tracking-[0.2px]">
        <button type="button" onClick={() => onOpen("flag")} className="flex items-center gap-2 text-accent-ink hover:underline">
          <Flag size={20} aria-hidden /> Flag candidate
        </button>
        {!cand.dropped && (
          <button type="button" onClick={() => onOpen("drop")} className="text-danger hover:underline">
            Drop candidate
          </button>
        )}
      </div>
    </>
  );
}

/** The page's dialogs, one open at a time: invite to interview, drop, flag, mark the interview done, request and review the proposal. */
function CandidateDialogs({ view, dialog, onClose, onToast }: { view: CandidateView; dialog: Dialog; onClose: () => void; onToast: SetToast }) {
  const { cand, role, person, first, booked } = view;
  const { completeInterview, requestProposal } = usePipeline();
  return (
    <>
      <InterviewDialog candidate={dialog === "invite" ? cand : null} onClose={onClose} onSent={(name) => onToast(`Interview invitation sent to ${name}`)} />

      {/* TB-044 — the same Drop / Undrop decision the board's card opens. */}
      <DropDialog candidate={dialog === "drop" ? cand : null} role={role.title} onClose={onClose} onDone={onToast} />

      <FlagDialog
        open={dialog === "flag"}
        name={person.name}
        onClose={onClose}
        onSend={() => {
          onClose();
          onToast("Thanks — our team will review this candidate");
        }}
      />

      <CompleteInterviewDialog
        open={dialog === "complete"}
        name={first}
        when={booked?.when}
        onClose={onClose}
        onConfirm={() => {
          completeInterview(cand.id);
          onClose();
          onToast(`Interview with ${first} marked done`);
        }}
      />

      <RequestProposalDialog
        open={dialog === "request"}
        name={first}
        onClose={onClose}
        onSend={(note) => {
          requestProposal(cand.id, note);
          onClose();
          onToast(`Proposal requested from ${first}`);
        }}
      />

      <ProposalReviewDialog candidate={cand} role={role} open={dialog === "proposal"} onClose={onClose} onToast={onToast} />
    </>
  );
}

type ActionProps = { cand: Candidate; role: Role; person: Independent; live: Deal | null; onOpen: (d: Dialog) => void };

/** The CTA pair (primary, secondary): the hero's actions, as Invite to apply is on Discover. */
function NextAction({ cand, role, person, live, onOpen }: ActionProps) {
  const withReturn = useWithReturn();
  /**
   * IN-072 — the proposal is the one the live candidate submitted (null until they do). Only the
   * shared engagement has a talent who can write one; it used to fall back to a hard-coded sample.
   */
  const proposal = live?.proposal ?? null;
  /** IN-075 — they turned the offer down; the next move is a new offer, built from the same proposal. */
  const offerDeclined = live?.offer?.status === "declined";
  // "Back to pipeline" used to be the second button here; the page's own back link is right above.
  if (cand.dropped)
    return (
      <Button variant="primary" onClick={() => onOpen("drop")}>
        Undrop candidate
      </Button>
    );
  const newOffer = offerDeclined && !!proposal;
  // TB-037 — a candidate who has applied gets interviewed first; the proposal comes after it.
  if (!newOffer && (cand.stage === "applied" || cand.stage === "matched")) return <BeforeInterview cand={cand} first={person.name.split(" ")[0]} onOpen={onOpen} />;
  return (
    <>
      {newOffer ? (
        <Button variant="primary" onClick={() => onOpen("proposal")}>
          Send a new offer
        </Button>
      ) : (
        <StageAction cand={cand} role={role} person={person} hasProposal={!!proposal} onOpen={onOpen} />
      )}
      <MessageButton href={withReturn("/team/messages")} />
    </>
  );
}

/** A match invited to apply hasn't applied yet, so there's nothing to interview them about. */
function BeforeInterview({ cand, first, onOpen }: { cand: Candidate; first: string; onOpen: (d: Dialog) => void }) {
  const waiting = awaitsApplication(cand);
  return (
    <>
      <Tip label={waiting ? `${first} hasn't applied yet — you can invite them to interview once they do` : undefined} wrap={waiting}>
        <Button variant="primary" disabled={waiting} onClick={() => onOpen("invite")}>
          Invite to interview
        </Button>
      </Tip>
      {/* The thread opens with the interview invite; before that there is no one to message. */}
      <Tip label="Messaging opens once you invite them to interview" wrap>
        <Button disabled>Message</Button>
      </Tip>
    </>
  );
}

/** The stage's primary action, from the interview on. */
function StageAction({ cand, role, person, hasProposal, onOpen }: { cand: Candidate; role: Role; person: Independent; hasProposal: boolean; onOpen: (d: Dialog) => void }) {
  const withReturn = useWithReturn();
  const first = person.name.split(" ")[0];
  switch (cand.stage) {
    // IN-018 / TB-103 — the interview is marked done (once they've confirmed it), and only then
    // can a proposal be requested: two confirmed steps, so neither happens on a single click.
    case "invited":
    case "invite_accepted":
      // They declined it, or it was cancelled: offering a new slot is the next step.
      if (needsNewSlot(cand))
        return (
          <Button variant="primary" onClick={() => onOpen("invite")}>
            Offer a new time
          </Button>
        );
      return (
        <Button variant="primary" disabled={cand.stage === "invited"} title={cand.stage === "invited" ? `Waiting for ${first} to confirm the interview` : undefined} onClick={() => onOpen("complete")}>
          Mark interview as done
        </Button>
      );
    case "interviewed":
      return (
        <Button variant="primary" onClick={() => onOpen("request")}>
          Request proposal
        </Button>
      );
    case "proposal_requested":
      // TB-106 — once a revision has been asked for there is a submitted proposal to track, so the
      // button stays live and opens it read-only. Before the first submission there is nothing to
      // open, and it stays disabled.
      return (
        <Button variant="primary" disabled={cand.status?.label !== "Revision requested" || !hasProposal} onClick={() => onOpen("proposal")}>
          Review proposal
        </Button>
      );
    case "proposal_sent":
      return (
        <Button variant="primary" disabled={!hasProposal} onClick={() => onOpen("proposal")}>
          Review proposal
        </Button>
      );
    case "offer_received":
    case "offer_accepted":
      return (
        <LinkButton variant="primary" href={withReturn("/team/hire/offers")}>
          Track offer
        </LinkButton>
      );
    default:
      return (
        <LinkButton variant="primary" href={withReturn(`/team/independents/${person.slug}`)}>
          {role.type === "trial" ? "Track trial progress" : "Open contract"}
        </LinkButton>
      );
  }
}

/** Under the hero's actions while an interview is set up: what it's waiting on, or that it needs a new time. */
function StageNote({ cand, first }: { cand: Candidate; first: string }) {
  if (cand.dropped || (cand.stage !== "invited" && cand.stage !== "invite_accepted")) return null;
  return (
    <p className="text-[13px] leading-[1.4] tracking-[0.2px] text-ink-2">
      {needsNewSlot(cand)
        ? `${cand.status?.label === INTERVIEW_DECLINED ? `${first} declined the interview` : "The interview was cancelled"}. Offer a new time to keep going.`
        : `${cand.stage === "invited" ? `Waiting for ${first} to confirm the interview. ` : ""}You can request a proposal once the interview is done.`}
    </p>
  );
}

/** The booked interview: its date and time, and the meeting link with a copy button. */
function InterviewCard({ when: booked, link, onCopied }: { when: string | undefined; link: string | undefined; onCopied: () => void }) {
  const [when = "—", at = "—"] = booked?.split(", ") ?? [];
  return (
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
            onCopied();
          }}
          className="self-start text-[14px] leading-[1.2] font-medium tracking-[0.2px] text-accent-ink hover:underline"
        >
          Copy link
        </button>
      )}
    </Card>
  );
}

/** What either side wrote along the way — the talent wrote some of these for you. */
function NotesCard({ live: notes, first }: { live: Deal | null; first: string }) {
  if (!notes || !(notes.note || notes.interview?.note || notes.proposalRequest?.note || notes.offer?.declineReason || notes.proposalDeclined?.reason)) return null;
  return (
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

/** Flag the candidate to Hireable, with a reason and what happened. */
function FlagDialog({ open, name, onClose, onSend }: { open: boolean; name: string; onClose: () => void; onSend: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Flag ${name}`}
      description="Hireable reviews flags within 2 working days. The candidate is not told who flagged them."
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" onClick={onSend}>
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
  );
}
