import { Button } from "@/components/portal/ui";
import { Callout } from "@/components/portal/callout";
import { cancelledLine, type ContractView } from "@/lib/contract/view";
import { PAIR } from "@/lib/demo/live";
import { dayLabel } from "@/lib/portal/dates";
import { usd } from "@/lib/demo/disputes";
import { hoursLabel, JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import type { Contract } from "@/lib/independent/data";
import { isArchived, refOf } from "@/lib/work/model";
import { decisionNote } from "../_lib/copy";

/** IN-084 — the full-time or part-time offer after the trial, one click from the contract it continues: Review offer opens it over the page. */
export function OfferCallout({ contract, conversion, onReview }: { contract: Contract; conversion: ContractView["conversion"]; onReview: () => void }) {
  if (conversion?.status !== "sent") return null;
  return (
    <Callout
      action={
        <Button size="sm" variant="primary" onClick={onReview}>
          Review offer
        </Button>
      }
    >
      {contract.company} sent you a {JOB_TYPE_LABEL[conversion.type].toLowerCase()} offer: {conversion.salary} /month{conversion.hours ? `, ${hoursLabel(conversion.hours)}` : ""}. Review and sign it, or decline.
    </Callout>
  );
}

/**
 * The Overview's banners: what's waiting on the talent or coming up — an offer, the evaluation, a
 * start date, notice, or changes asked for.
 */
export function OverviewCallouts({ contract, view, ended, onReadEvaluation, onReviewOffer, onOpenTask }: { contract: Contract; view: ContractView; ended: boolean; onReadEvaluation: () => void; onReviewOffer: () => void; onOpenTask: (id: string) => void }) {
  const { phase, life, notice, closedTrial } = view;
  const typeLabel = JOB_TYPE_LABEL[contract.type];
  return (
    <>
      <OfferCallout contract={contract} conversion={view.conversion} onReview={onReviewOffer} />
      {phase === "evaluation" && <EvaluationDue contract={contract} view={view} />}
      {phase === "decision" && (
        <Callout
          action={
            <Button size="sm" onClick={onReadEvaluation}>
              Read it
            </Button>
          }
        >
          {decisionNote(contract, view)}
        </Callout>
      )}
      {phase === "starts" && life && (
        <Callout>
          Your {life.converted ? `${typeLabel.toLowerCase()} role` : "trial"} starts on {dayLabel(life.since)}. The work opens then.
        </Callout>
      )}
      {phase === "ongoing" && notice && (
        <Callout tone="warn">
          {notice.by === "independent" ? `You gave notice on ${dayLabel(notice.given)}` : `${contract.company} gave notice on ${dayLabel(notice.given)}`}: the {typeLabel.toLowerCase()} role ends after {dayLabel(notice.lastDay)}. It carries on, and you're paid, until then.
        </Callout>
      )}
      {/* Called off before its first day: by whom, and why. */}
      {view.cancelled && <Callout>{cancelledLine(view, "independent", { team: contract.company, independent: PAIR.independent.name })}</Callout>}
      {!closedTrial && !ended && <ChangesAsked contract={contract} onOpen={onOpenTask} />}
    </>
  );
}

/** The trial is over and with the Team Builder for its evaluation — and, with it, the escrow. */
function EvaluationDue({ contract, view }: { contract: Contract; view: ContractView }) {
  const { life, due, releasable } = view;
  return (
    <Callout>
      Your trial {life?.trial?.closedEarly ? "closed early, every trial task approved" : `ended on ${contract.ends}`}. {contract.managerFirst} is evaluating it{due ? `, due ${due}` : ""}.
      {releasable > 0 && ` You get paid the ${usd(releasable)} in escrow when ${contract.managerFirst} submits the evaluation${due ? `, or after ${due} if it hasn't come by then` : ""}.`}
    </Callout>
  );
}

/** Items sent back with a note, waiting on the talent to change and resubmit; the button opens the first. */
function ChangesAsked({ contract, onOpen }: { contract: Contract; onOpen: (id: string) => void }) {
  const changed = contract.tasks.filter((t) => !isArchived(t) && t.assignee === "independent" && t.changes && (t.status === "todo" || t.status === "doing"));
  if (changed.length === 0) return null;
  return (
    <Callout
      tone="warn"
      action={
        <Button size="sm" variant="primary" onClick={() => onOpen(changed[0].id)}>
          Open
        </Button>
      }
    >
      {/* Says which item, not "an item": the button opens that one, with the note. */}
      {contract.managerFirst} asked for changes on{" "}
      <span className="font-semibold">
        {refOf(changed[0])} {changed[0].title}
      </span>
      {changed.length > 1 && ` and ${changed.length - 1} more`}.
    </Callout>
  );
}
