import type { Deal } from "@/lib/demo/deal";
import type { Application } from "@/lib/independent/data";
import type { JobView } from "@/lib/independent/job-view";
import type { SetToast } from "@/lib/portal/toast";

/** What each stage's card reads: the application, its job, and the shared engagement when it's this one. */
export type StepProps = { app: Application; job: JobView; live: Deal | null };

/** Answering an interview invitation, and the toast the card reports with. */
export type InterviewActions = { onAccept: () => void; onDecline: () => void; onToast: SetToast };
