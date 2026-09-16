import type { ReactNode } from "react";
import { Button, Checkbox, Input, Select } from "@/components/independent/ui";

export const EXPERIENCE_LEVELS = ["Beginner (0–2 years)", "Intermediate (2–5 years)", "Advanced (5–8 years)", "Expert (8+ years)"];
export const SKILL_OPTIONS = ["Select skills", "Outbound sales", "HubSpot", "Negotiation", "Cold calling"] as const;

export function MarketplaceFilterPanel({
  levels,
  selectedLevels,
  onToggleLevel,
  min,
  max,
  onMinChange,
  onMaxChange,
  skillOptions,
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
  roleTypeSlot?: ReactNode;
  onApply: () => void;
  onReset: () => void;
}) {
  return (
    <aside className="flex w-[280px] shrink-0 flex-col gap-5">
      <h2 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
        Filter
      </h2>
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
        <Select options={skillOptions} />
      </label>
      <div className="flex flex-col gap-2 text-[14px] leading-[1.4] font-medium text-ink">
        Monthly rate (USD)
        <div className="flex gap-2">
          <Input placeholder="Min" inputMode="numeric" value={min} onChange={(event) => onMinChange(event.target.value)} />
          <Input placeholder="Max" inputMode="numeric" value={max} onChange={(event) => onMaxChange(event.target.value)} />
        </div>
      </div>
      <Button variant="primary" size="lg" onClick={onApply}>
        Apply filters
      </Button>
      <Button size="lg" onClick={onReset}>
        Reset filters
      </Button>
    </aside>
  );
}
