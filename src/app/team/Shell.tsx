"use client";

import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { SECTIONS } from "@/lib/team/nav";
import { useDemo } from "@/lib/team/store";

/**
 * The shell has to sit inside DemoProvider to read the profile, and the layout around it is a
 * server component — so the rail avatar follows a TB-120 photo change from here.
 */
export function TeamShell({ children }: { children: ReactNode }) {
  const { profile } = useDemo();
  return (
    <PortalShell sections={SECTIONS} profileHref="/team/profile" avatar={profile.photo}>
      {children}
    </PortalShell>
  );
}
