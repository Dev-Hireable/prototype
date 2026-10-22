import type { ReactNode } from "react";
import { ContractActivity } from "@/components/portal/contract-parts";
import { ContractOverview } from "@/components/portal/contract-overview";
import { firstName } from "@/components/workspace/labels";
import { overviewFacts } from "@/lib/contract/view";
import { usePostings } from "@/lib/demo/deal";
import type { useWallet } from "@/lib/independent/wallet";
import { writeParams } from "@/lib/portal/query-state";
import { accessOf } from "@/lib/work/access";
import type { Tracker } from "../_lib/tracker";
import { EndingPanel } from "./ending";
import { OfferCallout, OverviewCallouts } from "./overview";
import { PaymentTab, RoleNotes } from "./payment-tab";

/** Opens an item in the Work tab. */
const openTask = (id: string) => writeParams({ tab: null, task: id });

/**
 * The Contract & Payment tab as the talent reads it: the offer after a trial, the terms and the
 * notes the company left on the role, the payments on this contract, and ending it from this side.
 */
export function ContractTab({
  t,
  wallet,
  score,
  company,
  onFile,
  onEnd,
  onWithdraw,
  onReviewOffer,
}: {
  t: Tracker;
  wallet: Pick<ReturnType<typeof useWallet>, "transactions">;
  score: ReactNode;
  company: ReactNode;
  onFile: () => void;
  onEnd: () => void;
  onWithdraw: () => void;
  onReviewOffer: () => void;
}) {
  const { contract, view, ended } = t;
  /** The role as its company published it: its notes for the Independent travel with it. */
  const posting = usePostings().find((p) => p.slug === contract.slug);
  return (
    <PaymentTab
      contract={contract}
      view={view}
      ended={ended}
      payments={wallet.transactions.filter((x) => x.contract === contract.slug)}
      offer={<OfferCallout contract={contract} conversion={view.conversion} onReview={onReviewOffer} />}
      notes={view.onDeal && posting && <RoleNotes company={contract.company} text={posting.expectation} link={posting.attachment} />}
      score={score}
      company={company}
      onFile={onFile}
      ending={<EndingPanel contract={contract} view={view} ended={ended} cancellable={!!t.cancelOpt} canGiveNotice={!!t.noticeOpt} onEnd={onEnd} onWithdraw={onWithdraw} />}
    />
  );
}

/** The Overview as the talent reads it: the hiring manager leads the facts, and the banners say what's waiting on them. */
export function OverviewTab({ t, score, company, onReadEvaluation, onReviewOffer }: { t: Tracker; score: ReactNode; company: ReactNode; onReadEvaluation: () => void; onReviewOffer: () => void }) {
  const { contract, view, ended } = t;
  return (
    <ContractOverview
      viewer="independent"
      work={view.onDeal ? accessOf(view.deal) : undefined}
      tasks={contract.tasks}
      counted={contract.counted}
      names={{ team: contract.managerFirst, independent: firstName(t.actor.name) }}
      people={t.people}
      trial={t.isTrial}
      facts={overviewFacts(contract, { label: "Hiring manager", value: contract.manager }, Math.max(0, contract.left ?? 0))}
      callouts={<OverviewCallouts contract={contract} view={view} ended={ended} onReadEvaluation={onReadEvaluation} onReviewOffer={onReviewOffer} onOpenTask={openTask} />}
      aside={
        <>
          {/* IN-076 — the same trial fit score the Team Builder sees, weighted by phase. */}
          {score}
          <ContractActivity contract={contract} ended={ended} />
          {company}
        </>
      }
    />
  );
}
