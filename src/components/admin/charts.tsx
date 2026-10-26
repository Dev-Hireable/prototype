import { Tip } from "@/components/portal/tip";
/*
 * Both charts are driven by data:
 *   BarChart  — as wide as its card, 200px tall: a gridline per tick, each month a group of
 *               bars (at most 20px wide, radius 3 top) centred over its label, heights in % of `max`;
 *               the tick values in their own column, so they never sit under a bar.
 *   Donut     — 144×144: three arcs r 62, stroke 16, butt caps,
 *               a 6° gap between segments starting 3° past 12 o'clock.
 */

/* ---------------------------------------------------------------- bars ---- */

export type BarSeries = { label: string; color: string; values: number[] };

const PLOT_H = 200;

/** Where `value` sits up the plot, as a CSS length from its foot. */
const up = (value: number, max: number) => `${(value / max) * 100}%`;

/**
 * Grouped bars across the card's whole width: the tick values in a column of their own on the
 * left, a gridline per tick, and each category's bars side by side, centred over its label.
 * Hovering a bar names its month, series and value.
 */
export function BarChart({ categories, series, max, ticks }: { categories: string[]; series: BarSeries[]; max: number; ticks: number[] }) {
  return (
    <div role="figure" aria-label={series.map((s) => `${s.label}: ${categories.map((c, i) => `${c} ${s.values[i]}`).join(", ")}`).join(". ")} className="flex w-full flex-col gap-2">
      <div className="flex w-full gap-3" style={{ height: PLOT_H }}>
        <div aria-hidden className="relative w-7 shrink-0">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 translate-y-1/2 text-[11px] leading-none whitespace-nowrap text-muted tabular-nums" style={{ bottom: up(t, max) }}>
              {t}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          {ticks.map((t, i) => (
            <div key={t} aria-hidden className={`absolute inset-x-0 h-px ${i === 0 ? "bg-baseline" : "bg-grid"}`} style={{ bottom: up(t, max) }} />
          ))}
          <div className="absolute inset-0 flex items-end">
            {categories.map((cat, i) => (
              <div key={cat} className="flex h-full min-w-0 flex-1 items-end justify-center gap-1 px-1">
                {series.map((s) => (
                  <Tip key={s.label} label={`${cat} · ${s.label}: ${s.values[i]}`}>
                    <div className="max-w-5 min-w-1.5 flex-1 rounded-t-[3px]" style={{ height: up(s.values[i], max), background: s.color }} />
                  </Tip>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* The month names, under their bars: the same columns, past the tick column and its gap. */}
      <div aria-hidden className="flex w-full pl-10">
        {categories.map((cat) => (
          <span key={cat} className="min-w-0 flex-1 text-center text-[11px] leading-[1.45] whitespace-nowrap text-muted">
            {cat}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Each series' swatch and name, in a row: a chart card's heading aside. */
export function Legend({ series }: { series: BarSeries[] }) {
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5">
      {series.map((s) => (
        <span key={s.label} className="flex items-center gap-1.5 text-[11.5px] leading-[1.45] whitespace-nowrap text-muted">
          <span aria-hidden className="size-2 rounded-full" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </span>
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
