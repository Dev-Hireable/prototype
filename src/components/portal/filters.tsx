"use client";

import { useState, useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ICONS } from "@/components/icons";
import { PHONE_FAB, TABLET_FAB } from "@/components/portal/styles";
import { Button, Checkbox, Input, Select } from "@/components/portal/ui";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

type FilterProps = {
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
};

/**
 * The marketplace's filters beside the results on a laptop. Below one there's no room beside them:
 * a floating Filter button in the thumb's corner opens the same fields in a sheet from the bottom
 * edge, and Apply closes it (PhoneFilters).
 */
export function MarketplaceFilterPanel(props: FilterProps) {
  const { activeCount = 0, onApply } = props;
  return (
    <>
      <aside className="flex w-[280px] shrink-0 flex-col gap-5 max-lg:hidden">
        <FilterHeading activeCount={activeCount} />
        <FilterFields {...props} apply={onApply} />
      </aside>
      <PhoneFilters activeCount={activeCount} onApply={onApply} fields={(apply) => <FilterFields {...props} apply={apply} />} />
    </>
  );
}

/** The fields themselves, then Apply (`apply`, which on a phone also closes the sheet) and Reset. */
function FilterFields({ levels, selectedLevels, onToggleLevel, min, max, onMinChange, onMaxChange, skillOptions, skill, onSkillChange, roleTypeSlot, onReset, apply }: FilterProps & { apply: () => void }) {
  return (
    <>
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
      <Button variant="primary" size="lg" onClick={apply}>
        Apply filters
      </Button>
      <Button size="lg" onClick={onReset}>
        Reset filters
      </Button>
    </>
  );
}

/** Below a laptop: the floating Filter button, with the count of filters on, and the sheet it opens. */
function PhoneFilters({ activeCount, onApply, fields }: { activeCount: number; onApply: () => void; fields: (apply: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Floating>
        <Button variant="primary" onClick={() => setOpen(true)} className={`lg:hidden ${PHONE_FAB} ${TABLET_FAB}`}>
          <ICONS.filter size={20} aria-hidden /> Filter
          {activeCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] leading-none font-semibold text-primary">{activeCount}</span>}
        </Button>
      </Floating>
      <Sheet side="bottom" open={open} onOpenChange={setOpen}>
        <SheetContent className="mx-auto max-h-[85dvh] max-w-[560px] gap-5 overflow-y-auto px-4 pt-5 pb-[calc(1rem+env(safe-area-inset-bottom))] md:px-6">
          <SheetTitle render={<FilterHeading activeCount={activeCount} />} />
          {fields(() => {
            onApply();
            setOpen(false);
          })}
        </SheetContent>
      </Sheet>
    </>
  );
}

const NOOP_SUBSCRIBE = () => () => {};

/**
 * A floating button, portalled to <body>: in the page it sat inside the scroller, whose edge fade
 * (and clipping) washed out its shadow on a tablet. Nothing until the page is in the browser.
 */
function Floating({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(NOOP_SUBSCRIBE, () => true, () => false);
  return mounted ? createPortal(children, document.body) : null;
}

/** The panel's heading, with how many filters are applied beside it. It takes the sheet's title props on a phone. */
function FilterHeading({ activeCount, ...props }: { activeCount: number } & ComponentProps<"h2">) {
  return (
    <h2 {...props} className="flex items-center gap-2 font-display text-[18px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
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
