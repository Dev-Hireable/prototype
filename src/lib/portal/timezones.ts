/**
 * Every time zone the browser knows, labelled the way profiles have always shown one —
 * "(GMT+8) Manila", "(GMT+5:30) Kolkata", "(GMT-4) New York" — and sorted west to east. Settings
 * used to offer three (Manila, London, New York), so anyone anywhere else couldn't say where they
 * were. The offset is today's: a zone on daylight saving shows its summer offset in summer.
 */

import { slotInstant } from "./dates";

export type TimeZoneOption = { label: string; zone: string; minutes: number };

/** "GMT+8" / "GMT+5:30" / "GMT" for `zone` at `at`. */
function shortOffset(zone: string, at: Date): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(at).find((p) => p.type === "timeZoneName");
  return part?.value ?? "GMT";
}

/** "GMT+5:30" → 330. */
function offsetMinutes(off: string): number {
  const m = off.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 0;
  const n = Number(m[2]) * 60 + Number(m[3] ?? 0);
  return m[1] === "-" ? -n : n;
}

/** "America/Argentina/Buenos_Aires" → "Buenos Aires". */
const cityOf = (zone: string) => zone.split("/").pop()?.replace(/_/g, " ") ?? zone;

let cache: TimeZoneOption[] | null = null;

/** Every zone as an option, west to east, then by city. Built once. */
export function timeZoneOptions(at = new Date()): TimeZoneOption[] {
  if (cache) return cache;
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["Asia/Manila", "Europe/London", "America/New_York"];
  const seen = new Set<string>();
  cache = zones
    // Region/City zones only: "Etc/GMT+5" and bare "UTC" say nothing about where someone is.
    .filter((z) => z.includes("/") && !z.startsWith("Etc/"))
    .map((zone) => {
      const off = shortOffset(zone, at);
      return { zone, minutes: offsetMinutes(off), label: `(${off === "GMT" ? "GMT+0" : off}) ${cityOf(zone)}` };
    })
    .filter((o) => (seen.has(o.label) ? false : (seen.add(o.label), true)))
    .sort((a, b) => a.minutes - b.minutes || a.label.localeCompare(b.label));
  return cache;
}


/**
 * TB-099 / IN-067 — this device's time zone, labelled like the options ("(GMT+8) Manila"). A saved
 * time zone of "" means "automatic": interview times and the profile follow this.
 */
export function deviceTimeZone(at = new Date()): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const off = shortOffset(zone, at);
    return `(${off === "GMT" ? "GMT+0" : off}) ${cityOf(zone)}`;
  } catch {
    return "(GMT+0) UTC";
  }
}

/** The time zone a saved value stands for: the one picked, or this device's when it's automatic (""). */
export const effectiveTimeZone = (saved: string) => saved || deviceTimeZone();

/** "(GMT+8) Manila" or "(GMT+5:30) Kolkata" → its offset from UTC in minutes (480, 330). */
export const offsetOfLabel = (label: string) => offsetMinutes(label.match(/GMT[+-]\d{1,2}(?::\d{2})?/)?.[0] ?? "GMT");

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * An interview slot (in the clock of whoever booked it, `from` minutes off UTC) as it reads at `to`
 * minutes off UTC: "Tue 29 Sep, 9:00 AM". Undefined if the slot doesn't read as a date and time.
 */
export function slotAt(when: string, from: number, to: number): string | undefined {
  const at = slotInstant(when, from);
  if (at === undefined) return undefined;
  const d = new Date(at + to * 60_000);
  const h = d.getUTCHours();
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]}, ${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/**
 * An interview's time in the viewer's clock and the other person's: `mine` "Tue 29 Sep, 10:00 AM",
 * `theirs` "10:00 PM" (with its day, "Mon 28 Sep, 10:00 PM", when that differs) or undefined when
 * both clocks read the same. Undefined altogether if the slot doesn't read as a date and time.
 */
export function slotClocks(when: string, booked: number, viewer: number, other: number): { mine: string; theirs?: string } | undefined {
  const mine = slotAt(when, booked, viewer);
  const theirs = slotAt(when, booked, other);
  if (!mine || !theirs) return undefined;
  if (theirs === mine) return { mine };
  const [myDay] = mine.split(", ");
  const [theirDay, theirTime] = theirs.split(", ");
  return { mine, theirs: theirDay === myDay ? theirTime : theirs };
}

/**
 * The one-line form every interview screen uses: "Tue 29 Sep, 10:00 AM your time · 10:00 PM Juan's
 * time", or "Tue 29 Sep, 10:00 AM, your time and Juan's" when the two clocks agree. A slot that
 * doesn't read as a date and time is shown as it was saved.
 */
export function bothClocks(when: string, booked: number, viewer: number, other: { offset: number; first: string }): string {
  const c = slotClocks(when, booked, viewer, other.offset);
  if (!c) return when;
  return c.theirs ? `${c.mine} your time · ${c.theirs} ${other.first}'s time` : `${c.mine}, your time and ${other.first}'s`;
}
