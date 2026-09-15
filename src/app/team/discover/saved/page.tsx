"use client";

import { useState } from "react";
import { EmptyState, LinkButton, Page, SearchBox, Select, Toast, useToast } from "@/components/independent/ui";
import { IndependentCard, ProfileDrawer } from "@/components/team/ui";
import type { Independent } from "@/lib/team/data";
import { independents } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";

/** Figma "Discover / Saved independents · list / · empty". */
export default function SavedIndependents() {
  const { saved, invite, roles } = useDemo();
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<Independent | null>(null);
  const [toast, setToast] = useToast();
  const list = independents.filter((p) => saved.includes(p.slug)).filter((p) => `${p.name} ${p.role}`.toLowerCase().includes(q.toLowerCase()));

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
        <>
          <div className="flex items-center justify-between">
            <div className="flex w-[522px] items-center gap-3">
              <SearchBox value={q} onChange={setQ} placeholder="Search saved independents" className="min-w-0 flex-1" />
              <Select options={["Level: All", "Intermediate", "Advanced", "Expert"]} className="!w-[150px]" />
            </div>
            <span className="text-[14px] leading-[1.4] text-ink-2">{list.length} saved independents</span>
          </div>
          <div className="flex flex-col gap-3">
            {list.map((p) => (
              <IndependentCard
                key={p.slug}
                person={p}
                variant="saved"
                onOpen={setPreview}
                onInvite={() => {
                  invite(p.slug, roles[0].slug);
                  setToast(`Invite sent to ${p.name}`);
                }}
              />
            ))}
          </div>
        </>
      )}
      <ProfileDrawer
        person={preview}
        onClose={() => setPreview(null)}
        onInvite={(p) => {
          setPreview(null);
          invite(p.slug, roles[0].slug);
          setToast(`Invite sent to ${p.name}`);
        }}
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
