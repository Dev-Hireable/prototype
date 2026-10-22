import { durationDays, isoDay, trialLength, trialMonths } from "../portal/dates";

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

export const JOB_TYPE_LABEL: Record<JobType, string> = { trial: "Trial", "full-time": "Full-time", "part-time": "Part-time" };

/** TB-024 / TB-072 / IN-046 — the benefits every full-time engagement includes, on top of salary. */
export const FT_BENEFITS = ["Health Insurance Coverage", "Government Contribution Coverage", "Internet Allowance", "Learning & Development Allowance"];

/** How experienced a role wants someone, or a talent says they are — one list for roles, profiles and filters. */
export const EXPERIENCE_LEVELS = ["Beginner (0–2 years)", "Intermediate (2–5 years)", "Advanced (5–8 years)", "Expert (8+ years)"];

/** The skill filter's choices. The first is its "no skill filter" placeholder; the rest exist on the seeded profiles, so the filter visibly bites. */
export const SKILL_OPTIONS = ["Select skills", "Cold calling", "HubSpot", "Negotiation", "Enterprise sales", "Lead generation"] as const;

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
 * A pay as every screen prints it: whole dollars, "to" between a range's two ends, and no unit
 * ("$1,600.00 – $2,000.00 /month" → "$1,600 to $2,000"). The posted range carries cents because the
 * wizard settles its fields to two decimals. Whatever unit it was saved or shown with goes: a role's
 * "/mo" or "/month", a trial's "for the trial".
 */
const payAmount = (pay: string) =>
  pay
    .replace(/\.00\b/g, "")
    .replace(/\s*(\/\s*mo(nth)?\b|for the trial\b).*$/i, "")
    .replace(/\s*[–-]\s*(?=\$)/, " to ")
    .trim();

/**
 * How a pay reads, by the contract it pays for: a trial's is one total for the whole trial ("$1,600
 * for the trial"), a full-time or part-time role's is monthly ("$4,000 /month"); a range reads
 * "$1,600 to $2,000 for the trial". The one place a pay gets its unit, so it reads the same on every
 * screen, and reading it again changes nothing.
 */
export const payFor = (type: JobType, pay: string) => {
  const amount = payAmount(pay);
  return /\d/.test(amount) ? `${amount} ${type === "trial" ? "for the trial" : "/month"}` : amount;
};

/** A trial's total as a month of pay (the total over its months, trialMonths), to compare with a monthly rate. */
export const trialMonthly = (total: number, days: number) => Math.round(total / trialMonths(days));

/**
 * A trial's pay saved the old way, as a monthly rate ("$1,600 /month", "$1,600.00 - $2,000.00 /mo"),
 * as the total it stood for: the rate for each month of the trial. A 30-day trial keeps its number;
 * a pay already saved as a total passes through.
 */
export function trialTotal(pay: string, days: number): string {
  if (!/\/\s*mo(nth)?\b/i.test(pay)) return pay;
  const months = trialMonths(days);
  const times = (n: string) => (Number(n.replace(/,/g, "")) * months).toLocaleString("en-US", { minimumFractionDigits: n.includes(".") ? 2 : 0, maximumFractionDigits: 2 });
  return pay
    .replace(/\$\s*([\d,]+(?:\.\d+)?)/g, (_, n: string) => `$${times(n)}`)
    .replace(/\s*\/\s*mo(nth)?\b.*$/i, "")
    .trim();
}

/**
 * A role's facts for a facts strip (FactStrip on the job and application pages), as the talent
 * profile reads its own: the pay (with a part-time role's hours), how long the trial runs or when an
 * ongoing role starts, and the experience level over its years.
 */
export function jobFacts(job: { type: JobType; pay: string; duration: string; hours?: number; level: string }) {
  // "Intermediate (2–5 years)" reads as the level over its years, and "30 working days (about 6 weeks)" as the days over the weeks.
  const [, tier = job.level, years = "Experience"] = job.level.match(/^(.*?)\s*\((.+)\)$/) ?? [];
  const [, days = "", weeks = ""] = trialLength(durationDays(job.duration)).match(/^(.*?) \((.+)\)$/) ?? [];
  return [
    // A trial pays one total for the whole of it; a role pays monthly.
    { value: payAmount(job.pay), label: job.type === "trial" ? "for the trial" : job.type === "part-time" && job.hours ? `per month, ${hoursLabel(job.hours)}` : "per month" },
    job.type === "trial" ? { value: days, label: `paid trial, ${weeks}` } : { value: startLabel(job.duration), label: "start" },
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

/**
 * The day an offer starts: the one the talent's proposal gave (IN-072). A proposal from before it
 * asked for one reads as the earliest start — today for a trial, the posted start for an ongoing role.
 */
export function proposedStart(type: JobType, duration: string, start: string | undefined): string {
  return start ?? isoDay(type === "trial" ? new Date() : postedStart(duration));
}
