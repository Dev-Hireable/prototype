"use client";

import { useState } from "react";
import { EmptyState, LinkButton, Page, Toast } from "@/components/portal/ui";
import { IndependentCard } from "@/components/team/ui";
import { useToast } from "@/lib/portal/toast";
import type { Independent } from "@/lib/team/data";
import { liveIndependents } from "@/lib/team/data";
import { useSavedTalent } from "@/lib/team/saved";
import { TalentBrowser } from "../_components/talent-browser";
import { TalentOverlays } from "../_components/talent-overlays";
import { useTalentFilters } from "../_lib/filters";

/**
 * Saved Independents, built to TB-019: the same search, filter panel, pagination and cards as
 * Discover, so the bookmark unsaves on the spot (the toast's Undo saves them back, and the
 * Independent is never notified) and Invite to apply works straight from this list (TB-023).
 */
export default function SavedIndependents() {
  const { saved } = useSavedTalent();
  const savedSlugs = new Set(saved);
  // As the talent saved their profile, the way Discover reads it.
  const filters = useTalentFilters(liveIndependents().filter((p) => savedSlugs.has(p.slug)));
  const [preview, setPreview] = useState<Independent | null>(null);
  const [target, setTarget] = useState<Independent | null>(null);
  const [toast, setToast] = useToast();
  const found = filters.results.length;

  return (
    <Page title="Saved Independents">
      {saved.length === 0 ? (
        <EmptyState
          title="No saved Independents yet"
          body="Save Independents from Discover to compare them here and invite them when a role opens."
          action={
            <LinkButton href="/team/discover" variant="primary" size="lg">
              Discover Independents
            </LinkButton>
          }
        />
      ) : (
        <TalentBrowser
          filters={filters}
          placeholder="Search by title or skill"
          count={found === 1 ? "1 saved Independent" : `${found} saved Independents`}
          emptyTitle="No saved Independents match these filters"
          card={(p) => <IndependentCard key={p.slug} person={p} onOpen={setPreview} onInvite={() => setTarget(p)} />}
        />
      )}

      <TalentOverlays target={target} preview={preview} onTarget={setTarget} onPreview={setPreview} onToast={setToast} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
