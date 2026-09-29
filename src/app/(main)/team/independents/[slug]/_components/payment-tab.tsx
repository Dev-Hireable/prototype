import type { ReactNode } from "react";
import { Card, CardHeading, StatusDot } from "@/components/portal/ui";
import { BenefitList } from "@/components/portal/contract-parts";
import { DisputeRows } from "@/components/portal/disputes";
import { benefitsOf } from "@/lib/contract/view";
import { dayLabel } from "@/lib/portal/dates";
import { usd } from "@/lib/demo/disputes";
import type { Transaction } from "@/lib/team/data";
import { contractTerms, paymentTerms, trialTerms } from "../_lib/copy";
import type { Tracker } from "../_lib/tracker";

/** TB-058: the Contract & Payment tab — terms and payment history, read only. */
export function PaymentTab({ t, payments, disputeButton }: { t: Tracker; payments: Transaction[]; disputeButton: ReactNode }) {
  const { contract, view } = t;
  const { life } = view;
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      <TermsCard title="Contract terms" rows={contractTerms(t)} />
      {contract.type === "full-time" && (
        <Card className="flex flex-col gap-4 p-5">
          <CardHeading>Exclusive benefits</CardHeading>
          <p className="text-[13px] leading-[1.4] text-ink-2">What the signed offer includes, on top of base salary.</p>
          <BenefitList included={benefitsOf(view)} size="text-[14px]" />
        </Card>
      )}
      <TermsCard title="Payment" rows={paymentTerms(t)} />
      {/* The trial it began as, kept as the contract's first chapter once it became a role. */}
      {life?.converted && life.trial && <TermsCard title="The trial" rows={trialTerms(t, life.trial)} />}
      <PaymentHistory t={t} payments={payments} />
      <Disputes t={t} disputeButton={disputeButton} />
    </div>
  );
}

/** A card of terms, one to a line: the label on the left, the value on the right. */
function TermsCard({ title, rows }: { title: string; rows: readonly (readonly [string, ReactNode])[] }) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <CardHeading>{title}</CardHeading>
      <dl className="flex flex-col gap-3 text-[14px] leading-[1.4]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="text-ink-2">{k}</dt>
            <dd className="font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/** TB-066 payment history: date, amount, type and status, read only. */
function PaymentHistory({ t, payments }: { t: Tracker; payments: Transaction[] }) {
  const { pay } = t.view;
  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardHeading>Payment history</CardHeading>
      {payments.length === 0 ? (
        <p className="text-[13px] leading-[1.4] text-ink-2">{t.fromTrial ? "No transactions yet. The escrow deposit appears here once the trial starts." : pay?.next ? `No payments yet. The first, ${usd(pay.next.amount)}, is paid on ${dayLabel(pay.next.to)}.` : "No transactions yet. Monthly payments appear here as they are paid."}</p>
      ) : (
        <ul className="flex flex-col">
          {payments.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border py-3 text-[13px] leading-[1.4] first:border-t-0">
              <span className="w-[100px] shrink-0 text-ink-2">{x.date}</span>
              {/* `desc`, not `type`: on one contract "Payment Released" on every row would tell you less than the line. */}
              <span className="min-w-0 flex-1 text-ink">{x.desc}</span>
              <span className="font-semibold text-ink">{x.amount}</span>
              <StatusDot tone={x.status.tone}>{x.status.label}</StatusDot>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** IN-032's rule from this side too: every dispute on this contract, whoever filed it. */
function Disputes({ t, disputeButton }: { t: Tracker; disputeButton: ReactNode }) {
  const { disputes: here, block, fileHint } = t.view;
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-4">
        <CardHeading>Disputes</CardHeading>
        {disputeButton}
      </div>
      {here.length === 0 ? (
        <p className="text-[13px] leading-[1.4] text-ink-2">
          {block === "trial" || block === "starts"
            ? `No disputes. ${fileHint}; until then, raise anything with ${t.first} in Messages.`
            : fileHint
              ? `No disputes. ${fileHint}.`
              : "No disputes on this contract. If a payment or the agreed process went wrong, file one — Hireable support reviews the task log and the payment record."}
        </p>
      ) : (
        <DisputeRows disputes={here} side="team" />
      )}
    </Card>
  );
}
