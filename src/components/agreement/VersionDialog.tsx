"use client";

import { Button, Modal } from "@/components/independent/ui";
import type { WorkItem } from "@/lib/work/model";
import type { ContractScope, ContractVersion } from "@/lib/work/scope";
import { AmendmentChanges } from "./AmendmentChanges";
import { VersionScope } from "./VersionScope";

/** What made `v`: the accepted amendment's changes, from the history — none for the signed offer or a conversion. */
const changesOf = (scope: ContractScope, v: ContractVersion) => (v.source.kind === "amendment" ? scope.log.find((e) => e.kind === "accepted" && e.version === v.version)?.changes : undefined);

/**
 * A version as it was agreed, read-only: its terms and every contract task, and — for one an
 * amendment made — what that amendment changed. An earlier one can be proposed again: that's an
 * amendment like any other, which the other side accepts or not.
 */
export function VersionDialog({ version, scope, current, items, onClose, onRestore }: { version: ContractVersion | null; scope: ContractScope; current?: ContractVersion; items: ReadonlyMap<string, WorkItem>; onClose: () => void; onRestore?: (v: ContractVersion) => void }) {
  if (!version) return null;
  const changes = changesOf(scope, version);
  const isCurrent = version.version === current?.version;
  return (
    <Modal
      open
      onClose={onClose}
      width={720}
      closeButton
      title={`Contract v${version.version}${isCurrent ? " — in force" : ""}`}
      description={`Agreed ${version.agreedAt}: proposed by the ${version.proposedBy === "team" ? "Team Builder" : "Independent"}, accepted by the ${version.acceptedBy === "team" ? "Team Builder" : "Independent"}.`}
      footer={
        <>
          {!isCurrent && onRestore && (
            <Button size="lg" onClick={() => onRestore(version)}>
              Propose going back to v{version.version}
            </Button>
          )}
          <Button size="lg" variant="primary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {changes && changes.length > 0 && (
          <section aria-label={`What v${version.version} changed`} className="flex flex-col gap-2">
            <h3 className="text-[14px] font-semibold text-ink">What it changed from v{version.version - 1}</h3>
            <AmendmentChanges changes={changes} items={items} label={`Changes in v${version.version}`} />
          </section>
        )}
        <VersionScope version={version} items={items} />
      </div>
    </Modal>
  );
}
