"use client";

import { useState } from "react";
import { ICONS } from "@/components/icons";
import { Button, Field, InfoBanner, Modal, Textarea } from "@/components/portal/ui";
import { isUpcoming } from "@/lib/portal/dates";

const Calendar = ICONS.calendar;

/**
 * The gate in front of TB-103 Request Proposal. The interview stage ends at Interview completed
 * (IN-018), and only the Team Builder knows it happened, so they say so here — asked, not
 * assumed. Both the pipeline board and the candidate profile open these same two dialogs, so a
 * proposal is never requested on a single click from either place.
 */
export function CompleteInterviewDialog({ open, name, when, onClose, onConfirm }: { open: boolean; name: string; when?: string; onClose: () => void; onConfirm: () => void }) {
  /** Marking it held before its start is allowed (demos run fast) but never silent. */
  const early = !!when && isUpcoming(when);
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
        {early && <InfoBanner tone="warn">This interview hasn&apos;t started yet. Only mark it done if you met {name} earlier than planned.</InfoBanner>}
      </div>
    </Modal>
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
      description="They read the role and its tasks, then send their pay and a cover letter. You can then send an offer with the tasks, request a revision or decline."
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
      <Field label="Note (optional)" hint={`${name} reads it beside the request.`}>
        <Textarea rows={3} className="h-[78px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything they should know before they propose" />
      </Field>
    </Modal>
  );
}
