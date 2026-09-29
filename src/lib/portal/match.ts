import type { Side } from "@/lib/work/model";

/**
 * TB-012 / IN-012 — what the match score is based on, and what moves it, in each side's words.
 * Before a job post exists it is Work Style only (Phase 1); a live job post adds Profile fit
 * (Phase 2), the trial adds Performance (Phase 3), and the post-trial evaluation finalises it (Phase 4).
 */
export const MATCH_TOOLTIP: Record<Side, string> = {
  team: "Work Style fit against your quiz answers, plus profile fit once you have a live job post. Trial performance and your evaluation fold in later.",
  independent: "Work Style fit against your quiz answers. Once your profile is complete it also weighs your skills and rate against the role; trial performance and the Team Builder's evaluation fold in later.",
};
