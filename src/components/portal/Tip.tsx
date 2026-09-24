"use client";

import type { ReactElement, ReactNode } from "react";
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
  return (
    <Tooltip disabled={off}>
      {wrap ? (
        <TooltipTrigger render={<span className={`inline-flex cursor-not-allowed [&>*]:pointer-events-none ${wrapClassName}`} />}>{children}</TooltipTrigger>
      ) : (
        <TooltipTrigger render={children} />
      )}
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

/** The classes in a control's className that place it in its parent, for the span that wraps it. */
export const layoutClasses = (className: string) =>
  className
    .split(/\s+/)
    .filter((c) => /^(w-full|flex-1|grow|shrink-0|self-\S+|w-\[.+\])$/.test(c))
    .join(" ");
