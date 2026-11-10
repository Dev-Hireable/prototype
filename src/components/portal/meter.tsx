const METER_TRACK = "bg-surface-2";

/**
 * Colored parts share a single track. Its exposed background represents what's left.
 * The optional value sits near the end of the fill, with room to read it at low values.
 */
export function Meter({ parts, total = 100, label, pill, compact = false }: { parts: { value: number; color: string; label: string }[]; total?: number; label: string; pill?: string; compact?: boolean }) {
  const shown = parts.filter((p) => p.value > 0);
  const filled = shown.reduce((n, p) => n + p.value, 0);
  const scale = Math.max(total, filled) || 1;
  const percent = (filled / scale) * 100;
  return (
    <div role="img" aria-label={label} className={`relative flex w-full overflow-hidden rounded-full ${compact ? "h-2" : "h-7"} ${METER_TRACK}`}>
      {shown.map((p, i) => (
        <span
          key={p.label}
          className={`edge-glow shrink-0 motion-safe:transition-[width] motion-safe:duration-500 ${i === shown.length - 1 ? "rounded-r-full" : ""}`}
          style={{ width: `${(p.value / scale) * 100}%`, backgroundColor: p.color }}
        />
      ))}
      {pill !== undefined && (
        <span
          className="pointer-events-none absolute inset-y-1 left-0 flex max-w-full justify-end px-1 motion-safe:transition-[width] motion-safe:duration-500"
          style={{ width: `max(3.5rem, ${percent}%)` }}
        >
          <span className="flex items-center rounded-full bg-white px-2 text-[12px] leading-none font-semibold text-ink tabular-nums shadow-[0_1px_2px_rgba(0,0,0,0.18)]">
            <span className="trim-to-caps">{pill}</span>
          </span>
        </span>
      )}
    </div>
  );
}

/**
 * The thin bar beside a count — "3 of 5 done" on a subtask list, a project, the work summary, a
 * profile's completeness: a 6px grey track and one fill, green by default. `className` sets its
 * width (`w-12`, `flex-1`). With a `label` it's a progressbar of its own; without one it's
 * decoration and the words beside it say the numbers.
 */
export function MiniBar({ value, total, label, fill = "bg-ok", track = "bg-surface-2", className = "w-12" }: { value: number; total: number; label?: string; fill?: string; track?: string; className?: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  const a11y = label ? { role: "progressbar", "aria-label": label, "aria-valuemin": 0, "aria-valuemax": total, "aria-valuenow": value } : { "aria-hidden": true };
  return (
    <span {...a11y} className={`block h-1.5 overflow-hidden rounded-full ${track} ${className}`}>
      <span className={`block h-full rounded-full motion-safe:transition-[width] ${fill}`} style={{ width: `${pct}%` }} />
    </span>
  );
}

/** A bar's key: a part's colour, or the neutral track for what's left. */
export function Swatch({ color }: { color?: string }) {
  return (
    <span
      aria-hidden
      className={`size-2.5 shrink-0 rounded-full ${color ? "" : `${METER_TRACK} ring-1 ring-inset ring-line`}`}
      style={color ? { backgroundColor: color } : undefined}
    />
  );
}

/** Every score in the app wears the match pill's colours: lime at 0, green by 60, turning blue at the top. */
const SCORE = "conic-gradient(#afd845 0%, #27ae60 60.58%, #1497b4 100%)";
const TRACK = "#ececec";
/** The white gap between the score's arc and the grey one, in px round the ring. */
const GAP = 4;

/**
 * One arc of a ring as a mask: a circle's stroke from `from`% to `to`% of the way round, clockwise from
 * 12 o'clock, with round ends — or the whole circle. The dash is short by the stroke, so the round
 * ends land on `from` and `to` rather than past them.
 */
function arcMask(from: number, to: number, size: number, stroke: number) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const len = Math.max(0, ((to - from) / 100) * c - stroke);
  const turn = (((from / 100) * c + stroke / 2) / c) * 360 - 90;
  const dash = to - from >= 100 ? "" : ` stroke-linecap="round" stroke-dasharray="${len} ${c}" transform="rotate(${turn} ${size / 2} ${size / 2})"`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#000" stroke-width="${stroke}"${dash}/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") center / 100% 100% no-repeat`;
}

/**
 * The ring's arcs: the score's up to `v`, then — after a gap — the grey rest, each with round ends;
 * a ring at 0 or 100 is one whole circle. The grey arc is left out when there's no room for its ends.
 */
function arcsOf(v: number, size: number, stroke: number) {
  if (v <= 0) return [{ paint: TRACK, from: 0, to: 100 }];
  if (v >= 100) return [{ paint: SCORE, from: 0, to: 100 }];
  const c = Math.PI * (size - stroke);
  const gap = (GAP / c) * 100;
  const room = ((100 - v - 2 * gap) / 100) * c >= stroke;
  return [{ paint: SCORE, from: 0, to: v }, ...(room ? [{ paint: TRACK, from: v + gap, to: 100 - gap }] : [])];
}

/**
 * A score as a ring — the Trial Fit Score, the match at hire: the score's arc in the score colours and
 * the grey rest, both with round ends, and the number in the middle. It replaces a solid black pill
 * that read as a button rather than a score.
 */
export function ScoreRing({ value, size = 88 }: { value: number; size?: number }) {
  const v = Math.min(100, Math.max(0, value));
  const stroke = Math.round(size / 10);
  const font = Math.round(size * 0.27);
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      {arcsOf(v, size, stroke).map((a) => (
        <span key={a.paint} aria-hidden className="absolute inset-0" style={{ background: a.paint, mask: arcMask(a.from, a.to, size, stroke) }} />
      ))}
      <span className="font-display leading-none font-semibold tracking-[-0.02em] text-ink tabular-nums" style={{ fontSize: font, fontVariationSettings: '"opsz" 14' }}>
        {value}
        <span className="font-medium text-ink-2" style={{ fontSize: Math.round(font * 0.6) }}>
          %
        </span>
      </span>
    </span>
  );
}
