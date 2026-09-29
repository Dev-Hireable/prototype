import type { Metadata } from "next";
import { QuizGate } from "@/components/portal/quiz-gate";
import { IndependentShell } from "./_components/independent-shell";

export const metadata: Metadata = { title: "Hireable — Independent" };

export default function IndependentLayout({ children }: LayoutProps<"/independent">) {
  return (
    <QuizGate side="independent">
      <IndependentShell>{children}</IndependentShell>
    </QuizGate>
  );
}
