"use client";

import { useState, type ReactNode, type Ref } from "react";
import type { Matcher } from "react-day-picker";
import { ICONS } from "@/components/admin/icons";
import { FORM_CONTROL } from "@/components/portal/styles";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/demo/dates";

/**
 * The design system's date field: shadcn/ui's date picker recipe — its Popover holding its
 * Calendar, both installed with the shadcn CLI into components/ui — behind a trigger styled like
 * every other form field rather than shadcn's outline Button.
 */

/* Its date helpers — formatDate, isoDay, fromISODate, startOfToday — live in @/lib/demo/dates. */

/**
 * A date input: picking a day closes the calendar and hands back a local Date. It is a form field
 * by default; pass `children` (with `triggerClassName`) for a compact control that shows its own
 * face instead — the task list's due dates — and `clearLabel` to offer clearing the date. `ref` is
 * the trigger, the control that takes the focus.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Select a date",
  disabled,
  format = formatDate,
  id,
  "aria-label": ariaLabel,
  children,
  triggerClassName,
  clearLabel,
  ref,
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  /** Days that can't be picked, e.g. `{ before: startOfToday() }`. */
  disabled?: Matcher | Matcher[];
  format?: (d: Date) => string;
  id?: string;
  "aria-label"?: string;
  /** The trigger's face, in place of the field's formatted date and icon. */
  children?: ReactNode;
  triggerClassName?: string;
  /** Shows a clear action under the calendar, e.g. "Clear due date". */
  clearLabel?: string;
  ref?: Ref<HTMLButtonElement>;
}) {
  const [open, setOpen] = useState(false);
  const clear = () => {
    onChange(undefined);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger ref={ref} id={id} aria-label={ariaLabel} className={children ? triggerClassName : `${FORM_CONTROL} flex items-center justify-between gap-2 text-left data-popup-open:border-primary`}>
        {children ?? <FieldFace value={value} format={format} placeholder={placeholder} />}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          disabled={disabled}
          autoFocus
          // Clicking the chosen day again would clear it; in a form field it just closes.
          onSelect={(d) => {
            if (d) onChange(d);
            setOpen(false);
          }}
          // The form's density and corners: 36px days to sit with 44px fields (shadcn's are 28px),
          // rounded like every other control (8px, not 6px).
          className="p-3 [--cell-radius:var(--radius-lg)] [--cell-size:--spacing(9)]"
        />
        {clearLabel && value && <ClearDate label={clearLabel} onClear={clear} />}
      </PopoverContent>
    </Popover>
  );
}

/** The field's own face: the picked date (or the placeholder, muted) and the calendar icon. */
function FieldFace({ value, format, placeholder }: { value: Date | undefined; format: (d: Date) => string; placeholder: string }) {
  const Icon = ICONS.calendar;
  return (
    <>
      <span className={`truncate ${value ? "" : "text-ink-2"}`}>{value ? format(value) : placeholder}</span>
      <Icon size={18} aria-hidden className="shrink-0 text-ink-2" />
    </>
  );
}

/** Under the calendar, when the date can be cleared: the action that clears it. */
function ClearDate({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <div className="border-t border-border p-1.5">
      <button type="button" onClick={onClear} className="w-full rounded-md px-2.5 py-2 text-left text-[14px] leading-[1.2] text-ink hover:bg-surface-2">
        {label}
      </button>
    </div>
  );
}
