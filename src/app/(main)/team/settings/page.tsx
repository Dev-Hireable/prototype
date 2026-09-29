"use client";

import { Page } from "@/components/independent/ui";
import { AccountSettingsCard } from "@/components/portal/settings";
import { Avatar } from "@/components/team/ui";
import { useTeamAccount } from "@/lib/team/account";

export default function AccountSettings() {
  const { profile, setProfile } = useTeamAccount();
  const [first = "", ...rest] = profile.name.split(" ");

  return (
    <Page title="Settings">
      {/* The card starts its form over whenever these saved values change: when the stored profile arrives after hydration, and after a save. */}
      <AccountSettingsCard
        initial={{ first, last: rest.join(" "), email: profile.email, phone: profile.phone, tz: profile.timezone, lang: "English" }}
        avatar={<Avatar src={profile.photo} size={64} />}
        emailLabel="Work email"
        accountType="Team Builder"
        languageOptions={["English", "Filipino"]}
        /* TB-099 — a name saved here is the same name the profile page and the dashboard show. */
        onSave={(v) => setProfile({ name: `${v.first} ${v.last}`.trim(), email: v.email, phone: v.phone, timezone: v.tz })}
        onPhoto={(photo) => setProfile({ photo })}
      />
    </Page>
  );
}
