"use client";

import { useState } from "react";
import { Button, EmptyState, Page, SearchBox, Toast, useToast } from "@/components/independent/ui";
import { EXPERIENCE_LEVELS, MarketplaceFilterPanel, SKILL_OPTIONS } from "@/components/portal/filters";
import { InviteModal } from "@/components/team/InviteModal";
import { IndependentCard, Pagination, ProfileDrawer } from "@/components/team/ui";
import { independents } from "@/lib/team/data";
import type { Independent } from "@/lib/team/data";

const NO_SKILL = SKILL_OPTIONS[0];
const DEFAULT = { levels: new Set<string>(EXPERIENCE_LEVELS), min: "", max: "", skill: NO_SKILL as string };
/** A screenful of these row-cards. Pagination hides itself below this, which is the point —
 * it used to be 3 purely to manufacture a second page out of four profiles. */
const PER_PAGE = 8;

/** Figma "Discover / Discover independents · browse / · no results / Invite to apply · modal / · sent toast". */
export default function Discover() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState(DEFAULT);
  const [applied, setApplied] = useState(DEFAULT);
  const [target, setTarget] = useState<Independent | null>(null);
  const [preview, setPreview] = useState<Independent | null>(null);
  const [toast, setToast] = useToast();

  const rate = (r: string) => Number(r.replace(/[^0-9]/g, ""));
  const results = independents.filter((p) => {
    const text = `${p.name} ${p.role} ${p.skills.join(" ")}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;
    if (!applied.levels.has(p.level)) return false;
    if (applied.skill !== NO_SKILL && !p.skills.includes(applied.skill)) return false;
    const v = rate(p.rate);
    if (applied.min && v < Number(applied.min)) return false;
    if (applied.max && v > Number(applied.max)) return false;
    return true;
  });

  // TB-012: paginate the real result set — page numbers and Previous/Next follow the data.
  const pages = Math.max(1, Math.ceil(results.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = results.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  /** Filters that are actually narrowing the list, for the count next to the Filter heading. */
  const activeCount =
    (applied.levels.size < EXPERIENCE_LEVELS.length ? 1 : 0) + (applied.skill !== NO_SKILL ? 1 : 0) + (applied.min ? 1 : 0) + (applied.max ? 1 : 0);

  const reset = () => {
    setDraft(DEFAULT);
    setApplied(DEFAULT);
    setQ("");
    setPage(1);
  };
  const toggleLevel = (l: string) =>
    setDraft((d) => {
      const levels = new Set(d.levels);
      if (levels.has(l)) levels.delete(l);
      else levels.add(l);
      return { ...d, levels };
    });

  return (
    <Page title="Discover independents">
      <div className="flex items-start gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by name, title or skill" />
          <p className="text-[14px] leading-[1.4] text-ink-2">{results.length === 1 ? "1 independent matched" : `${results.length} independents matched`}</p>
          {results.length === 0 ? (
            <EmptyState title="No independents match these filters" body="Try removing a filter, clearing the search, or widening the rate range." action={<Button onClick={reset}>Reset filters</Button>} />
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {shown.map((p) => (
                  <IndependentCard key={p.slug} person={p} onInvite={() => setTarget(p)} onOpen={setPreview} />
                ))}
              </div>
              <Pagination page={current} pages={pages} onChange={setPage} />
            </>
          )}
        </div>

        <MarketplaceFilterPanel
          levels={EXPERIENCE_LEVELS}
          selectedLevels={draft.levels}
          onToggleLevel={toggleLevel}
          min={draft.min}
          max={draft.max}
          onMinChange={(value) => setDraft((d) => ({ ...d, min: value }))}
          onMaxChange={(value) => setDraft((d) => ({ ...d, max: value }))}
          skillOptions={SKILL_OPTIONS}
          skill={draft.skill}
          onSkillChange={(value) => setDraft((d) => ({ ...d, skill: value }))}
          activeCount={activeCount}
          onApply={() => { setApplied(draft); setPage(1); }}
          onReset={reset}
        />
      </div>

      <InviteModal target={target} onClose={() => setTarget(null)} onSent={(name) => setToast(`Invite sent to ${name}`)} />
      <ProfileDrawer person={preview} onClose={() => setPreview(null)} onInvite={(p) => { setPreview(null); setTarget(p); }} />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
