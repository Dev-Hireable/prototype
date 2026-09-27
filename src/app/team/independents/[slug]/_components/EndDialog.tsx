import { Button, Modal } from "@/components/independent/ui";
import { Tip } from "@/components/portal/Tip";
import { endNote } from "../_lib/copy";
import type { Tracker } from "../_lib/tracker";

/**
 * TB-071 — how the contract ends depends on where it is: cancelled before its first day, closed
 * after the trial's evaluation, or a running role ended with notice or today.
 */
export function EndDialog({ t, open, onClose, onDispute, onNotice, onEnd }: { t: Tracker; open: boolean; onClose: () => void; onDispute: () => void; onNotice: () => void; onEnd: (how: "cancel" | "close" | "now") => void }) {
  const { name, isTrial, view, ends } = t;
  return (
    <Modal
      open={open}
      onClose={onClose}
      tone="danger"
      title={ends.cancel ? `Cancel the contract with ${name}?` : `End the contract with ${name}?`}
      description={endNote(t)}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            {ends.cancel ? "Keep it" : "Cancel"}
          </Button>
          {!view.block && isTrial && view.releasable > 0 && ends.close && (
            <Button size="lg" onClick={onDispute}>
              File a dispute instead
            </Button>
          )}
          {ends.notice && (
            <Button size="lg" onClick={onNotice}>
              Give notice
            </Button>
          )}
          <Tip label={ends.now?.blocked} wrap>
            <Button size="lg" variant="danger" disabled={!!ends.now?.blocked && !ends.cancel && !ends.close} onClick={() => onEnd(ends.cancel ? "cancel" : ends.close ? "close" : ends.now ? "now" : "close")}>
              {ends.cancel ? "Cancel contract" : ends.now ? "End today" : "End contract"}
            </Button>
          </Tip>
        </>
      }
    />
  );
}
