"use client";

import { useState } from "react";
import { Button, EmptyState, LinkButton, Modal, Page, SearchBox, Toast, useToast } from "@/components/independent/ui";
import { EXPERIENCE_LEVELS, MarketplaceFilterPanel, SKILL_OPTIONS } from "@/components/portal/filters";
import { InviteModal } from "@/components/team/InviteModal";
import { IndependentCard, Pagination, ProfileDrawer } from "@/components/team/ui";
import type { Independent } from "@/lib/team/data";
import { independents } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";

const NO_SKILL = SKILL_OPTIONS[0];
const DEFAULT = { levels: new Set<string>(EXPERIENCE_LEVELS), min: "", max: "", skill: NO_SKILL as string };
/** A screenful of these row-cards; Pagination hides itself when everything fits on one. */
const PER_PAGE = 8;

/**
 * Figma "Discover / Saved independents · list / · empty" — built to TB-019: the same search,
 * filter panel and pagination as Discover, plus TB-022 (confirm before removing) and TB-023
 * (invite straight from this list, choosing which job post).
 */
export default function SavedIndependents() {
  const { saved, toggleSaved } = useDemo();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState(DEFAULT);
  const [applied, setApplied] = useState(DEFAULT);
  const [preview, setPreview] = useState<Independent | null>(null);
  const [target, setTarget] = useState<Independent | null>(null);
  const [removing, setRemoving] = useState<Independent | null>(null);
  const [toast, setToast] = useToast();

  const rate = (r: string) => Number(r.replace(/[^0-9]/g, ""));
  const results = independents
    .filter((p) => saved.includes(p.slug))
    .filter((p) => {
      const text = `${p.name} ${p.role} ${p.skills.join(" ")}`.toLowerCase();
      if (q && !text.includes(q.toLowerCase())) return false;
      if (!applied.levels.has(p.level)) return false;
      if (applied.skill !== NO_SKILL && !p.skills.includes(applied.skill)) return false;
      const v = rate(p.rate);
      if (applied.min && v < Number(applied.min)) return false;
      if (applied.max && v > Number(applied.max)) return false;
      return true;
    });

  const pages = Math.max(1, Math.ceil(results.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = results.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const activeCount = (applied.levels.size < EXPERIENCE_LEVELS.length ? 1 : 0) + (applied.skill !== NO_SKILL ? 1 : 0) + (applied.min ? 1 : 0) + (applied.max ? 1 : 0);

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
    <Page title="Saved independents">
      {saved.length === 0 ? (
        <EmptyState
          title="No saved independents yet"
          body="Save independents from Discover to compare them here and invite them when a role opens."
          action={
            <LinkButton href="/team/discover" variant="primary" size="lg">
              Discover independents
            </LinkButton>
          }
        />
      ) : (
        <div className="flex items-start gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <SearchBox
              value={q}
              onChange={(v) => {
                setQ(v);
                setPage(1);
              }}
              placeholder="Search saved independents"
            />
            <p className="text-[14px] leading-[1.4] text-ink-2">{results.length === 1 ? "1 saved independent" : `${results.length} saved independents`}</p>
            {results.length === 0 ? (
              <EmptyState title="No saved independents match these filters" body="Try removing a filter, clearing the search, or widening the rate range." action={<Button onClick={reset}>Reset filters</Button>} />
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {shown.map((p) => (
                    <IndependentCard key={p.slug} person={p} variant="saved" onOpen={setPreview} onInvite={() => setTarget(p)} onRemove={() => setRemoving(p)} />
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
            onApply={() => {
              setApplied(draft);
              setPage(1);
            }}
            onReset={reset}
          />
        </div>
      )}

      {/* TB-022: confirm before removing; the Independent is never notified either way. */}
      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        tone="danger"
        title={`Remove ${removing?.name ?? ""} from saved?`}
        description="They stay on Discover and are not notified. You can save them again at any time."
        footer={
          <>
            <Button size="lg" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant="danger"
              onClick={() => {
                if (removing) {
                  toggleSaved(removing.slug);
                  setToast(`${removing.name} removed from saved`);
                }
                setRemoving(null);
              }}
            >
              Remove
            </Button>
          </>
        }
      />

      <InviteModal target={target} onClose={() => setTarget(null)} onSent={(name) => setToast(`Invite sent to ${name}`)} />
      <ProfileDrawer
        person={preview}
        onClose={() => setPreview(null)}
        onInvite={(p) => {
          setPreview(null);
          setTarget(p);
        }}
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
