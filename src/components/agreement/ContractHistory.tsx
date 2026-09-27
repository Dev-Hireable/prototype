"use client";

import { Button } from "@/components/independent/ui";
import { contractHistory, entryView, type HistoryEntry } from "@/lib/contract/history";
import type { OfferEvent } from "@/lib/contract/negotiation";
import type { WorkItem } from "@/lib/work/model";
import type { ContractScope, ContractVersion } from "@/lib/work/scope";
import { AmendmentChanges } from "./AmendmentChanges";

/** One line of the history: what happened, who and when, what was said, and the changes before and after. */
function Entry({ e, items, onView }: { e: HistoryEntry; items: ReadonlyMap<string, WorkItem>; onView: (v: ContractVersion) => void }) {
  const { title, meta, note, version, changes } = entryView(e);
  return (
    <li className="flex gap-3">
      <span aria-hidden className="flex w-4 shrink-0 justify-center pt-[7px]">
        <span className={`size-2 rounded-full ${version ? "bg-primary" : "bg-[#c3c3c3]"}`} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={`text-[14px] leading-[1.4] text-ink ${version ? "font-semibold" : "font-medium"}`}>{title}</p>
          {version && (
            <Button size="sm" variant="ghost" onClick={() => onView(version)}>
              View v{version.version}
            </Button>
          )}
        </div>
        <p className="text-[12.5px] leading-[1.4] text-ink-2">{meta}</p>
        {note && <p className="text-[13px] leading-[1.45] whitespace-pre-line text-ink [overflow-wrap:anywhere]">“{note}”</p>}
        {!!changes?.length && <AmendmentChanges changes={changes} items={items} label={title} />}
      </div>
    </li>
  );
}

/**
 * TB-151 / IN-094 — Contract History: every step of what was agreed, oldest first — the offer as it
 * was negotiated, each version (open one to read it in full), and each amendment's proposal, answers
 * and outcome with the values before and after. Nothing here can be changed.
 */
export function ContractHistory({ offerLog, scope, open, items, onView }: { offerLog?: readonly OfferEvent[]; scope: ContractScope; open: boolean; items: ReadonlyMap<string, WorkItem>; onView: (v: ContractVersion) => void }) {
  const entries = contractHistory(offerLog, scope, open);
  return (
    <ol aria-label="Contract history" className="flex flex-col">
      {entries.map((e) => (
        <Entry key={e.key} e={e} items={items} onView={onView} />
      ))}
    </ol>
  );
}
