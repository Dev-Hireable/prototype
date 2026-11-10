import type { ReactNode } from "react";
import { Button, Field, InfoBanner, Select, Textarea } from "@/components/portal/ui";
import { PanelCard } from "@/components/portal/panel-card";
import { Stars } from "@/components/portal/stars";
import { ScoreScale } from "@/components/portal/score-scale";
import { usd } from "@/lib/demo/disputes";
import { keyed } from "@/lib/portal/keys";
import { refOf } from "@/lib/work/model";
import { evaluationIntro, evaluationOpens, hireLabel } from "../_lib/copy";
import { SCORES, type EvaluationDraft as Draft } from "../_lib/forms";
import type { Tracker } from "../_lib/tracker";

const RECOMMENDATIONS = ["Select a recommendation", "Hire full-time", "Hire part-time", "End the engagement"];


/**
 * The Evaluation tab: the form (a trial's one, final evaluation, or a role's running reviews), what
 * sending it unlocks, and every evaluation on file.
 */
export function EvaluationTab({ t, draft, actions }: { t: Tracker; draft: Draft; actions: ReactNode }) {
  const { name, isTrial, submitted, canEvaluate } = t;
  const sent = isTrial && submitted;
  /** While the trial runs, when its evaluation opens: said first, as why the form below is greyed out. Under the form, a phone had it a screen away from the heading. */
  const opens = isTrial && !submitted && !canEvaluate ? evaluationOpens(t) : null;
  const footer = <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-4 max-md:flex-col-reverse max-md:*:w-full max-md:[&_button]:w-full">{actions}</div>;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      {opens && <InfoBanner>{opens}</InfoBanner>}
      {!sent && (
        <PanelCard title={`Evaluate ${name}`} sub={evaluationIntro(t)}>
          <div className={`flex flex-col gap-4 ${canEvaluate ? "" : "opacity-60"}`}>
            <EvaluationForm t={t} draft={draft} />
          </div>
          {footer}
        </PanelCard>
      )}
      <EvaluationHistory t={t} title={sent ? `Your evaluation of ${name}` : "Evaluation history"} footer={sent ? footer : undefined} />
    </div>
  );
}

/** Five scores, a recommendation and comments, all required. */
function EvaluationForm({ t, draft }: { t: Tracker; draft: Draft }) {
  const { first, isTrial, canEvaluate } = t;
  return (
    <>
      <p className="text-[13px] leading-[1.4] text-ink-2">Rate each criterion from 1 (Needs improvement) to 5 (Excellent).</p>
      <div className="divide-y divide-line">
        {SCORES.map((label, i) => (
          <div key={label} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 max-sm:flex-col max-sm:items-stretch max-sm:gap-2">
            <p className="text-[14px] leading-[1.4] font-medium text-ink">
              {label}
              <span aria-hidden className="text-danger">
                {" *"}
              </span>
            </p>
            <ScoreScale label={label} value={draft.scores[i]} disabled={!canEvaluate} onPick={(n) => draft.setScores((s) => s.map((v, k) => (k === i ? n : v)))} />
          </div>
        ))}
      </div>
      <Field label="Recommendation" required className="border-t border-line pt-4">
        <Select
          aria-label="Recommendation"
          options={isTrial ? RECOMMENDATIONS : ["Select a recommendation", "Keep going as is", "Change the scope", "End the engagement"]}
          value={draft.recommendation || "Select a recommendation"}
          disabled={!canEvaluate}
          onChange={(e) => draft.setRecommendation(e.target.value === "Select a recommendation" ? "" : e.target.value)}
        />
      </Field>
      <Field label={`Comments for ${first}`} required>
        <Textarea rows={3} required disabled={!canEvaluate} value={draft.feedback} onChange={(e) => draft.setFeedback(e.target.value)} placeholder="What went well, what to improve" />
      </Field>
    </>
  );
}

/** `missing`: what the evaluation still needs before it can be sent, for its disabled Send button. */
type ActionProps = { t: Tracker; ready: boolean; missing?: string; onEnd: () => void; onHire: () => void; onSend: () => void };

/** The buttons under the form: send it — and, on a trial, what sending it unlocks: ending the contract or hiring. */
export function EvaluationActions(props: ActionProps) {
  const { isTrial, submitted } = props.t;
  if (isTrial && submitted) return <TrialDecided {...props} />;
  if (isTrial) return <TrialPending {...props} />;
  return <RoleReview {...props} />;
}

/**
 * TB-071 / TB-072 unlock only once the evaluation is on file, and ending waits for any dispute, since
 * the escrow it would release is on hold. Hire leads; End contract sits beside it as a quiet button,
 * and its confirm is the red one.
 */
function TrialDecided({ t, onEnd, onHire }: ActionProps) {
  const { view, ends, endBlocked, ended, conversionLocked } = t;
  return (
    <>
      {(view.onDeal ? !!ends.close?.blocked : endBlocked) && !ended && (
        <p className="w-full text-right text-[13px] leading-[1.4] text-ink-2 max-md:order-last max-md:text-left">A dispute on this contract is holding {usd(view.escrow?.onHold ?? 0)} in escrow. You can end the contract once Hireable support has ruled on it.</p>
      )}
      <Button size="lg" disabled={ended || (view.onDeal ? !ends.close || !!ends.close.blocked : endBlocked)} onClick={onEnd}>
        {ended ? "Contract ended" : "End contract"}
      </Button>
      <Button size="lg" variant="primary" disabled={conversionLocked || ended} title={ended ? "The contract has ended" : undefined} onClick={onHire}>
        {hireLabel(t)}
      </Button>
    </>
  );
}

/**
 * TB-067 / TB-071 / TB-072 want these visible but greyed out before the evaluation, so it's clear
 * what submitting one unlocks rather than hiding it; while the trial runs, the banner over the form
 * says the day it opens, and Send says it again on hover.
 */
function TrialPending({ t, ready, missing, onEnd, onSend }: ActionProps) {
  const { first, ends, canEvaluate, waiting } = t;
  const opens = canEvaluate ? undefined : evaluationOpens(t);
  return (
    <>
      {/* A warning before the buttons so they keep to one line. */}
      {canEvaluate && waiting.length > 0 && (
        <p className="w-full text-right text-[13px] leading-[1.4] text-pretty text-warn-ink max-md:order-last max-md:text-left">
          <span className="font-semibold">
            {refOf(waiting[0])} {waiting[0].title}
          </span>
          {waiting.length > 1 && ` and ${waiting.length - 1} more`} still {waiting.length === 1 ? "waits" : "wait"} on your review. Approve {waiting.length === 1 ? "it" : "them"} before sending your evaluation.
        </p>
      )}
      {ends.cancel ? (
        <Button size="lg" variant="danger" onClick={onEnd}>
          Cancel contract
        </Button>
      ) : (
        <Button size="lg" disabled title="Send your evaluation first">
          End contract
        </Button>
      )}
      <Button size="lg" disabled title="Send your evaluation first">
        Hire {first}
      </Button>
      <Button size="lg" variant="primary" disabled={!canEvaluate || !ready} title={opens ?? missing} onClick={onSend}>
        Send evaluation
      </Button>
    </>
  );
}

/** TB-117 — a full-time or part-time role: a review whenever there's feedback, and ending it. */
function RoleReview({ t, ready, missing, onEnd, onSend }: ActionProps) {
  const { view, ends, endBlocked, ended, canEvaluate } = t;
  return (
    <>
      {!ended && (
        <Button size="lg" variant="danger" onClick={onEnd} disabled={view.onDeal ? !ends.any : endBlocked}>
          {ends.cancel ? "Cancel contract" : view.notice ? "End today" : "End contract"}
        </Button>
      )}
      <Button size="lg" variant="primary" disabled={!canEvaluate || !ready} title={canEvaluate ? missing : undefined} onClick={onSend}>
        Send evaluation
      </Button>
    </>
  );
}

/** TB-068 / TB-081 — every evaluation on file, newest first, read-only after sending. */
function EvaluationHistory({ t, title, footer }: { t: Tracker; title: string; footer?: ReactNode }) {
  const { history, isTrial, ended, first, trialFirst } = t;
  return (
    <PanelCard title={title}>
      {history.length === 0 ? (
        <p className="text-[13px] leading-[1.4] text-ink-2">
          {isTrial ? "No evaluation submitted yet. Once the trial ends and you send yours, it is listed here and cannot be edited." : ended ? "No evaluations were sent on this contract." : `No evaluation submitted yet. Each one you send ${first} is listed here and cannot be edited.`}
        </p>
      ) : (
        <div className="divide-y divide-line">
          {keyed(history, (h) => `${h.date}-${h.stars}`).map(({ item: h, key }) => (
            <article key={key} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-ink">{h === trialFirst || isTrial ? "Trial evaluation" : "Evaluation"}</h3>
                  <p className="text-xs text-ink-2">Submitted {h.date}</p>
                </div>
                <Stars value={h.stars} />
              </div>
              {!!h.scores?.length && (
                <dl className="grid gap-x-6 gap-y-2 rounded-lg bg-surface-alt p-3 text-sm sm:grid-cols-2">
                  {h.scores.map((s) => (
                    <div key={s.label} className="flex justify-between gap-2">
                      <dt className="text-ink-2">{s.label}</dt>
                      <dd><ScoreScale label={s.label} value={s.value} /></dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="text-sm leading-[1.5] break-words whitespace-pre-wrap text-ink">{h.feedback}</p>
              <p className="text-[13px] text-ink-2">Recommendation <span className="ml-2 font-semibold text-ink">{h.recommendation}</span></p>
            </article>
          ))}
        </div>
      )}
      {footer}
    </PanelCard>
  );
}
