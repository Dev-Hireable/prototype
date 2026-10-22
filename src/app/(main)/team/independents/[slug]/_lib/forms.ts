import { useState } from "react";
import type { ContractView } from "@/lib/contract/view";
import { isoDay, startOfToday } from "@/lib/portal/dates";
import { rateAmount } from "@/lib/demo/disputes";
import { FT_BENEFITS, trialMonthly, type OngoingType } from "@/lib/contract/job-types";

/** The five criteria an evaluation scores, 1 to 5 each. */
export const SCORES = ["Quality of work", "Communication", "Reliability", "Initiative", "Collaboration"];

/** A new evaluation starts with nothing scored (0), so every score is one the Team Builder chose. */
const UNSCORED = SCORES.map(() => 0);

/** What an evaluation still needs before it can be sent, in a line for its disabled Send button; undefined once it's complete. */
function evaluationMissing({ scores, recommendation, feedback }: { scores: number[]; recommendation: string; feedback: string }) {
  const missing = [scores.some((s) => s < 1) && "a score for each criterion", !recommendation && "a recommendation", !feedback.trim() && "your comments"].filter((m): m is string => !!m);
  if (missing.length === 0) return undefined;
  const list = missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`;
  return `Add ${list} to send it.`;
}

/**
 * TB-067 / TB-117 — the evaluation being written: five scores, a recommendation and comments, all
 * required (a rating alone isn't an assessment). It lives with the page, so switching tabs keeps
 * what's been written; sending a role's review clears it for the next one.
 */
export function useEvaluationDraft() {
  const [scores, setScores] = useState<number[]>(UNSCORED);
  const [feedback, setFeedback] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const missing = evaluationMissing({ scores, recommendation, feedback });
  return {
    scores,
    setScores,
    feedback,
    setFeedback,
    recommendation,
    setRecommendation,
    missing,
    ready: !missing,
    clear: () => {
      setScores(UNSCORED);
      setFeedback("");
      setRecommendation("");
    },
  };
}

export type EvaluationDraft = ReturnType<typeof useEvaluationDraft>;

/** TB-072 — the post-trial offer as it's being filled in. */
export type HireForm = { type: OngoingType; salary: string; start: string; benefits: string[]; hours: string };

/**
 * TB-072 — the post-trial offer, pre-filled from what they earn on the trial: its pay, one total for
 * the whole trial, as a month of pay (the total over the trial's months, `trialDays` working days).
 */
export const hireFormFor = (rate: string, trialDays: number): HireForm => ({ type: "full-time", salary: trialMonthly(rateAmount(rate), trialDays).toLocaleString("en-US"), start: "", benefits: [...FT_BENEFITS], hours: "20" });

/** A part-time offer's hours a week: whole hours, 1 to 40. */
export function hoursValid(hours: string) {
  const n = Number(hours);
  return Number.isInteger(n) && n >= 1 && n <= 40;
}

/** What still stops the post-trial offer from going out, said beside its Send button; undefined once it can go. */
export function hireBlock(h: HireForm): string | undefined {
  if (rateAmount(h.salary) <= 0) return "Enter the pay to send it.";
  if (!h.start.trim()) return "Pick a start date to send it.";
  if (h.type === "part-time" && !hoursValid(h.hours)) return "Enter the hours a week to send it.";
  return undefined;
}

/**
 * A new post-trial offer starts from the last one: the talent turned down its terms, not the idea.
 * A start date that has passed is dropped. The first one starts on the kind of role the evaluation
 * recommended.
 */
export function prefill(h: HireForm, conversion: ContractView["conversion"], recommendation: string | undefined): HireForm {
  if (conversion) {
    return {
      type: conversion.type,
      salary: conversion.salary.replace(/^\$/, ""),
      start: conversion.start >= isoDay(startOfToday()) ? conversion.start : "",
      benefits: conversion.benefits.length ? conversion.benefits : [...FT_BENEFITS],
      hours: String(conversion.hours ?? 20),
    };
  }
  if (recommendation === "Hire part-time" || recommendation === "Hire full-time") return { ...h, type: recommendation === "Hire part-time" ? "part-time" : "full-time" };
  return h;
}
