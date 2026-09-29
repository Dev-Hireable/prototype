import type { ReactNode } from "react";
import { Button, Chip, StatusDot } from "@/components/portal/ui";
import { BenefitList, SummaryRows } from "@/components/portal/contract-parts";
import { DisputeRows } from "@/components/portal/disputes";
import { SIDE_COLUMN, WITH_SIDE } from "@/components/portal/page-parts";
import { PanelCard } from "@/components/portal/panel-card";
import { Tip } from "@/components/portal/tip";
import { benefitsOf, type ContractView } from "@/lib/contract/view";
import { dayLabel } from "@/lib/portal/dates";
import { escrowLine, STATUS_TONE, usd } from "@/lib/demo/disputes";
import type { Contract, Transaction } from "@/lib/independent/data";
import { keyed } from "@/lib/portal/keys";
import { agreedTerms, escrowRows } from "../_lib/copy";

/**
 * IN-032 — the Contract & Payment tab: what was agreed, the money and its history, the disputes and
 * how to end it, beside the score, the escrow and payout, and the company.
 */
export function PaymentTab({
  contract,
  view,
  ended,
  payments,
  payoutTo,
  offer,
  score,
  company,
  ending,
  onFile,
}: {
  contract: Contract;
  view: ContractView;
  ended: boolean;
  payments: Transaction[];
  payoutTo: string;
  offer: ReactNode;
  score: ReactNode;
  company: ReactNode;
  ending: ReactNode;
  onFile: () => void;
}) {
  const { life } = view;
  return (
    <div className="flex flex-col gap-5">
      {offer}
      <div className={WITH_SIDE}>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* IN-032 — what was agreed, read-only: nothing on this tab can be edited. */}
          <PanelCard title="Agreed terms" aside={<span className="text-[12px] leading-[1.4] text-ink-2">Read-only</span>}>
            <Terms rows={agreedTerms(contract, view, ended)} />
          </PanelCard>

          {/* IN-046 — what a full-time engagement includes on top of the salary. */}
          {contract.type === "full-time" && (
            <PanelCard title="Exclusive benefits" aside={<span className="text-[12px] leading-[1.4] text-ink-2">On top of base salary</span>}>
              <BenefitList included={benefitsOf(view)} size="text-[13px]" />
            </PanelCard>
          )}

          {/* The trial it began as, kept as the contract's first chapter once it became a role. */}
          {life?.converted && <TrialChapter contract={contract} view={view} />}

          <PaymentHistory contract={contract} payments={payments} pay={view.pay} />
          <Disputes contract={contract} view={view} onFile={onFile} />
          {ending}
        </div>
        <aside className={SIDE_COLUMN}>
          {score}
          <PanelCard title="Escrow &amp; payout">
            <SummaryRows rows={escrowRows(contract, view, ended, payoutTo)} />
          </PanelCard>
          {company}
        </aside>
      </div>
    </div>
  );
}

/** A card's terms, two to a row. */
function Terms({ rows }: { rows: readonly (readonly [string, ReactNode])[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] leading-[1.4]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-0.5">
          <dt className="text-ink-2">{k}</dt>
          <dd className="font-medium text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The trial it began as: its dates, its escrow, its final score and when it was evaluated. */
function TrialChapter({ contract, view }: { contract: Contract; view: ContractView }) {
  const { life, escrow, trialEval } = view;
  if (!life?.trial) return null;
  return (
    <PanelCard title="The trial" aside={<span className="text-[12px] leading-[1.4] text-ink-2">Complete</span>}>
      <Terms
        rows={[
          ["Dates", `${dayLabel(life.trial.started)} – ${dayLabel(life.trial.ends)}`],
          ["Escrow", escrow ? escrowLine(escrow, dayLabel(life.trial.started), { releasedTo: "you", refundedTo: contract.company }) : "—"],
          ...(contract.tfs ? ([["Trial Fit Score", `${contract.tfs.overall}% · final`]] as const) : []),
          ...(trialEval ? ([["Evaluated", trialEval.date]] as const) : []),
        ]}
      />
    </PanelCard>
  );
}

/** IN-032 — every transaction recorded against this contract. */
function PaymentHistory({ contract, payments, pay }: { contract: Contract; payments: Transaction[]; pay: ContractView["pay"] }) {
  return (
    <PanelCard title="Payment history">
      {payments.length === 0 ? (
        // Only while it's still the trial: once it became a role, the trial's escrow was paid with the
        // evaluation, and the role's own pay is what's next.
        <p className="text-[13px] leading-[1.4] text-ink-2">{contract.type === "trial" ? `No payments on this contract yet. The trial's budget is held in escrow and paid to you with ${contract.managerFirst}'s evaluation.` : pay?.next ? `No payments yet. Your first, ${usd(pay.next.amount)}, is paid on ${dayLabel(pay.next.to)}.` : "No payments on this contract yet. Monthly pay appears here as it's paid."}</p>
      ) : (
        <div className="overflow-hidden rounded-lg outline -outline-offset-1 outline-border">
          <div className="flex items-center gap-4 bg-surface-2 px-4 py-2.5 text-[12.5px] leading-[1.4] font-medium text-ink-2">
            <span className="w-[110px] shrink-0">Date</span>
            <span className="w-[150px] shrink-0">Type</span>
            <span className="w-[110px] shrink-0">Amount</span>
            <span className="min-w-0 flex-1">Status</span>
          </div>
          {/* Two payments can share a date and description (a dispute release, then End Contract). */}
          {keyed(payments, (t) => `${t.date}-${t.desc}-${t.amount}`).map(({ item: t, key }) => (
            <div key={key} className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-[13px] leading-[1.4] text-ink">
              <span className="w-[110px] shrink-0">{t.date}</span>
              <span className="w-[150px] shrink-0">
                <Chip size="sm">{t.type}</Chip>
              </span>
              <span className="w-[110px] shrink-0 font-medium">{t.amount}</span>
              <span className="min-w-0 flex-1">
                <StatusDot tone={t.status.tone}>{t.status.label}</StatusDot>
              </span>
            </div>
          ))}
        </div>
      )}
    </PanelCard>
  );
}

/** IN-032 / IN-046 — every dispute filed for this contract lives on this tab, the company's included. */
function Disputes({ contract, view, onFile }: { contract: Contract; view: ContractView; onFile: () => void }) {
  const { disputes: here, block, fileHint } = view;
  if (here.length > 0) {
    return (
      <PanelCard title={here.length === 1 ? "Dispute" : "Disputes"} aside={here.length === 1 ? <StatusDot tone={STATUS_TONE[here[0].status]}>{here[0].status}</StatusDot> : undefined}>
        <DisputeRows disputes={here} side="independent" />
        {block === "filed" && <p className="text-[12.5px] leading-[1.4] text-ink-2">One dispute can be filed per contract, so there is nothing more to raise here.</p>}
      </PanelCard>
    );
  }
  return (
    <PanelCard title="Something wrong with a payment?">
      <p className="text-[13px] leading-[1.4] text-ink-2">
        {block === "trial" || block === "starts"
          ? `${fileHint}. Until then, raise anything unexpected with ${contract.managerFirst} in Messages.`
          : fileHint
            ? `${fileHint}.`
            : "Hireable support reviews the contract, the task log and the payment record, and the amount in question stays put until they rule. You can file one dispute per contract."}
      </p>
      <Tip label={fileHint} wrap wrapClassName="self-start">
        <Button size="lg" variant="primary" disabled={!!block} onClick={onFile}>
          File a dispute
        </Button>
      </Tip>
    </PanelCard>
  );
}
