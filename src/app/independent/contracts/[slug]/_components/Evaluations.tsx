import type { ReactNode } from "react";
import { Card, MessageButton, StatusDot } from "@/components/independent/ui";
import { Stars } from "@/components/portal/ContractParts";
import { SIDE_COLUMN, WITH_SIDE } from "@/components/portal/PageParts";
import { TrialFitScore } from "@/components/team/TrialWidgets";
import type { ContractView } from "@/lib/contract/view";
import type { DealEvaluation } from "@/lib/demo/deal";
import type { Contract } from "@/lib/independent/data";
import { keyed } from "@/lib/portal/keys";

const DM = { fontVariationSettings: '"opsz" 14' } as const;

/** The Evaluation tab: a trial's one evaluation, or the run of them a full-time or part-time role collects. */
export function EvaluationTab({ contract, view, thread, score, ended }: { contract: Contract; view: ContractView; thread: string; score: ReactNode; ended: boolean }) {
  const { evaluations } = contract;
  if (contract.type === "trial") return <Evaluation evaluation={view.trialEval ?? evaluations[0]} company={contract.company} contract={contract} thread={thread} due={view.due} />;
  const fromTrial = contract.origin === "trial";
  return <OngoingEvaluations entries={fromTrial ? evaluations.slice(0, -1) : evaluations} trial={fromTrial ? evaluations[evaluations.length - 1] : undefined} contract={contract} score={score} ended={ended} />;
}

/**
 * IN-047 — a full-time or part-time engagement collects evaluations as it runs, so the tab is the
 * whole run of them, newest first, each with its date, stars and written feedback. Read-only.
 * IN-048 — beside them, the trial score that led to it (frozen), or the match on a direct hire.
 */
function OngoingEvaluations({ entries, trial, contract, score, ended }: { entries: DealEvaluation[]; trial?: DealEvaluation; contract: Contract; score: ReactNode; ended: boolean }) {
  return (
    <div className={WITH_SIDE}>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-[20px] leading-[1.5] font-semibold text-ink" style={DM}>
            Evaluations from {contract.company}
          </h2>
          <p className="text-[14px] leading-[1.4] text-ink-2">
            {entries.length === 0 ? (ended ? "None were sent before the contract ended." : trial ? `${contract.manager} hasn't reviewed the ${contract.type.replace("-", " ")} role yet. Your trial's evaluation is below.` : `${contract.manager} has not submitted one yet.`) : `${entries.length} submitted so far. Each is read-only once sent.`}
          </p>
        </div>
        {entries.length === 0 ? (
          <Card className="p-10 text-center text-[13px] leading-[1.4] text-ink-2">{ended ? "The contract has ended." : `Feedback appears here as ${contract.managerFirst} sends it.`}</Card>
        ) : (
          keyed(entries, (e) => `${e.date}-${e.stars}`).map(({ item: e, key }) => (
            <Card key={key} className="flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] leading-[1.4] text-ink-2">Submitted {e.date}</span>
                <Stars value={e.stars} size="text-[16px]" />
              </div>
              <p className="text-[14px] leading-[1.5] text-ink">{e.feedback}</p>
              <p className="text-[12.5px] leading-[1.4] text-ink-2">Recommendation: {e.recommendation}</p>
            </Card>
          ))
        )}
        {trial && (
          <div className="flex flex-col gap-3">
            <h3 className="text-[15px] leading-[1.4] font-semibold text-ink">Your trial evaluation</h3>
            <Card className="flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] leading-[1.4] text-ink-2">Submitted {trial.date}</span>
                <Stars value={trial.stars} size="text-[16px]" />
              </div>
              {(trial.scores ?? []).length > 0 && (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px] leading-[1.4]">
                  {(trial.scores ?? []).map((s) => (
                    <div key={s.label} className="flex justify-between gap-3">
                      <dt className="text-ink-2">{s.label}</dt>
                      <dd className="font-medium text-ink tabular-nums">{s.value} / 5</dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="text-[14px] leading-[1.5] text-ink">{trial.feedback}</p>
              <p className="text-[12.5px] leading-[1.4] text-ink-2">Recommendation: {trial.recommendation}</p>
            </Card>
          </div>
        )}
      </div>
      <aside className={SIDE_COLUMN}>
        {score}
        {contract.tfs && <p className="text-[12.5px] leading-[1.4] text-ink-2">The final score from your trial — the one this contract came out of. It is read-only and does not move again.</p>}
      </aside>
    </div>
  );
}

/** The evaluation the Team Builder actually sent. */
function Evaluation({ evaluation, company, contract, thread, due }: { evaluation?: DealEvaluation; company: string; contract: Contract; thread: string; due?: string }) {
  if (!evaluation) return <NoEvaluationYet company={company} contract={contract} due={due} />;
  const scores = evaluation.scores ?? [];
  const average = scores.length ? scores.reduce((n, s) => n + s.value, 0) / scores.length : evaluation.stars;
  return (
    <div className={WITH_SIDE}>
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-[20px] leading-[1.5] font-semibold text-ink" style={DM}>
            Your evaluation from {company}
          </h2>
          <p className="text-[14px] leading-[1.4] text-ink-2">Submitted {evaluation.date}. Scores are final and feed your trial fit score.</p>
        </div>
        {/* IN-034 — the overall star rating the Team Builder submitted, above the per-criterion scores. */}
        <Card className="flex items-center gap-4 p-5">
          <Stars value={evaluation.stars} size="text-[24px]" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-[16px] leading-[1.4] font-semibold text-ink">{evaluation.stars}.0 out of 5 overall</p>
            <p className="text-[13px] leading-[1.4] text-ink-2">Average score {average.toFixed(1)} of 5 · submitted once, and read-only for both of you.</p>
          </div>
        </Card>
        <ScoresCard evaluation={evaluation} company={company} thread={thread} />
      </div>
      {/* IN-034 — the finalised score, from the contract. Same widget the Team Builder reads. */}
      <aside className={SIDE_COLUMN}>
        {contract.tfs && <TrialFitScore contract={{ tfs: contract.tfs, phase: contract.phase }} final />}
        <p className="text-[12.5px] leading-[1.4] text-ink-2">Locked at phase 4 on {evaluation.date}, after the employer evaluation. It does not move again.</p>
      </aside>
    </div>
  );
}

/** Before the evaluation is in: when it opens, or — once the trial is over — when it's due and what it settles. */
function NoEvaluationYet({ company, contract, due }: { company: string; contract: Contract; due?: string }) {
  return (
    <Card className="p-10 text-center">
      <p className="text-[16px] leading-[1.5] font-semibold text-ink">{contract.over ? "Waiting on the evaluation" : `Evaluation opens when the trial ends on ${contract.ends}`}</p>
      <p className="mt-2 text-[13px] leading-[1.4] text-ink-2">
        {contract.over && due ? `${company} has until ${due} to send it. It makes your Trial Fit Score final, and the escrow is paid to you with it.` : `${company} submits scores after the trial ends — or sooner, once every trial task is done. They feed your trial fit score, and you are notified when they are in.`}
      </p>
    </Card>
  );
}

/** Each criterion's score on the 1–5 scale, the recommendation, the employer's comments, and the way to reply. */
function ScoresCard({ evaluation, company, thread }: { evaluation: DealEvaluation; company: string; thread: string }) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      {(evaluation.scores ?? []).map((s) => (
        <div key={s.label} className="flex items-center justify-between">
          <p className="text-[14px] leading-[1.4] font-medium text-ink">{s.label}</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={`flex h-9 w-11 items-center justify-center rounded-md text-[14px] leading-[1.4] font-medium ${
                  n === s.value ? "bg-primary text-white outline -outline-offset-1 outline-primary" : "bg-surface-2 text-ink outline -outline-offset-1 outline-border"
                }`}
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-col gap-2 pt-2">
        <p className="text-[14px] leading-[1.4] font-medium text-ink">Recommendation</p>
        <p className="flex items-center gap-2 text-[13px] leading-[1.4] text-ink-2">
          <StatusDot tone={evaluation.recommendation === "End the engagement" ? "neutral" : "ok"}>{evaluation.recommendation}</StatusDot>
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-[14px] leading-[1.4] font-medium text-ink">Comments from your employer</p>
        <p className="rounded-md bg-[#fafafa] p-3 text-[14px] leading-[1.4] text-ink outline -outline-offset-1 outline-border">{evaluation.feedback}</p>
      </div>
      <div className="flex justify-end">
        <MessageButton size="lg" href={thread}>
          Message {company}
        </MessageButton>
      </div>
    </Card>
  );
}
