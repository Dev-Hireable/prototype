"use client";

import { useState } from "react";
import { Button, Field, InfoBanner, Input, Modal, Select, Textarea } from "@/components/portal/ui";
import { DatePicker } from "@/components/portal/date-picker";
import { useDeal } from "@/lib/demo/deal";
import { byName } from "@/lib/team/data";
import type { Candidate } from "@/lib/team/data";
import { DEAL_ID } from "@/lib/team/deal-view";
import { usePipeline } from "@/lib/team/pipeline";
import { formatDate, INTERVIEW_TIMES, parseDay, startOfToday } from "@/lib/portal/dates";

/**
 * TB-037 / TB-040 — "Invite to interview", shared by the candidate profile and the pipeline board,
 * so the board can offer the CTA without sending the Team Builder off to a profile first. Also
 * how a declined or cancelled interview is offered again: a new slot replaces the old one. When
 * the talent asked for a new time (IN-071), it opens on that slot, so confirming it is one click.
 */
export function InterviewDialog({ candidate, onClose, onSent }: { candidate: Candidate | null; onClose: () => void; onSent: (name: string) => void }) {
  const { inviteToInterview } = usePipeline();
  const deal = useDeal();
  /** The slot the live talent asked for, split back into the picker's date and time. */
  const requested = candidate?.id === DEAL_ID && deal?.interview?.outcome === "reschedule" ? deal.interview.requested : undefined;
  const [askedDay, askedTime = ""] = requested?.when.split(", ") ?? [];
  const [picked, setDate] = useState<Date | undefined>();
  const [pickedTime, setTime] = useState("");
  /** What the Team Builder picked, or else the slot asked for. */
  const date = picked ?? parseDay(askedDay);
  const time = pickedTime || askedTime;
  const [link, setLink] = useState("https://meet.google.com/yxw-vuts-rqp");
  /** Sent with the invite — it used to be an uncontrolled box whose text went nowhere. */
  const [note, setNote] = useState("");
  const first = candidate ? byName(candidate.independent).name.split(" ")[0] : "them";
  const linkOk = /^https?:\/\/\S+\.\S+/.test(link.trim());
  const reset = () => {
    setDate(undefined);
    setTime("");
    setNote("");
  };
  const close = () => {
    reset();
    onClose();
  };

  const send = () => {
    if (!candidate || !date || !time || !linkOk) return;
    // "Tue 6 Jan 2026, 10:00 AM (PHT)" — the lists split the date from the time on ", ".
    inviteToInterview(candidate.id, { when: `${formatDate(date)}, ${time}`, format: link.includes("zoom") ? "Zoom" : "Google Meet", link: link.trim(), note });
    reset();
    onSent(first);
    onClose();
  };

  /** Sending the slot they asked for confirms it; any other goes to them to accept. */
  const asked = !!requested && !!date && `${formatDate(date)}, ${time}` === requested.when;

  return (
    <Modal
      open={!!candidate}
      onClose={close}
      title={requested ? `${first} asked for a new time` : `Invite ${first} to interview`}
      description={requested ? "Confirm the slot they asked for, or pick another from your availability for them to accept." : "Pick a slot from your availability. They get the invite by email and in-app and can accept or ask for a new time."}
      footer={
        <>
          <Button size="lg" onClick={close}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" disabled={!date || !time || !linkOk} onClick={send}>
            {asked ? "Confirm this time" : "Send invitation"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {requested && (
          <InfoBanner>
            {first} asked for {requested.when}.{requested.note ? ` “${requested.note}”` : ""}
          </InfoBanner>
        )}
        <div className="flex gap-3">
          {/* It was a free-text box, so anything typed became the interview date. Past days can't be picked. */}
          <Field label="Date" className="flex-1" hint={!date ? "Required" : undefined}>
            <DatePicker value={date} onChange={setDate} disabled={{ before: startOfToday() }} placeholder="Pick a date" />
          </Field>
          <Field label="Time" className="flex-1">
            <Select options={["", ...INTERVIEW_TIMES]} placeholder="Pick a time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        {/* A blank link used to go out, and the talent had nothing to join. */}
        <Field label="Meeting link" error={linkOk ? undefined : "Add the meeting link, starting with https://"}>
          <Input value={link} onChange={(e) => setLink(e.target.value)} />
        </Field>
        <Field label="Note (optional)" hint={`${first} reads it with the invitation.`}>
          <Textarea rows={3} className="h-[78px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything they should prepare" />
        </Field>
      </div>
    </Modal>
  );
}
