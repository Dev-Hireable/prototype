"use client";

import { useRef, useState } from "react";
import { Button, Card, Field, Input, Page, Toast, useToast } from "@/components/independent/ui";
import { Avatar } from "@/components/team/ui";
import { checkImage, IMAGE_MAX_MB, readImage } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";

/** Figma "Profile / Personal profile": 760 card, 72px avatar, DM Sans 22 name, inline-edit rows (label 160 / value / Edit 36). */
export default function PersonalProfile() {
  const { profile, setProfile, company } = useDemo();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useToast();
  /** TB-120 — the chosen file is previewed and only written on Save. */
  const [preview, setPreview] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  /* TB-121 / TB-122 — every row writes to the store, so an edit survives leaving the page. */
  const rows: [string, keyof typeof profile][] = [
    ["Full name", "name"],
    ["Job title", "title"],
    ["Work email", "email"],
    ["Phone", "phone"],
    ["Time zone", "timezone"],
    ["About you", "about"],
  ];

  const pick = async (f: File | undefined) => {
    if (!f) return;
    const why = checkImage(f);
    if (why) return setToast(why);
    setPreview(await readImage(f));
  };

  return (
    <Page title="Profile">
      <Card className="mx-auto flex w-[760px] flex-col gap-4 p-6">
        <div className="flex items-center gap-4">
          <Avatar src={preview ?? profile.photo} size={72} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="font-display text-[22px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
              {profile.name}
            </p>
            <p className="truncate text-[14px] leading-[1.4] text-ink-2">
              {profile.title} · {company.name}
            </p>
            {/* TB-094 — read-only, and the only field on this card that isn't editable. */}
            <p className="text-[12.5px] leading-[1.4] text-ink-2">Member since {profile.memberSince}</p>
          </div>
          {/* TB-120 — JPG or PNG under 5MB, previewed before it replaces anything. */}
          <input ref={file} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          {preview ? (
            <div className="flex shrink-0 gap-2">
              <Button size="sm" onClick={() => setPreview(null)}>
                Discard
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setProfile({ photo: preview });
                  setPreview(null);
                  setToast("Photo updated everywhere");
                }}
              >
                Save photo
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => file.current?.click()}>
              Change photo
            </Button>
          )}
        </div>
        <p className="text-[12px] leading-[1.4] text-ink-2">Each field saves on its own. There is no separate edit screen. Photos must be JPG or PNG, up to {IMAGE_MAX_MB}MB.</p>
        <div className="flex flex-col">
          {rows.map(([label, key]) => (
            <div key={label} className="flex items-center gap-4 border-b border-border py-3">
              <span className="w-40 shrink-0 text-[13px] leading-[1.4] font-medium text-ink-2">{label}</span>
              {editing === label ? (
                <>
                  <Input value={draft} onChange={(e) => setDraft(e.target.value)} className="min-w-0 flex-1" />
                  <Button size="sm" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!draft.trim()}
                    onClick={() => {
                      setProfile({ [key]: draft.trim() });
                      setEditing(null);
                      setToast(`${label} saved`);
                    }}
                  >
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 text-[14px] leading-[1.4] text-ink">{profile[key]}</span>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditing(label);
                      setDraft(String(profile[key]));
                    }}
                  >
                    Edit
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>
      {/* TB-096 puts the quiz on the Company profile, where the badges it produces are shown. */}
      <Card className="mx-auto flex w-[760px] flex-col gap-2 p-6">
        <Field label="Work style">
          <p className="text-[13px] leading-[1.45] text-ink-2">Your work-style badges sit on the company profile, because that is what independents see. Retake the quiz from there.</p>
        </Field>
      </Card>
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
