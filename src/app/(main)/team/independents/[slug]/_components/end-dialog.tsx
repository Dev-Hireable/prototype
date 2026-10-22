import { Button, Modal } from "@/components/portal/ui";
import { Tip } from "@/components/portal/tip";
import { endChoices, endNote } from "../_lib/copy";
import type { Tracker } from "../_lib/tracker";

/**
 * TB-071 — how the contract ends depends on where it is: cancelled before its first day, closed
 * after the trial's evaluation, or a running role ended with notice or today (a short list of the
 * two, with what each pays).
 *
 * It doesn't offer to file a dispute instead: a trial closes only once its evaluation has paid the
 * escrow out (TB-067), leaving nothing to hold. File a dispute is open from the day after the trial's
 * last day until then, and while a role runs.
 */
export function EndDialog({ t, open, onClose, onNotice, onEnd }: { t: Tracker; open: boolean; onClose: () => void; onNotice: () => void; onEnd: (how: "cancel" | "close" | "now") => void }) {
  const { name, ends } = t;
  const choices = endChoices(t);
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
    >
      {choices && (
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-[1.4] text-ink-2">
          {choices.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
