/**
 * The colours a Badge takes: the status tones, then the job types' own. Status data in lib (admin's
 * tables, the portals' seed data) carries its Tone, so the names live here and the Badge draws them.
 */
export type BadgeTone = "ok" | "warn" | "danger" | "info" | "neutral" | "accent" | "trial" | "full-time" | "part-time";
/** A status's colour — every tone but the job types'. The one Tone for status data, portals and admin. */
export type Tone = Exclude<BadgeTone, "full-time" | "part-time">;
