import { useId, type ReactNode } from "react";
import { MdAdd, MdAttachMoney, MdOutlineCalendarToday, MdOutlineSchedule, MdRemove } from "react-icons/md";
import { Checkbox, Chip, Input, Textarea } from "@/components/portal/ui";
import { hoursLabel, PART_TIME_HOURS } from "@/lib/contract/job-types";
import { formatMoney, settleMoney } from "@/lib/portal/money";
import { BENEFITS, CHIP_TONES } from "../_lib/wizard";

/** A required field's mark after its label, as Field draws it: a red asterisk, hidden from screen readers (the control says it's required). */
export function Required() {
  return (
    <span aria-hidden className="text-danger">
      {" *"}
    </span>
  );
}

/** Field block: 16px semibold label, 16px gap, optional 12px helper row (left text · counter). */
/** A plain group rather than a <label>: a label forwards clicks anywhere in it (heading, helper
 *  row, blank space) to the control inside, which popped dropdowns open from outside them. */
export function Block({ label, helper, required = false, children }: { label: string; helper?: [string, string]; /** Marks the label with an asterisk, so a disabled Next says what it waits on. */ required?: boolean; children: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={label ? id : undefined} className="flex flex-col gap-4">
      {label && (
        <span id={id} className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">
          {label}
          {required && <Required />}
        </span>
      )}
      <span className="flex flex-col gap-2">
        {children}
        {helper && (
          // The count keeps to one line; a long hint beside it on a phone wraps instead.
          <span className="flex justify-between gap-4 text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
            <span>{helper[0]}</span>
            <span className="whitespace-nowrap">{helper[1]}</span>
          </span>
        )}
      </span>
    </div>
  );
}

function Money({ label, value, onChange, disabled, required }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; required?: boolean }) {
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
          required={required}
          className="!pl-10"
        />
      </span>
    </label>
  );
}

/**
 * The pay range: a minimum and a maximum, both required, with its unit after them: "/month" on a
 * full-time or part-time role, none on a trial, whose range is for the whole trial.
 */
export function MoneyRange({ min, max, onMin, onMax, unit }: { min: string; max: string; onMin: (v: string) => void; onMax: (v: string) => void; unit?: string }) {
  return (
    <div className="flex w-[533px] max-w-full items-end gap-4">
      <Money label="Minimum" value={min} onChange={onMin} required />
      <span aria-hidden className="mb-[22px] h-px w-6 bg-border" />
      <Money label="Maximum" value={max} onChange={onMax} required />
      {unit && <span className="flex h-12 w-[51px] items-center justify-center text-[16px] leading-[1.5] tracking-[0.2px] text-ink">{unit}</span>}
    </div>
  );
}

/** The trial's length, or when the role starts: one chip per option, each reading as `label` says ("30 working days"). */
export function DurationChips({ chips, label, value, onChange }: { chips: readonly string[]; label: (chip: string) => string; value: number; onChange: (chip: number) => void }) {
  return (
    <div className="flex flex-wrap gap-4">
      {chips.map((c, i) => (
        <DateChip key={c} tone={CHIP_TONES[i]} selected={value === i} onClick={() => onChange(i)}>
          {label(c)}
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
 * What sits beside a trial's tasks: free-text notes (what used to be all of Trial Expectations),
 * with the link under them. Both optional and both shown from the start: folded behind a link,
 * they read as an extra no one would open.
 */
export function TrialNotes({
  expectation,
  onExpectation,
  attachment,
  onAttachment,
  copy,
}: {
  expectation: string;
  onExpectation: (v: string) => void;
  attachment: string;
  onAttachment: (v: string) => void;
  /** The notes' placeholder (a reminder not to paste credentials) and who sees them, and the link's hint. */
  copy: { notesPlaceholder: string; notesHint: string; linkHint: string };
}) {
  return (
    <>
      <label className="flex flex-col gap-2">
        <span className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Notes (Optional)</span>
        <Textarea value={expectation} maxLength={500} onChange={(e) => onExpectation(e.target.value)} placeholder={copy.notesPlaceholder} className="!h-[96px] resize-none" />
        <span className="flex justify-between gap-4 text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
          <span>{copy.notesHint}</span>
          <span className="whitespace-nowrap">{expectation.length} / 500</span>
        </span>
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Attachment link (Optional)</span>
        <Input value={attachment} onChange={(e) => onAttachment(e.target.value)} placeholder="Add a link to a Loom, Google Doc, YouTube video, or anything that helps." />
        <span className="text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">{copy.linkHint}</span>
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
