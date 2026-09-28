"use client";

import { useState } from "react";
import { Button, EmptyState, LinkButton, Modal, Page, Toast } from "@/components/independent/ui";
import { IndependentCard } from "@/components/team/ui";
import { useToast } from "@/lib/portal/toast";
import type { Independent } from "@/lib/team/data";
import { independents } from "@/lib/team/data";
import { useSavedTalent } from "@/lib/team/saved";
import { TalentBrowser } from "../_components/TalentBrowser";
import { TalentOverlays } from "../_components/TalentOverlays";
import { useTalentFilters } from "../_lib/filters";

/**
 * Saved independents, built to TB-019: the same search, filter panel and pagination as Discover,
 * plus TB-022 (confirm before removing) and TB-023 (invite straight from this list, choosing which
 * job post).
 */
export default function SavedIndependents() {
  const { saved, toggleSaved } = useSavedTalent();
  const savedSlugs = new Set(saved);
  const filters = useTalentFilters(independents.filter((p) => savedSlugs.has(p.slug)));
  const [preview, setPreview] = useState<Independent | null>(null);
  const [target, setTarget] = useState<Independent | null>(null);
  const [removing, setRemoving] = useState<Independent | null>(null);
  const [toast, setToast] = useToast();
  const found = filters.results.length;

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
        <TalentBrowser
          filters={filters}
          placeholder="Search saved independents"
          count={found === 1 ? "1 saved independent" : `${found} saved independents`}
          emptyTitle="No saved independents match these filters"
          card={(p) => <IndependentCard key={p.slug} person={p} variant="saved" onOpen={setPreview} onInvite={() => setTarget(p)} onRemove={() => setRemoving(p)} />}
        />
      )}

      {/* TB-022: confirm before removing; the Independent is never notified either way. */}
      <RemoveDialog
        person={removing}
        onClose={() => setRemoving(null)}
        onRemove={(p) => {
          toggleSaved(p.slug);
          setToast(`${p.name} removed from saved`);
        }}
      />

      <TalentOverlays target={target} preview={preview} onTarget={setTarget} onPreview={setPreview} onToast={setToast} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** Taking someone off the saved list, once confirmed. */
function RemoveDialog({ person, onClose, onRemove }: { person: Independent | null; onClose: () => void; onRemove: (p: Independent) => void }) {
  return (
    <Modal
      open={!!person}
      onClose={onClose}
      tone="danger"
      title={`Remove ${person?.name ?? ""} from saved?`}
      description="They stay on Discover and are not notified. You can save them again at any time."
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant="danger"
            onClick={() => {
              if (person) onRemove(person);
              onClose();
            }}
          >
            Remove
          </Button>
        </>
      }
    />
  );
}
