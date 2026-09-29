import type { ReactNode } from "react";
import { StatusDot } from "@/components/portal/ui";
import { ActivityLog } from "@/components/portal/activity-log";
import { MatchAtHire, TrialFitScore } from "@/components/portal/trial-widgets";
import { FT_BENEFITS, type JobType } from "@/lib/contract/job-types";
import { trackerClosed, type Task } from "@/lib/demo/tasks";
import type { FitScore } from "@/lib/contract/fit-score";
import type { Side } from "@/lib/work/model";

/**
 * Pieces the talent's contract page and the Team Builder's tracker both show, the same on each side.
 */

/** A 1–5 rating: the stars given in amber, the rest in grey, read out as "4 out of 5 stars". `size` is its text size. */
export function Stars({ value, size }: { value: number; size: string }) {
  return (
    <span className={`flex items-center gap-1 ${size} leading-[1.2] text-[#f2994a]`} aria-label={`${value} out of 5 stars`}>
      {"★".repeat(value)}
      <span className="text-ink-2">{"★".repeat(5 - value)}</span>
    </span>
  );
}

/** A sidebar card's short label-and-value lines: the pay, the term, the escrow and the payout. */
export function SummaryRows({ rows }: { rows: readonly (readonly [string, ReactNode])[] }) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-2.5 leading-[1.45]">
          <span className="w-14 shrink-0 text-[11.5px] text-ink-2">{k}</span>
          <span className="min-w-0 flex-1 text-[12px] text-ink">{v}</span>
        </div>
      ))}
    </div>
  );
}

type Tracked = { activity: number[]; streak: number; tasks: Task[]; type: JobType; over: boolean; startsOn?: string };

/** TB-058 — the contract's activity log: the days worked, the streak, and why it stopped once it has. */
export function ContractActivity({ contract, ended }: { contract: Tracked; ended: boolean }) {
  const { tasks } = contract;
  return <ActivityLog activity={contract.activity} streak={contract.streak} feeding={tasks.filter((t) => t.status !== "done").length} closed={trackerClosed(tasks, { ended, trialOver: contract.type === "trial" && contract.over })} starts={contract.startsOn} />;
}

/** The trial's score — final once it's evaluated or became a role — or, on a direct hire, the match it started on. */
export function ContractScore({ contract, final, who, viewer }: { contract: { tfs: FitScore | null; phase: 3 | 4; match: number }; final: boolean; who: string; viewer: Side }) {
  return contract.tfs ? <TrialFitScore contract={{ tfs: contract.tfs, phase: contract.phase }} viewer={viewer} final={final} /> : <MatchAtHire match={contract.match} who={who} />;
}

/** IN-046 / TB-058 — each full-time benefit, and whether the signed offer includes it. `size` is its text size. */
export function BenefitList({ included, size }: { included: string[]; size: string }) {
  return (
    <ul className={`flex flex-col gap-3 ${size} leading-[1.4]`}>
      {FT_BENEFITS.map((b) => (
        <li key={b} className="flex items-center justify-between gap-4 border-t border-border pt-3 first:border-t-0 first:pt-0">
          <span className="text-ink">{b}</span>
          {included.includes(b) ? <StatusDot tone="ok">Included</StatusDot> : <StatusDot tone="neutral">Not included</StatusDot>}
        </li>
      ))}
    </ul>
  );
}
