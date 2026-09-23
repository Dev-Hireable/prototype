"use client";

import { Tip } from "@/components/portal/Tip";
import Link from "next/link";
import { notFound } from "next/navigation";
import { use, useState } from "react";
import { Button, Card, Chip, InfoBanner, Initials, JobBadge, LinkButton, Modal, ObjectiveRow, Page, Progress, Stat, StatusDot, Tabs, Toast, useToast } from "@/components/independent/ui";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ActivityLog } from "@/components/portal/ActivityLog";
import { DisputeForm, DisputeRows, useDisputeFlow } from "@/components/portal/disputes";
import { PanelCard } from "@/components/portal/PanelCard";
import { kindIndex } from "@/components/team/ObjectiveViews";
import { TrialFitScore } from "@/components/team/TrialWidgets";
import { sinceOrFrom } from "@/lib/demo/dates";
import { useDeal } from "@/lib/demo/deal";
import type { DealEvaluation } from "@/lib/demo/deal";
import { dealContract, escrowLine, escrowOf, fileBlock, fileDispute, rateAmount, STATUS_TONE, usd, useDisputes } from "@/lib/demo/disputes";
import type { ContractRef } from "@/lib/demo/disputes";
import { PAIR } from "@/lib/demo/live";
import { COMPANIES, objectiveStatus } from "@/lib/independent/data";
import type { Contract } from "@/lib/independent/data";
import { FT_BENEFITS, OBJECTIVE_KIND } from "@/lib/team/data";
import { useDemo } from "@/lib/independent/store";
import { useQueryState } from "@/lib/portal/query-state";
import { ReturnNav, useWithReturn } from "@/components/portal/return";


const DM = { fontVariationSettings: '"opsz" 14' } as const;

/** Figma "Contracts / Trial tracker · Full-time tracker · Update progress · Mark as done · Evaluation received": DM Sans 24 header + tabs. */
export default function ContractTracker({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { contracts, transactions } = useDemo();
  const contract = contracts.find((c) => c.slug === slug);
  if (!contract) notFound();
  // In the URL rather than state, so leaving from the Evaluation tab comes back to it.
  const [tab, setTab] = useQueryState("tab", "objectives", ["objectives", "contract", "evaluation"] as const);
  const objectives = contract.objectives;
  /** Messages opened on the thread with this contract's manager — only the live pair has one. */
  const withReturn = useWithReturn();
  const thread = withReturn(contract.manager === PAIR.team.name ? "/independent/messages?with=c1" : "/independent/messages");
  /** IN-059 — the dispute form: reason, description and amount are required, evidence is not. */
  const [filing, setFiling] = useState(false);
  /** IN-049 — the company behind the contract, read-only. */
  const [companyOpen, setCompanyOpen] = useState(false);
  const company = COMPANIES[contract.company];
  const [toast, setToast] = useToast();
  const isTrial = contract.type === "trial";
  const completed = objectives.filter((o) => o.status === "complete").length;
  const pending = objectives.filter((o) => o.status === "pending").length;
  const left = contract.left;
  /** IN-076 — a dispute is only available once the trial is over; a full-time contract has no gate. */
  const ended = contract.over || contract.status.label === "Ended" || contract.evaluations.length > 0;
  const canDispute = !isTrial || ended;
  /** IN-032 — this contract's own transactions. */
  const payments = transactions.filter((t) => t.contract === contract.slug);

  /**
   * IN-032 / IN-059 — disputes are one record per contract that the Team Builder and Admin read too
   * (@/lib/demo/disputes), so this tab shows theirs as well as the independent's own.
   */
  const deal = useDeal();
  const allDisputes = useDisputes();
  const liveRef = dealContract(deal);
  const onDeal = !!liveRef && liveRef.links.independent === contract.slug;
  const ref: ContractRef = onDeal ? liveRef : { key: `ind:${contract.slug}`, links: { team: contract.slug, independent: contract.slug }, title: contract.title, type: contract.type, rate: contract.rate, started: contract.started, ends: contract.ends };
  const escrow = onDeal ? escrowOf(deal, allDisputes) : null;
  const here = allDisputes.filter((d) => d.contract === ref.key);
  const { block, dispute: running } = fileBlock(allDisputes, ref.key, "independent", escrow);
  const flow = useDisputeFlow("independent", setToast);
  const fileHint = !canDispute ? `Available once the trial ends on ${contract.ends}` : block === "settled" ? "Nothing is left in escrow on this contract" : undefined;

  const contractRows = (
    [
      ["Rate", contract.rate],
      [isTrial ? "Trial" : "Term", `${contract.started} – ${contract.ends}`],
      // It used to say "released" as soon as the trial dates passed, whether or not the Team
      // Builder had released anything — the exact case a dispute is for.
      ["Escrow", isTrial ? (escrow ? escrowLine(escrow, contract.started, { releasedTo: "you", refundedTo: contract.company }) : `${usd(contract.deposit ?? rateAmount(contract.rate))} held since ${contract.started}`) : "Not used on a full-time contract"],
      ["Payout", (escrow?.released ?? 0) > 0 ? "Paid to Maya ····4471" : isTrial ? "Released at trial end on approval, to Maya ····4471" : "Released at the end of each month, to Maya ····4471"],
    ] as const
  ).map(([k, v]) => (
    <div key={k} className="flex gap-2.5 leading-[1.45]">
      <span className="w-14 shrink-0 text-[11.5px] text-ink-2">{k}</span>
      <span className="min-w-0 flex-1 text-[12px] text-ink">{v}</span>
    </div>
  ));

  return (
    <Page
      title={
        <>
          {contract.title} — {contract.company} <JobBadge type={contract.type} />
        </>
      }
      tabs={
        <Tabs
          className="px-4"
          value={tab}
          onChange={setTab}
          options={[
            { value: "objectives", label: "Objectives" },
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
                {tab === "objectives" ? (
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {contract.title} — {contract.company}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                ) : (
                  <>
                    {/* On a tab, the contract crumb leads back to its default Objectives tab. */}
                    <BreadcrumbItem>
                      <BreadcrumbLink render={<Link href={`/independent/contracts/${contract.slug}`} />}>
                        {contract.title} — {contract.company}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{tab === "evaluation" ? "Evaluation" : "Contract & Payment"}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          }
        />
      }
    >
      {tab === "evaluation" ? (
        isTrial ? (
          <Evaluation evaluation={contract.evaluations[0]} company={contract.company} contract={contract} thread={thread} />
        ) : (
          <OngoingEvaluations entries={contract.evaluations} contract={contract} />
        )
      ) : (
        <>
          {/* Figma "Independent header": p 20, gap 12 — company, role and both status badges. */}
          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-4">
              <Initials text={contract.initials} className="size-14 text-[14px]" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="flex items-center gap-2">
                  {/* IN-049 — the company name opens its profile. It sat alone in a "⋯" menu, which hid
                      the only action behind an icon and wrapped the label. */}
                  <Tip label="View company profile">
                    <button
                      type="button"
                      onClick={() => setCompanyOpen(true)}
                      className="font-display text-[22px] leading-[1.5] font-semibold text-ink underline-offset-4 hover:text-primary hover:underline"
                      style={DM}
                    >
                      {contract.company}
                    </button>
                  </Tip>
                  <JobBadge type={contract.type} />
                  <StatusDot tone={contract.status.tone}>{contract.status.label}</StatusDot>
                </p>
                <p className="text-[14px] leading-[1.4] text-ink-2">
                  {contract.title} · {contract.manager} · Hiring manager
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* IN-037 — always here. It opens the conversation itself, with its history and where
                    the reply lands, rather than a compose box that hid both. */}
                <LinkButton size="lg" href={thread}>
                  Message {contract.managerFirst}
                </LinkButton>
                {/* IN-032 — hidden once they have filed on this contract (one per contract). While any
                    dispute is open on it, from either side, it opens that one instead. */}
                {block === "open" && running ? (
                  <Button size="lg" onClick={() => flow.view(running)}>
                    View dispute
                  </Button>
                ) : (
                  block !== "filed" && (
                    <Button size="lg" disabled={!canDispute || !!block} title={fileHint} onClick={() => setFiling(true)}>
                      File a dispute
                    </Button>
                  )
                )}
                {/* The next objective still open — or none, once every one is achieved or under review. */}
                {objectives.some((o) => o.status !== "complete" && o.status !== "pending") && (
                  <LinkButton size="lg" variant="primary" href={`/independent/contracts/${contract.slug}/objectives/${objectives.find((o) => o.status !== "complete" && o.status !== "pending")!.id}`}>
                    Update progress
                  </LinkButton>
                )}
              </div>
            </div>
            <p className="flex gap-6 text-[13px] leading-[1.4] whitespace-nowrap text-ink-2">
              <span>
                {isTrial ? "Trial started" : `Full-time ${sinceOrFrom(contract.started)}`} {contract.started}
              </span>
              {isTrial ? !contract.endedOn && <span>{contract.day}</span> : <span>Quarter: {contract.day}</span>}
              {isTrial && <span>{contract.endedOn ? `Ended ${contract.endedOn}` : `Ends ${contract.ends}`}</span>}
              <span>{contract.rate}</span>
            </p>
          </Card>

          {/* IN-046 — a full-time offer waiting on an answer, one click from the contract it continues. */}
          {onDeal && deal?.fullTime?.status === "sent" && (
            <InfoBanner>
              <span className="flex items-center justify-between gap-4">
                <span>
                  {contract.company} sent you a full-time offer: {deal.fullTime.salary} /month. Review and sign it, or decline.
                </span>
                <LinkButton size="sm" variant="primary" href={`/independent/contracts/${contract.slug}/offer`}>
                  Review offer
                </LinkButton>
              </span>
            </InfoBanner>
          )}

          {tab === "contract" ? (
            <div className="flex items-start gap-6">
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                {/* IN-032 — what was agreed, read-only: nothing on this tab can be edited. */}
                <PanelCard title="Agreed terms" aside={<span className="text-[12px] leading-[1.4] text-ink-2">Read-only</span>}>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] leading-[1.4]">
                    {(
                      [
                        ["Role", contract.title],
                        ["Contract type", isTrial ? "Trial" : "Full-time"],
                        [isTrial ? "Trial duration" : "Review period", isTrial ? `${contract.workingDays ?? contract.day.replace(/^Day \d+ of /, "")} working days · ${contract.day}` : "Quarterly"],
                        ["Start date", contract.started],
                        [isTrial ? "End date" : "Term ends", contract.ends],
                        [isTrial ? "Agreed budget" : "Base salary", contract.rate],
                        ["Payment schedule", isTrial ? "Held in escrow at the start, released in full when the trial is approved" : "Released at the end of each month"],
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
                {!isTrial && (
                  <PanelCard title="Exclusive benefits" aside={<span className="text-[12px] leading-[1.4] text-ink-2">On top of base salary</span>}>
                    <ul className="flex flex-col gap-3 text-[13px] leading-[1.4]">
                      {FT_BENEFITS.map((b) => (
                        <li key={b} className="flex items-center justify-between gap-4 border-t border-border pt-3 first:border-t-0 first:pt-0">
                          <span className="text-ink">{b}</span>
                          <StatusDot tone="ok">Included</StatusDot>
                        </li>
                      ))}
                    </ul>
                  </PanelCard>
                )}

                {/* IN-032 — every transaction recorded against this contract. */}
                <PanelCard title="Payment history">
                  {payments.length === 0 ? (
                    <p className="text-[13px] leading-[1.4] text-ink-2">No payments recorded on this contract yet. The escrow deposit appears here once {contract.company} funds it.</p>
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

                {/* IN-032 / IN-046 — every dispute filed for this contract lives on this tab, the
                    company's included: date filed, reason and current status, and the detail
                    behind View. */}
                {here.length > 0 ? (
                  <PanelCard title={here.length === 1 ? "Dispute" : "Disputes"} aside={here.length === 1 ? <StatusDot tone={STATUS_TONE[here[0].status]}>{here[0].status}</StatusDot> : undefined}>
                    <DisputeRows disputes={here} side="independent" onView={flow.view} />
                    {block === "filed" && <p className="text-[12.5px] leading-[1.4] text-ink-2">One dispute can be filed per contract, so there is nothing more to raise here.</p>}
                  </PanelCard>
                ) : (
                  <PanelCard title="Something wrong with a payment?">
                    <p className="text-[13px] leading-[1.4] text-ink-2">
                      {!canDispute
                        ? `A dispute can be filed once the trial ends on ${contract.ends}. Until then, raise anything unexpected with ${contract.managerFirst} in Messages.`
                        : block === "settled"
                          ? "Nothing is left in escrow on this contract, so there is no payment left to dispute."
                          : "Hireable support reviews the contract, the approved objectives and the escrow record, and the amount stays in escrow until they rule. You can file one dispute per contract."}
                    </p>
                    <Button size="lg" className="self-start" variant="primary" disabled={!canDispute || !!block} title={fileHint} onClick={() => setFiling(true)}>
                      File a dispute
                    </Button>
                  </PanelCard>
                )}
              </div>
              <aside className="flex w-[360px] shrink-0 flex-col gap-4">
                <TrialFitScore contract={contract} final={!isTrial} />
                <PanelCard title="Escrow &amp; payout">
                  <div className="flex flex-col gap-2">{contractRows}</div>
                </PanelCard>
              </aside>
            </div>
          ) : (
            <>
              {/* IN-076 summary bar: what was committed, what is done, and how long is left. */}
              <div className="flex gap-4">
                {/* IN-038 — a full-time engagement is assigned objectives rather than committing to a locked set. */}
                <Stat label={isTrial ? "Committed objectives" : "Assigned objectives"} value={String(objectives.length)} sub={isTrial ? "Locked at the offer" : `Assigned by ${contract.managerFirst}`} />
                <Stat label="Completed objectives" value={String(completed)} sub={`${objectives.length - completed} still open`} />
                {isTrial ? <Stat label="Days left" value={String(Math.max(0, left ?? 0))} sub={`${contract.started} – ${contract.ends}`} /> : <Stat label={contract.progressLabel} value={`${contract.progress}%`} sub={contract.day} />}
                <Stat label="Updates pending review" value={String(pending)} sub={pending ? `Awaiting ${contract.managerFirst}` : "Nothing waiting"} />
              </div>

              <div className="flex items-start gap-6">
                <section className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={DM}>
                      Objectives
                    </h2>
                    {/* IN-076 locked for the trial; IN-038 a full-time list grows as objectives are assigned. */}
                    <span className="text-[12.5px] leading-[1.4] text-ink-2">
                      {isTrial ? `Locked at the offer — agreed with ${contract.managerFirst}` : `New objectives ${contract.managerFirst} assigns appear here automatically`}
                    </span>
                  </div>
                  {objectives.map((o) => {
                    const st = objectiveStatus(o, left);
                    /** IN-028 — an automatic objective moves on its key results, never by hand. */
                    const krs = o.keyResults ?? [];
                    const next = o.status === "complete" || o.status === "pending" ? "View" : o.kind === "kpi" ? "Update progress" : o.kind === "okr" && krs.length > 0 && !krs.every((k) => k.done) ? "View key results" : "Mark as done";
                    return (
                      <Card key={o.id} className="flex flex-col gap-3 p-4">
                        <Link href={`/independent/contracts/${contract.slug}/objectives/${o.id}`} className="block hover:opacity-80">
                          <ObjectiveRow index={kindIndex(o.kind)}>{o.title}</ObjectiveRow>
                        </Link>
                        {/* Type, progress, status, due date and last update (IN-076). */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] leading-[1.4] text-ink-2">
                          <Chip size="sm">{OBJECTIVE_KIND[o.kind]}</Chip>
                          <Progress value={o.progress} tone={st.bar} label />
                          <StatusDot tone={st.tone}>{st.label}</StatusDot>
                          {o.due && <span>Due {o.due}</span>}
                          {krs.length > 0 && <span>{krs.filter((k) => k.done).length}/{krs.length} key results</span>}
                          {o.target && <span>Target {o.target} {o.unit}</span>}
                          {o.updated && <span>Updated {o.updated}</span>}
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="min-w-0 text-[12.5px] leading-[1.4] text-ink-2">{o.meta}</span>
                          {/* Logging progress lives on the objective's own dashboard — one implementation, not two. */}
                          <LinkButton size="sm" href={`/independent/contracts/${contract.slug}/objectives/${o.id}`}>
                            {next}
                          </LinkButton>
                        </div>
                      </Card>
                    );
                  })}
                  {!isTrial && <p className="text-[13px] leading-[1.4] text-ink-2">Objectives, updates and approvals work exactly like the trial tracker. Only the trial timer and the evaluation gate are gone.</p>}
                </section>

                <aside className="flex w-[360px] shrink-0 flex-col gap-4">
                  {/* IN-076 — the same Trial Fit Score the Team Builder sees, weighted by phase. */}
                  <TrialFitScore contract={contract} final={!isTrial} />
                  <ActivityLog activity={contract.activity} streak={contract.streak} />
                </aside>
              </div>
            </>
          )}
        </>
      )}


      {/* IN-049 — the company behind the contract: logo, name, description, industry, location,
          URL and its work-style badges. Read-only; nothing here is the independent's to change. */}
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
          {!!company?.tags.length && (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] leading-[1.4] font-medium text-ink">Work style</p>
              <div className="flex flex-wrap gap-2">
                {company.tags.map((t) => (
                  <Chip key={t}>{t}</Chip>
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
        description={`Hireable support checks the process on the ${contract.title} contract — the approved objectives, the escrow record and the dates. The amount stays in escrow until they rule, and you can file one dispute per contract.`}
        cap={escrow ? escrow.held : rateAmount(contract.rate)}
        capNote={escrow ? "what is still held in escrow" : `the contract rate, ${contract.rate}`}
        onFile={(draft) => {
          const filed = fileDispute({ ref, filedBy: "independent", ...draft });
          setFiling(false);
          setTab("contract");
          setToast(filed ? `Dispute filed — Hireable support is reviewing it and ${contract.company} has been notified` : "A dispute is already open on this contract");
        }}
      />
      {flow.modals}

      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/**
 * IN-047 — a full-time engagement collects evaluations as it runs, so the tab is the whole run of
 * them, newest first, each with its date, stars and written feedback. Read-only.
 * IN-048 — the trial score that led to the conversion sits beside them and never moves again.
 */
function OngoingEvaluations({ entries, contract }: { entries: DealEvaluation[]; contract: Contract }) {
  return (
    <div className="flex items-start gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-[20px] leading-[1.5] font-semibold text-ink" style={DM}>
            Evaluations from {contract.company}
          </h2>
          <p className="text-[14px] leading-[1.4] text-ink-2">
            {entries.length === 0 ? `${contract.manager} has not submitted one yet.` : `${entries.length} submitted since you went full-time. Each is read-only once sent.`}
          </p>
        </div>
        {entries.length === 0 ? (
          <Card className="p-10 text-center text-[13px] leading-[1.4] text-ink-2">Feedback appears here after each review period.</Card>
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
      </div>
      <aside className="flex w-[360px] shrink-0 flex-col gap-3">
        <TrialFitScore contract={contract} final />
        <p className="text-[12.5px] leading-[1.4] text-ink-2">The final score from your trial — the one this full-time contract came out of. It is read-only and does not move again.</p>
      </aside>
    </div>
  );
}

/**
 * Figma "Contracts / Evaluation received · view" — the evaluation the Team Builder actually sent.
 * It waited for a status the live contract never had, and would then have shown seeded scores.
 */
function Evaluation({ evaluation, company, contract, thread }: { evaluation?: DealEvaluation; company: string; contract: Contract; thread: string }) {
  if (!evaluation) {
    return (
      <Card className="p-10 text-center">
        <p className="text-[16px] leading-[1.5] font-semibold text-ink">{contract.over ? "Waiting on the evaluation" : `Evaluation opens when the trial ends on ${contract.ends}`}</p>
        <p className="mt-2 text-[13px] leading-[1.4] text-ink-2">{company} submits scores after the trial ends. They feed your trial fit score, and you are notified when they are in.</p>
      </Card>
    );
  }
  const scores = evaluation.scores ?? [];
  const average = scores.length ? scores.reduce((n, s) => n + s.value, 0) / scores.length : evaluation.stars;
  return (
    <div className="flex items-start gap-6">
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
            <LinkButton size="lg" href={thread}>
              Message {company}
            </LinkButton>
          </div>
        </Card>
      </div>
      {/* IN-034 — the finalised score, from the contract rather than a second set of numbers that
          disagreed with it. Same widget the Team Builder reads, so both sides see one score. */}
      <aside className="flex w-[360px] shrink-0 flex-col gap-3">
        <TrialFitScore contract={contract} final />
        <p className="text-[12.5px] leading-[1.4] text-ink-2">Locked at phase 4 on {evaluation.date}, after the employer evaluation. It does not move again.</p>
      </aside>
    </div>
  );
}
