import { isoDay } from "@/lib/portal/dates";
import type { DealProposal } from "@/lib/demo/deal";
import { rateAmount } from "@/lib/demo/disputes";
import type { JobView } from "@/lib/independent/job-view";

/*
 * The proposal wizard in words and numbers: what the fields add up to, why a step can't go on yet,
 * and what the page's title and heading say for a new proposal or a revision.
 */

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** A trial's total as it's saved: whole dollars unless it has cents ("$1,600", "$1,600.50"). */
const total = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;

/** What the proposal says, before it has a version and a sent date. */
export type Terms = Omit<DealProposal, "version" | "sent">;

/** The wizard's fields and their setters, as the steps write them. */
export type ProposalFields = { rate: string; setRate: (v: string) => void; hours: string; setHours: (v: string) => void; start: string; setStart: (v: string) => void; letter: string; setLetter: (v: string) => void; portfolio: string; setPortfolio: (v: string) => void };

/**
 * What the fields add up to: the pay (a trial's for the whole trial), whether a part-time role's hours are whole and in
 * range, whether the start is a day to come, and the terms as the Team Builder reads them. The
 * start is what the offer will carry, unchanged (TB-105). A proposal carries no tasks: a trial's
 * are shared with the offer, once the proposal is accepted.
 */
export function proposalTerms(job: JobView, { rate, hours, start, letter, portfolio }: ProposalFields) {
  const { type } = job;
  /** A trial's pay is one total for the whole trial (its escrow); a full-time or part-time role's is monthly. */
  const amount = rateAmount(rate);
  const weekly = Number(hours);
  const hoursOk = type !== "part-time" || (Number.isInteger(weekly) && weekly >= 1 && weekly <= 40);
  /** IN-072 — the day they'd start: today or later. */
  const startOk = !!start && start >= isoDay();
  const terms: Terms = { rate: type === "trial" ? total(amount) : `${money(amount)}/mo`, letter: letter.trim(), portfolio: portfolio.trim() || undefined, hours: type === "part-time" ? weekly : undefined, start };
  return { amount, hoursOk, startOk, terms };
}

/** Why a step's Continue is off, as its tip: the first thing still missing. Undefined once it can go on. */
export function stepBlocker(step: number, { amount, hoursOk, startOk, letter }: { amount: number; hoursOk: boolean; startOk: boolean; letter: string }): string | undefined {
  if (step === 0) return amount <= 0 ? "Enter your pay to continue." : !hoursOk ? "Enter your hours a week to continue." : !startOk ? "Pick the day you'd start to continue." : undefined;
  if (step === 1) return letter.trim() ? undefined : "Add a cover letter to continue.";
  return undefined;
}

/** The page's title: revising, or submitting. */
export const pageTitle = (revise: boolean) => (revise ? "Revise proposal" : "Submit proposal");

/** The heading: "Proposal for Brand Designer", or "Revise proposal: Brand Designer". */
export const proposalHeading = (title: string, revise: boolean) => (revise ? `Revise proposal: ${title}` : `Proposal for ${title}`);

/** Under a revision's heading, the version it revises and when that went: "Proposal v1 · sent 24 Sep 2026". */
export const revisionLine = (previous?: { version: number; sent: string }) => `Proposal v${previous?.version ?? 1}${previous?.sent ? ` · sent ${previous.sent}` : ""}`;
