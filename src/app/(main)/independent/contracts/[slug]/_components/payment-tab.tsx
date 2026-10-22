import type { ReactNode } from "react";
import { Button, Chip, StatusDot } from "@/components/portal/ui";
import { BenefitList } from "@/components/portal/contract-parts";
import { DisputeRows } from "@/components/portal/disputes";
import { SIDE_COLUMN, WITH_SIDE } from "@/components/portal/page-parts";
import { PanelCard } from "@/components/portal/panel-card";
import { Tip } from "@/components/portal/tip";
import { benefitsOf, trialDates, type ContractView } from "@/lib/contract/view";
import { escrowLine, STATUS_TONE } from "@/lib/demo/disputes";
import type { Contract, Transaction } from "@/lib/independent/data";
import { keyed } from "@/lib/portal/keys";
import { agreedTerms, disputeRule } from "../_lib/copy";

/**
 * IN-032 — the Contract & Payment tab: what was agreed, the notes the company left for it, the money
 * and its history, the disputes and how to end it, beside the score and the company. The pay and how
 * it's paid are stated once, in the terms: an Escrow & payout card beside them said it all again.
 */
export function PaymentTab({
  contract,
  view,
  ended,
  payments,
  offer,
  notes,
  score,
  company,
  ending,
  onFile,
}: {
  contract: Contract;
  view: ContractView;
  ended: boolean;
  payments: Transaction[];
  offer: ReactNode;
  /** The notes the company left the Independent on the role, shown once the contract is signed. */
  notes: ReactNode;
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
          {notes}

          {/* IN-046 — what a full-time engagement includes on top of the pay. */}
          {contract.type === "full-time" && (
            <PanelCard title="Benefits" aside={<span className="text-[12px] leading-[1.4] text-ink-2">On top of pay</span>}>
              <BenefitList included={benefitsOf(view)} size="text-[13px]" />
            </PanelCard>
          )}

          {/* The trial it began as, kept as the contract's first chapter once it became a role. */}
          {life?.converted && <TrialChapter contract={contract} view={view} />}

          <PaymentHistory contract={contract} payments={payments} />
          <Disputes contract={contract} view={view} onFile={onFile} />
          {ending}
        </div>
        <aside className={SIDE_COLUMN}>
          {score}
          {company}
        </aside>
      </div>
    </div>
  );
}

/**
 * What the company wrote for the Independent on the role ("You'll get access to the brand
 * folder on day one") and its link: private until the hire, so it's shown here, once the contract is
 * signed, and nowhere before. Nothing when it left none.
 */
export function RoleNotes({ company, text, link }: { company: string; text?: string; link?: string }) {
  const note = text?.trim();
  const extra = link?.trim();
  if (!note && !extra) return null;
  // The link field takes anything typed; only an address opens as a link.
  const href = extra && /^(https?:\/\/|www\.)\S+$/i.test(extra) ? (/^www\./i.test(extra) ? `https://${extra}` : extra) : undefined;
  return (
    <PanelCard title={`Notes from ${company}`}>
      {note && <p className="text-[13px] leading-[1.5] whitespace-pre-line text-ink">{note}</p>}
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="self-start text-[13px] leading-[1.4] font-medium break-all text-primary hover:underline">
          {extra}
        </a>
      ) : (
        extra && <p className="text-[13px] leading-[1.5] break-words text-ink">{extra}</p>
      )}
    </PanelCard>
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

/** The trial it began as: its dates (to the day it closed, if that was early), its escrow, its final score and when it was evaluated. */
function TrialChapter({ contract, view }: { contract: Contract; view: ContractView }) {
  const { life, escrow, trialEval } = view;
  if (!life?.trial) return null;
  return (
    <PanelCard title="The trial" aside={<span className="text-[12px] leading-[1.4] text-ink-2">Complete</span>}>
      <Terms
        rows={[
          ["Dates", trialDates(life.trial, contract.tasks)],
          ["Escrow", escrow ? escrowLine(escrow, { releasedTo: "you", refundedTo: contract.company }) : "Nothing held"],
          ...(contract.tfs ? ([["Trial fit score", `${contract.tfs.overall}% · final`]] as const) : []),
          ...(trialEval ? ([["Evaluated", trialEval.date]] as const) : []),
        ]}
      />
    </PanelCard>
  );
}

/** IN-032 — every transaction recorded against this contract; what's next is in the terms, not repeated here. */
function PaymentHistory({ contract, payments }: { contract: Contract; payments: Transaction[] }) {
  return (
    <PanelCard title="Payment history">
      {payments.length === 0 ? (
        // Only while it's still the trial does it say when the first money comes; a role's next payday is in the terms.
        <p className="text-[13px] leading-[1.4] text-ink-2">{contract.type === "trial" ? `No payments yet. You get paid when the trial ends and ${contract.managerFirst} submits the evaluation.` : "No payments yet."}</p>
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

/**
 * IN-032 / IN-046 / IN-059 — every dispute filed for this contract lives on this tab, the company's
 * included, and a new one is filed from here: one per chapter, so once the trial's is closed, the
 * role can still have its own. (With any dispute on file this card used to drop File a dispute, and
 * the role's could never be filed.)
 */
function Disputes({ contract, view, onFile }: { contract: Contract; view: ContractView; onFile: () => void }) {
  const { disputes: here, block, fileHint } = view;
  if (here.length > 0) {
    return (
      <PanelCard title={here.length === 1 ? "Dispute" : "Disputes"} aside={here.length === 1 ? <StatusDot tone={STATUS_TONE[here[0].status]}>{here[0].status}</StatusDot> : undefined}>
        <DisputeRows disputes={here} side="independent" />
        {block === "filed" && <p className="text-[12.5px] leading-[1.4] text-ink-2">You&apos;ve filed one about the {contract.type === "trial" ? "trial" : "role"}. {disputeRule(contract)}</p>}
        {block === null && (
          <>
            <p className="text-[12.5px] leading-[1.4] text-ink-2">Something else wrong with a payment? {disputeRule(contract)}</p>
            <FileButton onFile={onFile} />
          </>
        )}
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
            : `Hireable support reviews tasks, payments and dates, and the amount is held until a decision. ${disputeRule(contract)}`}
      </p>
      <FileButton disabled={!!block} hint={fileHint} onFile={onFile} />
    </PanelCard>
  );
}

/** File a dispute: a small secondary button at the end of its card, not the page's biggest; off, it says why on hover. */
function FileButton({ disabled = false, hint, onFile }: { disabled?: boolean; hint?: string; onFile: () => void }) {
  return (
    <Tip label={disabled ? hint : undefined} wrap wrapClassName="self-start">
      <Button size="sm" disabled={disabled} onClick={onFile} className="self-start">
        File a dispute
      </Button>
    </Tip>
  );
}
