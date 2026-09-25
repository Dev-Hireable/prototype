"use client";

import { useState } from "react";
import { MdOutlineThumbDown } from "react-icons/md";
import { Button, Field, Modal, Select, Textarea } from "@/components/independent/ui";
import { ProposalReview } from "@/components/portal/ProposalReview";
import { SendOfferDialog } from "@/components/team/SendOfferDialog";
import { proposalHistory, useDeal } from "@/lib/demo/deal";
import { applySuggestions } from "@/lib/demo/suggestions";
import { byName } from "@/lib/team/data";
import type { Candidate, Role } from "@/lib/team/data";
import { DEAL_ID } from "@/lib/team/deal-view";
import { useDemo } from "@/lib/team/store";

const ThumbDown = MdOutlineThumbDown;

type Step = null | "revision" | "decline" | "offer";

/**
 * TB-104 → TB-107 — Review proposal and everything it leads to (send offer, request a revision,
 * decline), in one place so the pipeline card and the candidate's profile open the same dialog:
 * the proposal is one click from the board, not behind the profile.
 */
export function ProposalReviewDialog({ candidate, role, open, onClose, onToast }: { candidate: Candidate; role: Role; open: boolean; onClose: () => void; onToast: (message: string) => void }) {
  const { requestRevision, declineProposal, commentOnProposal, sendOffer, decideSuggestion, cards } = useDemo();
  const deal = useDeal();
  const [step, setStep] = useState<Step>(null);
  /** TB-106 — the revision note is required before the request can be sent. */
  const [revisionNote, setRevisionNote] = useState("");
  /** TB-107 — the reason the talent is told alongside the decline. */
  const [declineReason, setDeclineReason] = useState("Rate above budget");
  const live = candidate.id === DEAL_ID ? deal : null;
  /** IN-072 — only the shared engagement has a talent who can write one. */
  const proposal = live?.proposal ?? null;
  const p = byName(candidate.independent);
  const first = p.name.split(" ")[0];
  /** TB-106 — a revision was requested and the independent hasn't resubmitted yet. */
  const awaitingRevision = !!live?.revision || candidate.status?.label === "Revision requested";
  /** IN-075 — they turned the offer down; the next move is a new offer, built from the same proposal. */
  const offerDeclined = live?.offer?.status === "declined";
  /** Only one revision request per round — asking again is what the resubmission is for. */
  const canRevise = !awaitingRevision && !offerDeclined && !candidate.dropped;

  const revise = (note: string) => {
    // TB-106 — the note travels with the request, so the talent revises against it.
    requestRevision(candidate.id, note);
    onToast("Revision requested");
  };

  return (
    <>
      {/* Review proposal — Figma node 11338-10867: the dialog owns its header, panes and action bar. */}
      <Modal open={open && step === null && !!proposal} onClose={onClose} title={`${first}'s proposal for ${role.title}`} width={1100} bare>
        {proposal && live && (
          <ProposalReview
            author={p}
            post={role}
            proposal={proposal}
            history={proposalHistory(live)}
            banner={awaitingRevision ? "Revision requested. Awaiting candidate resubmission." : candidate.dropped ? "Proposal declined." : undefined}
            onClose={onClose}
            canRevise={canRevise}
            onSend={(kind, text) => {
              if (kind === "revision") return revise(text);
              commentOnProposal(candidate.id, text);
            }}
            onAttach={(file) => {
              commentOnProposal(candidate.id, "", file);
              onToast(`${file.name} sent to ${first}`);
            }}
            decisions={live.suggestionDecisions}
            onDecide={awaitingRevision || candidate.dropped || live.offer?.status === "sent" || live.offer?.status === "accepted" ? undefined : decideSuggestion}
            actions={
              <>
                <Button size="xl" variant="primary" className="flex-1" disabled={awaitingRevision || candidate.dropped} onClick={() => setStep("offer")}>
                  {offerDeclined ? "Send a new offer" : "Send offer"}
                </Button>
                <Button size="xl" disabled={!canRevise} onClick={() => setStep("revision")}>
                  Request revision
                </Button>
                <Button size="xl" variant="ghost" className="!px-0 w-12 !rounded-full text-ink-2 disabled:text-[#c3c3c3]" disabled={!canRevise} title={canRevise ? "Decline proposal" : undefined} onClick={() => setStep("decline")}>
                  <ThumbDown size={20} aria-hidden />
                  <span className="sr-only">Decline proposal</span>
                </Button>
              </>
            }
          />
        )}
      </Modal>

      <Modal
        open={open && step === "revision"}
        onClose={() => setStep(null)}
        title="Request a revision"
        description={`${first} gets your note and can resubmit. The current version stays in the history.`}
        footer={
          <>
            <Button size="lg" onClick={() => setStep(null)}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant="primary"
              disabled={!revisionNote.trim()}
              onClick={() => {
                revise(revisionNote.trim());
                setRevisionNote("");
                setStep(null);
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

      <Modal
        open={open && step === "decline"}
        onClose={() => setStep(null)}
        tone="danger"
        title="Decline this proposal?"
        description={`${first} is told the proposal was declined and moves to the Dropped column. You can undrop them later if things change.`}
        footer={
          <>
            <Button size="lg" onClick={() => setStep(null)}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant="danger"
              onClick={() => {
                // TB-107: a declined proposal belongs in Dropped, and the talent's own card says so, with the reason.
                declineProposal(candidate.id, declineReason);
                setStep(null);
                onClose();
                onToast("Proposal declined");
              }}
            >
              Decline proposal
            </Button>
          </>
        }
      >
        <Field label="Reason">
          <Select options={["Rate above budget", "Not the right fit", "Chose another candidate", "Other"]} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} />
        </Field>
      </Modal>

      {/* TB-105 — send offer: letter → tasks → dates → deposit → sign on a trial; letter → tasks → terms → sign otherwise. */}
      {proposal && (
        <SendOfferDialog
          // Starts from the job post's tasks with the suggestions accepted so far — remounted when they change.
          key={JSON.stringify(live?.suggestionDecisions ?? {})}
          startTasks={applySuggestions(role.tasks ?? [], proposal.suggestions, live?.suggestionDecisions)}
          open={open && step === "offer"}
          onClose={() => {
            setStep(null);
            onClose();
          }}
          person={p}
          role={role}
          proposal={proposal}
          card={cards.find((c) => c.isDefault) ?? cards[0]}
          onSend={(terms) => {
            // TB-105 — the tasks set in the offer travel with it, so the talent signs the list and the
            // contract starts from it; a trial carries the escrow just funded.
            sendOffer({ type: role.type, ...terms });
            onToast("Offer sent to candidate");
          }}
        />
      )}
    </>
  );
}
