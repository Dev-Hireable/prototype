"use client";

import { Page } from "@/components/independent/ui";
import { PasswordSettingsCard } from "@/components/portal/settings";

/** Figma "Settings / Security": DM Sans 24 header; 720 card, p 24, gap 16; rules light up as the new password meets them. */
export default function Security() {
  return (
    <Page title="Settings">
      <PasswordSettingsCard />
    </Page>
  );
}
