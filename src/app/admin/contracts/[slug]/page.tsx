"use client";

import { use } from "react";
import { AgreementTab } from "@/components/agreement/AgreementTab";
import { Tabs } from "@/components/independent/ui";
import { AdminPage } from "@/components/admin/ui";
import { BreadcrumbBack } from "@/components/portal/nav";
import { ReturnNav } from "@/components/portal/return";
import { ProjectWorkspace } from "@/components/workspace/ProjectWorkspace";
import { CorruptWork, MissingContract } from "@/components/workspace/states";
import { dayLabel } from "@/lib/demo/dates";
import { contractTypeOf, useDeal, useDealStatus, type Deal } from "@/lib/demo/deal";
import { JOB_TYPE_LABEL } from "@/lib/demo/job-types";
import { PAIR } from "@/lib/demo/live";
import { useQueryState } from "@/lib/portal/query-state";
import { firstName } from "@/components/workspace/labels";

const ADMIN = { role: "viewer" as const, name: "Admin Lead" };
/** Work, or what was agreed and its history — both read-only. */
const SECTIONS = ["tasks", "agreement"] as const;
const NAMES = { team: firstName(PAIR.team.name), independent: firstName(PAIR.independent.name) };
const PEOPLE = { team: { name: PAIR.team.name, avatar: PAIR.team.avatar }, independent: { name: PAIR.independent.name, avatar: PAIR.independent.avatar } };

/**
 * AD-050 — a contract's work as Hireable support sees it: the same workspace both parties use —
 * every view, the filters, each item's panel and its full activity — and nothing that changes
 * anything. Opened from a dispute (to check the task log the ruling depends on) or from the
 * account. Read-only is enforced by the repository, not just by the missing buttons. The Agreement
 * section is the contract's versions, amendments and history (AD-052), read-only too.
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
      title={live ? `${live.title} — ${PAIR.team.company} and ${PAIR.independent.name}` : "Contract"}
    >
      {live?.contract ? <LiveContract live={live} /> : status === "loading" ? null : status === "corrupt" ? <CorruptWork /> : <MissingContract />}
    </AdminPage>
  );
}

/** The live contract, read-only: its work, or — the other section — what was agreed and its history. */
function LiveContract({ live }: { live: Deal }) {
  const [tab, setTab] = useQueryState("section", "tasks", SECTIONS);
  return (
    <>
      <div className="shrink-0 px-4 pt-2">
        <Tabs value={tab} onChange={setTab} aria-label="Contract sections" options={[{ value: "tasks", label: "Work" }, { value: "agreement", label: "Agreement" }]} />
      </div>
      {tab === "agreement" ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <AgreementTab actor={ADMIN} names={NAMES} />
        </div>
      ) : (
        <ProjectWorkspace
          actor={ADMIN}
          people={PEOPLE}
          context={
            <span>
              {JOB_TYPE_LABEL[contractTypeOf(live)]} · started {dayLabel(live.contract?.started)}
              {live.contract?.ended ? " · ended" : ""}
            </span>
          }
        />
      )}
    </>
  );
}
