"use client";

import { ICONS } from "@/components/admin/icons";
import type { TaskPeople } from "@/components/portal/tasks/task-bits";
import type { Lifecycle, Notice } from "@/lib/contract/lifecycle";
import { dayLabel } from "@/lib/demo/dates";
import { JOB_TYPE_LABEL, type JobType } from "@/lib/demo/job-types";
import type { Actor } from "@/lib/work/permissions";
import { SummaryStat } from "./meta";
import { ProjectWorkspace } from "./ProjectWorkspace";

/**
 * A contract's Work tab, on either side: the shared engagement's work, headed by where the contract
 * is — the trial's day, or since when the role runs and the notice on it — and the Trial Fit Score.
 * A contract the demo only lists has no work list.
 */
export function ContractWork({
  live,
  contract,
  life,
  notice,
  cancelled,
  ended,
  scoreFinal,
  actor,
  people,
  closedNote,
}: {
  /** The contract on the shared engagement — the only one with work to show. */
  live: boolean;
  contract: { type: JobType; day: string; endedOn?: string; tfs: { overall: number } | null };
  life: Lifecycle | null;
  notice?: Notice;
  cancelled: boolean;
  ended: boolean;
  /** The Trial Fit Score is final: the trial has been evaluated, or it became a role. */
  scoreFinal: boolean;
  actor: Actor;
  people: TaskPeople;
  closedNote?: string;
}) {
  if (!live) return <p className="px-10 py-8 text-[14px] text-ink-2">This contract&apos;s work list isn&apos;t available.</p>;
  const isTrial = contract.type === "trial";
  const typeLabel = JOB_TYPE_LABEL[contract.type];
  return (
    <ProjectWorkspace
      actor={actor}
      people={people}
      closedNote={closedNote}
      context={
        <>
          {isTrial && !contract.endedOn && <SummaryStat mark={<ICONS.clock size={15} aria-hidden />}>{contract.day}</SummaryStat>}
          {!isTrial && life && (
            <SummaryStat>
              {cancelled ? `${typeLabel} · cancelled before ${dayLabel(life.since)}` : `${typeLabel} ${life.phase === "starts" ? "from" : "since"} ${dayLabel(life.since)}`}
              {notice && !ended && ` · ends after ${dayLabel(notice.lastDay)}`}
            </SummaryStat>
          )}
          {contract.tfs && (
            <SummaryStat>
              Trial Fit Score <b className="font-semibold text-ink">{contract.tfs.overall}%</b>
              {scoreFinal && " · final"}
            </SummaryStat>
          )}
        </>
      }
    />
  );
}
