"use client";

import { Tip } from "@/components/portal/tip";
import { StatusDot } from "@/components/portal/ui";
import { PanelCard } from "@/components/portal/panel-card";

/** Grey: nothing logged; light green: worked on tasks; green: sent a task for review. */
const TILE = ["bg-[#eeeeee]", "bg-[#a3dfb5]", "bg-ok"];
const TILE_LABEL = ["nothing logged", "worked on tasks", "sent a task for review"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
/** One column per week across the quarter — the grid is always this wide. */
const WEEKS = 14;

/** IN-076 — the status label beside the count: Thriving, Idle or Unresponsive. */
const streakLabel = (streak: number) => (streak === 0 ? "No streak · Unresponsive" : `${streak}-day streak · ${streak >= 5 ? "Thriving" : "Idle"}`);

/**
 * TB-058 — Mon–Fri with weekends left out entirely, so a gap
 * always means a missed working day; one column per week across the quarter, whether or not the
 * engagement has run that long yet, and the weeks that haven't happened sit there as empty boxes.
 *
 * `activity` is one entry per elapsed weekday, oldest first, read down each column.
 *
 * Shared by both portals: the Team tracker used to draw its own version with different greens,
 * different tile sizes and an extra legend, so the two sides of the same trial
 * disagreed about what was logged.
 *
 * TB-109 — `closed` says why the tracker has stopped (a trial that is over, a contract that has
 * ended) and freezes it on a final streak. On a full-time or part-time contract an empty task list
 * is only a quiet spell: either side can add the next task, so the tracker keeps running.
 *
 * `starts` is the first day of a contract signed ahead of it: nothing counts until then, so the
 * tracker waits rather than reading Unresponsive for days the talent wasn't due to work.
 */
export function ActivityLog({ activity, streak, feeding, closed, starts }: { activity: number[]; streak: number; feeding?: number; closed?: string; starts?: string }) {
  return (
    <PanelCard title="Activity" aside={<StreakStatus streak={streak} closed={closed} starts={starts} />}>
      <div className="flex flex-col gap-[3px]">
        {WEEKDAYS.map((d, r) => (
          <div key={d} className="flex items-center gap-[3px]">
            <span className="w-7 text-[10px] leading-[1.45] text-ink-2">{d}</span>
            {Array.from({ length: WEEKS }, (_, w) => {
              const state = activity[w * WEEKDAYS.length + r];
              // The columns share the row's width rather than being 18px each: at 18px the grid
              // stopped short of the card's right edge on the wider sidebar and read as cut off.
              return (
                <Tip key={w} label={state === undefined ? `Week ${w + 1} ${d}: not logged yet` : `Week ${w + 1} ${d}: ${TILE_LABEL[state]}`}>
                  <span className={`aspect-square min-w-0 flex-1 rounded-[3px] ${TILE[state ?? 0]}`} />
                </Tip>
              );
            })}
          </div>
        ))}
        {/* Week numbers every fourth column: 1 / 5 / 9 / 13. */}
        <div className="flex gap-[3px] text-[9px] text-ink-2">
          <span className="w-7" />
          {Array.from({ length: WEEKS }, (_, i) => (
            <span key={i} className="min-w-0 flex-1">
              {i % 4 === 0 ? i + 1 : ""}
            </span>
          ))}
        </div>
      </div>

      <p className="text-[11px] leading-[1.45] text-ink-2">
        Mon–Fri, one column per week across the quarter. Green is a day a task went for review, light green a day of work on tasks, grey nothing yet. Any activity keeps the streak alive; only an empty weekday breaks it.
        {/* TB-109 — an approved task is off the list of open work; one in review still counts. */}
        {trackerNote(starts, closed, feeding)}
      </p>
    </PanelCard>
  );
}

/** The pill on the heading: the day it starts counting, the final streak once it's closed, or the streak as it stands. */
function StreakStatus({ streak, closed, starts }: { streak: number; closed?: string; starts?: string }) {
  if (starts) return <StatusDot tone="info">Starts {starts}</StatusDot>;
  const finished = !!closed;
  return <StatusDot tone={finished ? "ok" : streak === 0 ? "neutral" : "ok"}>{finished ? `Final streak · ${streak} ${streak === 1 ? "day" : "days"}` : streakLabel(streak)}</StatusDot>;
}

/** The legend's last sentence: when counting starts, why the tracker has closed, or how much open work still feeds it. */
function trackerNote(starts?: string, closed?: string, feeding?: number) {
  if (starts) return ` It starts counting on ${starts}, the contract's first day.`;
  if (closed) return ` ${closed}, so the tracker is closed on the streak above.`;
  if (feeding === 0) return " Nothing is open right now.";
  return feeding !== undefined ? ` ${feeding} ${feeding === 1 ? "task is" : "tasks are"} still open.` : "";
}
