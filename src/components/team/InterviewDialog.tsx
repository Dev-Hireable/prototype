"use client";

import { useState } from "react";
import { Button, Field, Input, Modal, Select, Textarea } from "@/components/independent/ui";
import { DatePicker, formatDate, startOfToday } from "@/components/portal/DatePicker";
import { byName } from "@/lib/team/data";
import type { Candidate } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";

/**
 * The slots an interview can be booked or moved to, in the Team Builder's time zone — (GMT+8)
 * Manila, as the availability settings say. They were EST here and PHT in Reschedule, so one
 * interview could read in two zones.
 */
export const INTERVIEW_TIMES = ["09:00 AM (PHT)", "10:00 AM (PHT)", "02:00 PM (PHT)", "04:00 PM (PHT)"];

/**
 * TB-037 / TB-040 — "Invite to interview", shared by the candidate profile and the pipeline board,
 * so the board can offer the CTA without sending the Team Builder off to a profile first. Also
 * how a declined or cancelled interview is offered again: a new slot replaces the old one.
 */
export function InterviewDialog({ candidate, onClose, onSent }: { candidate: Candidate | null; onClose: () => void; onSent: (name: string) => void }) {
  const { inviteToInterview } = useDemo();
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [link, setLink] = useState("https://meet.google.com/yxw-vuts-rqp");
  const first = candidate ? byName(candidate.independent).name.split(" ")[0] : "them";

  const send = () => {
    if (!candidate || !date || !time) return;
    // "Tue 6 Jan 2026, 10:00 AM (PHT)" — the lists split the date from the time on ", ".
    inviteToInterview(candidate.id, { when: `${formatDate(date)}, ${time}`, format: link.includes("zoom") ? "Zoom" : "Google Meet", link });
    setDate(undefined);
    setTime("");
    onSent(first);
    onClose();
  };

  return (
    <Modal
      open={!!candidate}
      onClose={onClose}
      title={`Invite ${first} to interview`}
      description="Pick a slot from your availability. They get the invite by email and in-app and can accept or ask to reschedule."
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" disabled={!date || !time} onClick={send}>
            Send invitation
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          {/* It was a free-text box, so anything typed became the interview date. Past days can't be picked. */}
          <Field label="Date" className="flex-1" hint={!date ? "Required" : undefined}>
            <DatePicker value={date} onChange={setDate} disabled={{ before: startOfToday() }} placeholder="Pick a date" />
          </Field>
          <Field label="Time" className="flex-1">
            <Select options={["", ...INTERVIEW_TIMES]} value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <Field label="Meeting link">
          <Input value={link} onChange={(e) => setLink(e.target.value)} />
        </Field>
        <Field label="Note (optional)">
          <Textarea rows={3} className="h-[78px]" placeholder="Anything they should prepare" />
        </Field>
      </div>
    </Modal>
  );
}
