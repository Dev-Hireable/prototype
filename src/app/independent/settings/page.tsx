"use client";

import Image from "next/image";
import { Page } from "@/components/independent/ui";
import { AccountSettingsCard } from "@/components/portal/settings";
import { useDemo } from "@/lib/independent/store";

/** Figma "Settings / Account": DM Sans 24 header; 720 card, p 24, gap 16; 64px avatar row; paired fields gap 16. */
export default function AccountSettings() {
  const { profile, setProfile } = useDemo();
  const [first = "", ...rest] = profile.name.split(" ");

  return (
    <Page title="Settings">
      {/* Keyed on the stored values: usePersisted hydrates after mount, and the card copies
          `initial` into state once, so without this the form keeps showing the seed. */}
      <AccountSettingsCard
        key={`${profile.name}|${profile.email}|${profile.phone}|${profile.timezone}|${profile.photo.length}`}
        initial={{ first, last: rest.join(" "), email: profile.email, phone: profile.phone, tz: profile.timezone, lang: "English" }}
        avatar={<Image src={profile.photo} alt="" width={128} height={128} className="size-16 rounded-full bg-white object-cover" />}
        emailLabel="Email"
        accountType="Independent Contractor"
        languageOptions={["English", "Filipino"]}
        /* IN-067 — a name saved here is the name on the profile Team Builders read. */
        onSave={(v) => setProfile({ name: `${v.first} ${v.last}`.trim(), email: v.email, phone: v.phone, timezone: v.tz })}
        onPhoto={(photo) => setProfile({ photo })}
      />
    </Page>
  );
}
