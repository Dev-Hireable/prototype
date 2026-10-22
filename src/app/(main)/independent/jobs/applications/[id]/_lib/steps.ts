import type { Deal } from "@/lib/demo/deal";
import type { Application } from "@/lib/independent/data";
import type { JobView } from "@/lib/independent/job-view";
import { PIPELINE } from "@/lib/portal/stages";
import type { SetToast } from "@/lib/portal/toast";
import type { Tone } from "@/lib/portal/tone";

/** What each stage's card reads: the application, its job, and the shared engagement when it's this one. */
export type StepProps = { app: Application; job: JobView; live: Deal | null };

/** Answering an interview invitation — accept, decline or ask for a new time — and the toast the card reports with. */
export type InterviewActions = { onAccept: () => void; onDecline: () => void; onReschedule: () => void; onToast: SetToast };

/**
 * The small badge that stands where the pipeline tracker was: the stage the application is at. A
 * signed contract reads as its status, so an accepted trial offer says "Trial started" and "Hired" is
 * left to a full-time or part-time role (#131); a turned-down or withdrawn one says "Closed" (#132).
 */
export function stageBadgeOf(app: Application): { label: string; tone: Tone } {
  if (app.closed) return { label: "Closed", tone: "neutral" };
  if (app.stage === "hired") return app.status ?? { label: "Hired", tone: "ok" };
  return { label: PIPELINE.find((p) => p.key === app.stage)?.label ?? "Applied", tone: "info" };
}
