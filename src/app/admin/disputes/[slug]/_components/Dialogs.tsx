import { Button, Field, Modal, Select as FormSelect, Textarea } from "@/components/independent/ui";
import { askParty, extendDeadline, partyName, rejectDispute, releasePayment, resolveDispute, stampOf, TURN_DAYS, usd } from "@/lib/demo/disputes";
import type { Dispute, DisputeParty } from "@/lib/demo/disputes";
import type { PartyTurn } from "@/lib/disputes/case";
import { partyOption, pickParty, releaseNote, rulingHint } from "../_lib/copy";
import type { SupportDialogs } from "../_lib/dialogs";

const DAY = 86_400_000;
const EXTEND_BY = [1, 2, 3, 5];

type DialogProps = { d: Dispute; dialogs: SupportDialogs };

/** AD-033 — a question for one side, who then has five days to answer on the case. */
export function AskDialog({ d, dialogs }: DialogProps) {
  const { who, notes, close, done } = dialogs;
  return (
    <Modal
      open={dialogs.dialog === "ask"}
      onClose={close}
      title="Ask a party for more"
      description={`They see your question on the case, with a notification, and have ${TURN_DAYS} days to answer. If they don't, the dispute closes in the other side's favor.`}
      footer={
        <>
          <Button size="lg" onClick={close}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" disabled={!who || !notes.trim()} onClick={async () => who && done(await askParty(d.id, who, notes), `Asked ${partyName(d, who)} — they have ${TURN_DAYS} days to answer`)}>
            Send question
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Ask">
          <PartySelect d={d} value={who} onChange={dialogs.setWho} />
        </Field>
        <Field label="What do you need?">
          <Textarea rows={3} value={notes} onChange={(e) => dialogs.setNotes(e.target.value)} placeholder="The report behind task 3, the message where the deadline moved…" />
        </Field>
      </div>
    </Modal>
  );
}

/** Support can give whoever's on the clock more time — before it runs out, never after. */
export function ExtendDialog({ d, turn, dialogs }: DialogProps & { turn: PartyTurn | null }) {
  const { days, close, done } = dialogs;
  return (
    <Modal
      open={dialogs.dialog === "extend" && !!turn}
      onClose={close}
      title="Extend the deadline"
      description={turn ? `${partyName(d, turn.who)} has until ${stampOf(turn.due)} to respond. Both sides are told about the new deadline.` : undefined}
      footer={
        <>
          <Button size="lg" onClick={close}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" onClick={async () => turn && done(await extendDeadline(d.id, days), `${partyName(d, turn.who)} now has until ${stampOf(turn.due + days * DAY)}`)}>
            Extend deadline
          </Button>
        </>
      }
    >
      <Field label="Give them" hint={turn ? `New deadline: ${stampOf(turn.due + days * DAY)}` : undefined}>
        <FormSelect options={EXTEND_BY.map((n) => `${n} more ${n === 1 ? "day" : "days"}`)} value={`${days} more ${days === 1 ? "day" : "days"}`} onChange={(e) => dialogs.setDays(Number(e.target.value.split(" ")[0]))} />
      </Field>
    </Modal>
  );
}

/** Rejecting: the agreed process was followed, so neither side is ruled for and the hold is lifted. */
export function RejectDialog({ d, dialogs }: DialogProps) {
  const { notes, close, done } = dialogs;
  return (
    <Modal
      open={dialogs.dialog === "reject"}
      onClose={close}
      tone="danger"
      title="Reject this dispute?"
      description={`Use this when the agreed process was followed, so neither side is ruled for. The ${usd(d.amount)} hold on the escrow is lifted and both parties are told.`}
      footer={
        <>
          <Button size="lg" onClick={close}>
            Cancel
          </Button>
          <Button size="lg" variant="danger" disabled={!notes.trim()} onClick={async () => done(await rejectDispute(d.id, notes), "Dispute rejected — both parties have been notified")}>
            Reject dispute
          </Button>
        </>
      }
    >
      <Field label="Resolution notes" hint="Required. Both parties read these.">
        <Textarea rows={3} value={notes} onChange={(e) => dialogs.setNotes(e.target.value)} placeholder="What the process check found" />
      </Field>
    </Modal>
  );
}

/** AD-034 — a ruling for one side, with notes, and the payment action it triggers. */
export function ResolveDialog({ d, refundable, dialogs }: DialogProps & { refundable: number }) {
  const { favor, notes, close, done } = dialogs;
  return (
    <Modal
      open={dialogs.dialog === "resolve"}
      onClose={close}
      title="Resolve this dispute"
      description="Rule in favor of one party. Both are notified with your notes, and the escrow moves with the ruling."
      footer={
        <>
          <Button size="lg" onClick={close}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant="primary"
            disabled={!favor || !notes.trim()}
            onClick={async () => favor && done(await resolveDispute(d.id, favor, notes), favor === "team" ? `Resolved — ${usd(refundable)} refunded to ${d.team.company}` : `Resolved for ${d.independent.name} — request the payment release to pay it out`)}
          >
            Resolve dispute
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Rule in favor of" hint={rulingHint(d, favor, refundable)}>
          <PartySelect d={d} value={favor} onChange={dialogs.setFavor} />
        </Field>
        <Field label="Resolution notes" hint="Required. Both parties read these.">
          <Textarea rows={3} value={notes} onChange={(e) => dialogs.setNotes(e.target.value)} placeholder="Which checks decided it, and why" />
        </Field>
      </div>
    </Modal>
  );
}

/** AD-035 — the release, confirmed, on a case closed for the independent. */
export function ReleaseDialog({ d, amount, dialogs }: DialogProps & { amount: number }) {
  const { close, done } = dialogs;
  return (
    <Modal
      open={dialogs.dialog === "release"}
      onClose={close}
      title="Request payment release?"
      description={releaseNote(d, amount)}
      footer={
        <>
          <Button size="lg" onClick={close}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" onClick={async () => done(await releasePayment(d.id), `Payment released to ${d.independent.name}`)}>
            Release payment
          </Button>
        </>
      }
    />
  );
}

/** The side a question or a ruling is for: each party by name and role, or none picked yet. */
function PartySelect({ d, value, onChange }: { d: Dispute; value: DisputeParty | null; onChange: (party: DisputeParty | null) => void }) {
  return <FormSelect options={["Select a party", partyOption(d, "team"), partyOption(d, "independent")]} value={value ? partyOption(d, value) : "Select a party"} onChange={(e) => onChange(pickParty(d, e.target.value))} />;
}
