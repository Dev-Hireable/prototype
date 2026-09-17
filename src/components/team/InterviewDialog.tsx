"use client";

import { useState } from "react";
import { Button, Field, Input, Modal, Select, Textarea } from "@/components/independent/ui";
import { byName } from "@/lib/team/data";
import type { Candidate } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";

/**
 * TB-037 / TB-040 — "Invite to interview", shared by the candidate profile and the pipeline board.
 * Booking has to do two things at once (move the candidate's stage and put a row on the Interviews
 * page), so it lives here rather than being written out twice; the board can then offer the CTA
 * without sending the Team Builder off to a profile first.
 */
export function InterviewDialog({ candidate, roleTitle, onClose, onSent }: { candidate: Candidate | null; roleTitle: string; onClose: () => void; onSent: (name: string) => void }) {
  const { setStage, addInterview } = useDemo();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [link, setLink] = useState("https://meet.google.com/yxw-vuts-rqp");
  const first = candidate ? byName(candidate.independent).name.split(" ")[0] : "them";

  const send = () => {
    if (!candidate || !date || !time) return;
    setStage(candidate.id, "invited", { label: "Awaiting reply", tone: "neutral", meta: `${date} · ${time}` });
    addInterview({
      id: `iv${Date.now()}`,
      independent: candidate.independent,
      role: roleTitle,
      when: `${date}, ${time}`,
      format: link.includes("zoom") ? "Zoom" : "Google Meet",
      link,
      status: { label: "Awaiting reply", tone: "neutral" },
    });
    setDate("");
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
          <Field label="Date" className="flex-1" hint={!date ? "Required" : undefined}>
            <Input value={date} onChange={(e) => setDate(e.target.value)} placeholder="01/06/2026" />
          </Field>
          <Field label="Time" className="flex-1">
            <Select options={["", "06:00 AM (EST)", "09:30 AM (EST)", "02:00 PM (EST)"]} value={time} onChange={(e) => setTime(e.target.value)} />
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
