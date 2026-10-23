"use client";

import { payScheduleOf } from "@/lib/demo/contract";
import { dayLabel, daysLeftLabel, parseDay, sinceOrFrom } from "@/lib/portal/dates";
import { lifecycleOfDeal, trialEvaluationOf, useDeal } from "@/lib/demo/deal";
import type { Deal } from "@/lib/demo/deal";
import { CAP_NOTE, dealContract, disputeCap, escrowInPlay, escrowOf, fileBlock, fileBlockHint, liveChapter, rateAmount, usd, useDisputes } from "@/lib/demo/disputes";
import type { ContractRef, Dispute } from "@/lib/demo/disputes";
import { FT_BENEFITS, hoursLabel, JOB_TYPE_LABEL, payFor } from "./job-types";
import type { JobType } from "./job-types";
import { isCompleted, scoredItems, type Side, type WorkItem } from "@/lib/work/model";
import { isEndedStatus, trialClosed } from "./lifecycle";
import type { Phase, TrialChapter } from "./lifecycle";

/**
 * A contract page's sections, on both sides; `?tab=` holds the open one, so leaving from the
 * Evaluation tab comes back to it. "tasks" is the Work tab: the key links and notifications use.
 */
export const CONTRACT_TABS = ["tasks", "overview", "contract", "evaluation"] as const;

/** How a list of contracts is laid out, `?view=` on both portals' lists. */
export const CONTRACT_LAYOUTS = ["grid", "list"] as const;

/** What a contract page knows about its contract, in either portal's shape. */
type ContractOnPage = { slug: string; type: JobType; rate: string; started: string; ends: string; over: boolean; status: { label: string } };

/**
 * One contract as its page sees it, on either side: whether it's the live one on the shared
 * engagement, the money in escrow, where it is in its lifecycle (@/lib/contract/lifecycle), and
 * whether a dispute can be filed. The talent's contract page and the Team Builder's tracker read the
 * same record, so they work it out the same way here. `title` names a contract the demo only lists.
 */
export function useContractView(contract: ContractOnPage, title: string, side: Side) {
  const deal = useDeal();
  const allDisputes = useDisputes();
  const liveRef = dealContract(deal);
  const onDeal = !!liveRef && liveRef.links[side] === contract.slug;
  const ref: ContractRef = onDeal ? liveRef : listedRef(contract, title, side);
  const live = liveOf(deal, allDisputes, onDeal);
  const { escrow, inPlay, life } = live;
  const phase = life?.phase;
  /**
   * TB-073 / TB-118 / IN-059 — filing opens when the trial ends and stays open while the contract
   * runs: not before its first day, not after it ends (fileBlock). A contract the demo only lists
   * has no lifecycle, so its status stands in for one.
   */
  const disputePhase = phase ?? listedPhase(contract);
  const { block, dispute: running } = fileBlock(allDisputes, ref.key, side, inPlay, disputePhase, live.chapter);
  return {
    deal,
    allDisputes,
    onDeal,
    ref,
    escrow,
    inPlay,
    /** This contract's disputes, from either side: one record the other side and Admin read too. */
    disputes: allDisputes.filter((d) => d.contract === ref.key),
    conversion: live.conversion,
    life,
    phase,
    /** Notice either side gave: the last day it runs to. */
    notice: life?.notice,
    /** Called off before its first day. */
    cancelled: live.cancelled,
    closedTrial: !!life && trialClosed(life),
    block,
    running,
    fileHint: fileBlockHint(block, side, { starts: life ? dayLabel(life.since) : contract.started, trialEnds: contract.ends }, live.chapter),
    /** When the trial's evaluation is due. */
    due: life?.trial ? dayLabel(life.trial.evaluationDue) : undefined,
    /** The trial's own evaluation, apart from later reviews of the role it became. */
    trialEval: live.trialEval,
    /** A full-time or part-time role's pay: a month's worth, and the next payday. */
    pay: live.pay,
    /** What escrow will release now: what it holds, less what a dispute is keeping. */
    releasable: escrow ? Math.max(0, escrow.held - escrow.onHold) : 0,
  };
}

export type ContractView = ReturnType<typeof useContractView>;

/** A contract the demo only lists isn't on the shared engagement, so its key is made from its side and slug. */
function listedRef(contract: ContractOnPage, title: string, side: Side): ContractRef {
  return { key: `${side === "team" ? "team" : "ind"}:${contract.slug}`, links: { team: contract.slug, independent: contract.slug }, title, type: contract.type, rate: contract.rate, started: contract.started, ends: contract.ends };
}

/** The phase a listed contract's status stands in for: ended, not started yet, a running trial, or ongoing. */
function listedPhase(contract: ContractOnPage): Phase {
  return isEndedStatus(contract.status) ? "ended" : contract.status.label.startsWith("Starts") ? "starts" : contract.type === "trial" && !contract.over ? "trial" : "ongoing";
}

/**
 * What the shared engagement holds for the live contract: its escrow, lifecycle, conversion, trial
 * evaluation and pay. A contract the demo only lists has none of it.
 */
function liveOf(deal: Deal | null, allDisputes: Dispute[], onDeal: boolean) {
  return {
    escrow: onDeal ? escrowOf(deal, allDisputes) : null,
    /** What a dispute is about: the trial's escrow while there's one in play, else the pay (TB-118 / IN-059). */
    inPlay: onDeal ? escrowInPlay(deal, allDisputes) : null,
    /** Where the live contract is in its lifecycle: every tab reads the same phase. */
    life: onDeal ? lifecycleOfDeal(deal) : null,
    chapter: onDeal ? liveChapter(deal) : undefined,
    conversion: onDeal ? deal?.conversion : undefined,
    cancelled: onDeal && !!deal?.contract?.cancelled,
    trialEval: onDeal ? trialEvaluationOf(deal) : undefined,
    pay: onDeal ? payScheduleOf(deal) : null,
  };
}

/** Held since the trial began — `started` is the role's first day once it converts. */
export const trialStartOf = (contract: { started: string }, { life }: Pick<ContractView, "life">) => (life?.trial ? dayLabel(life.trial.started) : contract.started);

/** The Term line (a trial's Trial line) on both sides: its dates, the last day notice leaves it, or that it was called off. */
export function termLine(contract: { started: string; ends: string; endedOn?: string }, { cancelled, notice }: Pick<ContractView, "cancelled" | "notice">, ended: boolean) {
  if (cancelled) return `Cancelled ${contract.endedOn ?? ""}, before it started`;
  if (notice && !ended) return `${contract.started} – ${dayLabel(notice.lastDay)} (notice)`;
  return `${contract.started} – ${contract.ends}`;
}

/** A role's next payday, as both sides' terms show it. */
export function nextPaymentLine({ pay, phase, life }: Pick<ContractView, "pay" | "phase" | "life">, ended: boolean) {
  if (pay?.next) return `${usd(pay.next.amount)} on ${dayLabel(pay.next.to)}${pay.held > 0 ? `, less ${usd(pay.held)} held for a dispute` : ""}`;
  if (ended) return "None. The contract has ended";
  return phase === "starts" && life ? `From ${dayLabel(life.since)}, paid at the end of each month` : "None scheduled";
}

/** When a trial task was finished: its completion, or the day it was approved (work saved before completions were timed). */
const finishedOn = (t: Pick<WorkItem, "completedAt" | "approved">) => (t.completedAt !== undefined ? new Date(t.completedAt) : parseDay(t.approved?.at));

/**
 * A trial's dates as its chapter shows them once it became a role: its first day to its last, or,
 * when every trial task was done before the last day, to the day it closed, "(closed early)". The
 * scheduled end used to stand there, so a role that began after an early close started inside them.
 */
export function trialDates(trial: Pick<TrialChapter, "started" | "ends">, tasks: readonly WorkItem[]) {
  const from = dayLabel(trial.started);
  const scored = scoredItems(tasks);
  const days = scored.length > 0 && scored.every((t) => isCompleted(t.status)) ? scored.map(finishedOn) : [];
  const known = days.filter((d): d is Date => !!d);
  const closed = known.length > 0 && known.length === days.length ? new Date(Math.max(...known.map((d) => d.getTime()))) : undefined;
  const ends = parseDay(trial.ends);
  return closed && ends && closed < ends ? `${from} – ${dayLabel(closed)} (closed early)` : `${from} – ${dayLabel(trial.ends)}`;
}

/** The benefits the signed offer carried — a full-time role's own, not a fixed list. */
export function benefitsOf({ onDeal, conversion, deal }: Pick<ContractView, "onDeal" | "conversion" | "deal">): string[] {
  if (!onDeal) return FT_BENEFITS;
  return (conversion?.status === "accepted" ? conversion.benefits : (deal?.offer?.benefits ?? deal?.contract?.benefits)) ?? [];
}

/**
 * The most a dispute can claim, and what that amount is, as the filing form says it after the sum:
 * the live contract's own limit, what escrow still holds, or a month's pay.
 */
export function disputeLimit(rate: string, { onDeal, deal, allDisputes, inPlay }: Pick<ContractView, "onDeal" | "deal" | "allDisputes" | "inPlay">) {
  if (onDeal) return disputeCap(deal, allDisputes, rate);
  return inPlay ? { cap: inPlay.held, note: CAP_NOTE.escrow } : { cap: rateAmount(rate), note: CAP_NOTE.pay };
}

type FactsContract = { type: JobType; started: string; ends: string; over: boolean; day: string; left: number | null; endedOn?: string; rate: string; hours?: number };

/**
 * The facts across the top of a contract's Overview on either side, after the one it leads with (the
 * hiring manager, or the role). `daysLeft` is the working days a running trial has left.
 */
export function overviewFacts(contract: FactsContract, lead: { label: string; value: string }, daysLeft: number) {
  const isTrial = contract.type === "trial";
  return [
    lead,
    { label: isTrial ? "Trial started" : `${JOB_TYPE_LABEL[contract.type]} ${sinceOrFrom(contract.started)}`, value: contract.started },
    ...(isTrial
      ? [
          // "Day 5 of 30" over "25 working days left": the two add up to the length.
          { label: contract.over ? "Trial" : daysLeftLabel(daysLeft), value: contract.day },
          // Once over, the Trial cell says how it ended; the scheduled end would only repeat it (or, closed early, contradict it).
          ...(contract.over && !contract.endedOn ? [] : [{ label: contract.endedOn ? "Ended" : "Ends", value: contract.endedOn ?? contract.ends }]),
        ]
      : [{ label: "Review period", value: contract.day }]),
    // "Pay" on every type; the value carries its unit.
    { label: "Pay", value: payFor(contract.type, contract.rate) },
    ...(contract.hours ? [{ label: "Hours", value: hoursLabel(contract.hours) }] : []),
  ];
}
