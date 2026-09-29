"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useHydrated } from "@/lib/demo/deal";
import { quizPath, quizTaken, type WorkStyleSide } from "@/lib/demo/work-style";

/**
 * The work-style quiz comes before the portal. A Team Builder or an Independent who hasn't taken it
 * is sent there from whichever page of their portal they open (a reset demo included), and the
 * quiz's own "View dashboard" brings them back once the answers are saved. Retaking it from the
 * profile runs the same quiz; the portal stays open to them while they do.
 *
 * The answers live in this browser's storage, so the check waits for hydration: the server and the
 * first paint render the portal as before, and only then does a missing quiz swap it out.
 */
export function QuizGate({ side, children }: { side: WorkStyleSide; children: ReactNode }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const due = hydrated && !quizTaken(side);

  useEffect(() => {
    // Only this browser knows whether the quiz was taken, so no server redirect can; nothing of the
    // portal shows meanwhile (null below).
    // react-doctor-disable-next-line react-doctor/nextjs-no-client-side-redirect
    if (due) router.replace(quizPath(side));
  }, [due, router, side]);

  return due ? null : children;
}
