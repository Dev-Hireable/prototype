import type { ReactNode } from "react";
import { Button, Card, Field, Select, Textarea } from "@/components/independent/ui";
import { ContractScore, Stars } from "@/components/portal/ContractParts";
import { SIDE_COLUMN, WITH_SIDE } from "@/components/portal/PageParts";
import { Tip } from "@/components/portal/Tip";
import { CardHeading } from "@/components/team/ui";
import { usd } from "@/lib/demo/disputes";
import { keyed } from "@/lib/portal/keys";
import { evaluationIntro, hireLabel } from "../_lib/copy";
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
  return (
    <div className={WITH_SIDE}>
      <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-[20px] leading-[1.5] font-semibold text-ink" style={DM}>
            {sent ? `Your evaluation of ${name}` : `Evaluate ${name}`}
          </h2>
          <p className="text-[14px] leading-[1.4] text-ink-2">{evaluationIntro(t)}</p>
        </div>
        <Card className={`flex flex-col gap-4 p-5 ${!canEvaluate && !sent ? "opacity-60" : ""}`}>
          <EvaluationForm t={t} draft={draft} />
          {/* TB-067: every field is required — a rating alone isn't an assessment. */}
          <div className="flex flex-wrap justify-end gap-3">{actions}</div>
          {canEvaluate && !sent && !draft.ready && <p className="text-right text-[12.5px] leading-[1.4] text-ink-2">Add a recommendation and written feedback to send.</p>}
        </Card>
        <EvaluationHistory t={t} />
      </div>
      {/* The Overview's side column and score card, so the two tabs read the same. */}
      <aside className={SIDE_COLUMN}>
        <ContractScore contract={contract} final={submitted || !isTrial} who={`${first} was`} />
      </aside>
    </div>
  );
}

/** Five scores, a recommendation and comments — or, on a trial whose evaluation is in, what it was sent with. */
function EvaluationForm({ t, draft }: { t: Tracker; draft: Draft }) {
  const { isTrial, submitted, latest, canEvaluate } = t;
  const sent = isTrial && submitted;
  const locked = !canEvaluate || sent;
  /** A trial's evaluation shows the scores it was sent with, not this page's defaults. */
  const shownScores = sent && latest?.scores ? SCORES.map((label, i) => latest.scores?.find((s) => s.label === label)?.value ?? draft.scores[i]) : draft.scores;
  return (
    <>
      {SCORES.map((label, i) => (
        <div key={label} className="flex items-center justify-between">
          <p className="text-[14px] leading-[1.4] font-medium text-ink">{label}</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                disabled={locked}
                onClick={() => draft.setScores((s) => s.map((v, k) => (k === i ? n : v)))}
                className={`flex h-9 w-11 items-center justify-center rounded-md text-[14px] leading-[1.4] font-medium ${n === shownScores[i] ? "bg-primary text-white outline -outline-offset-1 outline-primary" : "bg-surface-2 text-ink outline -outline-offset-1 outline-border"}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-col gap-2 pt-2">
        <p className="text-[14px] leading-[1.4] font-medium text-ink">Recommendation</p>
        <Select
          aria-label="Recommendation"
          options={isTrial ? RECOMMENDATIONS : ["Select a recommendation", "Keep going as is", "Change the scope", "End the engagement"]}
          value={sent ? latest.recommendation : draft.recommendation || "Select a recommendation"}
          disabled={locked}
          onChange={(e) => draft.setRecommendation(e.target.value === "Select a recommendation" ? "" : e.target.value)}
        />
      </div>
      <Field label="Comments for the independent">
        <Textarea rows={3} disabled={locked} value={sent ? latest.feedback : draft.feedback} onChange={(e) => draft.setFeedback(e.target.value)} placeholder="What went well, what to improve" />
      </Field>
    </>
  );
}

type ActionProps = { t: Tracker; ready: boolean; onEnd: () => void; onHire: () => void; onSend: () => void };

/** The buttons under the form: send it — and, on a trial, what sending it unlocks: ending the contract or hiring. */
export function EvaluationActions(props: ActionProps) {
  const { isTrial, submitted } = props.t;
  if (isTrial && submitted) return <TrialDecided {...props} />;
  if (isTrial) return <TrialPending {...props} />;
  return <RoleReview {...props} />;
}

/** TB-071 / TB-072 unlock only once the evaluation is on file — and ending waits for any dispute, since the escrow it would release is on hold. */
function TrialDecided({ t, onEnd, onHire }: ActionProps) {
  const { view, ends, endBlocked, ended, conversionLocked } = t;
  return (
    <>
      {(view.onDeal ? !!ends.close?.blocked : endBlocked) && !ended && (
        <p className="w-full text-right text-[13px] leading-[1.4] text-ink-2">A dispute on this contract is holding {usd(view.escrow?.onHold ?? 0)} in escrow. You can end the contract once Hireable support has ruled on it.</p>
      )}
      <Button size="lg" variant="danger" disabled={ended || (view.onDeal ? !ends.close || !!ends.close.blocked : endBlocked)} onClick={onEnd}>
        {ended ? "Contract ended" : "End contract"}
      </Button>
      <Button size="lg" variant="primary" disabled={conversionLocked || ended} title={ended ? "The contract has ended" : undefined} onClick={onHire}>
        {hireLabel(t)}
      </Button>
    </>
  );
}

/**
 * TB-071 / TB-072 want these visible but greyed out before the evaluation, so it's clear what
 * submitting one unlocks rather than hiding it.
 */
function TrialPending({ t, ready, onEnd, onSend }: ActionProps) {
  const { first, ends, canEvaluate, waiting } = t;
  return (
    <>
      {ends.cancel ? (
        <Button size="lg" variant="danger" onClick={onEnd}>
          Cancel trial
        </Button>
      ) : (
        <Tip label="Send your evaluation first" wrap>
          <Button size="lg" variant="danger" disabled>
            End contract
          </Button>
        </Tip>
      )}
      <Button size="lg" disabled title="Send your evaluation first">
        Hire {first}
      </Button>
      {canEvaluate && waiting.length > 0 && (
        <p className="w-full text-right text-[13px] leading-[1.4] text-[#8e6f12]">
          {waiting.length === 1 ? "An item is" : `${waiting.length} items are`} still waiting on your review. Approve {waiting.length === 1 ? "it" : "them"} first: the Trial Fit Score is final once this is sent.
        </p>
      )}
      <Button size="lg" variant="primary" disabled={!canEvaluate || !ready} onClick={onSend}>
        Send evaluation
      </Button>
    </>
  );
}

/** TB-117 — a full-time or part-time role: a review whenever there's feedback, and ending it. */
function RoleReview({ t, ready, onEnd, onSend }: ActionProps) {
  const { view, ends, endBlocked, ended, canEvaluate } = t;
  return (
    <>
      {!ended && (
        <Button size="lg" variant="danger" onClick={onEnd} disabled={view.onDeal ? !ends.any : endBlocked}>
          {ends.cancel ? "Cancel contract" : view.notice ? "End today" : "End contract"}
        </Button>
      )}
      <Button size="lg" variant="primary" disabled={!canEvaluate || !ready} onClick={onSend}>
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
          {isTrial ? "No evaluation submitted yet. Once the trial ends and you send yours, it is listed here and cannot be edited." : ended ? "No evaluations were sent on this contract." : `No evaluation submitted yet. Send one whenever you have feedback for ${first} — each is listed here and cannot be edited.`}
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
              {h.tfp !== undefined && (isTrial || h === trialFirst) && ` · Final Trial Fit Score: ${h.tfp}%`}
            </p>
          </Card>
        ))
      )}
    </div>
  );
}
