"use client";

import Image from "next/image";
import { useState } from "react";
import { AddPayoutModal } from "@/components/independent/AddPayoutModal";
import { Button, Card, InfoBanner, Modal, Page, StatusDot, Toast, useToast } from "@/components/independent/ui";
import { PaymentMethodRow } from "@/components/portal/settings";
import type { PayoutMethod } from "@/lib/independent/data";
import { useDemo } from "@/lib/independent/store";

/** Figma "Settings / Payout methods" (+ add modal): 720 card, p 24, gap 16; method rows p 16, gap 16. */
export default function PayoutSettings() {
  const { payouts, setDefaultPayout, removePayout } = useDemo();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<PayoutMethod | null>(null);
  const [toast, setToast] = useToast();
  const only = payouts.length === 1;

  return (
    <Page title="Settings">
      <Card className="mx-auto flex w-[720px] flex-col gap-4 p-6">
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
          <PaymentMethodRow
            key={m.id}
            brand={m.brand === "Bank" ? <span className="text-[12px] leading-[1.4] font-semibold text-ink">Bank</span> : <Image src={m.brand === "GCash" ? "/brands/gcash.png" : "/brands/maya.png"} alt={m.brand} width={110} height={26} className="h-[17px] w-auto object-contain" />}
            title={
              <>
                {m.brand === "Bank" ? `BPI · account ending ${m.last4}` : `${m.brand} · ${m.brand === "GCash" ? "0917 555 0142" : `····${m.last4}`}`}
                {m.isDefault && <StatusDot tone="ok">Default</StatusDot>}
              </>
            }
            subtitle={m.brand === "Bank" ? "InstaPay / PESONet" : "E-wallet"}
            actions={
              <>
                {!m.isDefault && (
                  <Button size="sm" disabled={!m.verified.startsWith("Verified")} onClick={() => { setDefaultPayout(m.id); setToast(`${m.brand} is now your default`); }}>
                    Set as default
                  </Button>
                )}
                <Button size="sm" disabled={only || m.isDefault} onClick={() => setRemoving(m)}>
                  Remove
                </Button>
              </>
            }
          />
        ))}
        {only && (
          <div className="w-[530px]">
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
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
