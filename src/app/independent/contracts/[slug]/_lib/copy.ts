import { NOTICE_DAYS } from "@/lib/contract/lifecycle";
import { nextPaymentLine, termLine, trialStartOf, type ContractView } from "@/lib/contract/view";
import type { EndResult } from "@/lib/demo/contract";
import { dayLabel } from "@/lib/demo/dates";
import { escrowLine, rateAmount, usd } from "@/lib/demo/disputes";
import { hoursLabel, JOB_TYPE_LABEL, type OngoingType } from "@/lib/demo/job-types";
import type { Contract, PayoutMethod } from "@/lib/independent/data";

/**
 * The talent's contract page in words: what its cards and banners say at each point in the
 * contract's life (@/lib/contract/lifecycle).
 */

/** The work, on the shared engagement: done here, planned and reviewed by the Team Builder. Undefined while it's open. */
export function closedNote(contract: Contract, { phase, life, due }: ContractView, ended: boolean) {
  if (ended) return "This contract has ended, so its work is read-only.";
  if (phase === "evaluation") return `The trial ${life?.trial?.closedEarly ? "closed early, every trial task approved" : `ended on ${contract.ends}`}. Your work is with ${contract.managerFirst} for the evaluation, due ${due}.`;
  if (phase === "decision") return `The trial is over and ${contract.managerFirst} has sent your evaluation. The work reopens if you're hired on.`;
  if (phase === "offer") return `${contract.company} offered you a role after the trial. The work reopens when you accept it.`;
  return contract.type === "trial" && contract.over ? "The trial has closed, so no new work can be added or sent for review." : undefined;
}

/** IN-032 — what was agreed, read-only: nothing on the Contract & Payment tab can be edited. */
export function agreedTerms(contract: Contract, view: ContractView, ended: boolean) {
  const isTrial = contract.type === "trial";
  const typeLabel = JOB_TYPE_LABEL[contract.type];
  return [
    ["Role", contract.title],
    ["Contract type", contract.origin === "trial" && !isTrial ? `${typeLabel}, after a trial` : typeLabel],
    [isTrial ? "Trial duration" : "Review period", isTrial ? `${contract.workingDays ?? contract.day.replace(/^Day \d+ of /, "")} working days · ${contract.day}` : "Quarterly"],
    ["Start date", contract.started],
    [isTrial ? "End date" : "Term ends", contract.ends],
    [contract.type === "full-time" ? "Base salary" : isTrial ? "Agreed budget" : "Monthly rate", contract.rate],
    ...(contract.hours ? ([["Hours", hoursLabel(contract.hours)]] as const) : []),
    ["Payment schedule", isTrial ? `Held in escrow, paid to you with ${contract.managerFirst}'s evaluation${view.due ? ` (due ${view.due}), or on its own once that has passed` : ""}` : "Paid on the last day of each month — pro rata for a part month"],
    ...(!isTrial ? ([["Next payment", nextPaymentLine(view, ended)]] as const) : []),
  ] as const;
}

/** The sidebar's Escrow & payout lines; `payoutTo` names the default payout method. */
export function escrowRows(contract: Contract, view: ContractView, ended: boolean, payoutTo: string) {
  const isTrial = contract.type === "trial";
  const fromTrial = contract.origin === "trial";
  const trialStart = trialStartOf(contract, view);
  const { escrow } = view;
  return [
    ["Pay", contract.rate],
    [isTrial ? "Trial" : "Term", termLine(contract, view, ended)],
    // It used to say "released" as soon as the trial dates passed, whether or not the Team
    // Builder had released anything — the exact case a dispute is for.
    [fromTrial && !isTrial ? "Trial" : "Escrow", fromTrial ? (escrow ? escrowLine(escrow, trialStart, { releasedTo: "you", refundedTo: contract.company }) : `${usd(contract.deposit ?? rateAmount(contract.rate))} held since ${trialStart}`) : "None — hired directly, paid monthly"],
    ["Payout", payoutLine(contract, view, ended, payoutTo)],
  ] as const;
}

function payoutLine(contract: Contract, { releasable, due, escrow, pay }: ContractView, ended: boolean, payoutTo: string) {
  if (ended) return `Settled, to ${payoutTo}`;
  if (contract.type === "trial") {
    if (releasable > 0) return `With the evaluation${due ? `, or on its own after ${due}` : ""}, to ${payoutTo}`;
    return escrow && escrow.onHold > 0 ? "Held for a dispute" : `Paid to ${payoutTo}`;
  }
  return pay?.next ? `${usd(pay.next.amount)} on ${dayLabel(pay.next.to)}, to ${payoutTo}${pay.held > 0 ? ` · ${usd(pay.held)} held for a dispute` : ""}` : `At the end of each month, to ${payoutTo}`;
}

/** IN-091 — ending it from this side: cancelling before the first day, the notice given, or how notice works. */
export function endingNote(contract: Contract, { life, notice }: ContractView, cancellable: boolean) {
  const typeLabel = JOB_TYPE_LABEL[contract.type];
  if (cancellable && life) return `Your ${contract.type === "trial" ? "trial" : `${typeLabel.toLowerCase()} role`} hasn't started — its first day is ${dayLabel(life.since)}. You can cancel it before then; nothing is owed either way.`;
  if (notice) {
    return notice.by === "independent"
      ? `You gave notice on ${dayLabel(notice.given)}: the role ends after ${dayLabel(notice.lastDay)}. You keep working, and are paid, until then — or take the notice back.`
      : `${contract.company} gave notice on ${dayLabel(notice.given)}: the role ends after ${dayLabel(notice.lastDay)}. You're paid through that day.`;
  }
  return `Either side can end the role with ${NOTICE_DAYS[contract.type as OngoingType]} days' notice, as your agreement says. It carries on, and you're paid, through the notice period.`;
}

/** The overview's banner once the trial is evaluated: the evaluation, or what became of the offer after it. */
export function decisionNote(contract: Contract, { life, conversion }: ContractView) {
  if (life?.expired && conversion) return `The ${JOB_TYPE_LABEL[conversion.type].toLowerCase()} offer expired on ${dayLabel(conversion.start)}, its start date, without an answer. ${contract.managerFirst} can send you a new one.`;
  if (conversion?.status === "declined") return `You declined the ${JOB_TYPE_LABEL[conversion.type].toLowerCase()} offer. The trial is complete; ${contract.managerFirst} may send a new offer.`;
  if (conversion?.status === "withdrawn") return `${contract.company} withdrew its ${JOB_TYPE_LABEL[conversion.type].toLowerCase()} offer. The trial is complete.`;
  return `${contract.managerFirst} sent your evaluation: your Trial Fit Score is final${contract.tfs ? ` at ${contract.tfs.overall}%` : ""}.`;
}

/** Where the money goes: the default payout method, as it's named in the wallet. */
export const payoutName = (method: PayoutMethod | undefined) => (method ? `${method.brand} ····${method.last4}` : "your payout method");

/** The toast once the talent has cancelled or given notice — or why it didn't go through. */
export function endToast(r: EndResult) {
  if (!r.ok) return r.error;
  if (r.cancelled) return "Contract cancelled";
  return r.notice ? `Notice given — the role ends after ${dayLabel(r.notice.lastDay)}` : "Done";
}
