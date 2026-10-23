"use client";

import { use } from "react";
import { AdminPage } from "@/components/admin/ui";
import { BreadcrumbBack } from "@/components/portal/nav";
import { ReturnNav } from "@/components/portal/return";
import { ProjectWorkspace } from "@/components/workspace/project-workspace";
import { CorruptWork, MissingContract } from "@/components/workspace/states";
import { dayLabel } from "@/lib/portal/dates";
import { contractTypeOf, useDeal, useDealStatus } from "@/lib/demo/deal";
import { JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import { cancelledLine } from "@/lib/contract/view";
import { PAIR } from "@/lib/demo/live";

const ADMIN = { role: "viewer" as const, name: "Admin Lead" };
const PEOPLE = { team: { name: PAIR.team.name, avatar: PAIR.team.avatar }, independent: { name: PAIR.independent.name, avatar: PAIR.independent.avatar } };

/**
 * AD-050 — a contract's work as Hireable support sees it: the same workspace both parties use —
 * every view, the filters, each item's panel and its full activity — and nothing that changes
 * anything. Opened from a dispute (to check the task log the ruling depends on) or from the
 * account. Read-only is enforced by the repository, not just by the missing buttons.
 */
export default function AdminContractPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const deal = useDeal();
  const status = useDealStatus();
  const live = deal?.contract && deal.roleSlug === slug ? deal : null;
  return (
    <AdminPage
      bleed
      nav={<ReturnNav fallback={<BreadcrumbBack href="/admin/disputes">Back to all disputes</BreadcrumbBack>} />}
      title={live ? `${live.title} at ${PAIR.team.company}` : "Contract"}
    >
      {live?.contract ? (
        <ProjectWorkspace
          actor={ADMIN}
          people={PEOPLE}
          context={
            <span>
              {JOB_TYPE_LABEL[contractTypeOf(live)]} with {PAIR.independent.name} · started {dayLabel(live.contract.started)}
              {live.contract.ended && !live.contract.cancelled ? ` · ended${live.contract.endedOn ? ` ${live.contract.endedOn}` : ""}` : ""}
              {/* Called off before its first day: by whom and why, as support needs it for a complaint. */}
              {live.contract.cancelled && <span className="mt-1 block">{cancelledLine(live.contract, "admin", { team: PAIR.team.company, independent: PAIR.independent.name })}</span>}
            </span>
          }
        />
      ) : status === "loading" ? null : status === "corrupt" ? (
        <CorruptWork />
      ) : (
        <MissingContract />
      )}
    </AdminPage>
  );
}
