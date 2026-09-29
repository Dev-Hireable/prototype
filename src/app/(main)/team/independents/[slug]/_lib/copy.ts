import { NOTICE_DAYS } from "@/lib/contract/lifecycle";
import { nextPaymentLine, termLine, type ContractView } from "@/lib/contract/view";
import type { EndResult, EvaluationResult } from "@/lib/demo/contract";
import { dayLabel } from "@/lib/demo/dates";
import { usd } from "@/lib/demo/disputes";
import { hoursLabel, JOB_TYPE_LABEL, type OngoingType } from "@/lib/demo/job-types";
import type { Tracker } from "./tracker";

/**
 * The Team Builder's tracker in words: what its cards, banners and dialogs say at each point in the
 * contract's life (@/lib/contract/lifecycle).
 */

/** The work, on the shared engagement: planned and reviewed here, worked by the talent. Undefined while it's open. */
export function closedNote({ contract, view, first, offerType, ended, trialOver }: Tracker) {
  const { phase, life, due } = view;
  if (ended) return "This contract has ended, so its work is read-only.";
  if (phase === "evaluation") return `The trial ${life?.trial?.closedEarly ? "closed early, every trial task approved" : `ended on ${contract.ends}`}. Approve what's still in review, then send your evaluation by ${due}.`;
  if (phase === "decision") return `The trial is over and evaluated. Hire ${first} to carry on the work, or end the contract.`;
  if (phase === "offer") return `Your ${offerType} offer is with ${first}. The work reopens when they accept.`;
  return trialOver ? "The trial has closed, so no new work can be added. Anything still in review can be approved." : undefined;
}

/** TB-058 — the Contract terms card. */
export function contractTerms({ contract, isTrial, fromTrial, typeLabel }: Tracker) {
  return [
    ["Agreed role", contract.role],
    ["Type", fromTrial && !isTrial ? `${typeLabel}, after a trial` : typeLabel],
    [contract.type === "full-time" ? "Base salary" : "Rate", contract.rate],
    ...(contract.hours ? ([["Hours", hoursLabel(contract.hours)]] as const) : []),
    [isTrial ? "Trial window" : "Start date", isTrial ? `${contract.started} – ${contract.ends}` : contract.started],
    ["Manager", contract.manager],
    ["Status", contract.status.label],
  ] as const;
}

/** TB-066 — the Payment card: the pay, when it's paid, the next payday and the escrow. */
export function paymentTerms({ contract, view, isTrial, fromTrial, first, ended, escrowText }: Tracker) {
  return [
    ["Agreed pay", contract.rate],
    ["Payment schedule", isTrial ? `Held in escrow, released to ${first} with your evaluation${view.due ? ` (due ${view.due}), or on its own once that has passed` : ""}` : "Monthly, on the last day of each month — pro rata for a part month"],
    ...(!isTrial ? ([["Next payment", nextPaymentLine(view, ended)]] as const) : []),
    ...(isTrial || !fromTrial ? ([["Escrow status", escrowText ?? "No escrow — hired directly"]] as const) : []),
    ...(isTrial ? ([["Trial duration", `${contract.started} – ${contract.ends}`]] as const) : []),
  ] as const;
}

type Trial = NonNullable<NonNullable<ContractView["life"]>["trial"]>;

/** The trial it began as, once it became a role: its dates, its escrow, its final score and when it was evaluated. */
export function trialTerms({ contract, view, escrowText }: Tracker, trial: Trial) {
  return [
    ["Dates", `${dayLabel(trial.started)} – ${dayLabel(trial.ends)}`],
    ["Escrow", escrowText ?? "—"],
    ...(contract.tfs ? ([["Trial Fit Score", `${contract.tfs.overall}% · final`]] as const) : []),
    ...(view.trialEval ? ([["Evaluated", view.trialEval.date]] as const) : []),
  ] as const;
}

/** The overview sidebar's Contract & payment lines. */
export function summaryRows(t: Tracker) {
  const { contract, view, isTrial, fromTrial, ended, escrowText } = t;
  return [
    ["Pay", contract.rate],
    [isTrial ? "Trial" : "Term", termLine(contract, view, ended)],
    [fromTrial && !isTrial ? "Trial escrow" : "Escrow", escrowText ?? "None — paid monthly"],
    ["Payout", payoutLine(t)],
  ] as const;
}

function payoutLine({ view, isTrial, first, ended }: Tracker) {
  const { releasable, due, escrow, pay } = view;
  if (ended) return "Settled";
  if (isTrial) {
    if (releasable > 0) return `With your evaluation${due ? `, or on its own after ${due}` : ""}`;
    return escrow && escrow.onHold > 0 ? "Held for a dispute" : `Paid to ${first}`;
  }
  return pay?.next ? `${usd(pay.next.amount)} on ${dayLabel(pay.next.to)}${pay.held > 0 ? ` · ${usd(pay.held)} held for a dispute` : ""}` : "End of each month";
}

/** The Evaluation tab's line under its heading: when reviews open, or what sending one does. */
export function evaluationIntro({ contract, view, first, isTrial, ended, trialOver, submitted }: Tracker) {
  const { phase, life } = view;
  if (!isTrial) {
    if (phase === "starts" && life) return `Reviews open on ${dayLabel(life.since)}, ${first}'s first day.`;
    return ended ? "The contract has ended; its evaluations stay on file." : "Send one whenever you have feedback — every evaluation is kept and the independent is notified.";
  }
  return trialOver || submitted ? "Scores are final once sent and feed the independent’s trial fit score." : `Locked until the trial ends on ${contract.ends}, or until every trial task is done.`;
}

/** The Hire button once the trial's evaluation is in: hire them, the offer that's out, or a new one after the last. */
export function hireLabel({ view: { conversion }, first, ended }: Tracker) {
  if (ended) return `Hire ${first}`;
  if (conversion?.status === "sent") return `${JOB_TYPE_LABEL[conversion.type]} offer sent`;
  return conversion?.status === "declined" || conversion?.status === "withdrawn" ? "Send a new offer" : `Hire ${first}`;
}

/** The overview's banner once the trial is over and the evaluation hasn't been sent — overdue, or due by when. */
export function evaluationDueNote({ view, first }: Tracker) {
  const { life, due, escrow, releasable } = view;
  if (life?.trial?.evaluationOverdue) {
    const money = escrow && escrow.onHold > 0 ? ` ${usd(escrow.onHold)} of the escrow is held for a dispute; the rest went to ${first}.` : escrow && escrow.released > 0 && releasable === 0 ? ` The escrow has been released to ${first}.` : "";
    return `Your evaluation of ${first} was due ${due}.${money} Send it to make the Trial Fit Score final and decide what's next.`;
  }
  return `The trial has ended. Send your evaluation of ${first}${due ? ` by ${due}` : ""}: it makes the Trial Fit Score final${releasable > 0 ? ` and releases the ${usd(releasable)} in escrow to ${first}` : ""}.`;
}

/** The overview's banner once the trial is evaluated: hire them or end it — or what became of the offer. */
export function decisionNote({ view: { life, conversion }, first, offerType }: Tracker) {
  if (life?.expired && conversion) return `Your ${offerType} offer expired on ${dayLabel(conversion.start)}, its start date, without an answer from ${first}. Send a new one with a later start, or end the contract.`;
  if (conversion?.status === "declined") return `${first} declined your ${offerType} offer${conversion.declineReason ? `: “${conversion.declineReason}”` : "."} Send a new offer, or end the contract.`;
  if (conversion?.status === "withdrawn") return `You withdrew your ${offerType} offer. Send a new one, or end the contract.`;
  return `The trial is evaluated. Hire ${first} full-time or part-time to keep working together, or end the contract.`;
}

/** The overview sidebar's Evaluations card: when they open, what's been sent, or what's next. */
export function evaluationsNote({ contract, view, first, isTrial, ended, trialOver, submitted, latest, offerType }: Tracker) {
  const { phase, due } = view;
  if (!isTrial) {
    if (ended) return "The contract has ended; its evaluations stay on file.";
    return phase === "starts" ? `Reviews open once ${first} starts.` : `Send feedback whenever you have it. Every evaluation is kept and ${first} is notified.`;
  }
  if (submitted) {
    if (ended) return `The contract has ended. Your evaluation from ${latest.date} stays on file.`;
    return phase === "offer" ? `You sent your evaluation on ${latest.date}. Your ${offerType} offer is with ${first}.` : `You sent your evaluation on ${latest.date}. Hire ${first} or end the contract.`;
  }
  return trialOver ? `The trial has ended. Send your evaluation${due ? ` by ${due}` : ""}: it makes the Trial Fit Score final and pays out the escrow.` : `Opens on ${contract.ends}, or sooner once every trial task is done. Your reviews feed the fit score until then.`;
}

/** TB-071 — what ending it does from where it is: before its first day, with notice, after the trial, or today. */
export function endNote({ contract, view, first, isTrial, fromTrial, typeLabel, offerType, ends }: Tracker) {
  const { life, escrow, notice, releasable, conversion } = view;
  if (ends.cancel && life) {
    return isTrial
      ? `The trial hasn't started — its first day is ${dayLabel(life.since)}. ${escrow && escrow.held > 0 ? `The ${usd(escrow.held)} in escrow comes back to you, ` : ""}${first} is told, and the contract can't be reopened.`
      : `${first}'s ${typeLabel.toLowerCase()} role hasn't started — its first day is ${dayLabel(life.since)} — so nothing is owed. ${first} is told, and the contract can't be reopened.`;
  }
  if ((ends.notice || ends.now) && life && !isTrial) {
    return notice
      ? `Notice is in: the role ends after ${dayLabel(notice.lastDay)}. End it today instead and ${first} is still paid through that day. It moves to your inactive list and can't be reopened.`
      : `Give notice and the ${typeLabel.toLowerCase()} role carries on, paid, for ${NOTICE_DAYS[contract.type as OngoingType]} days — through ${dayLabel(ends.notice?.lastDay)} — then ends on its own. Or end it today and pay ${first} through that day instead. Either way it can't be reopened.`;
  }
  if (fromTrial && isTrial) {
    return `${releasable > 0 ? `${usd(releasable)} still in escrow is released to ${first}` : "The trial's money has already been paid out"}${conversion?.status === "sent" ? `, your ${offerType} offer is withdrawn,` : ""} and the contract moves to your inactive list — it can't be reopened.`;
  }
  return `The ${typeLabel.toLowerCase()} engagement ends today. It moves to your inactive list and can't be reopened; ${first} is told, and the task list and evaluations stay on file.`;
}

/** The toast once it has ended: cancelled (and refunded), released, paid through the notice — or why not. */
export function endToast(r: EndResult, first: string) {
  if (!r.ok) return r.error;
  if (r.cancelled) return `Contract cancelled${r.refunded ? ` — ${usd(r.refunded)} came back to you` : ""}`;
  if (r.released > 0) return `Contract ended — ${usd(r.released)} released to ${first}`;
  return r.paid > 0 ? `Contract ended — ${usd(r.paid)} paid to ${first}, through the notice period` : "Contract ended";
}

/** The toast once notice is given, with the role's last day. */
export function noticeToast(r: EndResult, first: string) {
  if (!r.ok) return r.error;
  return r.notice ? `Notice given — ${first}'s role ends after ${dayLabel(r.notice.lastDay)}` : "Notice given";
}

/** The toast once an evaluation is sent: a trial's makes the score final and may release the escrow. */
export function evaluationToast(r: EvaluationResult, first: string) {
  if (!r.ok) return r.error;
  return r.trial ? `Evaluation sent — ${first}'s Trial Fit Score is final${r.released > 0 ? ` and ${usd(r.released)} was released to them` : ""}` : `Evaluation sent — ${first} can read it now`;
}
