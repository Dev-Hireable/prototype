"use client";

import { useState } from "react";
import { Button, EmptyState, Initials, LinkButton, Page, StatusDot } from "@/components/independent/ui";
import { ContractList, ContractListToolbar, type ContractSummary, type ContractTypeFilter } from "@/components/portal/ContractCard";
import { useWithReturn } from "@/components/portal/return";
import { useQueryState } from "@/lib/portal/query-state";
import { JOB_TYPE_LABEL } from "@/lib/demo/job-types";
import { PAIR } from "@/lib/demo/live";
import { useIndependentContracts } from "@/lib/independent/contracts";
import type { Contract } from "@/lib/independent/data";
import { CONTRACT_LAYOUTS } from "@/lib/contract/view";

const isInactive = (c: Contract) => c.status.label === "Ended";

/**
 * All contracts, laid out as the Team Builder's All independents is: the same toolbar, active-only by
 * default with a Show inactive toggle, and the same cards or rows (@/components/portal/ContractCard)
 * with the task list's breakdown — the two sides of one contract read alike.
 */
export default function Contracts() {
  const { contracts } = useIndependentContracts();
  const withReturn = useWithReturn();
  const [q, setQ] = useState("");
  const [type, setType] = useState<ContractTypeFilter>("All");
  const [showInactive, setShowInactive] = useState(false);
  /** Cards or rows, kept in the URL so coming back from a contract keeps it. */
  const [layout, setLayout] = useQueryState("view", "grid", CONTRACT_LAYOUTS);

  const list = contracts.filter((c) => {
    if (!showInactive && isInactive(c)) return false;
    if (q && !`${c.title} ${c.company}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (type !== "All" && JOB_TYPE_LABEL[c.type] !== type) return false;
    return true;
  });

  const filtering = q.trim() !== "" || type !== "All";
  const clearAll = () => {
    setQ("");
    setType("All");
  };

  return (
    <Page title="All contracts">
      <ContractListToolbar
        q={q}
        onQ={setQ}
        placeholder="Search by role or company"
        type={type}
        onType={setType}
        showInactive={showInactive}
        onShowInactive={setShowInactive}
        count={list.length === 1 ? "1 contract" : `${list.length} contracts`}
        layout={layout}
        onLayout={setLayout}
      />

      {contracts.length === 0 ? (
        <EmptyState
          title="No contracts yet"
          body="When you accept an offer, the contract and its task list appear here."
          action={
            <LinkButton href="/independent/jobs" variant="primary" size="lg">
              Discover roles
            </LinkButton>
          }
        />
      ) : list.length === 0 ? (
        <NoMatch filtering={filtering} showInactive={showInactive} onClear={clearAll} onShowInactive={() => setShowInactive(true)} />
      ) : (
        <ContractList layout={layout} items={list.map((c) => ({ id: c.slug, ...summaryOf(c, withReturn) }))} />
      )}
    </Page>
  );
}

/** Contracts on file, but none shown: clear the search and filter, or turn on the ended ones. */
function NoMatch({ filtering, showInactive, onClear, onShowInactive }: { filtering: boolean; showInactive: boolean; onClear: () => void; onShowInactive: () => void }) {
  return (
    <EmptyState
      title="No contracts match"
      body={filtering ? "Try a different filter, or clear the search to see every contract." : "Turn on Show inactive to include ended contracts."}
      action={
        <div className="flex gap-2">
          {filtering && (
            <Button size="lg" variant="primary" onClick={onClear}>
              Clear search
            </Button>
          )}
          {!showInactive && (
            <Button size="lg" onClick={onShowInactive}>
              Show inactive
            </Button>
          )}
        </div>
      }
    />
  );
}

/** One contract's at-a-glance summary, drawn as a card or a row (shared with the Team Builder's All independents). */
function summaryOf(c: Contract, withReturn: (href: string) => string): ContractSummary {
  return {
    avatar: (size: number) => <Initials text={c.initials} className={size < 44 ? "size-9 text-[12.5px]" : undefined} />,
    name: c.company,
    sub: c.title,
    href: `/independent/contracts/${c.slug}`,
    // The live thread is with the demo's Team Builder; anyone else lands on the inbox.
    messageHref: withReturn(c.manager === PAIR.team.name ? "/independent/messages?with=c1" : "/independent/messages"),
    type: c.type,
    tasks: c.tasks,
    tfs: c.tfs?.overall ?? null,
    left: c.left,
    inactive: isInactive(c),
    ended: c.endedOn ?? c.ends,
    started: c.started,
    status: isInactive(c) ? undefined : <StatusDot tone={c.status.tone}>{c.status.label}</StatusDot>,
  };
}
