"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { useMemo } from "react";
import { ICONS } from "@/components/icons";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { FORM_CONTROL } from "@/components/portal/styles";
import { timeZoneOptions } from "@/lib/portal/timezones";

/**
 * TB-099 / IN-067 — pick a time zone from every one there is, by typing a city or an offset
 * ("manila", "+8", "gmt-5"). It replaced a three-item list. A saved label that isn't in today's
 * list (a zone saved in winter, now on summer time) stays selectable, so nothing is lost.
 */
export function TimeZonePicker({ value, onChange, "aria-label": ariaLabel = "Time zone", autoFocus }: { value: string; onChange: (label: string) => void; "aria-label"?: string; autoFocus?: boolean }) {
  const items = useMemo(() => {
    const all = timeZoneOptions().map((o) => o.label);
    return value && !all.includes(value) ? [value, ...all] : all;
  }, [value]);
  return (
    <Combobox items={items} value={value || null} onValueChange={(v) => v && onChange(v as string)}>
      <div className="relative">
        <ComboboxPrimitive.Input aria-label={ariaLabel} autoFocus={autoFocus} placeholder="Search a city or GMT offset" className={`${FORM_CONTROL} pr-10`} />
        <ICONS.chevron size={20} aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-2" />
      </div>
      <ComboboxContent>
        <ComboboxEmpty>No time zone matches that.</ComboboxEmpty>
        <ComboboxList>
          {(label: string) => (
            <ComboboxItem key={label} value={label}>
              {label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
