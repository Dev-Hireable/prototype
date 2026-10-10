"use client";

import { useState } from "react";
import { Button, Field, Modal, Select, Textarea } from "@/components/portal/ui";
import { DatePicker } from "@/components/portal/date-picker";
import { formatDate, INTERVIEW_TIMES, startOfToday } from "@/lib/portal/dates";

/**
 * IN-071 — can't make the interview: the talent picks the slot they can do, from the Team
 * Builder's bookable times, with a note if they like. The Team Builder confirms it or offers
 * another; until then the interview is on hold. Closing it, either way, clears what was picked.
 */
export function RescheduleDialog({ open, company, when, onClose, onSend }: { open: boolean; company: string; when: string; onClose: () => void; onSend: (when: string, note: string) => void }) {
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const close = () => {
    setDate(undefined);
    setTime("");
    setNote("");
    onClose();
  };
  /** "Tue 6 Jan 2026, 10:00 AM (PHT)" — the same shape as a booked slot, so both lists split it alike. */
  const slot = date && time ? `${formatDate(date)}, ${time}` : "";
  return (
    <Modal
      open={open}
      onClose={close}
      title="Ask for a new time"
      description={`Can't make ${when}? Pick a time that works for you. ${company} confirms it or offers another.`}
      footer={
        <>
          <Button size="lg" onClick={close}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant="primary"
            disabled={!slot}
            onClick={() => {
              onSend(slot, note);
              close();
            }}
          >
            Send request
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <Field label="Date" className="flex-1" hint={!date ? "Required" : undefined}>
            <DatePicker value={date} onChange={setDate} disabled={{ before: startOfToday() }} placeholder="Pick a date" />
          </Field>
          <Field label="Time" className="flex-1" hint={!time ? "Required" : undefined}>
            <Select options={["", ...INTERVIEW_TIMES]} placeholder="Pick a time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <Field label="Note (optional)" hint={`${company} reads it with your request.`}>
          <Textarea rows={3} className="h-[78px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why the time doesn't work, or other times you're free" />
        </Field>
      </div>
    </Modal>
  );
}
