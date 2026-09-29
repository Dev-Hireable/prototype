import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/portal/ui";
import { hoursLabel, startLabel } from "@/lib/contract/job-types";
import type { JobView } from "@/lib/independent/job-view";

/** The job post the proposal answers: the trial's brief or the role's description, any attachment, and its terms. */
export function JobPost({ job, back, trialTasks, startHref }: { job: JobView; back: string; trialTasks: ReactNode; startHref?: string }) {
  const router = useRouter();
  return (
    <section className="flex flex-col gap-6 text-[14px] leading-[1.2] tracking-[0.2px]">
      <Brief job={job} trialTasks={trialTasks} />
      {job.attachment && (
        <div className="flex flex-col gap-3">
          <h3 className="font-semibold text-ink">Attachment</h3>
          <Link href={job.attachment} className="text-accent-ink" target="_blank">
            {job.attachment}
          </Link>
        </div>
      )}
      <PostTerms job={job} back={back} />
      {startHref && (
        <div className="flex justify-end">
          <Button size="lg" variant="primary" onClick={() => router.push(startHref)}>
            Start proposal
          </Button>
        </div>
      )}
    </section>
  );
}

/** A trial's brief — its tasks, when they're shown here, and the company's notes — or the role's description. */
function Brief({ job, trialTasks }: { job: JobView; trialTasks: ReactNode }) {
  if (job.type !== "trial") {
    return (
      <div className="flex flex-col gap-3 text-ink">
        <h3 className="font-semibold">About the role</h3>
        <p className="leading-[1.4] whitespace-pre-line">{job.expectation || job.description || "No description was added to this role."}</p>
      </div>
    );
  }
  return (
    <>
      {/* Review mode is the trial's brief on its own; while proposing, the tasks already sit in the step above. */}
      {trialTasks && (
        <div className="flex flex-col gap-3 text-ink">
          <h3 className="font-semibold">Trial tasks</h3>
          {trialTasks}
        </div>
      )}
      {job.expectation && (
        <div className="flex flex-col gap-3 text-ink">
          <h3 className="font-semibold">Notes from {job.company}</h3>
          <p className="leading-[1.4] whitespace-pre-line">{job.expectation}</p>
        </div>
      )}
    </>
  );
}

/** The post's terms, a row each: the role (back to the application), its budget, the contract, and how long or when. */
function PostTerms({ job, back }: { job: JobView; back: string }) {
  const trial = job.type === "trial";
  /** The role's terms, with the hours it was posted at. */
  const terms: [string, string][] = [
    ["Contract", job.contract],
    [trial ? "Duration" : "Start", trial ? job.duration : startLabel(job.duration)],
    ...(job.type === "part-time" && job.hours ? ([["Hours", hoursLabel(job.hours)]] as [string, string][]) : []),
  ];
  return (
    <dl className="flex flex-col gap-3 rounded-lg bg-surface-2 p-3 outline -outline-offset-1 outline-border">
      {[
        [
          "ROLE",
          <Link key="r" href={back} className="text-accent-ink underline">
            {job.title}
          </Link>,
        ],
        ["BUDGET", job.budget],
        ...terms.map(([k, v]) => [k.toUpperCase(), v]),
      ].map(([k, v]) => (
        <div key={k as string} className="flex h-5 items-center justify-between">
          <dt className="font-semibold text-ink-2">{k}</dt>
          <dd className="text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
