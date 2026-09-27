"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Button, Field, Modal, Textarea } from "@/components/independent/ui";
import { Badge } from "@/components/portal/Badge";
import { usd } from "@/lib/demo/disputes";
import { dayOf, todayDay } from "@/lib/work/dates";
import { indexById, newId, type WorkItem } from "@/lib/work/model";
import type { WorkAccess } from "@/lib/work/permissions";
import { checkAmendment, nextMonthStart, REASON_MAX, resolveChanges, valueText, type Amendment, type AmendmentContext, type ContractVersion, type ScopeChange, type ScopeTerms, type TermsPatch } from "@/lib/work/scope";
import type { AgreementActions } from "@/lib/work/store";
import { AmendmentChanges } from "./AmendmentChanges";
import { newChangeId, targetOf, useAmendmentDraft, type AmendmentDraft, type DraftStart } from "./draft";
import { ScopeTaskRows } from "./ScopeTaskRows";
import { TermsChangeForm } from "./TermsChangeForm";

type BuilderProps = {
  open: boolean;
  onClose: () => void;
  /** The version in force: what the amendment changes. */
  base: ContractVersion;
  items: readonly WorkItem[];
  access: WorkAccess;
  actions: AgreementActions;
  /** The other side, who answers it. */
  counterpart: string;
  /** Revising this one, rather than proposing a new one. */
  amendment?: Amendment;
  /** Where a new one starts: on a task's change, with a removal or a restore in it. */
  start?: DraftStart;
  onDone: (message: string) => void;
};

/** What a new rate does once it's accepted: a trial's escrow is re-priced; a role's pay changes from the first of the next month. */
function effectOf(terms: ScopeTerms, today: number) {
  return (monthly: number) => {
    if (terms.type !== "trial") return `It applies from ${valueText("due", nextMonthStart(today))}, the first of the month after it's accepted. Pay before then stays at ${terms.rate}.`;
    const months = terms.escrow && monthly ? Math.max(1, Math.round(terms.escrow / Number(terms.rate.replace(/[^0-9.]/g, "") || 1))) : 1;
    const next = monthly * months;
    const was = terms.escrow ?? 0;
    if (next > was) return `The escrow goes from ${usd(was)} to ${usd(next)} when it's accepted: ${usd(next - was)} more, plus the 10% fee, is charged to the company's card.`;
    return `The escrow goes from ${usd(was)} to ${usd(next)} when it's accepted: ${usd(was - next)} goes back to the company's card.`;
  };
}

/** The pay: as agreed, what's proposed for it (with Edit and Undo), or the form that proposes it. */
function TermsRow({ base, draft, check, today }: { base: ContractVersion; draft: AmendmentDraft; check: (c: ScopeChange) => string | null; today: number }) {
  const change = draft.terms;
  const editing = draft.editing?.kind === "terms";
  const save = (to: TermsPatch) => {
    if (!Object.keys(to).length) return "Change the pay or the hours first — or cancel.";
    const c: ScopeChange = { id: change?.id ?? newChangeId(), kind: "terms", to };
    const e = check(c);
    if (!e) draft.put(c);
    return e;
  };
  const line = `${base.terms.rate}${base.terms.hours ? ` · ${base.terms.hours} hours a week` : ""}`;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-white px-4 py-3">
        <span className="min-w-0 flex-1 text-[14px] text-ink">{line}</span>
        {change && <Badge tone="info">Changing the pay</Badge>}
        {change && (
          <Button size="sm" variant="ghost" onClick={() => draft.drop(change.id)}>
            Undo
          </Button>
        )}
        {!editing && (
          <Button size="sm" onClick={() => draft.setEditing({ kind: "terms" })}>
            {change ? "Edit" : "Change the pay"}
          </Button>
        )}
      </div>
      {editing && <TermsChangeForm terms={{ ...base.terms, ...(change?.kind === "terms" ? change.to : {}) }} effect={effectOf(base.terms, today)} onSave={save} onCancel={() => draft.setEditing(null)} />}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[15px] leading-[1.4] font-semibold text-ink">{title}</h3>
        {hint && <p className="text-[12.5px] leading-[1.4] text-ink-2">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** Checks one change in the amendment it would join: its own rules first, then against the other changes (two tasks with one name). */
function useCheck(draft: AmendmentDraft, ctx: AmendmentContext) {
  return (c: ScopeChange) => {
    const alone = checkAmendment({ reason: "·", changes: [c] }, ctx);
    if (alone) return alone.message;
    const together = checkAmendment({ reason: "·", changes: [...draft.changes.filter((x) => targetOf(x) !== targetOf(c)), c] }, ctx);
    return together?.message ?? null;
  };
}

type SendInput = Pick<BuilderProps, "amendment" | "actions" | "counterpart" | "onDone" | "onClose"> & { draft: AmendmentDraft; problem: ReturnType<typeof checkAmendment> };

/** Sends the proposal or the revision: checked first, refused with the reason, and the other side told. A retry reuses the new one's id. */
function useSend({ draft, problem, amendment, actions, counterpart, onDone, onClose }: SendInput) {
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [id] = useState(() => newId("am"));
  const send = async () => {
    setTried(true);
    if (problem) return;
    setBusy(true);
    const input = { reason: draft.reason, changes: draft.changes };
    let r: Awaited<ReturnType<typeof actions.propose>>;
    try {
      r = amendment ? await actions.revise(amendment.id, { ...input, revision: amendment.revision }) : await actions.propose(input, id);
    } finally {
      setBusy(false);
    }
    if (!r.ok) return setError(r.error);
    onDone(amendment ? `Amendment ${amendment.number} revised — ${counterpart} has been told` : `Change proposed — ${counterpart} has been told`);
    onClose();
  };
  return { send, tried, error, busy };
}

/**
 * Propose a change to the contract, or revise one (the amendment's proposer only). Each contract
 * task can be changed or removed, new ones added, and the pay changed — with a reason, which the
 * other side decides on. What it would change is shown as it's written, before and after; the same
 * rules the save runs are checked here. Nothing on the contract changes until it's accepted.
 */
export function AmendmentBuilder({ open, onClose, base, items, access, actions, counterpart, amendment, start, onDone }: BuilderProps) {
  const draft = useAmendmentDraft(amendment ? { reason: amendment.reason, changes: amendment.changes } : start);
  const byId = useMemo(() => indexById(items), [items]);
  const today = todayDay();
  const ctx: AmendmentContext = { base, items: byId, today, lastDay: dayOf(access.lastDay) };
  const problem = checkAmendment({ reason: draft.reason, changes: draft.changes }, ctx);
  const check = useCheck(draft, ctx);
  const { send, tried, error, busy } = useSend({ draft, problem, amendment, actions, counterpart, onDone, onClose });
  // The reason says its own under its field; anything else is said once, at the foot.
  const shown = error ?? (tried && problem && problem.field !== "reason" ? problem.message : null);
  return (
    <Modal
      open={open}
      onClose={onClose}
      width={760}
      title={amendment ? `Revise Amendment ${amendment.number}` : "Propose a change to the contract"}
      description={`${counterpart} reviews it. Until they accept, the contract stays at v${base.version} and nothing on the work list changes.`}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" disabled={busy} onClick={() => void send()}>
            {amendment ? "Send revision" : "Send proposal"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <Section title="Contract tasks" hint={base.terms.type === "trial" ? "What the trial's pay covers and its score counts. Work that's done or in review stays as it is." : "The tasks the contract names. Work that's done or in review stays as it is."}>
          <ScopeTaskRows base={base} items={byId} draft={draft} lastDay={access.lastDay} check={check} />
        </Section>
        <Section title="Pay">
          <TermsRow base={base} draft={draft} check={check} today={today} />
        </Section>
        <Field label="Why" error={tried && problem?.field === "reason" ? problem.message : undefined}>
          <Textarea rows={3} value={draft.reason} onChange={(e) => draft.setReason(e.target.value)} maxLength={REASON_MAX} placeholder="e.g. The launch needs payments, so checkout joins the scope; the brand kit can wait." aria-label="Why" />
        </Field>
        {draft.changes.length > 0 && (
          <Section title="What changes" hint={`As ${counterpart} will read it: each change before and after.`}>
            <AmendmentChanges changes={resolveChanges(base, draft.changes)} items={byId} label="Proposed changes" />
          </Section>
        )}
        {shown && (
          <p role="alert" className="text-[13px] text-danger">
            {shown}
          </p>
        )}
      </div>
    </Modal>
  );
}
