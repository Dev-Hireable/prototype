import { useState } from "react";
import { EXPERIENCE_LEVELS, SKILL_OPTIONS } from "@/lib/contract/job-types";
import type { Independent } from "@/lib/team/data";

/**
 * Discover's search, filter panel and pagination, which Saved independents shares (TB-019): the
 * filters being set up, the ones applied, and the page of profiles they leave.
 */

const NO_SKILL = SKILL_OPTIONS[0];
const DEFAULT = { levels: new Set<string>(EXPERIENCE_LEVELS), min: "", max: "", skill: NO_SKILL as string };
/** A screenful of these row-cards. Pagination hides itself below this, which is the point —
 * it used to be 3 purely to manufacture a second page out of four profiles. */
const PER_PAGE = 8;

type Filters = typeof DEFAULT;

const rate = (r: string) => Number(r.replace(/[^0-9]/g, ""));

/** Whether a profile matches the search and every applied filter. */
function matches(p: Independent, q: string, applied: Filters) {
  const text = `${p.name} ${p.role} ${p.skills.join(" ")}`.toLowerCase();
  if (q && !text.includes(q.toLowerCase())) return false;
  if (!applied.levels.has(p.level)) return false;
  if (applied.skill !== NO_SKILL && !p.skills.includes(applied.skill)) return false;
  const v = rate(p.rate);
  if (applied.min && v < Number(applied.min)) return false;
  if (applied.max && v > Number(applied.max)) return false;
  return true;
}

/** Filters that are actually narrowing the list, for the count next to the Filter heading. */
const activeCount = (applied: Filters) =>
  (applied.levels.size < EXPERIENCE_LEVELS.length ? 1 : 0) + (applied.skill !== NO_SKILL ? 1 : 0) + (applied.min ? 1 : 0) + (applied.max ? 1 : 0);

/** The ticked experience levels with one of them flipped. */
function toggled(levels: Set<string>, l: string) {
  const next = new Set(levels);
  if (next.has(l)) next.delete(l);
  else next.add(l);
  return next;
}

/** The search and filters over `pool`, and the page of it they leave. The panel edits a draft; Apply puts it in force. */
export function useTalentFilters(pool: Independent[]) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState(DEFAULT);
  const [applied, setApplied] = useState(DEFAULT);
  const results = pool.filter((p) => matches(p, q, applied));

  // TB-012: paginate the real result set — page numbers and Previous/Next follow the data.
  const pages = Math.max(1, Math.ceil(results.length / PER_PAGE));
  const current = Math.min(page, pages);

  const reset = () => {
    setDraft(DEFAULT);
    setApplied(DEFAULT);
    setQ("");
    setPage(1);
  };
  return {
    q,
    /** A new search starts again from the first page. */
    search: (v: string) => {
      setQ(v);
      setPage(1);
    },
    results,
    shown: results.slice((current - 1) * PER_PAGE, current * PER_PAGE),
    pages,
    current,
    setPage,
    reset,
    draft,
    /** Changes the draft only; nothing is filtered until Apply. */
    edit: (patch: Partial<Filters>) => setDraft((d) => ({ ...d, ...patch })),
    toggleLevel: (l: string) => setDraft((d) => ({ ...d, levels: toggled(d.levels, l) })),
    activeCount: activeCount(applied),
    apply: () => {
      setApplied(draft);
      setPage(1);
    },
  };
}

export type TalentFilters = ReturnType<typeof useTalentFilters>;
