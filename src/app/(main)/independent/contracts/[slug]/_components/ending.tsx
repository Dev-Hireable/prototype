import { Button, Modal } from "@/components/portal/ui";
import { PanelCard } from "@/components/portal/panel-card";
import { NOTICE_DAYS } from "@/lib/contract/lifecycle";
import type { ContractView } from "@/lib/contract/view";
import { dayLabel } from "@/lib/portal/dates";
import type { OngoingType } from "@/lib/contract/job-types";
import type { Contract } from "@/lib/independent/data";
import { endingNote } from "../_lib/copy";

/**
 * IN-091 — the talent can end it too: cancel before the first day, or give notice on a running role.
 * Notice either side gave shows here, and the talent can take theirs back.
 */
export function EndingPanel({ contract, view, ended, cancellable, canGiveNotice, onWithdraw, onEnd }: { contract: Contract; view: ContractView; ended: boolean; cancellable: boolean; canGiveNotice: boolean; onWithdraw: () => void; onEnd: () => void }) {
  const { onDeal, notice } = view;
  if (!onDeal || ended || !(cancellable || canGiveNotice || notice)) return null;
  return (
    <PanelCard title="Ending the contract">
      <p className="text-[13px] leading-[1.4] text-ink-2">{endingNote(contract, view, cancellable)}</p>
      {notice?.by === "independent" ? (
        <Button size="lg" onClick={onWithdraw}>
          Take back notice
        </Button>
      ) : (
        (cancellable || canGiveNotice) && (
          <Button size="lg" variant="danger" onClick={onEnd}>
            {cancellable ? "Cancel contract" : "Give notice"}
          </Button>
        )
      )}
    </PanelCard>
  );
}

/** IN-091 — cancelling before the first day, or giving notice on a running role. */
export function EndDialog({ open, contract, view, cancellable, lastDay, onClose, onConfirm }: { open: boolean; contract: Contract; view: ContractView; cancellable: boolean; lastDay: Date | undefined; onClose: () => void; onConfirm: () => void }) {
  const { life } = view;
  return (
    <Modal
      open={open}
      onClose={onClose}
      tone="danger"
      title={cancellable ? `Cancel the ${contract.title} contract?` : `Give notice on ${contract.title}?`}
      description={
        cancellable && life
          ? `It hasn't started — its first day is ${dayLabel(life.since)} — so nothing is owed. ${contract.company} is told, and the contract can't be reopened.`
          : `The role ends after ${dayLabel(lastDay)}, ${NOTICE_DAYS[contract.type as OngoingType]} days from today. You keep working, and are paid, until then, and you can take the notice back before that day. ${contract.company} is told.`
      }
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Keep it
          </Button>
          <Button size="lg" variant="danger" onClick={onConfirm}>
            {cancellable ? "Cancel contract" : "Give notice"}
          </Button>
        </>
      }
    />
  );
}
