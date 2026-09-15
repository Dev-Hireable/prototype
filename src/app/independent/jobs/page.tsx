"use client";

import { useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { RoleCard } from "@/components/independent/RoleCard";
import { Button, Checkbox, EmptyState, Input, Page, SearchBox, Select } from "@/components/independent/ui";
import { roles } from "@/lib/independent/data";

const LEVELS = ["Beginner (0–2 years)", "Intermediate (2–5 years)", "Advanced (5–8 years)", "Expert (8+ years)"];
const DEFAULT = { trial: true, fullTime: true, levels: new Set(LEVELS), min: "", max: "" };

const Prev = ICONS.chevronLeft;
const Next = ICONS.chevronRight;

/** Figma "Job Board / Discover roles · browse / · no results": results (gap 16) + 280px filter column, content gap 24. */
export default function Discover() {
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState(DEFAULT);
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
    <Page title="Discover roles">
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

        <aside className="flex w-[280px] shrink-0 flex-col gap-5">
          <h2 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
            Filter
          </h2>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[14px] leading-[1.4] font-medium text-ink">Role type</legend>
            <Checkbox checked={draft.trial} onChange={(v) => setDraft((d) => ({ ...d, trial: v }))}>Trial (30 days)</Checkbox>
            <Checkbox checked={draft.fullTime} onChange={(v) => setDraft((d) => ({ ...d, fullTime: v }))}>Full-time</Checkbox>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[14px] leading-[1.4] font-medium text-ink">Experience level</legend>
            {LEVELS.map((l) => (
              <Checkbox key={l} checked={draft.levels.has(l)} onChange={() => toggleLevel(l)}>
                {l}
              </Checkbox>
            ))}
          </fieldset>
          <label className="flex flex-col gap-2 text-[14px] leading-[1.4] font-medium text-ink">
            Skills
            <Select options={["Select skills", "Outbound sales", "HubSpot", "Negotiation", "Cold calling"]} />
          </label>
          <div className="flex flex-col gap-2 text-[14px] leading-[1.4] font-medium text-ink">
            Monthly rate (USD)
            <div className="flex gap-2">
              <Input placeholder="Min" inputMode="numeric" value={draft.min} onChange={(e) => setDraft((d) => ({ ...d, min: e.target.value }))} />
              <Input placeholder="Max" inputMode="numeric" value={draft.max} onChange={(e) => setDraft((d) => ({ ...d, max: e.target.value }))} />
            </div>
          </div>
          <Button variant="primary" size="lg" onClick={() => setApplied(draft)}>
            Apply filters
          </Button>
          <Button size="lg" onClick={reset}>
            Reset filters
          </Button>
        </aside>
      </div>
    </Page>
  );
}
