"use client";

import { useState } from "react";
import { MdOutlineThumbDown } from "react-icons/md";
import { Button, Field, Modal, Select, Textarea } from "@/components/independent/ui";
import { ProposalReview } from "@/components/portal/ProposalReview";
import { SendOfferDialog } from "@/components/team/SendOfferDialog";
import { proposalHistory, useDeal, type Deal, type DealProposal } from "@/lib/demo/deal";
import { applySuggestions, type SuggestionDecision } from "@/lib/demo/suggestions";
import type { SetToast } from "@/lib/portal/toast";
import { byName } from "@/lib/team/data";
import type { Candidate, Independent, PaymentMethod, Role } from "@/lib/team/data";
import { DEAL_ID } from "@/lib/team/deal-view";
import { usePipeline } from "@/lib/team/pipeline";
import { useOffers } from "@/lib/team/offers";
import { useCards } from "@/lib/team/account";

const ThumbDown = MdOutlineThumbDown;

type Step = null | "revision" | "decline" | "offer";

/** Where the proposal stands: whether a revision is awaited, whether they declined the offer, and whether a revision can be asked for. */
function reviewFlags(candidate: Candidate, live: Deal | null) {
  /** TB-106 — a revision was requested and the independent hasn't resubmitted yet. */
  const awaitingRevision = !!live?.revision || candidate.status?.label === "Revision requested";
  /** IN-075 — they turned the offer down; the next move is a new offer, built from the same proposal. */
  const offerDeclined = live?.offer?.status === "declined";
  /** Only one revision request per round — asking again is what the resubmission is for. */
  const canRevise = !awaitingRevision && !offerDeclined && !candidate.dropped;
  /** TB-105 — the offer carries what the proposal settled, so every suggested task change is answered before one goes out. */
  const unanswered = (live?.proposal?.suggestions ?? []).filter((s) => !live?.suggestionDecisions?.[s.id]).length;
  return { awaitingRevision, offerDeclined, canRevise, unanswered };
}

/** The card an offer's deposit is charged to: the default one, or else the first on file. */
function defaultCard(cards: PaymentMethod[]) {
  return cards.find((c) => c.isDefault) ?? cards[0];
}

/** The candidate's proposal, with who wrote it: the live engagement, if the candidate is its talent, and the proposal on it. */
function useCandidateProposal(candidate: Candidate) {
  const deal = useDeal();
  const live = candidate.id === DEAL_ID ? deal : null;
  /** IN-072 — only the shared engagement has a talent who can write one. */
  const proposal = live?.proposal ?? null;
  const person = byName(candidate.independent);
  return { live, proposal, person, first: person.name.split(" ")[0] };
}

type CandidateProposal = ReturnType<typeof useCandidateProposal>;

/**
 * TB-104 → TB-107 — Review proposal and everything it leads to (send offer, request a revision,
 * decline), in one place so the pipeline card and the candidate's profile open the same dialog:
 * the proposal is one click from the board, not behind the profile.
 */
export function ProposalReviewDialog({ candidate, role, open, onClose, onToast }: { candidate: Candidate; role: Role; open: boolean; onClose: () => void; onToast: SetToast }) {
  const { requestRevision, declineProposal, commentOnProposal, decideSuggestion } = usePipeline();
  const [step, setStep] = useState<Step>(null);
  const review = useCandidateProposal(candidate);
  const { live, proposal, person: p, first } = review;

  const revise = (note: string) => {
    // TB-106 — the note travels with the request, so the talent revises against it.
    requestRevision(candidate.id, note);
    onToast("Revision requested");
  };
  const decline = (reason: string) => {
    // TB-107: a declined proposal belongs in Dropped, and the talent's own card says so, with the reason.
    declineProposal(candidate.id, reason);
    setStep(null);
    onClose();
    onToast("Proposal declined");
  };

  return (
    <>
      {/* Review proposal: the dialog owns its header, panes and action bar. */}
      <ReviewModal
        open={open && step === null}
        candidate={candidate}
        role={role}
        review={review}
        onClose={onClose}
        onToast={onToast}
        onRevise={revise}
        onComment={commentOnProposal}
        onDecide={decideSuggestion}
        onStep={setStep}
      />

      <RevisionModal open={open && step === "revision"} first={first} onClose={() => setStep(null)} onSend={revise} />

      <DeclineModal open={open && step === "decline"} first={first} onClose={() => setStep(null)} onDecline={decline} />

      {/* TB-105 — send offer: letter → tasks → dates → deposit → sign on a trial; letter → tasks → terms → sign otherwise. */}
      {proposal && (
        <OfferDialog
          open={open && step === "offer"}
          onClose={() => {
            setStep(null);
            onClose();
          }}
          person={p}
          role={role}
          proposal={proposal}
          decisions={live?.suggestionDecisions}
          onToast={onToast}
        />
      )}
    </>
  );
}

/**
 * Send offer, from the proposal: the offer starts from the job post's tasks with the talent's
 * accepted suggestions (`decisions`) applied, and its deposit goes on the default card.
 */
function OfferDialog({ open, onClose, person, role, proposal, decisions, onToast }: { open: boolean; onClose: () => void; person: Independent; role: Role; proposal: DealProposal; decisions: Deal["suggestionDecisions"]; onToast: SetToast }) {
  const { cards } = useCards();
  const { sendOffer } = useOffers();
  return (
    <SendOfferDialog
      // Starts from the job post's tasks with the suggestions accepted so far — remounted when they change.
      key={JSON.stringify(decisions ?? {})}
      startTasks={applySuggestions(role.tasks ?? [], proposal.suggestions, decisions)}
      open={open}
      onClose={onClose}
      person={person}
      role={role}
      proposal={proposal}
      card={defaultCard(cards)}
      onSend={(terms) => {
        // TB-105 — the tasks the proposal settled travel with the offer, so the talent signs the list and the
        // contract starts from it; a trial carries the escrow just funded.
        sendOffer({ type: role.type, ...terms });
        onToast("Offer sent to candidate");
      }}
    />
  );
}

/** The proposal itself — its versions, activity and task suggestions — with the actions it leads to. */
function ReviewModal({
  open,
  candidate,
  role,
  review,
  onClose,
  onToast,
  onRevise,
  onComment,
  onDecide,
  onStep,
}: {
  open: boolean;
  candidate: Candidate;
  role: Role;
  review: CandidateProposal;
  onClose: () => void;
  onToast: SetToast;
  onRevise: (note: string) => void;
  onComment: (id: string, text: string, file?: File) => void;
  onDecide: (id: string, decision: SuggestionDecision) => void;
  onStep: (step: Step) => void;
}) {
  const { live, proposal, person, first } = review;
  const { awaitingRevision, offerDeclined, canRevise, unanswered } = reviewFlags(candidate, live);
  return (
    <Modal open={open && !!proposal} onClose={onClose} title={`${first}'s proposal for ${role.title}`} width={1100} bare>
      {proposal && live && (
        <ProposalReview
          author={person}
          post={role}
          proposal={proposal}
          history={proposalHistory(live)}
          banner={awaitingRevision ? "Revision requested. Awaiting candidate resubmission." : candidate.dropped ? "Proposal declined." : undefined}
          onClose={onClose}
          canRevise={canRevise}
          onSend={(kind, text) => {
            if (kind === "revision") return onRevise(text);
            onComment(candidate.id, text);
          }}
          onAttach={(file) => {
            onComment(candidate.id, "", file);
            onToast(`${file.name} sent to ${first}`);
          }}
          decisions={live.suggestionDecisions}
          onDecide={awaitingRevision || candidate.dropped || live.offer?.status === "sent" || live.offer?.status === "accepted" ? undefined : onDecide}
          actions={<ReviewActions awaitingRevision={awaitingRevision} dropped={candidate.dropped} offerDeclined={offerDeclined} canRevise={canRevise} unanswered={unanswered} first={first} onStep={onStep} />}
        />
      )}
    </Modal>
  );
}

/**
 * The review's action bar: send an offer (a new one after a decline), request a revision, or decline
 * the proposal. An offer waits until each of the talent's suggested task changes has an answer.
 */
function ReviewActions({ awaitingRevision, dropped, offerDeclined, canRevise, unanswered, first, onStep }: { awaitingRevision: boolean; dropped?: boolean; offerDeclined: boolean; canRevise: boolean; unanswered: number; first: string; onStep: (step: Step) => void }) {
  const waiting = !awaitingRevision && !dropped && unanswered > 0;
  return (
    <>
      <Button
        size="xl"
        variant="primary"
        className="flex-1"
        disabled={awaitingRevision || dropped || unanswered > 0}
        title={waiting ? `Accept or ignore each change ${first} suggested first — the offer carries the tasks as you settle them` : undefined}
        onClick={() => onStep("offer")}
      >
        {offerDeclined ? "Send a new offer" : "Send offer"}
      </Button>
      <Button size="xl" disabled={!canRevise} onClick={() => onStep("revision")}>
        Request revision
      </Button>
      <Button size="xl" variant="ghost" className="!px-0 w-12 !rounded-full text-ink-2 disabled:text-[#c3c3c3]" disabled={!canRevise} title={canRevise ? "Decline proposal" : undefined} onClick={() => onStep("decline")}>
        <ThumbDown size={20} aria-hidden />
        <span className="sr-only">Decline proposal</span>
      </Button>
    </>
  );
}

/** Request a revision: the note the talent revises against, which the request can't go without. */
function RevisionModal({ open, first, onClose, onSend }: { open: boolean; first: string; onClose: () => void; onSend: (note: string) => void }) {
  /** TB-106 — the revision note is required before the request can be sent. */
  const [revisionNote, setRevisionNote] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request a revision"
      description={`${first} gets your note and can resubmit. The current version stays in the history.`}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant="primary"
            disabled={!revisionNote.trim()}
            onClick={() => {
              onSend(revisionNote.trim());
              setRevisionNote("");
              onClose();
            }}
          >
            Send request
          </Button>
        </>
      }
    >
      {/* TB-106: feedback is mandatory — "please revise" with no note isn't actionable. */}
      <Field label="What should change?">
        <Textarea rows={3} className="h-[78px]" value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} placeholder="e.g. Please split the outreach task into weekly targets and add the CRM clean-up." />
      </Field>
    </Modal>
  );
}

/** Decline the proposal, with the reason the talent is given. */
function DeclineModal({ open, first, onClose, onDecline }: { open: boolean; first: string; onClose: () => void; onDecline: (reason: string) => void }) {
  /** TB-107 — the reason the talent is told alongside the decline. */
  const [declineReason, setDeclineReason] = useState("Rate above budget");
  return (
    <Modal
      open={open}
      onClose={onClose}
      tone="danger"
      title="Decline this proposal?"
      description={`${first} is told the proposal was declined and moves to the Dropped column. You can undrop them later if things change.`}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="danger" onClick={() => onDecline(declineReason)}>
            Decline proposal
          </Button>
        </>
      }
    >
      <Field label="Reason">
        <Select options={["Rate above budget", "Not the right fit", "Chose another candidate", "Other"]} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} />
      </Field>
    </Modal>
  );
}
