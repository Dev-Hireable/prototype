"use client";

import { ICONS, type IconName } from "@/components/icons";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ViewOption<T extends string> = { value: T; label: string; icon: IconName };

/**
 * The segmented view switcher — Board / List / Calendar on a contract's work, Grid / List on the
 * contract lists. One look everywhere: an icon and a label, the label dropping to screen readers
 * on a phone. This is the list only, for a switcher whose Tabs root also holds the views.
 */
export function ViewTabsList<T extends string>({ options, label = "Views" }: { options: readonly ViewOption<T>[]; label?: string }) {
  return (
    // 36px, the height of the toolbar controls beside it. The shadcn default's own height is scoped
    // (group-data-horizontal/tabs:h-8) and outranked a plain h-9, so it has to be scoped the same way.
    <TabsList aria-label={label} activateOnFocus={false} className="h-9 p-[3px] group-data-horizontal/tabs:h-9">
      {options.map((o) => {
        const Icon = ICONS[o.icon];
        return (
          <TabsTrigger key={o.value} value={o.value} className="h-full gap-1.5 rounded-md px-3 text-[13px] font-medium text-ink-2 hover:text-ink data-active:text-ink data-active:shadow-sm focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-primary">
            <Icon size={16} aria-hidden /> <span className="max-sm:sr-only">{o.label}</span>
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
}

/** The switcher on its own, for a page that swaps what it draws below. */
export function ViewSwitch<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: readonly ViewOption<T>[]; label?: string }) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as T)} className="gap-0">
      <ViewTabsList options={options} label={label} />
    </Tabs>
  );
}
