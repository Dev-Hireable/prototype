"use client";

import { notFound } from "next/navigation";
import { Suspense, use } from "react";
import { JobBadge, Page, StatusDot, Toast } from "@/components/independent/ui";
import { ContractScore } from "@/components/portal/ContractParts";
import { ContractWork } from "@/components/workspace/ContractWork";
import { UnreadableGate } from "@/components/workspace/UnreadableGate";
import { CONTRACT_TABS, useContractView } from "@/lib/contract/view";
import { ContractTabs } from "@/components/portal/ContractTabs";
import { PAIR } from "@/lib/demo/live";
import { useIndependentContracts } from "@/lib/independent/contracts";
import { useWallet } from "@/lib/independent/wallet";
import { useIndependentAccount } from "@/lib/independent/account";
import { useQueryState } from "@/lib/portal/query-state";
import { useToast } from "@/lib/portal/toast";
import { ReturnNav, useWithReturn } from "@/components/portal/return";
import { CompanyCard } from "./_components/Company";
import { TrackerDialogs } from "./_components/Dialogs";
import { EvaluationTab } from "./_components/Evaluations";
import { Crumbs, HeaderActions } from "./_components/Header";
import { ContractTab, OverviewTab } from "./_components/Tabs";
import { closedNote } from "./_lib/copy";
import { trackerOf, useTrackerDialogs } from "./_lib/tracker";

export default function ContractTrackerPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense>
      <UnreadableGate title="Contract">
        <ContractTracker params={params} />
      </UnreadableGate>
    </Suspense>
  );
}

/**
 * The talent's contract tracker, trial or full-time, and the evaluation they receive. Its work is
 * the contract's shared task list (IN-076 / IN-026…030): the talent works it — moves tasks, ticks
 * subtasks, sends them for review — and the Team Builder reviews each one.
 */
function ContractTracker({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { profile } = useIndependentAccount();
  const wallet = useWallet();
  const { contracts, endContract, withdrawNotice } = useIndependentContracts();
  const dialogs = useTrackerDialogs();
  const contract = contracts.find((c) => c.slug === slug);
  const [tab, setTab] = useQueryState("tab", "tasks", CONTRACT_TABS);
  const withReturn = useWithReturn();
  const [toast, setToast] = useToast();
  if (!contract) notFound();

  /** Messages opened on the thread with this contract's manager — only the live pair has one. */
  const thread = withReturn(contract.manager === PAIR.team.name ? "/independent/messages?with=c1" : "/independent/messages");

  /**
   * IN-032 / IN-059 — disputes are one record per contract that the Team Builder and Admin read too
   * (@/lib/demo/disputes), so the Contract & Payment tab shows theirs as well as the independent's own.
   */
  const view = useContractView(contract, contract.title, "independent");
  const t = trackerOf(contract, view, profile, thread);
  /** The trial's score, final once it converted — or the match, on a direct hire. */
  const score = <ContractScore contract={contract} final={t.scoreFinal} who="You were" />;
  const company = <CompanyCard contract={contract} tags={t.companyTags} onOpen={() => dialogs.setCompanyOpen(true)} />;
  /** IN-091 — the talent takes back the notice they gave. */
  const withdraw = () => {
    const r = withdrawNotice();
    setToast(r.ok ? "Notice withdrawn — the role carries on" : r.error, r.ok ? "success" : "danger");
  };

  return (
    <Page
      fill={tab === "tasks"}
      title={
        <>
          {contract.title} — {contract.company} <JobBadge type={contract.type} />
          <StatusDot tone={contract.status.tone}>{contract.status.label}</StatusDot>
        </>
      }
      tabs={<ContractTabs value={tab} onChange={setTab} />}
      nav={<ReturnNav fallback={<Crumbs contract={contract} tab={tab} />} />}
      navActions={<HeaderActions contract={contract} thread={thread} view={view} onFile={() => dialogs.setFiling(true)} />}
    >
      {tab === "tasks" && <ContractWork live={view.onDeal} contract={contract} life={view.life} notice={view.notice} cancelled={view.cancelled} ended={t.ended} scoreFinal={t.scoreFinal} actor={t.actor} people={t.people} closedNote={closedNote(contract, view, t.ended)} />}
      {tab === "evaluation" && <EvaluationTab contract={contract} view={view} thread={thread} score={score} ended={t.ended} />}
      {tab === "contract" && <ContractTab t={t} wallet={wallet} score={score} company={company} onFile={() => dialogs.setFiling(true)} onEnd={() => dialogs.setEnding(true)} onWithdraw={withdraw} />}
      {/* IN-076 — the contract at a glance: its terms, how far the work has got, what's waiting on
          you (changes asked for), what's due next and what changed. */}
      {tab === "overview" && <OverviewTab t={t} score={score} company={company} onReadEvaluation={() => setTab("evaluation")} />}

      <TrackerDialogs t={t} dialogs={dialogs} endContract={endContract} onToast={setToast} />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
