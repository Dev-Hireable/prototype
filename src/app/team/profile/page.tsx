"use client";

import { useState } from "react";
import { Button, Card, Chip, Input, Modal, Page, Toast, useToast } from "@/components/independent/ui";
import { Avatar } from "@/components/team/ui";
import { ME, profile } from "@/lib/team/data";

/** Figma "Profile / Personal profile": 760 card, 72px avatar, DM Sans 22 name, inline-edit rows (label 160 / value / Edit 36). */
export default function PersonalProfile() {
  const [fields, setFields] = useState(profile.fields);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [retake, setRetake] = useState(false);
  const [toast, setToast] = useToast();

  return (
    <Page title="Profile">
      <Card className="mx-auto flex w-[760px] flex-col gap-4 p-6">
        <div className="flex items-center gap-4">
          <Avatar src={ME.avatar} size={72} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="font-display text-[22px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
              {fields[0][1]}
            </p>
            <p className="truncate text-[14px] leading-[1.4] text-ink-2">
              {fields[1][1]} · {ME.company}
            </p>
          </div>
          <Button size="sm" onClick={() => setToast("File picker opens here")}>
            Change photo
          </Button>
        </div>
        <p className="text-[12px] leading-[1.4] text-ink-2">Each field saves on its own. There is no separate edit screen.</p>
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
      </Card>
      <Card className="mx-auto flex w-[760px] flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.4] whitespace-nowrap">
            <p className="text-[16px] font-semibold text-ink">Work-style profile</p>
            <p className="text-[12px] text-ink-2">From your quiz on 14 Aug 2026. Used to match you with independents.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#eef9f2] px-2.5 py-1 text-[12px] leading-4 font-semibold tracking-[0.24px] text-ok">Pro</span>
            <Button size="sm" onClick={() => setRetake(true)}>
              Retake quiz
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.tags.map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
        </div>
      </Card>
      <Modal
        open={retake}
        onClose={() => setRetake(false)}
        title="Retake the work-style quiz?"
        description="Your current tags stay until you finish the new quiz. It takes about 8 minutes and your matches update afterwards."
        footer={
          <>
            <Button size="lg" onClick={() => setRetake(false)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" onClick={() => { setRetake(false); setToast("Quiz opens in a new tab"); }}>
              Start quiz
            </Button>
          </>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
