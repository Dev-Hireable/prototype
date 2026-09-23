"use client";

import { useState } from "react";
import { Tip } from "@/components/portal/Tip";
import { StatusDot } from "@/components/independent/ui";
import type { DealKeyResult, ObjectiveComment, ObjectiveEvent } from "@/lib/demo/deal";

/**
 * The objective dashboards both portals share (TB-061…065 / IN-026…030). Every panel reads the
 * objective itself — what was agreed, what the talent logged, what either side said. They used to
 * draw a fixed demo metric, three seeded key results, a "last update" from 11 Sep and a canned
 * discussion on every objective, so a trial on its first day looked a fortnight in.
 */

/** ObjectiveRow's icon for each type, the same on every screen. */
export const kindIndex = (kind: "kpi" | "okr" | "task") => (kind === "kpi" ? 1 : kind === "okr" ? 2 : 0);

function Panel({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-[#e3e3e3] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[14px] leading-[1.45] font-semibold text-ink">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/**
 * TB-061 / IN-040 — a Manual objective's numbers: the latest value against the agreed target, the
 * division that gives the percentage, and the trend of every update. With no target agreed, the
 * talent reports a percentage and that is what is shown.
 */
export function LiveMetrics({ current, target, unit, progress, trend }: { current?: number; target?: number; unit?: string; progress: number; trend?: number[] }) {
  const history = trend ?? [];
  const max = Math.max(...history, 1);
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Current value">
        {target ? (
          <>
            <p className="text-[28px] leading-[1.1] font-semibold text-ink">
              {current ?? 0} <span className="text-[14px] font-normal text-ink-2">of {target} {unit}</span>
            </p>
            {/* Spelled out rather than just shown as a bar — the AC defines the formula. */}
            <p className="text-[13px] leading-[1.4] text-ink-2">
              Progress = {current ?? 0} ÷ {target} × 100 = <span className="font-semibold text-ink">{progress}%</span>
            </p>
          </>
        ) : (
          <>
            <p className="text-[28px] leading-[1.1] font-semibold text-ink">{progress}%</p>
            <p className="text-[13px] leading-[1.4] text-ink-2">No numeric target was agreed, so progress is reported as a percentage.</p>
          </>
        )}
        <span className="block h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <span className="block h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </span>
      </Panel>

      <Panel title="Trend" aside={<span className="text-[12px] text-ink-2">Progress % per update</span>}>
        {history.length === 0 ? (
          <p className="text-[13px] leading-[1.4] text-ink-2">No updates yet — each one adds a bar here.</p>
        ) : (
          // Bars rather than a line: no chart dependency, and the shape is what matters here.
          <div className="flex h-24 items-end gap-1.5" role="img" aria-label={`Progress over ${history.length} updates, latest ${history.at(-1)}%`}>
            {history.map((v, i) => (
              <Tip key={i} label={`Update ${i + 1}: ${v}%`}>
                <span className="flex-1 rounded-t bg-primary/80" style={{ height: `${Math.max(4, (v / max) * 100)}%` }} />
              </Tip>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

/**
 * TB-062 / IN-028 — an Automatic objective's own key results. Progress is done ÷ total; the talent
 * ticks them off (`onDone`), the Team Builder reads them.
 */
export function KeyResultPanel({ keyResults, onDone }: { keyResults: DealKeyResult[]; onDone?: (id: string) => void }) {
  const done = keyResults.filter((k) => k.done).length;
  const percent = keyResults.length ? Math.round((done / keyResults.length) * 100) : 0;
  return (
    <Panel title="Key results" aside={<span className="text-[13px] font-semibold text-ink">{done}/{keyResults.length} done</span>}>
      <p className="text-[13px] leading-[1.4] text-ink-2">
        Progress = {done} ÷ {keyResults.length} × 100 = <span className="font-semibold text-ink">{percent}%</span> — driven by key result completion only.
      </p>
      <span className="block h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <span className="block h-full rounded-full bg-[#27ae60]" style={{ width: `${percent}%` }} />
      </span>
      <ul className="flex flex-col">
        {keyResults.map((k) => (
          <li key={k.id} className="flex items-center gap-3 border-t border-[#e3e3e3] py-2.5 first:border-t-0">
            <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[12px] text-white ${k.done ? "bg-ok" : "border border-[#d8d8d8]"}`}>{k.done ? "✓" : ""}</span>
            <span className={`min-w-0 flex-1 text-[13px] leading-[1.45] ${k.done ? "text-ink-2 line-through" : "text-ink"}`}>{k.title}</span>
            <StatusDot tone={k.done ? "ok" : "neutral"}>{k.done ? "Done" : "Not done"}</StatusDot>
            {onDone && !k.done && (
              <button type="button" onClick={() => onDone(k.id)} className="h-8 shrink-0 rounded-lg border border-border px-3 text-[12px] font-medium text-ink hover:bg-surface-alt">
                Mark done
              </button>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** TB-063 Default objective — binary, so the dates and who moves the status are the whole story. */
export function DefaultTimeline({ started, due, daysLeft }: { started: string; due: string; daysLeft: number | null }) {
  return (
    <Panel title="Timeline" aside={daysLeft !== null ? <span className="text-[13px] font-semibold text-ink">{daysLeft} days remaining</span> : undefined}>
      <dl className="flex flex-wrap gap-x-8 gap-y-2 text-[13px] leading-[1.4]">
        <div className="flex gap-2">
          <dt className="text-ink-2">Start</dt>
          <dd className="font-medium text-ink">{started}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-ink-2">End</dt>
          <dd className="font-medium text-ink">{due}</dd>
        </div>
      </dl>
      <p className="text-[13px] leading-[1.4] text-ink-2">
        No Update → Pending Approval → Achieved / Missed. The independent marks it done; the Team Builder approves it or sends it back.
      </p>
    </Panel>
  );
}

/** The talent's latest submission — what the Team Builder is ruling on. */
export function LastUpdate({ title, update }: { title: string; update?: { date: string; text: string; value?: number } }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg bg-[#fafafa] p-4 leading-[1.4] outline -outline-offset-1 outline-border">
      <div className="flex items-center justify-between gap-3 whitespace-nowrap">
        <span className="text-[14px] font-medium text-ink">{title}</span>
        {update && <span className="text-[13px] text-ink-2">{update.date}</span>}
      </div>
      <p className="text-[14px] text-ink">{update ? update.text : "No update yet."}</p>
    </div>
  );
}

/** IN-041 / TB-112 — every submission and verdict on the objective, newest first. */
export function ObjectiveHistory({ activity }: { activity?: ObjectiveEvent[] }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-white p-6 outline -outline-offset-1 outline-[#e3e3e3]">
      <p className="text-[14px] leading-[1.45] font-semibold text-ink">Recent activity</p>
      {!activity?.length ? (
        <p className="text-[13px] leading-[1.4] text-ink-2">Nothing logged yet.</p>
      ) : (
        activity.map((a, i) => (
          <div key={`${a.at}-${i}`} className="flex flex-col gap-0.5 border-b border-border py-2 last:border-b-0 last:pb-0">
            <span className="text-[13px] leading-[1.4] text-ink">{a.text}</span>
            <span className="text-[11.5px] leading-[1.3] text-ink-2">{a.at}</span>
          </div>
        ))
      )}
    </div>
  );
}

/**
 * IN-026 / TB-112 — the objective's discussion. It is on the shared record, so a comment on one
 * side is read on the other; it used to be page state seeded with three invented messages.
 */
export function Discussion({ comments, onSend }: { comments?: ObjectiveComment[]; onSend: (text: string) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div className="flex w-[340px] shrink-0 flex-col gap-3 self-start rounded-lg bg-white p-5 outline -outline-offset-1 outline-[#e3e3e3]">
      <p className="text-[14px] leading-[1.45] font-semibold text-ink">Discussion</p>
      {!comments?.length && <p className="text-[12.5px] leading-[1.45] text-ink-2">No comments yet. Ask a question or add context — both sides see it here.</p>}
      {comments?.map((c, i) => (
        <div key={`${c.at}-${i}`} className="flex flex-col gap-[3px] leading-[1.45]">
          <p className="flex items-start gap-2">
            <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-ink">{c.name}</span>
            <span className="text-[11px] whitespace-nowrap text-ink-2">{c.at}</span>
          </p>
          <p className="text-[12.5px] text-ink-2">{c.text}</p>
        </div>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          onSend(draft.trim());
          setDraft("");
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment…"
          className="h-11 w-full rounded-lg border border-border px-4 text-[14px] leading-[1.2] tracking-[0.2px] outline-none placeholder:text-ink-2 focus:border-primary"
        />
      </form>
    </div>
  );
}
