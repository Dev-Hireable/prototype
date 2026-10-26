import Link from "next/link";
import type { ReactNode } from "react";
import { FactsBox } from "@/components/portal/facts-box";
import { durationDays, formatDate, trialLength } from "@/lib/portal/dates";
import { hoursLabel, payFor, postedStart } from "@/lib/contract/job-types";
import type { JobView } from "@/lib/independent/job-view";

/**
 * The role the proposal answers, beside the steps that write it: what it is, and its terms. A
 * trial's tasks are shared with the offer, once the proposal is accepted, and the notes and link
 * left for the Independent once they're hired, so neither is here.
 */
export function JobPost({ job, back }: { job: JobView; back: string }) {
  return (
    <section className="flex flex-col gap-6 text-[14px] leading-[1.2] tracking-[0.2px]">
      {job.description && (
        <div className="flex flex-col gap-3 text-ink">
          <h3 className="font-semibold">About the role</h3>
          <p className="leading-[1.4] whitespace-pre-line">{job.description}</p>
        </div>
      )}
      <PostTerms job={job} back={back} />
    </section>
  );
}

/**
 * The role's terms, a row each: the role (back to the application), its pay, the contract, how long
 * a trial runs or the day a role starts, and a part-time role's hours.
 */
function PostTerms({ job, back }: { job: JobView; back: string }) {
  const rows: [string, ReactNode][] = [
    [
      "ROLE",
      <Link key="r" href={back} className="text-accent-ink underline">
        {job.title}
      </Link>,
    ],
    ["PAY", payFor(job.type, job.budget)],
    ["CONTRACT", job.contract],
    // A trial counts working days; a role's posted start ("Starts in 2 weeks") reads as the day it comes to.
    job.type === "trial" ? ["DURATION", trialLength(durationDays(job.duration))] : ["START", formatDate(postedStart(job.duration))],
    ...(job.type === "part-time" && job.hours ? ([["HOURS", hoursLabel(job.hours)]] as [string, ReactNode][]) : []),
  ];
  return <FactsBox rows={rows} />;
}
