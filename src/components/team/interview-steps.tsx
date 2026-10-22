"use client";

import { useState } from "react";
import { ICONS } from "@/components/icons";
import { Button, Field, InfoBanner, Modal, Textarea } from "@/components/portal/ui";
import { isUpcoming } from "@/lib/portal/dates";
import type { Interview } from "@/lib/team/data";
import { slotForTeam } from "@/lib/team/pipeline";

const Calendar = ICONS.calendar;

/**
 * The gate in front of TB-103 Request Proposal, for an interview held before its slot is over: the
 * interview stage ends at Interview completed (IN-018), which happens on its own once the slot has
 * passed (sweepInterview), or here, when the Team Builder met the talent sooner. Both the pipeline
 * board and the candidate profile open these same two dialogs, so a proposal is never requested on
 * a single click from either place.
 */
export function CompleteInterviewDialog({ open, name, interview, onClose, onConfirm }: { open: boolean; name: string; interview?: Pick<Interview, "when" | "offset" | "independent">; onClose: () => void; onConfirm: () => void }) {
  /** Marking it held before its start is allowed (demos run fast) but never silent. */
  const early = !!interview && isUpcoming(interview.when, interview.offset);
  const when = interview && slotForTeam(interview.when, interview.offset, interview.independent);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Is the interview with ${name} done?`}
      description={`Mark it done once you've met. ${name} moves to Interview completed, and you can request a proposal next.`}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Not yet
          </Button>
          <Button size="lg" variant="primary" onClick={onConfirm}>
            {early ? "Mark it done anyway" : "Yes, it's done"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {when && (
          <p className="flex items-center gap-2 rounded-lg bg-surface-2 px-4 py-3 text-[14px] leading-[1.2] tracking-[0.2px] text-ink">
            <Calendar size={18} aria-hidden className="shrink-0 text-ink-2" />
            Scheduled for {when}
          </p>
        )}
        {early && <InfoBanner tone="warn">This interview has not started yet. Mark it done only if you already met.</InfoBanner>}
      </div>
    </Modal>
  );
}

/**
 * #313 — an interview marked done on its own once its slot passed, that didn't take place: the
 * candidate goes back to needing a new time, which the Team Builder offers next.
 */
export function MissedInterviewDialog({ open, name, onClose, onConfirm }: { open: boolean; name: string; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Mark the interview with ${name} as not held?`}
      description={`It was marked done once its time had passed. ${name} goes back to needing a new time, and you can offer one next.`}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" onClick={onConfirm}>
            It didn&apos;t happen
          </Button>
        </>
      }
    />
  );
}

/** TB-103 — confirmed here rather than sent on the button's first click; the note goes to the talent. */
export function RequestProposalDialog({ open, name, onClose, onSend }: { open: boolean; name: string; onClose: () => void; onSend: (note: string) => void }) {
  const [note, setNote] = useState("");
  const close = () => {
    setNote("");
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title={`Request a proposal from ${name}`}
      description="They will send a proposal with a rate and cover letter. You can then send an offer, request a revision or decline."
      footer={
        <>
          <Button size="lg" onClick={close}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant="primary"
            onClick={() => {
              onSend(note.trim());
              setNote("");
            }}
          >
            Send request
          </Button>
        </>
      }
    >
      <Field label="Note (optional)">
        <Textarea rows={3} className="h-[78px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything they should know before they propose" />
      </Field>
    </Modal>
  );
}
