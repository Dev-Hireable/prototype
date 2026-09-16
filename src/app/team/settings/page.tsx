"use client";

import { Page } from "@/components/independent/ui";
import { AccountSettingsCard } from "@/components/portal/settings";
import { Avatar } from "@/components/team/ui";
import { ME } from "@/lib/team/data";

const INITIAL = { first: "Alex", last: "Rivera", email: "alex@nairobisolutions.com", phone: "+63 917 555 0142", tz: "(GMT+8) Manila", lang: "English" };

/** Figma "Settings / Account" (Team Builder) — identical frame to the Independent one. */
export default function AccountSettings() {
  return (
    <Page title="Settings">
      <AccountSettingsCard
        initial={INITIAL}
        avatar={<Avatar src={ME.avatar} size={64} />}
        emailLabel="Work email"
        timeZoneOptions={["(GMT+8) Manila", "(GMT-5) New York", "(GMT+0) London"]}
        languageOptions={["English", "Filipino"]}
      />
    </Page>
  );
}
