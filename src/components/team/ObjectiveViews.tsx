"use client";

import { Tip } from "@/components/portal/Tip";
import Link from "next/link";
import { Chip, StatusDot } from "@/components/independent/ui";
import { HEAT, kpiProgress, kpiValue, krProgress, krValue, MANUAL_METRIC, OBJECTIVE_KIND, taskProgress } from "@/lib/team/data";
import type { KeyResult, Task } from "@/lib/team/data";

const KR_KIND: Record<KeyResult["kind"], string> = { manual: "Manual", automatic: "Automatic", default: "Default" };

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
 * TB-061 Manual objective — the measurable side. Current value is written in the KPI type's own
 * format, progress is stated as the division it actually is, and the trend and heatmap are
 * read-only: the Team Builder reviews what was logged, they never edit the numbers.
 *
 * IN-040 / IN-041 — the independent passes its own objective's numbers, so a logged value moves
 * the value, the percentage and the trend chart instead of redrawing one fixed demo metric.
 */
export function ManualMetrics({ metric = MANUAL_METRIC }: { metric?: typeof MANUAL_METRIC }) {
  const m = metric;
  const percent = kpiProgress(m.current, m.target);
  const max = Math.max(...m.trend, 1);

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Current value" aside={<Chip size="sm">{m.cadence} updates</Chip>}>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className="text-[28px] leading-[1.1] font-semibold text-ink">{kpiValue(m.kpiType, m.current, m.target)}</p>
          <p className="text-[13px] leading-[1.4] text-ink-2">
            Daily target {m.dailyTarget} {m.dailyTarget === 1 ? m.unit.replace(/s$/, "") : m.unit} · {m.target} {m.unit} in total
          </p>
        </div>
        {/* Spelled out rather than just shown as a bar — the AC defines the formula. */}
        <p className="text-[13px] leading-[1.4] text-ink-2">
          Progress = {m.current} ÷ {m.target} × 100 = <span className="font-semibold text-ink">{percent}%</span>
        </p>
        <span className="block h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <span className="block h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </span>
      </Panel>

      <Panel title="Trend" aside={<span className="text-[12px] text-ink-2">Progress % per update</span>}>
        {/* Bars rather than a line: no chart dependency, and the shape is what matters here. */}
        <div className="flex h-24 items-end gap-1.5" role="img" aria-label={`Progress over ${m.trend.length} updates, latest ${m.trend.at(-1)}%`}>
          {m.trend.map((v, i) => (
            <Tip key={i} label={`Update ${i + 1}: ${v}%`}>
              <span className="flex-1 rounded-t bg-primary/80" style={{ height: `${Math.max(4, (v / max) * 100)}%` }} />
            </Tip>
          ))}
        </div>
      </Panel>

      <Panel title="Performance heatmap">
        <div className="flex flex-wrap gap-1">
          {m.heatmap.map((state, i) => (
            <Tip key={i} label={HEAT[state].label}>
              <span className={`size-5 rounded-sm ${HEAT[state].cls}`} />
            </Tip>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11.5px] leading-[1.3] text-ink-2">
          {Object.entries(HEAT).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`size-3 rounded-sm ${v.cls}`} /> {v.label}
            </span>
          ))}
        </div>
      </Panel>
    </div>
  );
}

const DONUT_COLOR: Record<KeyResult["kind"], string> = { manual: "#007acc", automatic: "#27ae60", default: "#f2994a" };

/**
 * TB-062 Automatic objective — progress is completed KRs ÷ total, and the donut breaks the
 * connected key results down by type. Nothing here is editable by the Team Builder.
 */
export function AutomaticBreakdown({ krs, href }: { krs: KeyResult[]; href: (kr: KeyResult) => string }) {
  const { done, total, percent } = krProgress(krs);
  const byKind = (["manual", "automatic", "default"] as const).map((k) => ({ kind: k, count: krs.filter((x) => x.kind === k).length }));

  // One conic-gradient ring — a chart library would be overkill for three slices.
  let at = 0;
  const stops = byKind
    .filter((s) => s.count)
    .map((s) => {
      const from = (at / total) * 360;
      at += s.count;
      return `${DONUT_COLOR[s.kind]} ${from}deg ${(at / total) * 360}deg`;
    })
    .join(", ");

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Key result completion" aside={<span className="text-[13px] font-semibold text-ink">{done}/{total} KRs</span>}>
        <p className="text-[13px] leading-[1.4] text-ink-2">
          Progress = {done} ÷ {total} × 100 = <span className="font-semibold text-ink">{percent}%</span> — driven by key result completion only.
        </p>
        <span className="block h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <span className="block h-full rounded-full bg-[#27ae60]" style={{ width: `${percent}%` }} />
        </span>
      </Panel>

      <Panel title="Key result types">
        <div className="flex items-center gap-5">
          <span className="size-24 shrink-0 rounded-full" style={{ background: `conic-gradient(${stops})` }} role="img" aria-label={byKind.map((s) => `${KR_KIND[s.kind]}: ${s.count}`).join(", ")}>
            <span className="m-[18px] block size-[60px] rounded-full bg-white" />
          </span>
          <ul className="flex flex-col gap-1.5 text-[13px] leading-[1.4] text-ink">
            {byKind.map((s) => (
              <li key={s.kind} className="flex items-center gap-2">
                <span className="size-3 rounded-sm" style={{ background: DONUT_COLOR[s.kind] }} />
                {KR_KIND[s.kind]} <span className="text-ink-2">· {s.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <Panel title="Connected key results">
        <ul className="flex flex-col">
          {krs.map((kr) => {
            const pct = krValue(kr);
            return (
              <li key={kr.id} className="border-t border-[#e3e3e3] first:border-t-0">
                <Link href={href(kr)} className="flex flex-col gap-1.5 py-2.5 hover:opacity-80">
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 text-[12.5px] leading-[1.45] text-ink">{kr.title}</span>
                    <Chip size="sm">{KR_KIND[kr.kind]}</Chip>
                    <StatusDot tone={kr.status.tone}>{kr.status.label}</StatusDot>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="block h-1.5 w-[100px] overflow-hidden rounded-[3px] bg-[#eeeeee]">
                      <span className={`block h-full rounded-[3px] ${pct === 100 ? "bg-ok" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-9 text-[11.5px] leading-[1.45] font-semibold text-ink">{pct}%</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
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

/**
 * TB-065 / IN-030 Task dashboard. The Team Builder gets it read-only — tasks are the
 * independent's to tick off — so the Mark done button only appears when `onDone` is passed.
 */
export function TaskList({ tasks, onDone }: { tasks: Task[]; onDone?: (taskId: string) => void }) {
  return (
    <Panel title="Tasks" aside={<span className="text-[13px] font-semibold text-ink">{taskProgress(tasks)}% complete</span>}>
      <ul className="flex flex-col">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-3 border-t border-[#e3e3e3] py-2.5 first:border-t-0">
            <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[12px] text-white ${t.done ? "bg-ok" : "border border-[#d8d8d8]"}`}>{t.done ? "✓" : ""}</span>
            <span className={`min-w-0 flex-1 text-[13px] leading-[1.45] ${t.done ? "text-ink-2 line-through" : "text-ink"}`}>{t.title}</span>
            <Chip size="sm">{OBJECTIVE_KIND.task}</Chip>
            <StatusDot tone={t.done ? "ok" : "neutral"}>{t.done ? "Done" : "Not done"}</StatusDot>
            {onDone && !t.done && (
              <button type="button" onClick={() => onDone(t.id)} className="h-8 shrink-0 rounded-lg border border-border px-3 text-[12px] font-medium text-ink hover:bg-surface-alt">
                Mark done
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="text-[12.5px] leading-[1.4] text-ink-2">
        {onDone ? "Completing a task moves this key result, and the key result moves the objective above it." : "Completing a task moves the key result, which moves the objective. You can see progress here but not change it."}
      </p>
    </Panel>
  );
}
