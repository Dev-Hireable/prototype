import type { ReactNode } from "react";
import { Button, EmptyState, SearchBox } from "@/components/independent/ui";
import { MarketplaceFilterPanel } from "@/components/portal/filters";
import { Pagination } from "@/components/team/ui";
import { EXPERIENCE_LEVELS, SKILL_OPTIONS } from "@/lib/demo/job-types";
import type { Independent } from "@/lib/team/data";
import type { TalentFilters } from "../_lib/filters";

/**
 * Discover's results — the search, how many matched, a page of cards or the empty state — beside
 * the filter panel. Saved independents is the same screen over the saved list (TB-019).
 */
export function TalentBrowser({ filters, placeholder, count, emptyTitle, card }: { filters: TalentFilters; placeholder: string; count: string; emptyTitle: string; card: (p: Independent) => ReactNode }) {
  const { q, search, results, shown, pages, current, setPage, reset, draft, edit } = filters;
  return (
    <div className="flex items-start gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <SearchBox value={q} onChange={search} placeholder={placeholder} />
        <p className="text-[14px] leading-[1.4] text-ink-2">{count}</p>
        {results.length === 0 ? (
          <EmptyState title={emptyTitle} body="Try removing a filter, clearing the search, or widening the rate range." action={<Button onClick={reset}>Reset filters</Button>} />
        ) : (
          <>
            <div className="flex flex-col gap-3">{shown.map((p) => card(p))}</div>
            <Pagination page={current} pages={pages} onChange={setPage} />
          </>
        )}
      </div>

      <MarketplaceFilterPanel
        levels={EXPERIENCE_LEVELS}
        selectedLevels={draft.levels}
        onToggleLevel={filters.toggleLevel}
        min={draft.min}
        max={draft.max}
        onMinChange={(value) => edit({ min: value })}
        onMaxChange={(value) => edit({ max: value })}
        skillOptions={SKILL_OPTIONS}
        skill={draft.skill}
        onSkillChange={(value) => edit({ skill: value })}
        activeCount={filters.activeCount}
        onApply={filters.apply}
        onReset={reset}
      />
    </div>
  );
}
