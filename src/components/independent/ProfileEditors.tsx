"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";
import { Button, Chip, Field, Input, Select, Textarea } from "@/components/independent/ui";
import { SkillPicker } from "@/components/portal/controls";
import { EditPanel } from "@/components/portal/InlineEdit";
import { BIO_MAX, SKILL_SUGGESTIONS } from "@/lib/independent/data";
import type { Profile } from "@/lib/independent/store";
import { GENERAL_SKILLS } from "@/lib/portal/skills";
import { checkImage, IMAGE_TYPES, isUrl, readImage } from "@/lib/team/data";

/*
 * The profile edited where it's read: the pencil beside a part turns it into one of these — the same
 * EditPanel Create Role's Review uses, with Cancel / Save. They replaced the separate Edit profile
 * page and the bio modal (IN-061, IN-062, IN-065).
 */

/** IN-061 — the experience levels a talent picks from. */
const LEVELS = ["Beginner (0–2 years)", "Intermediate (2–5 years)", "Advanced (5–8 years)", "Expert (8+ years)"];

/**
 * What the skill picker suggests: the sales skills the talent side has always offered (IN-065), then
 * the catalogue roles are posted with, so a talent's skills read the same as the roles asking for them.
 */
const SKILL_OPTIONS = [...SKILL_SUGGESTIONS, ...GENERAL_SKILLS].filter((s, i, all) => all.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i);
const MAX_SKILLS = 10;

/** A link is optional, but a filled one has to be a link (a bare domain is fine). */
const linkError = (v: string) => (v.trim() && !isUrl(v) ? "Enter a link, like yourname.com." : "");
const cap = (s: string) => s.replace(/^\w/, (c) => c.toUpperCase());

/** Create Role's helper row under a field: what the field asks for on the left, a count on the right. */
function Helper({ left, right }: { left: string; right: string }) {
  return (
    <span className="flex justify-between text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
      <span>{left}</span>
      <span>{right}</span>
    </span>
  );
}

/**
 * IN-061 — the header: photo, name and headline, where you are and your links, then rate and
 * experience. The required fields are the ones a Team Builder-facing profile can't go without.
 */
export function HeroEditor({ profile, onSave, onCancel, onMessage }: { profile: Profile; onSave: (patch: Partial<Profile>) => void; onCancel: () => void; onMessage: (message: string) => void }) {
  const [form, setForm] = useState({
    name: profile.name,
    headline: profile.headline,
    location: profile.location,
    rate: profile.rate,
    level: profile.level,
    website: profile.links.website,
    linkedin: profile.links.linkedin,
  });
  const [photo, setPhoto] = useState(profile.photo);
  const file = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const errors = {
    name: form.name.trim() ? "" : "Your name is what Team Builders search for.",
    headline: form.headline.trim() ? "" : "Add the role you are hiring out for.",
    // The rate is written "1,600" on the profile, so thousands separators count as numbers here.
    rate: /^\d[\d,]*(\.\d+)?$/.test(form.rate.trim()) ? "" : "A monthly rate in USD, numbers only.",
    location: form.location.trim() ? "" : "Where you work from — it sets the time zone expectation.",
    website: linkError(form.website),
    linkedin: linkError(form.linkedin),
  };
  const valid = Object.values(errors).every((e) => !e);

  return (
    <EditPanel
      label="Profile details"
      canSave={valid}
      saveTip="Fill in the highlighted fields first"
      onCancel={onCancel}
      onSave={() =>
        onSave({
          name: form.name.trim(),
          headline: form.headline.trim(),
          rate: form.rate.trim(),
          level: form.level,
          location: form.location.trim(),
          photo,
          links: { ...profile.links, website: form.website.trim(), linkedin: form.linkedin.trim() },
        })
      }
    >
      <div className="@container/edit flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <Image src={photo} alt="" width={160} height={160} className="size-20 rounded-full bg-[#d2d8db] object-cover" />
          {/* A real file, read into a data URL so it survives the reload the demo runs on. */}
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
              if (problem) return onMessage(problem);
              setPhoto(await readImage(f));
            }}
          />
          <Button size="sm" onClick={() => file.current?.click()}>
            Change photo
          </Button>
        </div>
        <div className="grid gap-4 @md/edit:grid-cols-2">
          <Field label="Full name" error={errors.name}>
            <Input autoFocus value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Headline" error={errors.headline}>
            <Input value={form.headline} onChange={set("headline")} />
          </Field>
          <Field label="Monthly rate (USD)" error={errors.rate}>
            <Input value={form.rate} onChange={set("rate")} inputMode="decimal" />
          </Field>
          <Field label="Experience level">
            <Select options={LEVELS} value={form.level} onChange={set("level")} />
          </Field>
          <Field label="Location" error={errors.location} className="@md/edit:col-span-2">
            <Input value={form.location} onChange={set("location")} />
          </Field>
          <Field label="Website" error={errors.website}>
            <Input value={form.website} onChange={set("website")} placeholder="yourname.com" />
          </Field>
          <Field label="LinkedIn" error={errors.linkedin}>
            <Input value={form.linkedin} onChange={set("linkedin")} placeholder="linkedin.com/in/yourname" />
          </Field>
        </div>
      </div>
    </EditPanel>
  );
}

/** IN-062 — the bio, 500 characters at most, saved the moment you press Save. */
export function BioEditor({ value, onSave, onCancel }: { value: string; onSave: (bio: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(value);
  return (
    <EditPanel label="Bio" canSave={!!text.trim()} saveTip="Your bio can't be empty" onCancel={onCancel} onSave={() => onSave(text.trim())}>
      <span className="flex flex-col gap-2">
        <Textarea autoFocus aria-label="Bio" rows={5} maxLength={BIO_MAX} value={text} onChange={(e) => setText(e.target.value)} />
        <Helper left="What Team Builders read first, above your skills and history" right={`${text.length} / ${BIO_MAX}`} />
      </span>
    </EditPanel>
  );
}

/**
 * IN-065 — Create Role's skill picker: it lists suggestions as soon as it has focus and narrows them
 * as you type, lets a skill that isn't listed be added as typed, and Backspace takes the last one
 * off. The chips under it come off with their ✕.
 */
export function SkillsEditor({ skills, onSave, onCancel }: { skills: string[]; onSave: (skills: string[]) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(skills);
  return (
    <EditPanel label="Skills" canSave={draft.length > 0} saveTip="Add at least one skill" onCancel={onCancel} onSave={() => onSave(draft)}>
      <span className="flex flex-col gap-2">
        <SkillPicker options={SKILL_OPTIONS} value={draft} onChange={setDraft} max={MAX_SKILLS} />
        <Helper left={`Select up to ${MAX_SKILLS} skills`} right={`${draft.length} / ${MAX_SKILLS}`} />
      </span>
      {draft.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {draft.map((s) => (
            <Chip key={s} onRemove={() => setDraft((all) => all.filter((x) => x !== s))}>
              {cap(s)}
            </Chip>
          ))}
        </div>
      )}
    </EditPanel>
  );
}

/** The links Team Builders open from the profile: portfolio, website and LinkedIn. */
export function LinksEditor({ links, onSave, onCancel }: { links: Profile["links"]; onSave: (links: Profile["links"]) => void; onCancel: () => void }) {
  const [form, setForm] = useState(links);
  const set = (k: keyof Profile["links"]) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const errors = { portfolio: linkError(form.portfolio), website: linkError(form.website), linkedin: linkError(form.linkedin) };
  const valid = Object.values(errors).every((e) => !e);

  return (
    <EditPanel
      label="Portfolio links"
      canSave={valid}
      saveTip="Fix the highlighted links first"
      onCancel={onCancel}
      onSave={() => onSave({ portfolio: form.portfolio.trim(), website: form.website.trim(), linkedin: form.linkedin.trim() })}
    >
      <Field label="Portfolio" error={errors.portfolio}>
        <Input autoFocus value={form.portfolio} onChange={set("portfolio")} placeholder="yourname.notion.site" />
      </Field>
      <Field label="Website" error={errors.website}>
        <Input value={form.website} onChange={set("website")} placeholder="yourname.com" />
      </Field>
      <Field label="LinkedIn" error={errors.linkedin}>
        <Input value={form.linkedin} onChange={set("linkedin")} placeholder="linkedin.com/in/yourname" />
      </Field>
    </EditPanel>
  );
}
