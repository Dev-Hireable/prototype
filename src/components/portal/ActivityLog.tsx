"use client";

import { StatusDot } from "@/components/independent/ui";
import { PanelCard } from "@/components/portal/PanelCard";

/** Figma "Activity": grey nothing logged, light green a partial log, green a full one. */
const TILE = ["bg-[#eeeeee]", "bg-[#a3dfb5]", "bg-ok"];
const TILE_LABEL = ["nothing logged", "some objectives logged", "all objectives logged"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
/** One column per week across the quarter — the grid is always this wide, per the design. */
const WEEKS = 14;

/** IN-076 — the status label beside the count: Thriving, Idle or Unresponsive. */
const streakLabel = (streak: number) => (streak === 0 ? "No streak · Unresponsive" : `${streak}-day streak · ${streak >= 5 ? "Thriving" : "Idle"}`);

/**
 * Figma "Activity" (node 11196-11763), TB-058. Mon–Fri with weekends left out entirely, so a gap
 * always means a missed working day; one column per week across the quarter, whether or not the
 * engagement has run that long yet, and the weeks that haven't happened sit there as empty boxes.
 *
 * `activity` is one entry per elapsed weekday, oldest first, read down each column.
 *
 * Shared by both portals: the Team tracker used to draw its own version with different greens,
 * different tile sizes and a legend the design doesn't have, so the two sides of the same trial
 * disagreed about what was logged.
 */
export function ActivityLog({ activity, streak, feeding }: { activity: number[]; streak: number; feeding?: number }) {
  /** TB-109 — every objective approved and retired closes the tracker on a final streak. */
  const finished = feeding === 0;
  return (
    <PanelCard title="Activity" aside={<StatusDot tone={finished ? "ok" : streak === 0 ? "neutral" : "ok"}>{finished ? `Final streak · ${streak} days` : streakLabel(streak)}</StatusDot>}>
      <div className="flex flex-col gap-[3px]">
        {WEEKDAYS.map((d, r) => (
          <div key={d} className="flex items-center gap-[3px]">
            <span className="w-7 text-[10px] leading-[1.45] text-ink-2">{d}</span>
            {Array.from({ length: WEEKS }, (_, w) => {
              const state = activity[w * WEEKDAYS.length + r];
              return <span key={w} title={state === undefined ? `Week ${w + 1} ${d}: not logged yet` : `Week ${w + 1} ${d}: ${TILE_LABEL[state]}`} className={`size-[18px] rounded-[3px] ${TILE[state ?? 0]}`} />;
            })}
          </div>
        ))}
        {/* Week numbers every fourth column, matching the design's 1 / 5 / 9 / 13. */}
        <div className="flex gap-[3px] text-[9px] text-ink-2">
          <span className="w-7" />
          {Array.from({ length: WEEKS }, (_, i) => (
            <span key={i} className="w-[18px]">
              {i % 4 === 0 ? i + 1 : ""}
            </span>
          ))}
        </div>
      </div>

      <p className="text-[11px] leading-[1.45] text-ink-2">
        Mon–Fri, one column per week across the quarter. Green is a full log, light green a partial one, grey nothing yet. Any log keeps the streak alive; only an empty weekday breaks it.
        {/* TB-109 — an approved objective stops feeding the grid; pending ones keep feeding it. */}
        {finished ? " Every objective has been approved and retired, so the tracker is closed on the streak above." : feeding !== undefined ? ` ${feeding} ${feeding === 1 ? "objective is" : "objectives are"} still feeding it.` : ""}
      </p>
    </PanelCard>
  );
}
