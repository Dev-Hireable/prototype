"use client";

import { useMemo } from "react";
import { statusOf } from "@/lib/contract/lifecycle";
import { acceptConversion, endContract as endLiveContract, withdrawNotice } from "@/lib/demo/contract";
import { dayLabel, parseDay, reviewQuarter, sinceOrFrom } from "@/lib/portal/dates";
import { activityOf, contractTypeOf, converted, evaluationsOf, fitScoreOf, lifecycleOfDeal, readDeal, startedAsTrial, trialStateOf, updateDeal, useDeal } from "@/lib/demo/deal";
import type { Deal } from "@/lib/demo/deal";
import { hoursLabel, JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import { move, PAIR, persisted, useStored } from "@/lib/demo/live";
import { donePercent } from "@/lib/demo/tasks";
import { contracts as seedContracts } from "./data";
import type { Contract } from "./data";

/* IN-076 — the independent's contracts: the live one derived from the shared engagement, then the seed's. */

const contractsStore = persisted("ind.contracts", seedContracts);

/**
 * The deal's contract as the talent's tracker reads it: a trial, the full-time or part-time role it
 * became, or one they were hired straight onto. Dates are shown the way every other date reads, the
 * countdown is in working days, and the fit score, heatmap and evaluation come off the record rather
 * than sitting at zero.
 */
function contractFromDeal(deal: Deal): Contract | null {
  const c = deal.contract;
  if (!c) return null;
  const type = contractTypeOf(deal);
  const ongoing = type !== "trial";
  const fromTrial = startedAsTrial(deal);
  const trial = trialStateOf(c);
  const evaluations = evaluationsOf(c);
  const score = fitScoreOf(deal);
  const { activity, streak } = activityOf(c);
  const conversion = converted(deal) ? deal.conversion : undefined;
  const started = dayLabel(conversion?.start ?? c.started);
  const rate = conversion ? `${conversion.salary} /month` : c.rate;
  const hours = conversion?.hours ?? c.hours;
  const l = lifecycleOfDeal(deal);
  const upcoming = l?.phase === "starts";
  const manager = PAIR.team.name;
  return {
    slug: deal.roleSlug,
    title: deal.title,
    company: deal.company,
    initials: deal.company.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    type,
    origin: fromTrial ? "trial" : "direct",
    location: "Remote",
    line: ongoing ? `${JOB_TYPE_LABEL[type]} ${sinceOrFrom(started)} ${started} · ${rate}${hours ? ` · ${hoursLabel(hours)}` : ""}` : `Started ${started} · ${l?.trial?.day ?? trial.day} · ${rate}`,
    // One lifecycle for every tab and list (@/lib/contract/lifecycle).
    status: l ? statusOf(l, "independent") : { label: "On track", tone: "ok" },
    startsOn: upcoming && l ? dayLabel(l.since) : undefined,
    progressLabel: "Tasks done",
    progress: donePercent(c.tasks),
    progressTone: "primary",
    manager,
    managerFirst: manager.split(" ")[0],
    started,
    day: ongoing ? reviewQuarter(conversion?.start ?? c.started, c.ended ? (parseDay(c.endedOn) ?? undefined) : undefined) : (l?.trial?.day ?? trial.day),
    ends: ongoing ? (c.ended && c.endedOn ? c.endedOn : "Ongoing") : dayLabel(c.ends),
    left: ongoing ? null : trial.left,
    over: !ongoing && trial.over,
    endedOn: c.ended ? c.endedOn : undefined,
    workingDays: ongoing ? undefined : trial.total,
    rate,
    hours,
    tasks: c.tasks,
    tfs: fromTrial ? { overall: score.overall, performance: score.performance, profile: score.profile, workStyle: score.workStyle, evaluation: score.evaluation } : null,
    phase: ongoing ? 4 : score.phase,
    activity,
    streak,
    evaluations,
    deposit: c.deposit,
    match: deal.match,
  };
}

/** IN-084 — refused once the offer has expired (its start date went by), been withdrawn, or the contract ended. */
function declineConversion(reason?: string): { ok: true } | { ok: false; error: string } {
  const d = readDeal();
  const offer = d?.conversion;
  // Only an offer still out: one that expired on its start date, or was withdrawn, has nothing to decline.
  if (!d || offer?.status !== "sent" || lifecycleOfDeal(d)?.phase !== "offer") return { ok: false, error: "This offer isn't open any more." };
  updateDeal((x) => (x.conversion ? { ...x, conversion: { ...x.conversion, status: "declined", declineReason: reason?.trim() || undefined } } : x));
  move("hire_declined", { slug: d.roleSlug, title: d.title }, { type: offer.type, note: reason?.trim() || undefined });
  return { ok: true };
}

/** IN-091 — end the live contract: cancel before its first day, or give notice on a running role. */
const endContract = (how: "cancel" | "notice") => endLiveContract("independent", how);
/** IN-091 — take back notice the talent gave, before its last day. */
const withdrawIndependentNotice = () => withdrawNotice("independent");

export function useIndependentContracts() {
  const deal = useDeal();
  const stored = useStored(contractsStore);
  const contracts = useMemo(() => {
    const live = deal ? contractFromDeal(deal) : null;
    return live ? [live, ...stored] : stored;
  }, [deal, stored]);
  // IN-084 — the full-time or part-time offer that follows the trial. Money moves live in
  // @/lib/demo/contract: accepting releases what the trial's escrow still holds.
  return { contracts, acceptConversion, declineConversion, endContract, withdrawNotice: withdrawIndependentNotice };
}
