"use client";

import type { ReactNode } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, InfoBanner } from "@/components/independent/ui";
import { Tip } from "@/components/portal/Tip";

/** What someone tried to change on a task from the signed offer: one of the fields it agreed. */
export type LockedPart = "name" | "requirements" | "due date" | "effort" | "work type" | "assignee";

const capital = (part: LockedPart) => `${part[0].toUpperCase()}${part.slice(1)}`;

/**
 * A value the signed offer agreed, where it would be edited: it reads like the field, with a lock,
 * and trying to change it says why it can't be changed — rather than plain text that says nothing.
 */
export function LockedValue({ part, onLocked, children }: { part: LockedPart; onLocked: (part: LockedPart) => void; children: ReactNode }) {
  return (
    <Tip label="Agreed in the signed offer">
      <button type="button" onClick={() => onLocked(part)} aria-label={`${capital(part)}: agreed in the signed offer`} className="inline-flex h-7 max-w-full min-w-0 items-center gap-1 rounded-md px-1.5 text-[13px] leading-[1.2] text-ink-2 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary">
        {children}
        <ICONS.lock size={13} aria-hidden className="ml-0.5 shrink-0 text-ink-2" />
      </button>
    </Tip>
  );
}

/**
 * What trying to change an agreed value says: it was settled before the offer went out — in the
 * proposal both sides worked on — so it stays as the signed offer has it.
 */
export function AgreedNotice({ part, onClose }: { part: LockedPart; onClose: () => void }) {
  return (
    <div role="alert">
      <InfoBanner tone="warn">
        <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>{capital(part)} was agreed in the signed offer, so it stays as agreed.</span>
          <Button size="sm" onClick={onClose}>
            OK
          </Button>
        </span>
      </InfoBanner>
    </div>
  );
}
