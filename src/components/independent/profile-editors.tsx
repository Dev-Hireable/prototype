"use client";

import Image from "next/image";
import { useState, type ChangeEvent } from "react";
import { Chip, Field, Input, Select, Textarea } from "@/components/portal/ui";
import { SkillPicker } from "@/components/portal/controls";
import { EditPanel } from "@/components/portal/inline-edit";
import { EXPERIENCE_LEVELS } from "@/lib/contract/job-types";
import { BIO_MAX, SKILL_SUGGESTIONS } from "@/lib/independent/data";
import type { Profile } from "@/lib/independent/account";
import { GENERAL_SKILLS } from "@/lib/portal/skills";
import type { SetToast } from "@/lib/portal/toast";
import { checkImage, IMAGE_MAX_MB, isUrl, readImage } from "@/lib/portal/profile-fields";
import { ImagePicker } from "@/components/portal/profile-editor";

/*
 * The profile edited where it's read: the pencil beside a part turns it into one of these — the same
 * EditPanel Create Role's Review uses, with Cancel / Save. They replaced the separate Edit profile
 * page and the bio modal (IN-061, IN-062, IN-065).
 */


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

/** The header's fields as the form holds them: the profile's own, with its website and LinkedIn beside them. */
function heroForm(profile: Profile) {
  return {
    name: profile.name,
    headline: profile.headline,
    location: profile.location,
    rate: profile.rate,
    level: profile.level,
    website: profile.links.website,
    linkedin: profile.links.linkedin,
  };
}

type HeroForm = ReturnType<typeof heroForm>;

/** Each header field's problem, or "" when it's fine: the required ones, the rate as a number, and the two links. */
function heroErrors(form: HeroForm) {
  return {
    name: form.name.trim() ? "" : "Your name is what Team Builders search for.",
    headline: form.headline.trim() ? "" : "Add the role you are hiring out for.",
    // The rate is written "1,600" on the profile, so thousands separators count as numbers here.
    rate: /^\d[\d,]*(\.\d+)?$/.test(form.rate.trim()) ? "" : "A monthly rate in USD, numbers only.",
    location: form.location.trim() ? "" : "Where you work from — it sets the time zone expectation.",
    website: linkError(form.website),
    linkedin: linkError(form.linkedin),
  };
}

/**
 * IN-061 — the header: photo, name and headline, where you are and your links, then rate and
 * experience. The required fields are the ones a Team Builder-facing profile can't go without.
 */
export function HeroEditor({ profile, onSave, onCancel, onMessage }: { profile: Profile; onSave: (patch: Partial<Profile>) => void; onCancel: () => void; onMessage: SetToast }) {
  const [form, setForm] = useState(() => heroForm(profile));
  const [photo, setPhoto] = useState(profile.photo);
  const set = (k: keyof HeroForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const errors = heroErrors(form);
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
        <PhotoField photo={photo} saved={profile.photo} onPhoto={setPhoto} onMessage={onMessage} />
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
            <Select options={EXPERIENCE_LEVELS} value={form.level} onChange={set("level")} />
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

/**
 * The header's photo: the same photo control as the Team Builder's profile (ImagePicker). A real
 * file, read into a data URL so it survives the reload the demo runs on; it's saved with the rest on
 * Save. `saved` is the photo on the profile now, so a new pick can say it isn't saved yet.
 */
function PhotoField({ photo, saved, onPhoto, onMessage }: { photo: string; saved: string; onPhoto: (photo: string) => void; onMessage: SetToast }) {
  return (
    <div className="flex items-center gap-4">
      <ImagePicker
        image={<Image src={photo} alt="" width={160} height={160} className="size-20 rounded-full bg-[#d2d8db] object-cover" />}
        label={`Change photo — JPG or PNG, up to ${IMAGE_MAX_MB}MB`}
        onPick={async (f) => {
          if (!f) return;
          const problem = checkImage(f);
          if (problem) return onMessage(problem, "danger");
          onPhoto(await readImage(f));
        }}
      />
      <p className="text-[12.5px] leading-[1.4] text-ink-2">{photo !== saved ? "New photo — saved with the rest when you press Save." : `Your photo · JPG or PNG, up to ${IMAGE_MAX_MB}MB`}</p>
    </div>
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
