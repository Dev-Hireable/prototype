"use client";

import Image from "next/image";
import { useState } from "react";
import { AddPayoutModal } from "@/components/independent/add-payout-modal";
import { Button, Card, InfoBanner, Modal, Page, StatusDot, Toast } from "@/components/portal/ui";
import { PaymentMethodRow } from "@/components/portal/settings";
import type { PayoutMethod } from "@/lib/independent/data";
import { payoutTitle, useWallet } from "@/lib/independent/wallet";
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
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
            Payout methods
          </h2>
          <Button variant="primary" size="lg" onClick={() => setAdding(true)}>
            Add payout method
          </Button>
        </div>
        <p className="text-[13px] leading-[1.4] text-ink-2">Trial payouts and salaries go to your default method.</p>
        {payouts.map((m) => (
          <MethodRow key={m.id} method={m} only={only} onSetDefault={() => makeDefault(m)} onRemove={() => setRemoving(m)} />
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
        description="Payouts already scheduled to this method complete; nothing new is sent here."
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

/**
 * One payout method: its brand, the account, what kind it is, and its buttons — Set as default once
 * it's verified, and Remove unless it's the default or the `only` one.
 */
function MethodRow({ method: m, only, onSetDefault, onRemove }: { method: PayoutMethod; only: boolean; onSetDefault: () => void; onRemove: () => void }) {
  return (
    <PaymentMethodRow
      brand={m.brand === "Bank" ? <span className="text-[12px] leading-[1.4] font-semibold text-ink">Bank</span> : <Image src={m.brand === "GCash" ? "/brands/gcash.png" : "/brands/maya.png"} alt={m.brand} width={110} height={26} className="h-[17px] w-auto object-contain" />}
      title={
        <>
          {payoutTitle(m)}
          {m.isDefault && <StatusDot tone="ok">Default</StatusDot>}
        </>
      }
      subtitle={m.brand === "Bank" ? "InstaPay / PESONet" : "E-wallet"}
      actions={
        <>
          {!m.isDefault && (
            <Button size="sm" disabled={!m.verified.startsWith("Verified")} title={m.verified.startsWith("Verified") ? undefined : "It can be your default once it's verified."} onClick={onSetDefault}>
              Set as default
            </Button>
          )}
          <Button size="sm" variant="danger" disabled={only || m.isDefault} title={only ? "Your only payout method can't be removed. Add another first." : m.isDefault ? "Make another method the default first." : undefined} onClick={onRemove}>
            Remove
          </Button>
        </>
      }
    />
  );
}
