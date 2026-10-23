import type { ReactNode } from "react";
import { Button, Card, CardHeading, Field, InfoBanner, Select, Textarea } from "@/components/portal/ui";
import { ContractScore, Stars } from "@/components/portal/contract-parts";
import { SIDE_COLUMN, WITH_SIDE } from "@/components/portal/page-parts";
import { usd } from "@/lib/demo/disputes";
import { keyed } from "@/lib/portal/keys";
import { refOf } from "@/lib/work/model";
import { evaluationIntro, evaluationOpens, hireLabel } from "../_lib/copy";
import { SCORES, type EvaluationDraft as Draft } from "../_lib/forms";
import type { Tracker } from "../_lib/tracker";

const DM = { fontVariationSettings: '"opsz" 14' } as const;
const RECOMMENDATIONS = ["Select a recommendation", "Hire full-time", "Hire part-time", "End the engagement"];


/**
 * The Evaluation tab: the form (a trial's one, final evaluation, or a role's running reviews), what
 * sending it unlocks, every evaluation on file, and the score beside them.
 */
export function EvaluationTab({ t, draft, actions }: { t: Tracker; draft: Draft; actions: ReactNode }) {
  const { contract, name, first, isTrial, submitted, canEvaluate } = t;
  /** A trial's one evaluation is on file: the form shows it, read-only. */
  const sent = isTrial && submitted;
  /** While the trial runs, when its evaluation opens: said first, as why the form below is greyed out. Under the form, a phone had it a screen away from the heading. */
  const opens = isTrial && !submitted && !canEvaluate ? evaluationOpens(t) : null;
  return (
    <div className={WITH_SIDE}>
      <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-[20px] leading-[1.5] font-semibold text-ink" style={DM}>
            {sent ? `Your evaluation of ${name}` : `Evaluate ${name}`}
          </h2>
          <p className="text-[14px] leading-[1.4] text-ink-2">{evaluationIntro(t)}</p>
        </div>
        {opens && <InfoBanner>{opens}</InfoBanner>}
        <Card className="flex flex-col gap-4 p-5">
          {/* Dimmed while it can't be sent yet; the buttons stay legible. */}
          <div className={`flex flex-col gap-4 ${!canEvaluate && !sent ? "opacity-60" : ""}`}>
            <EvaluationForm t={t} draft={draft} />
          </div>
          {/* TB-067: every field is required (marked *); a disabled Send says what's still missing. A
              phone stacks the buttons full width, the main one on top, as a dialog's footer does, and
              keeps any note above them. */}
          <div className="flex flex-wrap justify-end gap-3 max-md:flex-col-reverse max-md:*:w-full max-md:[&_button]:w-full">{actions}</div>
        </Card>
        <EvaluationHistory t={t} />
      </div>
      {/* The Overview's side column and score card, so the two tabs read the same. */}
      <aside className={SIDE_COLUMN}>
        <ContractScore contract={contract} final={submitted || !isTrial} who={`${first} was`} viewer="team" />
      </aside>
    </div>
  );
}

/** Five scores, a recommendation and comments, all required; or, on a trial whose evaluation is in, what it was sent with. */
function EvaluationForm({ t, draft }: { t: Tracker; draft: Draft }) {
  const { first, isTrial, submitted, latest, canEvaluate } = t;
  const sent = isTrial && submitted;
  const locked = !canEvaluate || sent;
  /** A trial's evaluation shows the scores it was sent with; a new one starts with none picked. */
  const shownScores = sent && latest?.scores ? SCORES.map((label, i) => latest.scores?.find((s) => s.label === label)?.value ?? draft.scores[i]) : draft.scores;
  return (
    <>
      {SCORES.map((label, i) => (
        // On a phone the label sits over its five scores, which share the width as 44px targets.
        <div key={label} className="flex items-center justify-between max-sm:flex-col max-sm:items-stretch max-sm:gap-2">
          <p className="text-[14px] leading-[1.4] font-medium text-ink">
            {label}
            <span aria-hidden className="text-danger">
              {" *"}
            </span>
          </p>
          <div role="group" aria-label={label} className="flex gap-2 max-sm:grid max-sm:grid-cols-5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                disabled={locked}
                aria-pressed={n === shownScores[i]}
                onClick={() => draft.setScores((s) => s.map((v, k) => (k === i ? n : v)))}
                className={`flex h-9 w-11 items-center max-sm:h-11 max-sm:w-auto justify-center rounded-md text-[14px] leading-[1.4] font-medium ${n === shownScores[i] ? "bg-primary text-white outline -outline-offset-1 outline-primary" : "bg-surface-2 text-ink outline -outline-offset-1 outline-border"}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}
      <Field label="Recommendation" required className="pt-2">
        <Select
          aria-label="Recommendation"
          options={isTrial ? RECOMMENDATIONS : ["Select a recommendation", "Keep going as is", "Change the scope", "End the engagement"]}
          value={sent ? latest.recommendation : draft.recommendation || "Select a recommendation"}
          disabled={locked}
          onChange={(e) => draft.setRecommendation(e.target.value === "Select a recommendation" ? "" : e.target.value)}
        />
      </Field>
      <Field label={`Comments for ${first}`} required>
        <Textarea rows={3} required disabled={locked} value={sent ? latest.feedback : draft.feedback} onChange={(e) => draft.setFeedback(e.target.value)} placeholder="What went well, what to improve" />
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
      {/* A warning, before the buttons so they keep to one line: the score is final once this is sent. */}
      {canEvaluate && waiting.length > 0 && (
        <p className="w-full text-right text-[13px] leading-[1.4] text-pretty text-warn-ink max-md:order-last max-md:text-left">
          <span className="font-semibold">
            {refOf(waiting[0])} {waiting[0].title}
          </span>
          {waiting.length > 1 && ` and ${waiting.length - 1} more`} still {waiting.length === 1 ? "waits" : "wait"} on your review. Approve {waiting.length === 1 ? "it" : "them"} first: the Trial fit score is final once this is sent.
        </p>
      )}
      {ends.cancel ? (
        <Button size="lg" variant="danger" onClick={onEnd}>
          Cancel trial
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
function EvaluationHistory({ t }: { t: Tracker }) {
  const { history, isTrial, ended, first, trialFirst } = t;
  return (
    <div className="flex flex-col gap-3">
      <CardHeading>Evaluation history</CardHeading>
      {history.length === 0 ? (
        <Card className="p-5 text-[13px] leading-[1.4] text-ink-2">
          {isTrial ? "No evaluation submitted yet. Once the trial ends and you send yours, it is listed here and cannot be edited." : ended ? "No evaluations were sent on this contract." : `No evaluation submitted yet. Each one you send ${first} is listed here and cannot be edited.`}
        </Card>
      ) : (
        keyed(history, (h) => `${h.date}-${h.stars}`).map(({ item: h, key }) => (
          <Card key={key} className="flex flex-col gap-2 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px] leading-[1.4] text-ink-2">
                {h === trialFirst || isTrial ? "Trial evaluation · " : ""}Submitted {h.date}
              </span>
              <Stars value={h.stars} size="text-[14px]" />
            </div>
            <p className="text-[13.5px] leading-[1.5] text-ink">{h.feedback}</p>
            <p className="text-[12.5px] leading-[1.4] text-ink-2">
              Recommendation: {h.recommendation}
              {h.tfp !== undefined && (isTrial || h === trialFirst) && ` · Final Trial fit score: ${h.tfp}%`}
            </p>
          </Card>
        ))
      )}
    </div>
  );
}
