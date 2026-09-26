"use client";

import { useState } from "react";
import { LinkButton, Page, Toast, useToast } from "@/components/independent/ui";
import { Completeness, EditableRow, ProfileHeader, ProfileSection } from "@/components/portal/ProfileEditor";
import { TraitTag } from "@/components/portal/TraitTag";
import { Avatar } from "@/components/team/ui";
import { traitTagsFor } from "@/lib/demo/work-style";
import { checkImage, IMAGE_MAX_MB, readImage } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";

type Key = "name" | "title" | "email" | "phone" | "timezone" | "about";

/** The rows, in two groups: who you are, and how to reach you. */
const GROUPS: { title: string; description: string; rows: [label: string, key: Key, kind?: "long" | "timezone"][] }[] = [
  { title: "About you", description: "How you appear to independents in messages, interviews and offers.", rows: [["Full name", "name"], ["Job title", "title"], ["About you", "about", "long"]] },
  { title: "Contact", description: "Where interview invites and notifications reach you.", rows: [["Work email", "email"], ["Phone", "phone"], ["Time zone", "timezone", "timezone"]] },
];

/**
 * Figma "Profile / Personal profile", on the shared profile editor: the photo with its camera
 * button, the fields in two groups that each edit in place and save on their own (TB-121 / TB-122),
 * and the work style — the company's trait badges, which independents see, retaken from the company
 * profile (TB-096).
 */
export default function PersonalProfile() {
  const { profile, setProfile, company, workStyle } = useDemo();
  const [toast, setToast] = useToast();
  /** TB-120 — the chosen file is previewed and only written on Save. */
  const [preview, setPreview] = useState<string | null>(null);
  const tags = traitTagsFor(workStyle, "team");
  const keys = GROUPS.flatMap((g) => g.rows.map((r) => r[1]));
  const done = keys.filter((k) => String(profile[k] ?? "").trim()).length;

  const pick = async (f: File | undefined) => {
    if (!f) return;
    const why = checkImage(f);
    if (why) return setToast(why);
    setPreview(await readImage(f));
  };

  return (
    <Page title="Profile">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
        <ProfileHeader
          image={<Avatar src={preview ?? profile.photo} size={80} />}
          imageLabel={`Change photo — JPG or PNG, up to ${IMAGE_MAX_MB}MB`}
          name={profile.name}
          pending={!!preview}
          onPick={pick}
          onDiscard={() => setPreview(null)}
          onSave={() => {
            if (preview) setProfile({ photo: preview });
            setPreview(null);
            setToast("Photo updated everywhere");
          }}
        >
          <p className="truncate text-[14px] leading-[1.4] text-ink-2">
            {profile.title} · {company.name}
          </p>
          {/* TB-094 — read-only: the one thing here that can't be edited. */}
          <p className="text-[12.5px] leading-[1.4] text-ink-2">Member since {profile.memberSince}</p>
        </ProfileHeader>

        {done < keys.length && <Completeness done={done} total={keys.length}>Fill in the rest so independents know who they&apos;re talking to.</Completeness>}

        {GROUPS.map((g) => (
          <ProfileSection key={g.title} title={g.title} description={g.description}>
            <div className="-mx-2 flex flex-col px-2">
              {g.rows.map(([label, key, kind]) => (
                <EditableRow
                  key={key}
                  label={label}
                  value={String(profile[key] ?? "")}
                  kind={kind}
                  onSave={(v) => {
                    setProfile({ [key]: v });
                    setToast(`${label} saved`);
                  }}
                />
              ))}
            </div>
          </ProfileSection>
        ))}

        {/* TB-096 — the badges are the company's, shown where independents see them; the quiz lives there. */}
        <ProfileSection
          title="Work style"
          description="Your badges from the work-style quiz. Independents see them on your company profile, and matching uses them."
          action={
            <LinkButton size="sm" href="/team/profile/company">
              {tags.length ? "Manage" : "Take the quiz"}
            </LinkButton>
          }
        >
          {tags.length ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <TraitTag key={`${t.trait}-${t.label}`} tag={t} />
              ))}
            </div>
          ) : (
            <p className="text-[13px] leading-[1.45] text-ink-2">No badges yet. Take the quiz from the company profile and they appear here.</p>
          )}
        </ProfileSection>
      </div>
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
