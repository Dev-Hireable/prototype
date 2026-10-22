"use client";

import { Field, Select } from "@/components/portal/ui";
import { DatePicker } from "@/components/portal/date-picker";
import { formatDate, INTERVIEW_TIMES, startOfToday } from "@/lib/portal/dates";
import { effectiveTimeZone } from "@/lib/portal/timezones";
import { useTeamAccount } from "@/lib/team/account";
import { byName } from "@/lib/team/data";
import { slotForTeam } from "@/lib/team/pipeline";

/**
 * An interview slot's date and time, side by side, both required. Any day from today can be picked,
 * weekends included; the times are in the Team Builder's own clock (SlotClock says whose).
 */
export function SlotFields({ date, time, setDate, setTime }: { date: Date | undefined; time: string; setDate: (date: Date | undefined) => void; setTime: (time: string) => void }) {
  return (
    <div className="flex gap-3">
      {/* It was a free-text box, so anything typed became the interview date. Past days can't be picked. */}
      <Field label="Date" required className="flex-1">
        <DatePicker value={date} onChange={setDate} disabled={{ before: startOfToday() }} placeholder="Pick a date" />
      </Field>
      <Field label="Time" required className="flex-1">
        <Select required options={["", ...INTERVIEW_TIMES]} placeholder="Pick a time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
    </div>
  );
}

/**
 * #326 / #272 — under the slot: the Team Builder's clock until a slot is picked, then the slot in
 * both clocks ("Tue 29 Sep, 10:00 AM your time · 10:00 PM Juan's time"). `offset` is the clock the
 * slot is in: the Team Builder's, or the talent's for the time they asked for.
 */
export function SlotClock({ date, time, offset, independent }: { date: Date | undefined; time: string; offset: number; independent: string }) {
  const { profile } = useTeamAccount();
  const first = byName(independent).name.split(" ")[0];
  const picked = date && time ? slotForTeam(`${formatDate(date)}, ${time}`, offset, independent) : undefined;
  return (
    <p className="text-[13px] leading-[1.4] tracking-[0.2px] text-ink-2">
      {picked ? `${picked}. ` : `Times are in your time zone, ${effectiveTimeZone(profile.timezone)}. `}
      {first} sees this in their own time.
    </p>
  );
}
