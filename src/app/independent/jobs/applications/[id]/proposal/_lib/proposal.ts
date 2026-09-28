import { durationDays, isoDay } from "@/lib/demo/dates";
import type { DealProposal } from "@/lib/demo/deal";
import { rateAmount } from "@/lib/demo/disputes";
import type { TaskSuggestion } from "@/lib/demo/suggestions";
import type { JobView } from "@/lib/independent/job-view";

/*
 * The proposal wizard in words and numbers: what the fields add up to, and what the page's title
 * and heading say for a new proposal, a revision or the role's details alone.
 */

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** What the proposal says, before it has a version and a sent date. */
export type Terms = Omit<DealProposal, "version" | "sent">;

/** The wizard's fields and their setters, as the steps write them. */
export type ProposalFields = { rate: string; setRate: (v: string) => void; hours: string; setHours: (v: string) => void; start: string; setStart: (v: string) => void; letter: string; setLetter: (v: string) => void; portfolio: string; setPortfolio: (v: string) => void };

/**
 * What the fields add up to: the monthly amount, whether a part-time role's hours are whole and in
 * range, whether the start is a day to come, whether the trial's tasks take suggestions, and the
 * terms as the Team Builder reads them. The start is what the offer will carry, unchanged (TB-105).
 */
export function proposalTerms(job: JobView, { rate, hours, start, letter, portfolio }: ProposalFields, revise: boolean, suggestions: TaskSuggestion[]) {
  const { type } = job;
  const trial = type === "trial";
  /** Pay is monthly on every kind of role — the trial's escrow, a salary, a part-time rate. */
  const amount = rateAmount(rate);
  const weekly = Number(hours);
  const hoursOk = type !== "part-time" || (Number.isInteger(weekly) && weekly >= 1 && weekly <= 40);
  /** IN-072 — the day they'd start: today or later. */
  const startOk = !!start && start >= isoDay();
  /** IN-073 — a revision of a trial's proposal can push back on its tasks: suggest changes the company decides on. */
  const suggesting = revise && trial && !!job.tasks?.length;
  const terms: Terms = { rate: `${money(amount)}/mo`, letter: letter.trim(), portfolio: portfolio.trim() || undefined, hours: type === "part-time" ? weekly : undefined, start, ...(suggesting && suggestions.length ? { suggestions } : {}) };
  return { amount, hoursOk, startOk, suggesting, terms };
}

/** The page's title: revising, reading the role's details (a trial's tasks), or submitting. */
export const pageTitle = (revise: boolean, reviewOnly: boolean, trial: boolean) => (revise ? "Revise proposal" : reviewOnly ? (trial ? "Trial tasks" : "Role details") : "Submit proposal");

/** The line under the heading: the version being revised, what the role asks for when only reading it, or what to do. */
export function introLine(job: JobView, revise: boolean, reviewOnly: boolean, previous?: { version: number; sent: string }) {
  const trial = job.type === "trial";
  const pay = job.type === "full-time" ? "expected salary" : "rate and hours";
  return revise
    ? `${job.title} · Proposal v${previous?.version ?? 1} · sent ${previous?.sent ?? ""}`
    : reviewOnly
      ? trial
        ? `What ${job.company} wants done in the ${durationDays(job.duration)}-day trial. Your proposal names your rate for it.`
        : `What the role involves. Your proposal names your ${pay} for it.`
      : trial
        ? `Read the trial's tasks, propose your monthly rate and the day you'd start, and send your proposal. What you agree with ${job.company} here is what the offer carries.`
        : `Name your ${pay} and the day you'd start, and send your proposal for this ${job.contract.toLowerCase()} role. What you agree with ${job.company} here is what the offer carries.`;
}
