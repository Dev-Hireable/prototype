import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/PortalShell";
import { SECTIONS } from "@/lib/team/nav";
import { DemoProvider } from "@/lib/team/store";

export const metadata: Metadata = { title: "Hireable — Team Builder" };

export default function TeamLayout({ children }: LayoutProps<"/team">) {
  return (
    <DemoProvider>
      <PortalShell sections={SECTIONS} profileHref="/team/profile" avatar="/team/alex.jpg">
        {children}
      </PortalShell>
    </DemoProvider>
  );
}
