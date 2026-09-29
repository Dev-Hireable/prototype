"use client";

import Image from "next/image";
import { useState } from "react";
import { Button, Card, CardHeading, Checkbox, EmptyState, Field, InfoBanner, Input, Modal, Page, StatusDot, Toast } from "@/components/portal/ui";
import { PaymentMethodRow } from "@/components/portal/settings";
import { useToast, type SetToast } from "@/lib/portal/toast";
import type { PaymentMethod } from "@/lib/team/data";
import { useCards } from "@/lib/team/account";

export default function PaymentMethods() {
  const { cards, setDefaultCard } = useCards();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<PaymentMethod | null>(null);
  const [toast, setToast] = useToast();
  const only = cards.length === 1;

  return (
    <Page title="Settings">
      <Card className="mx-auto flex w-full max-w-[720px] flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <CardHeading>Payment methods</CardHeading>
          <Button size="lg" variant="primary" onClick={() => setAdding(true)}>
            Add payment method
          </Button>
        </div>
        <p className="text-[13px] leading-[1.4] text-ink-2">Escrow deposits and salaries are charged to your default method.</p>
        {cards.length === 0 && <EmptyState title="No payment method yet" body="Add a card to fund escrow for trials and pay salaries." />}
        {cards.map((c) => (
          <CardRow
            key={c.id}
            card={c}
            only={only}
            onDefault={() => { setDefaultCard(c.id); setToast(`${c.brand} ending ${c.last4} is now your default`); }}
            onRemove={() => setRemoving(c)}
          />
        ))}
        {only && (
          <div className="w-full max-w-[530px]">
            <InfoBanner>You cannot remove your only payment method. Add another card first, then remove this one.</InfoBanner>
          </div>
        )}
      </Card>

      <AddCardDialog open={adding} onClose={() => setAdding(false)} onToast={setToast} />
      <RemoveCardDialog card={removing} onClose={() => setRemoving(null)} onToast={setToast} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** One card: its brand, last four digits and expiry, marked when it's the default, with Set as default and Remove. */
function CardRow({ card: c, only, onDefault, onRemove }: { card: PaymentMethod; only: boolean; onDefault: () => void; onRemove: () => void }) {
  return (
    <PaymentMethodRow
      brand={<Image src={c.brand === "Visa" ? "/brands/visa.svg" : "/brands/mastercard.svg"} alt={c.brand} width={26} height={17} className="h-[17px] w-[26px]" />}
      title={
        <>
          {c.brand} ending {c.last4}
          {c.isDefault && <StatusDot tone="ok">Default</StatusDot>}
        </>
      }
      subtitle={`Expires ${c.expires}`}
      actions={
        <>
          {!c.isDefault && (
            <Button size="sm" onClick={onDefault}>
              Set as default
            </Button>
          )}
          <Button size="sm" variant="danger" disabled={only || c.isDefault} onClick={onRemove}>
            Remove
          </Button>
        </>
      }
    />
  );
}

/** A new card — number, expiry and CVC, and whether it becomes the default. Only the number is kept once it's added. */
function AddCardDialog({ open, onClose, onToast }: { open: boolean; onClose: () => void; onToast: SetToast }) {
  const { cards, addCard } = useCards();
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [isDefault, setIsDefault] = useState(cards.length === 0);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a card"
      description="Cards are stored by our payment provider; Hireable only keeps the last four digits."
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant="primary"
            disabled={number.replace(/\s/g, "").length < 12}
            onClick={() => {
              const digits = number.replace(/\s/g, "");
              addCard({ id: `pm${Date.now()}`, brand: digits.startsWith("5") ? "Mastercard" : "Visa", last4: digits.slice(-4), expires: expiry || "12/2029", isDefault });
              onClose();
              setNumber("");
              onToast("Card added");
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
  );
}

/** Removing a card, once confirmed: what's already scheduled to it still goes through. */
function RemoveCardDialog({ card, onClose, onToast }: { card: PaymentMethod | null; onClose: () => void; onToast: SetToast }) {
  const { removeCard } = useCards();
  return (
    <Modal
      open={!!card}
      onClose={onClose}
      tone="danger"
      title={`Remove ${card?.brand} ending ${card?.last4}?`}
      description="Charges already scheduled to this card complete; nothing new is charged here."
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="danger" onClick={() => { if (card) removeCard(card.id); onClose(); onToast("Card removed"); }}>
            Remove
          </Button>
        </>
      }
    />
  );
}
