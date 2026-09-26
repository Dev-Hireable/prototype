"use client";

import { SIDE_COLUMN, WITH_SIDE } from "@/components/portal/PageParts";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { Suspense, use, useState } from "react";
import { Button, Card, Chip, Initials, JobBadge, LinkButton, MessageButton, Modal, Page, StatusDot, Tabs, Toast, useToast } from "@/components/independent/ui";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ActivityLog } from "@/components/portal/ActivityLog";
import { DisputeForm, DisputeRows } from "@/components/portal/disputes";
import { PanelCard } from "@/components/portal/PanelCard";
import { Callout } from "@/components/portal/Callout";
import { ContractOverview, payLabel } from "@/components/portal/ContractOverview";
import { firstName } from "@/components/portal/tasks/task-bits";
import { ICONS } from "@/components/admin/icons";
import { SummaryStat } from "@/components/workspace/meta";
import { ProjectWorkspace } from "@/components/workspace/ProjectWorkspace";
import { UnreadableGate } from "@/components/workspace/UnreadableGate";
import { MatchAtHire, TrialFitScore } from "@/components/team/TrialWidgets";
import { NOTICE_DAYS, trialClosed as isTrialClosed } from "@/lib/contract/lifecycle";
import { endOptions, payScheduleOf } from "@/lib/demo/contract";
import { dayLabel, sinceOrFrom } from "@/lib/demo/dates";
import { lifecycleOfDeal, trialEvaluationOf, useDeal } from "@/lib/demo/deal";
import type { DealEvaluation } from "@/lib/demo/deal";
import { Tip } from "@/components/portal/Tip";
import { caseHref, dealContract, disputeCap, escrowInPlay, escrowLine, escrowOf, fileBlock, fileBlockHint, fileDispute, liveChapter, rateAmount, STATUS_TONE, usd, useDisputes } from "@/lib/demo/disputes";
import type { ContractRef } from "@/lib/demo/disputes";
import { hoursLabel, JOB_TYPE_LABEL, type OngoingType } from "@/lib/demo/job-types";
import { PAIR } from "@/lib/demo/live";
import { trackerClosed } from "@/lib/demo/tasks";
import { COMPANIES } from "@/lib/independent/data";
import type { Contract } from "@/lib/independent/data";
import { FT_BENEFITS } from "@/lib/team/data";
import { useDemo } from "@/lib/independent/store";
import { useQueryState, writeParams } from "@/lib/portal/query-state";
import { accessOf } from "@/lib/work/access";
import { isArchived } from "@/lib/work/model";
import { ReturnNav, useWithReturn } from "@/components/portal/return";
import { TraitTag } from "@/components/portal/TraitTag";
import { storedWorkStyle, traitTagsFor } from "@/lib/demo/work-style";

const DM = { fontVariationSettings: '"opsz" 14' } as const;

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
 * Figma "Contracts / Trial tracker · Full-time tracker · Evaluation received", with the objectives
 * replaced by the contract's shared task list (IN-076 / IN-026…030): the talent works it — moves
 * tasks, ticks subtasks, sends them for review — and the Team Builder reviews each one.
 */
function ContractTracker({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { contracts, transactions, profile, payouts, endContract, withdrawNotice } = useDemo();
  /** IN-091 — the confirmation for giving notice, or cancelling before the first day. */
  const [ending, setEnding] = useState(false);
  const contract = contracts.find((c) => c.slug === slug);
  // In the URL rather than state, so leaving from the Evaluation tab comes back to it. "tasks" is
  // the Work tab: the key links and notifications have always used.
  const [tab, setTab] = useQueryState("tab", "tasks", ["tasks", "overview", "contract", "evaluation"] as const);
  const withReturn = useWithReturn();
  /** IN-059 — the dispute form: reason, description and amount are required, evidence is not. */
  const [filing, setFiling] = useState(false);
  /** IN-049 — the company behind the contract, read-only. */
  const [companyOpen, setCompanyOpen] = useState(false);
  const [toast, setToast] = useToast();
  const deal = useDeal();
  const allDisputes = useDisputes();
  const router = useRouter();
  if (!contract) notFound();
  const people = { team: { name: contract.manager, avatar: PAIR.team.avatar }, independent: { name: profile.name, avatar: profile.photo } };
  const actor = { role: "contributor" as const, name: profile.name };

  const tasks = contract.tasks;
  /** Messages opened on the thread with this contract's manager — only the live pair has one. */
  const thread = withReturn(contract.manager === PAIR.team.name ? "/independent/messages?with=c1" : "/independent/messages");
  const company = COMPANIES[contract.company];
  /** The Team Builder's own quiz answers, from their portal — what their badges say about how they work. */
  const companyTags = contract.company === PAIR.team.company ? traitTagsFor(storedWorkStyle("team"), "team") : [];
  const isTrial = contract.type === "trial";
  const fromTrial = contract.origin === "trial";
  const typeLabel = JOB_TYPE_LABEL[contract.type];
  const left = contract.left;
  /** IN-032 — this contract's own transactions. */
  const payments = transactions.filter((t) => t.contract === contract.slug);

  /**
   * IN-032 / IN-059 — disputes are one record per contract that the Team Builder and Admin read too
   * (@/lib/demo/disputes), so this tab shows theirs as well as the independent's own.
   */
  const liveRef = dealContract(deal);
  const onDeal = !!liveRef && liveRef.links.independent === contract.slug;
  const ref: ContractRef = onDeal ? liveRef : { key: `ind:${contract.slug}`, links: { team: contract.slug, independent: contract.slug }, title: contract.title, type: contract.type, rate: contract.rate, started: contract.started, ends: contract.ends };
  const escrow = onDeal ? escrowOf(deal, allDisputes) : null;
  /** What a dispute is about: the trial's escrow while there's one in play, else the pay (IN-059). */
  const inPlay = onDeal ? escrowInPlay(deal, allDisputes) : null;
  const here = allDisputes.filter((d) => d.contract === ref.key);
  const conversion = onDeal ? deal?.conversion : undefined;
  /** Where the live contract is in its lifecycle (@/lib/contract/lifecycle): every tab reads the same phase. */
  const life = onDeal ? lifecycleOfDeal(deal) : null;
  const phase = life?.phase;
  const closedTrial = !!life && isTrialClosed(life);
  /** Held since the trial began — `contract.started` is the role's first day once it converts. */
  const trialStart = life?.trial ? dayLabel(life.trial.started) : contract.started;
  /**
   * IN-076 / IN-059 — filing opens when the trial ends and stays open while the contract runs: not
   * before its first day, not after it ends (fileBlock). A contract the demo only lists has no
   * lifecycle, so its status stands in for one.
   */
  const disputePhase = phase ?? (contract.status.label === "Ended" ? "ended" : contract.status.label.startsWith("Starts") ? "starts" : isTrial && !contract.over ? "trial" : "ongoing");
  const { block, dispute: running } = fileBlock(allDisputes, ref.key, "independent", inPlay, disputePhase, onDeal ? liveChapter(deal) : undefined);
  const fileHint = fileBlockHint(block, "independent", { starts: life ? dayLabel(life.since) : contract.started, trialEnds: contract.ends });
  const contractEnded = contract.status.label === "Ended";
  /**
   * IN-091 — how the talent can end the live contract right now (@/lib/demo/contract): cancel it
   * before its first day, or give notice on a running role. Notice either side gave shows here too.
   */
  const endOpts = onDeal ? endOptions(deal, "independent") : [];
  const cancelOpt = endOpts.find((o) => o?.how === "cancel") ?? undefined;
  const noticeOpt = endOpts.find((o) => o?.how === "notice") ?? undefined;
  const notice = life?.notice;
  const cancelled = onDeal && !!deal?.contract?.cancelled;
  /** When the trial's evaluation is due. */
  const due = life?.trial ? dayLabel(life.trial.evaluationDue) : undefined;
  /** The trial's own evaluation, apart from later reviews of the role it became. */
  const trialEval = onDeal ? trialEvaluationOf(deal) : undefined;
  /** A full-time or part-time role's pay: a month's worth, and the next payday. */
  const pay = onDeal ? payScheduleOf(deal) : null;
  /** What escrow will pay out now: what it holds, less what a dispute is keeping. */
  const releasable = escrow ? Math.max(0, escrow.held - escrow.onHold) : 0;
  /** Where the money goes: the default payout method, as it's named in the wallet. */
  const method = payouts.find((m) => m.isDefault);
  const payoutTo = method ? `${method.brand} ····${method.last4}` : "your payout method";
  /** The benefits the signed offer carried — a full-time role's own, not a fixed list. */
  const benefits = onDeal ? ((conversion?.status === "accepted" ? conversion.benefits : (deal?.offer?.benefits ?? deal?.contract?.benefits)) ?? []) : FT_BENEFITS;

  /** The work, on the shared engagement: done here, planned and reviewed by the Team Builder. */
  const closedNote = contractEnded
    ? "This contract has ended, so its work is read-only."
    : phase === "evaluation"
      ? `The trial ${life?.trial?.closedEarly ? "closed early, every trial task approved" : `ended on ${contract.ends}`}. Your work is with ${contract.managerFirst} for the evaluation, due ${due}.`
      : phase === "decision"
        ? `The trial is over and ${contract.managerFirst} has sent your evaluation. The work reopens if you're hired on.`
        : phase === "offer"
          ? `${contract.company} offered you a role after the trial. The work reopens when you accept it.`
          : isTrial && contract.over
            ? "The trial has closed, so no new work can be added or sent for review."
            : undefined;
  /** Items sent back with a note, waiting on the talent to change and resubmit. */
  const changed = tasks.filter((t) => !isArchived(t) && t.assignee === "independent" && t.changes && (t.status === "todo" || t.status === "doing"));
  /** Opens an item in the Work tab. */
  const openTask = (id: string) => writeParams({ tab: null, task: id });

  /** IN-084 — the full-time or part-time offer after the trial, one click from the contract it continues. */
  const offerCallout = conversion?.status === "sent" && (
    <Callout
      action={
        <LinkButton size="sm" variant="primary" href={`/independent/contracts/${contract.slug}/offer`}>
          Review offer
        </LinkButton>
      }
    >
      {contract.company} sent you a {JOB_TYPE_LABEL[conversion.type].toLowerCase()} offer: {conversion.salary} /month{conversion.hours ? `, ${hoursLabel(conversion.hours)}` : ""}. Review and sign it, or decline.
    </Callout>
  );

  /** IN-037 / IN-032 — on every tab: the conversation, and the one dispute a contract can have. */
  const headerActions = (
    <>
      <MessageButton size="md" href={thread}>
        Message {contract.managerFirst}
      </MessageButton>
      {/* Hidden once they have filed on this contract (one per contract). While any dispute is
          open on it, from either side, it opens that one instead. */}
      {block === "open" && running ? (
        <LinkButton size="md" href={caseHref("independent", running.id)}>
          View dispute
        </LinkButton>
      ) : (
        block !== "filed" && (
          <Tip label={fileHint} wrap>
            <Button size="md" disabled={!!block} onClick={() => setFiling(true)}>
              File a dispute
            </Button>
          </Tip>
        )
      )}
    </>
  );

  /** IN-049 — who the contract is with; the full profile opens read-only. */
  const companyCard = (
    <PanelCard title="Company">
      <div className="flex items-center gap-3">
        <Initials text={contract.initials} className="size-11 shrink-0 text-[13px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-[14px] leading-[1.3] font-semibold text-ink">{contract.company}</p>
          <p className="truncate text-[12.5px] leading-[1.3] text-ink-2">{contract.manager} · Hiring manager</p>
        </div>
      </div>
      {companyTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {companyTags.map((t) => (
            <TraitTag key={`${t.trait}-${t.label}`} tag={t} view="other" />
          ))}
        </div>
      )}
      <Button size="lg" onClick={() => setCompanyOpen(true)}>
        View company profile
      </Button>
    </PanelCard>
  );

  const contractRows = (
    [
      ["Pay", contract.rate],
      [isTrial ? "Trial" : "Term", cancelled ? `Cancelled ${contract.endedOn ?? ""} — it hadn't started` : notice && !contractEnded ? `${contract.started} – ${dayLabel(notice.lastDay)} (notice)` : `${contract.started} – ${contract.ends}`],
      // It used to say "released" as soon as the trial dates passed, whether or not the Team
      // Builder had released anything — the exact case a dispute is for.
      [fromTrial && !isTrial ? "Trial" : "Escrow", fromTrial ? (escrow ? escrowLine(escrow, trialStart, { releasedTo: "you", refundedTo: contract.company }) : `${usd(contract.deposit ?? rateAmount(contract.rate))} held since ${trialStart}`) : "None — hired directly, paid monthly"],
      [
        "Payout",
        contractEnded
          ? `Settled, to ${payoutTo}`
          : isTrial
            ? releasable > 0
              ? `With the evaluation${due ? `, or on its own after ${due}` : ""}, to ${payoutTo}`
              : escrow && escrow.onHold > 0
                ? "Held for a dispute"
                : `Paid to ${payoutTo}`
            : pay?.next
              ? `${usd(pay.next.amount)} on ${dayLabel(pay.next.to)}, to ${payoutTo}${pay.held > 0 ? ` · ${usd(pay.held)} held for a dispute` : ""}`
              : `At the end of each month, to ${payoutTo}`,
      ],
    ] as const
  ).map(([k, v]) => (
    <div key={k} className="flex gap-2.5 leading-[1.45]">
      <span className="w-14 shrink-0 text-[11.5px] text-ink-2">{k}</span>
      <span className="min-w-0 flex-1 text-[12px] text-ink">{v}</span>
    </div>
  ));
  /** The trial's score, final once it converted — or the match, on a direct hire. */
  const score = contract.tfs ? <TrialFitScore contract={{ tfs: contract.tfs, phase: contract.phase }} final={!isTrial || !!trialEval} /> : <MatchAtHire match={contract.match} who="You were" />;

  return (
    <Page
      fill={tab === "tasks"}
      title={
        <>
          {contract.title} — {contract.company} <JobBadge type={contract.type} />
          <StatusDot tone={contract.status.tone}>{contract.status.label}</StatusDot>
        </>
      }
      tabs={
        <Tabs
          value={tab}
          onChange={setTab}
          aria-label="Contract sections"
          options={[
            { value: "tasks", label: "Work" },
            { value: "overview", label: "Overview" },
            { value: "contract", label: "Contract & Payment" },
            { value: "evaluation", label: "Evaluation" },
          ]}
        />
      }
      nav={
        <ReturnNav
          fallback={
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink render={<Link href="/independent/contracts" />}>All contracts</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                {tab === "tasks" ? (
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {contract.title} — {contract.company}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                ) : (
                  <>
                    {/* On a tab, the contract crumb leads back to its default Tasks tab. */}
                    <BreadcrumbItem>
                      <BreadcrumbLink render={<Link href={`/independent/contracts/${contract.slug}`} />}>
                        {contract.title} — {contract.company}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{tab === "evaluation" ? "Evaluation" : tab === "overview" ? "Overview" : "Contract & Payment"}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          }
        />
      }
      navActions={headerActions}
    >
      {tab === "tasks" ? (
        onDeal ? (
          <ProjectWorkspace
            actor={actor}
            people={people}
            closedNote={closedNote}
            context={
              <>
                {isTrial && !contract.endedOn && <SummaryStat mark={<ICONS.clock size={15} aria-hidden />}>{contract.day}</SummaryStat>}
                {!isTrial && life && (
                  <SummaryStat>
                    {cancelled ? `${typeLabel} · cancelled before ${dayLabel(life.since)}` : `${typeLabel} ${phase === "starts" ? "from" : "since"} ${dayLabel(life.since)}`}
                    {notice && !contractEnded && ` · ends after ${dayLabel(notice.lastDay)}`}
                  </SummaryStat>
                )}
                {contract.tfs && (
                  <SummaryStat>
                    Trial Fit Score <b className="font-semibold text-ink">{contract.tfs.overall}%</b>
                    {(!isTrial || trialEval) && " · final"}
                  </SummaryStat>
                )}
              </>
            }
          />
        ) : (
          <p className="px-10 py-8 text-[14px] text-ink-2">This contract's work list isn't available.</p>
        )
      ) : tab === "evaluation" ? (
        isTrial ? (
          <Evaluation evaluation={trialEval ?? contract.evaluations[0]} company={contract.company} contract={contract} thread={thread} due={due} />
        ) : (
          <OngoingEvaluations entries={fromTrial ? contract.evaluations.slice(0, -1) : contract.evaluations} trial={fromTrial ? contract.evaluations[contract.evaluations.length - 1] : undefined} contract={contract} score={score} ended={contractEnded} />
        )
      ) : tab === "contract" ? (
        <div className="flex flex-col gap-5">
          {offerCallout}
          <div className={WITH_SIDE}>
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              {/* IN-032 — what was agreed, read-only: nothing on this tab can be edited. */}
              <PanelCard title="Agreed terms" aside={<span className="text-[12px] leading-[1.4] text-ink-2">Read-only</span>}>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] leading-[1.4]">
                  {(
                    [
                      ["Role", contract.title],
                      ["Contract type", fromTrial && !isTrial ? `${typeLabel}, after a trial` : typeLabel],
                      [isTrial ? "Trial duration" : "Review period", isTrial ? `${contract.workingDays ?? contract.day.replace(/^Day \d+ of /, "")} working days · ${contract.day}` : "Quarterly"],
                      ["Start date", contract.started],
                      [isTrial ? "End date" : "Term ends", contract.ends],
                      [contract.type === "full-time" ? "Base salary" : isTrial ? "Agreed budget" : "Monthly rate", contract.rate],
                      ...(contract.hours ? ([["Hours", hoursLabel(contract.hours)]] as const) : []),
                      ["Payment schedule", isTrial ? `Held in escrow, paid to you with ${contract.managerFirst}'s evaluation${due ? ` (due ${due}), or on its own once that has passed` : ""}` : "Paid on the last day of each month — pro rata for a part month"],
                      ...(!isTrial ? ([["Next payment", pay?.next ? `${usd(pay.next.amount)} on ${dayLabel(pay.next.to)}${pay.held > 0 ? `, less ${usd(pay.held)} held for a dispute` : ""}` : contractEnded ? "None — the contract has ended" : phase === "starts" && life ? `From ${dayLabel(life.since)}, paid at the end of each month` : "—"]] as const) : []),
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="flex flex-col gap-0.5">
                      <dt className="text-ink-2">{k}</dt>
                      <dd className="font-medium text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
              </PanelCard>

              {/* IN-046 — what a full-time engagement includes on top of the salary. */}
              {contract.type === "full-time" && (
                <PanelCard title="Exclusive benefits" aside={<span className="text-[12px] leading-[1.4] text-ink-2">On top of base salary</span>}>
                  <ul className="flex flex-col gap-3 text-[13px] leading-[1.4]">
                    {FT_BENEFITS.map((b) => (
                      <li key={b} className="flex items-center justify-between gap-4 border-t border-border pt-3 first:border-t-0 first:pt-0">
                        <span className="text-ink">{b}</span>
                        {benefits.includes(b) ? <StatusDot tone="ok">Included</StatusDot> : <StatusDot tone="neutral">Not included</StatusDot>}
                      </li>
                    ))}
                  </ul>
                </PanelCard>
              )}

              {/* The trial it began as, kept as the contract's first chapter once it became a role. */}
              {life?.converted && life.trial && (
                <PanelCard title="The trial" aside={<span className="text-[12px] leading-[1.4] text-ink-2">Complete</span>}>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] leading-[1.4]">
                    {(
                      [
                        ["Dates", `${dayLabel(life.trial.started)} – ${dayLabel(life.trial.ends)}`],
                        ["Escrow", escrow ? escrowLine(escrow, dayLabel(life.trial.started), { releasedTo: "you", refundedTo: contract.company }) : "—"],
                        ...(contract.tfs ? ([["Trial Fit Score", `${contract.tfs.overall}% · final`]] as const) : []),
                        ...(trialEval ? ([["Evaluated", trialEval.date]] as const) : []),
                      ] as const
                    ).map(([k, v]) => (
                      <div key={k} className="flex flex-col gap-0.5">
                        <dt className="text-ink-2">{k}</dt>
                        <dd className="font-medium text-ink">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </PanelCard>
              )}

              {/* IN-032 — every transaction recorded against this contract. */}
              <PanelCard title="Payment history">
                {payments.length === 0 ? (
                  <p className="text-[13px] leading-[1.4] text-ink-2">{fromTrial ? `No payments on this contract yet. The trial's budget is held in escrow and paid to you with ${contract.managerFirst}'s evaluation.` : pay?.next ? `No payments yet. Your first, ${usd(pay.next.amount)}, is paid on ${dayLabel(pay.next.to)}.` : "No payments on this contract yet. Monthly pay appears here as it's paid."}</p>
                ) : (
                  <div className="overflow-hidden rounded-lg outline -outline-offset-1 outline-border">
                    <div className="flex items-center gap-4 bg-surface-2 px-4 py-2.5 text-[12.5px] leading-[1.4] font-medium text-ink-2">
                      <span className="w-[110px] shrink-0">Date</span>
                      <span className="w-[150px] shrink-0">Type</span>
                      <span className="w-[110px] shrink-0">Amount</span>
                      <span className="min-w-0 flex-1">Status</span>
                    </div>
                    {/* Two payments can share a date and description (a dispute release, then End Contract). */}
                    {payments.map((t, i) => (
                      <div key={`${i}-${t.date}-${t.desc}-${t.amount}`} className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-[13px] leading-[1.4] text-ink">
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

              {/* IN-032 / IN-046 — every dispute filed for this contract lives on this tab, the company's included. */}
              {here.length > 0 ? (
                <PanelCard title={here.length === 1 ? "Dispute" : "Disputes"} aside={here.length === 1 ? <StatusDot tone={STATUS_TONE[here[0].status]}>{here[0].status}</StatusDot> : undefined}>
                  <DisputeRows disputes={here} side="independent" />
                  {block === "filed" && <p className="text-[12.5px] leading-[1.4] text-ink-2">One dispute can be filed per contract, so there is nothing more to raise here.</p>}
                </PanelCard>
              ) : (
                <PanelCard title="Something wrong with a payment?">
                  <p className="text-[13px] leading-[1.4] text-ink-2">
                    {block === "trial" || block === "starts"
                      ? `${fileHint}. Until then, raise anything unexpected with ${contract.managerFirst} in Messages.`
                      : fileHint
                        ? `${fileHint}.`
                        : "Hireable support reviews the contract, the task log and the payment record, and the amount in question stays put until they rule. You can file one dispute per contract."}
                  </p>
                  <Tip label={fileHint} wrap wrapClassName="self-start">
                    <Button size="lg" variant="primary" disabled={!!block} onClick={() => setFiling(true)}>
                      File a dispute
                    </Button>
                  </Tip>
                </PanelCard>
              )}
              {/* IN-091 — the talent can end it too: cancel before the first day, or give notice on a running role. */}
              {onDeal && !contractEnded && (cancelOpt || noticeOpt || notice) && (
                <PanelCard title="Ending the contract">
                  <p className="text-[13px] leading-[1.4] text-ink-2">
                    {cancelOpt && life
                      ? `Your ${isTrial ? "trial" : `${typeLabel.toLowerCase()} role`} hasn't started — its first day is ${dayLabel(life.since)}. You can cancel it before then; nothing is owed either way.`
                      : notice
                        ? notice.by === "independent"
                          ? `You gave notice on ${dayLabel(notice.given)}: the role ends after ${dayLabel(notice.lastDay)}. You keep working, and are paid, until then — or take the notice back.`
                          : `${contract.company} gave notice on ${dayLabel(notice.given)}: the role ends after ${dayLabel(notice.lastDay)}. You're paid through that day.`
                        : `Either side can end the role with ${NOTICE_DAYS[contract.type as OngoingType]} days' notice, as your agreement says. It carries on, and you're paid, through the notice period.`}
                  </p>
                  {notice?.by === "independent" ? (
                    <Button
                      size="lg"
                      onClick={() => {
                        const r = withdrawNotice();
                        setToast(r.ok ? "Notice withdrawn — the role carries on" : r.error);
                      }}
                    >
                      Take back notice
                    </Button>
                  ) : (
                    (cancelOpt || noticeOpt) && (
                      <Button size="lg" variant="danger" onClick={() => setEnding(true)}>
                        {cancelOpt ? "Cancel contract" : "Give notice"}
                      </Button>
                    )
                  )}
                </PanelCard>
              )}
            </div>
            <aside className={SIDE_COLUMN}>
              {score}
              <PanelCard title="Escrow &amp; payout">
                <div className="flex flex-col gap-2">{contractRows}</div>
              </PanelCard>
              {companyCard}
            </aside>
          </div>
        </div>
      ) : (
        /* IN-076 — the contract at a glance: its terms, how far the work has got, what's waiting on
           you (changes asked for), what's due next and what changed. */
        <ContractOverview
          viewer="independent"
          work={onDeal ? accessOf(deal) : undefined}
          tasks={tasks}
          names={{ team: contract.managerFirst, independent: firstName(profile.name) }}
          people={people}
          trial={isTrial}
          facts={[
            { label: "Hiring manager", value: contract.manager },
            { label: isTrial ? "Trial started" : `${typeLabel} ${sinceOrFrom(contract.started)}`, value: contract.started },
            ...(isTrial
              ? [
                  { label: contract.over ? "Trial" : `${Math.max(0, left ?? 0)} working ${left === 1 ? "day" : "days"} left`, value: contract.day },
                  // Once over, the Trial cell says how it ended; the scheduled end would only repeat it (or, closed early, contradict it).
                  ...(contract.over && !contract.endedOn ? [] : [{ label: contract.endedOn ? "Ended" : "Ends", value: contract.endedOn ?? contract.ends }]),
                ]
              : [{ label: "Review period", value: contract.day }]),
            { label: payLabel(contract.type), value: contract.rate },
            ...(contract.hours ? [{ label: "Hours", value: hoursLabel(contract.hours) }] : []),
          ]}
          callouts={
            <>
              {offerCallout}
              {phase === "evaluation" && (
                <Callout>
                  Your trial {life?.trial?.closedEarly ? "closed early, every trial task approved" : `ended on ${contract.ends}`}. {contract.managerFirst} is evaluating it{due ? ` — it's due ${due}` : ""}.
                  {releasable > 0 && ` The ${usd(releasable)} in escrow is paid to you with the evaluation, or on its own if it hasn't come by then.`}
                </Callout>
              )}
              {phase === "decision" && (
                <Callout
                  action={
                    <Button size="sm" onClick={() => setTab("evaluation")}>
                      Read it
                    </Button>
                  }
                >
                  {life?.expired && conversion
                    ? `The ${JOB_TYPE_LABEL[conversion.type].toLowerCase()} offer expired on ${dayLabel(conversion.start)}, its start date, without an answer. ${contract.managerFirst} can send you a new one.`
                    : conversion?.status === "declined"
                    ? `You declined the ${JOB_TYPE_LABEL[conversion.type].toLowerCase()} offer. The trial is complete; ${contract.managerFirst} may send a new offer.`
                    : conversion?.status === "withdrawn"
                      ? `${contract.company} withdrew its ${JOB_TYPE_LABEL[conversion.type].toLowerCase()} offer. The trial is complete.`
                      : `${contract.managerFirst} sent your evaluation: your Trial Fit Score is final${contract.tfs ? ` at ${contract.tfs.overall}%` : ""}.`}
                </Callout>
              )}
              {phase === "starts" && life && (
                <Callout>
                  Your {life.converted ? `${typeLabel.toLowerCase()} role` : "trial"} starts on {dayLabel(life.since)}. The work opens then.
                </Callout>
              )}
              {phase === "ongoing" && notice && (
                <Callout tone="warn">
                  {notice.by === "independent" ? `You gave notice on ${dayLabel(notice.given)}` : `${contract.company} gave notice on ${dayLabel(notice.given)}`}: the {typeLabel.toLowerCase()} role ends after {dayLabel(notice.lastDay)}. It carries on, and you're paid, until then.
                </Callout>
              )}
              {changed.length > 0 && !closedTrial && !contractEnded && (
                <Callout
                  tone="warn"
                  action={
                    <Button size="sm" variant="primary" onClick={() => openTask(changed[0].id)}>
                      Open
                    </Button>
                  }
                >
                  {contract.managerFirst} asked for changes on {changed.length === 1 ? "an item" : `${changed.length} items`}. Read the note, make the changes, then send {changed.length === 1 ? "it" : "them"} for review again.
                </Callout>
              )}
            </>
          }
          aside={
            <>
              {/* IN-076 — the same Trial Fit Score the Team Builder sees, weighted by phase. */}
              {score}
              <ActivityLog activity={contract.activity} streak={contract.streak} feeding={tasks.filter((t) => t.status !== "done").length} closed={trackerClosed(tasks, { ended: contract.status.label === "Ended", trialOver: isTrial && contract.over })} starts={contract.startsOn} />
              {companyCard}
            </>
          }
        />
      )}

      {/* IN-049 — the company behind the contract, read-only. */}
      <Modal open={companyOpen} onClose={() => setCompanyOpen(false)} title={company?.name ?? contract.company} description="Read-only — how this company describes itself and how it likes to work.">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <Initials text={contract.initials} className="size-12 shrink-0 text-[14px]" />
            <p className="min-w-0 flex-1 text-[14px] leading-[1.5] text-ink">{company?.description ?? "No company description on file."}</p>
          </div>
          <dl className="flex flex-col gap-2 text-[13px] leading-[1.4]">
            {(
              [
                ["Industry", company?.industry],
                ["Location", company?.location],
                ["Website", company?.url],
                ["Hiring manager", contract.manager],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-28 shrink-0 text-ink-2">{k}</dt>
                <dd className="min-w-0 flex-1 text-ink">{v ?? "—"}</dd>
              </div>
            ))}
          </dl>
          {companyTags.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] leading-[1.4] font-medium text-ink">Work style</p>
              <div className="flex flex-wrap gap-2">
                {companyTags.map((t) => (
                  <TraitTag key={`${t.trait}-${t.label}`} tag={t} view="other" />
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* IN-059 — the shared form: a reason must be chosen, and the amount has to be a real sum no
          bigger than what is at stake. Filing sends it to Hireable's queue and tells the Team Builder. */}
      <DisputeForm
        open={filing}
        onClose={() => setFiling(false)}
        title="File a dispute"
        description={`Hireable support checks the process on the ${contract.title} contract — the approved tasks, the payment record and the dates. The amount stays put until they rule, and you can file one dispute per contract.`}
        cap={onDeal ? disputeCap(deal, allDisputes, contract.rate).cap : inPlay ? inPlay.held : rateAmount(contract.rate)}
        capNote={onDeal ? disputeCap(deal, allDisputes, contract.rate).note : inPlay ? "what is still held in escrow" : `a month's pay, ${contract.rate}`}
        onFile={async (draft) => {
          const r = await fileDispute({ ref, filedBy: "independent", ...draft });
          setFiling(false);
          // Straight to the case, where it now waits on the company to respond.
          if (r.ok) router.push(caseHref("independent", r.dispute.id));
          else setToast(r.error);
        }}
      />

      {/* IN-091 — cancelling before the first day, or giving notice on a running role. */}
      <Modal
        open={ending}
        onClose={() => setEnding(false)}
        tone="danger"
        title={cancelOpt ? `Cancel the ${contract.title} contract?` : `Give notice on ${contract.title}?`}
        description={
          cancelOpt && life
            ? `It hasn't started — its first day is ${dayLabel(life.since)} — so nothing is owed. ${contract.company} is told, and the contract can't be reopened.`
            : `The role ends after ${dayLabel(noticeOpt?.lastDay)}, ${NOTICE_DAYS[contract.type as OngoingType]} days from today. You keep working, and are paid, until then, and you can take the notice back before that day. ${contract.company} is told.`
        }
        footer={
          <>
            <Button size="lg" onClick={() => setEnding(false)}>
              Keep it
            </Button>
            <Button
              size="lg"
              variant="danger"
              onClick={() => {
                const r = endContract(cancelOpt ? "cancel" : "notice");
                setEnding(false);
                setToast(!r.ok ? r.error : r.cancelled ? "Contract cancelled" : r.notice ? `Notice given — the role ends after ${dayLabel(r.notice.lastDay)}` : "Done");
              }}
            >
              {cancelOpt ? "Cancel contract" : "Give notice"}
            </Button>
          </>
        }
      />

      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/**
 * IN-047 — a full-time or part-time engagement collects evaluations as it runs, so the tab is the
 * whole run of them, newest first, each with its date, stars and written feedback. Read-only.
 * IN-048 — beside them, the trial score that led to it (frozen), or the match on a direct hire.
 */
function OngoingEvaluations({ entries, trial, contract, score, ended }: { entries: DealEvaluation[]; trial?: DealEvaluation; contract: Contract; score: React.ReactNode; ended: boolean }) {
  return (
    <div className={WITH_SIDE}>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-[20px] leading-[1.5] font-semibold text-ink" style={DM}>
            Evaluations from {contract.company}
          </h2>
          <p className="text-[14px] leading-[1.4] text-ink-2">
            {entries.length === 0 ? (ended ? "None were sent before the contract ended." : trial ? `${contract.manager} hasn't reviewed the ${contract.type.replace("-", " ")} role yet. Your trial's evaluation is below.` : `${contract.manager} has not submitted one yet.`) : `${entries.length} submitted so far. Each is read-only once sent.`}
          </p>
        </div>
        {entries.length === 0 ? (
          <Card className="p-10 text-center text-[13px] leading-[1.4] text-ink-2">{ended ? "The contract has ended." : `Feedback appears here as ${contract.managerFirst} sends it.`}</Card>
        ) : (
          entries.map((e, i) => (
            <Card key={`${e.date}-${i}`} className="flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] leading-[1.4] text-ink-2">Submitted {e.date}</span>
                <span className="flex items-center gap-1 text-[16px] leading-[1.2] text-[#f2994a]" aria-label={`${e.stars} out of 5 stars`}>
                  {"★".repeat(e.stars)}
                  <span className="text-ink-2">{"★".repeat(5 - e.stars)}</span>
                </span>
              </div>
              <p className="text-[14px] leading-[1.5] text-ink">{e.feedback}</p>
              <p className="text-[12.5px] leading-[1.4] text-ink-2">Recommendation: {e.recommendation}</p>
            </Card>
          ))
        )}
        {trial && (
          <div className="flex flex-col gap-3">
            <h3 className="text-[15px] leading-[1.4] font-semibold text-ink">Your trial evaluation</h3>
            <Card className="flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] leading-[1.4] text-ink-2">Submitted {trial.date}</span>
                <span className="flex items-center gap-1 text-[16px] leading-[1.2] text-[#f2994a]" aria-label={`${trial.stars} out of 5 stars`}>
                  {"★".repeat(trial.stars)}
                  <span className="text-ink-2">{"★".repeat(5 - trial.stars)}</span>
                </span>
              </div>
              {(trial.scores ?? []).length > 0 && (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px] leading-[1.4]">
                  {(trial.scores ?? []).map((s) => (
                    <div key={s.label} className="flex justify-between gap-3">
                      <dt className="text-ink-2">{s.label}</dt>
                      <dd className="font-medium text-ink tabular-nums">{s.value} / 5</dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="text-[14px] leading-[1.5] text-ink">{trial.feedback}</p>
              <p className="text-[12.5px] leading-[1.4] text-ink-2">Recommendation: {trial.recommendation}</p>
            </Card>
          </div>
        )}
      </div>
      <aside className={SIDE_COLUMN}>
        {score}
        {contract.tfs && <p className="text-[12.5px] leading-[1.4] text-ink-2">The final score from your trial — the one this contract came out of. It is read-only and does not move again.</p>}
      </aside>
    </div>
  );
}

/**
 * Figma "Contracts / Evaluation received · view" — the evaluation the Team Builder actually sent.
 */
function Evaluation({ evaluation, company, contract, thread, due }: { evaluation?: DealEvaluation; company: string; contract: Contract; thread: string; due?: string }) {
  if (!evaluation) {
    return (
      <Card className="p-10 text-center">
        <p className="text-[16px] leading-[1.5] font-semibold text-ink">{contract.over ? "Waiting on the evaluation" : `Evaluation opens when the trial ends on ${contract.ends}`}</p>
        <p className="mt-2 text-[13px] leading-[1.4] text-ink-2">
          {contract.over && due ? `${company} has until ${due} to send it. It makes your Trial Fit Score final, and the escrow is paid to you with it.` : `${company} submits scores after the trial ends — or sooner, once every trial task is done. They feed your trial fit score, and you are notified when they are in.`}
        </p>
      </Card>
    );
  }
  const scores = evaluation.scores ?? [];
  const average = scores.length ? scores.reduce((n, s) => n + s.value, 0) / scores.length : evaluation.stars;
  return (
    <div className={WITH_SIDE}>
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-[20px] leading-[1.5] font-semibold text-ink" style={DM}>
            Your evaluation from {company}
          </h2>
          <p className="text-[14px] leading-[1.4] text-ink-2">Submitted {evaluation.date}. Scores are final and feed your trial fit score.</p>
        </div>
        {/* IN-034 — the overall star rating the Team Builder submitted, above the per-criterion scores. */}
        <Card className="flex items-center gap-4 p-5">
          <span className="flex items-center gap-1 text-[24px] leading-[1.2] text-[#f2994a]" aria-label={`${evaluation.stars} out of 5 stars`}>
            {"★".repeat(evaluation.stars)}
            <span className="text-ink-2">{"★".repeat(5 - evaluation.stars)}</span>
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-[16px] leading-[1.4] font-semibold text-ink">{evaluation.stars}.0 out of 5 overall</p>
            <p className="text-[13px] leading-[1.4] text-ink-2">Average score {average.toFixed(1)} of 5 · submitted once, and read-only for both of you.</p>
          </div>
        </Card>
        <Card className="flex flex-col gap-4 p-5">
          {scores.map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <p className="text-[14px] leading-[1.4] font-medium text-ink">{s.label}</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`flex h-9 w-11 items-center justify-center rounded-md text-[14px] leading-[1.4] font-medium ${
                      n === s.value ? "bg-primary text-white outline -outline-offset-1 outline-primary" : "bg-surface-2 text-ink outline -outline-offset-1 outline-border"
                    }`}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-2 pt-2">
            <p className="text-[14px] leading-[1.4] font-medium text-ink">Recommendation</p>
            <p className="flex items-center gap-2 text-[13px] leading-[1.4] text-ink-2">
              <StatusDot tone={evaluation.recommendation === "End the engagement" ? "neutral" : "ok"}>{evaluation.recommendation}</StatusDot>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[14px] leading-[1.4] font-medium text-ink">Comments from your employer</p>
            <p className="rounded-md bg-[#fafafa] p-3 text-[14px] leading-[1.4] text-ink outline -outline-offset-1 outline-border">{evaluation.feedback}</p>
          </div>
          <div className="flex justify-end">
            <MessageButton size="lg" href={thread}>
              Message {company}
            </MessageButton>
          </div>
        </Card>
      </div>
      {/* IN-034 — the finalised score, from the contract. Same widget the Team Builder reads. */}
      <aside className={SIDE_COLUMN}>
        {contract.tfs && <TrialFitScore contract={{ tfs: contract.tfs, phase: contract.phase }} final />}
        <p className="text-[12.5px] leading-[1.4] text-ink-2">Locked at phase 4 on {evaluation.date}, after the employer evaluation. It does not move again.</p>
      </aside>
    </div>
  );
}
