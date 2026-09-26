"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { Suspense, use, useState } from "react";
import { Button, Card, Checkbox, Field, Input, JobBadge, LinkButton, MessageButton, Modal, Page, Pills, Select, StatusDot, Tabs, Textarea, Toast, useToast } from "@/components/independent/ui";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { CardHeading } from "@/components/team/ui";
import { MatchAtHire, TrialFitScore } from "@/components/team/TrialWidgets";
import { ActivityLog } from "@/components/portal/ActivityLog";
import { DatePicker, fromISODate, startOfToday, toISODate } from "@/components/portal/DatePicker";
import { DisputeForm, DisputeRows } from "@/components/portal/disputes";
import { PanelCard } from "@/components/portal/PanelCard";
import { Callout } from "@/components/portal/Callout";
import { ContractOverview, payLabel } from "@/components/portal/ContractOverview";
import { firstName } from "@/components/portal/tasks/task-bits";
import { ICONS } from "@/components/admin/icons";
import { SummaryStat } from "@/components/workspace/meta";
import { ProjectWorkspace } from "@/components/workspace/ProjectWorkspace";
import { UnreadableGate } from "@/components/workspace/UnreadableGate";
import { CONTRACT_NAMES, byName, FT_BENEFITS } from "@/lib/team/data";
import { NOTICE_DAYS, trialClosed as isTrialClosed } from "@/lib/contract/lifecycle";
import { endOptions, payScheduleOf } from "@/lib/demo/contract";
import { dayLabel, sinceOrFrom } from "@/lib/demo/dates";
import { lifecycleOfDeal, trialEvaluationOf, useDeal } from "@/lib/demo/deal";
import { Tip } from "@/components/portal/Tip";
import { caseHref, dealContract, disputeCap, escrowInPlay, escrowLine, escrowOf, fileBlock, fileBlockHint, fileDispute, holds, liveChapter, rateAmount, usd, useDisputes } from "@/lib/demo/disputes";
import type { ContractRef } from "@/lib/demo/disputes";
import { hoursLabel, JOB_TYPE_LABEL } from "@/lib/demo/job-types";
import type { OngoingType } from "@/lib/demo/job-types";
import { PAIR } from "@/lib/demo/live";
import { trackerClosed } from "@/lib/demo/tasks";
import { CONVERSION_ID, useDemo } from "@/lib/team/store";
import { useQueryState, writeParams } from "@/lib/portal/query-state";
import { accessOf } from "@/lib/work/access";
import { isArchived, refOf } from "@/lib/work/model";
import { ReturnNav, useWithReturn } from "@/components/portal/return";

const DM = { fontVariationSettings: '"opsz" 14' } as const;
const SCORES = ["Quality of work", "Communication", "Reliability", "Initiative", "Collaboration"];
const RECOMMENDATIONS = ["Select a recommendation", "Hire full-time", "Hire part-time", "End the engagement"];

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
 * Figma "Independents / Trial tracker · employer view / Full-time tracker / Send evaluation · locked /
 * form / submitted / Convert to full-time · confirm", with the objectives replaced by the contract's
 * shared task list (TB-058 / TB-061…065 / TB-109…111): the talent works it, the Team Builder reviews it.
 */
function EmployerTracker({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { contracts, endContract, withdrawNotice, evaluations, addEvaluation, sendConversionOffer, withdrawOffer, transactions, profile } = useDemo();
  const contract = contracts.find((c) => c.slug === slug);
  if (!contract) notFound();
  const p = byName(contract.independent);
  const name = CONTRACT_NAMES[contract.slug] ?? p.name;
  const first = name.split(" ")[0];
  /** Messages opened on this person's thread — only the live pair has one in the demo. */
  const withReturn = useWithReturn();
  const thread = withReturn(contract.independent === PAIR.independent.slug ? "/team/messages?with=juan" : "/team/messages");
  // In the URL rather than state, so leaving from the Evaluation tab comes back to it. "tasks" is
  // the Work tab: the key links and notifications have always used.
  const [tab, setTab] = useQueryState("tab", "tasks", ["tasks", "overview", "contract", "evaluation"] as const);
  /** Opens an item in the Work tab — the Overview's Review button opens the first one waiting. */
  const openTask = (id: string) => writeParams({ tab: null, task: id });
  const tasks = contract.tasks;
  const [converting, setConverting] = useState(false);
  const [scores, setScores] = useState<number[]>([4, 5, 4, 3, 4]);
  /** TB-067 — an evaluation on file is what unlocks End Contract and Hire. */
  const history = evaluations[slug] ?? [];
  const submitted = history.length > 0;
  const latest = history[0];
  const [feedback, setFeedback] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [ending, setEnding] = useState(false);
  /** TB-072 — the post-trial offer, pre-filled from what they earn on the trial. */
  const [hire, setHire] = useState({ type: "full-time" as OngoingType, salary: String(rateAmount(contract.rate).toLocaleString("en-US")), start: "", benefits: [...FT_BENEFITS], hours: "20" });
  const [disputing, setDisputing] = useState(false);
  const [toast, setToast] = useToast();

  const isTrial = contract.type === "trial";
  /** Working days remaining — the Days left stat and the trial's close. */
  const left = contract.left;
  /**
   * TB-067 — the trial is over when its end date comes, or sooner once every trial task is Done.
   * TB-117 — on a full-time or part-time contract the evaluation is ongoing feedback, available
   * whenever the Team Builder wants to give it; a trial's is a one-off verdict after it ends.
   */
  const ended = isTrial && contract.over;
  /** TB-066 — this contract's slice of the transaction ledger. */
  const payments = transactions.filter((t) => t.independent === name);
  const waiting = tasks.filter((t) => t.status === "review" && t.assignee === "independent" && !isArchived(t));

  /**
   * TB-073 / TB-118 / TB-093 — a dispute is one record per contract that the independent and Admin
   * read too (@/lib/demo/disputes), so this tracker sees theirs as well, and the amount a dispute
   * holds stays in escrow until support rules.
   */
  const deal = useDeal();
  const allDisputes = useDisputes();
  const liveRef = dealContract(deal);
  const onDeal = !!liveRef && liveRef.links.team === contract.slug;
  const ref: ContractRef = onDeal ? liveRef : { key: `team:${contract.slug}`, links: { team: contract.slug, independent: contract.slug }, title: contract.role, type: contract.type, rate: contract.rate, started: contract.started, ends: contract.ends };
  const escrow = onDeal ? escrowOf(deal, allDisputes) : null;
  /** What a dispute is about: the trial's escrow while there's one in play, else the pay (TB-118). */
  const inPlay = onDeal ? escrowInPlay(deal, allDisputes) : null;
  const here = allDisputes.filter((d) => d.contract === ref.key);
  /** TB-072 — one post-trial offer at a time: while one is out or has been accepted, there is nothing to send. */
  const conversion = onDeal ? deal?.conversion : undefined;
  const conversionLocked = conversion?.status === "sent" || conversion?.status === "accepted";
  /** Where the live contract is in its lifecycle (@/lib/contract/lifecycle): every tab reads the same phase. */
  const life = onDeal ? lifecycleOfDeal(deal) : null;
  const phase = life?.phase;
  const closedTrial = !!life && isTrialClosed(life);
  /**
   * TB-073 / TB-118 — filing opens when the trial ends and stays open while the contract runs: not
   * before its first day, not after it ends (fileBlock). TB-058 keeps the button in view throughout.
   * A contract the demo only lists has no lifecycle, so its status stands in for one.
   */
  const disputePhase = phase ?? (contract.status.label === "Ended" ? "ended" : contract.status.label.startsWith("Starts") ? "starts" : isTrial && !contract.over ? "trial" : "ongoing");
  const { block, dispute: running } = fileBlock(allDisputes, ref.key, "team", inPlay, disputePhase, onDeal ? liveChapter(deal) : undefined);
  const fileHint = fileBlockHint(block, "team", { starts: life ? dayLabel(life.since) : contract.started, trialEnds: contract.ends });
  /** When the trial's evaluation is due. */
  const due = life?.trial ? dayLabel(life.trial.evaluationDue) : undefined;
  /** The trial's own evaluation, apart from later reviews of the role it became. */
  const trialEval = onDeal ? trialEvaluationOf(deal) : undefined;
  /** A full-time or part-time role's pay: a month's worth, and the next payday. */
  const pay = onDeal ? payScheduleOf(deal) : null;
  /** What escrow will release now: what it holds, less what a dispute is keeping. */
  const releasable = escrow ? Math.max(0, escrow.held - escrow.onHold) : 0;
  const offerType = conversion ? JOB_TYPE_LABEL[conversion.type].toLowerCase() : "";
  /**
   * Who can evaluate, when: the trial's evaluation once it's over (one, final), and reviews of a
   * full-time or part-time role while it runs (TB-117) — never before it starts or after it ends.
   */
  const canEvaluate = life ? phase === "evaluation" || phase === "ongoing" : !isTrial || ended;
  /** A trial's evaluation shows the scores it was sent with, not this page's defaults. */
  const shownScores = isTrial && submitted && latest?.scores ? SCORES.map((label, i) => latest.scores?.find((s) => s.label === label)?.value ?? scores[i]) : scores;
  /** On a trial that became a role, its first evaluation is the trial's; the rest review the role. */
  const trialFirst = contract.origin === "trial" && !isTrial && history.length > 0 ? history[history.length - 1] : undefined;
  /**
   * A new post-trial offer starts from the last one: the talent turned down its terms, not the idea.
   * A start date that has passed is dropped. The first one starts on the kind of role the
   * evaluation recommended.
   */
  const openConvert = () => {
    if (conversion)
      setHire({
        type: conversion.type,
        salary: conversion.salary.replace(/^\$/, ""),
        start: conversion.start >= toISODate(startOfToday()) ? conversion.start : "",
        benefits: conversion.benefits.length ? conversion.benefits : [...FT_BENEFITS],
        hours: String(conversion.hours ?? 20),
      });
    else if (latest?.recommendation === "Hire part-time" || latest?.recommendation === "Hire full-time") setHire((h) => ({ ...h, type: latest.recommendation === "Hire part-time" ? "part-time" : "full-time" }));
    setConverting(true);
  };
  const hireHours = Number(hire.hours);
  const hireReady = rateAmount(hire.salary) > 0 && !!hire.start.trim() && (hire.type === "full-time" || (Number.isInteger(hireHours) && hireHours >= 1 && hireHours <= 40));
  const router = useRouter();
  /** One button everywhere it appears: file one, open the one already running, or say why not. */
  const disputeButton = (size: "md" | "lg") =>
    block === "open" && running ? (
      <LinkButton size={size} href={caseHref("team", running.id)}>
        View dispute
      </LinkButton>
    ) : (
      <Tip label={fileHint} wrap>
        <Button size={size} disabled={!!block} onClick={() => setDisputing(true)}>
          {block === "withdrawn" ? "Dispute withdrawn" : "File a Dispute"}
        </Button>
      </Tip>
    );
  /** TB-071 — End Contract can't release money a dispute is holding. */
  const endBlocked = here.some(holds);
  const contractEnded = contract.status.label === "Ended";
  /**
   * TB-071 — how the live contract can end right now (@/lib/demo/contract): cancelled before its
   * first day, closed after the trial's evaluation, or — on a running role — with notice, or today
   * paying the notice.
   */
  const endOpts = onDeal ? endOptions(deal, "team") : [];
  const endOpt = (how: "cancel" | "close" | "notice" | "now") => endOpts.find((o) => o?.how === how) ?? undefined;
  const cancelOpt = endOpt("cancel");
  const closeOpt = endOpt("close");
  const noticeOpt = endOpt("notice");
  const nowOpt = endOpt("now");
  /** Notice given on the running role, by either side. */
  const notice = life?.notice;
  /** Called off before its first day. */
  const cancelled = onDeal && !!deal?.contract?.cancelled;
  const fromTrial = contract.origin === "trial";
  /** Held since the trial began — `contract.started` is the role's first day once it converts. */
  const trialStart = life?.trial ? dayLabel(life.trial.started) : contract.started;
  const escrowText = fromTrial ? (escrow ? escrowLine(escrow, trialStart, { releasedTo: first, refundedTo: "you" }) : `Held since ${trialStart}`) : null;
  const typeLabel = JOB_TYPE_LABEL[contract.type];
  /** The benefits the signed offer carried — a full-time role's own, not a fixed list. */
  const benefits = onDeal ? ((conversion?.status === "accepted" ? conversion.benefits : (deal?.offer?.benefits ?? deal?.contract?.benefits)) ?? []) : FT_BENEFITS;

  /** The work, on the shared engagement: planned and reviewed here as this Team Builder, worked by the talent. */
  const people = { team: { name: profile.name, avatar: profile.photo }, independent: { name, avatar: p.avatar } };
  const actor = { role: "manager" as const, name: profile.name };
  const closedNote = contractEnded
    ? "This contract has ended, so its work is read-only."
    : phase === "evaluation"
      ? `The trial ${life?.trial?.closedEarly ? "closed early, every trial task approved" : `ended on ${contract.ends}`}. Approve what's still in review, then send your evaluation by ${due}.`
      : phase === "decision"
        ? `The trial is over and evaluated. Hire ${first} to carry on the work, or end the contract.`
        : phase === "offer"
          ? `Your ${offerType} offer is with ${first}. The work reopens when they accept.`
          : isTrial && contract.over
            ? "The trial has closed, so no new work can be added. Anything still in review can be approved."
            : undefined;

  const sendEvaluation = () => {
    const r = addEvaluation(slug, { stars: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), scores: SCORES.map((label, i) => ({ label, value: scores[i] })), feedback: feedback.trim(), recommendation });
    if (!r.ok) return setToast(r.error);
    if (!isTrial) {
      setFeedback("");
      setRecommendation("");
    }
    setToast(r.trial ? `Evaluation sent — ${first}'s Trial Fit Score is final${r.released > 0 ? ` and ${usd(r.released)} was released to them` : ""}` : `Evaluation sent — ${first} can read it now`);
  };

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
                  <BreadcrumbLink render={<Link href="/team/independents" />}>All independents</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          }
        />
      }
      /* TB-058: both stay in the header at every tab and stage of the contract. */
      navActions={
        <>
          <MessageButton size="md" href={thread}>
            Message {first}
          </MessageButton>
          {disputeButton("md")}
        </>
      }
    >
      {tab === "contract" ? (
        /* TB-058: the Contract & Payment tab — terms and payment history, read only. */
        <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
          <Card className="flex flex-col gap-4 p-5">
            <CardHeading>Contract terms</CardHeading>
            <dl className="flex flex-col gap-3 text-[14px] leading-[1.4]">
              {(
                [
                  ["Agreed role", contract.role],
                  ["Type", fromTrial && !isTrial ? `${typeLabel}, after a trial` : typeLabel],
                  [contract.type === "full-time" ? "Base salary" : "Rate", contract.rate],
                  ...(contract.hours ? ([["Hours", hoursLabel(contract.hours)]] as const) : []),
                  [isTrial ? "Trial window" : "Start date", isTrial ? `${contract.started} – ${contract.ends}` : contract.started],
                  ["Manager", contract.manager],
                  ["Status", contract.status.label],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-ink-2">{k}</dt>
                  <dd className="font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          {contract.type === "full-time" && (
            <Card className="flex flex-col gap-4 p-5">
              <CardHeading>Exclusive benefits</CardHeading>
              <p className="text-[13px] leading-[1.4] text-ink-2">What the signed offer includes, on top of base salary.</p>
              <ul className="flex flex-col gap-3 text-[14px] leading-[1.4]">
                {FT_BENEFITS.map((b) => (
                  <li key={b} className="flex items-center justify-between gap-4 border-t border-border pt-3 first:border-t-0 first:pt-0">
                    <span className="text-ink">{b}</span>
                    {benefits.includes(b) ? <StatusDot tone="ok">Included</StatusDot> : <StatusDot tone="neutral">Not included</StatusDot>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card className="flex flex-col gap-4 p-5">
            <CardHeading>Payment</CardHeading>
            <dl className="flex flex-col gap-3 text-[14px] leading-[1.4]">
              {(
                [
                  ["Agreed pay", contract.rate],
                  ["Payment schedule", isTrial ? `Held in escrow, released to ${first} with your evaluation${due ? ` (due ${due}), or on its own once that has passed` : ""}` : "Monthly, on the last day of each month — pro rata for a part month"],
                  ...(!isTrial ? ([["Next payment", pay?.next ? `${usd(pay.next.amount)} on ${dayLabel(pay.next.to)}${pay.held > 0 ? `, less ${usd(pay.held)} held for a dispute` : ""}` : contractEnded ? "None — the contract has ended" : phase === "starts" && life ? `From ${dayLabel(life.since)}, paid at the end of each month` : "—"]] as const) : []),
                  ...(isTrial || !fromTrial ? ([["Escrow status", escrowText ?? "No escrow — hired directly"]] as const) : []),
                  ...(isTrial ? ([["Trial duration", `${contract.started} – ${contract.ends}`]] as const) : []),
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-ink-2">{k}</dt>
                  <dd className="font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          {/* The trial it began as, kept as the contract's first chapter once it became a role. */}
          {life?.converted && life.trial && (
            <Card className="flex flex-col gap-4 p-5">
              <CardHeading>The trial</CardHeading>
              <dl className="flex flex-col gap-3 text-[14px] leading-[1.4]">
                {(
                  [
                    ["Dates", `${dayLabel(life.trial.started)} – ${dayLabel(life.trial.ends)}`],
                    ["Escrow", escrowText ?? "—"],
                    ...(contract.tfs ? ([["Trial Fit Score", `${contract.tfs.overall}% · final`]] as const) : []),
                    ...(trialEval ? ([["Evaluated", trialEval.date]] as const) : []),
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-ink-2">{k}</dt>
                    <dd className="font-medium text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
          {/* TB-066 payment history: date, amount, type and status, read only. */}
          <Card className="flex flex-col gap-3 p-5">
            <CardHeading>Payment history</CardHeading>
            {payments.length === 0 ? (
              <p className="text-[13px] leading-[1.4] text-ink-2">{fromTrial ? "No transactions yet. The escrow deposit appears here once the trial starts." : pay?.next ? `No payments yet. The first, ${usd(pay.next.amount)}, is paid on ${dayLabel(pay.next.to)}.` : "No transactions yet. Monthly payments appear here as they are paid."}</p>
            ) : (
              <ul className="flex flex-col">
                {payments.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border py-3 text-[13px] leading-[1.4] first:border-t-0">
                    <span className="w-[100px] shrink-0 text-ink-2">{t.date}</span>
                    {/* `desc`, not `type`: on one contract "Payment Released" on every row would tell you less than the line. */}
                    <span className="min-w-0 flex-1 text-ink">{t.desc}</span>
                    <span className="font-semibold text-ink">{t.amount}</span>
                    <StatusDot tone={t.status.tone}>{t.status.label}</StatusDot>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {/* IN-032's rule from this side too: every dispute on this contract, whoever filed it. */}
          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-4">
              <CardHeading>Disputes</CardHeading>
              {disputeButton("md")}
            </div>
            {here.length === 0 ? (
              <p className="text-[13px] leading-[1.4] text-ink-2">
                {block === "trial" || block === "starts"
                  ? `No disputes. ${fileHint}; until then, raise anything with ${first} in Messages.`
                  : fileHint
                    ? `No disputes. ${fileHint}.`
                    : "No disputes on this contract. If a payment or the agreed process went wrong, file one — Hireable support reviews the task log and the payment record."}
              </p>
            ) : (
              <DisputeRows disputes={here} side="team" />
            )}
          </Card>
        </div>
      ) : tab === "evaluation" ? (
        <div className="flex items-start gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-[20px] leading-[1.5] font-semibold text-ink" style={DM}>
                {isTrial && submitted ? `Your evaluation of ${name}` : `Evaluate ${name}`}
              </h2>
              <p className="text-[14px] leading-[1.4] text-ink-2">
                {!isTrial
                  ? phase === "starts" && life
                    ? `Reviews open on ${dayLabel(life.since)}, ${first}'s first day.`
                    : contractEnded
                      ? "The contract has ended; its evaluations stay on file."
                      : "Send one whenever you have feedback — every evaluation is kept and the independent is notified."
                  : ended || submitted
                    ? "Scores are final once sent and feed the independent’s trial fit score."
                    : `Locked until the trial ends on ${contract.ends}, or until every trial task is done.`}
              </p>
            </div>
            <Card className={`flex flex-col gap-4 p-5 ${!canEvaluate && !(isTrial && submitted) ? "opacity-60" : ""}`}>
              {SCORES.map((label, i) => (
                <div key={label} className="flex items-center justify-between">
                  <p className="text-[14px] leading-[1.4] font-medium text-ink">{label}</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={!canEvaluate || (isTrial && submitted)}
                        onClick={() => setScores((s) => s.map((v, k) => (k === i ? n : v)))}
                        className={`flex h-9 w-11 items-center justify-center rounded-md text-[14px] leading-[1.4] font-medium ${n === shownScores[i] ? "bg-primary text-white outline -outline-offset-1 outline-primary" : "bg-surface-2 text-ink outline -outline-offset-1 outline-border"}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex flex-col gap-2 pt-2">
                <p className="text-[14px] leading-[1.4] font-medium text-ink">Recommendation</p>
                <Select
                  aria-label="Recommendation"
                  options={isTrial ? RECOMMENDATIONS : ["Select a recommendation", "Keep going as is", "Change the scope", "End the engagement"]}
                  value={isTrial && submitted ? latest.recommendation : recommendation || "Select a recommendation"}
                  disabled={!canEvaluate || (isTrial && submitted)}
                  onChange={(e) => setRecommendation(e.target.value === "Select a recommendation" ? "" : e.target.value)}
                />
              </div>
              <Field label="Comments for the independent">
                <Textarea rows={3} disabled={!canEvaluate || (isTrial && submitted)} value={isTrial && submitted ? latest.feedback : feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What went well, what to improve" />
              </Field>
              {/* TB-067: every field is required — a rating alone isn't an assessment. */}
              <div className="flex flex-wrap justify-end gap-3">
                {isTrial && submitted ? (
                  <>
                    {(onDeal ? !!closeOpt?.blocked : endBlocked) && !contractEnded && (
                      <p className="w-full text-right text-[13px] leading-[1.4] text-ink-2">
                        A dispute on this contract is holding {usd(escrow?.onHold ?? 0)} in escrow. You can end the contract once Hireable support has ruled on it.
                      </p>
                    )}
                    {/* TB-071 / TB-072 unlock only once the evaluation is on file — and ending
                        waits for any dispute, since the escrow it would release is on hold. */}
                    <Button size="lg" variant="danger" disabled={contractEnded || (onDeal ? !closeOpt || !!closeOpt.blocked : endBlocked)} onClick={() => setEnding(true)}>
                      {contractEnded ? "Contract ended" : "End contract"}
                    </Button>
                    <Button size="lg" variant="primary" disabled={conversionLocked || contractEnded} title={contractEnded ? "The contract has ended" : undefined} onClick={openConvert}>
                      {contractEnded ? `Hire ${first}` : conversion?.status === "sent" ? `${JOB_TYPE_LABEL[conversion.type]} offer sent` : conversion?.status === "declined" || conversion?.status === "withdrawn" ? "Send a new offer" : `Hire ${first}`}
                    </Button>
                  </>
                ) : isTrial ? (
                  <>
                    {/* TB-071 / TB-072 want these visible but greyed out before the evaluation,
                        so it's clear what submitting one unlocks rather than hiding it. */}
                    {cancelOpt ? (
                      <Button size="lg" variant="danger" onClick={() => setEnding(true)}>
                        Cancel trial
                      </Button>
                    ) : (
                      <Tip label="Send your evaluation first" wrap>
                        <Button size="lg" variant="danger" disabled>
                          End contract
                        </Button>
                      </Tip>
                    )}
                    <Button size="lg" disabled title="Send your evaluation first">
                      Hire {first}
                    </Button>
                    {canEvaluate && waiting.length > 0 && (
                      <p className="w-full text-right text-[13px] leading-[1.4] text-[#8e6f12]">
                        {waiting.length === 1 ? "An item is" : `${waiting.length} items are`} still waiting on your review. Approve {waiting.length === 1 ? "it" : "them"} first: the Trial Fit Score is final once this is sent.
                      </p>
                    )}
                    <Button size="lg" variant="primary" disabled={!canEvaluate || !feedback.trim() || !recommendation} onClick={sendEvaluation}>
                      Send evaluation
                    </Button>
                  </>
                ) : (
                  <>
                    {!contractEnded && (
                      <Button size="lg" variant="danger" onClick={() => setEnding(true)} disabled={onDeal ? endOpts.length === 0 : endBlocked}>
                        {cancelOpt ? "Cancel contract" : notice ? "End today" : "End contract"}
                      </Button>
                    )}
                    <Button size="lg" variant="primary" disabled={!canEvaluate || !feedback.trim() || !recommendation} onClick={sendEvaluation}>
                      Send evaluation
                    </Button>
                  </>
                )}
              </div>
              {canEvaluate && !(isTrial && submitted) && (!feedback.trim() || !recommendation) && <p className="text-right text-[12.5px] leading-[1.4] text-ink-2">Add a recommendation and written feedback to send.</p>}
            </Card>

            {/* TB-068 / TB-081 — every evaluation on file, newest first, read-only after sending. */}
            <div className="flex flex-col gap-3">
              <CardHeading>Evaluation history</CardHeading>
              {history.length === 0 ? (
                <Card className="p-5 text-[13px] leading-[1.4] text-ink-2">
                  {isTrial ? "No evaluation submitted yet. Once the trial ends and you send yours, it is listed here and cannot be edited." : contractEnded ? "No evaluations were sent on this contract." : `No evaluation submitted yet. Send one whenever you have feedback for ${first} — each is listed here and cannot be edited.`}
                </Card>
              ) : (
                history.map((h, i) => (
                  <Card key={`${h.date}-${i}`} className="flex flex-col gap-2 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[13px] leading-[1.4] text-ink-2">
                        {h === trialFirst || isTrial ? "Trial evaluation · " : ""}Submitted {h.date}
                      </span>
                      <span className="flex items-center gap-1 text-[14px] leading-[1.2] text-[#f2994a]" aria-label={`${h.stars} out of 5 stars`}>
                        {"★".repeat(h.stars)}
                        <span className="text-ink-2">{"★".repeat(5 - h.stars)}</span>
                      </span>
                    </div>
                    <p className="text-[13.5px] leading-[1.5] text-ink">{h.feedback}</p>
                    <p className="text-[12.5px] leading-[1.4] text-ink-2">
                      Recommendation: {h.recommendation}
                      {h.tfp !== undefined && (isTrial || h === trialFirst) && ` · Final Trial Fit Score: ${h.tfp}%`}
                    </p>
                  </Card>
                ))
              )}
            </div>
          </div>
          {contract.tfs ? (
            <div className="flex w-[320px] shrink-0 flex-col gap-3 rounded-lg bg-[#f3faf6] p-5 outline -outline-offset-1 outline-[#bfe3cc]">
              <p className="text-[14px] leading-[1.4] font-medium text-ink-2">Trial fit score · {submitted || !isTrial ? "final" : "so far"}</p>
              <p className="font-display text-[40px] leading-[1.5] font-semibold text-ink" style={DM}>
                {contract.tfs.overall}%
              </p>
              <p className="max-w-[280px] text-[13px] leading-[1.4] text-ink-2">{submitted || !isTrial ? "Locked at phase 4 after the trial's evaluation." : "Locks after your evaluation. Performance moves as you approve the trial's tasks."}</p>
              {(
                [
                  ["Performance", contract.tfs.performance, "trial tasks done"],
                  ["Profile", contract.tfs.profile, "profile vs role alignment"],
                  ["Work style", contract.tfs.workStyle, "from the work-style quiz"],
                  ...(contract.tfs.evaluation !== undefined ? ([["Evaluation", contract.tfs.evaluation, "from your evaluation"]] as const) : []),
                ] as const
              ).map(([k, v, s]) => (
                <div key={k} className="flex flex-col gap-1.5 rounded-md bg-white p-3">
                  <p className="text-[13px] leading-[1.4] font-medium text-ink">{k}</p>
                  <span className="block h-1.5 w-full overflow-hidden rounded-[3px] bg-[#e6e6e6]">
                    <span className="block h-full rounded-[3px] bg-[#2e9e5b]" style={{ width: `${v}%` }} />
                  </span>
                  <p className="text-[12px] leading-[1.4] text-ink-2">
                    {v}% · {s}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <MatchAtHire match={contract.match} who={`${first} was`} className="w-[320px]" />
          )}
        </div>
      ) : tab === "tasks" ? (
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
                    {(submitted || !isTrial) && " · final"}
                  </SummaryStat>
                )}
              </>
            }
          />
        ) : (
          <p className="px-10 py-8 text-[14px] text-ink-2">This contract's work list isn't available.</p>
        )
      ) : (
        /* TB-058 / TB-074 / TB-109 — the contract at a glance: its terms, how far the work has got,
           what's waiting on you (reviews don't sit unseen), what's due next and what changed. */
        <ContractOverview
          viewer="team"
          work={onDeal ? accessOf(deal) : undefined}
          tasks={tasks}
          names={{ team: firstName(profile.name), independent: first }}
          people={people}
          trial={isTrial}
          facts={[
            { label: "Role", value: contract.role },
            { label: isTrial ? "Trial started" : `${typeLabel} ${sinceOrFrom(contract.started)}`, value: contract.started },
            ...(isTrial
              ? [
                  { label: contract.over ? "Trial" : `${left ?? 0} working ${left === 1 ? "day" : "days"} left`, value: contract.day },
                  // Once over, the Trial cell says how it ended; the scheduled end would only repeat it (or, closed early, contradict it).
                  ...(contract.over && !contract.endedOn ? [] : [{ label: contract.endedOn ? "Ended" : "Ends", value: contract.endedOn ?? contract.ends }]),
                ]
              : [{ label: "Review period", value: contract.day }]),
            { label: payLabel(contract.type), value: contract.rate },
            ...(contract.hours ? [{ label: "Hours", value: hoursLabel(contract.hours) }] : []),
          ]}
          callouts={
            <>
              {waiting.length > 0 && !contractEnded && (
                <Callout
                  tone="warn"
                  action={
                    <Button size="sm" variant="primary" onClick={() => openTask(waiting[0].id)}>
                      Review
                    </Button>
                  }
                >
                  {/* Says which item, not "an item": the button opens that one. The how-to lives in the review sheet. */}
                  {first} sent{" "}
                  <span className="font-semibold">
                    {refOf(waiting[0])} {waiting[0].title}
                  </span>
                  {waiting.length > 1 && ` and ${waiting.length - 1} more`} for review.
                  {closedTrial && ` Approve ${waiting.length === 1 ? "it" : "them"} before your evaluation — the trial is over, so nothing can be sent back.`}
                </Callout>
              )}
              {(life ? phase === "evaluation" : ended && !submitted) && (
                <Callout
                  tone={life?.trial?.evaluationOverdue ? "warn" : "info"}
                  action={
                    <Button size="sm" variant="primary" onClick={() => setTab("evaluation")}>
                      Send evaluation
                    </Button>
                  }
                >
                  {life?.trial?.evaluationOverdue
                    ? `Your evaluation of ${first} was due ${due}.${escrow && escrow.onHold > 0 ? ` ${usd(escrow.onHold)} of the escrow is held for a dispute; the rest went to ${first}.` : escrow && escrow.released > 0 && releasable === 0 ? ` The escrow has been released to ${first}.` : ""} Send it to make the Trial Fit Score final and decide what's next.`
                    : `The trial has ended. Send your evaluation of ${first}${due ? ` by ${due}` : ""}: it makes the Trial Fit Score final${releasable > 0 ? ` and releases the ${usd(releasable)} in escrow to ${first}` : ""}.`}
                </Callout>
              )}
              {phase === "decision" && !contractEnded && (
                <Callout
                  action={
                    <span className="flex gap-2">
                      <Tip label={closeOpt?.blocked} wrap>
                        <Button size="sm" variant="danger" disabled={!!closeOpt?.blocked} onClick={() => setEnding(true)}>
                          End contract
                        </Button>
                      </Tip>
                      <Button size="sm" variant="primary" onClick={openConvert}>
                        {conversion ? "Send a new offer" : `Hire ${first}`}
                      </Button>
                    </span>
                  }
                >
                  {life?.expired && conversion
                    ? `Your ${offerType} offer expired on ${dayLabel(conversion.start)}, its start date, without an answer from ${first}. Send a new one with a later start, or end the contract.`
                    : conversion?.status === "declined"
                    ? `${first} declined your ${offerType} offer${conversion.declineReason ? `: “${conversion.declineReason}”` : "."} Send a new offer, or end the contract.`
                    : conversion?.status === "withdrawn"
                      ? `You withdrew your ${offerType} offer. Send a new one, or end the contract.`
                      : `The trial is evaluated. Hire ${first} full-time or part-time to keep working together, or end the contract.`}
                </Callout>
              )}
              {phase === "offer" && conversion && (
                <Callout
                  action={
                    <Button
                      size="sm"
                      onClick={() => {
                        withdrawOffer(CONVERSION_ID);
                        setToast(`Offer withdrawn — ${first} has been told`);
                      }}
                    >
                      Withdraw offer
                    </Button>
                  }
                >
                  Your {offerType} offer — {conversion.salary} /month{conversion.hours ? `, ${hoursLabel(conversion.hours)}` : ""}, from {dayLabel(conversion.start)} — is with {first}. The work reopens when they accept.
                </Callout>
              )}
              {phase === "starts" && life?.converted && (
                <Callout>
                  {first} starts {typeLabel.toLowerCase()} on {dayLabel(life.since)}. Plan the work now — {first} can start on it then.
                </Callout>
              )}
              {/* TB-071 / IN-091 — notice is in: the role runs, paid, to its last day, then ends on its own. */}
              {phase === "ongoing" && notice && (
                <Callout
                  tone="warn"
                  action={
                    notice.by === "team" ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          const r = withdrawNotice();
                          setToast(r.ok ? `Notice withdrawn — ${first}'s role carries on` : r.error);
                        }}
                      >
                        Withdraw notice
                      </Button>
                    ) : undefined
                  }
                >
                  {notice.by === "team" ? `You gave notice on ${dayLabel(notice.given)}` : `${first} gave notice on ${dayLabel(notice.given)}`}: the {typeLabel.toLowerCase()} role ends after {dayLabel(notice.lastDay)}. It carries on, and is paid, until then.
                </Callout>
              )}
            </>
          }
          aside={
            <>
              {/* TB-058 live during a trial; TB-074 keeps it visible once it converts, as the final
                  score from the trial. A direct hire had no trial, so it shows the match instead. */}
              {contract.tfs ? <TrialFitScore contract={{ tfs: contract.tfs, phase: contract.phase }} final={!isTrial || submitted} /> : <MatchAtHire match={contract.match} who={`${first} was`} />}
              <ActivityLog activity={contract.activity} streak={contract.streak} feeding={tasks.filter((t) => t.status !== "done").length} closed={trackerClosed(tasks, { ended: contractEnded, trialOver: isTrial && contract.over })} starts={contract.startsOn} />
              <PanelCard title={isTrial ? "Trial evaluation" : "Evaluations"}>
                <p className="max-w-[320px] text-[13px] leading-[1.4] text-ink-2">
                  {!isTrial
                    ? contractEnded
                      ? "The contract has ended; its evaluations stay on file."
                      : phase === "starts"
                        ? `Reviews open once ${first} starts.`
                        : `Send feedback whenever you have it. Every evaluation is kept and ${first} is notified.`
                    : submitted
                      ? contractEnded
                        ? `The contract has ended. Your evaluation from ${latest.date} stays on file.`
                        : phase === "offer"
                          ? `You sent your evaluation on ${latest.date}. Your ${offerType} offer is with ${first}.`
                          : `You sent your evaluation on ${latest.date}. Hire ${first} or end the contract.`
                      : ended
                        ? `The trial has ended. Send your evaluation${due ? ` by ${due}` : ""}: it makes the Trial Fit Score final and pays out the escrow.`
                        : `Opens on ${contract.ends}, or sooner once every trial task is done. Your reviews feed the fit score until then.`}
                </p>
                <Button size="lg" variant={canEvaluate && !(isTrial && submitted) ? "primary" : "secondary"} onClick={() => setTab("evaluation")}>
                  {canEvaluate && !(isTrial && submitted) ? "Send evaluation" : "View evaluation"}
                </Button>
              </PanelCard>
              <PanelCard title="Contract & payment">
                <div className="flex flex-col gap-2">
                  {(
                    [
                      ["Pay", contract.rate],
                      [isTrial ? "Trial" : "Term", cancelled ? `Cancelled ${contract.endedOn ?? ""} — it hadn't started` : notice && !contractEnded ? `${contract.started} – ${dayLabel(notice.lastDay)} (notice)` : `${contract.started} – ${contract.ends}`],
                      [fromTrial && !isTrial ? "Trial escrow" : "Escrow", escrowText ?? "None — paid monthly"],
                      [
                        "Payout",
                        contractEnded
                          ? "Settled"
                          : isTrial
                            ? releasable > 0
                              ? `With your evaluation${due ? `, or on its own after ${due}` : ""}`
                              : escrow && escrow.onHold > 0
                                ? "Held for a dispute"
                                : `Paid to ${first}`
                            : pay?.next
                              ? `${usd(pay.next.amount)} on ${dayLabel(pay.next.to)}${pay.held > 0 ? ` · ${usd(pay.held)} held for a dispute` : ""}`
                              : "End of each month",
                      ],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="flex gap-2.5 leading-[1.45]">
                      <span className="w-14 shrink-0 text-[11.5px] text-ink-2">{k}</span>
                      <span className="min-w-0 flex-1 text-[12px] text-ink">{v}</span>
                    </div>
                  ))}
                </div>
                {disputeButton("lg")}
              </PanelCard>
            </>
          }
        />
      )}

      {/* TB-072 — after an evaluated trial: a full-time or a part-time role, on the same engagement. */}
      <Modal
        open={converting}
        onClose={() => setConverting(false)}
        title={`Hire ${first} after the trial`}
        description={`Pre-filled from their trial. Escrow closes and pay is charged monthly once they accept. If ${first} hasn't answered by the start date, the offer expires.`}
        footer={
          <>
            <Button size="lg" onClick={() => setConverting(false)}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant="primary"
              disabled={!hireReady}
              onClick={() => {
                const sent = sendConversionOffer({ type: hire.type, salary: hire.salary, start: hire.start, benefits: hire.benefits, hours: hire.type === "part-time" ? hireHours : undefined });
                setConverting(false);
                setToast(sent ? `${JOB_TYPE_LABEL[hire.type]} offer sent to ${first}` : "The offer couldn't be sent. Pick a start date from today on, and try again.");
              }}
            >
              Send {JOB_TYPE_LABEL[hire.type].toLowerCase()} offer
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Pills
            aria-label="Kind of role"
            value={hire.type}
            onChange={(type) => setHire((h) => ({ ...h, type }))}
            options={[
              { value: "full-time", label: "Full-time" },
              { value: "part-time", label: "Part-time" },
            ]}
          />
          <div className="flex gap-3">
            <Field label={hire.type === "full-time" ? "Salary (USD / month)" : "Rate (USD / month)"} className="flex-1">
              <Input value={hire.salary} inputMode="decimal" onChange={(e) => setHire((h) => ({ ...h, salary: e.target.value.replace(/[^0-9.,]/g, "") }))} />
            </Field>
            <Field label="Start date" className="flex-1">
              <DatePicker value={fromISODate(hire.start)} onChange={(d) => setHire((h) => ({ ...h, start: d ? toISODate(d) : "" }))} disabled={{ before: startOfToday() }} />
            </Field>
          </div>
          {hire.type === "part-time" ? (
            <Field label="Hours a week" error={hire.hours.trim() && !(Number.isInteger(hireHours) && hireHours >= 1 && hireHours <= 40) ? "Enter whole hours between 1 and 40." : undefined}>
              <Input value={hire.hours} inputMode="numeric" onChange={(e) => setHire((h) => ({ ...h, hours: e.target.value.replace(/[^0-9]/g, "") }))} className="!w-[160px]" />
            </Field>
          ) : (
            <Field label="Exclusive benefits (optional)">
              <div className="flex flex-col gap-2">
                {FT_BENEFITS.map((b) => (
                  <Checkbox key={b} checked={hire.benefits.includes(b)} onChange={(on) => setHire((h) => ({ ...h, benefits: on ? [...h.benefits, b] : h.benefits.filter((x) => x !== b) }))}>
                    {b}
                  </Checkbox>
                ))}
              </div>
            </Field>
          )}
        </div>
      </Modal>

      {/* TB-073 / TB-118 — the shared form: a reason must be chosen, and the amount has to be a
          real sum no bigger than what the escrow still holds. */}
      <DisputeForm
        open={disputing}
        onClose={() => setDisputing(false)}
        title={`File a dispute about ${name}`}
        description="Hireable support reviews the contract, the task log and the payment record — the process, not the quality of the work. The amount in question stays put until they rule, and both sides are notified."
        cap={onDeal ? disputeCap(deal, allDisputes, contract.rate).cap : inPlay ? inPlay.held : rateAmount(contract.rate)}
        capNote={onDeal ? disputeCap(deal, allDisputes, contract.rate).note : inPlay ? "what is still held in escrow" : "a month's pay"}
        onFile={async (draft) => {
          const r = await fileDispute({ ref, filedBy: "team", ...draft });
          setDisputing(false);
          // Straight to the case, where it now waits on the independent to respond.
          if (r.ok) router.push(caseHref("team", r.dispute.id));
          else setToast(r.error);
        }}
      />

      {/* TB-071 — how the contract ends depends on where it is: cancelled before its first day,
          closed after the trial's evaluation, or a running role ended with notice or today. */}
      <Modal
        open={ending}
        onClose={() => setEnding(false)}
        tone="danger"
        title={cancelOpt ? `Cancel the contract with ${name}?` : `End the contract with ${name}?`}
        description={
          cancelOpt && life
            ? isTrial
              ? `The trial hasn't started — its first day is ${dayLabel(life.since)}. ${escrow && escrow.held > 0 ? `The ${usd(escrow.held)} in escrow comes back to you, ` : ""}${first} is told, and the contract can't be reopened.`
              : `${first}'s ${typeLabel.toLowerCase()} role hasn't started — its first day is ${dayLabel(life.since)} — so nothing is owed. ${first} is told, and the contract can't be reopened.`
            : (noticeOpt || nowOpt) && life && !isTrial
              ? notice
                ? `Notice is in: the role ends after ${dayLabel(notice.lastDay)}. End it today instead and ${first} is still paid through that day. It moves to your inactive list and can't be reopened.`
                : `Give notice and the ${typeLabel.toLowerCase()} role carries on, paid, for ${NOTICE_DAYS[contract.type as OngoingType]} days — through ${dayLabel(noticeOpt?.lastDay)} — then ends on its own. Or end it today and pay ${first} through that day instead. Either way it can't be reopened.`
              : fromTrial && isTrial
                ? `${releasable > 0 ? `${usd(releasable)} still in escrow is released to ${first}` : "The trial's money has already been paid out"}${conversion?.status === "sent" ? `, your ${offerType} offer is withdrawn,` : ""} and the contract moves to your inactive list — it can't be reopened.${releasable > 0 ? " Filing a dispute instead keeps the funds held while support reviews it." : ""}`
                : `The ${typeLabel.toLowerCase()} engagement ends today. It moves to your inactive list and can't be reopened; ${first} is told, and the task list and evaluations stay on file.`
        }
        footer={
          <>
            <Button size="lg" onClick={() => setEnding(false)}>
              {cancelOpt ? "Keep it" : "Cancel"}
            </Button>
            {!block && isTrial && releasable > 0 && closeOpt && (
              <Button
                size="lg"
                onClick={() => {
                  setEnding(false);
                  setDisputing(true);
                }}
              >
                File a dispute instead
              </Button>
            )}
            {noticeOpt && (
              <Button
                size="lg"
                onClick={() => {
                  const r = endContract(slug, "notice");
                  setEnding(false);
                  setToast(!r.ok ? r.error : r.notice ? `Notice given — ${first}'s role ends after ${dayLabel(r.notice.lastDay)}` : "Notice given");
                }}
              >
                Give notice
              </Button>
            )}
            <Tip label={nowOpt?.blocked} wrap>
              <Button
                size="lg"
                variant="danger"
                disabled={!!nowOpt?.blocked && !cancelOpt && !closeOpt}
                onClick={() => {
                  const how = cancelOpt ? "cancel" : closeOpt ? "close" : nowOpt ? "now" : "close";
                  const r = endContract(slug, how);
                  setEnding(false);
                  if (!r.ok) return setToast(r.error);
                  setToast(
                    r.cancelled
                      ? `Contract cancelled${r.refunded ? ` — ${usd(r.refunded)} came back to you` : ""}`
                      : r.released > 0
                        ? `Contract ended — ${usd(r.released)} released to ${first}`
                        : r.paid > 0
                          ? `Contract ended — ${usd(r.paid)} paid to ${first}, through the notice period`
                          : "Contract ended",
                  );
                }}
              >
                {cancelOpt ? "Cancel contract" : nowOpt ? "End today" : "End contract"}
              </Button>
            </Tip>
          </>
        }
      />

      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

