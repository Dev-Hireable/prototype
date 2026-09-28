"use client";

import { Meter, ScoreRing } from "@/components/portal/Meter";
import { Tip } from "@/components/portal/Tip";
import { PanelCard } from "@/components/portal/PanelCard";
import { TFP_TOOLTIP, TFP_WEIGHTS } from "@/lib/team/data";
import type { FitScore } from "@/lib/team/data";

/**
 * Both portals show the same score for the same trial, so the widget takes the numbers, not a
 * contract. A direct full-time or part-time hire has no trial and so no score — callers show the
 * match at hire instead.
 */
type Scored = { tfs: FitScore; phase: 3 | 4 };

/**
 * TB-058 Trial Fit Score. The three live components each get a bar, and the weight beside each
 * one comes from the contract's phase — On Trial excludes Evaluation entirely, Post Trial folds
 * it in at 25%. The tooltip says when the final score lands.
 */
export function TrialFitScore({ contract, final = false }: { contract: Scored; final?: boolean }) {
  const w = TFP_WEIGHTS[contract.phase];
  /** Once an evaluation is in, it is scored like the rest instead of "Added once the evaluation is in". */
  const evaluated = w.evaluation > 0 && contract.tfs.evaluation !== undefined;
  const rows = [
    { label: "Performance", value: contract.tfs.performance, weight: w.performance, color: "var(--color-primary)" },
    { label: "Profile", value: contract.tfs.profile, weight: w.profile, color: "#27ae60" },
    { label: "Work Style", value: contract.tfs.workStyle, weight: w.workStyle, color: "#f2994a" },
    ...(evaluated ? [{ label: "Evaluation", value: contract.tfs.evaluation ?? 0, weight: w.evaluation, color: "#9b51e0" }] : []),
  ];

  return (
    <PanelCard
      title="Trial Fit Score"
      /* TB-074: on a full-time contract this is the trial's final score and stops moving. */
      sub={final ? "Final score from the completed trial · read-only" : `${w.label} · Phase ${contract.phase}`}
      aside={
        <Tip label={TFP_TOOLTIP}>
          <span className="cursor-help rounded-full">
            <ScoreRing value={contract.tfs.overall} />
          </span>
        </Tip>
      }
    >
      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-1.5">
            <p className="text-[13px] leading-[1.2] text-ink">
              {r.label} <span className="text-ink-2">· {r.weight}%</span>
            </p>
            <Meter parts={[{ value: r.value, color: r.color, label: r.label }]} pill={`${r.value}%`} label={`${r.label}: ${r.value}%`} />
          </div>
        ))}
        {/* Evaluation only counts once the trial is over, so Phase 3 shows it greyed at 0%. */}
        {!evaluated && (
          <p className="flex items-baseline justify-between text-[13px] leading-[1.2] text-ink-2">
            <span>
              Evaluation <span>· {w.evaluation}%</span>
            </span>
            <span>{w.evaluation === 0 ? "Excluded during the trial" : final ? "Included in the final score" : "Added once the evaluation is in"}</span>
          </p>
        )}
      </div>
    </PanelCard>
  );
}

/**
 * Where the Trial Fit Score sits on a direct full-time or part-time hire, which never had a trial to
 * score: the match the application started on. `who` is how the reader refers to the talent.
 */
export function MatchAtHire({ match, who, className = "" }: { match: number; who: string; className?: string }) {
  return (
    <PanelCard
      title="Match at hire"
      className={className}
      sub={`${who} hired straight onto this role, with no trial, so there is no Trial Fit Score. This is the work-style and profile match the application started on.`}
      aside={<ScoreRing value={match} />}
    />
  );
}
