"use client";

import Link from "next/link";
import { ICONS } from "@/components/icons";
import { useWithReturn } from "@/components/portal/return";
import { contractTypeOf, useDeal } from "@/lib/demo/deal";
import { JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import { PAIR } from "@/lib/demo/live";
import { countsOf } from "@/lib/work/model";
import { todayDay } from "@/lib/work/dates";
import { Card } from "@/components/portal/ui";

/** The Team Builder's account slug under User management (see @/lib/demo/disputes TEAM). */
const TEAM_SLUG = "nairobi-solutions";

/**
 * AD-050 — on the live pair's accounts, their contract with a way into its work (read-only).
 * Nothing shows for anyone else: the demo has one live engagement.
 */
export function LiveContractCard({ party, slug }: { party: "team" | "independent"; slug: string }) {
  const deal = useDeal();
  const withReturn = useWithReturn();
  const ours = party === "independent" ? slug === PAIR.independent.slug : slug === TEAM_SLUG;
  if (!ours || !deal?.contract) return null;
  const counts = countsOf(deal.contract.tasks, todayDay());
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-5 text-[13px] leading-[1.45]">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-[14px] font-semibold text-ink-deep">
          Live contract · {deal.title} ({JOB_TYPE_LABEL[contractTypeOf(deal)].toLowerCase()})
        </h2>
        <p className="text-muted">
          {PAIR.team.company} and {PAIR.independent.name} · {counts.done} of {counts.total} work items done
          {counts.review ? ` · ${counts.review} in review` : ""}
          {counts.overdue ? ` · ${counts.overdue} overdue` : ""}
        </p>
      </div>
      <Link href={withReturn(`/admin/contracts/${deal.roleSlug}`)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-4 text-[13px] font-semibold text-ink hover:bg-surface-alt">
        Open the work <ICONS.northEast size={16} aria-hidden />
      </Link>
    </Card>
  );
}
