/**
 * Every time zone the browser knows, labelled the way profiles have always shown one —
 * "(GMT+8) Manila", "(GMT+5:30) Kolkata", "(GMT-4) New York" — and sorted west to east. Settings
 * used to offer three (Manila, London, New York), so anyone anywhere else couldn't say where they
 * were. The offset is today's: a zone on daylight saving shows its summer offset in summer.
 */

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

