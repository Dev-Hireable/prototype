import { useState } from "react";
import { Button, Field, Modal, Textarea } from "@/components/portal/ui";

/**
 * IN-017 — "Apply to role · confirm": the profile goes with the application, with a note if the
 * talent likes. The quiz results always go too (#77): the match is worked out from them.
 */
export function ApplyDialog({ open, title, company, onClose, onSend }: { open: boolean; title: string; company: string; onClose: () => void; onSend: (note: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Apply to ${title} at ${company}`}
      description="Your profile, rate and availability are sent with your application."
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" onClick={() => onSend(note)}>
            Send application
          </Button>
        </>
      }
    >
      <Field label={`Note to ${company} (optional)`}>
        <Textarea rows={3} className="h-[78px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Tell ${company} why you fit this role`} />
      </Field>
    </Modal>
  );
}
