"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { Suspense, use, useState } from "react";
import { Button, Chip, JobBadge, ObjectiveRow, Page, StatusDot, Tabs, Textarea, Toast, useToast } from "@/components/independent/ui";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { DefaultTimeline, Discussion, KeyResultPanel, kindIndex, LastUpdate, LiveMetrics, ObjectiveHistory } from "@/components/team/ObjectiveViews";
import { daysLeftLabel } from "@/lib/demo/dates";
import { CONTRACT_NAMES, byName, OBJECTIVE_KIND } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";
import type { Objective, Tone } from "@/lib/team/data";

const KIND = {
  kpi: { title: "Manual Objective Dashboard", about: "Progress is the value logged against the agreed target. Each update comes to you to approve or send back." },
  okr: { title: "Automatic Objective Dashboard", about: "Progress is the share of its key results that are done. It comes to you for approval once the last one is marked done." },
  task: { title: "Default Objective Dashboard", about: "A binary objective: done or not done. It comes to you for approval when it is marked done." },
};

/**
 * TB-079 — the status flow the AC spells out: No Update → Pending Approval → Achieved / Missed.
 * The Team Builder never sets it directly; it moves when the independent submits and when the
 * Team Builder rules on that submission.
 */
const STATUS_FLOW = (o: Objective): { label: string; tone: Tone } => {
  if (o.status === "complete") return { label: "Achieved", tone: "ok" };
  if (o.status === "pending") return { label: "Pending approval", tone: "warn" };
  if (o.status === "revision") return { label: "Revision requested", tone: "danger" };
  if (o.status === "risk") return { label: o.kind === "task" ? "Missed" : "At risk", tone: "danger" };
  return o.progress === 0 ? { label: "No update", tone: "neutral" } : { label: "On track", tone: "ok" };
};

/** Figma "Independents / KPI Dashboard · OKR Dashboard · Task Dashboard · shared" — the employer reviews from the same layout. */
export default function ObjectiveDashboardPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  return (
    <Suspense>
      <SharedObjectiveDashboard params={params} />
    </Suspense>
  );
}

function SharedObjectiveDashboard({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);
  const { contracts, reviewObjective, commentOnObjective } = useDemo();
  const router = useRouter();
  const [toast, setToast] = useToast();
  /** TB-115 — a reject or a revision needs a reason typed in before it can be sent. */
  const [verdict, setVerdict] = useState<"revise" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const contract = contracts.find((c) => c.slug === slug);
  const objective = contract?.objectives.find((o) => o.id === id);
  if (!contract || !objective) notFound();
  const k = KIND[objective.kind];
  const name = CONTRACT_NAMES[contract.slug] ?? byName(contract.independent).name;
  const first = name.split(" ")[0];
  const pending = objective.status === "pending";
  const status = STATUS_FLOW(objective);
  const objHref = `/team/independents/${contract.slug}`;

  /**
   * TB-114 / TB-115 — the verdict is written to the contract, so it survives a reload and the
   * tracker agrees with this page; the talent is told, on their own contract page.
   */
  const decide = (v: "approve" | "revise" | "reject") => {
    if (v !== "approve" && !reason.trim()) return;
    reviewObjective(contract.slug, objective.id, v, reason);
    setVerdict(null);
    setReason("");
    setToast(v === "approve" ? "Objective approved" : v === "revise" ? `Revision requested from ${first}` : `Sent back to ${first}`);
  };

  return (
    <Page
      title={
        <>
          {k.title} <JobBadge type={contract.type} />
        </>
      }
      tabs={
        // The evaluation lives on the contract; this tab goes there rather than to an empty view.
        <Tabs
          className="px-4"
          value="dashboard"
          onChange={(v) => v === "evaluation" && router.push(`${objHref}?tab=evaluation`)}
          options={[
            { value: "dashboard", label: "Dashboard" },
            { value: "evaluation", label: "Evaluation" },
          ]}
        />
      }
      nav={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/team/independents" />}>All independents</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={objHref} />}>{name}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>{contract.type === "trial" ? "Trial tracker" : "Objectives"}</BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{k.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
    >
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-lg bg-white p-6 outline -outline-offset-1 outline-[#e3e3e3]">
          <ObjectiveRow index={kindIndex(objective.kind)}>{objective.title}</ObjectiveRow>
          {/* TB-079 — type, status, countdown and both dates sit on the objective itself. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] leading-[1.4] text-ink-2">
            <StatusDot tone={status.tone}>{status.label}</StatusDot>
            <Chip size="sm">{OBJECTIVE_KIND[objective.kind]}</Chip>
            {contract.left !== null && <span>{daysLeftLabel(contract.left, "remaining")} ·</span>}
            <span>
              {contract.started} – {objective.due ?? contract.ends}
            </span>
          </div>
          {objective.description && <p className="text-[14px] leading-[1.4] text-ink">{objective.description}</p>}
          <p className="text-[14px] leading-[1.4] text-ink-2">{k.about}</p>

          {/* Each objective type earns a different dashboard (TB-061 / TB-062 / TB-063). */}
          {objective.kind === "kpi" && <LiveMetrics current={objective.current} target={objective.target} unit={objective.unit} progress={objective.progress} trend={objective.trend} />}
          {objective.kind === "okr" &&
            (objective.keyResults?.length ? (
              <KeyResultPanel keyResults={objective.keyResults} />
            ) : (
              <p className="rounded-lg bg-surface-2 px-4 py-3 text-[13px] leading-[1.4] text-ink-2">No key results were agreed for this objective — {first} marks it done when it is achieved.</p>
            ))}
          {objective.kind === "task" && <DefaultTimeline started={contract.started} due={objective.due ?? contract.ends} daysLeft={contract.left} />}

          <LastUpdate title={`Update from ${first}`} update={objective.lastUpdate} />
          <ObjectiveHistory activity={objective.activity} />

          {/* TB-114 — a verdict is only offered while the submission is actually Pending Approval. */}
          {!pending ? (
            <p className="rounded-lg bg-surface-2 px-4 py-3 text-[13px] leading-[1.4] text-ink-2">
              {objective.status === "complete" ? "Achieved — you approved it." : `Nothing to rule on yet — ${first} has to submit it before you can approve it or send it back.`}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {verdict && (
                <div className="flex flex-col gap-2 rounded-lg bg-surface-2 p-4">
                  <label htmlFor="obj-reason" className="text-[13px] leading-[1.4] font-medium text-ink">
                    {verdict === "revise" ? "What should change before you approve?" : "Why are you rejecting this?"} {first} sees this reason.
                  </label>
                  <Textarea id="obj-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Be specific — this is the whole brief for the resubmission." />
                </div>
              )}
              <div className="flex justify-end gap-3">
                {verdict ? (
                  <>
                    <Button size="lg" onClick={() => { setVerdict(null); setReason(""); }}>
                      Cancel
                    </Button>
                    <Button size="lg" variant="primary" disabled={!reason.trim()} onClick={() => decide(verdict)}>
                      Send {verdict === "revise" ? "revision request" : "rejection"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="lg" onClick={() => setVerdict("reject")}>
                      Reject
                    </Button>
                    <Button size="lg" onClick={() => setVerdict("revise")}>
                      Request revision
                    </Button>
                    <Button size="lg" variant="primary" onClick={() => decide("approve")}>
                      Approve
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <Discussion comments={objective.comments} onSend={(text) => commentOnObjective(contract.slug, objective.id, text)} />
      </div>
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
