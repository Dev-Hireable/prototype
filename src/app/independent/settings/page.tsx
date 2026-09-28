"use client";

import Image from "next/image";
import { Page } from "@/components/independent/ui";
import { AccountSettingsCard } from "@/components/portal/settings";
import { useIndependentAccount } from "@/lib/independent/account";

export default function AccountSettings() {
  const { profile, setProfile } = useIndependentAccount();
  const [first = "", ...rest] = profile.name.split(" ");

  return (
    <Page title="Settings">
      {/* The card starts its form over whenever these saved values change: when the stored profile arrives after hydration, and after a save. */}
      <AccountSettingsCard
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
