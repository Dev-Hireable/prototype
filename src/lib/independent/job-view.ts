"use client";

import { useDeal, usePostings } from "@/lib/demo/deal";
import { JOB_TYPE_LABEL } from "@/lib/demo/job-types";
import type { JobType } from "@/lib/demo/job-types";
import type { PlannedTask } from "@/lib/demo/tasks";
import type { Application } from "./data";

/** The job behind an application, as the talent's application, proposal and offer screens show it. */
export type JobView = {
  title: string;
  company: string;
  posted: string;
  description: string;
  budget: string;
  duration: string;
  experience: string;
  type: JobType;
  /** The type as the screens print it: Trial, Full-time or Part-time. */
  contract: string;
  /** A part-time role's hours a week. */
  hours?: number;
  skills: string[];
  expectation: string;
  /** A trial's tasks, as its Team Builder set them in the job post. */
  tasks: PlannedTask[];
  attachment?: string;
  location: string;
  industry: string;
  interview: { date: string; time: string; link: string };
};

/**
 * Reads the live posting and the shared engagement instead of a seed. These screens used to import
 * one sample role, so every application showed "Marketing Specialist" and a January interview no
 * matter what had been applied for or booked.
 */
export function useJobView(app: Application): JobView {
  const posting = usePostings().find((p) => p.slug === app.roleSlug);
  const deal = useDeal();
  const interview = deal?.roleSlug === app.roleSlug ? deal.interview : undefined;
  // Booked as "30/09/2026, 09:30 AM (EST)" — the date, then the time.
  const [date = "—", time = "—"] = interview?.when.split(", ") ?? [];
  return {
    title: posting?.title ?? app.title,
    company: posting?.company ?? app.company,
    // A closed role keeps the applications already in its tracker; the header says why it has left the board.
    posted: posting?.closed ? "Closed to new applications" : (posting?.posted ?? ""),
    description: posting?.description.join("\n\n") ?? "",
    budget: posting?.rateRange ?? "—",
    duration: posting?.duration ?? "30 Days",
    experience: posting?.level ?? "—",
    type: posting?.type ?? "trial",
    contract: JOB_TYPE_LABEL[posting?.type ?? "trial"],
    hours: posting?.hours,
    skills: posting?.skills ?? [],
    expectation: posting?.expectation ?? "",
    tasks: posting?.tasks ?? [],
    attachment: posting?.attachment,
    location: posting?.location ?? "",
    industry: posting?.industry ?? "",
    interview: { date, time, link: interview?.link ?? "" },
  };
}
