"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { RoleCard } from "@/components/independent/role-card";
import { Button, Checkbox, EmptyState, Page, Pagination, SearchBox } from "@/components/portal/ui";
import { MarketplaceFilterPanel } from "@/components/portal/filters";
import { roleFromPosting, type Role } from "@/lib/independent/data";
import { isPostingOpen, usePostings } from "@/lib/demo/deal";
import { EXPERIENCE_LEVELS } from "@/lib/contract/job-types";

const PER_PAGE = 8;

const NO_SKILL = "Select skills";
/**
 * One starting point for both the draft and the applied filters. The draft used to open with only
 * Intermediate and Advanced ticked while everything was shown, so pressing Apply without touching
 * anything suddenly hid every Beginner and Expert role.
 */
const DEFAULT = { trial: true, fullTime: true, partTime: true, levels: new Set(EXPERIENCE_LEVELS), min: "", max: "", skill: NO_SKILL };
type Filters = typeof DEFAULT;

/** "$3,000 – $4,500 /month" → [3000, 4500]; a single figure is both ends. */
function rateRange(rate: string): [number, number] {
  const nums = (rate.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Number(n.replace(/,/g, "")));
  return nums.length ? [nums[0], nums[nums.length - 1]] : [0, 0];
}
const amount = (v: string) => Number(v.replace(/[^0-9.]/g, ""));

/** Whether a role on the board passes the search and the applied filters. */
function matches(r: Role, q: string, applied: Filters) {
  const text = `${r.title} ${r.company} ${r.skills.join(" ")}`.toLowerCase();
  if (q && !text.includes(q.toLowerCase())) return false;
  if (r.type === "trial" && !applied.trial) return false;
  if (r.type === "full-time" && !applied.fullTime) return false;
  if (r.type === "part-time" && !applied.partTime) return false;
  if (!applied.levels.has(r.level)) return false;
  if (applied.skill !== NO_SKILL && !r.skills.includes(applied.skill)) return false;
  // Keep roles whose pay band overlaps the one asked for. The rate used to have every digit
  // stripped out and glued together, so "$3,000 – $4,500" compared as 30,004,500.
  const [lo, hi] = rateRange(r.rate);
  if (applied.min && hi < amount(applied.min)) return false;
  if (applied.max && lo > amount(applied.max)) return false;
  return true;
}

/** Filters actually narrowing the list, for the count beside the Filter heading. */
const activeCount = (applied: Filters) =>
  (applied.trial ? 0 : 1) +
  (applied.fullTime ? 0 : 1) +
  (applied.partTime ? 0 : 1) +
  (applied.levels.size < EXPERIENCE_LEVELS.length ? 1 : 0) +
  (applied.skill !== NO_SKILL ? 1 : 0) +
  (applied.min ? 1 : 0) +
  (applied.max ? 1 : 0);

/**
 * The search, the page, and the filters twice over: the draft the panel edits, and the ones
 * applied to the list when Apply is pressed. Reset clears all of it.
 */
function useRoleFilters() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState(DEFAULT);
  const [applied, setApplied] = useState(DEFAULT);
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
  const apply = () => {
    setApplied(draft);
    setPage(1);
  };
  return { q, setQ, page, setPage, draft, setDraft, applied, reset, toggleLevel, apply };
}

type RoleFilters = ReturnType<typeof useRoleFilters>;

export default function Discover() {
  const f = useRoleFilters();
  const { draft, setDraft } = f;

  // A filled role has no seat left to apply for, and a closed one isn't hiring: both leave the
  // board (IN-074), while staying on file for anyone already in their pipeline.
  const roles = usePostings().filter(isPostingOpen).map(roleFromPosting);
  /** Skills that are actually on the board, so every option can match something. */
  const skillOptions = [NO_SKILL, ...[...new Set(roles.flatMap((r) => r.skills))].sort((a, b) => a.localeCompare(b))];
  const results = roles.filter((r) => matches(r, f.q, f.applied));

  return (
    <Page title="Discover roles">
      <div className="flex items-start gap-6">
        <RoleResults filters={f} published={roles.length} results={results} />

        <MarketplaceFilterPanel
          roleTypeSlot={<RoleTypeFilter draft={draft} onDraft={setDraft} />}
          levels={EXPERIENCE_LEVELS}
          selectedLevels={draft.levels}
          onToggleLevel={f.toggleLevel}
          min={draft.min}
          max={draft.max}
          onMinChange={(value) => setDraft((d) => ({ ...d, min: value }))}
          onMaxChange={(value) => setDraft((d) => ({ ...d, max: value }))}
          skillOptions={skillOptions}
          skill={draft.skill}
          onSkillChange={(value) => setDraft((d) => ({ ...d, skill: value }))}
          activeCount={activeCount(f.applied)}
          onApply={f.apply}
          onReset={f.reset}
        />
      </div>
    </Page>
  );
}

/** The results column: the search, the count, and a screenful of role cards with the pager — or why there are none. */
function RoleResults({ filters: f, published, results }: { filters: RoleFilters; published: number; results: Role[] }) {
  /** A screenful of role cards; below this the pager disappears. */
  const pages = Math.max(1, Math.ceil(results.length / PER_PAGE));
  const current = Math.min(f.page, pages);
  const shown = results.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <SearchBox value={f.q} onChange={f.setQ} placeholder="Search by title, company or skill" />
      {/* The real count. It used to add a flat 37 to whatever was on screen. */}
      <p className="text-[14px] leading-[1.4] text-ink-2">{results.length === 1 ? "1 open role" : `${results.length} open roles`}</p>
      {published === 0 ? (
        // Nothing is published at all — no filter is to blame, so don't offer to reset one.
        <EmptyState title="No open roles yet" body="Roles appear here as soon as a Team Builder publishes one." />
      ) : results.length === 0 ? (
        <EmptyState
          title="No roles match these filters"
          body="Try removing a filter, clearing the search, or widening the rate range."
          action={<Button onClick={f.reset}>Reset filters</Button>}
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
          <Pagination page={current} pages={pages} onChange={f.setPage} />
        </>
      )}
    </div>
  );
}

/** The panel's role types, ticked in the draft until Apply. */
function RoleTypeFilter({ draft, onDraft }: { draft: Filters; onDraft: Dispatch<SetStateAction<Filters>> }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[14px] leading-[1.4] font-medium text-ink">Role type</legend>
      <Checkbox checked={draft.trial} onChange={(value) => onDraft((d) => ({ ...d, trial: value }))}>Trial</Checkbox>
      <Checkbox checked={draft.fullTime} onChange={(value) => onDraft((d) => ({ ...d, fullTime: value }))}>Full-time</Checkbox>
      <Checkbox checked={draft.partTime} onChange={(value) => onDraft((d) => ({ ...d, partTime: value }))}>Part-time</Checkbox>
    </fieldset>
  );
}
