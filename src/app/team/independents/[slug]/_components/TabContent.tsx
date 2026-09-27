import { ContractOverview } from "@/components/portal/ContractOverview";
import { firstName } from "@/components/workspace/labels";
import { ContractWork } from "@/components/workspace/ContractWork";
import { overviewFacts, type CONTRACT_TABS } from "@/lib/contract/view";
import { writeParams } from "@/lib/portal/query-state";
import { useTeamAccount } from "@/lib/team/account";
import { useLedger } from "@/lib/team/contracts";
import { byName } from "@/lib/team/data";
import { accessOf } from "@/lib/work/access";
import type { TrackerActions } from "../_lib/actions";
import { closedNote } from "../_lib/copy";
import type { EvaluationDraft } from "../_lib/forms";
import type { Tracker } from "../_lib/tracker";
import { EvaluationActions, EvaluationTab } from "./EvaluationTab";
import { DisputeButton } from "./Header";
import { OverviewAside, OverviewCallouts } from "./Overview";
import { PaymentTab } from "./PaymentTab";

type Tab = (typeof CONTRACT_TABS)[number];

/** Opens an item in the Work tab — the Overview's Review button opens the first one waiting. */
const openTask = (id: string) => writeParams({ tab: null, task: id });

/** The open tab: the shared task list, the Overview, Contract & Payment, or the Evaluation. */
export function TabContent({ tab, t, draft, on, onTab }: { tab: Tab; t: Tracker; draft: EvaluationDraft; on: TrackerActions; onTab: (tab: Tab) => void }) {
  const { profile } = useTeamAccount();
  const transactions = useLedger();
  const { contract, view, name, first, isTrial, ended, submitted } = t;
  /** The work, on the shared engagement: planned and reviewed here as this Team Builder, worked by the talent. */
  const people = { team: { name: profile.name, avatar: profile.photo }, independent: { name, avatar: byName(contract.independent).avatar } };
  const actor = { role: "manager" as const, name: profile.name };
  return (
    <>
      {tab === "contract" && <PaymentTab t={t} payments={transactions.filter((x) => x.independent === name)} disputeButton={<DisputeButton size="md" view={view} onFile={on.openDispute} />} />}
      {tab === "evaluation" && <EvaluationTab t={t} draft={draft} actions={<EvaluationActions t={t} ready={draft.ready} onEnd={on.openEnd} onHire={on.openConvert} onSend={on.sendEvaluation} />} />}
      {tab === "tasks" && <ContractWork live={view.onDeal} contract={contract} life={view.life} notice={view.notice} cancelled={view.cancelled} ended={ended} scoreFinal={submitted || !isTrial} actor={actor} people={people} closedNote={closedNote(t)} />}
      {/* TB-058 / TB-074 / TB-109 — the contract at a glance: its terms, how far the work has got,
          what's waiting on you (reviews don't sit unseen), what's due next and what changed. */}
      {tab === "overview" && (
        <ContractOverview
          viewer="team"
          work={view.onDeal ? accessOf(view.deal) : undefined}
          tasks={contract.tasks}
          names={{ team: firstName(profile.name), independent: first }}
          people={people}
          trial={isTrial}
          facts={overviewFacts(contract, { label: "Role", value: contract.role }, contract.left ?? 0)}
          callouts={
            <OverviewCallouts
              t={t}
              onReview={openTask}
              onEvaluate={() => onTab("evaluation")}
              onEnd={on.openEnd}
              onHire={on.openConvert}
              onWithdrawOffer={on.withdrawOffer}
              onWithdrawNotice={on.withdrawNotice}
            />
          }
          aside={<OverviewAside t={t} onEvaluate={() => onTab("evaluation")} disputeButton={<DisputeButton size="lg" view={view} onFile={on.openDispute} />} />}
        />
      )}
    </>
  );
}
