"use client";

import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { useIndependentAccount } from "@/lib/independent/account";
import { SECTIONS } from "@/lib/independent/nav";

/**
 * The layout around it is a server component, so the shell is where the profile is read — the rail
 * avatar follows an IN-061 photo change from here, as the Team Builder's does.
 */
export function IndependentShell({ children }: { children: ReactNode }) {
  const { profile } = useIndependentAccount();
  return (
    <PortalShell sections={SECTIONS} profileHref="/independent/profile" avatar={profile.photo}>
      {children}
    </PortalShell>
  );
}
