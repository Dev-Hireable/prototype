import type { CSSProperties } from "react";

/** What's still to go: fine diagonal stripes on the bar's grey. */
const HATCH = "bg-surface-2 bg-[repeating-linear-gradient(135deg,#dcdcdc_0_2px,transparent_2px_8px)]";
/** Each part is a capsule of its own, at least round, with a white gap between them as the divider. */
const BLOCK = "relative min-w-7 rounded-full motion-safe:transition-[flex-grow] motion-safe:duration-500";
/** How much of the bar the filled part needs before the number fits inside it. */
const FITS = 0.18;

const grow = (value: number): CSSProperties => ({ flexGrow: value, flexBasis: 0 });

/**
 * The one progress bar the cards draw — a contract's Progress, the Trial Fit Score's parts, a
 * settlement's split: thick, each part a capsule in its colour with a white divider after it, and
 * whatever is still to go a hatched capsule. `pill` puts the headline number at the end of the
 * filled part, or at the start of what's left while the filled part is too short to hold it.
 */
export function Meter({ parts, total = 100, label, pill }: { parts: { value: number; color: string; label: string }[]; total?: number; label: string; pill?: string }) {
  const shown = parts.filter((p) => p.value > 0);
  const filled = shown.reduce((n, p) => n + p.value, 0);
  const rest = Math.max(0, total - filled);
  const inside = pill !== undefined && total > 0 && filled / total >= FITS;
  return (
    <div role="img" aria-label={label} className="flex h-7 w-full gap-1">
      {shown.map((p, i) => (
        <span key={p.label} className={BLOCK} style={{ ...grow(p.value), backgroundColor: p.color }}>
          {inside && i === shown.length - 1 && <Pill text={pill} className="right-1" />}
        </span>
      ))}
      {(rest > 0 || filled === 0) && (
        <span className={`${BLOCK} ${HATCH}`} style={grow(rest || 1)}>
          {pill !== undefined && !inside && <Pill text={pill} className="left-1" />}
        </span>
      )}
    </div>
  );
}

/** The number on a bar: a white tab, round like the capsule it sits in, that reads the same on a colour and on the stripes. */
function Pill({ text, className }: { text: string; className: string }) {
  return (
    <span className={`absolute inset-y-1 flex items-center rounded-full bg-white px-2 text-[12px] leading-none font-semibold text-ink tabular-nums shadow-[0_1px_2px_rgba(0,0,0,0.18)] ${className}`}>
      {text}
    </span>
  );
}

/** A bar's key: a part's colour, or — with none — the stripes of what's still to go. */
export function Swatch({ color }: { color?: string }) {
  return (
    <span
      aria-hidden
      className={`size-2.5 shrink-0 rounded-full ${color ? "" : "bg-surface-2 bg-[repeating-linear-gradient(135deg,#c4c4c4_0_1px,transparent_1px_3px)] shadow-[inset_0_0_0_1px_#d6d6d6]"}`}
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
