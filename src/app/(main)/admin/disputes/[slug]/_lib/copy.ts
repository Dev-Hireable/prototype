import { isPast } from "@/lib/demo/dates";
import { ageOf, dateOf, daysOpen, holds, leftLabel, partyName, rateAmount, SLA_DAYS, usd } from "@/lib/demo/disputes";
import type { Dispute, DisputeFacts, DisputeParty } from "@/lib/demo/disputes";
import { JOB_TYPE_LABEL } from "@/lib/demo/job-types";
import type { PartyTurn } from "@/lib/disputes/case";

/**
 * Support's review of one dispute in words: what its cards, process check and dialogs say at each
 * point in the case.
 */

/** One row of the process check: what was checked, what the record shows, and where it's kept. */
export type Check = { check: string; result: string; source: string };

/** Each side's role, as the cards and the party picker name it. */
export const roleOf = (p: DisputeParty) => (p === "team" ? "team builder" : "independent");

/** A side as the party picker lists it: the name, then the role. */
export const partyOption = (d: Dispute, p: DisputeParty) => `${partyName(d, p)} (${roleOf(p)})`;

/** The side a picked option names; the "Select a party" prompt names none. */
export const pickParty = (d: Dispute, value: string): DisputeParty | null => (value === partyOption(d, "team") ? "team" : value === partyOption(d, "independent") ? "independent" : null);

/** Under the amount in question: where the money is while the case holds it, or where the case sent it. */
export function amountNote(d: Dispute) {
  if (holds(d)) return d.type === "trial" ? "held in escrow" : "kept back from pay";
  const payment = d.resolution?.payment;
  if (payment === "refunded") return "refunded to the team builder";
  if (payment === "released") return "released to the independent";
  return payment === "split" ? "split by agreement" : "hold lifted";
}

/** Whose move the case waits on: "You" when it's support's, else the side by name. */
export function waitingLabel(d: Dispute, waiting: DisputeParty | "support" | null) {
  if (waiting === "support") return "You";
  return waiting ? partyName(d, waiting) : "Nobody";
}

/** Under Waiting on: the time left on a side's turn, how long support has had it against the SLA, or the day it closed. */
export function clockNote(d: Dispute, turn: PartyTurn | null, open: boolean, now: number) {
  if (turn) return leftLabel(turn.due, now).toLowerCase();
  if (!open) return `closed ${dateOf(d.resolution?.at ?? d.updated)}`;
  return daysOpen(d) > SLA_DAYS ? `open ${ageOf(d)} · past the ${SLA_DAYS}-day SLA` : `open ${ageOf(d)} · SLA ${SLA_DAYS} days`;
}

/** AD-033 — Hireable checks the process, not the work: each row is a fact on file. */
export function processChecks(d: Dispute, facts: DisputeFacts): Check[] {
  const tasksDone = facts.tasksDone ?? facts.objectivesDone ?? 0;
  const tasksTotal = facts.tasksTotal ?? facts.objectivesTotal ?? 0;
  return [
    d.type === "trial"
      ? // A trial closes on its end date, or earlier once every trial task is Done.
        { check: "Trial has ended", result: facts.trialEnded ? (isPast(facts.ends) ? `Pass — ended ${facts.ends}` : `Pass — every task approved ahead of ${facts.ends}`) : `Fail — runs until ${facts.ends}`, source: "contract" }
      : { check: `${JOB_TYPE_LABEL[d.type]} contract is active`, result: `Pass — since ${facts.started}`, source: "contract" },
    { check: "Evaluation submitted by employer", result: facts.evaluation ? "Pass — submitted" : "Fail — not submitted", source: "trial dashboard" },
    { check: "Tasks approved", result: tasksTotal ? `${tasksDone} of ${tasksTotal} approved` : "No tasks on record", source: "task log" },
    ...(d.type === "trial"
      ? [
          { check: "Escrow funded at offer", result: `Pass — ${usd(facts.escrowFunded ?? rateAmount(d.rate))} deposited ${facts.started}`, source: "payments" },
          { check: "Amount in question within escrow", result: d.amount <= d.facts.escrowHeld ? `Pass — ${usd(d.amount)} of ${usd(d.facts.escrowHeld)} held when filed` : `Check — more than the ${usd(d.facts.escrowHeld)} held`, source: "payments" },
        ]
      : []),
  ];
}

/** Where the money in question sits: the trial's escrow, or pay kept back on a role. */
const potOf = (d: Dispute) => (d.type === "trial" ? "escrow" : "the pay held for it");

/** Under Rule in favor of: what a ruling for the picked side does with the money. */
export function rulingHint(d: Dispute, favor: DisputeParty | null, refundable: number) {
  if (favor === "team") return `${usd(refundable)} is refunded to ${d.team.company} from ${potOf(d)} straight away${d.type === "trial" ? "" : " — anything it doesn't cover comes off the next pay"}.`;
  if (favor === "independent") return `${usd(d.amount)} is released to ${d.independent.name} once you request the payment release.`;
  return "Choose the party the process check supports.";
}

/** The release dialog's line: what goes to the independent, and where it comes from. */
export const releaseNote = (d: Dispute, amount: number) => `${usd(amount)} is released ${d.type === "trial" ? `from the ${d.title} escrow` : "from the pay held for it"} to ${d.independent.name}, and both parties are told.`;
