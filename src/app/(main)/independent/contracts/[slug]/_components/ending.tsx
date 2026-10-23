import { CancelContractDialog } from "@/components/portal/cancel-contract-dialog";
import { Button, Modal } from "@/components/portal/ui";
import { PanelCard } from "@/components/portal/panel-card";
import { NOTICE_DAYS } from "@/lib/contract/lifecycle";
import type { ContractView } from "@/lib/contract/view";
import type { CancelReason } from "@/lib/demo/contract";
import { dayLabel } from "@/lib/portal/dates";
import type { OngoingType } from "@/lib/contract/job-types";
import type { Contract } from "@/lib/independent/data";
import { endingNote } from "../_lib/copy";

/**
 * IN-091 — the talent can end it too: cancel before the first day, or give notice on a running role.
 * Notice either side gave shows here, and the talent can take theirs back. Giving notice is a small
 * quiet button at the card's end: it was the page's biggest, and red, as if the page were pushing
 * toward it. The red is on the confirm.
 */
export function EndingPanel({ contract, view, ended, cancellable, canGiveNotice, onWithdraw, onEnd }: { contract: Contract; view: ContractView; ended: boolean; cancellable: boolean; canGiveNotice: boolean; onWithdraw: () => void; onEnd: () => void }) {
  const { onDeal, notice } = view;
  if (!onDeal || ended || !(cancellable || canGiveNotice || notice)) return null;
  return (
    <PanelCard title="Ending the contract">
      <p className="text-[13px] leading-[1.4] text-ink-2">{endingNote(contract, view, cancellable)}</p>
      {notice?.by === "independent" ? (
        <Button size="sm" onClick={onWithdraw} className="self-start">
          Take back notice
        </Button>
      ) : (
        (cancellable || canGiveNotice) && (
          // Cancelling before the first day stays red: it's final, and shown on its own.
          <Button size="sm" variant={cancellable ? "danger" : "secondary"} onClick={onEnd} className="self-start">
            {cancellable ? "Cancel contract" : "Give notice"}
          </Button>
        )
      )}
    </PanelCard>
  );
}

/**
 * IN-091 — cancelling before the first day (the shared dialog that asks for a reason and the role's
 * name), or giving notice on a running role: the last day first, then what it means.
 */
export function EndDialog({ open, contract, view, cancellable, lastDay, onClose, onNotice, onCancel }: { open: boolean; contract: Contract; view: ContractView; cancellable: boolean; lastDay: Date | undefined; onClose: () => void; onNotice: () => void; onCancel: (why: CancelReason) => void }) {
  const { life } = view;
  if (cancellable) {
    const description = life ? `It hasn't started yet (its first day is ${dayLabel(life.since)}), so nothing is owed. We'll notify ${contract.company}, and the contract can't be reopened.` : undefined;
    return <CancelContractDialog open={open} side="independent" roleName={contract.title} other={contract.company} title={`Cancel the ${contract.title} contract?`} description={description} onClose={onClose} onConfirm={onCancel} />;
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      tone="danger"
      title={`Give notice on ${contract.title}?`}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Keep it
          </Button>
          <Button size="lg" variant="danger" onClick={onNotice}>
            Give notice
          </Button>
        </>
      }
    >
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-[1.4] text-ink-2 marker:text-ink-2">
        <li>
          <span className="font-semibold text-ink">Last day: {dayLabel(lastDay)}</span> ({NOTICE_DAYS[contract.type as OngoingType]} days from today)
        </li>
        <li>You keep working and getting paid until then</li>
        <li>You can take back your notice before that date</li>
        <li>We&apos;ll notify {contract.company}</li>
      </ul>
    </Modal>
  );
}
