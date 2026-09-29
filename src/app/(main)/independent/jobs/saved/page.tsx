"use client";

import { useState } from "react";
import { RoleCard } from "@/components/independent/role-card";
import { EmptyState, LinkButton, Page, SearchBox, Select } from "@/components/portal/ui";
import { roleFromPosting } from "@/lib/independent/data";
import { usePostings } from "@/lib/demo/deal";
import { JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import { useSavedRoles } from "@/lib/independent/saved";

export default function SavedRoles() {
  const { saved } = useSavedRoles();
  const [q, setQ] = useState("");
  const [type, setType] = useState("Type: All");
  const roles = usePostings().map(roleFromPosting);
  const savedSlugs = new Set(saved);
  const list = roles
    .filter((r) => savedSlugs.has(r.slug))
    .filter((r) => type === "Type: All" || type === `Type: ${JOB_TYPE_LABEL[r.type]}`)
    .filter((r) => `${r.title} ${r.company}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Page title="Saved roles">
      {saved.length === 0 ? (
        <EmptyState
          title="No saved roles yet"
          body="Save roles from Discover to compare them here and apply when you are ready."
          action={
            <LinkButton href="/independent/jobs" variant="primary" size="lg">
              Discover roles
            </LinkButton>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex w-[522px] items-center gap-3">
              <SearchBox value={q} onChange={setQ} placeholder="Search saved roles" className="min-w-0 flex-1" />
              <Select options={["Type: All", "Type: Trial", "Type: Full-time", "Type: Part-time"]} value={type} onChange={(e) => setType(e.target.value)} className="!w-[150px]" />
            </div>
            <span className="text-[14px] leading-[1.4] text-ink-2">{list.length} saved roles</span>
          </div>
          <div className="flex flex-col gap-3">
            {list.map((r) => (
              <RoleCard key={r.slug} role={r} variant="saved" />
            ))}
          </div>
        </>
      )}
    </Page>
  );
}
