"use client";

import Image from "next/image";
import { useState } from "react";
import { AddPayoutModal } from "@/components/independent/add-payout-modal";
import { IdStatus } from "@/components/independent/id-verification";
import { Button, Card, EmptyState, InfoBanner, Modal, Page, StatusDot, Toast } from "@/components/portal/ui";
import { PaymentMethodRow } from "@/components/portal/settings";
import type { PayoutMethod } from "@/lib/independent/data";
import { payoutTitle, removeBlocker, useWallet } from "@/lib/independent/wallet";
import { useToast } from "@/lib/portal/toast";

export default function PayoutSettings() {
  const { payouts, setDefaultPayout, removePayout } = useWallet();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<PayoutMethod | null>(null);
  const [toast, setToast] = useToast();
  const only = payouts.length === 1;
  /** Makes a verified method the default, and says so. */
  const makeDefault = (m: PayoutMethod) => {
    setDefaultPayout(m.id);
    setToast(`${m.brand} is now your default`);
  };

  return (
    <Page title="Settings">
      <Card className="mx-auto flex w-full max-w-[720px] flex-col gap-4 p-6">
        {/* Where the two don't fit on a line (a phone), the button goes under the heading rather than squeezing it onto two. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
            Payout methods
          </h2>
          <Button variant="primary" size="lg" onClick={() => setAdding(true)}>
            Add payout method
          </Button>
        </div>
        <p className="text-[13px] leading-[1.4] text-ink-2">Released pay waits in your balance until you withdraw it to a verified payout method.</p>
        {/* KYC: payouts go only to a verified name, so the methods say where the ID check stands. */}
        <IdStatus onToast={setToast} />
        {payouts.length === 0 && <EmptyState title="No payout method yet" body="You'll be asked for one before your first proposal." />}
        {payouts.map((m) => (
          <MethodRow key={m.id} method={m} only={only} removeOff={removeBlocker(m, payouts.length)} onSetDefault={() => makeDefault(m)} onRemove={() => setRemoving(m)} />
        ))}
        {only && (
          <div className="w-full max-w-[530px]">
            <InfoBanner>You cannot remove your only payout method. Add another one first, then remove this one.</InfoBanner>
          </div>
        )}
      </Card>

      <AddPayoutModal open={adding} onClose={() => setAdding(false)} onAdded={(m) => setToast(`${m.brand} added${m.isDefault ? " and set as default" : ""}`)} />
      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        tone="danger"
        title={`Remove ${removing?.brand}?`}
        description="Payouts already on the way to this account will still arrive. No new payouts will be sent here."
        footer={
          <>
            <Button size="lg" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button size="lg" variant="danger" onClick={() => { if (removing) removePayout(removing.id); setRemoving(null); setToast("Payout method removed"); }}>
              Remove
            </Button>
          </>
        }
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** Why an unverified method's Set as default is off. */
const UNVERIFIED = "It can be your default once it's verified.";

/**
 * One payout method: its brand, the account, what kind it is, and its buttons — Set as default once
 * it's verified, and Remove unless it's the default or the only one (`removeOff` says which). Why a
 * button is off is its tip, and on a phone the row's note too (`note`), as a finger can't hover; the
 * only method's reason is the note under the list already.
 */
function MethodRow({ method: m, only, removeOff, onSetDefault, onRemove }: { method: PayoutMethod; only: boolean; removeOff: string | undefined; onSetDefault: () => void; onRemove: () => void }) {
  const verified = m.verified.startsWith("Verified");
  const why = [!m.isDefault && !verified && UNVERIFIED, !only && removeOff].filter(Boolean).join(" ");
  return (
    <PaymentMethodRow
      brand={m.brand === "Bank" ? <span className="text-[12px] leading-[1.4] font-semibold text-ink">Bank</span> : <Image src={m.brand === "GCash" ? "/brands/gcash.png" : "/brands/maya.png"} alt={m.brand} width={110} height={26} className="h-[17px] w-auto object-contain" loading="eager" />}
      title={
        <>
          {payoutTitle(m)}
          {m.isDefault && <StatusDot tone="ok">Default</StatusDot>}
        </>
      }
      subtitle={m.brand === "Bank" ? "InstaPay / PESONet" : "E-wallet"}
      note={why || undefined}
      actions={
        <>
          {!m.isDefault && (
            <Button size="sm" disabled={!verified} title={verified ? undefined : UNVERIFIED} onClick={onSetDefault}>
              Set as default
            </Button>
          )}
          {/* Quiet here, so a list of methods isn't a column of red; the confirm dialog's Remove is the red one. */}
          <Button size="sm" variant="secondary" disabled={!!removeOff} title={removeOff} onClick={onRemove}>
            Remove
          </Button>
        </>
      }
    />
  );
}
