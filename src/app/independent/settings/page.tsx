"use client";

import Image from "next/image";
import { Page } from "@/components/independent/ui";
import { AccountSettingsCard } from "@/components/portal/settings";
import { ME } from "@/lib/independent/data";

const INITIAL = { first: "Juan", last: "Dela Cruz", email: "juandelacruz@gmail.com", phone: "+63 917 555 0142", tz: "(GMT+8) Manila", lang: "English" };

/** Figma "Settings / Account": DM Sans 24 header; 720 card, p 24, gap 16; 64px avatar row; paired fields gap 16. */
export default function AccountSettings() {
  return (
    <Page title="Settings">
      <AccountSettingsCard
        initial={INITIAL}
        avatar={<Image src={ME.avatar} alt="" width={128} height={128} className="size-16 rounded-full bg-white object-cover" />}
        emailLabel="Email"
        timeZoneOptions={["(GMT+8) Manila", "(GMT+0) London", "(GMT-5) New York"]}
        languageOptions={["English", "Filipino"]}
      />
    </Page>
  );
}
