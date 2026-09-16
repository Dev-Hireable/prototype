"use client";

import { useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { RoleCard } from "@/components/independent/RoleCard";
import { Button, Checkbox, EmptyState, Page, SearchBox } from "@/components/independent/ui";
import { EXPERIENCE_LEVELS, MarketplaceFilterPanel, SKILL_OPTIONS } from "@/components/portal/filters";
import { roles } from "@/lib/independent/data";

const DEFAULT = { trial: true, fullTime: true, levels: new Set(EXPERIENCE_LEVELS), min: "", max: "" };
const INITIAL_DRAFT = { ...DEFAULT, levels: new Set(EXPERIENCE_LEVELS.slice(1, 3)) };

const Prev = ICONS.chevronLeft;
const Next = ICONS.chevronRight;

/** Figma "Job Board / Discover roles · browse / · no results": results (gap 16) + 280px filter column, content gap 24. */
export default function Discover() {
  const [q, setQ] = useState("");
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
          <p className="text-[14px] leading-[1.4] text-ink-2">{results.length ? `${results.length + 37} open roles` : "0 roles match"}</p>
          {results.length === 0 ? (
            <EmptyState
              title="No roles match these filters"
              body="Try removing a filter, clearing the search, or widening the rate range."
              action={<Button onClick={reset}>Reset filters</Button>}
            />
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {results.map((r) => (
                  <RoleCard key={r.slug} role={r} />
                ))}
              </div>
              <nav aria-label="Pagination" className="flex items-center justify-center gap-2 text-[14px] leading-[1.4] font-medium text-ink">
                <button type="button" className="flex items-center gap-1 font-normal text-ink-2">
                  <Prev size={18} aria-hidden /> Previous
                </button>
                {["1", "2", "3", "…", "9"].map((p, i) => (
                  <button
                    key={p}
                    type="button"
                    aria-current={i === 0 ? "page" : undefined}
                    className={`rounded-md px-2.5 py-1.5 ${i === 0 ? "bg-primary text-white" : "hover:bg-surface-alt"}`}
                  >
                    {p}
                  </button>
                ))}
                <button type="button" className="flex items-center gap-1 font-normal text-ink-2">
                  Next <Next size={18} aria-hidden />
                </button>
              </nav>
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
