import { CancelContractDialog } from "@/components/portal/cancel-contract-dialog";
import { Button, Modal } from "@/components/portal/ui";
import { Tip } from "@/components/portal/tip";
import type { CancelReason } from "@/lib/demo/contract";
import { endChoices, endNote } from "../_lib/copy";
import type { Tracker } from "../_lib/tracker";

/**
 * TB-071 — how the contract ends depends on where it is: cancelled before its first day (the shared
 * dialog that asks for a reason and the role's name), closed after the trial's evaluation, or a
 * running role ended with notice or today (a short list of the two, with what each pays).
 *
 * It doesn't offer to file a dispute instead: a trial closes only once its evaluation has paid the
 * escrow out (TB-067), leaving nothing to hold. File a dispute is open from the day after the trial's
 * last day until then, and while a role runs.
 */
export function EndDialog({ t, open, onClose, onNotice, onEnd, onCancel }: { t: Tracker; open: boolean; onClose: () => void; onNotice: () => void; onEnd: (how: "close" | "now") => void; onCancel: (why: CancelReason) => void }) {
  const { name, first, contract, ends } = t;
  if (ends.cancel) {
    return <CancelContractDialog open={open} side="team" roleName={contract.role} other={first} title={`Cancel the contract with ${name}?`} description={endNote(t)} onClose={onClose} onConfirm={onCancel} />;
  }
  const choices = endChoices(t);
  return (
    <Modal
      open={open}
      onClose={onClose}
      tone="danger"
      title={`End the contract with ${name}?`}
      description={endNote(t)}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          {ends.notice && (
            <Button size="lg" onClick={onNotice}>
              Give notice
            </Button>
          )}
          <Tip label={ends.now?.blocked} wrap>
            <Button size="lg" variant="danger" disabled={!!ends.now?.blocked && !ends.close} onClick={() => onEnd(ends.close ? "close" : ends.now ? "now" : "close")}>
              {ends.now ? "End today" : "End contract"}
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
