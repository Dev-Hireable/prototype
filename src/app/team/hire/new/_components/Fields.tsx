import { useId, useState, type ReactNode } from "react";
import { MdAdd, MdAttachMoney, MdOutlineCalendarToday, MdOutlineSchedule, MdRemove } from "react-icons/md";
import { Checkbox, Chip, Input, Textarea } from "@/components/independent/ui";
import { hoursLabel, PART_TIME_HOURS } from "@/lib/demo/job-types";
import { formatMoney, settleMoney } from "@/lib/portal/money";
import { BENEFITS, CHIP_TONES } from "../_lib/wizard";

/** Field block: 16px semibold label, 16px gap, optional 12px helper row (left text · counter). */
/** A plain group rather than a <label>: a label forwards clicks anywhere in it (heading, helper
 *  row, blank space) to the control inside, which popped dropdowns open from outside them. */
export function Block({ label, helper, children }: { label: string; helper?: [string, string]; children: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={label ? id : undefined} className="flex flex-col gap-4">
      {label && <span id={id} className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">{label}</span>}
      <span className="flex flex-col gap-2">
        {children}
        {helper && (
          <span className="flex justify-between text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
            <span>{helper[0]}</span>
            <span>{helper[1]}</span>
          </span>
        )}
      </span>
    </div>
  );
}

function Money({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="flex flex-1 flex-col gap-2">
      {label && <span className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{label}</span>}
      <span className="relative block">
        <MdAttachMoney size={16} aria-hidden className="pointer-events-none absolute top-3.5 left-4 text-ink" />
        <Input
          value={value}
          onChange={(e) => {
            // Re-place the caret by how many digits/dots sit before it, so inserted commas don't make it jump.
            const el = e.target;
            const before = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/[^0-9.]/g, "").length;
            const next = formatMoney(el.value);
            onChange(next);
            requestAnimationFrame(() => {
              let pos = 0;
              for (let seen = 0; pos < next.length && seen < before; pos++) if (/[0-9.]/.test(next[pos])) seen++;
              el.setSelectionRange(pos, pos);
            });
          }}
          onBlur={() => onChange(settleMoney(value))}
          placeholder="0.00"
          inputMode="decimal"
          disabled={disabled}
          className="!pl-10"
        />
      </span>
    </label>
  );
}

/** The monthly range: a minimum and a maximum, /month. */
export function MoneyRange({ min, max, onMin, onMax }: { min: string; max: string; onMin: (v: string) => void; onMax: (v: string) => void }) {
  return (
    <div className="flex w-[533px] items-end gap-4">
      <Money label="Minimum" value={min} onChange={onMin} />
      <span aria-hidden className="mb-[22px] h-px w-6 bg-border" />
      <Money label="Maximum" value={max} onChange={onMax} />
      <span className="flex h-12 w-[51px] items-center justify-center text-[16px] leading-[1.5] tracking-[0.2px] text-ink">/month</span>
    </div>
  );
}

/** The trial's length, or when the role starts: one chip per option. */
export function DurationChips({ chips, value, onChange }: { chips: readonly string[]; value: number; onChange: (chip: number) => void }) {
  return (
    <div className="flex gap-4">
      {chips.map((c, i) => (
        <DateChip key={c} tone={CHIP_TONES[i]} selected={value === i} onClick={() => onChange(i)}>
          {c}
        </DateChip>
      ))}
    </div>
  );
}

/** A part-time role's hours a week, as the same chips as the start timing (a clock in place of the calendar). */
export function HoursChips({ value, onChange }: { value: number; onChange: (hours: number) => void }) {
  return (
    <div className="flex gap-4">
      {PART_TIME_HOURS.map((h, i) => (
        <DateChip key={h} tone={CHIP_TONES[i]} selected={value === h} onClick={() => onChange(h)} icon="clock">
          {hoursLabel(h)}
        </DateChip>
      ))}
    </div>
  );
}

export function DateChip({ children, tone, selected, onClick, icon = "calendar" }: { children: ReactNode; tone: string; selected?: boolean; onClick?: () => void; icon?: "calendar" | "clock" }) {
  const Icon = icon === "clock" ? MdOutlineSchedule : MdOutlineCalendarToday;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-pressed={onClick ? !!selected : undefined}
      className={`flex h-11 items-center gap-2 rounded-lg border px-4 text-[14px] leading-[1.2] tracking-[0.2px] transition-colors ${
        selected ? "border-primary bg-accent-bg font-semibold text-accent-ink ring-1 ring-primary" : "border-border bg-white text-ink enabled:hover:border-[#a6a6a6] enabled:hover:bg-surface-alt"
      }`}
    >
      <Icon size={16} aria-hidden className={tone} /> {children}
    </button>
  );
}

/**
 * What sits beside a trial's tasks: optional notes (what used to be all of Trial Expectations) and a
 * link. Both optional, so they stay folded behind one link until wanted — open from the start when
 * a draft already has either.
 */
export function TrialNotes({
  expectation,
  onExpectation,
  attachment,
  onAttachment,
  placeholder,
  hint,
}: {
  expectation: string;
  onExpectation: (v: string) => void;
  attachment: string;
  onAttachment: (v: string) => void;
  placeholder: string;
  hint: string;
}) {
  const [open, setOpen] = useState(!!(expectation || attachment));
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 self-start rounded-md text-[13px] font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">
        <MdAdd size={16} aria-hidden /> Add notes or a link for the Independent
      </button>
    );
  return (
    <>
      <label className="flex flex-col gap-2">
        <span className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Notes (Optional)</span>
        <Textarea autoFocus={!expectation && !attachment} value={expectation} maxLength={500} onChange={(e) => onExpectation(e.target.value)} placeholder={placeholder} className="!h-[96px] resize-none" />
        <span className="flex justify-end text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">{expectation.length} / 500</span>
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Attachments (Optional)</span>
        <Input value={attachment} onChange={(e) => onAttachment(e.target.value)} placeholder="Add a link to a Loom, Google Doc, YouTube video, or anything that helps." />
        <span className="text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">{hint}</span>
      </label>
    </>
  );
}

export function SkillChips({ skills, onRemove }: { skills: string[]; onRemove?: (skill: string) => void }) {
  if (skills.length === 0) return onRemove ? null : <span className="text-[14px] text-ink-2">No skills added.</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((s) => (
        <Chip key={s} size="sm" onRemove={onRemove && (() => onRemove(s))}>
          {s}
        </Chip>
      ))}
    </div>
  );
}

export function Counter({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex h-11 w-max items-center overflow-hidden rounded-lg border border-border bg-white">
      <button type="button" aria-label="Fewer" onClick={() => onChange(Math.max(1, value - 1))} className="flex size-11 items-center justify-center text-ink">
        <MdRemove size={18} aria-hidden />
      </button>
      <span className="flex h-11 w-16 items-center justify-center border-x border-border text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{value}</span>
      <button type="button" aria-label="More" onClick={() => onChange(value + 1)} className="flex size-11 items-center justify-center text-ink">
        <MdAdd size={18} aria-hidden />
      </button>
    </div>
  );
}

/** TB-024 benefit rows: a checkbox per benefit, its monthly amount enabled once ticked. */
export function BenefitsEditor({ value, onChange }: { value: Record<string, string>; onChange: (next: Record<string, string>) => void }) {
  return (
    <>
      {BENEFITS.map((b) => {
        const on = b in value;
        return (
          <div key={b} className="flex w-[533px] items-center gap-4">
            <Checkbox
              checked={on}
              onChange={() => {
                const next = { ...value };
                if (on) delete next[b];
                else next[b] = "";
                onChange(next);
              }}
              className="flex-1"
            >
              {b}
            </Checkbox>
            <Money label="" value={value[b] ?? ""} onChange={(v) => onChange({ ...value, [b]: v })} disabled={!on} />
            <span className="flex h-12 w-[51px] items-center text-[14px] leading-[1.5] tracking-[0.2px] text-ink-2">/month</span>
          </div>
        );
      })}
    </>
  );
}
