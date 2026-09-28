import type { ReactNode } from "react";

/**
 * The one badge. Every pill in the portals and admin (statuses, job types, durations) is this
 * box, so any two sit level beside each other: 24 tall, px 8, radius 4, Inter Medium 12, a 14px
 * icon slot. Every variant carries a 1px border (transparent unless `outline`), so an outlined
 * badge is the same size as a filled one rather than a pixel off.
 *
 *   tint     status: tinted fill, coloured text (StatusDot, admin's Badge)
 *   solid    category: brand fill, white text (JobBadge)
 *   outline  a plain fact: white fill, grey border (a duration, a date)
 */
export type BadgeTone = "ok" | "warn" | "danger" | "info" | "neutral" | "accent" | "trial" | "full-time" | "part-time";
/** A status's colour — every tone but the job types'. The one Tone for status data, portals and admin. */
export type Tone = Exclude<BadgeTone, "full-time" | "part-time">;
export type BadgeVariant = "tint" | "solid" | "outline";

const TINT: Record<BadgeTone, string> = {
  ok: "bg-[#eef9f2] text-ok",
  warn: "bg-warn-bg text-warn",
  danger: "bg-[#fcf2f2] text-danger",
  info: "bg-[#ebf8fe] text-brand-blue",
  neutral: "bg-surface-2 text-ink-2",
  accent: "bg-accent-bg text-accent",
  trial: "bg-[#fff5ec] text-brand-orange",
  "full-time": "bg-[#ebf8fe] text-brand-blue",
  "part-time": "bg-[#ffe5f6] text-brand-magenta",
};

/* Solid fills in the logo's own colours for the job types. White on them is under the 4.5:1 AA
   minimum for 12px text (orange 2.5:1, blue 2.7:1, magenta 3.3:1); asked for regardless. */
const SOLID: Record<BadgeTone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  danger: "bg-danger",
  info: "bg-brand-blue",
  neutral: "bg-ink-2",
  accent: "bg-accent",
  trial: "bg-brand-orange",
  "full-time": "bg-brand-blue",
  "part-time": "bg-brand-magenta",
};

export function Badge({
  children,
  tone = "neutral",
  variant = "tint",
  icon,
  caps = false,
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  variant?: BadgeVariant;
  /** A 14px glyph before the label. */
  icon?: ReactNode;
  /** Uppercase, for the job-type badges. */
  caps?: boolean;
  className?: string;
}) {
  const look =
    variant === "outline" ? "border-[#c3c3c3] bg-white text-ink" : variant === "solid" ? `border-transparent text-white ${SOLID[tone]}` : `border-transparent ${TINT[tone]}`;
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1 rounded border px-2 text-[12px] leading-none font-medium tracking-[0.2px] whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0 ${caps ? "uppercase" : ""} ${look} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
