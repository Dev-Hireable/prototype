"use client";

import { Page } from "@/components/independent/ui";
import { PasswordSettingsCard } from "@/components/portal/settings";

/** Figma "Settings / Security (change password)". */
export default function Security() {
  return (
    <Page title="Settings">
      <PasswordSettingsCard />
    </Page>
  );
}
