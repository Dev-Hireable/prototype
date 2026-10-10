"use client";

import Link from "next/link";
import { Avatar, Page, Toast } from "@/components/portal/ui";
import { Completeness, EditableRow, ProfileHeader, ProfileSection } from "@/components/portal/profile-editor";
import { WorkStyleSection } from "@/components/team/work-style-section";
import { useToast, type SetToast } from "@/lib/portal/toast";
import { IMAGE_MAX_MB } from "@/lib/portal/profile-fields";
import { useTeamAccount } from "@/lib/team/account";
import { usePickedImage } from "./_lib/image";

type Key = "name" | "title" | "about";

/**
 * Who you are, as independents see you. The name is the account's legal name: locked here and in
 * Settings, changed through support (TB-121). Email, phone and time zone live in Settings › Account
 * only, linked from here, so they're kept in one place.
 */
const ROWS: [label: string, key: Key, kind?: "long"][] = [["Full name", "name"], ["Job title", "title"], ["Bio", "about", "long"]];

/**
 * The personal profile, on the shared profile editor: the photo with its camera
 * button, the fields that each edit in place and save on their own (TB-122), and the work style:
 * the company's tags, which independents see, with the quiz that gives them (TB-096).
 */
export default function PersonalProfile() {
  const { profile, setProfile, company } = useTeamAccount();
  const [toast, setToast] = useToast();
  /** TB-120 — the chosen file is previewed and only written on Save. */
  const photo = usePickedImage(setToast);

  return (
    <Page title="Profile">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
        <ProfileHeader
          image={<Avatar src={photo.preview ?? profile.photo} size={80} />}
          imageLabel={`Change photo — JPG or PNG, up to ${IMAGE_MAX_MB}MB`}
          name={profile.name}
          pending={!!photo.preview}
          onPick={photo.pick}
          onDiscard={photo.clear}
          onSave={() => {
            if (photo.preview) setProfile({ photo: photo.preview });
            photo.clear();
            setToast("Photo updated everywhere");
          }}
        >
          <p className="truncate text-[14px] leading-[1.4] text-ink-2">
            {profile.title} · {company.name}
          </p>
          {/* TB-094 — read-only. */}
          <p className="text-[12.5px] leading-[1.4] text-ink-2">Member since {profile.memberSince}</p>
        </ProfileHeader>

        <ProfileFields onToast={setToast} />

        <WorkStyleSection />
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** The fields, each edited in place and saved on its own (the name locked), and the progress while any is empty. */
function ProfileFields({ onToast }: { onToast: SetToast }) {
  const { profile, setProfile } = useTeamAccount();
  const done = ROWS.filter(([, k]) => String(profile[k] ?? "").trim()).length;
  return (
    <>
      {done < ROWS.length && <Completeness done={done} total={ROWS.length}>Fill in the rest so independents know who they&apos;re talking to.</Completeness>}

      <ProfileSection title="About you" description="How you appear to independents in messages, interviews and offers.">
        <div className="-mx-2 flex flex-col px-2">
          {ROWS.map(([label, key, kind]) => (
            <EditableRow
              key={key}
              label={label}
              value={String(profile[key] ?? "")}
              kind={kind}
              locked={key === "name" ? "Contact support to change your name." : undefined}
              onSave={(v) => {
                setProfile({ [key]: v });
                onToast(`${label} saved`);
              }}
            />
          ))}
        </div>
        <p className="text-[13px] leading-[1.45] text-ink-2">
          Email, phone and time zone are in{" "}
          <Link href="/team/settings" className="font-medium text-primary hover:underline">
            Settings › Account
          </Link>
          .
        </p>
      </ProfileSection>
    </>
  );
}
