"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { useMemo, useSyncExternalStore } from "react";
import { ICONS } from "@/components/icons";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { FORM_CONTROL } from "@/components/portal/styles";
import { CITIES } from "@/lib/portal/cities";
import { deviceTimeZone, timeZoneOptions } from "@/lib/portal/timezones";

const NO_SUBSCRIBE = () => () => {};

/** This device's time zone label, once in the browser (the server's zone would be someone else's). */
export function useDeviceTimeZone(): string {
  return useSyncExternalStore(NO_SUBSCRIBE, deviceTimeZone, () => "");
}

type PickerProps = { value: string; onChange: (label: string) => void; "aria-label"?: string; autoFocus?: boolean };

/**
 * A pick from a long known list, found by typing: the one searchable picker, for time zones and
 * cities. A saved value that isn't in the list any more stays selectable, so nothing is lost.
 */
function SearchPicker({ options, value, onChange, "aria-label": ariaLabel, autoFocus, placeholder, empty }: PickerProps & { options: readonly string[]; placeholder: string; empty: string }) {
  const items = useMemo(() => (value && !options.includes(value) ? [value, ...options] : [...options]), [options, value]);
  return (
    <Combobox items={items} value={value || null} onValueChange={(v) => v && onChange(v as string)}>
      <div className="relative">
        <ComboboxPrimitive.Input aria-label={ariaLabel} autoFocus={autoFocus} placeholder={placeholder} className={`${FORM_CONTROL} pr-10`} />
        <ICONS.chevron size={20} aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-2" />
      </div>
      <ComboboxContent>
        <ComboboxEmpty>{empty}</ComboboxEmpty>
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

/**
 * TB-099 / IN-067 — pick a time zone from every one there is, by typing a city or an offset
 * ("manila", "+8", "gmt-5"). A label saved in winter, now on summer time, stays selectable.
 */
export function TimeZonePicker({ "aria-label": ariaLabel = "Time zone", ...props }: PickerProps) {
  const options = useMemo(() => timeZoneOptions().map((o) => o.label), []);
  return <SearchPicker {...props} aria-label={ariaLabel} options={options} placeholder="Search a city or GMT offset" empty="No time zone matches that." />;
}

/** TB-127 — the company's location, picked from known cities (@/lib/portal/cities) rather than typed. */
export function CityPicker({ "aria-label": ariaLabel = "Location", ...props }: PickerProps) {
  return <SearchPicker {...props} aria-label={ariaLabel} options={CITIES} placeholder="Search a city" empty="No city matches that." />;
}
