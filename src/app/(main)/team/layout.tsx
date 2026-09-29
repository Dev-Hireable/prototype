import type { Metadata } from "next";
import { QuizGate } from "@/components/portal/quiz-gate";
import { TeamShell } from "./_components/team-shell";

export const metadata: Metadata = { title: "Hireable — Team Builder" };

export default function TeamLayout({ children }: LayoutProps<"/team">) {
  return (
    <QuizGate side="team">
      <TeamShell>{children}</TeamShell>
    </QuizGate>
  );
}
