"use client";

import Image from "next/image";
import { useState } from "react";
import { Button, Card, CardHeading, EmptyState, InfoBanner, Modal, Page, StatusDot, Toast } from "@/components/portal/ui";
import { Tip } from "@/components/portal/tip";
import { PaymentMethodRow } from "@/components/portal/settings";
import { AddCardDialog, ADD_CARD } from "@/components/team/add-card-dialog";
import { useToast, type SetToast } from "@/lib/portal/toast";
import type { PaymentMethod } from "@/lib/team/data";
import { useCards } from "@/lib/team/account";

/**
 * TB-102 — the cards on file. None is needed to start, and a new account has none: a card is asked
 * for when it's first used, at the first offer (TB-105), with the same Add a card form as here.
 */
export default function PaymentMethods() {
  const { cards, setDefaultCard } = useCards();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<PaymentMethod | null>(null);
  const [toast, setToast] = useToast();
  const only = cards.length === 1;

  return (
    <Page title="Settings">
      <Card className="mx-auto flex w-full max-w-[720px] flex-col gap-4 p-6 max-sm:p-4">
        <div className="flex items-center justify-between">
          <CardHeading>Payment methods</CardHeading>
          <Button size="lg" variant="primary" onClick={() => setAdding(true)}>
            {ADD_CARD}
          </Button>
        </div>
        {cards.length === 0 ? (
          <EmptyState title="No card yet" body="You'll be asked for a card when you send your first offer." />
        ) : (
          <p className="text-[13px] leading-[1.4] text-ink-2">Trial escrow and monthly pay are charged to your default card.</p>
        )}
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

      <AddCardDialog open={adding} onClose={() => setAdding(false)} onAdded={() => setToast("Card added")} />
      <RemoveCardDialog card={removing} onClose={() => setRemoving(null)} onToast={setToast} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/**
 * One card: its brand, last four digits and expiry, marked when it's the default, with Set as default
 * and Remove. The default can't go while another card could take its place; that's said on Remove's
 * tip, and under the row on a phone. The only card's reason is the banner under the list.
 */
function CardRow({ card: c, only, onDefault, onRemove }: { card: PaymentMethod; only: boolean; onDefault: () => void; onRemove: () => void }) {
  const keep = c.isDefault && !only ? "Set another card as default to remove this one." : undefined;
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
      note={keep}
      actions={
        <>
          {!c.isDefault && (
            <Button size="sm" onClick={onDefault}>
              Set as default
            </Button>
          )}
          {/* Quiet here; the solid red is the confirm's. A card that can't go yet says why. */}
          <Tip label={keep} wrap>
            <Button size="sm" disabled={only || c.isDefault} onClick={onRemove}>
              Remove
            </Button>
          </Tip>
        </>
      }
    />
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
      description="Payments already scheduled on this card will still go through. New payments will use your default card."
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
