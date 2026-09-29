import { useState } from "react";
import type { ContractView } from "@/lib/contract/view";
import { isoDay, startOfToday } from "@/lib/portal/dates";
import { rateAmount } from "@/lib/demo/disputes";
import { FT_BENEFITS, type OngoingType } from "@/lib/contract/job-types";

/** The five criteria an evaluation scores, 1 to 5 each. */
export const SCORES = ["Quality of work", "Communication", "Reliability", "Initiative", "Collaboration"];

/**
 * TB-067 — the evaluation being written: five scores, a recommendation and comments. It lives with
 * the page, so switching tabs keeps what's been written.
 */
export function useEvaluationDraft() {
  const [scores, setScores] = useState<number[]>([4, 5, 4, 3, 4]);
  const [feedback, setFeedback] = useState("");
  const [recommendation, setRecommendation] = useState("");
  return {
    scores,
    setScores,
    feedback,
    setFeedback,
    recommendation,
    setRecommendation,
    /** TB-067: every field is required — a rating alone isn't an assessment. */
    ready: !!feedback.trim() && !!recommendation,
    clear: () => {
      setFeedback("");
      setRecommendation("");
    },
  };
}

export type EvaluationDraft = ReturnType<typeof useEvaluationDraft>;

/** TB-072 — the post-trial offer as it's being filled in. */
export type HireForm = { type: OngoingType; salary: string; start: string; benefits: string[]; hours: string };

/** TB-072 — the post-trial offer, pre-filled from what they earn on the trial. */
export const hireFormFor = (rate: string): HireForm => ({ type: "full-time", salary: String(rateAmount(rate).toLocaleString("en-US")), start: "", benefits: [...FT_BENEFITS], hours: "20" });

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
