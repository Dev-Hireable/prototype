"use client";

import { useState, type ReactNode } from "react";
import { Button, Field, Input, Modal, Select, Textarea } from "@/components/portal/ui";
import { CANCEL_REASONS, type CancelReason, type EndSide } from "@/lib/demo/contract";

const REASON_PROMPT = "Select a reason";

/**
 * TB-071 / IN-091 — cancelling a contract before its first day, the one dialog both sides use. It
 * can't be undone, so it asks for two things first: a reason, which the other side reads in the
 * thread and the notification ("Other" needs a line saying why), and the role's name typed out —
 * Cancel contract stays off until it matches, so it's never a slip of the mouse.
 */
export function CancelContractDialog({ open, side, roleName, other, title, description, onClose, onConfirm }: {
  open: boolean;
  /** Whose portal it is: their own reasons. */
  side: EndSide;
  /** What has to be typed to confirm. */
  roleName: string;
  /** Who is told: "Juan", "Nairobi Solutions Inc.". */
  other: string;
  title: string;
  /** What cancelling does to the money, and who's told. */
  description: ReactNode;
  onClose: () => void;
  onConfirm: (why: CancelReason) => void;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [typed, setTyped] = useState("");
  const [tried, setTried] = useState(false);
  const isOther = reason === "Other";
  const matches = typed.trim() === roleName;
  const reasonError = tried && !reason ? "Choose a reason." : undefined;
  const noteError = tried && isOther && !note.trim() ? `Tell ${other} why, in a line.` : undefined;

  const reset = () => {
    setReason("");
    setNote("");
    setTyped("");
    setTried(false);
  };
  const close = () => {
    reset();
    onClose();
  };
  const confirm = () => {
    setTried(true);
    if (!reason || (isOther && !note.trim()) || !matches) return;
    onConfirm({ reason, ...(note.trim() ? { note: note.trim() } : {}) });
    reset();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      tone="danger"
      title={title}
      description={description}
      footer={
        <>
          <Button size="lg" onClick={close}>
            Keep it
          </Button>
          <Button size="lg" variant="danger" disabled={!matches} onClick={confirm}>
            Cancel contract
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Reason" required error={reasonError}>
          <Select options={[REASON_PROMPT, ...CANCEL_REASONS[side]]} value={reason || REASON_PROMPT} onChange={(e) => setReason(e.target.value === REASON_PROMPT ? "" : e.target.value)} required />
        </Field>
        <Field label={isOther ? `Why? ${other} reads this` : `Anything else ${other} should know (optional)`} required={isOther} error={noteError}>
          <Textarea rows={3} className="h-[78px]" value={note} onChange={(e) => setNote(e.target.value)} required={isOther} />
        </Field>
        <Field
          label={
            <>
              Type <span className="font-bold">{roleName}</span> to confirm
            </>
          }
          required
        >
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} required />
        </Field>
      </div>
    </Modal>
  );
}
