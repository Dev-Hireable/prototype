import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/PortalShell";
import { DemoProvider } from "@/lib/independent/store";
import { SECTIONS } from "@/lib/independent/nav";

export const metadata: Metadata = { title: "Hireable — Independent" };

export default function IndependentLayout({ children }: LayoutProps<"/independent">) {
  return (
    <DemoProvider>
      <PortalShell sections={SECTIONS} profileHref="/independent/profile" avatar="/independent/avatar.jpg">
        {children}
      </PortalShell>
    </DemoProvider>
  );
}
