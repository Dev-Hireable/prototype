import { useState } from "react";
import { Button, Checkbox, Field, Modal, Textarea } from "@/components/independent/ui";

/** IN-017 — "Apply to role · confirm": the profile goes with the application, with a note and the quiz results if the talent likes. */
export function ApplyDialog({ open, title, company, onClose, onSend }: { open: boolean; title: string; company: string; onClose: () => void; onSend: (extras: { note: string; quiz: boolean }) => void }) {
  const [note, setNote] = useState("");
  const [includeQuiz, setIncludeQuiz] = useState(true);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Apply to ${title} at ${company}`}
      description="Your profile, monthly rate and availability go with the application. Add a short note so Alex knows why you fit."
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" onClick={() => onSend({ note, quiz: includeQuiz })}>
            Send application
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Note to the employer (optional)">
          <Textarea rows={3} className="h-[78px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Tell ${company} why you fit this role`} />
        </Field>
        <Checkbox checked={includeQuiz} onChange={setIncludeQuiz}>
          Include my Hireable quiz results
        </Checkbox>
      </div>
    </Modal>
  );
}
