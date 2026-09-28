import { trialStartOf, type ContractView } from "@/lib/contract/view";
import { endOptions, type EndOption } from "@/lib/demo/contract";
import { escrowLine, holds } from "@/lib/demo/disputes";
import { JOB_TYPE_LABEL } from "@/lib/demo/job-types";
import type { Contract, Evaluation } from "@/lib/team/data";
import { isArchived } from "@/lib/work/model";

/**
 * The Team Builder's tracker for one contract, worked out once a render from the contract, the
 * shared view of it (@/lib/contract/view) and the evaluations on file: what every tab and dialog reads.
 */
export function trackerOf(contract: Contract, view: ContractView, name: string, history: Evaluation[]) {
  const { onDeal, deal, conversion, life, phase, escrow } = view;
  const isTrial = contract.type === "trial";
  const first = name.split(" ")[0];
  const fromTrial = contract.origin === "trial";
  /**
   * TB-067 — the trial is over when its end date comes, or sooner once every trial task is Done.
   * TB-117 — on a full-time or part-time contract the evaluation is ongoing feedback, available
   * whenever the Team Builder wants to give it; a trial's is a one-off verdict after it ends.
   */
  const trialOver = isTrial && contract.over;
  /** Held since the trial began — `contract.started` is the role's first day once it converts. */
  const trialStart = trialStartOf(contract, view);
  /**
   * TB-071 — how the live contract can end right now (@/lib/demo/contract): cancelled before its
   * first day, closed after the trial's evaluation, or — on a running role — with notice, or today
   * paying the notice.
   */
  const endOpts = onDeal ? endOptions(deal, "team") : [];
  const endOpt = (how: NonNullable<EndOption>["how"]) => endOpts.find((o) => o?.how === how) ?? undefined;
  return {
    contract,
    view,
    name,
    first,
    isTrial,
    fromTrial,
    typeLabel: JOB_TYPE_LABEL[contract.type],
    trialOver,
    ended: contract.status.label === "Ended",
    /** TB-067 — an evaluation on file is what unlocks End Contract and Hire. */
    history,
    submitted: history.length > 0,
    latest: history[0],
    /** On a trial that became a role, its first evaluation is the trial's; the rest review the role. */
    trialFirst: fromTrial && !isTrial && history.length > 0 ? history[history.length - 1] : undefined,
    /**
     * Who can evaluate, when: the trial's evaluation once it's over (one, final), and reviews of a
     * full-time or part-time role while it runs (TB-117) — never before it starts or after it ends.
     */
    canEvaluate: life ? phase === "evaluation" || phase === "ongoing" : !isTrial || trialOver,
    /** What the talent sent for review, waiting on the Team Builder. */
    waiting: contract.tasks.filter((t) => t.status === "review" && t.assignee === "independent" && !isArchived(t)),
    ends: { cancel: endOpt("cancel"), close: endOpt("close"), notice: endOpt("notice"), now: endOpt("now"), any: endOpts.length > 0 },
    /** TB-071 — End Contract can't release money a dispute is holding. */
    endBlocked: view.disputes.some(holds),
    /** TB-072 — one post-trial offer at a time: while one is out or has been accepted, there is nothing to send. */
    conversionLocked: conversion?.status === "sent" || conversion?.status === "accepted",
    offerType: conversion ? JOB_TYPE_LABEL[conversion.type].toLowerCase() : "",
    escrowText: fromTrial ? (escrow ? escrowLine(escrow, trialStart, { releasedTo: first, refundedTo: "you" }) : `Held since ${trialStart}`) : null,
  };
}

export type Tracker = ReturnType<typeof trackerOf>;
