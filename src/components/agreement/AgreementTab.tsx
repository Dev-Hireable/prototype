"use client";

import { useMemo, useState } from "react";
import { Button, InfoBanner, Toast } from "@/components/independent/ui";
import { PanelCard } from "@/components/portal/PanelCard";
import { useToast } from "@/lib/portal/toast";
import { useAgreement } from "@/lib/work/deal-scope";
import { indexById, newId } from "@/lib/work/model";
import { sideOf, type Actor, type Names } from "@/lib/work/permissions";
import { restoreChanges, type Amendment, type ContractVersion } from "@/lib/work/scope";
import { useAgreementActions } from "@/lib/work/store";
import { AmendmentBuilder } from "./AmendmentBuilder";
import { AmendmentCard } from "./AmendmentCard";
import { ContractHistory } from "./ContractHistory";
import type { DraftStart } from "./draft";
import { VersionDialog } from "./VersionDialog";
import { VersionScope } from "./VersionScope";

/** The builder's state: closed, or open on a new amendment (from `start`) or on one being revised. `key` opens it fresh each time. */
type Builder = { key: string; start?: DraftStart; revising?: Amendment } | null;

/** Why this reader can't propose a change now, or null. */
function proposeBlock(open: Amendment | undefined, canAmend: boolean, closed: string | undefined): string | null {
  if (!canAmend) return closed ?? "This contract isn't taking changes.";
  if (open) return `Amendment ${open.number} is open. It's settled before another is proposed.`;
  return null;
}

/**
 * TB-151 / IN-094 — the Agreement tab, on both sides and read-only for admin: the version in force
 * (its terms and every contract task), the amendment that's open with what this reader can do about
 * it, Propose a change, and the contract's history — every version, and every step that led to it.
 */
export function AgreementTab({ actor, names }: { actor: Actor; names: Names }) {
  const { deal, scope, access, items, current, open } = useAgreement();
  const actions = useAgreementActions(actor, names);
  const byId = useMemo(() => indexById(items), [items]);
  const [builder, setBuilder] = useState<Builder>(null);
  const [viewing, setViewing] = useState<ContractVersion | null>(null);
  const [toast, setToast] = useToast();
  const side = sideOf(actor);
  if (!scope || !current) return <p className="px-10 py-8 text-[14px] text-ink-2">This contract&apos;s agreement isn&apos;t available.</p>;
  const counterpart = side === "team" ? names.independent : names.team;
  const canAmend = !!side && access.open;
  const blocked = proposeBlock(open, canAmend, access.trialClosed ? "The trial is over, so what was agreed for it is final." : access.closedReason);
  const restore = (v: ContractVersion) => {
    setViewing(null);
    const { changes } = restoreChanges(current, v, byId, () => newId("ch"));
    setBuilder({ key: newId("b"), start: { changes, reason: `Back to what was agreed in v${v.version}.` } });
  };
  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-4 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] leading-[1.4] text-ink-2">
          <span className="font-semibold text-ink">Contract v{current.version}</span> is in force · agreed {current.agreedAt}
        </p>
        {side && (
          <Button size="md" variant="primary" disabled={!!blocked} onClick={() => setBuilder({ key: newId("b") })}>
            Propose a change
          </Button>
        )}
      </div>
      {side && blocked && !open && <InfoBanner>{blocked}</InfoBanner>}
      {open && <AmendmentCard key={open.id} amendment={open} base={current} items={byId} side={side} names={names} open={access.open} actions={actions} onRevise={() => setBuilder({ key: newId("b"), revising: open })} onToast={setToast} />}
      <PanelCard title={`In force: contract v${current.version}`}>
        <VersionScope version={current} items={byId} />
      </PanelCard>
      <PanelCard title="Contract history">
        <ContractHistory offerLog={deal?.offer?.log} scope={scope} open={access.open} items={byId} onView={setViewing} />
      </PanelCard>
      {builder && <AmendmentBuilder key={builder.key} open onClose={() => setBuilder(null)} base={current} items={items} access={access} actions={actions} counterpart={counterpart} amendment={builder.revising} start={builder.start} onDone={setToast} />}
      <VersionDialog version={viewing} scope={scope} current={current} items={byId} onClose={() => setViewing(null)} onRestore={canAmend && !open ? restore : undefined} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
