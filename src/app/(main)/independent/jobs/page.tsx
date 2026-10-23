"use client";

import { useState } from "react";
import { RoleCard } from "@/components/independent/role-card";
import { Checkbox, EmptyState, LinkButton, Page, Pagination, SearchBox } from "@/components/portal/ui";
import { MarketplaceFilterPanel } from "@/components/portal/filters";
import { roleFromPosting, setupSteps, SETUP_STEP, type Role } from "@/lib/independent/data";
import { useIndependentAccount } from "@/lib/independent/account";
import { isPostingOpen, usePostings } from "@/lib/demo/deal";
import { EXPERIENCE_LEVELS, trialMonthly } from "@/lib/contract/job-types";
import { durationDays } from "@/lib/portal/dates";

const PER_PAGE = 8;

const NO_SKILL = "Select skills";
/** Every role type and level ticked: nothing filtered out until a box is unticked. */
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
  // stripped out and glued together, so "$3,000 – $4,500" compared as 30,004,500. The filter is a
  // monthly rate, so a trial's pay (one total for the whole trial) compares as a month of it.
  const monthly = (n: number) => (r.type === "trial" ? trialMonthly(n, durationDays(r.duration)) : n);
  const [lo, hi] = rateRange(r.rate).map(monthly);
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
 * The search, the page and the filters. #71 — a filter is in force as soon as it's ticked or typed,
 * and the list goes back to its first page; Reset clears all of it.
 */
function useRoleFilters() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(DEFAULT);
  const update = (patch: Partial<Filters>) => {
    setFilters((d) => ({ ...d, ...patch }));
    setPage(1);
  };
  const reset = () => {
    setFilters(DEFAULT);
    setQ("");
    setPage(1);
  };
  const toggleLevel = (l: string) => {
    const levels = new Set(filters.levels);
    if (levels.has(l)) levels.delete(l);
    else levels.add(l);
    update({ levels });
  };
  return { q, setQ, page, setPage, filters, update, reset, toggleLevel };
}

type RoleFilters = ReturnType<typeof useRoleFilters>;

export default function Discover() {
  const f = useRoleFilters();
  const { filters, update } = f;

  // A filled role has no seat left to apply for, and a closed one isn't hiring: both leave the
  // board (IN-074), while staying on file for anyone already in their pipeline.
  const roles = usePostings().filter(isPostingOpen).map(roleFromPosting);
  /** Skills that are actually on the board, so every option can match something. */
  const skillOptions = [NO_SKILL, ...[...new Set(roles.flatMap((r) => r.skills))].sort((a, b) => a.localeCompare(b))];
  const results = roles.filter((r) => matches(r, f.q, filters));

  return (
    <Page title="Discover roles">
      <div className="flex items-start gap-6">
        <RoleResults filters={f} published={roles.length} results={results} />

        <MarketplaceFilterPanel
          roleTypeSlot={<RoleTypeFilter filters={filters} onChange={update} />}
          levels={EXPERIENCE_LEVELS}
          selectedLevels={filters.levels}
          onToggleLevel={f.toggleLevel}
          min={filters.min}
          max={filters.max}
          onMinChange={(value) => update({ min: value })}
          onMaxChange={(value) => update({ max: value })}
          skillOptions={skillOptions}
          skill={filters.skill}
          onSkillChange={(value) => update({ skill: value })}
          activeCount={activeCount(filters)}
          onReset={f.reset}
        />
      </div>
    </Page>
  );
}

/**
 * #72 — nothing published yet: what to do meanwhile. Finishing the profile is what lets a Team
 * Builder find them; once it's done, there's nothing left to ask of them.
 */
function NoRoles() {
  const { profile } = useIndependentAccount();
  const profileDone = setupSteps({ applications: [], profile }).find((s) => s.label === SETUP_STEP.profile)?.done;
  if (profileDone) return <EmptyState title="No open roles right now" body="Team Builders can still find your profile and invite you." />;
  return (
    <EmptyState
      title="No open roles right now"
      body="Finish your profile so Team Builders can find and invite you."
      action={
        <LinkButton href="/independent/profile" variant="primary">
          Complete profile
        </LinkButton>
      }
    />
  );
}

/** The results column: the search, the count, and a screenful of role cards with the pager, or why there are none. */
function RoleResults({ filters: f, published, results }: { filters: RoleFilters; published: number; results: Role[] }) {
  /** A screenful of role cards; below this the pager disappears. */
  const pages = Math.max(1, Math.ceil(results.length / PER_PAGE));
  const current = Math.min(f.page, pages);
  const shown = results.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  return (
    // Below lg the Filter button floats over the bottom right of the page (MarketplaceFilterPanel):
    // the extra room lets the end of the list, the pager's Next with it, scroll up clear of it.
    <div className="flex min-w-0 flex-1 flex-col gap-4 max-lg:pb-10">
      <SearchBox value={f.q} onChange={f.setQ} placeholder="Search by title, company or skill" />
      {/* The real count. It used to add a flat 37 to whatever was on screen. */}
      <p className="text-[14px] leading-[1.4] text-ink-2">{results.length === 1 ? "1 open role" : `${results.length} open roles`}</p>
      {published === 0 ? (
        // Nothing is published at all: no filter is to blame, so don't offer to reset one.
        <NoRoles />
      ) : results.length === 0 ? (
        <EmptyState
          title="No roles match these filters"
          body="Try removing a filter, clearing the search, or widening the rate range."
          action={
            <button type="button" onClick={f.reset} className="text-[14px] leading-[1.4] font-medium text-accent-ink hover:underline">
              Reset filters
            </button>
          }
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

/** The panel's role types, each in force as soon as it's ticked or unticked. */
function RoleTypeFilter({ filters, onChange }: { filters: Filters; onChange: (patch: Partial<Filters>) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[14px] leading-[1.4] font-medium text-ink">Role type</legend>
      <Checkbox checked={filters.trial} onChange={(value) => onChange({ trial: value })}>Trial</Checkbox>
      <Checkbox checked={filters.fullTime} onChange={(value) => onChange({ fullTime: value })}>Full-time</Checkbox>
      <Checkbox checked={filters.partTime} onChange={(value) => onChange({ partTime: value })}>Part-time</Checkbox>
    </fieldset>
  );
}
