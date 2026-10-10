"use client";

import { useState } from "react";
import { Button, Field, Modal, Select } from "@/components/portal/ui";
import { DatePicker } from "@/components/portal/date-picker";
import { canJoin, formatDate, INTERVIEW_TIMES, startOfToday } from "@/lib/portal/dates";
import { shortName } from "@/lib/portal/names";
import type { SetToast } from "@/lib/portal/toast";
import { byName } from "@/lib/team/data";
import type { Interview } from "@/lib/team/data";

/** What a booked interview's buttons open: the reschedule and the cancel confirmations. */
export type InterviewActions = { onReschedule: (iv: Interview) => void; onCancel: (iv: Interview) => void };

/**
 * A booked interview's buttons, on the candidate's card in the pipeline: join the call once it's
 * confirmed and about to start, move it, or call it off.
 */
export function InterviewButtons({ iv, onReschedule, onCancel }: { iv: Interview } & InterviewActions) {
  const confirmed = iv.status.label === "Confirmed";
  const joinable = confirmed && !!iv.link && canJoin(iv.when);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="primary"
        disabled={!joinable}
        title={joinable ? undefined : confirmed ? "Opens 15 minutes before the start" : "Opens once they confirm the interview"}
        onClick={() => iv.link && window.open(iv.link, "_blank", "noopener")}
      >
        Join call
      </Button>
      <Button size="sm" onClick={() => onReschedule(iv)}>
        Reschedule
      </Button>
      <Button size="sm" variant="danger" onClick={() => onCancel(iv)}>
        Cancel interview
      </Button>
    </div>
  );
}

/** A new date and time for one interview, sent to the candidate. Closing it, either way, clears the slot it was given. */
export function RescheduleDialog({ interview, onClose, onSend, onToast }: { interview: Interview | null; onClose: () => void; onSend: (id: string, when: string) => void; onToast: SetToast }) {
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [newTime, setNewTime] = useState(INTERVIEW_TIMES[0]);
  const close = () => {
    onClose();
    setNewDate(undefined);
    setNewTime(INTERVIEW_TIMES[0]);
  };
  return (
    <Modal
      open={!!interview}
      onClose={close}
      title={`Reschedule with ${interview ? shortName(byName(interview.independent).name) : ""}`}
      description="They get the new slot by email and in-app. The old slot is released back to your availability."
      footer={
        <>
          <Button size="lg" onClick={close}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant="primary"
            disabled={!newDate}
            onClick={() => {
              if (interview && newDate) onSend(interview.id, `${formatDate(newDate)}, ${newTime}`);
              close();
              onToast("New time sent");
            }}
          >
            Send new time
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <Field label="Date" className="flex-1" hint={!newDate ? "Required" : undefined}>
          <DatePicker value={newDate} onChange={setNewDate} disabled={{ before: startOfToday() }} placeholder="Pick a date" />
        </Field>
        <Field label="Time" className="flex-1">
          <Select options={INTERVIEW_TIMES} value={newTime} onChange={(e) => setNewTime(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/** Calling off one interview, once confirmed: the candidate gets a note and keeps their place in the tracker. */
export function CancelInterviewDialog({ interview, onClose, onCancel, onToast }: { interview: Interview | null; onClose: () => void; onCancel: (id: string) => void; onToast: SetToast }) {
  return (
    <Modal
      open={!!interview}
      onClose={onClose}
      tone="danger"
      title="Cancel this interview?"
      description={`${interview ? shortName(byName(interview.independent).name) : "The candidate"} gets a note and stays in the tracker. You can invite them again later.`}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Keep it
          </Button>
          <Button
            size="lg"
            variant="danger"
            onClick={() => {
              if (interview) onCancel(interview.id);
              onClose();
              onToast("Interview cancelled");
            }}
          >
            Cancel interview
          </Button>
        </>
      }
    />
  );
}
