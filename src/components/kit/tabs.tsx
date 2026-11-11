"use client";

import { TabsList, Tabs as TabsRoot, TabsTrigger } from "@/components/ui/tabs";

/**
 * Underlined tabs — "Dashboard | Evaluation", "Conversations | Applications". A real tablist
 * (shadcn's Tabs, on Base UI): the arrow keys move between tabs and Enter or Space opens one, so
 * moving focus alone never switches the page.
 */
export function Tabs<T extends string>({ value, onChange, options, className = "", "aria-label": ariaLabel }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string; "aria-label"?: string }) {
  return (
    <TabsRoot value={value} onValueChange={(v) => onChange(v as T)} className="min-w-0 gap-0">
      {/* As tall as its tabs, so the open tab's underline lands on the divider under the row. shadcn's
          own height is scoped (group-data-horizontal/tabs:h-8) and outranked a plain h-auto: the 32px
          list left the 36px tabs hanging 2px below it, the underline under the divider. */}
      {/* A phone scrolls a row of tabs that doesn't fit sideways, rather than cutting the last ones off. */}
      <TabsList variant="line" activateOnFocus={false} aria-label={ariaLabel} className={`h-auto gap-6 rounded-none p-0 group-data-horizontal/tabs:h-auto max-md:max-w-full max-md:justify-start max-md:gap-3.5 max-md:overflow-x-auto max-md:[scrollbar-width:none] ${className}`}>
        {options.map((o) => (
          <TabsTrigger key={o.value} value={o.value} className={UNDERLINE_TAB}>
            {o.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </TabsRoot>
  );
}

/** The look of an underlined tab on shadcn's TabsTrigger: 2px #00a7f8 rule under the open one. */
const UNDERLINE_TAB =
  "h-9 flex-none rounded-none border-0 border-b-2 border-transparent px-0 py-2 text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink-2 shadow-none after:hidden hover:text-ink focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary data-active:border-brand-blue data-active:text-ink";
