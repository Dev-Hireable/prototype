import { Tip } from "@/components/kit/tip";

/**
 * Match pill: one gradient for every score; 0 = grey placeholder.
 * `coded` switches to the TB-012 traffic light — yellow (medium), grey (low) — used on the
 * Discover talent cards where the AC asks for it. The high band keeps the gradient so a strong
 * score looks the same here as on the profile sheet. `title` carries the tooltip explaining
 * what the score is based on. `lg` is the same pill at the profile header's size, beside a 32px name.
 */
export function MatchPill({ pct, coded = false, title, size = "md" }: { pct: number; coded?: boolean; title?: string; size?: "md" | "lg" }) {
  const tone = pct >= 60 ? "edge-glow bg-[#f2c94c] text-[#5c4708]" : "bg-surface-3 text-ink-2";
  const base = `inline-flex items-center rounded leading-[1.2] font-medium tracking-[0.2px] whitespace-nowrap ${size === "lg" ? "h-8 px-3 text-[14px]" : "h-6 px-2 text-[12px]"}`;
  // Trimmed to its capitals, as in the Badge, so the label sits in the pill's middle.
  const label = <span className="trim-to-caps">{pct}% match</span>;
  if (coded && pct && pct < 80) {
    return (
      <Tip label={title}>
        <span className={`${base} ${tone}`}>{label}</span>
      </Tip>
    );
  }
  return (
    <Tip label={title}>
      <span
        className={`${base} ${pct ? "edge-glow text-white" : "bg-surface-3 text-ink-disabled"}`}
        style={pct ? { backgroundImage: "linear-gradient(101.96deg, #afd845 0%, #27ae60 60.58%, #098be2 121.16%)" } : undefined}
      >
        {label}
      </span>
    </Tip>
  );
}
