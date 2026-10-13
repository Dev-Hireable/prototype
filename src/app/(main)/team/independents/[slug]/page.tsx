"use client";

import { notFound } from "next/navigation";
import { Suspense, use } from "react";
import { JobBadge, MessageButton, Page, StatusDot, Toast } from "@/components/portal/ui";
import { UnreadableGate } from "@/components/workspace/unreadable-gate";
import { CONTRACT_NAMES, byName } from "@/lib/team/data";
import { CONTRACT_TABS, useContractView } from "@/lib/contract/view";
import { ContractTabs } from "@/components/portal/contract-tabs";
import { PAIR } from "@/lib/demo/live";
import { useTeamContracts } from "@/lib/team/contracts";
import { useQueryState } from "@/lib/portal/query-state";
import { useQuickChat } from "@/lib/portal/quick-chat";
import { useToast } from "@/lib/portal/toast";
import { ReturnNav, useWithReturn } from "@/components/portal/return";
import { TrackerDialogs } from "./_components/dialogs";
import { Crumbs } from "./_components/header";
import { TabContent } from "./_components/tab-content";
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
      /* TB-058: Message stays in the header at every tab and stage; File a Dispute is on the dispute card. */
      navActions={<HeaderActions t={t} />}
    >
      <TabContent tab={tab} t={t} draft={draft} on={on} onTab={setTab} />
      <TrackerDialogs t={t} on={on} onToast={setToast} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** Message, beside the page title. */
function HeaderActions({ t }: { t: Tracker }) {
  /** Messages opened on this person's thread — only the live pair has one in the demo. */
  const withReturn = useWithReturn();
  const chat = useQuickChat();
  const pair = t.contract.independent === PAIR.independent.slug;
  const thread = withReturn(pair ? "/team/messages?with=juan" : "/team/messages");
  const person = byName(t.contract.independent);
  // The live pair's thread opens on the spot, in the quick chat; nobody else has one in the demo.
  const quick = pair ? () => chat.open({ name: person.name, sub: t.contract.role, avatar: person.avatar, href: thread }) : undefined;
  return (
    <MessageButton size="md" href={thread} onClick={quick}>
      Message {t.first}
    </MessageButton>
  );
}
