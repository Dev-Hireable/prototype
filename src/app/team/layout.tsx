import type { Metadata } from "next";
import { QuizGate } from "@/components/portal/QuizGate";
import { DemoProvider } from "@/lib/team/store";
import { TeamShell } from "./Shell";

export const metadata: Metadata = { title: "Hireable — Team Builder" };

export default function TeamLayout({ children }: LayoutProps<"/team">) {
  return (
    <QuizGate side="team">
      <DemoProvider>
        <TeamShell>{children}</TeamShell>
      </DemoProvider>
    </QuizGate>
  );
}
