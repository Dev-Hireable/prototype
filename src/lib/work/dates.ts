/**
 * Date-only arithmetic for work items: start and due are calendar days ("2026-09-25"), not moments.
 *
 * A day is held as an integer — days since 1970-01-01 on the proleptic Gregorian calendar, worked
 * out with Date.UTC. Nothing here builds `new Date("yyyy-mm-dd")` (UTC midnight, which is the day
 * before west of Greenwich) or calls toISOString() on a local date, so a due date can't drift a day
 * with the viewer's time zone or across a daylight-saving change. The only local-time read is
 * `todayDay`, which takes today's calendar date from the device's clock.
 */

export type Day = number;

const MS_DAY = 86_400_000;

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const pad = (n: number) => String(n).padStart(2, "0");

export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** In a week's order: weeks start on Sunday, as the date pickers draw them. */
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** A real calendar date as a Day; null for anything else ("2026-02-30", "25 Sep", ""). */
export function dayOf(iso: string | null | undefined): Day | null {
  if (!iso) return null;
  const m = ISO.exec(iso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
  return Date.UTC(y, mo - 1, d) / MS_DAY;
}

export const isIsoDay = (s: unknown): s is string => typeof s === "string" && dayOf(s) !== null;

/** Year, month (1–12) and day of month. */
export function partsOf(day: Day): { y: number; m: number; d: number } {
  const t = new Date(day * MS_DAY);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export function isoOf(day: Day): string {
  const { y, m, d } = partsOf(day);
  return `${y}-${pad(m)}-${pad(d)}`;
}

export const addDays = (day: Day, n: number): Day => day + n;

/**
 * 0 for Sunday through 6 for Saturday, as Date#getDay counts — weeks here start on Sunday, as the
 * date pickers' do (the calendar, timeline and workload started on Monday until 2026-09-28).
 * 1970-01-01 was a Thursday.
 */
export const weekdayOf = (day: Day) => (((day + 4) % 7) + 7) % 7;

export const isWeekend = (day: Day) => weekdayOf(day) === 0 || weekdayOf(day) === 6;

/** The Sunday the week `day` falls in starts on. */
export const weekStartOf = (day: Day): Day => day - weekdayOf(day);

export function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export const monthStart = (y: number, m: number): Day => Date.UTC(y, m - 1, 1) / MS_DAY;

export function monthEnd(y: number, m: number): Day {
  return monthStart(y, m) + daysInMonth(y, m) - 1;
}

/** The month `n` months from (y, m). */
export function addMonths(y: number, m: number, n: number): { y: number; m: number } {
  const i = y * 12 + (m - 1) + n;
  return { y: Math.floor(i / 12), m: (((i % 12) + 12) % 12) + 1 };
}

/** "2026-09" for a month; null unless it is one. */
export function parseMonth(s: string | null | undefined): { y: number; m: number } | null {
  const x = /^(\d{4})-(\d{2})$/.exec(s ?? "");
  if (!x) return null;
  const y = Number(x[1]);
  const m = Number(x[2]);
  return m >= 1 && m <= 12 && y >= 1970 && y <= 9999 ? { y, m } : null;
}

export const monthKey = (y: number, m: number) => `${y}-${pad(m)}`;

/** Today's date on this device, as a Day. Local calendar parts, so it is the day the user sees. */
export function todayDay(now: Date = new Date()): Day {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / MS_DAY;
}

/** Every day from `from` to `to`, both included. */
function daysBetween(from: Day, to: Day): Day[] {
  const out: Day[] = [];
  for (let d = from; d <= to; d++) out.push(d);
  return out;
}

/** The Monday-to-Friday days from `from` to `to`, both included. */
export function workingDays(from: Day, to: Day): Day[] {
  return daysBetween(from, to).filter((d) => !isWeekend(d));
}

/** "25 Sep", or "25 Sep 2027" once it isn't the current year. */
export function shortLabel(day: Day, today?: Day): string {
  const { y, m, d } = partsOf(day);
  const thisYear = today === undefined ? y : partsOf(today).y;
  return `${d} ${MONTH_SHORT[m - 1]}${y === thisYear ? "" : ` ${y}`}`;
}

/** "Today", "Tomorrow", "Yesterday" or the short label. */
export function relativeLabel(day: Day, today: Day): string {
  const diff = day - today;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return shortLabel(day, today);
}

/** "Fri 25 Sep 2026" — a day in full, for screen readers and tooltips. */
export function longLabel(day: Day): string {
  const { y, m, d } = partsOf(day);
  return `${WEEKDAY_SHORT[weekdayOf(day)]} ${d} ${MONTH_SHORT[m - 1]} ${y}`;
}

/** "25 Sep 2026" — the stamp the rest of the demo writes (see @/lib/portal/dates). */
export function stampLabel(day: Day): string {
  const { y, m, d } = partsOf(day);
  return `${pad(d)} ${MONTH_SHORT[m - 1]} ${y}`;
}

/** "25 Sep – 2 Oct", the year added where it differs from today's. */
export function rangeLabel(start: Day | null, due: Day | null, today?: Day): string {
  if (start !== null && due !== null) return start === due ? shortLabel(due, today) : `${shortLabel(start, today)} – ${shortLabel(due, today)}`;
  if (due !== null) return `Due ${shortLabel(due, today)}`;
  if (start !== null) return `Starts ${shortLabel(start, today)}`;
  return "No dates";
}
