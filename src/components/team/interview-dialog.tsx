"use client";

import { useState } from "react";
import { Button, Field, InfoBanner, Input, Modal, Textarea } from "@/components/portal/ui";
import { SlotClock, SlotFields } from "@/components/team/interview-slot";
import { useDeal } from "@/lib/demo/deal";
import { byName } from "@/lib/team/data";
import type { Candidate } from "@/lib/team/data";
import { DEAL_ID } from "@/lib/team/deal-view";
import { slotForTeam, teamOffset, usePipeline } from "@/lib/team/pipeline";
import { formatDate, parseDay, slotOffset } from "@/lib/portal/dates";

/**
 * TB-037 / TB-040 — "Invite to interview", shared by the candidate profile and the pipeline board,
 * so the board can offer the CTA without sending the Team Builder off to a profile first. Also
 * how a declined or cancelled interview is offered again: a new slot replaces the old one. When
 * the talent asked for a new time (IN-093), it opens on that slot, so confirming it is one click.
 */
/** The slot being picked: the live talent's asked-for one until the Team Builder picks another. */
function useSlot(candidate: Candidate | null) {
  const deal = useDeal();
  /** The slot the live talent asked for, split back into the picker's date and time. */
  const requested = candidate?.id === DEAL_ID && deal?.interview?.outcome === "reschedule" ? deal.interview.requested : undefined;
  const [askedDay, askedTime = ""] = requested?.when.split(", ") ?? [];
  const [picked, setDate] = useState<Date | undefined>();
  const [pickedTime, setTime] = useState("");
  /** What the Team Builder picked, or else the slot asked for. */
  const date = picked ?? parseDay(askedDay);
  const time = pickedTime || askedTime;
  /** Sending the slot they asked for confirms it; any other goes to them to accept. */
  const asked = !!requested && !!date && `${formatDate(date)}, ${time}` === requested.when;
  /** The clock the slot is in: the talent's, for the time they asked for; the Team Builder's otherwise. */
  const offset = asked && requested ? slotOffset(requested.when, requested.offset) : teamOffset();
  const reset = () => {
    setDate(undefined);
    setTime("");
  };
  return { requested, date, time, setDate, setTime, asked, offset, reset };
}

/** The dialog's heading and lead: answering a time they asked for, or a fresh invitation. */
const copyFor = (first: string, rescheduling: boolean) =>
  rescheduling
    ? { title: `${first} asked for a new time`, description: "Confirm the slot they asked for, or pick another for them to accept." }
    : { title: `Invite ${first} to interview`, description: "Pick a date and time. They get the invite by email and in-app and can accept or ask for a new time." };

/** Cancel, and Send — which confirms the slot when it's the one they asked for. */
function InterviewActions({ ready, asked, onCancel, onSend }: { ready: boolean; asked: boolean; onCancel: () => void; onSend: () => void }) {
  return (
    <>
      <Button size="lg" onClick={onCancel}>
        Cancel
      </Button>
      <Button size="lg" variant="primary" disabled={!ready} onClick={onSend}>
        {asked ? "Confirm this time" : "Send invitation"}
      </Button>
    </>
  );
}

export function InterviewDialog({ candidate, onClose, onSent }: { candidate: Candidate | null; onClose: () => void; onSent: (name: string) => void }) {
  const { inviteToInterview } = usePipeline();
  const { requested, date, time, setDate, setTime, asked, offset, reset: resetSlot } = useSlot(candidate);
  const [link, setLink] = useState("https://meet.google.com/yxw-vuts-rqp");
  /** Sent with the invite — it used to be an uncontrolled box whose text went nowhere. */
  const [note, setNote] = useState("");
  const first = candidate ? byName(candidate.independent).name.split(" ")[0] : "them";
  const linkOk = /^https?:\/\/\S+\.\S+/.test(link.trim());
  const ready = !!date && !!time && linkOk;
  const copy = copyFor(first, !!requested);
  const reset = () => {
    resetSlot();
    setNote("");
  };
  const close = () => {
    reset();
    onClose();
  };

  const send = () => {
    if (!candidate || !date || !ready) return;
    // "Tue 6 Jan 2026, 10:00 AM", in the clock it was picked in — the lists split the date from the time on ", ".
    inviteToInterview(candidate.id, { when: `${formatDate(date)}, ${time}`, format: link.includes("zoom") ? "Zoom" : "Google Meet", link: link.trim(), note });
    reset();
    onSent(first);
    onClose();
  };

  return (
    <Modal
      open={!!candidate}
      onClose={close}
      title={copy.title}
      description={copy.description}
      footer={<InterviewActions ready={ready} asked={asked} onCancel={close} onSend={send} />}
    >
      <div className="flex flex-col gap-3">
        {requested && candidate && (
          <InfoBanner>
            {first} asked for {slotForTeam(requested.when, requested.offset, candidate.independent)}.{requested.note ? ` “${requested.note}”` : ""}
          </InfoBanner>
        )}
        <SlotFields date={date} time={time} setDate={setDate} setTime={setTime} />
        {candidate && <SlotClock date={date} time={time} offset={offset} independent={candidate.independent} />}
        {/* A blank link used to go out, and the talent had nothing to join. */}
        <Field label="Meeting link" required error={linkOk ? undefined : "Add the meeting link, starting with https://"}>
          <Input required value={link} onChange={(e) => setLink(e.target.value)} />
        </Field>
        <Field label="Note (optional)">
          <Textarea rows={3} className="h-[78px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything they should prepare" />
        </Field>
      </div>
    </Modal>
  );
}
