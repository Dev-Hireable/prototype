"use client";

import { useState } from "react";
import { Page, Toast } from "@/components/portal/ui";
import { IndependentCard } from "@/components/team/ui";
import { useToast } from "@/lib/portal/toast";
import { liveIndependents } from "@/lib/team/data";
import type { Independent } from "@/lib/team/data";
import { ReturnNav } from "@/components/portal/return";
import { TalentBrowser } from "./_components/talent-browser";
import { TalentOverlays } from "./_components/talent-overlays";
import { useTalentFilters } from "./_lib/filters";

export default function Discover() {
  const filters = useTalentFilters(liveIndependents());
  const [target, setTarget] = useState<Independent | null>(null);
  const [preview, setPreview] = useState<Independent | null>(null);
  const [toast, setToast] = useToast();
  const matched = filters.results.length;

  return (
    <Page title="Discover independents" nav={<ReturnNav />}>
      <TalentBrowser
        filters={filters}
        placeholder="Search by name, title or skill"
        count={matched === 1 ? "1 independent matched" : `${matched} independents matched`}
        emptyTitle="No independents match these filters"
        card={(p) => <IndependentCard key={p.slug} person={p} onInvite={() => setTarget(p)} onOpen={setPreview} />}
      />

      <TalentOverlays target={target} preview={preview} onTarget={setTarget} onPreview={setPreview} onToast={setToast} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
