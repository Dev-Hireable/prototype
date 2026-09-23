"use client";

import Link from "next/link";
import { useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, EmptyState, InfoBanner, JobBadge, LinkButton, Page, SearchBox, Select } from "@/components/independent/ui";
import { Avatar } from "@/components/team/ui";
import { daysLeftLabel } from "@/lib/demo/dates";
import { byName, CONTRACT_NAMES, isOffTrack } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";
import { useWithReturn } from "@/components/portal/return";
import type { Contract } from "@/lib/team/data";

const Message = ICONS.messages;

/** Working days left in a trial; full-time contracts have no countdown. */
const daysLeft = (c: Contract) => c.left;

const isInactive = (c: Contract) => c.status.label === "Ended";
/** TB-108 — the trial is over once its end date comes. */
const trialEnded = (c: Contract) => c.type === "trial" && c.over;

/**
 * Figma "Independents / All independents", rebuilt to TB-051/054/057: a card per contract with
 * the objectives summary and Trial Fit Score, an active-only default view, and a Show inactive
 * toggle. Was a table, which had nowhere to put the per-objective counts the AC asks for.
 */
export default function AllIndependents() {
  const { contracts } = useDemo();
  const withReturn = useWithReturn();
  const [q, setQ] = useState("");
  const [type, setType] = useState("All");
  const [showInactive, setShowInactive] = useState(false); // TB-054: default OFF

  const list = contracts.filter((c) => {
    const name = CONTRACT_NAMES[c.slug] ?? byName(c.independent).name;
    if (!showInactive && isInactive(c)) return false;
    if (q && !`${name} ${c.role}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (type === "Trial" && c.type !== "trial") return false;
    if (type === "Full-Time" && c.type !== "full-time") return false;
    return true;
  });

  const filtering = q.trim() !== "" || type !== "All";
  const clearAll = () => {
    setQ("");
    setType("All");
  };

  return (
    <Page title="All independents">
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Search by name or role" className="w-[360px]" />
        <Select options={["All", "Full-Time", "Trial"]} value={type} onChange={(e) => setType(e.target.value)} className="!w-[150px]" />
        {/* TB-051: the active filter is visible without opening the dropdown. */}
        {type !== "All" && <span className="rounded-full bg-accent-bg px-3 py-1 text-[12.5px] leading-[1.3] font-semibold text-accent-ink">{type}</span>}
        {/* TB-054: show inactive is a toggle, off by default. */}
        <label className="ml-auto flex items-center gap-2 text-[14px] leading-[1.3] text-ink">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="size-5 accent-primary" />
          Show inactive
        </label>
        <span className="text-[14px] leading-[1.4] text-ink-2">{list.length === 1 ? "1 independent" : `${list.length} independents`}</span>
      </div>

      {contracts.length === 0 ? (
        /* TB-051: nobody hired yet — two ways forward, not a dead end. */
        <div className="flex flex-col gap-3">
          <EmptyState
            title="No independents yet"
            body="When a candidate accepts an offer, their contract and tracker appear here."
            action={
              <div className="flex gap-2">
                <LinkButton href={withReturn("/team/discover")} variant="primary" size="lg">
                  Discover independents
                </LinkButton>
                <LinkButton href="/team/hire" size="lg">
                  Create job post
                </LinkButton>
              </div>
            }
          />
          <InfoBanner>Independents appear here only after they accept a trial or full-time offer.</InfoBanner>
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          title="No independents match"
          body={filtering ? "Try a different filter, or clear the search to see everyone." : "Turn on Show inactive to include ended contracts."}
          action={
            <div className="flex gap-2">
              {filtering && (
                <Button size="lg" variant="primary" onClick={clearAll}>
                  Clear search
                </Button>
              )}
              {!showInactive && (
                <Button size="lg" onClick={() => setShowInactive(true)}>
                  Show inactive
                </Button>
              )}
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-4">
          {list.map((c) => (
            <TalentCard key={c.slug} contract={c} />
          ))}
        </div>
      )}
    </Page>
  );
}

/** TB-057 — the at-a-glance summary card: objectives breakdown, contract type, TFS, time left. */
function TalentCard({ contract: c }: { contract: Contract }) {
  const withReturn = useWithReturn();
  const p = byName(c.independent);
  const name = CONTRACT_NAMES[c.slug] ?? p.name;
  const left = daysLeft(c);
  const inactive = isInactive(c);
  const ended = trialEnded(c);

  const assigned = c.objectives.length;
  const completed = c.objectives.filter((o) => o.status === "complete").length;
  const offTrack = c.objectives.filter((o) => o.status === "risk" || isOffTrack(o, left ?? 99)).length;
  const inProgress = assigned - completed - offTrack;

  return (
    <article className={`flex flex-col gap-4 rounded-lg bg-white p-4 outline -outline-offset-1 outline-border ${inactive ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <Avatar src={p.avatar} size={44} />
        <Link href={`/team/independents/${c.slug}`} className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.3]">
          <span className="truncate text-[15px] font-semibold text-ink hover:text-primary">{name}</span>
          <span className="truncate text-[13px] text-ink-2">{c.role}</span>
        </Link>
        <Link href={withReturn("/team/messages")} aria-label={`Message ${name}`} className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-ink hover:bg-surface-alt">
          <Message size={18} aria-hidden />
        </Link>
      </div>

      {/* Assigned / In progress / Off-track / Completed, colour coded per the AC. */}
      <dl className="grid grid-cols-4 gap-2 rounded-lg bg-surface-2 p-3 text-center">
        <Count label="Assigned" value={assigned} tone="text-ink" />
        <Count label="In progress" value={inProgress} tone="text-primary" />
        <Count label="Off-track" value={offTrack} tone="text-danger" />
        <Count label="Completed" value={completed} tone="text-ok" />
      </dl>

      <div className="flex flex-wrap items-center gap-2 text-[13px] leading-[1.3] text-ink-2">
        <JobBadge type={c.type} />
        {c.type === "trial" ? (
          <>
            <span className="rounded-md bg-[#eef6ff] px-2 py-1 text-[12.5px] font-semibold text-[#005b99]">TFS {c.tfs.overall}%</span>
            {inactive ? (
              <span>Ended {c.endedOn ?? c.ends}</span>
            ) : (
              /* 7 days or fewer reads as a warning (TB-057). */
              <span className={left !== null && left <= 7 ? "font-semibold text-brand-orange" : ""}>{daysLeftLabel(left ?? 0, "remaining")}</span>
            )}
          </>
        ) : (
          <span>{inactive ? `Ended ${c.endedOn ?? c.ends}` : `Started ${c.started}`}</span>
        )}
      </div>

      {/* TB-108: evaluate straight from the card, but only once the trial is actually over. */}
      {ended && !inactive && (
        <LinkButton href={`/team/independents/${c.slug}?tab=evaluation`} variant="primary" size="md" className="justify-center">
          Evaluate now
        </LinkButton>
      )}
    </article>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="order-2 text-[11.5px] leading-[1.2] text-ink-2">{label}</dt>
      <dd className={`order-1 text-[18px] leading-[1.2] font-semibold ${tone}`}>{value}</dd>
    </div>
  );
}
