"use client";

import Image from "next/image";
import { useState } from "react";
import { Button, Card, Checkbox, EmptyState, Field, InfoBanner, Input, Modal, Page, StatusDot, Toast, useToast } from "@/components/independent/ui";
import { CardHeading } from "@/components/team/ui";
import type { PaymentMethod } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";

/** Figma "Settings / Payment methods list / , empty / Add payment method · card". */
export default function PaymentMethods() {
  const { cards, addCard, removeCard, setDefaultCard } = useDemo();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<PaymentMethod | null>(null);
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [isDefault, setIsDefault] = useState(cards.length === 0);
  const [toast, setToast] = useToast();
  const only = cards.length === 1;

  return (
    <Page title="Settings">
      <Card className="mx-auto flex w-[720px] flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <CardHeading>Payment methods</CardHeading>
          <Button size="lg" variant="primary" onClick={() => setAdding(true)}>
            Add payment method
          </Button>
        </div>
        <p className="text-[13px] leading-[1.4] text-ink-2">Escrow deposits and salaries are charged to your default method.</p>
        {cards.length === 0 && <EmptyState title="No payment method yet" body="Add a card to fund escrow for trials and pay salaries." />}
        {cards.map((c) => (
          <div key={c.id} className="flex items-center gap-4 rounded-lg p-4 outline -outline-offset-1 outline-border">
            <span className="flex items-start rounded bg-surface-2 px-2.5 py-1.5">
              <Image src={c.brand === "Visa" ? "/brands/visa.svg" : "/brands/mastercard.svg"} alt={c.brand} width={26} height={17} className="h-[17px] w-[26px]" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2 text-[14px] leading-[1.4] font-medium text-ink">
                {c.brand} ending {c.last4}
                {c.isDefault && <StatusDot tone="ok">Default</StatusDot>}
              </span>
              <span className="text-[12px] leading-[1.4] text-ink-2">Expires {c.expires}</span>
            </span>
            {!c.isDefault && (
              <Button size="sm" onClick={() => { setDefaultCard(c.id); setToast(`${c.brand} ending ${c.last4} is now your default`); }}>
                Set as default
              </Button>
            )}
            <Button size="sm" disabled={only || c.isDefault} onClick={() => setRemoving(c)}>
              Remove
            </Button>
          </div>
        ))}
        {only && (
          <div className="w-[530px]">
            <InfoBanner>You cannot remove your only payment method. Add another card first, then remove this one.</InfoBanner>
          </div>
        )}
      </Card>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add a card"
        description="Cards are stored by our payment provider; Hireable only keeps the last four digits."
        footer={
          <>
            <Button size="lg" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant="primary"
              disabled={number.replace(/\s/g, "").length < 12}
              onClick={() => {
                const digits = number.replace(/\s/g, "");
                addCard({ id: `pm${Date.now()}`, brand: digits.startsWith("5") ? "Mastercard" : "Visa", last4: digits.slice(-4), expires: expiry || "12/2029", isDefault });
                setAdding(false);
                setNumber("");
                setToast("Card added");
              }}
            >
              Add card
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Card number">
            <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="4242 4242 4242 4242" inputMode="numeric" />
          </Field>
          <div className="flex gap-3">
            <Field label="Expiry" className="flex-1">
              <Input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="MM/YYYY" />
            </Field>
            <Field label="CVC" className="flex-1">
              <Input placeholder="123" inputMode="numeric" />
            </Field>
          </div>
          <Checkbox checked={isDefault} onChange={setIsDefault}>
            Set as default payment method
          </Checkbox>
        </div>
      </Modal>
      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        tone="danger"
        title={`Remove ${removing?.brand} ending ${removing?.last4}?`}
        description="Charges already scheduled to this card complete; nothing new is charged here."
        footer={
          <>
            <Button size="lg" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button size="lg" variant="danger" onClick={() => { if (removing) removeCard(removing.id); setRemoving(null); setToast("Card removed"); }}>
              Remove
            </Button>
          </>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
