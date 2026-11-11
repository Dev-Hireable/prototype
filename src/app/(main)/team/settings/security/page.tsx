"use client";

import { Page } from "@/components/kit/page";
import { PasswordSettingsCard } from "@/components/portal/settings";

export default function Security() {
  return (
    <Page title="Settings">
      <PasswordSettingsCard />
    </Page>
  );
}
