/**
 * The demo's dates in one place.
 *
 * Records made live store either `yyyy-mm-dd` (offer and contract dates, picked in a DatePicker)
 * or "23 Sep 2026" (everything stamped with `today()`), and screens used to print whichever they
 * were handed — a contract read "Trial started 2026-09-23" two lines above "Ends 04 Nov 2026".
 * Anything shown goes through `dayLabel`, and anything counted goes through `parseDay`.
 *
 * Built by hand rather than with toLocaleDateString, which says "Sept" in en-GB Chrome.
 */

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-09-23", "23 Sep 2026" or "Wed 23 Sep 2026" as a local date; undefined for anything else. */
export function parseDay(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const m = /(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})/.exec(s);
  const month = m ? MONTHS.indexOf(m[2]) : -1;
  return m && month >= 0 ? new Date(Number(m[3]), month, Number(m[1])) : undefined;
}

/** "23 Sep 2026" for a date, or for any string `parseDay` understands; other strings pass through. */
export function dayLabel(d: Date | string | undefined): string {
  if (d === undefined) return "";
  const date = typeof d === "string" ? parseDay(d) : d;
  if (!date) return typeof d === "string" ? d : "";
  return `${pad(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * "25 Sep to 05 Nov 2026": a span of days, the year said once when both ends share it ("28 Dec
 * 2026 to 08 Feb 2027" when they don't). Either end `parseDay` can't read passes through.
 */
export function dayRangeLabel(from: Date | string | undefined, to: Date | string | undefined): string {
  const a = typeof from === "string" ? parseDay(from) : from;
  const b = typeof to === "string" ? parseDay(to) : to;
  if (!a || !b) return `${dayLabel(from)} to ${dayLabel(to)}`;
  const start = a.getFullYear() === b.getFullYear() ? `${pad(a.getDate())} ${MONTHS[a.getMonth()]}` : dayLabel(a);
  return `${start} to ${dayLabel(b)}`;
}

/**
 * "23 Sep" this year, "23 Sep 25" in any other — for tight table columns where the full label
 * would take the width of two. Strings `parseDay` can't read pass through.
 */
export function shortDayLabel(d: Date | string | undefined, now = new Date()): string {
  if (d === undefined) return "";
  const date = typeof d === "string" ? parseDay(d) : d;
  if (!date) return typeof d === "string" ? d : "";
  const day = `${pad(date.getDate())} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? day : `${day} ${String(date.getFullYear()).slice(-2)}`;
}

/** Today in the demo's date format — the stamp every live record carries. */
export const today = () => dayLabel(new Date());

/** yyyy-mm-dd in local time (`toISOString()` is UTC, so near midnight it lands on the wrong day). */
export const isoDay = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The reverse, also local: `new Date("2026-01-06")` means UTC midnight, the day before west of UTC. */
export function fromISODate(s: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined;
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * "Tue 6 Jan 2026" — how a picked date reads (DatePicker), and an interview's day. Without a comma:
 * an interview's `when` is split on ", " into its date and time.
 */
export const formatDate = (d: Date) => `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

/**
 * The slots an interview can be booked, moved or asked to move to, in the clock of whoever picks
 * one: their saved time zone, or this device's. The booking keeps that clock's offset, so each side
 * reads the slot in its own time (`slotClocks` in ./timezones).
 */
export const INTERVIEW_TIMES = ["09:00 AM", "10:00 AM", "02:00 PM", "04:00 PM"];

/**
 * The moment an interview slot ("Tue 29 Sep 2026, 10:00 AM") starts, read in the clock `offset`
 * minutes off UTC it was picked in. Undefined if the slot doesn't read as a date and time.
 */
export function slotInstant(when: string, offset: number): number | undefined {
  const m = /(\d{1,2}) (\w{3}) (\d{4}), (\d{1,2}):(\d{2}) ([AP]M)/.exec(when);
  const month = m ? MONTHS.indexOf(m[2]) : -1;
  if (!m || month < 0) return undefined;
  const hour = (Number(m[4]) % 12) + (m[6] === "PM" ? 12 : 0);
  return Date.UTC(Number(m[3]), month, Number(m[1]), hour, Number(m[5])) - offset * 60_000;
}

/** Minutes off UTC of the clock a slot was picked in: the one it was saved with, else (GMT+8) for the old "(PHT)" slots, else this device's. */
export const slotOffset = (when: string, offset?: number) => offset ?? (/\(PHT\)/.test(when) ? 480 : -new Date().getTimezoneOffset());

/** An interview's start as a moment: when it's booked, a slot reads as nothing more than a date and time in that clock. */
function interviewStart(when: string, offset?: number): number | undefined {
  return slotInstant(when, slotOffset(when, offset));
}

/** An interview whose start hasn't come yet. */
export function isUpcoming(when: string, offset?: number, now = Date.now()) {
  const start = interviewStart(when, offset);
  return start !== undefined && start > now;
}

/** Join call opens 10 minutes before the start and stays open for the hour after it. */
export const JOIN_OPENS_MINUTES = 10;

export function canJoin(when: string, offset?: number, now = Date.now()) {
  const start = interviewStart(when, offset);
  return start !== undefined && now >= start - JOIN_OPENS_MINUTES * 60_000 && now <= start + 60 * 60_000;
}

/** yyyymmdd — what the ledgers sort and filter on. */
export const dayStamp = (d: Date = new Date()) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

/** "23 Sep 2026, 3:04 PM" — when a submission, a verdict or a comment happened. */
export function momentLabel(d: Date = new Date()) {
  const hour = d.getHours() % 12 || 12;
  return `${dayLabel(d)}, ${hour}:${pad(d.getMinutes())} ${d.getHours() < 12 ? "AM" : "PM"}`;
}

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const isWeekday = (d: Date) => d.getDay() !== 0 && d.getDay() !== 6;

/** TB-105 — the date `days` working days after `from`. A trial counts working days only, and its start day is day one. */
export function addWorkingDays(from: Date, days: number) {
  const d = startOfDay(from);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (isWeekday(d)) left--;
  }
  return d;
}

/** Weekdays after `from`, up to and including `to` — the inverse of `addWorkingDays`. */
function workingDaysBetween(from: Date, to: Date) {
  const d = startOfDay(from);
  const end = startOfDay(to);
  let n = 0;
  while (d < end) {
    d.setDate(d.getDate() + 1);
    if (isWeekday(d)) n++;
  }
  return n;
}

/** "30 Days" → 30; a role saved without a duration is a 30-day trial. */
export const durationDays = (duration: string | undefined) => Number(duration?.match(/\d+/)?.[0] ?? 30) || 30;

/** "30 working days": a trial's length in the days its clock counts. */
export const workingDaysLabel = (days: number) => `${days} working ${days === 1 ? "day" : "days"}`;

/**
 * "30 working days (about 6 weeks)": a trial's length wherever it's chosen, proposed, offered or
 * signed. A trial counts weekdays, so "30 Days" alone read as a calendar month beside an end date
 * six weeks out.
 */
export const trialLength = (days: number) => `${workingDaysLabel(days)} (about ${Math.round(days / 5)} weeks)`;

/**
 * How many months of pay a trial stands for: 30 days is one, 60 two and 90 three. A trial pays one
 * total; this is how that total compares with a monthly rate, and how an old monthly rate became one.
 */
export const trialMonths = (days: number) => Math.max(1, Math.round(days / 30));

/**
 * Where a trial stands, in working days between its start and end dates. It used to count calendar
 * days against a fixed 30 while the end date sits 30 *working* days out, so day one of a six-week
 * trial said "29 days left" and the countdown ran out twelve days before the trial did. `over` is
 * the date test the evaluation and disputes open on.
 */
export function trialClock(started: string, ends: string, now = new Date()) {
  const from = parseDay(started);
  const to = parseDay(ends);
  if (!from || !to) return { label: "Day 1 of 30", left: 30, over: false, total: 30 };
  // The trial runs from its first day through its last, both counted: "Ends 30 Oct" is a working
  // day, so work due that day can still be done and sent — it closes the day after.
  const today = startOfDay(now);
  const total = Math.max(1, weekdaysThrough(from, to));
  const over = today > to;
  const done = today < from ? 0 : weekdaysThrough(from, today < to ? today : to);
  // What's left is the working days after today, so the day and what's left add up to the length
  // ("Day 5 of 30 · 25 working days left"). Today was counted in both, and read "26 left". On the
  // last day nothing is left after it, and the countdown says "Last day".
  const left = over ? 0 : today < from ? total : workingDaysBetween(today, to);
  return { label: `Day ${Math.min(total, Math.max(1, done))} of ${total}`, left, over, total };
}

/** Weekdays from `from` through `to`, both included. */
function weekdaysThrough(from: Date, to: Date) {
  return (isWeekday(from) ? 1 : 0) + workingDaysBetween(from, to);
}

/**
 * What's left of a trial, in the same words on every screen: "25 working days left", "1 working
 * day left", "Last day" on its last day, and "Trial closed" once it's over.
 */
export const daysLeftLabel = (left: number, over = false) => (over ? "Trial closed" : left <= 0 ? "Last day" : `${workingDaysLabel(left)} left`);

/** A date that has come — today counts. */
export function isPast(day: string, now = new Date()) {
  const d = parseDay(day);
  return !!d && d <= startOfDay(now);
}

/** "Q3 2026 (Jul to Sep)" — the review period a full-time contract is in. */
function quarterLabel(d: Date = new Date()) {
  const q = Math.floor(d.getMonth() / 3);
  return `Q${q + 1} ${d.getFullYear()} (${MONTHS[q * 3]} to ${MONTHS[q * 3 + 2]})`;
}

/** The first day of the quarter `d` falls in. */
const quarterOf = (d: Date) => new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);

/**
 * The quarter a full-time or part-time contract is reviewed for: the one it's in now, but never one
 * it joined part-way. Its first is the first full quarter that starts on or after its first day, so
 * a role that starts on 21 Sep is first reviewed for Q4 (Oct to Dec), not for Q3's last ten days.
 */
export function reviewQuarter(start: string | undefined, now = new Date()) {
  const from = parseDay(start);
  const current = quarterOf(now);
  if (!from) return quarterLabel(current);
  const q = quarterOf(from);
  const first = q.getTime() === from.getTime() ? q : new Date(q.getFullYear(), q.getMonth() + 3, 1);
  return quarterLabel(first > current ? first : current);
}

/**
 * "since" once a start date has come and "from" while it is still ahead. A full-time offer signed
 * today usually starts next month, and the tracker read "Full-time since 02 Nov 2026" in September.
 */
export const sinceOrFrom = (day: string, now = new Date()) => (isPast(day, now) ? "since" : "from");
