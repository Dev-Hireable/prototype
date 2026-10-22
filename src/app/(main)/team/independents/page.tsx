"use client";

import { useState } from "react";
import { Avatar, Button, EmptyState, InfoBanner, LinkButton, Page } from "@/components/portal/ui";
import { ContractList, ContractListToolbar, type ContractTypeFilter, type ContractSummary } from "@/components/portal/contract-card";
import { useQueryState } from "@/lib/portal/query-state";
import { JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import { byName, CONTRACT_NAMES } from "@/lib/team/data";
import { useTeamContracts } from "@/lib/team/contracts";
import { useWithReturn } from "@/components/portal/return";
import type { Contract } from "@/lib/team/data";
import { CONTRACT_LAYOUTS } from "@/lib/contract/view";

/** Working days left in a trial; full-time contracts have no countdown. */
const daysLeft = (c: Contract) => c.left;

const isInactive = (c: Contract) => c.status.label === "Ended";
/** TB-108 — the trial is over once its end date comes. */
const trialEnded = (c: Contract) => c.type === "trial" && c.over;

/**
 * All independents, rebuilt to TB-051/054/057: a card per contract with
 * the task summary and Trial Fit Score, an active-only default view, and a Show inactive toggle.
 * Was a table, which had nowhere to put the per-contract counts the AC asks for.
 */
export default function AllIndependents() {
  const { contracts } = useTeamContracts();
  const withReturn = useWithReturn();
  const [q, setQ] = useState("");
  const [type, setType] = useState<ContractTypeFilter>("All");
  const [showInactive, setShowInactive] = useState(false); // TB-054: default OFF
  /** Cards or rows, kept in the URL so coming back from a contract keeps it. */
  const [layout, setLayout] = useQueryState("view", "grid", CONTRACT_LAYOUTS);

  const list = contracts.filter((c) => {
    const name = CONTRACT_NAMES[c.slug] ?? byName(c.independent).name;
    if (!showInactive && isInactive(c)) return false;
    if (q && !`${name} ${c.role}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (type !== "All" && JOB_TYPE_LABEL[c.type] !== type) return false;
    return true;
  });

  const filtering = q.trim() !== "" || type !== "All";
  const clearAll = () => {
    setQ("");
    setType("All");
  };

  return (
    <Page title="All Independents">
      <ContractListToolbar
        q={q}
        onQ={setQ}
        placeholder="Search by name or role"
        type={type}
        onType={setType}
        showInactive={showInactive}
        onShowInactive={setShowInactive}
        count={list.length === 1 ? "1 Independent" : `${list.length} Independents`}
        layout={layout}
        onLayout={setLayout}
      />

      {contracts.length === 0 ? (
        /* TB-051: nobody hired yet — two ways forward, not a dead end. */
        <NoIndependents discoverHref={withReturn("/team/discover")} />
      ) : list.length === 0 ? (
        <NoMatches filtering={filtering} showInactive={showInactive} onClear={clearAll} onShowInactive={() => setShowInactive(true)} />
      ) : (
        <ContractList layout={layout} who="Independent" items={list.map((c) => ({ id: c.slug, ...summaryOf(c, withReturn) }))} />
      )}
    </Page>
  );
}

/** Before the first hire: where Independents will appear, and the two ways to get one. */
function NoIndependents({ discoverHref }: { discoverHref: string }) {
  return (
    <div className="flex flex-col gap-3">
      <EmptyState
        title="No Independents yet"
        body="When an Independent accepts your offer, they show up here."
        action={
          <div className="flex gap-2">
            <LinkButton href={discoverHref} variant="primary" size="lg">
              Discover Independents
            </LinkButton>
            <LinkButton href="/team/hire" size="lg">
              Create a role
            </LinkButton>
          </div>
        }
      />
      <InfoBanner>This covers trial, full-time and part-time offers.</InfoBanner>
    </div>
  );
}

/** Nobody left after the search and filters: clear them, or bring back the ended contracts. */
function NoMatches({ filtering, showInactive, onClear, onShowInactive }: { filtering: boolean; showInactive: boolean; onClear: () => void; onShowInactive: () => void }) {
  return (
    <EmptyState
      title="No Independents match"
      body={filtering ? "Try a different filter, or clear the search to see everyone." : "Turn on Show inactive to include ended contracts."}
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

/** TB-057 — one contract's at-a-glance summary, drawn as a card or a row (shared with the independent's All contracts). */
function summaryOf(c: Contract, withReturn: (href: string) => string): ContractSummary {
  const p = byName(c.independent);
  const inactive = isInactive(c);
  return {
    avatar: (size) => <Avatar src={p.avatar} size={size} />,
    name: CONTRACT_NAMES[c.slug] ?? p.name,
    sub: c.role,
    href: `/team/independents/${c.slug}`,
    messageHref: withReturn("/team/messages"),
    type: c.type,
    // TB-143 — the live contract counts what its Work tab shows (counted); a listed one, all its tasks.
    tasks: c.counted ?? c.tasks,
    tfs: c.tfs?.overall ?? null,
    left: daysLeft(c),
    over: c.over,
    inactive,
    ended: c.endedOn ?? c.ends,
    started: c.started,
    /* TB-108: evaluate straight from the list, but only once the trial is actually over. */
    action: trialEnded(c) && !inactive && (
      <LinkButton href={`/team/independents/${c.slug}?tab=evaluation`} variant="primary" size="md" className="justify-center">
        Evaluate now
      </LinkButton>
    ),
  };
}
