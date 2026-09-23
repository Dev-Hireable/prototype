"use client";

import { useState } from "react";
import type { Matcher } from "react-day-picker";
import { ICONS } from "@/components/admin/icons";
import { FORM_CONTROL } from "@/components/portal/styles";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * The design system's date field: shadcn/ui's date picker recipe — its Popover holding its
 * Calendar, both installed with the shadcn CLI into components/ui — behind a trigger styled like
 * every other form field rather than shadcn's outline Button.
 */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * "Tue 6 Jan 2026" — the demo's date format. Built by hand rather than with toLocaleDateString,
 * which varies by browser ("Sept" in en-GB Chrome) and would put a comma in it: an interview's
 * `when` is split on ", " into its date and time.
 */
export const formatDate = (d: Date) => `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
/** yyyy-mm-dd in local time — `toISOString()` is UTC, so near midnight it lands on the wrong day. */
export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** The reverse, also local: `new Date("2026-01-06")` means UTC midnight, the day before west of UTC. */
export function fromISODate(s: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined;
}
export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** An interview's `when` ("Tue 29 Sep 2026, 10:00 AM (PHT)") as its start, read in local time. */
export function interviewStart(when: string): Date | undefined {
  const m = /(\d{1,2}) (\w{3}) (\d{4}), (\d{1,2}):(\d{2}) (AM|PM)/.exec(when);
  const month = m ? MONTHS.indexOf(m[2]) : -1;
  if (!m || month < 0) return undefined;
  const hour = (Number(m[4]) % 12) + (m[6] === "PM" ? 12 : 0);
  return new Date(Number(m[3]), month, Number(m[1]), hour, Number(m[5]));
}

/** An interview whose start hasn't come yet. */
export function isUpcoming(when: string, now = Date.now()) {
  const start = interviewStart(when)?.getTime();
  return start !== undefined && start > now;
}

/** Join call opens 15 minutes before the start and stays open for the hour after it. */
export function canJoin(when: string, now = Date.now()) {
  const start = interviewStart(when)?.getTime();
  return start !== undefined && now >= start - 15 * 60_000 && now <= start + 60 * 60_000;
}

/** A date input: picking a day closes the calendar and hands back a local Date. */
export function DatePicker({
  value,
  onChange,
  placeholder = "Select a date",
  disabled,
  format = formatDate,
  id,
  "aria-label": ariaLabel,
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  /** Days that can't be picked, e.g. `{ before: startOfToday() }`. */
  disabled?: Matcher | Matcher[];
  format?: (d: Date) => string;
  id?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const Icon = ICONS.calendar;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        aria-label={ariaLabel}
        className={`${FORM_CONTROL} flex items-center justify-between gap-2 text-left data-popup-open:border-primary`}
      >
        <span className={`truncate ${value ? "" : "text-ink-2"}`}>{value ? format(value) : placeholder}</span>
        <Icon size={18} aria-hidden className="shrink-0 text-ink-2" />
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
      </PopoverContent>
    </Popover>
  );
}
