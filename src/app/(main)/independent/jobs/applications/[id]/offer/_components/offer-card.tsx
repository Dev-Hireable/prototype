import { Card } from "@/components/portal/ui";
import { Agreement, OfferDivider, OfferTerms } from "@/components/portal/offer-parts";
import { TaskPlanList } from "@/components/portal/tasks/task-plan";
import type { DealOffer } from "@/lib/demo/deal";
import type { JobView } from "@/lib/independent/job-view";
import { offerRows } from "../_lib/terms";

/** The offer itself: the role, its terms, the tasks the Team Builder set, and the services agreement. */
export function OfferCard({ job, sent, from, total }: { job: JobView; sent: DealOffer; from: string; total: number }) {
  const trial = sent.type === "trial";
  return (
    <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-col gap-4 px-6 pt-6 text-ink">
        <h3 className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px]">{job.title}</h3>
        <p className="text-[14px] leading-[1.2] tracking-[0.2px]">{job.description}</p>
      </div>
      <OfferDivider />
      <div className="flex flex-col gap-4 px-6 pb-6">
        <OfferTerms rows={offerRows(sent, job, total)} />
      </div>
      <OfferDivider />
      <div className="flex flex-col gap-4 px-6 pb-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Tasks</h3>
          {sent.tasks.length > 0 && (
            <p className="text-[13px] leading-[1.4] text-ink-2">
              {from} set these. {trial ? "The trial's" : "The contract's"} shared task list starts from them when you sign, each due week counted from the start date.
            </p>
          )}
        </div>
        <TaskPlanList tasks={sent.tasks} start={sent.start} lastDay={trial ? sent.end : undefined} empty={`No tasks yet — ${from} adds them once you start.`} />
      </div>
      <OfferDivider />
      <div className="flex flex-col gap-6 px-6 pb-6">
        <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Services Agreement</h3>
        <Agreement type={sent.type} title="Services Agreement" />
      </div>
    </Card>
  );
}
