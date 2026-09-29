"use client";

import { useMemo } from "react";
import { statusOf } from "@/lib/contract/lifecycle";
import { endContract as endLiveContract, sendEvaluation, withdrawNotice, type EndResult, type EvaluationResult } from "@/lib/demo/contract";
import { dayLabel, parseDay, reviewQuarter, today } from "@/lib/portal/dates";
import { activityOf, contractTypeOf, converted, evaluationsOf, fitScoreOf, lifecycleOfDeal, readDeal, startedAsTrial, trialStateOf, useDeal } from "@/lib/demo/deal";
import type { Deal } from "@/lib/demo/deal";
import { dealContract as contractRefOf, escrowOf, rateAmount, usd } from "@/lib/demo/disputes";
import { JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import type { JobType } from "@/lib/contract/job-types";
import { PAIR, persisted, useLive, useStored, type LivePayment } from "@/lib/demo/live";
import { donePercent } from "@/lib/demo/tasks";
import { profileStore } from "./account";
import { contracts as seedContracts, transactions as seedTransactions } from "./data";
import type { Contract, Evaluation, Transaction } from "./data";

/*
 * The Team Builder's contracts, their evaluations and the ledger. The live contract comes off the
 * shared engagement (@/lib/demo/deal); money moves only in @/lib/demo/contract.
 */

const contractsStore = persisted("team.contracts", seedContracts);
const evaluationsStore = persisted<Record<string, Evaluation[]>>("team.evaluations", {});

/**
 * The shared contract in this portal's shape: a trial with its clock and live Trial Fit Score; the
 * full-time or part-time role it converted into, with that score frozen; or a direct full-time /
 * part-time hire, which has no trial and so no score (its tracker shows the match at hire).
 */
function contractFromDeal(deal: Deal, manager: string): Contract | null {
  const c = deal.contract;
  if (!c) return null;
  const type = contractTypeOf(deal);
  const ongoing = type !== "trial";
  const fromTrial = startedAsTrial(deal);
  const trial = trialStateOf(c);
  const score = fitScoreOf(deal);
  const { activity, streak } = activityOf(c);
  /** A converted trial runs from the post-trial offer's start, at its pay. */
  const conversion = converted(deal) ? deal.conversion : undefined;
  const start = conversion?.start ?? c.started;
  const l = lifecycleOfDeal(deal);
  const upcoming = l?.phase === "starts";
  return {
    slug: PAIR.independent.slug,
    independent: PAIR.independent.slug,
    role: deal.title,
    type,
    origin: fromTrial ? "trial" : "direct",
    // A closed trial is waiting on, or has, its evaluation; "On track" beside "Closed early" said neither.
    // One lifecycle for every tab and list (@/lib/contract/lifecycle).
    status: l ? statusOf(l, "team") : { label: "On track", tone: "ok" },
    startsOn: upcoming && l ? dayLabel(l.since) : undefined,
    progress: donePercent(c.tasks),
    progressLabel: "Tasks done",
    started: dayLabel(start),
    day: ongoing ? reviewQuarter(start, c.ended ? (parseDay(c.endedOn) ?? undefined) : undefined) : (l?.trial?.day ?? trial.day),
    ends: ongoing ? (c.ended && c.endedOn ? c.endedOn : "Ongoing") : dayLabel(c.ends),
    left: ongoing ? null : trial.left,
    over: !ongoing && trial.over,
    endedOn: c.ended ? c.endedOn : undefined,
    rate: conversion ? `${conversion.salary} /month` : c.rate,
    hours: conversion?.hours ?? c.hours,
    manager,
    tasks: c.tasks,
    tfs: fromTrial ? { overall: score.overall, performance: score.performance, profile: score.profile, workStyle: score.workStyle, evaluation: score.evaluation } : null,
    phase: ongoing ? 4 : score.phase,
    activity,
    streak,
    match: deal.match,
  };
}

/** Whether `slug` names the live contract — the one on the shared engagement. */
const isLive = (slug: string) => !!readDeal()?.contract && slug === PAIR.independent.slug;

/**
 * TB-071 — close the engagement for good: what's owed is paid (a trial's escrow still held, a
 * role's pay so far this month) and a post-trial offer still out is withdrawn. Refused while a
 * dispute is holding the money — filing one is what keeps the funds held while support reviews it.
 * `how` comes from endOptions (@/lib/demo/contract): cancel before the first day, close after the
 * trial, notice, or now.
 */
function endContract(slug: string, how: "cancel" | "close" | "notice" | "now" = "close"): EndResult {
  if (isLive(slug)) return endLiveContract("team", how);
  contractsStore.set((cs) => cs.map((c) => (c.slug === slug ? { ...c, status: { label: "Ended", tone: "neutral" as const }, progressLabel: "Contract complete" } : c)));
  return { ok: true, released: 0, paid: 0 };
}

/**
 * TB-067 — record the evaluation so End Contract and Hire for Full-Time unlock. IN-034 — the live
 * contract's belongs to the shared record, so the talent's side and Admin's process check (AD-033)
 * read the one that was submitted, scores included. The trial's own makes its score final and pays
 * out the escrow; later ones review the role (@/lib/demo/contract).
 */
function addEvaluation(slug: string, e: Omit<Evaluation, "date">): EvaluationResult {
  if (isLive(slug)) return sendEvaluation({ stars: e.stars, scores: e.scores, feedback: e.feedback, recommendation: e.recommendation });
  evaluationsStore.set((all) => ({ ...all, [slug]: [{ ...e, date: today() }, ...(all[slug] ?? [])] }));
  return { ok: true, trial: false, released: 0 };
}

/** TB-071 — take back notice the Team Builder gave, before its last day. */
const withdrawTeamNotice = () => withdrawNotice("team");

export function useTeamContracts() {
  const deal = useDeal();
  const stored = useStored(contractsStore);
  const storedEvaluations = useStored(evaluationsStore);
  const manager = useStored(profileStore).name;
  const contracts = useMemo(() => {
    const live = deal ? contractFromDeal(deal, manager) : null;
    return live ? [live, ...stored] : stored;
  }, [deal, stored, manager]);
  /**
   * TB-117 lets a full-time contract be evaluated repeatedly, and TB-081 wants the whole history:
   * newest first. The live contract's come off the shared record, so the talent reads the same ones.
   */
  const evaluations = useMemo(
    () =>
      deal?.contract
        ? { ...storedEvaluations, [PAIR.independent.slug]: evaluationsOf(deal.contract).map((e) => ({ stars: e.stars, scores: e.scores, feedback: e.feedback, recommendation: e.recommendation, date: e.date, tfp: e.tfp })) }
        : storedEvaluations,
    [deal, storedEvaluations],
  );
  return { contracts, endContract, withdrawNotice: withdrawTeamNotice, evaluations, addEvaluation };
}

/**
 * TB-084 / AD-042 — the ledger: the seed plus the live contract's money — the deposit when the trial
 * started, then every release and dispute refund recorded in the shared store. The deposit is what
 * was actually funded with the offer, not the rate string. A direct full-time or part-time hire has
 * no escrow, so nothing is deposited.
 */
function ledgerOf(deal: Deal | null, payments: LivePayment[]): Transaction[] {
  const ref = contractRefOf(deal);
  if (!deal?.contract || !ref) return seedTransactions;
  const rows: Transaction[] = [];
  /** "Brand Designer — trial": the chapter the money was for, not what the contract is now. */
  const nameFor = (chapter: JobType) => `${deal.title} — ${JOB_TYPE_LABEL[chapter].toLowerCase()}`;
  // Rows saved before payments carried their chapter: escrow money reads as the trial's.
  const chapterOf = (p: { chapter?: JobType; period: string }): JobType => p.chapter ?? (startedAsTrial(deal) && /^(Trial|Dispute)/.test(p.period) ? "trial" : contractTypeOf(deal));
  const name = nameFor(contractTypeOf(deal));
  const href = `/team/independents/${ref.links.team}?tab=contract`;
  const escrow = escrowOf(deal, []);
  const total = escrow?.total ?? rateAmount(deal.contract.rate);
  const held = escrow?.held ?? 0;
  const fee = deal.offer?.deposit?.fee;
  const started = parseDay(deal.contract.started);
  const row = ({ chapter, ...t }: Omit<Transaction, "independent" | "contract" | "contractHref" | "detail"> & { drawerStatus: string; lines: [string, string][]; chapter?: JobType }): Transaction => {
    const contract = chapter ? nameFor(chapter) : name;
    return {
      ...t,
      independent: PAIR.independent.name,
      contract,
      contractHref: href,
      detail: { time: t.date, drawerStatus: t.drawerStatus, rows: [["Contract", contract], ["Independent", PAIR.independent.name], ...t.lines], breakdown: [[t.desc, t.amount]], total: t.amount, timeline: [{ title: t.desc, date: t.date, done: true }] },
    };
  };
  rows.push(
    ...payments
      // Rows recorded before the slug fix carry the Team Builder's slug for the contract.
      .filter((p) => p.contract === ref.links.independent || p.contract === ref.links.team)
      .map((p) =>
        p.kind === "refunded"
          ? row({ id: p.id, date: p.date, at: p.at, desc: "Refunded after a dispute ruling", type: "Payment Refunded", amount: p.amount, status: { label: "Refunded", tone: "neutral" }, drawerStatus: "Refunded to your card", lines: [["Ruling", p.period]], chapter: chapterOf(p) })
          : row({ id: p.id, date: p.date, at: p.at, desc: `Released to ${PAIR.independent.name}`, type: "Payment Released", amount: p.amount, status: { label: "Released", tone: "ok" }, drawerStatus: "Released", lines: [["Period", p.period]], chapter: chapterOf(p) }),
      ),
  );
  // A direct full-time or part-time hire has no escrow, so nothing was deposited.
  if (startedAsTrial(deal))
    rows.push(
      row({
        id: `deposit-${ref.key}`,
        date: dayLabel(deal.contract.started),
        at: started ? started.getFullYear() * 10000 + (started.getMonth() + 1) * 100 + started.getDate() : 0,
        desc: "Escrow deposit",
        type: "Payment Deposited",
        chapter: "trial",
        amount: usd(total),
        status: held > 0 ? { label: "Held", tone: "warn" } : { label: "Settled", tone: "neutral" },
        drawerStatus: held > 0 ? "Held in escrow" : "Settled",
        lines: [["Still in escrow", usd(held)], ...(fee ? ([["Platform fee (charged separately)", usd(fee)]] as [string, string][]) : [])],
      }),
    );
  return [...rows, ...seedTransactions];
}

export function useLedger() {
  const deal = useDeal();
  const { payments } = useLive();
  return useMemo(() => ledgerOf(deal, payments), [deal, payments]);
}
