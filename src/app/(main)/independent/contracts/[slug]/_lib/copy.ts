import { NOTICE_DAYS } from "@/lib/contract/lifecycle";
import { nextPaymentLine, type ContractView } from "@/lib/contract/view";
import type { EndResult } from "@/lib/demo/contract";
import { dayLabel, trialLength } from "@/lib/portal/dates";
import { hoursLabel, JOB_TYPE_LABEL, type OngoingType } from "@/lib/contract/job-types";
import type { Contract } from "@/lib/independent/data";

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

/**
 * IN-032 — what was agreed, read-only: nothing on the Contract & Payment tab can be edited. The
 * terms are the one place the pay and how it's paid are stated: the tab's other cards don't repeat
 * them. (An Escrow & payout card beside them said the same pay, dates and payout rule again.)
 */
export function agreedTerms(contract: Contract, view: ContractView, ended: boolean) {
  const isTrial = contract.type === "trial";
  const typeLabel = JOB_TYPE_LABEL[contract.type];
  const days = contract.workingDays ?? (Number(contract.day.match(/of (\d+)$/)?.[1]) || 30);
  return [
    ["Role", contract.title],
    ["Contract type", contract.origin === "trial" && !isTrial ? `${typeLabel}, after a trial` : typeLabel],
    // TB-105 — a trial counts working days, and says so: "30 working days (about 6 weeks)".
    [isTrial ? "Trial duration" : "Review period", isTrial ? `${trialLength(days)} · ${contract.day}` : "Quarterly"],
    ["Start date", contract.started],
    [isTrial ? "End date" : "Term ends", contract.ends],
    // "Pay" on every type of contract; the value carries its unit.
    ["Pay", contract.rate],
    ...(contract.hours ? ([["Hours", hoursLabel(contract.hours)]] as const) : []),
    ["Payment schedule", isTrial ? trialPayment(contract, view) : "Paid on the last day of each month, pro rata for a part month"],
    ...(!isTrial ? ([["Next payment", nextPaymentLine(view, ended)]] as const) : []),
  ] as const;
}

/** When a trial's escrow is paid out, and on what: the evaluation, or the evaluation window closing without one. */
function trialPayment(contract: Contract, { due }: ContractView) {
  return `Held in escrow. You get paid when the trial ends and ${contract.managerFirst} submits the evaluation${due ? `, or after ${due} if it hasn't come by then` : ""}.`;
}

/** IN-059 — one dispute per chapter: the trial and the role it became each get their own; a direct hire has the one. */
export const disputeRule = (contract: Pick<Contract, "origin">) => (contract.origin === "trial" ? "One dispute about the trial, and one about the role." : "One dispute per contract.");

/** What filing a dispute does, in three short points: who checks what, where the money waits, and how many there can be. */
export const disputePoints = (contract: Pick<Contract, "origin">) => ["Hireable support reviews tasks, payments and dates.", "The amount is held until a decision.", disputeRule(contract)];

/** IN-091 — ending it from this side: cancelling before the first day, the notice given, or how notice works. */
export function endingNote(contract: Contract, { life, notice }: ContractView, cancellable: boolean) {
  const typeLabel = JOB_TYPE_LABEL[contract.type];
  if (cancellable && life) return `Your ${contract.type === "trial" ? "trial" : `${typeLabel.toLowerCase()} role`} hasn't started yet: its first day is ${dayLabel(life.since)}. You can cancel it before then, and nothing is owed either way.`;
  if (notice) {
    return notice.by === "independent"
      ? `You gave notice on ${dayLabel(notice.given)}: the role ends after ${dayLabel(notice.lastDay)}. You keep working and getting paid until then, and you can take your notice back before that day.`
      : `${contract.company} gave notice on ${dayLabel(notice.given)}: the role ends after ${dayLabel(notice.lastDay)}. You're paid through that day.`;
  }
  return `Either side can end the role with ${NOTICE_DAYS[contract.type as OngoingType]} days' notice, as your agreement says. It carries on, and you're paid, through the notice period.`;
}

/** The overview's banner once the trial is evaluated: the evaluation, or what became of the offer after it. */
export function decisionNote(contract: Contract, { life, conversion }: ContractView) {
  if (life?.expired && conversion) return `The ${JOB_TYPE_LABEL[conversion.type].toLowerCase()} offer expired on ${dayLabel(conversion.start)}, its start date, without an answer. ${contract.managerFirst} can send you a new one.`;
  if (conversion?.status === "declined") return `You declined the ${JOB_TYPE_LABEL[conversion.type].toLowerCase()} offer. The trial is complete; ${contract.managerFirst} may send a new offer.`;
  if (conversion?.status === "withdrawn") return `${contract.company} withdrew its ${JOB_TYPE_LABEL[conversion.type].toLowerCase()} offer. The trial is complete.`;
  return `${contract.managerFirst} sent your evaluation: your trial fit score is final${contract.tfs ? ` at ${contract.tfs.overall}%` : ""}.`;
}

/** The toast once the talent has cancelled or given notice, or why it didn't go through. */
export function endToast(r: EndResult) {
  if (!r.ok) return r.error;
  if (r.cancelled) return "Contract cancelled";
  return r.notice ? `Notice given. The role ends after ${dayLabel(r.notice.lastDay)}` : "Done";
}
