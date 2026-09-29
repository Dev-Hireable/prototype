import { Meter, Swatch } from "@/components/portal/meter";
import { STATUS_META, type countsOf } from "@/lib/work/model";

/** The bar fills most-done first; To do is what's left of it, hatched, so it has no colour. */
const FILLED = ["done", "review", "doing"] as const;
const BAR: Record<(typeof FILLED)[number], string> = { done: "var(--color-ok)", review: "var(--color-warn)", doing: "var(--color-primary)" };
/** The key under the bar, in the bar's order. */
const LEGEND = [...FILLED, "todo"] as const;

type Counts = Pick<ReturnType<typeof countsOf>, "total" | (typeof LEGEND)[number]>;

/**
 * A task list's progress, drawn the same wherever it shows — a contract's Overview, its card in
 * All independents and All contracts, and its row there: each status a capsule in its colour,
 * most-done first, and To do the hatched rest.
 */
export function WorkMeter({ counts }: { counts: Counts }) {
  return (
    <Meter
      total={counts.total}
      parts={FILLED.map((s) => ({ value: counts[s], color: BAR[s], label: STATUS_META[s].label }))}
      label={LEGEND.map((s) => `${counts[s]} ${STATUS_META[s].label}`).join(", ")}
    />
  );
}

/**
 * The bar's key, in the bar's order: each status's colour — To do's stripes — and how many are in
 * it. One line on a wide card; `grid` sets it two by two where one line would wrap raggedly.
 */
export function WorkLegend({ counts, grid = false }: { counts: Counts; grid?: boolean }) {
  return (
    <ul className={`text-[12.5px] leading-[1.4] text-ink-2 ${grid ? "grid grid-cols-2 gap-x-4 gap-y-1.5" : "flex flex-wrap gap-x-5 gap-y-1.5"}`}>
      {LEGEND.map((s) => (
        <li key={s} className="flex items-center gap-2">
          <Swatch color={s === "todo" ? undefined : BAR[s]} />
          {STATUS_META[s].label}
          <span className="font-semibold text-ink tabular-nums">{counts[s]}</span>
        </li>
      ))}
    </ul>
  );
}
