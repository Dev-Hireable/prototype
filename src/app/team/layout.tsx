import type { Metadata } from "next";
import { DemoProvider } from "@/lib/team/store";
import { TeamShell } from "./Shell";

export const metadata: Metadata = { title: "Hireable — Team Builder" };

export default function TeamLayout({ children }: LayoutProps<"/team">) {
  return (
    <DemoProvider>
      <TeamShell>{children}</TeamShell>
    </DemoProvider>
  );
}
