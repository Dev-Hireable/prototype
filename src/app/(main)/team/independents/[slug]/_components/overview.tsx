import type { ReactNode } from "react";
import { Button } from "@/components/portal/ui";
import { Callout } from "@/components/portal/callout";
import { ContractActivity, ContractScore, SummaryRows } from "@/components/portal/contract-parts";
import { PanelCard } from "@/components/portal/panel-card";
import { Tip } from "@/components/portal/tip";
import { dayLabel } from "@/lib/portal/dates";
import { hoursLabel } from "@/lib/contract/job-types";
import { refOf } from "@/lib/work/model";
import { decisionNote, evaluationDueNote, evaluationsNote, summaryRows } from "../_lib/copy";
import type { Tracker } from "../_lib/tracker";

type CalloutActions = { onReview: (id: string) => void; onEvaluate: () => void; onEnd: () => void; onHire: () => void; onWithdrawOffer: () => void; onWithdrawNotice: () => void };

/**
 * The Overview's banners: what's waiting on the Team Builder — a review, the evaluation, the decision
 * after it, the offer that's out — and what's coming: a start date, or notice.
 */
export function OverviewCallouts({ t, ...on }: { t: Tracker } & CalloutActions) {
  const { view, first, typeLabel, ended, trialOver, submitted, offerType } = t;
  const { life, phase, conversion } = view;
  return (
    <>
      {!ended && <ReviewWaiting t={t} onReview={on.onReview} />}
      {(life ? phase === "evaluation" : trialOver && !submitted) && (
        <Callout
          tone={life?.trial?.evaluationOverdue ? "warn" : "info"}
          action={
            <Button size="sm" variant="primary" onClick={on.onEvaluate}>
              Send evaluation
            </Button>
          }
        >
          {evaluationDueNote(t)}
        </Callout>
      )}
      {phase === "decision" && !ended && <Decision t={t} onEnd={on.onEnd} onHire={on.onHire} />}
      {phase === "offer" && conversion && (
        <Callout
          action={
            <Button size="sm" onClick={on.onWithdrawOffer}>
              Withdraw offer
            </Button>
          }
        >
          Your {offerType} offer — {conversion.salary} /month{conversion.hours ? `, ${hoursLabel(conversion.hours)}` : ""}, from {dayLabel(conversion.start)} — is with {first}. The work reopens when they accept.
        </Callout>
      )}
      {phase === "starts" && life?.converted && (
        <Callout>
          {first} starts {typeLabel.toLowerCase()} on {dayLabel(life.since)}. Plan the work now — {first} can start on it then.
        </Callout>
      )}
      {/* TB-071 / IN-091 — notice is in: the role runs, paid, to its last day, then ends on its own. */}
      {phase === "ongoing" && <NoticeGiven t={t} onWithdraw={on.onWithdrawNotice} />}
    </>
  );
}

/** What the talent sent for review and is waiting on the Team Builder: the first by name, and how many more. */
function ReviewWaiting({ t, onReview }: { t: Tracker; onReview: (id: string) => void }) {
  const { waiting, first, view } = t;
  if (waiting.length === 0) return null;
  return (
    <Callout
      tone="warn"
      action={
        <Button size="sm" variant="primary" onClick={() => onReview(waiting[0].id)}>
          Review
        </Button>
      }
    >
      {/* Says which item, not "an item": the button opens that one. The how-to lives in the review sheet. */}
      {first} sent{" "}
      <span className="font-semibold">
        {refOf(waiting[0])} {waiting[0].title}
      </span>
      {waiting.length > 1 && ` and ${waiting.length - 1} more`} for review.
      {view.closedTrial && ` Approve ${waiting.length === 1 ? "it" : "them"} before your evaluation — the trial is over, so nothing can be sent back.`}
    </Callout>
  );
}

/** The trial is evaluated: hire them, or end the contract — unless a dispute is holding its escrow. */
function Decision({ t, onEnd, onHire }: { t: Tracker; onEnd: () => void; onHire: () => void }) {
  const blocked = t.ends.close?.blocked;
  return (
    <Callout
      action={
        <span className="flex gap-2">
          <Tip label={blocked} wrap>
            <Button size="sm" variant="danger" disabled={!!blocked} onClick={onEnd}>
              End contract
            </Button>
          </Tip>
          <Button size="sm" variant="primary" onClick={onHire}>
            {t.view.conversion ? "Send a new offer" : `Hire ${t.first}`}
          </Button>
        </span>
      }
    >
      {decisionNote(t)}
    </Callout>
  );
}

/** Notice either side gave on a running role; the Team Builder can take back their own. */
function NoticeGiven({ t, onWithdraw }: { t: Tracker; onWithdraw: () => void }) {
  const { view, first, typeLabel } = t;
  const { notice } = view;
  if (!notice) return null;
  return (
    <Callout
      tone="warn"
      action={
        notice.by === "team" ? (
          <Button size="sm" onClick={onWithdraw}>
            Withdraw notice
          </Button>
        ) : undefined
      }
    >
      {notice.by === "team" ? `You gave notice on ${dayLabel(notice.given)}` : `${first} gave notice on ${dayLabel(notice.given)}`}: the {typeLabel.toLowerCase()} role ends after {dayLabel(notice.lastDay)}. It carries on, and is paid, until then.
    </Callout>
  );
}

/** The Overview's sidebar: the score, the activity, the evaluations and the contract's money at a glance. */
export function OverviewAside({ t, onEvaluate, disputeButton }: { t: Tracker; onEvaluate: () => void; disputeButton: ReactNode }) {
  const { contract, first, isTrial, ended, submitted, canEvaluate } = t;
  /** An evaluation can be sent from here: a role's review, or a trial's one evaluation not yet sent. */
  const open = canEvaluate && !(isTrial && submitted);
  return (
    <>
      {/* TB-058 live during a trial; TB-074 keeps it visible once it converts, as the final
          score from the trial. A direct hire had no trial, so it shows the match instead. */}
      <ContractScore contract={contract} final={!isTrial || submitted} who={`${first} was`} viewer="team" />
      <ContractActivity contract={contract} ended={ended} />
      <PanelCard title={isTrial ? "Trial evaluation" : "Evaluations"}>
        <p className="max-w-[320px] text-[13px] leading-[1.4] text-ink-2">{evaluationsNote(t)}</p>
        <Button size="lg" variant={open ? "primary" : "secondary"} onClick={onEvaluate}>
          {open ? "Send evaluation" : "View evaluation"}
        </Button>
      </PanelCard>
      <PanelCard title="Contract & payment">
        <SummaryRows rows={summaryRows(t)} />
        {disputeButton}
      </PanelCard>
    </>
  );
}
