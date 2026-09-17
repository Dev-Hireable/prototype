"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, Card, Chip, Field, Input, Page, Select, Textarea, Toast, useToast } from "@/components/independent/ui";
import { BIO_MAX, SKILL_SUGGESTIONS } from "@/lib/independent/data";
import { useDemo } from "@/lib/independent/store";
import { checkImage, IMAGE_TYPES, readImage } from "@/lib/team/data";

/** Figma "Profile / Talent profile · edit": 760 card, p 24, gap 16; 110px bio box; skill chips with ✕. */
export default function EditProfile() {
  const router = useRouter();
  const { profile, setProfile } = useDemo();
  /**
   * IN-061 — the form starts from the saved profile and writes back to it. It used to be seeded
   * from a module constant and thrown away on save, so "Profile saved" changed nothing.
   * The key re-seeds the fields once localStorage has hydrated after mount.
   */
  // The key covers every field the form seeds — keying on a few of them let a saved bio be
  // overwritten by the seed, because the form had mounted before localStorage hydrated.
  const hydrated = [profile.name, profile.headline, profile.rate, profile.level, profile.location, profile.bio.length, profile.skills.join(","), profile.photo.length, profile.links.linkedin].join("|");
  return <EditForm key={hydrated} profile={profile} save={setProfile} back={() => router.push("/independent/profile")} />;
}

function EditForm({ profile, save, back }: { profile: ReturnType<typeof useDemo>["profile"]; save: ReturnType<typeof useDemo>["setProfile"]; back: () => void }) {
  const [form, setForm] = useState({ ...profile, ...profile.links });
  const [skills, setSkills] = useState(profile.skills);
  const [skill, setSkill] = useState("");
  const [photo, setPhoto] = useState(profile.photo);
  const [toast, setToast] = useToast();
  const file = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const addSkill = (s: string) => {
    const value = s.trim();
    if (!value) return;
    setSkills((all) => (all.some((x) => x.toLowerCase() === value.toLowerCase()) ? all : [...all, value]));
    setSkill("");
  };
  /** IN-065 — suggestions narrow as you type, minus the ones already on the profile. */
  const suggestions = skill.trim()
    ? SKILL_SUGGESTIONS.filter((s) => s.toLowerCase().includes(skill.trim().toLowerCase()) && !skills.some((x) => x.toLowerCase() === s.toLowerCase())).slice(0, 6)
    : [];

  /** IN-061 — the fields a Team Builder-facing profile cannot go without. */
  const errors = {
    name: form.name.trim() ? "" : "Your name is what Team Builders search for.",
    headline: form.headline.trim() ? "" : "Add the role you are hiring out for.",
    // The rate is written "1,600" on the profile, so thousands separators count as numbers here.
    rate: /^\d[\d,]*(\.\d+)?$/.test(form.rate.trim()) ? "" : "A monthly rate in USD, numbers only.",
    location: form.location.trim() ? "" : "Where you work from — it sets the time zone expectation.",
  };
  const valid = Object.values(errors).every((e) => !e);

  return (
    <Page title="Edit profile">
      <Card className="mx-auto flex w-[760px] flex-col gap-4 p-6">
        <h2 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
          Edit profile
        </h2>
        <div className="flex items-center gap-4">
          <Image src={photo} alt="" width={128} height={128} className="size-16 rounded-full bg-[#d2d8db] object-cover" />
          <div className="flex min-w-0 flex-1 flex-col gap-1 leading-[1.4]">
            <p className="text-[13px] font-medium text-ink">Profile photo</p>
            <p className="text-[12px] text-ink-2">PNG or JPG, up to 5 MB. A clear headshot gets more invites.</p>
          </div>
          {/* IN-061 — a real file, read into a data URL so it survives the reload the demo runs on. */}
          <input
            ref={file}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const problem = checkImage(f);
              if (problem) return setToast(problem);
              setPhoto(await readImage(f));
              setToast("Photo ready — save to publish it");
            }}
          />
          <Button size="sm" onClick={() => file.current?.click()}>
            Change photo
          </Button>
        </div>
        <div className="flex gap-4">
          <Field label="Full name" className="flex-1" error={errors.name}>
            <Input value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Headline" className="flex-1" error={errors.headline}>
            <Input value={form.headline} onChange={set("headline")} />
          </Field>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="flex items-start justify-between leading-[1.4]">
            <span className="text-[13px] font-medium text-ink">Bio</span>
            <span className="text-[12px] text-ink-2">
              {form.bio.length} / {BIO_MAX}
            </span>
          </span>
          <Textarea maxLength={BIO_MAX} value={form.bio} onChange={set("bio")} className="h-[110px] !py-4 !text-ink" />
        </label>
        <div className="flex gap-4">
          <Field label="Monthly rate (USD)" className="flex-1" error={errors.rate}>
            <Input value={form.rate} onChange={set("rate")} inputMode="decimal" />
          </Field>
          <Field label="Experience level" className="flex-1">
            <Select options={["Beginner (0–2 years)", "Intermediate (2–5 years)", "Advanced (5–8 years)", "Expert (8+ years)"]} value={form.level} onChange={set("level")} />
          </Field>
          <Field label="Location" className="flex-1" error={errors.location}>
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
                  addSkill(suggestions[0] ?? skill);
                }
              }}
              placeholder="Add a skill — type to see suggestions"
            />
          </label>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => addSkill(s)} className="h-8 rounded-full border border-dashed border-border px-3 text-[12.5px] leading-[1.2] text-ink-2 hover:border-primary hover:text-primary">
                  + {s}
                </button>
              ))}
            </div>
          )}
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
        <div className="flex items-center justify-end gap-3">
          {!valid && <span className="mr-auto text-[12.5px] leading-[1.4] text-danger">Fill in the highlighted fields before saving.</span>}
          <Button size="lg" onClick={back}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant="primary"
            disabled={!valid}
            onClick={() => {
              save({
                name: form.name.trim(),
                headline: form.headline.trim(),
                bio: form.bio.trim(),
                rate: form.rate.trim(),
                level: form.level,
                location: form.location.trim(),
                photo,
                skills,
                links: { linkedin: form.linkedin.trim(), portfolio: form.portfolio.trim(), website: form.website.trim() },
              });
              setToast("Profile saved");
              setTimeout(back, 600);
            }}
          >
            Save profile
          </Button>
        </div>
      </Card>
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
