"use client";

import { useState } from "react";
import { Button, Card, Input, Page, Toast, useToast } from "@/components/independent/ui";
import { profile } from "@/lib/team/data";

/** Figma "Profile / Company profile": 72px #5b5bd6 logo tile, DM Sans 22 name, inline-edit rows. */
export default function CompanyProfile() {
  const [fields, setFields] = useState(profile.company);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useToast();
  const done = fields.filter(([, v]) => v.trim()).length;

  return (
    <Page title="Profile">
      <Card className="mx-auto flex w-[760px] flex-col gap-4 p-6">
        <div className="flex items-center gap-4">
          <span className="flex size-[72px] items-center justify-center rounded-lg bg-[#5b5bd6] text-[29px] leading-[1.4] font-semibold text-white">NS</span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 whitespace-nowrap">
            <p className="font-display text-[22px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
              {fields[0][1]}
            </p>
            <p className="text-[13px] leading-[1.4] text-ink-2">Independents see this on every role you post.</p>
          </div>
          <Button size="sm" onClick={() => setToast("File picker opens here")}>
            Change logo
          </Button>
        </div>
        <div className="flex flex-col">
          {fields.map(([label, value], i) => (
            <div key={label} className="flex items-center gap-4 border-b border-border py-3">
              <span className="w-40 shrink-0 text-[13px] leading-[1.4] font-medium text-ink-2">{label}</span>
              {editing === i ? (
                <>
                  <Input value={draft} onChange={(e) => setDraft(e.target.value)} className="min-w-0 flex-1" />
                  <Button size="sm" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => { setFields((f) => f.map((x, k) => (k === i ? [x[0], draft] : x))); setEditing(null); setToast(`${label} saved`); }}>
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 text-[14px] leading-[1.4] text-ink">{value}</span>
                  <Button size="sm" onClick={() => { setEditing(i); setDraft(value); }}>
                    Edit
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
        <p className="text-[12px] leading-[1.4] text-ink-2">
          {done} of {fields.length} fields complete. The dashboard checklist item “Set up company profile” is {done === fields.length ? "done" : "still open"}.
        </p>
      </Card>
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
