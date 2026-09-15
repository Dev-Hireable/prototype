"use client";

import { useState } from "react";
import { Button, Checkbox, EmptyState, Field, Input, Modal, Page, SearchBox, Select, Textarea, Toast, useToast } from "@/components/independent/ui";
import { IndependentCard, Pagination, ProfileDrawer } from "@/components/team/ui";
import { independents } from "@/lib/team/data";
import type { Independent } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";

const LEVELS = ["Beginner (0–2 years)", "Intermediate (2–5 years)", "Advanced (5–8 years)", "Expert (8+ years)"];
const DEFAULT = { levels: new Set(LEVELS), min: "", max: "" };

/** Figma "Discover / Discover independents · browse / · no results / Invite to apply · modal / · sent toast". */
export default function Discover() {
  const { roles, invite } = useDemo();
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState(DEFAULT);
  const [applied, setApplied] = useState(DEFAULT);
  const [target, setTarget] = useState<Independent | null>(null);
  const [preview, setPreview] = useState<Independent | null>(null);
  const [role, setRole] = useState(roles[0]?.slug ?? "");
  const [note, setNote] = useState("");
  const [toast, setToast] = useToast();

  const rate = (r: string) => Number(r.replace(/[^0-9]/g, ""));
  const results = independents.filter((p) => {
    const text = `${p.name} ${p.role} ${p.skills.join(" ")}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;
    if (!applied.levels.has(p.level)) return false;
    const v = rate(p.rate);
    if (applied.min && v < Number(applied.min)) return false;
    if (applied.max && v > Number(applied.max)) return false;
    return true;
  });
  const reset = () => {
    setDraft(DEFAULT);
    setApplied(DEFAULT);
    setQ("");
  };
  const toggleLevel = (l: string) =>
    setDraft((d) => {
      const levels = new Set(d.levels);
      if (levels.has(l)) levels.delete(l);
      else levels.add(l);
      return { ...d, levels };
    });
  const send = () => {
    if (!target) return;
    invite(target.slug, role);
    setToast(`Invite sent to ${target.name}`);
    setTarget(null);
    setNote("");
  };

  return (
    <Page title="Discover independents">
      <div className="flex items-start gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <SearchBox value={q} onChange={setQ} placeholder="Search by name, title or skill" />
          <p className="text-[14px] leading-[1.4] text-ink-2">{results.length ? `${results.length + 124} independents match` : "0 independents match"}</p>
          {results.length === 0 ? (
            <EmptyState title="No independents match these filters" body="Try removing a filter, clearing the search, or widening the rate range." action={<Button onClick={reset}>Reset filters</Button>} />
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {results.map((p) => (
                  <IndependentCard key={p.slug} person={p} onInvite={() => setTarget(p)} onOpen={setPreview} />
                ))}
              </div>
              <Pagination last="13" />
            </>
          )}
        </div>

        <aside className="flex w-[280px] shrink-0 flex-col gap-5">
          <h2 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
            Filter
          </h2>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[14px] leading-[1.4] font-medium text-ink">Experience level</legend>
            {LEVELS.map((l) => (
              <Checkbox key={l} checked={draft.levels.has(l)} onChange={() => toggleLevel(l)}>
                {l}
              </Checkbox>
            ))}
          </fieldset>
          <label className="flex flex-col gap-2 text-[14px] leading-[1.4] font-medium text-ink">
            Skills
            <Select options={["Select skills", "Outbound sales", "HubSpot", "Negotiation", "Cold calling"]} />
          </label>
          <div className="flex flex-col gap-2 text-[14px] leading-[1.4] font-medium text-ink">
            Monthly rate (USD)
            <div className="flex gap-2">
              <Input placeholder="Min" inputMode="numeric" value={draft.min} onChange={(e) => setDraft((d) => ({ ...d, min: e.target.value }))} />
              <Input placeholder="Max" inputMode="numeric" value={draft.max} onChange={(e) => setDraft((d) => ({ ...d, max: e.target.value }))} />
            </div>
          </div>
          <Button variant="primary" size="lg" onClick={() => setApplied(draft)}>
            Apply filters
          </Button>
          <Button size="lg" onClick={reset}>
            Reset filters
          </Button>
        </aside>
      </div>

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title={`Invite ${target?.name ?? ""} to apply`}
        description="They get an email and an in-app notification with the role. If they accept, they appear in the candidate tracker as Interested."
        footer={
          <>
            <Button size="lg" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" onClick={send}>
              Send invite
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Role">
            <Select options={roles.filter((r) => r.status === "Active").map((r) => r.title)} value={roles.find((r) => r.slug === role)?.title} onChange={(e) => setRole(roles.find((r) => r.title === e.target.value)?.slug ?? role)} />
          </Field>
          <Field label="Note (optional)">
            <Textarea rows={3} className="h-[78px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Tell ${target?.name.split(" ")[0] ?? "them"} why this role fits`} />
          </Field>
        </div>
      </Modal>
      <ProfileDrawer person={preview} onClose={() => setPreview(null)} onInvite={(p) => { setPreview(null); setTarget(p); }} />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
