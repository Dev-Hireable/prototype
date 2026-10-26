"use client";

import Image from "next/image";
import { useState } from "react";
import { ICONS } from "@/components/icons";
import { PaymentMethodRow } from "@/components/portal/settings";
import { Button } from "@/components/portal/ui";
import { AddCardDialog, ADD_CARD } from "@/components/team/add-card-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { PaymentMethod } from "@/lib/team/data";

const CardIcon = ICONS.card;

/**
 * TB-105 — the card an offer is paid from, under what it pays for (`label`): the one picked, the
 * default to begin with, with Change to pick another saved card or add one. With none on file, Add a
 * card opens the one card form (TB-102), the same as Settings › Payment method: a card is asked for
 * at the first offer, whatever its type. `empty` says what the card will pay for.
 */
export function CardOnFile({ cards, card, onPick, label, empty }: { cards: PaymentMethod[]; card?: PaymentMethod; onPick: (id: string) => void; label: string; empty: string }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{label}</p>
      {card ? (
        <PaymentMethodRow
          brand={<Image src={card.brand === "Visa" ? "/brands/visa.svg" : "/brands/mastercard.svg"} alt={card.brand} width={26} height={17} className="h-[17px] w-[26px]" loading="eager" />}
          title={`${card.brand} ending ${card.last4}`}
          subtitle={`Expires ${card.expires}`}
          actions={<ChangeCard cards={cards} card={card} onPick={onPick} onAdd={() => setAdding(true)} />}
        />
      ) : (
        <PaymentMethodRow
          brand={<CardIcon size={17} aria-hidden className="text-ink-2" />}
          title="No card on file yet"
          subtitle={empty}
          actions={
            <Button size="sm" variant="primary" onClick={() => setAdding(true)}>
              {ADD_CARD}
            </Button>
          }
        />
      )}
      {/* The card just added is the one the offer is paid from. */}
      <AddCardDialog open={adding} onClose={() => setAdding(false)} onAdded={(c) => onPick(c.id)} />
    </div>
  );
}

/** Change: the saved cards to pay from, the picked one ticked, and Add a card. */
function ChangeCard({ cards, card, onPick, onAdd }: { cards: PaymentMethod[]; card: PaymentMethod; onPick: (id: string) => void; onAdd: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Change card"
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-[12px] font-medium whitespace-nowrap text-ink hover:bg-surface-alt data-popup-open:bg-surface-alt"
      >
        Change
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuRadioGroup value={card.id} onValueChange={(id) => onPick(String(id))}>
          {cards.map((c) => (
            <DropdownMenuRadioItem key={c.id} value={c.id} closeOnClick>
              {c.brand} ending {c.last4}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onAdd}>{ADD_CARD}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
