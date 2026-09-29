"use client";

import { Page } from "@/components/portal/ui";
import { PasswordSettingsCard } from "@/components/portal/settings";

export default function Security() {
  return (
    <Page title="Settings">
      <PasswordSettingsCard />
    </Page>
  );
}
