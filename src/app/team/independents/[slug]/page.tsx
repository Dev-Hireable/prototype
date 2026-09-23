"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, use, useState } from "react";
import { Button, Card, Field, InfoBanner, Input, JobBadge, LinkButton, Modal, ObjectiveRow, Page, Progress, Select, Stat, StatusDot, Tabs, Textarea, Toast, useToast } from "@/components/independent/ui";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Avatar, CardHeading } from "@/components/team/ui";
import { TrialFitScore } from "@/components/team/TrialWidgets";
import { ActivityLog } from "@/components/portal/ActivityLog";
import { DatePicker, fromISODate, startOfToday, toISODate } from "@/components/portal/DatePicker";
import { DisputeForm, DisputeRows, useDisputeFlow } from "@/components/portal/disputes";
import { PanelCard } from "@/components/portal/PanelCard";
import { kindIndex } from "@/components/team/ObjectiveViews";
import { CONTRACT_NAMES, byName, FT_BENEFITS, isOffTrack, OBJECTIVE_KIND, REVISION_REASONS } from "@/lib/team/data";
import { sinceOrFrom } from "@/lib/demo/dates";
import { useDeal } from "@/lib/demo/deal";
import { dealContract, escrowLine, escrowOf, fileBlock, fileDispute, holds, rateAmount, usd, useDisputes } from "@/lib/demo/disputes";
import type { ContractRef } from "@/lib/demo/disputes";
import { PAIR } from "@/lib/demo/live";
import type { Objective } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";
import { useQueryState } from "@/lib/portal/query-state";
import { ReturnNav, useWithReturn } from "@/components/portal/return";

const DM = { fontVariationSettings: '"opsz" 14' } as const;
const OBJ_STATUS: Record<Objective["status"], { label: string; tone: "warn" | "ok" | "trial" | "danger"; bar: "primary" | "ok" | "warn" }> = {
  pending: { label: "Update pending", tone: "warn", bar: "primary" },
  complete: { label: "Complete", tone: "ok", bar: "ok" },
  risk: { label: "At risk", tone: "trial", bar: "warn" },
  revision: { label: "Revision requested", tone: "danger", bar: "warn" },
  on: { label: "On track", tone: "ok", bar: "primary" },
};
const SCORES = ["Quality of work", "Communication", "Reliability", "Initiative", "Collaboration"];

export default function TrackerPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense>
      <EmployerTracker params={params} />
    </Suspense>
  );
}

/**
 * Figma "Independents / Trial tracker · employer view / Full-time tracker / Objective review · approve · request revision · reject /
 * Send evaluation · locked / form / submitted / Convert to full-time · confirm".
 */
function EmployerTracker({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { contracts, endContract, evaluations, addEvaluation, sendFullTimeOffer, transactions, reviewObjective, createObjective: assignObjective } = useDemo();
  const contract = contracts.find((c) => c.slug === slug);
  if (!contract) notFound();
  const p = byName(contract.independent);
  const name = CONTRACT_NAMES[contract.slug] ?? p.name;
  const first = name.split(" ")[0];
  /** Messages opened on this person's thread — only the live pair has one in the demo. */
  const withReturn = useWithReturn();
  const thread = withReturn(contract.independent === PAIR.independent.slug ? "/team/messages?with=juan" : "/team/messages");
  // In the URL rather than state, so leaving from the Evaluation tab comes back to it.
  const [tab, setTab] = useQueryState("tab", "dashboard", ["dashboard", "contract", "evaluation"] as const);
  const objectives = contract.objectives;
  const [review, setReview] = useState<Objective | null>(null);
  const [adding, setAdding] = useState(false);
  const [converting, setConverting] = useState(false);
  const [title, setTitle] = useState("");
  const [scores, setScores] = useState<number[]>([4, 5, 4, 3, 4]);
  /** TB-067 — an evaluation on file is what unlocks End Contract and Hire for Full-Time. */
  const history = evaluations[slug] ?? [];
  const submitted = history.length > 0;
  const latest = history[0];
  const [feedback, setFeedback] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [ending, setEnding] = useState(false);
  /** Pre-filled from the trial rate so the offer starts from what they already earn. */
  const [ft, setFt] = useState({ salary: String(rateAmount(contract.rate).toLocaleString("en-US")), start: "", benefits: [] as string[] });
  /** TB-075 — the new objective being composed; what's required depends on its type. */
  const [newObj, setNewObj] = useState({ description: "", type: "Manual", target: "", unit: "", krs: [] as string[], kr: "" });
  const objectiveReady =
    title.trim().length > 1 &&
    newObj.description.trim().length > 0 &&
    (newObj.type === "Manual" ? Number(newObj.target) > 0 && !!newObj.unit.trim() : newObj.type === "Automatic" ? newObj.krs.length > 0 : true);
  const [disputing, setDisputing] = useState(false);
  /** TB-110 / TB-111 — a reason is mandatory for anything that isn't an approval. */
  const [note, setNote] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  /**
   * TB-111 / TB-116 — only one revision request per objective per reporting period. Read off the
   * objective rather than held in local state: a guard that a refresh clears isn't a guard. A
   * resubmission starts a new period.
   */
  const revisedThisPeriod = (o: Objective | null) => !!o && objectives.find((x) => x.id === o.id)?.meta.startsWith("Revision requested") === true;
  const [toast, setToast] = useToast();

  const createObjective = () => {
    const kind = newObj.type === "Manual" ? "kpi" : newObj.type === "Automatic" ? "okr" : "task";
    assignObjective(slug, { title: title.trim(), description: newObj.description.trim(), kind, target: kind === "kpi" ? Number(newObj.target) : undefined, unit: kind === "kpi" ? newObj.unit.trim() : undefined, keyResults: kind === "okr" ? newObj.krs : undefined });
    setTitle("");
    setNewObj({ description: "", type: "Manual", target: "", unit: "", krs: [], kr: "" });
    setAdding(false);
    setToast(`Objective created and assigned — ${first} has been told`);
  };
  const isTrial = contract.type === "trial";
  /** Working days remaining drives both the Days left stat and the automatic Off Track rule. */
  const left = contract.left;
  /**
   * TB-067 — the trial is over when its end date comes, or sooner once every objective has been
   * approved. It used to wait for 100% approval alone, so a trial with one objective still open
   * could never be evaluated, ended or converted, whatever the date.
   */
  const ended = isTrial && (contract.over || contract.progress === 100);
  /**
   * TB-117 — on a full-time contract the evaluation is ongoing feedback, available whenever the
   * Team Builder wants to give it. A trial's is a one-off verdict, so it waits for the trial to end.
   */
  const canEvaluate = !isTrial || ended;
  const completed = objectives.filter((o) => o.status === "complete").length;
  /** TB-066 — this contract's slice of the transaction ledger. */
  const payments = transactions.filter((t) => t.independent === name);
  const waiting = objectives.filter((o) => o.status === "pending");
  const pending = waiting.length;

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
  const here = allDisputes.filter((d) => d.contract === ref.key);
  const { block, dispute: running } = fileBlock(allDisputes, ref.key, "team", escrow);
  /** TB-073 — on a trial, filing opens once it ends; TB-058 keeps the button in view before that. */
  const trialOver = !isTrial || contract.over || contract.status.label === "Ended";
  /** TB-072 — one full-time offer at a time: while one is out or has been accepted, there is nothing to send. */
  const fullTimeOffer = onDeal ? deal?.fullTime : undefined;
  const fullTimeLocked = fullTimeOffer?.status === "sent" || fullTimeOffer?.status === "accepted";
  /** A new full-time offer starts from the last one: the talent turned down its terms, not the idea. A start date that has passed is dropped. */
  const openConvert = () => {
    if (fullTimeOffer) setFt({ salary: fullTimeOffer.salary.replace(/^\$/, ""), start: fullTimeOffer.start >= toISODate(startOfToday()) ? fullTimeOffer.start : "", benefits: fullTimeOffer.benefits });
    setConverting(true);
  };
  const fileHint = !trialOver ? `Available once the trial ends on ${contract.ends}` : block === "withdrawn" ? "You withdrew a dispute on this contract, so it can't be disputed again" : block === "settled" ? "Nothing is left in escrow on this contract" : undefined;
  const flow = useDisputeFlow("team", setToast);
  /** One button everywhere it appears: file one, open the one already running, or say why not. */
  const disputeButton = (size: "md" | "lg") =>
    block === "open" && running ? (
      <Button size={size} onClick={() => flow.view(running)}>
        View dispute
      </Button>
    ) : (
      <Button size={size} disabled={!trialOver || !!block} title={fileHint} onClick={() => setDisputing(true)}>
        {block === "withdrawn" ? "Dispute withdrawn" : "File a Dispute"}
      </Button>
    );
  /** TB-071 — End Contract can't release money a dispute is holding. */
  const endBlocked = here.some(holds);
  const contractEnded = contract.status.label === "Ended";
  const escrowText = isTrial ? (escrow ? escrowLine(escrow, contract.started, { releasedTo: first, refundedTo: "you" }) : `Held since ${contract.started}`) : null;

  /**
   * TB-109 / TB-110 / TB-111 — the three verdicts differ in more than wording:
   *   approve  → Achieved, retired from the activity tracker, streak keeps running
   *   reject   → back to Active and still feeding the tracker; a reason is required
   *   revise   → Revision Requested; a reason code AND a note are required, once per period
   */
  const decide = (verdict: "approve" | "revise" | "reject") => {
    if (!review) return;
    if (verdict !== "approve" && !note.trim()) return;
    if (verdict === "revise" && !reasonCode) return;
    // TB-111 — the reason code and the note travel together; the talent reads both.
    reviewObjective(slug, review.id, verdict, verdict === "revise" ? `${reasonCode} — ${note.trim()}` : note.trim());
    setReview(null);
    setNote("");
    setReasonCode("");
    setToast({ approve: "Objective approved", revise: `Revision requested from ${first}`, reject: "Sent back to " + first }[verdict]);
  };

  return (
    <Page
     
      title={
        <>
          {name} <JobBadge type={contract.type} />
          {/* TB-074: the contract status sits alongside the type badge. */}
          <StatusDot tone={contract.status.tone}>{contract.status.label}</StatusDot>
        </>
      }
      tabs={
        <Tabs
          className="px-4"
          value={tab}
          onChange={setTab}
          options={[
            { value: "dashboard", label: "Objectives" },
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
      /* TB-058: both stay in the header at every tab and stage of the trial. */
      navActions={
        <>
          {/* TB-058 keeps messaging in the header on every tab. It goes to the conversation itself,
              where the history is and where the reply arrives — this used to open a separate
              compose box, beside a second "Message" button that navigated instead. */}
          <LinkButton size="md" href={thread}>
            Message {first}
          </LinkButton>
          {/* TB-058 keeps it in the header; TB-073 opens it at trial end; TB-093 closes it after a withdrawal. */}
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
                  ["Type", isTrial ? "Trial" : "Full-time"],
                  [isTrial ? "Rate" : "Base salary", contract.rate],
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
          {!isTrial && (
            <Card className="flex flex-col gap-4 p-5">
              <CardHeading>Exclusive benefits</CardHeading>
              <p className="text-[13px] leading-[1.4] text-ink-2">Included with every full-time engagement, on top of base salary.</p>
              <ul className="flex flex-col gap-3 text-[14px] leading-[1.4]">
                {FT_BENEFITS.map((b) => (
                  <li key={b} className="flex items-center justify-between gap-4 border-t border-border pt-3 first:border-t-0 first:pt-0">
                    <span className="text-ink">{b}</span>
                    <StatusDot tone="ok">Included</StatusDot>
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
                  ["Agreed budget", contract.rate],
                  ["Payment schedule", isTrial ? "Held in escrow, released at trial end" : "Monthly, on the 1st"],
                  ["Escrow status", escrowText ?? "Not applicable to full-time"],
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
          {/* TB-066 payment history: date, amount, type and status, read only. */}
          <Card className="flex flex-col gap-3 p-5">
            <CardHeading>Payment history</CardHeading>
            {payments.length === 0 ? (
              <p className="text-[13px] leading-[1.4] text-ink-2">No transactions yet. The escrow deposit appears here once the trial starts.</p>
            ) : (
              <ul className="flex flex-col">
                {payments.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border py-3 text-[13px] leading-[1.4] first:border-t-0">
                    <span className="w-[100px] shrink-0 text-ink-2">{t.date}</span>
                    {/* `desc`, not `type`: the three canonical types are for the Payments ledger,
                        where you filter by them. On one contract they'd read "Payment Released" on
                        every row, which tells you less than the line it replaced. */}
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
                {trialOver
                  ? "No disputes on this contract. If a payment or the agreed process went wrong, file one — the amount in question stays in escrow while Hireable support reviews it."
                  : `No disputes. Filing opens when the trial ends on ${contract.ends}; until then, raise anything with ${first} in Messages.`}
              </p>
            ) : (
              <DisputeRows disputes={here} side="team" onView={flow.view} />
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
                {!isTrial ? "Send one whenever you have feedback — every evaluation is kept and the independent is notified." : ended || submitted ? "Scores are final once sent and feed the independent’s trial fit score." : `Locked until the trial ends on ${contract.ends}. You can prepare notes from the objectives in the meantime.`}
              </p>
            </div>
            <Card className={`flex flex-col gap-4 p-5 ${!canEvaluate && !submitted ? "opacity-60" : ""}`}>
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
                        className={`flex h-9 w-11 items-center justify-center rounded-md text-[14px] leading-[1.4] font-medium ${n === scores[i] ? "bg-primary text-white outline -outline-offset-1 outline-primary" : "bg-surface-2 text-ink outline -outline-offset-1 outline-border"}`}
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
                  options={["Select a recommendation", "Hire full-time", "Extend the trial", "End the engagement"]}
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
                    {endBlocked && !contractEnded && (
                      <p className="w-full text-right text-[13px] leading-[1.4] text-ink-2">
                        A dispute on this contract is holding {usd(escrow?.onHold ?? 0)} in escrow. You can end the contract once Hireable support has ruled on it.
                      </p>
                    )}
                    {/* TB-071 / TB-072 unlock only once the evaluation is on file — and ending
                        waits for any dispute, since the escrow it would release is on hold. */}
                    <Button size="lg" disabled={endBlocked || contractEnded} title={endBlocked ? "A dispute is holding the escrow" : undefined} onClick={() => setEnding(true)}>
                      {contractEnded ? "Contract ended" : "End contract"}
                    </Button>
                    <Button size="lg" variant="primary" disabled={fullTimeLocked} onClick={openConvert}>
                      {fullTimeOffer?.status === "sent" ? "Full-time offer sent" : fullTimeOffer?.status === "declined" || fullTimeOffer?.status === "withdrawn" ? "Send a new full-time offer" : "Hire for full-time"}
                    </Button>
                  </>
                ) : isTrial ? (
                  <>
                    {/* TB-071 / TB-072 want these visible but greyed out before the evaluation,
                        so it's clear what submitting one unlocks rather than hiding it. */}
                    <Button size="lg" disabled>
                      End contract
                    </Button>
                    <Button size="lg" disabled>
                      Hire for full-time
                    </Button>
                    <Button
                      size="lg"
                      variant="primary"
                      disabled={!canEvaluate || !feedback.trim() || !recommendation}
                      onClick={() => {
                        addEvaluation(slug, { stars: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), scores: SCORES.map((label, i) => ({ label, value: scores[i] })), feedback: feedback.trim(), recommendation, tfp: contract.tfs.overall });
                        setToast(`Evaluation sent — ${first} can read it now`);
                      }}
                    >
                      Send evaluation
                    </Button>
                  </>
                ) : (
                  <Button
                    size="lg"
                    variant="primary"
                    disabled={!canEvaluate || !feedback.trim() || !recommendation}
                    onClick={() => {
                      addEvaluation(slug, { stars: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), scores: SCORES.map((label, i) => ({ label, value: scores[i] })), feedback: feedback.trim(), recommendation, tfp: contract.tfs.overall });
                      if (!isTrial) {
                        setFeedback("");
                        setRecommendation("");
                      }
                      setToast("Evaluation sent");
                    }}
                  >
                    Send evaluation
                  </Button>
                )}
              </div>
              {canEvaluate && (!feedback.trim() || !recommendation) && <p className="text-right text-[12.5px] leading-[1.4] text-ink-2">Add a recommendation and written feedback to send.</p>}
            </Card>

            {/* TB-068 / TB-081 — every evaluation on file, newest first, read-only after sending. */}
            <div className="flex flex-col gap-3">
              <CardHeading>Evaluation history</CardHeading>
              {history.length === 0 ? (
                <Card className="p-5 text-[13px] leading-[1.4] text-ink-2">
                  {isTrial ? "No evaluation submitted yet. Once the trial ends and you send yours, it is listed here and cannot be edited." : `No evaluation submitted yet. Send one whenever you have feedback for ${first} — each is listed here and cannot be edited.`}
                </Card>
              ) : (
                history.map((h, i) => (
                  <Card key={`${h.date}-${i}`} className="flex flex-col gap-2 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[13px] leading-[1.4] text-ink-2">Submitted {h.date}</span>
                      <span className="flex items-center gap-1 text-[14px] leading-[1.2] text-[#f2994a]" aria-label={`${h.stars} out of 5 stars`}>
                        {"★".repeat(h.stars)}
                        <span className="text-ink-2">{"★".repeat(5 - h.stars)}</span>
                      </span>
                    </div>
                    <p className="text-[13.5px] leading-[1.5] text-ink">{h.feedback}</p>
                    <p className="text-[12.5px] leading-[1.4] text-ink-2">
                      Recommendation: {h.recommendation} · {isTrial ? "Final" : ""} Trial Fit Score at submission: {h.tfp}%
                    </p>
                  </Card>
                ))
              )}
            </div>
          </div>
          <div className="flex w-[320px] shrink-0 flex-col gap-3 rounded-lg bg-[#f3faf6] p-5 outline -outline-offset-1 outline-[#bfe3cc]">
            <p className="text-[14px] leading-[1.4] font-medium text-ink-2">Trial fit score · {submitted ? "final" : "so far"}</p>
            <p className="font-display text-[40px] leading-[1.5] font-semibold text-ink" style={DM}>
              {/* From the contract, not a fixed pair of numbers — this sat beside the real score
                  in the history card and disagreed with it. */}
              {contract.tfs.overall}%
            </p>
            <p className="max-w-[280px] text-[13px] leading-[1.4] text-ink-2">{submitted ? `Locked at phase 4 on ${contract.ends}, after your evaluation.` : "Locks after your evaluation. Performance updates as you approve objectives."}</p>
            {(
              [
                ["Performance", contract.tfs.performance, "objectives and evaluation"],
                ["Profile", contract.tfs.profile, "profile vs role alignment"],
                ["Work style", contract.tfs.workStyle, "from the work-style quiz"],
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
        </div>
      ) : (
        <>
          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-4">
              <Avatar src={p.avatar} size={56} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="flex items-center gap-2">
                  <span className="font-display text-[22px] leading-[1.5] font-semibold text-ink" style={DM}>
                    {name}
                  </span>
                  <JobBadge type={contract.type} />
                  <StatusDot tone={contract.status.tone}>{contract.status.label}</StatusDot>
                </p>
                <p className="text-[14px] leading-[1.4] text-ink-2">{contract.role}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="lg" variant="primary" onClick={() => (pending ? setReview(objectives.find((o) => o.status === "pending") ?? null) : setTab("evaluation"))}>
                  {pending ? "Review update" : isTrial && submitted ? "View evaluation" : "Send evaluation"}
                </Button>
              </div>
            </div>
            <p className="flex gap-6 text-[13px] leading-[1.4] whitespace-nowrap text-ink-2">
              <span>
                {isTrial ? "Trial started" : `Full-time ${sinceOrFrom(contract.started)}`} {contract.started}
              </span>
              {isTrial ? !contract.endedOn && <span>{contract.day}</span> : <span>Quarter: {contract.day}</span>}
              {isTrial && <span>{contract.endedOn ? `Ended ${contract.endedOn}` : `Ends ${contract.ends}`}</span>}
              <span>{contract.rate}</span>
              <span>Manager: {contract.manager}</span>
            </p>
          </Card>

          {/* TB-109: a banner when something is waiting on you, so approvals don't sit unseen. */}
          {pending > 0 && (
            <InfoBanner tone="warn">
              {first} sent {pending === 1 ? "an objective" : `${pending} objectives`} for review. Approve to retire {pending === 1 ? "it" : "them"} from the activity tracker, or send {pending === 1 ? "it" : "them"} back with a reason.
            </InfoBanner>
          )}

          {/* Stats bar: TB-058 wants committed + days left for a trial, TB-074 wants assigned +
              completed for full-time, where objectives are added as the engagement goes on. */}
          <div className="flex gap-4">
            <Stat
              label={isTrial ? "Committed objectives" : "Assigned objectives"}
              value={String(objectives.length)}
              sub={isTrial ? "Locked at offer — cannot be changed mid-trial" : "Add or change these at any time"}
            />
            <Stat label="Completed objectives" value={String(completed)} sub={`${objectives.length - completed} still open`} />
            {isTrial ? (
              <Stat label="Days left" value={String(left ?? 0)} sub={`${contract.started} – ${contract.ends}`} />
            ) : (
              <Stat label={`Full-time ${sinceOrFrom(contract.started)}`} value={contract.started} sub={contract.day} />
            )}
            <Stat label="Updates to review" value={String(pending)} sub={pending ? `Latest ${waiting.map((o) => o.lastUpdate?.date.split(",")[0] ?? o.updated).find(Boolean) ?? "today"} by ${first}` : "Nothing waiting"} />
          </div>

          <div className="flex items-start gap-6">
            <section className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={DM}>
                  Objectives
                </h2>
                {/* TB-075: always available on a full-time contract. Trial objectives are
                    locked at the offer (TB-058), so there is nothing to add there. */}
                {isTrial ? (
                  <span className="text-[12.5px] leading-[1.4] text-ink-2">Locked for the trial</span>
                ) : (
                  <Button size="sm" variant="primary" onClick={() => setAdding(true)}>
                    Create objective
                  </Button>
                )}
              </div>
              {objectives.map((o) => {
                // TB-058: Off Track is derived, not stored — ≤7 days left and behind target.
                const auto = isOffTrack(o, left ?? 99);
                const st = auto ? { label: "Off Track", tone: "trial" as const, bar: "warn" as const } : OBJ_STATUS[o.status];
                const href = `/team/independents/${contract.slug}/objectives/${o.id}`;
                return (
                  <Card key={o.id} className="flex flex-col gap-3 p-4">
                    <Link href={href} className="block hover:opacity-80">
                      <ObjectiveRow index={kindIndex(o.kind)}>{o.title}</ObjectiveRow>
                    </Link>
                    {/* Type, progress, status, due date, key results and last update (TB-058). */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] leading-[1.4] text-ink-2">
                      <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[12px] font-medium text-ink">{OBJECTIVE_KIND[o.kind]}</span>
                      <Progress value={o.progress} tone={st.bar} label />
                      <StatusDot tone={st.tone}>{st.label}</StatusDot>
                      {o.due && <span>Due {o.due}</span>}
                      {!!o.keyResults?.length && <span>{o.keyResults.filter((k) => k.done).length}/{o.keyResults.length} key results</span>}
                      {o.target && <span>Target {o.target} {o.unit}</span>}
                      {o.updated && <span>Updated {o.updated}</span>}
                    </div>
                    <div className="flex justify-end">
                      {o.status === "pending" ? (
                        <Button size="sm" variant="primary" onClick={() => setReview(o)}>
                          Review
                        </Button>
                      ) : (
                        <LinkButton size="sm" href={href}>
                          View
                        </LinkButton>
                      )}
                    </div>
                  </Card>
                );
              })}
            </section>

            <aside className="flex w-[420px] shrink-0 flex-col gap-4">
              {/* TB-058 live during a trial; TB-074 keeps it visible on a full-time contract as
                  the final score carried over from the trial, where it no longer moves. */}
              <TrialFitScore contract={contract} final={!isTrial} />
              <ActivityLog activity={contract.activity} streak={contract.streak} feeding={objectives.filter((o) => !o.retired && o.status !== "complete").length} />
              {/* It used to read "Send your evaluation" after one was sent, and "Opens on Ongoing,
                  once the trial ends" on a full-time contract. */}
              <PanelCard title={isTrial ? "Trial evaluation" : "Quarterly review"}>
                <p className="max-w-[320px] text-[13px] leading-[1.4] text-ink-2">
                  {!isTrial
                    ? `Send feedback whenever you have it. Every evaluation is kept and ${first} is notified.`
                    : submitted
                      ? `You sent your evaluation on ${latest.date}. End the contract or hire ${first} for full-time from the Evaluation tab.`
                      : ended
                        ? "The trial has ended. Send your evaluation to unlock the full-time decision."
                        : `Opens on ${contract.ends}, once the trial ends. Your objective reviews feed the fit score until then.`}
                </p>
                <Button size="lg" variant={!isTrial || ended ? "primary" : "secondary"} onClick={() => setTab("evaluation")}>
                  {isTrial && (submitted || !ended) ? "View evaluation" : "Send evaluation"}
                </Button>
              </PanelCard>
              <PanelCard title="Contract & payment">
                {/* Own wrapper so the rows stay tight while the card keeps the shared 16px rhythm. */}
                <div className="flex flex-col gap-2">
                {(
                  [
                    ["Rate", contract.rate],
                    [isTrial ? "Trial" : "Term", `${contract.started} – ${contract.ends}`],
                    ["Escrow", escrowText ?? `Charged monthly from ${contract.started}`],
                    ["Payout", isTrial ? "Released at trial end on your approval" : "End of each month"],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex gap-2.5 leading-[1.45]">
                    <span className="w-14 shrink-0 text-[11.5px] text-ink-2">{k}</span>
                    <span className="min-w-0 flex-1 text-[12px] text-ink">{v}</span>
                  </div>
                ))}
                </div>
                {/* It used to show a toast about a Messages form that doesn't exist; it is the same
                    dispute button as the header now. */}
                {disputeButton("lg")}
              </PanelCard>
            </aside>
          </div>
        </>
      )}

      {/* Objective review — Figma "Independents / Objective review · approve update / request revision / reject update" */}
      <Modal
        open={!!review}
        onClose={() => setReview(null)}
        title={`Review update: ${review?.title ?? ""}`}
        description={`${first} sent this for review. Approve to move the objective forward, request a revision, or reject it.`}
        footer={
          <>
            <Button size="lg" variant="ghost" disabled={!note.trim()} onClick={() => decide("reject")}>
              Reject
            </Button>
            <Button size="lg" disabled={!note.trim() || !reasonCode || revisedThisPeriod(review)} onClick={() => decide("revise")}>
              Request revision
            </Button>
            <Button size="lg" variant="primary" onClick={() => decide("approve")}>
              Approve
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {/* What the talent actually submitted — the value, the percentage and their own words. */}
          <div className="flex flex-col gap-1.5 rounded-lg bg-[#fafafa] p-4 text-[14px] leading-[1.4] text-ink outline -outline-offset-1 outline-border">
            <span className="text-[12.5px] text-ink-2">
              {review?.lastUpdate?.date ?? review?.updated} · {review?.meta}
            </span>
            <span>{review?.lastUpdate?.text ?? "No note was added to this update."}</span>
          </div>
          {/* TB-111: a reason code is required to request a revision, and only one per period. */}
          <Field label="Reason code (required to request a revision)">
            <Select options={["Select a reason", ...REVISION_REASONS]} value={reasonCode || "Select a reason"} onChange={(e) => setReasonCode(e.target.value === "Select a reason" ? "" : e.target.value)} />
          </Field>
          {/* TB-110 / TB-111: rejecting or requesting a revision both need a written reason. */}
          <Field label="Reason (required to reject or request a revision)">
            <Textarea rows={3} className="h-[78px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should change, or what was missing" />
          </Field>
          {revisedThisPeriod(review) && <InfoBanner tone="warn">You have already requested a revision for this objective this period. Approve it or reject it instead.</InfoBanner>}
          <InfoBanner>Approving retires the objective from the activity tracker and keeps the streak running. If you do not respond within 24 hours of a revised submission, the period auto-approves.</InfoBanner>
        </div>
      </Modal>

      {/* TB-075 — title, description and type are always required; each type then asks for
          only what it actually needs. Default asks for nothing else: it is binary. */}
      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Create an objective"
        description={`${first} is notified and commits to it from their tracker. Keep it measurable.`}
        footer={
          <>
            <Button size="lg" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" disabled={!objectiveReady} onClick={createObjective}>
              Create objective
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Book 12 discovery calls per week" />
          </Field>
          <Field label="Description">
            <Textarea rows={2} className="h-[64px]" value={newObj.description} onChange={(e) => setNewObj((n) => ({ ...n, description: e.target.value }))} placeholder="What does good look like?" />
          </Field>
          <Field label="Type">
            <Select options={["Manual", "Automatic", "Default"]} value={newObj.type} onChange={(e) => setNewObj((n) => ({ ...n, type: e.target.value }))} />
          </Field>

          {newObj.type === "Manual" && (
            <div className="flex gap-3">
              <Field label="Target value" className="flex-1">
                <Input value={newObj.target} inputMode="numeric" onChange={(e) => setNewObj((n) => ({ ...n, target: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="20" />
              </Field>
              <Field label="Counted in" className="flex-1">
                <Input value={newObj.unit} onChange={(e) => setNewObj((n) => ({ ...n, unit: e.target.value }))} placeholder="e.g. demos" />
              </Field>
            </div>
          )}

          {/* TB-062 — the objective's own key results; its progress is the share of them done. */}
          {newObj.type === "Automatic" && (
            <Field label="Key results" hint="Add at least one. The last one marked done sends the objective to you for approval.">
              <div className="flex flex-col gap-2">
                {newObj.krs.map((kr, i) => (
                  <span key={`${kr}-${i}`} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-[14px] leading-[1.3] text-ink">
                    <span className="min-w-0 flex-1">{kr}</span>
                    <button type="button" aria-label={`Remove ${kr}`} onClick={() => setNewObj((n) => ({ ...n, krs: n.krs.filter((_, k) => k !== i) }))} className="text-ink-2 hover:text-ink">
                      ✕
                    </button>
                  </span>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newObj.kr}
                    onChange={(e) => setNewObj((n) => ({ ...n, kr: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" || !newObj.kr.trim()) return;
                      e.preventDefault();
                      setNewObj((n) => ({ ...n, krs: [...n.krs, n.kr.trim()], kr: "" }));
                    }}
                    placeholder="e.g. Qualify 8 opportunities over $10k"
                  />
                  <Button disabled={!newObj.kr.trim()} onClick={() => setNewObj((n) => ({ ...n, krs: [...n.krs, n.kr.trim()], kr: "" }))}>
                    Add
                  </Button>
                </div>
              </div>
            </Field>
          )}

          {newObj.type === "Default" && <InfoBanner>A default objective is binary — {first} marks it done and you approve it. No target to set.</InfoBanner>}
        </div>
      </Modal>

      <Modal
        open={converting}
        onClose={() => setConverting(false)}
        title={`Hire ${first} for full-time`}
        description="Pre-filled from their trial. Escrow closes and salary is charged monthly once they accept."
        footer={
          <>
            <Button size="lg" onClick={() => setConverting(false)}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant="primary"
              disabled={!(rateAmount(ft.salary) > 0) || !ft.start.trim()}
              onClick={() => {
                // TB-072 — on the shared engagement, so the talent can open it, sign it or decline it.
                sendFullTimeOffer({ salary: ft.salary, start: ft.start, benefits: ft.benefits });
                setConverting(false);
                setToast(`Full-time offer sent to ${first}`);
              }}
            >
              Send full-time offer
            </Button>
          </>
        }
      >
        {/* TB-072: salary, exclusive benefits and start date, pre-filled from the trial. */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Field label="Salary (USD / month)" className="flex-1">
              <Input value={ft.salary} inputMode="decimal" onChange={(e) => setFt((f) => ({ ...f, salary: e.target.value.replace(/[^0-9.,]/g, "") }))} />
            </Field>
            <Field label="Start date" className="flex-1">
              <DatePicker value={fromISODate(ft.start)} onChange={(d) => setFt((f) => ({ ...f, start: d ? toISODate(d) : "" }))} disabled={{ before: startOfToday() }} />
            </Field>
          </div>
          <Field label="Exclusive benefits (optional)">
            <div className="flex flex-col gap-2">
              {FT_BENEFITS.map((b) => (
                <label key={b} className="flex items-center gap-3 text-[14px] leading-[1.3] text-ink">
                  <input type="checkbox" checked={ft.benefits.includes(b)} onChange={() => setFt((f) => ({ ...f, benefits: f.benefits.includes(b) ? f.benefits.filter((x) => x !== b) : [...f.benefits, b] }))} className="size-5 accent-primary" />
                  {b}
                </label>
              ))}
            </div>
          </Field>
        </div>
      </Modal>
      {/* TB-073 / TB-118 — the shared form: a reason must be chosen, and the amount has to be a
          real sum no bigger than what the escrow still holds. */}
      <DisputeForm
        open={disputing}
        onClose={() => setDisputing(false)}
        title={`File a dispute about ${name}`}
        description="Hireable support reviews the contract, the objective history and the escrow record — the process, not the quality of the work. The amount in question stays in escrow until they rule, and both sides are notified."
        cap={escrow ? escrow.held : rateAmount(contract.rate)}
        capNote={escrow ? "what is still held in escrow" : "the contract rate"}
        onFile={(draft) => {
          const filed = fileDispute({ ref, filedBy: "team", ...draft });
          setDisputing(false);
          setToast(filed ? "Dispute filed — Hireable support is reviewing it and has notified " + first : "A dispute is already open on this contract");
        }}
      />

      {/* TB-071 — ending releases what escrow still holds and moves the contract to inactive. */}
      <Modal
        open={ending}
        onClose={() => setEnding(false)}
        tone="danger"
        title={`End the contract with ${name}?`}
        description={`${escrow ? `${usd(escrow.held)} still in escrow is released` : "The escrowed payment is released"} to ${first} and the contract moves to your inactive list. Filing a dispute instead keeps the funds held while support reviews it.`}
        footer={
          <>
            <Button size="lg" onClick={() => setEnding(false)}>
              Cancel
            </Button>
            {!block && trialOver && (
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
            <Button
              size="lg"
              variant="danger"
              onClick={() => {
                const released = escrow?.held ?? 0;
                const ended = endContract(slug);
                setEnding(false);
                if (!ended) return setToast("A dispute is holding the escrow, so the contract can't end until Hireable support rules");
                setToast(released > 0 ? `Contract ended — ${usd(released)} released to ${first}` : "Contract ended");
              }}
            >
              End contract
            </Button>
          </>
        }
      />

      {flow.modals}

      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
