"use client";

import { Page } from "@/components/independent/ui";
import { AccountSettingsCard } from "@/components/portal/settings";
import { Avatar } from "@/components/team/ui";
import { useTeamAccount } from "@/lib/team/account";

/** Figma "Settings / Account" (Team Builder) — identical frame to the Independent one. */
export default function AccountSettings() {
  const { profile, setProfile } = useTeamAccount();
  const [first = "", ...rest] = profile.name.split(" ");

  return (
    <Page title="Settings">
      {/* Keyed on the stored values: the saved profile arrives after hydration, and the card copies
          `initial` into state once, so without this the form keeps showing the seed. */}
      <AccountSettingsCard
        key={`${profile.name}|${profile.email}|${profile.phone}|${profile.timezone}`}
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
