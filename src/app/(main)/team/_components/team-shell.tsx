"use client";

import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal/portal-shell";
import { SECTIONS } from "@/lib/team/nav";
import { useTeamAccount } from "@/lib/team/account";

/**
 * The layout around it is a server component, so the shell is where the profile is read — the rail
 * avatar follows a TB-120 photo change from here.
 */
export function TeamShell({ children }: { children: ReactNode }) {
  const { profile } = useTeamAccount();
  return (
    <PortalShell sections={SECTIONS} profileHref="/team/profile" avatar={profile.photo}>
      {children}
    </PortalShell>
  );
}
