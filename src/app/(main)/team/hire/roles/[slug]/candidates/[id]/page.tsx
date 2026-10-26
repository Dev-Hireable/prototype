"use client";

import { notFound, useRouter, useSearchParams } from "next/navigation";
import { use, useState, type ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { Button, Card, Field, JobBadge, LinkButton, MessageButton, Modal, Page, Select, StatusDot, Tabs, Textarea, Toast } from "@/components/portal/ui";
import { BreadcrumbBack } from "@/components/portal/nav";
import { Tip } from "@/components/portal/tip";
import { ProfileActions } from "@/components/portal/talent-profile";
import { SaveButton, TeamProfile } from "@/components/team/ui";
import { DropDialog } from "@/components/team/drop-dialog";
import { InterviewDialog } from "@/components/team/interview-dialog";
import { CancelInterviewDialog, InterviewButtons, RescheduleDialog } from "@/components/team/interview-actions";
import { OfferCard } from "@/components/team/offer-card";
import { CompleteInterviewDialog, MissedInterviewDialog, RequestProposalDialog } from "@/components/team/interview-steps";
import { OfferDialog } from "@/components/team/offer-dialog";
import { ProposalReviewDialog } from "@/components/team/proposal-review-dialog";
import { useDeal } from "@/lib/demo/deal";
import type { Deal } from "@/lib/demo/deal";
import { shortName } from "@/lib/portal/names";
import { useToast, type SetToast } from "@/lib/portal/toast";
import { INTERVIEW_DECLINED, INTERVIEW_MISSED, NEW_TIME_REQUESTED, TRACKER_COLUMNS, awaitsApplication, byName, columnOf, needsNewSlot } from "@/lib/team/data";
import type { Candidate, Independent, Interview, Role } from "@/lib/team/data";
import { DEAL_ID } from "@/lib/team/deal-view";
import { useRoles } from "@/lib/team/roles";
import { useOffers } from "@/lib/team/offers";
import { slotForTeam, usePipeline } from "@/lib/team/pipeline";
import { useWithReturn } from "@/components/portal/return";

const Flag = ICONS.flag;

type Dialog = null | "invite" | "complete" | "missed" | "drop" | "flag" | "request" | "proposal" | "offer" | "reschedule" | "cancel";

/** The candidate as the page's parts read them: the application, the role, who they are, the live engagement when it's theirs, and the interview booked with them. */
type CandidateView = { cand: Candidate; role: Role; person: Independent; first: string; live: Deal | null; booked: Interview | undefined };

/**
 * A candidate's profile, from matched to hired: the role's header with its tabs and "Back to
 * pipeline", then the candidate as the same Contra-style profile Discover and the talent themselves
 * read (TeamProfile). The two CTAs are the hero's actions, with the stage and what it's waiting on
 * under them; the interview, the offer, the notes and Flag / Decline run down the column under the
 * intro, beside About / History / Portfolio. Each step is in the Messages thread too (#308).
 */
export default function CandidateTracker({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);
  const { candidates, interviews } = usePipeline();
  const { roles } = useRoles();
  const role = roles.find((r) => r.slug === slug);
  const cand = candidates.find((c) => c.id === id);
  const deal = useDeal();
  /** `?proposal=1` / `?offer=1` — a deep link that lands with Review proposal, or the sent offer, open. */
  const search = useSearchParams();
  const [dialog, setDialog] = useState<Dialog>(() => (search.get("proposal") === "1" ? "proposal" : search.get("offer") === "1" ? "offer" : null));
  const [toast, setToast] = useToast();
  if (!role || !cand) notFound();
  const full = byName(cand.independent);
  // The surname stays an initial ("Juan D.") until they're hired; the contract shows it in full.
  const p = { ...full, name: shortName(full.name) };
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
      {/* Hired = the offer is signed: until then it reads "Juan D.", with no links (TeamProfile). */}
      <TeamProfile
        person={full}
        hired={cand.stage === "hired"}
        onPlayIntro={() => setToast("Intro video plays here", "info")}
        // data-tour: the candidate tour points at the next step and at where they stand (@/lib/portal/tours).
        actions={
          <ProfileActions tour="candidate-step">
            <NextAction cand={cand} role={role} person={p} live={live} onOpen={setDialog} />
            <SaveButton person={p} />
          </ProfileActions>
        }
        note={
          <div data-tour="candidate-stage" className="flex flex-col items-start gap-2">
            <StageBadge cand={cand} />
            <StageNote cand={cand} first={first} />
          </div>
        }
        aside={<ProfileAside view={view} onOpen={setDialog} onToast={setToast} />}
      />

      <CandidateDialogs view={view} dialog={dialog} onClose={() => setDialog(null)} onOpen={setDialog} onToast={setToast} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** The role's header tabs, as on the pipeline: this page sits under Candidates; Role details opens the pipeline's other tab. */
function RoleTabs({ pipeline }: { pipeline: string }) {
  const router = useRouter();
  return (
    <Tabs
      value="candidates"
      onChange={(v) => v === "details" && router.push(`${pipeline}?tab=details`)}
      options={[
        { value: "candidates", label: "Candidates" },
        { value: "details", label: "Role details" },
      ]}
    />
  );
}

/** #308 — where the candidate stands, as a small badge in place of the pipeline tracker: the card's own status. */
function StageBadge({ cand }: { cand: Candidate }) {
  if (cand.dropped) return <StatusDot tone="danger">Declined</StatusDot>;
  const column = TRACKER_COLUMNS.find((c) => c.key === columnOf(cand));
  const label = cand.status?.label ?? column?.label;
  return label ? <StatusDot tone={cand.status?.tone ?? "neutral"}>{label}</StatusDot> : null;
}

/** The column under the intro: the booked interview, the offer sent, the notes, and Flag / Decline. */
function ProfileAside({ view, onOpen, onToast }: { view: CandidateView; onOpen: (d: Dialog) => void; onToast: SetToast }) {
  const { cand, role, person, live, first, booked } = view;
  const { offers, withdrawOffer } = useOffers();
  /** Booked and not declined or cancelled: when it is, and the link to join. */
  const interviewSet = (cand.stage === "invited" || cand.stage === "invite_accepted") && !cand.dropped && !needsNewSlot(cand);
  // TB-037 — the offer sent from this card: it's read and withdrawn here, in the pipeline.
  const offer = offers.find((o) => !o.conversion && o.href === `/team/hire/roles/${role.slug}/candidates/${cand.id}`);
  return (
    <>
      {interviewSet && (
        <InterviewCard interview={booked} onCopied={() => onToast("Meeting link copied")}>
          {booked && !booked.past && <InterviewButtons iv={booked} onReschedule={() => onOpen("reschedule")} onCancel={() => onOpen("cancel")} />}
        </InterviewCard>
      )}
      {offer && <OfferCard offer={offer} name={person.name} onWithdraw={withdrawOffer} onToast={onToast} />}
      <NotesCard live={live} first={first} />
      {/* Text buttons, each a finger's height to tap on a touch screen (hit-area). */}
      <div className="flex items-center gap-4 text-[14px] leading-[1.2] font-medium tracking-[0.2px]">
        <button type="button" onClick={() => onOpen("flag")} className="hit-area flex items-center gap-2 text-accent-ink hover:underline">
          <Flag size={20} aria-hidden /> Flag candidate
        </button>
        {/* Hired candidates can't be declined (TB-037). */}
        {!cand.dropped && cand.stage !== "hired" && (
          <button type="button" onClick={() => onOpen("drop")} className="hit-area text-danger hover:underline">
            Decline
          </button>
        )}
      </div>
    </>
  );
}

/** The page's dialogs, one open at a time: invite to interview, decline, flag, mark the interview done (or not held), request and review the proposal. */
function CandidateDialogs({ view, dialog, onClose, onOpen, onToast }: { view: CandidateView; dialog: Dialog; onClose: () => void; onOpen: (d: Dialog) => void; onToast: SetToast }) {
  const { cand, role, person, first, booked } = view;
  const { requestProposal, rescheduleInterview, cancelInterview } = usePipeline();
  return (
    <>
      <RescheduleDialog interview={dialog === "reschedule" ? (booked ?? null) : null} onClose={onClose} onSend={rescheduleInterview} onToast={onToast} />
      {/* #325 — Ask for a new time moves it instead, in the reschedule dialog with its note. */}
      <CancelInterviewDialog interview={dialog === "cancel" ? (booked ?? null) : null} onClose={onClose} onCancel={cancelInterview} onMove={() => onOpen("reschedule")} onToast={onToast} />
      <InterviewDialog candidate={dialog === "invite" ? cand : null} onClose={onClose} onSent={(name) => onToast(`Interview invitation sent to ${name}`)} />

      {/* TB-044 — the same Decline / Restore decision the board's card opens. */}
      <DropDialog candidate={dialog === "drop" ? cand : null} role={role.title} onClose={onClose} onDone={onToast} />

      <FlagDialog
        open={dialog === "flag"}
        name={person.name}
        onClose={onClose}
        onSend={() => {
          onClose();
          onToast("Flag sent. Hireable reviews it within 2 working days.");
        }}
      />

      <InterviewSteps view={view} dialog={dialog} onClose={onClose} onToast={onToast} />

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
      {view.live && <OfferDialog open={dialog === "offer"} onClose={onClose} onToast={onToast} />}
    </>
  );
}

/**
 * The interview's two confirmations: marked done before its slot is over (it's done on its own once
 * the slot has passed), and not held, for one marked done on its own that didn't happen (#313).
 */
function InterviewSteps({ view, dialog, onClose, onToast }: { view: CandidateView; dialog: Dialog; onClose: () => void; onToast: SetToast }) {
  const { cand, first, booked } = view;
  const { completeInterview, missInterview } = usePipeline();
  return (
    <>
      <CompleteInterviewDialog
        open={dialog === "complete"}
        name={first}
        interview={booked}
        onClose={onClose}
        onConfirm={() => {
          completeInterview(cand.id);
          onClose();
          onToast(`Interview with ${first} marked done`);
        }}
      />
      <MissedInterviewDialog
        open={dialog === "missed"}
        name={first}
        onClose={onClose}
        onConfirm={() => {
          missInterview(cand.id);
          onClose();
          onToast(`Interview with ${first} marked as not held`);
        }}
      />
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
        Restore candidate
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

/** A match invited to apply hasn't applied yet, so there's nothing to interview them about; they can be messaged all the same. */
function BeforeInterview({ cand, first, onOpen }: { cand: Candidate; first: string; onOpen: (d: Dialog) => void }) {
  const withReturn = useWithReturn();
  const waiting = awaitsApplication(cand);
  return (
    <>
      <Tip label={waiting ? `${first} hasn't applied yet. You can invite them to interview once they do.` : undefined} wrap={waiting}>
        <Button variant="primary" disabled={waiting} onClick={() => onOpen("invite")}>
          Invite to interview
        </Button>
      </Tip>
      {/* The thread is open from the invite to apply or the application. */}
      <MessageButton href={withReturn("/team/messages")} />
    </>
  );
}

/** The stage's primary action, from the interview on. */
function StageAction({ cand, person, hasProposal, onOpen }: { cand: Candidate; role: Role; person: Independent; hasProposal: boolean; onOpen: (d: Dialog) => void }) {
  const withReturn = useWithReturn();
  const first = person.name.split(" ")[0];
  switch (cand.stage) {
    // IN-018 / TB-103 — the interview is marked done (on its own once its slot has passed, or here
    // when they met sooner), and only then can a proposal be requested: two confirmed steps, so
    // neither happens on a single click.
    case "invited":
    case "invite_accepted":
      // They declined it, or it was cancelled: offering a new slot is the next step.
      if (needsNewSlot(cand))
        return (
          <Button variant="primary" onClick={() => onOpen("invite")}>
            {cand.status?.label === NEW_TIME_REQUESTED ? "Review new time" : "Offer a new time"}
          </Button>
        );
      return (
        <Button variant="primary" disabled={cand.stage === "invited"} title={cand.stage === "invited" ? `Waiting for ${first} to confirm the interview` : undefined} onClick={() => onOpen("complete")}>
          Mark interview done
        </Button>
      );
    case "interviewed":
      return (
        <>
          <Button variant="primary" onClick={() => onOpen("request")}>
            Request proposal
          </Button>
          {/* #313 — marked done on its own once the slot passed: it may not have happened. */}
          {cand.autoDone && <Button onClick={() => onOpen("missed")}>Did not happen</Button>}
        </>
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
    // The offer is read, and withdrawn, on its card in the column beside the intro.
    case "offer_received":
    case "offer_accepted":
      return null;
    default:
      // #327 — a trial while it runs; the contract once it's a full-time or part-time role, or the trial has closed.
      return (
        <LinkButton variant="primary" href={withReturn(`/team/independents/${person.slug}`)}>
          {cand.hiredAs === "trial" && !cand.trialEnded ? "Track trial progress" : "Open contract"}
        </LinkButton>
      );
  }
}

/** Under the hero's actions while an interview is set up: what it's waiting on, or that it needs a new time. */
function StageNote({ cand, first }: { cand: Candidate; first: string }) {
  if (cand.dropped || (cand.stage !== "invited" && cand.stage !== "invite_accepted")) return null;
  const fellThrough = cand.status?.label === INTERVIEW_DECLINED ? `${first} declined the interview` : cand.status?.label === INTERVIEW_MISSED ? "The interview didn't happen" : "The interview was cancelled";
  return (
    <p className="text-[13px] leading-[1.4] tracking-[0.2px] text-ink-2">
      {cand.status?.label === NEW_TIME_REQUESTED
        ? `${first} can't make the slot and asked for ${cand.status.meta ?? "another time"}. Confirm it or offer another to keep going.`
        : needsNewSlot(cand)
        ? `${fellThrough}. Offer a new time to keep going.`
        : `${cand.stage === "invited" ? `Waiting for ${first} to confirm the interview. ` : ""}You can request a proposal once the interview is done.`}
    </p>
  );
}

/** The booked interview: when it is in both clocks (#312), the meeting link with a copy button, and its buttons (`children`). */
function InterviewCard({ interview, onCopied, children }: { interview: Interview | undefined; onCopied: () => void; children?: ReactNode }) {
  const link = interview?.link;
  return (
    <Card title="Interview" className="flex flex-col gap-4 p-4">
      <dl className="grid grid-cols-2 gap-4 text-[14px] leading-[1.2] tracking-[0.2px] text-ink">
        <div className="col-span-2 flex flex-col gap-2">
          <dt className="font-semibold">When</dt>
          <dd className="leading-[1.4]">{interview ? slotForTeam(interview.when, interview.offset, interview.independent) : "Not booked yet"}</dd>
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
      {children}
    </Card>
  );
}

/** What either side wrote along the way — the talent wrote some of these for you. */
function NotesCard({ live: notes, first }: { live: Deal | null; first: string }) {
  if (!notes || !(notes.note || notes.interview?.note || notes.proposalRequest?.note || notes.offer?.declineReason || notes.proposalDeclined?.reason)) return null;
  return (
    <Card title="Notes" className="flex flex-col gap-4 p-4">
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

const FLAG_REASONS = ["Misrepresented experience", "No-show to interview", "Inappropriate conduct", "Other"];

/** #314 — flag the candidate to Hireable, with a reason and what happened (required: a flag needs something to review). */
function FlagDialog({ open, name, onClose, onSend }: { open: boolean; name: string; onClose: () => void; onSend: () => void }) {
  const [reason, setReason] = useState(FLAG_REASONS[0]);
  const [details, setDetails] = useState("");
  const first = name.split(" ")[0];
  const close = () => {
    setReason(FLAG_REASONS[0]);
    setDetails("");
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title={`Flag ${name}`}
      description={`Hireable reviews flags within 2 working days. ${first} isn't told about the flag.`}
      footer={
        <>
          <Button size="lg" onClick={close}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant="primary"
            disabled={!details.trim()}
            title={details.trim() ? undefined : "Say what happened to send the flag"}
            onClick={() => {
              onSend();
              setReason(FLAG_REASONS[0]);
              setDetails("");
            }}
          >
            Send flag
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Reason">
          <Select options={FLAG_REASONS} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Field label="Details" required>
          <Textarea required rows={3} className="h-[78px]" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What happened?" />
        </Field>
      </div>
    </Modal>
  );
}
