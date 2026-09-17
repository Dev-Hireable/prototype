"use client";

import { useState } from "react";
import { RoleCard } from "@/components/independent/RoleCard";
import { Pagination } from "@/components/team/ui";
import { Button, Checkbox, EmptyState, Page, SearchBox } from "@/components/independent/ui";
import { EXPERIENCE_LEVELS, MarketplaceFilterPanel, SKILL_OPTIONS } from "@/components/portal/filters";
import { roles } from "@/lib/independent/data";

const PER_PAGE = 8;

const DEFAULT = { trial: true, fullTime: true, levels: new Set(EXPERIENCE_LEVELS), min: "", max: "" };
const INITIAL_DRAFT = { ...DEFAULT, levels: new Set(EXPERIENCE_LEVELS.slice(1, 3)) };

/** Figma "Job Board / Discover roles · browse / · no results": results (gap 16) + 280px filter column, content gap 24. */
export default function Discover() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState(INITIAL_DRAFT);
  const [applied, setApplied] = useState(DEFAULT);

  const rate = (r: string) => Number(r.replace(/[^0-9]/g, ""));
  const results = roles.filter((r) => {
    const text = `${r.title} ${r.company} ${r.skills.join(" ")}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;
    if (r.type === "trial" && !applied.trial) return false;
    if (r.type === "full-time" && !applied.fullTime) return false;
    if (!applied.levels.has(r.level)) return false;
    const v = rate(r.rate);
    if (applied.min && v < Number(applied.min)) return false;
    if (applied.max && v > Number(applied.max)) return false;
    return true;
  });

  /** A screenful of role cards; below this the pager disappears. */
  const pages = Math.max(1, Math.ceil(results.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = results.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  const reset = () => {
    setDraft(DEFAULT);
    setApplied(DEFAULT);
    setQ("");
  };
  const toggleLevel = (l: string) =>
    setDraft((d) => {
      const levels = new Set(d.levels);
      if (levels.has(l)) levels.delete(l);
      else levels.add(l);
      return { ...d, levels };
    });

  return (
    <Page title="Discover roles" heading="default">
      <div className="flex items-start gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <SearchBox value={q} onChange={setQ} placeholder="Search by title, company or skill" />
          {/* The real count. It used to add a flat 37 to whatever was on screen. */}
          <p className="text-[14px] leading-[1.4] text-ink-2">{results.length === 1 ? "1 open role" : `${results.length} open roles`}</p>
          {results.length === 0 ? (
            <EmptyState
              title="No roles match these filters"
              body="Try removing a filter, clearing the search, or widening the rate range."
              action={<Button onClick={reset}>Reset filters</Button>}
            />
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {shown.map((r) => (
                  <RoleCard key={r.slug} role={r} />
                ))}
              </div>
              {/* The real control: page numbers come from the result count, and it hides itself
                  when everything fits. This was a hardcoded "1 2 3 … 9" over five roles, with
                  buttons that did nothing and every result rendered above it regardless. */}
              <Pagination page={current} pages={pages} onChange={setPage} />
            </>
          )}
        </div>

        <MarketplaceFilterPanel
          roleTypeSlot={
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-[14px] leading-[1.4] font-medium text-ink">Role type</legend>
              <Checkbox checked={draft.trial} onChange={(value) => setDraft((d) => ({ ...d, trial: value }))}>Trial (30 days)</Checkbox>
              <Checkbox checked={draft.fullTime} onChange={(value) => setDraft((d) => ({ ...d, fullTime: value }))}>Full-time</Checkbox>
            </fieldset>
          }
          levels={EXPERIENCE_LEVELS}
          selectedLevels={draft.levels}
          onToggleLevel={toggleLevel}
          min={draft.min}
          max={draft.max}
          onMinChange={(value) => setDraft((d) => ({ ...d, min: value }))}
          onMaxChange={(value) => setDraft((d) => ({ ...d, max: value }))}
          skillOptions={SKILL_OPTIONS}
          onApply={() => setApplied(draft)}
          onReset={reset}
        />
      </div>
    </Page>
  );
}
