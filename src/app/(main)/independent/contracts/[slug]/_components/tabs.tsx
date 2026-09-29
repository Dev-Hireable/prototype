import type { ReactNode } from "react";
import { ContractActivity } from "@/components/portal/contract-parts";
import { ContractOverview } from "@/components/portal/contract-overview";
import { firstName } from "@/components/workspace/labels";
import { overviewFacts } from "@/lib/contract/view";
import type { useWallet } from "@/lib/independent/wallet";
import { writeParams } from "@/lib/portal/query-state";
import { accessOf } from "@/lib/work/access";
import { payoutName } from "../_lib/copy";
import type { Tracker } from "../_lib/tracker";
import { EndingPanel } from "./ending";
import { OfferCallout, OverviewCallouts } from "./overview";
import { PaymentTab } from "./payment-tab";

/** Opens an item in the Work tab. */
const openTask = (id: string) => writeParams({ tab: null, task: id });

/**
 * The Contract & Payment tab as the talent reads it: the offer after a trial, the payments on this
 * contract and where they go, and ending it from this side.
 */
export function ContractTab({
  t,
  wallet,
  score,
  company,
  onFile,
  onEnd,
  onWithdraw,
}: {
  t: Tracker;
  wallet: Pick<ReturnType<typeof useWallet>, "transactions" | "payouts">;
  score: ReactNode;
  company: ReactNode;
  onFile: () => void;
  onEnd: () => void;
  onWithdraw: () => void;
}) {
  const { contract, view, ended } = t;
  return (
    <PaymentTab
      contract={contract}
      view={view}
      ended={ended}
      payments={wallet.transactions.filter((x) => x.contract === contract.slug)}
      payoutTo={payoutName(wallet.payouts.find((m) => m.isDefault))}
      offer={<OfferCallout contract={contract} conversion={view.conversion} />}
      score={score}
      company={company}
      onFile={onFile}
      ending={<EndingPanel contract={contract} view={view} ended={ended} cancellable={!!t.cancelOpt} canGiveNotice={!!t.noticeOpt} onEnd={onEnd} onWithdraw={onWithdraw} />}
    />
  );
}

/** The Overview as the talent reads it: the hiring manager leads the facts, and the banners say what's waiting on them. */
export function OverviewTab({ t, score, company, onReadEvaluation }: { t: Tracker; score: ReactNode; company: ReactNode; onReadEvaluation: () => void }) {
  const { contract, view, ended } = t;
  return (
    <ContractOverview
      viewer="independent"
      work={view.onDeal ? accessOf(view.deal) : undefined}
      tasks={contract.tasks}
      names={{ team: contract.managerFirst, independent: firstName(t.actor.name) }}
      people={t.people}
      trial={t.isTrial}
      facts={overviewFacts(contract, { label: "Hiring manager", value: contract.manager }, Math.max(0, contract.left ?? 0))}
      callouts={<OverviewCallouts contract={contract} view={view} ended={ended} onReadEvaluation={onReadEvaluation} onOpenTask={openTask} />}
      aside={
        <>
          {/* IN-076 — the same Trial Fit Score the Team Builder sees, weighted by phase. */}
          {score}
          <ContractActivity contract={contract} ended={ended} />
          {company}
        </>
      }
    />
  );
}
