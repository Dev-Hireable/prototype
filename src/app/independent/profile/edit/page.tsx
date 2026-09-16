"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Chip, Field, Input, Page, Select, Textarea, Toast, useToast } from "@/components/independent/ui";
import { ME, profile } from "@/lib/independent/data";

/** Figma "Profile / Talent profile · edit": 760 card, p 24, gap 16; 110px bio box; skill chips with ✕. */
export default function EditProfile() {
  const router = useRouter();
  const [form, setForm] = useState({ name: ME.name, headline: ME.headline, bio: profile.editBio, rate: profile.rate, level: profile.level, location: profile.location, ...profile.links });
  const [skills, setSkills] = useState(profile.skills);
  const [skill, setSkill] = useState("");
  const [toast, setToast] = useToast();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Page title="Edit profile" heading="default">
      <Card className="mx-auto flex w-[760px] flex-col gap-4 p-6">
        <h2 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
          Edit profile
        </h2>
        <div className="flex items-center gap-4">
          <Image src={ME.avatar} alt="" width={128} height={128} className="size-16 rounded-full bg-[#d2d8db] object-cover" />
          <div className="flex min-w-0 flex-1 flex-col gap-1 leading-[1.4]">
            <p className="text-[13px] font-medium text-ink">Profile photo</p>
            <p className="text-[12px] text-ink-2">PNG or JPG, up to 5 MB. A clear headshot gets more invites.</p>
          </div>
          <Button size="sm" onClick={() => setToast("File picker opens here")}>
            Change photo
          </Button>
        </div>
        <div className="flex gap-4">
          <Field label="Full name" className="flex-1">
            <Input value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Headline" className="flex-1">
            <Input value={form.headline} onChange={set("headline")} />
          </Field>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="flex items-start justify-between leading-[1.4]">
            <span className="text-[13px] font-medium text-ink">Bio</span>
            <span className="text-[12px] text-ink-2">{form.bio.length} / 500</span>
          </span>
          <Textarea maxLength={500} value={form.bio} onChange={set("bio")} className="h-[110px] !py-4 !text-ink" />
        </label>
        <div className="flex gap-4">
          <Field label="Monthly rate (USD)" className="flex-1">
            <Input value={form.rate} onChange={set("rate")} />
          </Field>
          <Field label="Experience level" className="flex-1">
            <Select options={["Beginner (0–2 years)", "Intermediate (2–5 years)", "Advanced (5–8 years)", "Expert (8+ years)"]} value={form.level} onChange={set("level")} />
          </Field>
          <Field label="Location" className="flex-1">
            <Input value={form.location} onChange={set("location")} />
          </Field>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] leading-[1.4] font-medium text-ink">Skills</span>
            <Input
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && skill.trim()) {
                  e.preventDefault();
                  setSkills((s) => [...s, skill.trim()]);
                  setSkill("");
                }
              }}
              placeholder="Add a skill"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <Chip key={s} onRemove={() => setSkills((all) => all.filter((x) => x !== s))}>
                {s.replace(/^\w/, (c) => c.toUpperCase())}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex gap-4">
          <Field label="LinkedIn" className="flex-1">
            <Input value={form.linkedin} onChange={set("linkedin")} />
          </Field>
          <Field label="Portfolio" className="flex-1">
            <Input value={form.portfolio} onChange={set("portfolio")} />
          </Field>
          <Field label="Website" className="flex-1">
            <Input value={form.website} onChange={set("website")} />
          </Field>
        </div>
        <div className="flex justify-end gap-3">
          <Button size="lg" onClick={() => router.push("/independent/profile")}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" onClick={() => { setToast("Profile saved"); setTimeout(() => router.push("/independent/profile"), 600); }}>
            Save profile
          </Button>
        </div>
      </Card>
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
