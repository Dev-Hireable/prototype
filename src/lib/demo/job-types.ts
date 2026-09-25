import { durationDays } from "@/lib/demo/dates";

/**
 * The three kinds of role a Team Builder posts, and the contract each one turns into.
 *
 * A trial is short, escrowed and ends on a date. Full-time and part-time are ongoing: the talent is
 * hired straight onto them (no trial, no escrow, paid monthly), or reaches one after a trial when
 * the Team Builder hires them for it (TB-072).
 */
export type JobType = "trial" | "full-time" | "part-time";

/** The two ongoing kinds — what a trial can convert into. */
export type OngoingType = Exclude<JobType, "trial">;

export const JOB_TYPES: JobType[] = ["trial", "full-time", "part-time"];

export const JOB_TYPE_LABEL: Record<JobType, string> = { trial: "Trial", "full-time": "Full-time", "part-time": "Part-time" };

/** Full-time and part-time run on with no trial clock and no escrow. */
export const isOngoing = (type: JobType): type is OngoingType => type !== "trial";

/** Hours a week a part-time role can be posted at (the wizard's chips). */
export const PART_TIME_HOURS = [10, 20, 30] as const;

export const hoursLabel = (hours: number | undefined) => (hours ? `${hours} hrs/week` : "");

/**
 * When an ongoing role starts, for a "Start" row: its saved timing is "Starts in 2 weeks", which
 * read "Start: Starts in 2 weeks". A trial's duration ("30 Days") passes through.
 */
export const startLabel = (duration: string) => {
  const rest = duration.replace(/^starts\s+/i, "");
  return rest.charAt(0).toUpperCase() + rest.slice(1);
};

/**
 * A role's facts for a facts strip (FactStrip on the job and application pages), as the talent
 * profile reads its own: the pay — with a part-time role's hours — how long the trial runs or when an
 * ongoing role starts, and the experience level over its years.
 */
export function jobFacts(job: { type: JobType; pay: string; duration: string; hours?: number; level: string }) {
  // "Intermediate (2–5 years)" reads as the level over its years; "$900.00 – $1,500.00 /month" as the range over "per month".
  const [, tier = job.level, years = "Experience"] = job.level.match(/^(.*?)\s*\((.+)\)$/) ?? [];
  const pay = job.pay.replace(/\.00\b/g, "").replace(/\s*\/\s*mo(nth)?\b.*$/i, "").trim();
  return [
    { value: pay, label: job.type === "full-time" ? "salary per month" : job.type === "part-time" && job.hours ? `per month, ${hoursLabel(job.hours)}` : "per month" },
    job.type === "trial" ? { value: `${durationDays(job.duration)} days`, label: "paid trial" } : { value: startLabel(job.duration), label: "start" },
    { value: tier, label: years },
  ];
}

/**
 * The day an ongoing role's posted start points at, counted from `from`: "Starts in 2 weeks" is two
 * weeks on, "Starts in 1 month" a month on, "Starts immediately" the day itself. A weekend moves to
 * the Monday. An offer's start date opens here, and the Team Builder can still pick another.
 */
export function postedStart(duration: string, from = new Date()) {
  const day = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const m = duration.match(/in\s+(\d+)\s+(week|month)s?/i);
  if (m) {
    if (m[2].toLowerCase() === "week") day.setDate(day.getDate() + Number(m[1]) * 7);
    else day.setMonth(day.getMonth() + Number(m[1]));
  }
  if (day.getDay() === 6) day.setDate(day.getDate() + 2);
  if (day.getDay() === 0) day.setDate(day.getDate() + 1);
  return day;
}
