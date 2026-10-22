"use client";

import type { ReactElement, ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * The app's tooltip: shadcn's (Base UI) in place of the browser's `title` bubble, which is
 * unstyled, waits about a second, and never appears on a disabled button — the one place the app
 * explains itself most ("Waiting for Juan to confirm the interview").
 *
 * `children` is the trigger. A disabled control gets no mouse events, so for one of those (`wrap`)
 * the trigger is a span around it: the control is made transparent to the pointer so the span is
 * what's hovered, and the span shows the not-allowed cursor and carries whatever lays the control
 * out (`wrapClassName` — `w-full`, `flex-1`, …) so it sits where the control did.
 *
 * `off` silences the tip but keeps the trigger mounted, for a control that only needs it some of the
 * time and must not be swapped for a new element when that changes (a sidebar link mid-morph).
 */
export function Tip({
  label,
  children,
  side = "top",
  wrap = false,
  wrapClassName = "",
  off = false,
}: {
  label?: ReactNode;
  children: ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  wrap?: boolean;
  wrapClassName?: string;
  off?: boolean;
}) {
  if (!label) return children;
  // Keyed on the trigger's shape: a control that turns disabled (or back) while the page is open
  // swaps the button for the span, and a tooltip kept across that swap never opens again unless it
  // had opened before. The control remounts at that point anyway, as it moves in or out of the span.
  return (
    <Tooltip key={wrap ? "wrapped" : "direct"} disabled={off}>
      {wrap ? (
        <TooltipTrigger render={<span className={`inline-flex cursor-not-allowed [&>*]:pointer-events-none ${wrapClassName}`} />}>{children}</TooltipTrigger>
      ) : (
        <TooltipTrigger render={children} />
      )}
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * A small info button beside a line that keeps the longer explanation out of it: keyboard
 * shortcuts, how a number is worked out, what a colour means. `about` names it for screen readers
 * ("About the timeline").
 */
export function InfoTip({ label, about, side = "top" }: { label: ReactNode; about: string; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Tip label={label} side={side}>
      <button type="button" aria-label={`About ${about}`} className="inline-flex size-5 shrink-0 items-center justify-center rounded-full align-middle text-ink-2 hover:bg-surface-2">
        <ICONS.info size={13} aria-hidden />
      </button>
    </Tip>
  );
}
