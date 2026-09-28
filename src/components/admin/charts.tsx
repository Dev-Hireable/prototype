import { Tip } from "@/components/portal/Tip";
/*
 * Both charts are fixed geometry, driven by data:
 *   BarChart  — a 640×206 plot: gridlines every 45px from y 180 up to 0
 *               (320 units ⇒ 0.5625 px/unit), 20px bars at x 18+80i / 42+80i, radius 3 top,
 *               y-labels at (−2, line−14) 10px, x-labels at (28+80i, 186) 10.5px.
 *   Donut     — 144×144: three arcs r 62, stroke 16, butt caps,
 *               a 6° gap between segments starting 3° past 12 o'clock.
 */

/* ---------------------------------------------------------------- bars ---- */

export type BarSeries = { label: string; color: string; values: number[] };

const PLOT_W = 640;
const PLOT_H = 206;
const BASELINE = 180;
const STEP = 80;

export function BarChart({
  categories,
  series,
  max,
  ticks,
}: {
  categories: string[];
  series: BarSeries[];
  max: number;
  ticks: number[];
}) {
  const scale = BASELINE / max;
  return (
    <>
      <div className="relative" style={{ width: PLOT_W, height: PLOT_H }}>
        {ticks.map((t, i) => {
          const y = BASELINE - (BASELINE / (ticks.length - 1)) * i;
          return (
            <div key={t}>
              <div
                className={`absolute right-0 left-0 h-px ${i === 0 ? "bg-baseline" : "bg-grid"}`}
                style={{ top: y - 1 }}
              />
              <span
                className={`absolute text-[10px] leading-[1.45] whitespace-nowrap text-muted ${i === 0 ? "opacity-0" : ""}`}
                style={{ left: -2, top: y - 14 }}
              >
                {t}
              </span>
            </div>
          );
        })}
        {categories.map((cat, i) => (
          <div key={cat}>
            {series.map((s, k) => {
              const h = s.values[i] * scale;
              return (
                <Tip key={s.label} label={`${cat} · ${s.label}: ${s.values[i]}`}>
                  <div className="absolute w-5 rounded-t-[3px]" style={{ left: 18 + k * 24 + i * STEP, top: BASELINE - h, height: h, background: s.color }} />
                </Tip>
              );
            })}
            <span
              className="absolute text-[10.5px] leading-[1.45] whitespace-nowrap text-muted"
              style={{ left: 28 + i * STEP, top: 186 }}
            >
              {cat}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export function Legend({ series }: { series: BarSeries[] }) {
  return (
    <>
      <span className="size-[10px] shrink-0" aria-hidden />
      {series.map((s) => (
        <span key={s.label} className="flex items-center gap-1.5 text-[11.5px] leading-[1.45] whitespace-nowrap text-muted">
          <span aria-hidden className="size-2 rounded-full" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </>
  );
}

/* ---------------------------------------------------------------- donut --- */

export type Slice = { label: string; count: number; color: string };

const RING = 144;
const R = 62;
const STROKE = 16;
const GAP_DEG = 6;

/** A slice's share of the whole, as a whole percentage. */
const shareOf = (count: number, total: number) => Math.round((count / total) * 100);

/**
 * Each slice's arc, in order round the ring: where it starts (degrees past 12 o'clock) and how far it
 * sweeps, with half the gap taken off either end.
 */
function arcsOf(slices: Slice[], total: number) {
  return slices.reduce<{ start: number; items: { slice: Slice; start: number; sweep: number }[] }>(
    (acc, slice) => {
      const full = (slice.count / total) * 360;
      acc.items.push({ slice, start: acc.start + GAP_DEG / 2, sweep: full - GAP_DEG });
      return { start: acc.start + full, items: acc.items };
    },
    { start: 0, items: [] },
  ).items;
}

export function Donut({
  slices,
  centerValue,
  centerLabel,
  unit,
}: {
  slices: Slice[];
  centerValue: string;
  centerLabel: string;
  unit: string;
}) {
  const total = slices.reduce((n, s) => n + s.count, 0);
  const circumference = 2 * Math.PI * R;
  const arcs = arcsOf(slices, total);

  return (
    <div className="flex w-full items-center gap-[22px] py-1">
      <div className="relative shrink-0" style={{ width: RING, height: RING }}>
        <svg
          viewBox={`0 0 ${RING} ${RING}`}
          width={RING}
          height={RING}
          role="img"
          aria-label={slices.map((s) => `${s.label} ${shareOf(s.count, total)}%`).join(", ")}
        >
          {arcs.map(({ slice, start, sweep }) => (
            <circle
              key={slice.label}
              cx={RING / 2}
              cy={RING / 2}
              r={R}
              fill="none"
              stroke={slice.color}
              strokeWidth={STROKE}
              strokeDasharray={`${(sweep / 360) * circumference} ${circumference}`}
              transform={`rotate(${start - 90} ${RING / 2} ${RING / 2})`}
            />
          ))}
        </svg>
        <p className="absolute top-12 left-1/2 w-[100px] -translate-x-1/2 text-center text-[26px] leading-[1.3] font-semibold tracking-[-0.78px] text-ink">
          {centerValue}
        </p>
        <p className="absolute top-[84px] left-1/2 w-[100px] -translate-x-1/2 text-center text-[11px] leading-[1.3] text-ink-2">
          {centerLabel}
        </p>
      </div>
      <DonutLegend slices={slices} total={total} unit={unit} />
    </div>
  );
}

/** The legend beside the ring: each slice's swatch and label, its count in `unit`s and its share. */
function DonutLegend({ slices, total, unit }: { slices: Slice[]; total: number; unit: string }) {
  return (
    <ul className="flex min-w-0 flex-1 flex-col gap-3 overflow-clip">
      {slices.map((s) => (
        <li key={s.label} className="flex w-full items-center gap-[10px]">
          <span aria-hidden className="size-[10px] shrink-0 rounded-[3px]" style={{ background: s.color }} />
          <span className="flex min-w-0 flex-1 flex-col gap-px leading-[1.3] whitespace-nowrap">
            <span className="text-[11.5px] text-ink-2">{s.label}</span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-[13px] font-semibold text-ink">
                {s.count} {unit}
              </span>
              <span className="text-[11px] text-muted-2">{shareOf(s.count, total)}%</span>
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
