"use client";

import { notFound } from "next/navigation";
import { Suspense, use } from "react";
import { JobBadge, MessageButton, Page, StatusDot, Toast } from "@/components/independent/ui";
import { UnreadableGate } from "@/components/workspace/UnreadableGate";
import { CONTRACT_NAMES, byName } from "@/lib/team/data";
import { CONTRACT_TABS, useContractView } from "@/lib/contract/view";
import { ContractTabs } from "@/components/portal/ContractTabs";
import { PAIR } from "@/lib/demo/live";
import { useTeamContracts } from "@/lib/team/contracts";
import { useQueryState } from "@/lib/portal/query-state";
import { useToast } from "@/lib/portal/toast";
import { ReturnNav, useWithReturn } from "@/components/portal/return";
import { TrackerDialogs } from "./_components/Dialogs";
import { Crumbs, DisputeButton } from "./_components/Header";
import { TabContent } from "./_components/TabContent";
import { useTrackerActions } from "./_lib/actions";
import { useEvaluationDraft } from "./_lib/forms";
import { trackerOf, type Tracker } from "./_lib/tracker";

export default function TrackerPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense>
      <UnreadableGate title="Contract">
        <EmployerTracker params={params} />
      </UnreadableGate>
    </Suspense>
  );
}

/**
 * The Team Builder's contract tracker, trial or full-time, with sending the evaluation and
 * converting to full-time. Its work is the contract's shared task list (TB-058 / TB-061…065 /
 * TB-109…111): the talent works it, the Team Builder reviews it.
 */
function EmployerTracker({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { contracts, evaluations } = useTeamContracts();
  const contract = contracts.find((c) => c.slug === slug);
  if (!contract) notFound();
  const name = CONTRACT_NAMES[contract.slug] ?? byName(contract.independent).name;
  const [tab, setTab] = useQueryState("tab", "tasks", CONTRACT_TABS);
  const draft = useEvaluationDraft();
  const [toast, setToast] = useToast();

  /**
   * TB-073 / TB-118 / TB-093 — a dispute is one record per contract that the independent and Admin
   * read too (@/lib/demo/disputes), so this tracker sees theirs as well, and the amount a dispute
   * holds stays in escrow until support rules.
   */
  const view = useContractView(contract, contract.role, "team");
  const t = trackerOf(contract, view, name, evaluations[slug] ?? []);
  const on = useTrackerActions(t, draft, setToast);

  return (
    <Page
      fill={tab === "tasks"}
      title={
        <>
          {name} <JobBadge type={contract.type} />
          {/* TB-074: the contract status sits alongside the type badge. */}
          <StatusDot tone={contract.status.tone}>{contract.status.label}</StatusDot>
        </>
      }
      tabs={<ContractTabs value={tab} onChange={setTab} />}
      nav={<ReturnNav fallback={<Crumbs name={name} />} />}
      /* TB-058: both stay in the header at every tab and stage of the contract. */
      navActions={<HeaderActions t={t} onFile={on.openDispute} />}
    >
      <TabContent tab={tab} t={t} draft={draft} on={on} onTab={setTab} />
      <TrackerDialogs t={t} on={on} onToast={setToast} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** Message and File a Dispute, beside the page title. */
function HeaderActions({ t, onFile }: { t: Tracker; onFile: () => void }) {
  /** Messages opened on this person's thread — only the live pair has one in the demo. */
  const withReturn = useWithReturn();
  const thread = withReturn(t.contract.independent === PAIR.independent.slug ? "/team/messages?with=juan" : "/team/messages");
  return (
    <>
      <MessageButton size="md" href={thread}>
        Message {t.first}
      </MessageButton>
      <DisputeButton size="md" view={t.view} onFile={onFile} />
    </>
  );
}
