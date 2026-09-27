"use client";

import type { ReactNode } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, InfoBanner } from "@/components/independent/ui";
import { Tip } from "@/components/portal/Tip";
import { writeParams } from "@/lib/portal/query-state";
import { newId, refOf, type WorkItem } from "@/lib/work/model";
import { CONTRACT_LOCK } from "@/lib/work/scope";
import { useWorkspace } from "./context";

/** What someone tried to change on a contract task: one of its agreed fields, or taking it off the contract. */
export type LockedPart = "name" | "requirements" | "due date" | "effort" | "work type" | "assignee" | "removal";

/**
 * A contract task's agreed value, where it would be edited: it reads like the field, with a lock, and
 * trying to change it says why it can't be changed here — rather than a control that changes it, or
 * plain text that says nothing.
 */
export function LockedValue({ part, onLocked, children }: { part: LockedPart; onLocked: (part: LockedPart) => void; children: ReactNode }) {
  return (
    <Tip label="Agreed in the contract">
      <button type="button" onClick={() => onLocked(part)} aria-label={`${part[0].toUpperCase()}${part.slice(1)} is agreed in the contract. Change it`} className="inline-flex h-7 max-w-full min-w-0 items-center gap-1 rounded-md px-1.5 text-[13px] leading-[1.2] text-ink-2 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary">
        {children}
        <ICONS.lock size={13} aria-hidden className="ml-0.5 shrink-0 text-ink-2" />
      </button>
    </Tip>
  );
}

/**
 * What trying to change a contract task says: it's part of an agreed contract, and its scope changes
 * only with both sides' approval — with Propose change (an amendment, on this task) and Cancel. When a
 * change can't be proposed right now (one is open, the contract is closed), it says why instead.
 */
export function ContractNotice({ item, part, onClose }: { item: WorkItem; part: LockedPart; onClose: () => void }) {
  const { agreement } = useWorkspace();
  const propose = () => agreement.propose(part === "removal" ? { changes: [{ id: newId("ch"), kind: "remove", taskId: item.id }], reason: "" } : { editing: { kind: "task", id: item.id } });
  return (
    <div role="alert">
      <InfoBanner tone="warn">
        <span className="flex flex-col gap-1">
          <span className="font-semibold">{CONTRACT_LOCK.split(". ")[0]}.</span>{" "}
          <span>{CONTRACT_LOCK.split(". ").slice(1).join(". ")}</span>
          {agreement.blocked && <span className="text-[13px]">{agreement.blocked}</span>}
          <span className="mt-2 flex flex-wrap gap-2">
            {!agreement.blocked && (
              <Button size="sm" variant="primary" onClick={propose}>
                {part === "removal" ? "Propose removing it" : "Propose change"}
              </Button>
            )}
            <Button size="sm" onClick={onClose}>
              Cancel
            </Button>
          </span>
        </span>
      </InfoBanner>
    </div>
  );
}

/** A contract task the open amendment would change or remove: said in its sheet, with the way to the amendment. */
export function PendingNotice({ item }: { item: WorkItem }) {
  const { agreement } = useWorkspace();
  const kind = agreement.pending.get(item.id);
  const a = agreement.open;
  if (!kind || !a) return null;
  return (
    <InfoBanner>
      <span className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span>
          Amendment {a.number} would {kind === "remove" ? "remove" : "change"} {refOf(item)} — proposed by {a.byName}. It stays as agreed until it&apos;s accepted.
        </span>
        <Button size="sm" onClick={() => writeParams({ tab: "agreement", task: null })}>
          {a.waiting ? "Review" : "View"}
        </Button>
      </span>
    </InfoBanner>
  );
}
