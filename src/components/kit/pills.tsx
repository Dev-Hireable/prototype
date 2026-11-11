"use client";

import type { ReactNode } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/**
 * Rounded pill tabs — "Upcoming (2) / Past (3)", "All / Unread / …", List / Board. One is
 * always chosen: shadcn's ToggleGroup underneath (arrow keys move between them), drawn as pills.
 */
/**
 * A filter row's pills are small; a choice a form turns on (Full-time or Part-time) is a button's
 * height. A phone keeps a row of filters on one line it scrolls sideways, as its chips do elsewhere,
 * rather than wrapping them onto a second and third line above what they filter; a touch screen
 * draws the small ones a little taller, for a finger.
 */
const PILL_SIZE = { sm: "h-auto px-3 py-1.5 text-[13px] pointer-coarse:py-2", lg: "h-10 px-5 text-[14px]" } as const;

const PILL_ROW = { sm: "flex-wrap max-md:max-w-full max-md:flex-nowrap max-md:overflow-x-auto", lg: "flex-wrap gap-2" } as const;

export function Pills<T extends string>({ value, onChange, options, size = "sm", "aria-label": ariaLabel }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; size?: keyof typeof PILL_SIZE; "aria-label"?: string }) {
  return (
    <ToggleGroup value={[value]} onValueChange={(next) => next[0] && onChange(next[0] as T)} aria-label={ariaLabel} className={PILL_ROW[size]}>
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className={`${PILL_SIZE[size]} gap-1.5 rounded-full bg-surface-2 leading-[1.4] font-medium text-ink hover:bg-surface-3 aria-pressed:bg-primary aria-pressed:text-white aria-pressed:hover:bg-primary aria-pressed:hover:text-white`}
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
