"use client";

import { useState } from "react";
import { Button, Checkbox, Field, Input, Modal } from "@/components/portal/ui";
import { useCards } from "@/lib/team/account";
import type { PaymentMethod } from "@/lib/team/data";

/** The one label for the button that opens this dialog and the dialog itself. */
export const ADD_CARD = "Add a card";

/**
 * TB-102 — a new card: number, expiry and CVC, and whether it becomes the default. Only the last four
 * digits are kept. The one card form: Settings › Payment method and the offer (TB-105) both open it,
 * since a card is asked for when it's first needed rather than at sign-up. `onAdded` gets the card.
 */
export function AddCardDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded?: (card: PaymentMethod) => void }) {
  const { cards, addCard } = useCards();
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [isDefault, setIsDefault] = useState(cards.length === 0);
  const digits = number.replace(/\s/g, "");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ADD_CARD}
      description="Your card is stored by our payment provider. We only keep the last 4 digits."
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant="primary"
            disabled={digits.length < 12}
            onClick={() => {
              // The first card is always the default: there's nothing else to charge.
              const card: PaymentMethod = { id: `pm${Date.now()}`, brand: digits.startsWith("5") ? "Mastercard" : "Visa", last4: digits.slice(-4), expires: expiry || "12/2029", isDefault: isDefault || cards.length === 0 };
              addCard(card);
              onClose();
              setNumber("");
              setExpiry("");
              onAdded?.(card);
            }}
          >
            Add card
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Card number">
          <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="1234 1234 1234 1234" inputMode="numeric" />
        </Field>
        <div className="flex gap-3">
          <Field label="Expiry" className="flex-1">
            <Input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="MM/YYYY" />
          </Field>
          <Field label="CVC" className="flex-1">
            <Input placeholder="123" inputMode="numeric" />
          </Field>
        </div>
        {cards.length > 0 && (
          <Checkbox checked={isDefault} onChange={setIsDefault}>
            Set as default payment method
          </Checkbox>
        )}
      </div>
    </Modal>
  );
}
