"use client";

import { PortalShell } from "@/components/portal/PortalShell";
import { SECTIONS } from "@/lib/admin/nav";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell sections={SECTIONS} profileHref="/admin/profile" avatar="/admin/avatar.jpg">
      {children}
    </PortalShell>
  );
}
