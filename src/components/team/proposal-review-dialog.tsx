"use client";

import { useState } from "react";
import { Button, Field, Modal, Select, Textarea } from "@/components/portal/ui";
import { ProposalReview } from "@/components/portal/proposal-review";
import { SendOfferDialog } from "@/components/team/send-offer-dialog";
import { proposalHistory, useDeal, type Deal, type DealProposal } from "@/lib/demo/deal";
import { shortName } from "@/lib/portal/names";
import type { SetToast } from "@/lib/portal/toast";
import { byName } from "@/lib/team/data";
import type { Candidate, Independent, Role } from "@/lib/team/data";
import { DEAL_ID } from "@/lib/team/deal-view";
import { usePipeline } from "@/lib/team/pipeline";
import { useOffers } from "@/lib/team/offers";
import { useCards, useTeamAccount } from "@/lib/team/account";

type Step = null | "revision" | "decline" | "offer";

/**
 * Where the proposal stands: a revision awaited, the offer they declined (the next move is a new
 * offer from the same proposal), an offer already out or signed, and whether a revision can be asked
 * for. Only one revision request per round: asking again is what the resubmission is for.
 */
function reviewFlags(candidate: Candidate, live: Deal | null) {
  const awaitingRevision = !!live?.revision || candidate.status?.label === "Revision requested";
  const offerDeclined = live?.offer?.status === "declined";
  const offerOut = live?.offer?.status === "sent" || live?.offer?.status === "accepted";
  const canRevise = !awaitingRevision && !offerDeclined && !offerOut && !candidate.dropped;
  return { awaitingRevision, offerDeclined, canRevise };
}

type ReviewFlags = ReturnType<typeof reviewFlags>;

/** Why Send offer is off, said beside it: they were declined, a revision is awaited, or an offer is already out or signed. Null while it can go. */
function offerHint(candidate: Candidate, live: Deal | null, first: string): string | null {
  if (candidate.dropped) return live?.proposalDeclined ? `You declined this proposal. Restore ${first} to send an offer.` : `You declined ${first}. Restore them to send an offer.`;
  if (live?.revision || candidate.status?.label === "Revision requested") return `Send offer opens when ${first} resubmits.`;
  if (live?.offer?.status === "sent") return `Your offer is with ${first}. Withdraw it to send another.`;
  if (live?.offer?.status === "accepted") return `${first} accepted your offer.`;
  return null;
}

/** The candidate's proposal, with who wrote it: the live engagement, if the candidate is its talent, and the proposal on it. */
function useCandidateProposal(candidate: Candidate) {
  const deal = useDeal();
  const live = candidate.id === DEAL_ID ? deal : null;
  /** IN-072 — only the shared engagement has a talent who can write one. */
  const proposal = live?.proposal ?? null;
  const full = byName(candidate.independent);
  // Not hired yet, so the proposal and the offer name them "Juan D.": the surname stays an initial.
  const person = { ...full, name: shortName(full.name) };
  return { live, proposal, person, first: person.name.split(" ")[0] };
}

type CandidateProposal = ReturnType<typeof useCandidateProposal>;

/**
 * TB-104 → TB-107 — Review proposal and everything it leads to (send offer, request a revision,
 * decline), in one place so the pipeline card, the candidate's profile and the proposal's link in
 * Messages open the same dialog. What happens here is logged in the thread with the talent.
 */
export function ProposalReviewDialog({ candidate, role, open, onClose, onToast }: { candidate: Candidate; role: Role; open: boolean; onClose: () => void; onToast: SetToast }) {
  const { requestRevision, declineProposal } = usePipeline();
  const [step, setStep] = useState<Step>(null);
  const review = useCandidateProposal(candidate);
  const { proposal, person: p, first } = review;

  const revise = (note: string) => {
    // TB-106 — the note travels with the request, and goes to the thread with the proposal linked.
    requestRevision(candidate.id, note);
    onToast("Revision requested");
  };
  const decline = (reason: string) => {
    // TB-107: a declined proposal belongs in Declined, and the talent's own card says so, with the reason.
    declineProposal(candidate.id, reason);
    setStep(null);
    onClose();
    onToast("Proposal declined");
  };

  return (
    <>
      {/* Review proposal: the dialog owns its header, body and action bar. */}
      <ReviewModal open={open && step === null} candidate={candidate} role={role} review={review} onClose={onClose} onStep={setStep} />

      <RevisionModal open={open && step === "revision"} first={first} onClose={() => setStep(null)} onSend={revise} />

      <DeclineModal open={open && step === "decline"} first={first} onClose={() => setStep(null)} onDecline={decline} />

      {/* TB-105 — send offer: letter → tasks → dates → deposit and sign on a trial; letter → tasks → terms and sign otherwise. */}
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
          onToast={onToast}
        />
      )}
    </>
  );
}

/**
 * Send offer, from the proposal: the offer carries the role's tasks, it's paid from the card picked
 * there (the default to begin with), and the Team Builder signs it with their account's name.
 */
function OfferDialog({ open, onClose, person, role, proposal, onToast }: { open: boolean; onClose: () => void; person: Independent; role: Role; proposal: DealProposal; onToast: SetToast }) {
  const { cards } = useCards();
  const { profile } = useTeamAccount();
  const { sendOffer } = useOffers();
  return (
    <SendOfferDialog
      open={open}
      onClose={onClose}
      person={person}
      role={role}
      proposal={proposal}
      cards={cards}
      signer={profile.name}
      onSend={(terms) => {
        // TB-105 — the role's tasks travel with the offer, so the talent signs the list and the
        // contract starts from it; a trial carries the escrow just funded.
        sendOffer({ type: role.type, ...terms });
        onToast("Offer sent to candidate");
      }}
    />
  );
}

/** The proposal itself, with its versions, and the actions it leads to. */
function ReviewModal({ open, candidate, role, review, onClose, onStep }: { open: boolean; candidate: Candidate; role: Role; review: CandidateProposal; onClose: () => void; onStep: (step: Step) => void }) {
  const { live, proposal, person, first } = review;
  const flags = reviewFlags(candidate, live);
  return (
    <Modal open={open && !!proposal} onClose={onClose} title={`${first}'s proposal for ${role.title}`} width={760} bare>
      {proposal && live && (
        <ProposalReview
          author={person}
          post={role}
          proposal={proposal}
          history={proposalHistory(live)}
          banner={flags.awaitingRevision ? `You asked ${first} for a revision.` : candidate.dropped ? "Proposal declined." : undefined}
          onClose={onClose}
          actions={<ReviewActions flags={flags} hint={offerHint(candidate, live, first)} onStep={onStep} />}
        />
      )}
    </Modal>
  );
}

/**
 * The review's action bar: send an offer (a new one after a decline), request a revision, or decline
 * the proposal, with the reason under them while Send offer is off.
 */
function ReviewActions({ flags, hint, onStep }: { flags: ReviewFlags; hint: string | null; onStep: (step: Step) => void }) {
  const { offerDeclined, canRevise } = flags;
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2.5">
        <Button size="xl" variant="primary" className="flex-1" disabled={!!hint} onClick={() => onStep("offer")}>
          {offerDeclined ? "Send a new offer" : "Send offer"}
        </Button>
        <Button size="xl" disabled={!canRevise} onClick={() => onStep("revision")}>
          Request revision
        </Button>
        {/* TB-107 — one word for it everywhere: the proposal is declined, the card moves to Declined, and Restore brings it back. */}
        <Button size="xl" variant="danger" disabled={!canRevise} onClick={() => onStep("decline")}>
          Decline proposal
        </Button>
      </div>
      {hint && <p className="text-[13px] leading-[1.4] tracking-[0.2px] text-ink-2">{hint}</p>}
    </div>
  );
}

/** Request a revision: the note the talent revises against, which the request can't go without. It reaches them in Messages. */
function RevisionModal({ open, first, onClose, onSend }: { open: boolean; first: string; onClose: () => void; onSend: (note: string) => void }) {
  /** TB-106 — the revision note is required before the request can be sent. */
  const [revisionNote, setRevisionNote] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request a revision"
      description={`${first} gets your note in Messages and can resubmit.`}
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
      <Field label="What should change?" required>
        <Textarea rows={3} required className="h-[78px]" value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} placeholder="e.g. Could you start a week later, at the same rate?" />
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
      description={`${first} is told the proposal was declined and moves to the Declined column. You can restore them later if things change.`}
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
