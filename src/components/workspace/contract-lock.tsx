"use client";

import type { ReactNode } from "react";
import { ICONS } from "@/components/admin/icons";
import { InfoBanner } from "@/components/independent/ui";
import { Tip } from "@/components/portal/Tip";
import type { AgreedField } from "@/lib/work/permissions";
import { explain } from "@/lib/work/store";
import { agreedReason, lockLabel } from "./lockable";

/** Where there's no sheet to hold the notice — a List cell — the reason is a toast. */
const explainAgreed = (field: AgreedField) => explain(agreedReason(field));

/**
 * TB-077 — a value the signed offer set, where it would be edited: it reads like the field, with a
 * lock, and trying to change it says why (`onLocked` — the sheet's notice — or else a toast) rather
 * than plain text that says nothing. The same on both sides, in every view.
 */
export function LockedValue({ field, onLocked = explainAgreed, children }: { field: AgreedField; onLocked?: (field: AgreedField) => void; children: ReactNode }) {
  return (
    <Tip label="Agreed in the signed offer">
      <button
        type="button"
        onClick={(e) => {
          // A List row opens its item on a click; this click is about the value.
          e.stopPropagation();
          onLocked(field);
        }}
        aria-label={lockLabel(field)}
        className="inline-flex h-7 max-w-full min-w-0 items-center gap-1 rounded-md px-1.5 text-[13px] leading-[1.2] text-ink-2 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
      >
        {children}
        <ICONS.lock size={13} aria-hidden className="ml-0.5 shrink-0 text-ink-2" />
      </button>
    </Tip>
  );
}

/** The sheet's notice for an agreed value someone tried to change: why it can't be, until they close it with its ×. */
export function AgreedNotice({ field, onClose }: { field: AgreedField; onClose: () => void }) {
  return (
    <div role="alert">
      <InfoBanner tone="warn" onClose={onClose}>
        {agreedReason(field)}
      </InfoBanner>
    </div>
  );
}
