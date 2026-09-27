import type { Metadata } from "next";
import { QuizGate } from "@/components/portal/QuizGate";
import { TeamShell } from "./Shell";

export const metadata: Metadata = { title: "Hireable — Team Builder" };

export default function TeamLayout({ children }: LayoutProps<"/team">) {
  return (
    <QuizGate side="team">
      <TeamShell>{children}</TeamShell>
    </QuizGate>
  );
}
