"use client";

import { PanelCard } from "@/components/portal/PanelCard";
import { TFP_TOOLTIP, TFP_WEIGHTS } from "@/lib/team/data";
import type { Contract } from "@/lib/team/data";

/** Both portals show the same score for the same trial, so the widget takes the numbers, not a contract. */
type Scored = Pick<Contract, "tfs" | "phase">;

/**
 * TB-058 Trial Fit Score. The three live components each get a bar, and the weight beside each
 * one comes from the contract's phase — On Trial excludes Evaluation entirely, Post Trial folds
 * it in at 25%. The tooltip says when the final score lands.
 */
export function TrialFitScore({ contract, final = false }: { contract: Scored; final?: boolean }) {
  const w = TFP_WEIGHTS[contract.phase];
  const rows = [
    { label: "Performance", value: contract.tfs.performance, weight: w.performance, bar: "bg-primary" },
    { label: "Profile", value: contract.tfs.profile, weight: w.profile, bar: "bg-[#27ae60]" },
    { label: "Work Style", value: contract.tfs.workStyle, weight: w.workStyle, bar: "bg-[#f2994a]" },
  ];

  return (
    <PanelCard
      title="Trial Fit Score"
      aside={
        <span title={TFP_TOOLTIP} className="cursor-help rounded-lg bg-ink px-3 py-1.5 text-[18px] leading-[1.2] font-bold text-white">
          {contract.tfs.overall}%
        </span>
      }
    >
      {/* TB-074: on a full-time contract this is the trial's final score and stops moving. */}
      <p className="-mt-3 text-[12.5px] leading-[1.4] text-ink-2">{final ? "Final score from the completed trial · read-only" : `${w.label} · Phase ${contract.phase}`}</p>

      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-1.5">
            <p className="flex items-baseline justify-between text-[13px] leading-[1.2] text-ink">
              <span>
                {r.label} <span className="text-ink-2">· {r.weight}%</span>
              </span>
              <span className="font-semibold">{r.value}%</span>
            </p>
            <span className="block h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <span className={`block h-full rounded-full ${r.bar}`} style={{ width: `${r.value}%` }} />
            </span>
          </div>
        ))}
        {/* Evaluation only counts once the trial is over, so Phase 3 shows it greyed at 0%. */}
        <p className="flex items-baseline justify-between text-[13px] leading-[1.2] text-ink-2">
          <span>
            Evaluation <span>· {w.evaluation}%</span>
          </span>
          <span>{w.evaluation === 0 ? "Excluded during the trial" : final ? "Included in the final score" : "Added once the evaluation is in"}</span>
        </p>
      </div>
    </PanelCard>
  );
}
