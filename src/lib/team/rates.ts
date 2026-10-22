import { EXPERIENCE_LEVELS, hoursLabel } from "@/lib/contract/job-types";
import { trialMonths } from "@/lib/portal/dates";
import type { CatalogueRole, MonthlyRange } from "@/lib/team/role-catalogue";

/**
 * Suggested pay from the role catalogue's published market rates: what a role pays at an
 * experience level, and a part-time role's share of it. The budget step, its source dialog and the
 * unit specs all read these figures.
 */

const [BEGINNER, INTERMEDIATE, ADVANCED, EXPERT] = EXPERIENCE_LEVELS;

/** Pay moves with experience: a level no source published is scaled from the nearest band that was. */
const LEVEL_FACTOR: Record<string, number> = { [BEGINNER]: 0.75, [INTERMEDIATE]: 1, [ADVANCED]: 1.35, [EXPERT]: 1.7 };

/** The catalogue's bands and the level each stands for: entry 0–2 years, mid 3–5, senior 6+. Expert (8+) has none of its own. */
const BANDS = [
  ["entry", BEGINNER],
  ["mid", INTERMEDIATE],
  ["senior", ADVANCED],
] as const;

/** The full working week a part-time role's hours are a share of. */
export const FULL_WEEK = 40;

/** The published figure a suggestion starts from: one level's band, or one figure for every level (`level` null). */
export type RateBasis = { range: MonthlyRange; level: string | null };

/** A role's suggested range at a level, the published figure it comes from, and the level it was scaled to when none was published for it. */
type RateAt = { range: MonthlyRange; basis: RateBasis; scaledTo?: string };

/** One of the four experience levels, not the picker's empty prompt. */
export const isLevel = (level: string) => level in LEVEL_FACTOR;

/** Whether a role has any published figure to suggest pay from. */
export const hasRates = (rates: CatalogueRole["rates"]) => !!rates.all || BANDS.some(([band]) => !!rates[band]);

const round = (n: number, to: number) => Math.round(n / to) * to;
const scaled = (r: MonthlyRange, by: number, to: number): MonthlyRange => ({ min: round(r.min * by, to), max: round(r.max * by, to) });

/** The published band closest in experience to `level`, with the level it stands for. */
function nearestBand(rates: CatalogueRole["rates"], level: string): { range: MonthlyRange; level: string } | null {
  const at = EXPERIENCE_LEVELS.indexOf(level);
  const published = BANDS.flatMap(([band, of]) => {
    const range = rates[band];
    return range ? [{ range, level: of, off: Math.abs(EXPERIENCE_LEVELS.indexOf(of) - at) }] : [];
  });
  const near = published.sort((a, b) => a.off - b.off)[0];
  return near ? { range: near.range, level: near.level } : null;
}

/**
 * What a level reads from a role's rates: the band published for it; else the one figure for every
 * level, shown as that rather than scaled; else (Expert, or a role with bands but no all-levels
 * figure) the nearest band, scaled to the level. Null for a role nobody published rates for.
 */
export function rateAt(rates: CatalogueRole["rates"], level: string): RateAt | null {
  const own = BANDS.find(([, of]) => of === level)?.[0];
  const band = own ? rates[own] : undefined;
  if (band) return { range: band, basis: { range: band, level } };
  if (rates.all && level !== EXPERT) return { range: rates.all, basis: { range: rates.all, level: null } };
  const near = nearestBand(rates, level);
  if (near) return { range: scaled(near.range, LEVEL_FACTOR[level] / LEVEL_FACTOR[near.level], 50), basis: near, scaledTo: level };
  return rates.all ? { range: rates.all, basis: { range: rates.all, level: null } } : null;
}

/** A part-time role's share of a full-time monthly range: `hours` of a 40-hour week, to the nearest $10. A full-time range passes through. */
export const proRata = (r: MonthlyRange, hours?: number): MonthlyRange => (hours ? scaled(r, hours / FULL_WEEK, 10) : r);

/** A trial's pay for the whole of it: the monthly range for each month of the trial (`days` working days, trialMonths). */
export const forTrial = (r: MonthlyRange, days: number): MonthlyRange => ({ min: r.min * trialMonths(days), max: r.max * trialMonths(days) });

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

/**
 * "$600 to $1,000 /month", "$1,849 /month" for a single published figure, "$340 to $580 a month for
 * 10 hrs/week" for a part-time share, or, for a trial's range (`trialDays`), "$1,600 to $2,000 for a
 * 30-working-day trial". Ranges read "to", as the role cards' pay does.
 */
export function rangeText(r: MonthlyRange, hours?: number, trialDays?: number) {
  const amount = r.min === r.max ? money(r.min) : `${money(r.min)} to ${money(r.max)}`;
  if (trialDays) return `${amount} for a ${trialDays}-working-day trial`;
  return hours ? `${amount} a month for ${hoursLabel(hours)}` : `${amount} /month`;
}
