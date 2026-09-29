import type { ReactNode } from "react";
import { Button, Checkbox, Input, Select } from "@/components/portal/ui";

export function MarketplaceFilterPanel({
  levels,
  selectedLevels,
  onToggleLevel,
  min,
  max,
  onMinChange,
  onMaxChange,
  skillOptions,
  skill,
  onSkillChange,
  activeCount = 0,
  roleTypeSlot,
  onApply,
  onReset,
}: {
  levels: readonly string[];
  selectedLevels: ReadonlySet<string>;
  onToggleLevel: (level: string) => void;
  min: string;
  max: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  skillOptions: readonly string[];
  skill?: string;
  onSkillChange?: (value: string) => void;
  /** How many filters are currently applied — shown next to the heading (TB-012). */
  activeCount?: number;
  roleTypeSlot?: ReactNode;
  onApply: () => void;
  onReset: () => void;
}) {
  return (
    <aside className="flex w-[280px] shrink-0 flex-col gap-5">
      <FilterHeading activeCount={activeCount} />
      {roleTypeSlot}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[14px] leading-[1.4] font-medium text-ink">Experience level</legend>
        {levels.map((level) => (
          <Checkbox key={level} checked={selectedLevels.has(level)} onChange={() => onToggleLevel(level)}>
            {level}
          </Checkbox>
        ))}
      </fieldset>
      <label className="flex flex-col gap-2 text-[14px] leading-[1.4] font-medium text-ink">
        Skills
        <Select options={skillOptions} value={skill} onChange={(event) => onSkillChange?.(event.target.value)} />
      </label>
      <RateRange min={min} max={max} onMinChange={onMinChange} onMaxChange={onMaxChange} />
      <Button variant="primary" size="lg" onClick={onApply}>
        Apply filters
      </Button>
      <Button size="lg" onClick={onReset}>
        Reset filters
      </Button>
    </aside>
  );
}

/** The panel's heading, with how many filters are applied beside it. */
function FilterHeading({ activeCount }: { activeCount: number }) {
  return (
    <h2 className="flex items-center gap-2 font-display text-[18px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
      Filter
      {/* TB-012: active filters are visually indicated. */}
      {activeCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] leading-none font-semibold text-white">{activeCount}</span>
      )}
    </h2>
  );
}

/** The monthly rate filter: the lowest and the highest rate to show. */
function RateRange({ min, max, onMinChange, onMaxChange }: { min: string; max: string; onMinChange: (value: string) => void; onMaxChange: (value: string) => void }) {
  return (
    <div className="flex flex-col gap-2 text-[14px] leading-[1.4] font-medium text-ink">
      Monthly rate (USD)
      <div className="flex gap-2">
        <Input placeholder="Min" inputMode="numeric" value={min} onChange={(event) => onMinChange(event.target.value)} />
        <Input placeholder="Max" inputMode="numeric" value={max} onChange={(event) => onMaxChange(event.target.value)} />
      </div>
    </div>
  );
}
