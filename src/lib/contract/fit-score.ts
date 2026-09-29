/** The Trial Fit Score both portals read for the same trial: its parts, their weights by phase, and its tooltip. */

/** TB-058 Trial Fit Score breakdown. `evaluation` is the latest evaluation's stars as a percentage, once one is in. */
export type FitScore = { overall: number; performance: number; profile: number; workStyle: number; evaluation?: number };

/** TB-058 Trial Fit Score — the weights differ by phase, so the breakdown states which is live. */
export const TFP_WEIGHTS = {
  3: { label: "On Trial", workStyle: 20, profile: 30, performance: 50, evaluation: 0 },
  4: { label: "Post Trial", workStyle: 15, profile: 20, performance: 40, evaluation: 25 },
} as const;

export const TFP_TOOLTIP = "Work Style, Profile and Performance are scored continuously during the trial. Your evaluation is added once the trial ends, and the final score is available after you submit it.";
