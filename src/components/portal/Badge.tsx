import type { ReactNode } from "react";

/**
 * The one badge. Every pill in the portals and admin (statuses, job types, durations) is this
 * box, so any two sit level beside each other: 24 tall, px 8, radius 4, Inter Medium 12, a 14px
 * icon slot. Every variant carries a 1px border (transparent unless `outline`), so an outlined
 * badge is the same size as a filled one rather than a pixel off.
 *
 *   tint     a status or a category: tinted fill, coloured text (StatusDot, JobBadge, admin's Badge)
 *   outline  a plain fact: white fill, grey border (a duration, a date)
 *
 * The job types were solid brand fills with white text until 2026-09-28, when they moved to tints
 * like everything else: the solid badge was the loudest thing on every card it sat on.
 */
export type BadgeTone = "ok" | "warn" | "danger" | "info" | "neutral" | "accent" | "trial" | "full-time" | "part-time";
/** A status's colour — every tone but the job types'. The one Tone for status data, portals and admin. */
export type Tone = Exclude<BadgeTone, "full-time" | "part-time">;
export type BadgeVariant = "tint" | "outline";

/* The job types keep their logo hues — trial orange, full-time blue, part-time magenta — deepened
   for the text, since the logo's own orange, blue and magenta read at under 3:1 on their tints. */
const TINT: Record<BadgeTone, string> = {
  ok: "bg-[#eef9f2] text-ok",
  warn: "bg-warn-bg text-warn",
  danger: "bg-[#fcf2f2] text-danger",
  info: "bg-[#ebf8fe] text-brand-blue",
  neutral: "bg-surface-2 text-ink-2",
  accent: "bg-accent-bg text-accent",
  trial: "bg-[#fff3e8] text-[#b04e00]",
  "full-time": "bg-[#e9f6fe] text-[#006fa8]",
  "part-time": "bg-[#ffe8f7] text-[#b3008a]",
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
  const look = variant === "outline" ? "border-[#c3c3c3] bg-white text-ink" : `border-transparent ${TINT[tone]}`;
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1 rounded border px-2 text-[12px] leading-none font-medium tracking-[0.2px] whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0 ${caps ? "uppercase" : ""} ${look} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
