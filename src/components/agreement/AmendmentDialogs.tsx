"use client";

import { useState } from "react";
import { Button, Checkbox, Field, InfoBanner, Modal, Textarea } from "@/components/independent/ui";
import { todayDay } from "@/lib/work/dates";
import type { WorkItem } from "@/lib/work/model";
import { applyChanges, changesSummary, nextMonthStart, REASON_MAX, resolveChanges, valueText, type Amendment, type ContractVersion } from "@/lib/work/scope";
import { VersionScope } from "./VersionScope";

/** What accepting it does to the pay, in words — or nothing when the pay stays. */
function payEffect(base: ContractVersion, next: ContractVersion["terms"]): string | null {
  if (next.rate === base.terms.rate && next.hours === base.terms.hours) return null;
  if (base.terms.type === "trial") return `The trial's escrow is re-priced to $${(next.escrow ?? 0).toLocaleString("en-US")}: the company's card is charged the difference (plus the 10% fee) or refunded it.`;
  return `The new pay applies from ${valueText("due", next.rateFrom ?? nextMonthStart(todayDay()))}, the first of the month after it's accepted.`;
}

/**
 * The acceptance screen: what's agreed is the whole next version, not only the changes, so it's all
 * here — the version it makes, what changes, the pay and its effect, the dates, every contract task
 * and milestone — and it's ticked off before it's accepted. No other change is pending: only one
 * amendment is open at a time.
 */
export function AcceptAmendment({ open, amendment, base, items, onClose, onAccept }: { open: boolean; amendment: Amendment; base: ContractVersion; items: ReadonlyMap<string, WorkItem>; onClose: () => void; onAccept: () => void }) {
  const [agreed, setAgreed] = useState(false);
  const rateFrom = base.terms.type === "trial" ? undefined : nextMonthStart(todayDay());
  const next = applyChanges(base, amendment.changes, rateFrom);
  const n = base.version + 1;
  const effect = payEffect(base, next.terms);
  return (
    <Modal
      open={open}
      onClose={onClose}
      width={720}
      title={`Accept Amendment ${amendment.number}?`}
      description={`You're agreeing to contract v${n} — everything below, not only the changes. ${amendment.byName} is told, and the work list changes with it.`}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" disabled={!agreed} onClick={onAccept}>
            Accept and agree to v{n}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-2 rounded-lg bg-surface-2 p-4 text-[13.5px] leading-[1.4]">
          <dt className="text-ink-2">Version</dt>
          <dd className="text-ink">
            v{base.version} → v{n}
          </dd>
          <dt className="text-ink-2">What changes</dt>
          <dd className="text-ink">It {changesSummary(resolveChanges(base, amendment.changes))}</dd>
          <dt className="text-ink-2">Pending changes</dt>
          <dd className="text-ink">None — this is the only open amendment</dd>
        </dl>
        {effect && <InfoBanner>{effect}</InfoBanner>}
        <VersionScope version={next} items={items} />
        <Checkbox checked={agreed} onChange={setAgreed}>
          I agree to contract v{n} as shown
        </Checkbox>
      </div>
    </Modal>
  );
}

/** Rejecting it, or sending it back for changes: either way with a note the proposer works from. */
export function AnswerAmendment({ open, kind, amendment, onClose, onSend }: { open: boolean; kind: "reject" | "askChanges"; amendment: Amendment; onClose: () => void; onSend: (note: string) => void }) {
  const [note, setNote] = useState("");
  const reject = kind === "reject";
  return (
    <Modal
      open={open}
      onClose={onClose}
      tone={reject ? "danger" : "default"}
      title={reject ? `Reject Amendment ${amendment.number}?` : `Ask ${amendment.byName.split(" ")[0]} for changes`}
      description={reject ? `The contract stays as agreed, and ${amendment.byName} is told why. They can propose another.` : `It goes back to ${amendment.byName} with your note. They revise it, or withdraw it.`}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant={reject ? "danger" : "primary"} disabled={!note.trim()} onClick={() => onSend(note.trim())}>
            {reject ? "Reject amendment" : "Send back"}
          </Button>
        </>
      }
    >
      <Field label={reject ? "Why" : "What should change?"}>
        <Textarea rows={3} autoFocus value={note} onChange={(e) => setNote(e.target.value)} maxLength={REASON_MAX} aria-label={reject ? "Why" : "What should change?"} />
      </Field>
    </Modal>
  );
}
