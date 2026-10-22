"use client";

import { useState } from "react";
import { Button, Field, Modal, Textarea } from "@/components/portal/ui";
import { SlotClock, SlotFields } from "@/components/team/interview-slot";
import { canJoin, formatDate, isUpcoming } from "@/lib/portal/dates";
import { shortName } from "@/lib/portal/names";
import type { SetToast } from "@/lib/portal/toast";
import { byName } from "@/lib/team/data";
import type { Interview } from "@/lib/team/data";
import { joinOpensAt, teamOffset } from "@/lib/team/pipeline";

/** What a booked interview's buttons open: the reschedule and the cancel confirmations. */
export type InterviewActions = { onReschedule: (iv: Interview) => void; onCancel: (iv: Interview) => void };

const firstOf = (iv: Interview) => byName(iv.independent).name.split(" ")[0];

/** Why there's no Join call yet: it opens JOIN_OPENS_MINUTES before a confirmed slot, in the Team Builder's clock. */
function JoinNote({ iv, confirmed }: { iv: Interview; confirmed: boolean }) {
  const opens = confirmed && iv.link && isUpcoming(iv.when, iv.offset) ? joinOpensAt(iv.when, iv.offset) : undefined;
  const note = !confirmed ? `Join call opens once ${firstOf(iv)} confirms the interview.` : !iv.link ? "There's no meeting link for this interview." : opens ? `Join call opens ${opens}.` : "This interview's time has passed.";
  return <p className="text-[13px] leading-[1.4] tracking-[0.2px] text-ink-2">{note}</p>;
}

/**
 * #321 — a booked interview's buttons, on the candidate's card in the pipeline: Join call, the main
 * one, once it's confirmed and about to start (until then a line saying when it opens, not a dead
 * grey button), Reschedule, and Cancel interview.
 */
export function InterviewButtons({ iv, onReschedule, onCancel }: { iv: Interview } & InterviewActions) {
  const confirmed = iv.status.label === "Confirmed";
  const joinable = confirmed && !!iv.link && canJoin(iv.when, iv.offset);
  return (
    <div className="flex flex-col gap-3">
      {!joinable && <JoinNote iv={iv} confirmed={confirmed} />}
      <div className="flex flex-wrap gap-2">
        {joinable && (
          <Button size="sm" variant="primary" onClick={() => iv.link && window.open(iv.link, "_blank", "noopener")}>
            Join call
          </Button>
        )}
        <Button size="sm" onClick={() => onReschedule(iv)}>
          Reschedule
        </Button>
        <Button size="sm" variant="danger" onClick={() => onCancel(iv)}>
          Cancel interview
        </Button>
      </div>
    </div>
  );
}

/**
 * #324 — a new date and time for one interview, picked in the Team Builder's clock, with a note on
 * why or when works: the candidate can accept it or ask for another. Closing it, either way, clears it.
 */
export function RescheduleDialog({ interview, onClose, onSend, onToast }: { interview: Interview | null; onClose: () => void; onSend: (id: string, when: string, note?: string) => void; onToast: SetToast }) {
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [newTime, setNewTime] = useState("");
  const [note, setNote] = useState("");
  const first = interview ? firstOf(interview) : "";
  const close = () => {
    onClose();
    setNewDate(undefined);
    setNewTime("");
    setNote("");
  };
  return (
    <Modal
      open={!!interview}
      onClose={close}
      title={`Reschedule with ${interview ? shortName(byName(interview.independent).name) : ""}`}
      description={`${first} gets the new time by email and in-app, and can accept it or ask for another.`}
      footer={
        <>
          <Button size="lg" onClick={close}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant="primary"
            disabled={!newDate || !newTime}
            title={!newDate || !newTime ? "Pick a date and a time first" : undefined}
            onClick={() => {
              if (interview && newDate) onSend(interview.id, `${formatDate(newDate)}, ${newTime}`, note);
              close();
              onToast(`New time sent to ${first}`);
            }}
          >
            Send new time
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <SlotFields date={newDate} time={newTime} setDate={setNewDate} setTime={setNewTime} />
        {interview && <SlotClock date={newDate} time={newTime} offset={teamOffset()} independent={interview.independent} />}
        <Field label="Note (optional)">
          <Textarea rows={3} className="h-[78px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why it's moving, or when works for you" />
        </Field>
      </div>
    </Modal>
  );
}

/**
 * #325 — calling off one interview: the candidate is told, with the reason when one is given, and
 * stays in the pipeline. "Ask for a new time" moves it instead (`onMove` opens Reschedule).
 */
export function CancelInterviewDialog({ interview, onClose, onCancel, onMove, onToast }: { interview: Interview | null; onClose: () => void; onCancel: (id: string, reason?: string) => void; onMove: () => void; onToast: SetToast }) {
  const [reason, setReason] = useState("");
  const first = interview ? firstOf(interview) : "The candidate";
  const close = () => {
    setReason("");
    onClose();
  };
  return (
    <Modal
      open={!!interview}
      onClose={close}
      tone="danger"
      title="Cancel this interview?"
      description={`${first} is told the interview is cancelled.`}
      footer={
        <>
          <Button size="lg" onClick={close}>
            Keep it
          </Button>
          <Button
            size="lg"
            onClick={() => {
              setReason("");
              onMove();
            }}
          >
            Ask for a new time
          </Button>
          <Button
            size="lg"
            variant="danger"
            onClick={() => {
              if (interview) onCancel(interview.id, reason);
              close();
              onToast(`Interview with ${first} cancelled`);
            }}
          >
            Cancel interview
          </Button>
        </>
      }
    >
      <Field label="Reason (optional)">
        <Textarea rows={3} className="h-[78px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={`What ${first} should know`} />
      </Field>
    </Modal>
  );
}
