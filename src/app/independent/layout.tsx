import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/PortalShell";
import { QuizGate } from "@/components/portal/QuizGate";
import { SECTIONS } from "@/lib/independent/nav";

export const metadata: Metadata = { title: "Hireable — Independent" };

export default function IndependentLayout({ children }: LayoutProps<"/independent">) {
  return (
    <QuizGate side="independent">
      <PortalShell sections={SECTIONS} profileHref="/independent/profile" avatar="/independent/avatar.jpg">
        {children}
      </PortalShell>
    </QuizGate>
  );
}
