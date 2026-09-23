"use client";

import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { Suspense, use, useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, Chip, JobBadge, ObjectiveRow, Page, Progress, StatusDot, Tabs, Textarea, Toast, useToast } from "@/components/independent/ui";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { AutomaticBreakdown, DefaultTimeline, ManualMetrics, TaskList } from "@/components/team/ObjectiveViews";
import { move, PAIR } from "@/lib/demo/live";
import { CONTRACT_NAMES, byName, KEY_RESULTS, krValue, OBJECTIVE_KIND } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";
import type { Objective, Tone } from "@/lib/team/data";

const Attach = ICONS.attach;

const KIND = {
  kpi: { title: "Manual Objective Dashboard", label: OBJECTIVE_KIND.kpi, cadence: "Daily · due 30 Sep 2026", target: "Target 12 calls this week · 9 logged so far", about: "Owns outbound for the US mid-market segment. A call counts once it is logged in HubSpot with an outcome. Target is 12 per week, logged daily.", update: { date: "11 Sep 2026", text: "Logged 3 calls today — 9 this week. The afternoon calling block is landing better with the US west coast; two more are booked for Thursday.", file: "call-log-week-3.csv", progress: ["Progress reported:", "72%"] }, history: [{ date: "11 Sep 2026", text: "+3 calls logged — 9 of 12 this week", status: { label: "Pending your review", tone: "warn" as const } }, { date: "10 Sep 2026", text: "+4 calls logged", status: { label: "Approved", tone: "ok" as const } }, { date: "09 Sep 2026", text: "+2 calls logged — flagged off track", status: { label: "Off track", tone: "danger" as const } }], progress: 72 },
  okr: { title: "Automatic Objective Dashboard", label: OBJECTIVE_KIND.okr, cadence: "Due 30 Sep 2026", target: "2 of 3 key results complete · progress is completed KRs ÷ total", about: "Owns the Q4 pipeline build. This objective completes when all three key results are approved — progress moves only when a key result is marked done and approved.", update: { date: "10 Sep 2026", text: "Pipeline doc is in the shared drive and handed to the sales lead — marked that key result done. Eight opportunities qualified last week; the call target is the last one open.", file: "q4-pipeline-handover.pdf", progress: ["Progress reported:", "33% — 1 of 3 key results approved"] }, history: [{ date: "10 Sep 2026", text: "Key result “Hand over pipeline doc” marked done", status: { label: "Pending your review", tone: "warn" as const } }, { date: "04 Sep 2026", text: "Key result “Qualify 8 opportunities” approved", status: { label: "Approved", tone: "ok" as const } }, { date: "25 Aug 2026", text: "Objective and three key results agreed at offer", status: { label: "Started", tone: "ok" as const } }], progress: 67 },
  task: { title: "Default Objective Dashboard", label: OBJECTIVE_KIND.task, cadence: "Due 30 Sep 2026", target: "", about: "Owns the CRM setup for Q4 outreach. Done means the board is live in HubSpot with the six agreed stages, all 41 target accounts imported, and an owner on every account. A task is binary and needs your approval to count.", update: { date: "10 Sep 2026", text: "Board is live in HubSpot with the 6 stages we agreed, 41 accounts imported and owners assigned. Screenshots and the import log are attached.", file: "crm-board.png · import-log.csv", progress: ["Marked as done ·", "awaiting your approval"] }, history: [{ date: "10 Sep 2026", text: "Marked as done — board live, 41 accounts imported", status: { label: "Pending your review", tone: "warn" as const } }, { date: "02 Sep 2026", text: "Stage naming agreed", status: { label: "Approved", tone: "ok" as const } }, { date: "25 Aug 2026", text: "Task started", status: { label: "Started", tone: "ok" as const } }], progress: 100 },
};

/**
 * TB-079 — the status flow the AC spells out: No Update → Pending Approval → Achieved / Missed.
 * The Team Builder never sets it directly; it moves when the independent submits and when the
 * Team Builder rules on that submission.
 */
const STATUS_FLOW = (o: Objective): { label: string; tone: Tone } => {
  if (o.status === "complete") return { label: "Achieved", tone: "ok" };
  if (o.status === "pending") return { label: "Pending approval", tone: "warn" };
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
  const { contracts, setObjectives } = useDemo();
  const contract = contracts.find((c) => c.slug === slug);
  const objective = contract?.objectives.find((o) => o.id === id);
  if (!contract || !objective) notFound();
  const k = KIND[objective.kind];
  const name = CONTRACT_NAMES[contract.slug] ?? byName(contract.independent).name;
  const first = name.split(" ")[0];
  const [comments, setComments] = useState([
    { who: "Alex Rivera", when: "2 days ago", text: "Nice jump on Wednesday — what changed?" },
    { who: name, when: "2 days ago", text: "Switched to the afternoon calling block, PHT. Better pickup from the US west coast." },
  ]);
  const [draft, setDraft] = useState("");
  const [decided, setDecided] = useState<string | null>(null);
  const [toast, setToast] = useToast();
  const [tab, setTab] = useState<"dashboard" | "evaluation">("dashboard");
  /** TB-115 — a reject or a revision needs a reason typed in before it can be sent. */
  const [verdict, setVerdict] = useState<"revise" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const pending = objective.status === "pending";
  const status = STATUS_FLOW(objective);

  /**
   * TB-064 / TB-065 — a key result and its tasks are the same dashboard one level down, so they
   * ride on query params rather than two more route files. `?kr=` opens the key result,
   * `?kr=&tasks=1` opens its task list.
   */
  const search = useSearchParams();
  const router = useRouter();
  const kr = KEY_RESULTS.find((k) => k.id === search.get("kr"));
  const showTasks = !!kr?.tasks && search.get("tasks") === "1";
  const objHref = `/team/independents/${contract.slug}/objectives/${objective.id}`;
  /** "Day 18 of 30" on the contract is the only countdown we have. */
  const dayMatch = contract.day.match(/Day (\d+) of (\d+)/);
  const daysLeft = dayMatch ? Number(dayMatch[2]) - Number(dayMatch[1]) : null;

  /**
   * TB-114 / TB-115 — the verdict is written to the contract, so it survives a reload and the
   * tracker agrees with this page. Approving retires the objective; anything else needs a reason
   * and sends it back to the independent with that reason attached.
   */
  const decide = (v: "approve" | "revise" | "reject") => {
    if (v !== "approve" && !reason.trim()) return;
    setObjectives(contract.slug, (os) =>
      os.map((o) =>
        o.id === objective.id
          ? {
              ...o,
              status: v === "approve" ? "complete" : v === "revise" ? "risk" : "on",
              progress: v === "approve" ? 100 : o.progress,
              retired: v === "approve" ? true : o.retired,
              meta: v === "approve" ? "Achieved · approved today" : v === "revise" ? `Revision requested · ${reason.trim()}` : `Sent back · ${reason.trim()}`,
            }
          : o,
      ),
    );
    if (contract.independent === PAIR.independent.slug) move(v === "approve" ? "objective_approved" : v === "revise" ? "objective_revision" : "objective_rejected", { slug: contract.slug, title: contract.role });
    setDecided(v === "approve" ? "Approved" : v === "revise" ? "Revision requested" : "Rejected");
    setVerdict(null);
    setReason("");
    setToast(v === "approve" ? "Objective approved" : v === "revise" ? `Revision requested from ${first}` : `Sent back to ${first}`);
  };

  /** TB-112 — the same discussion panel serves the objective and the key result below it. */
  const discussion = (
    <div className="flex w-[340px] shrink-0 flex-col gap-3 self-start rounded-lg bg-white p-5 outline -outline-offset-1 outline-[#e3e3e3]">
      <p className="text-[14px] leading-[1.45] font-semibold text-ink">Discussion</p>
      {comments.map((c, i) => (
        <div key={i} className="flex flex-col gap-[3px] leading-[1.45]">
          <p className="flex items-start gap-2">
            <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-ink">{c.who}</span>
            <span className="text-[11px] whitespace-nowrap text-ink-2">{c.when}</span>
          </p>
          <p className="text-[12.5px] text-ink-2">{c.text}</p>
        </div>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          setComments((c) => [...c, { who: "Alex Rivera", when: "Just now", text: draft.trim() }]);
          setDraft("");
        }}
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a comment…" className="h-11 w-full rounded-lg border border-border px-4 text-[14px] leading-[1.2] tracking-[0.2px] outline-none placeholder:text-ink-2 focus:border-primary" />
      </form>
    </div>
  );

  if (kr)
    return (
      <Page
        title={
          <>
            {showTasks ? "Task Dashboard" : "Key Result Dashboard"} <JobBadge type={contract.type} />
          </>
        }
        nav={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/team/independents" />}>All independents</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href={`/team/independents/${contract.slug}`} />}>{name}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href={objHref} />}>{k.title}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              {showTasks ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink render={<Link href={`${objHref}?kr=${kr.id}`} />}>Key result</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Tasks</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbPage>Key result</BreadcrumbPage>
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        }
      >
        <div className="flex items-start gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-4"><div className="flex flex-col gap-3 rounded-lg bg-white p-6 outline -outline-offset-1 outline-[#e3e3e3]">
            <h2 className="text-[18px] leading-[1.4] font-semibold text-ink">{kr.title}</h2>
            <div className="flex flex-wrap items-center gap-2 text-[13px] leading-[1.4] text-ink-2">
              <Chip size="sm">{OBJECTIVE_KIND[kr.kind === "manual" ? "kpi" : kr.kind === "automatic" ? "okr" : "task"]}</Chip>
              <StatusDot tone={kr.status.tone}>{kr.status.label}</StatusDot>
              {daysLeft !== null && <span>{daysLeft} days remaining</span>}
              <span>
                {kr.started} – {kr.due}
              </span>
            </div>
            {/* Progress is shown the way its own type earns it (TB-064). */}
            <div className="flex items-center gap-2">
              <Progress value={krValue(kr)} label className="w-full" />
            </div>
            {kr.tasks && !showTasks && (
              <Button size="md" className="self-start" onClick={() => router.push(`${objHref}?kr=${kr.id}&tasks=1`)}>
                View {kr.tasks.length} connected tasks
              </Button>
            )}
          </div>
          {showTasks && kr.tasks && <TaskList tasks={kr.tasks} />}

          {/* TB-112 — every status change on this key result, newest first, with its timestamp. */}
          <div className="flex flex-col gap-2 rounded-lg bg-white p-6 outline -outline-offset-1 outline-[#e3e3e3]">
            <p className="text-[14px] leading-[1.45] font-semibold text-ink">Recent activity</p>
            {kr.activity.map((a) => (
              <div key={a.at} className="flex flex-col gap-0.5 border-b border-border py-2 last:border-b-0 last:pb-0">
                <span className="text-[13px] leading-[1.4] text-ink">{a.text}</span>
                <span className="text-[11.5px] leading-[1.3] text-ink-2">{a.at}</span>
              </div>
            ))}
          </div>
          </div>
          {discussion}
        </div>
        <Toast message={toast} onClose={() => setToast(null)} />
      </Page>
    );

  return (
    <Page
     
      title={
        <>
          {k.title} <JobBadge type={contract.type} />
        </>
      }
      tabs={
        <Tabs
          className="px-4"
          value={tab}
          onChange={setTab}
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
              <BreadcrumbLink render={<Link href={`/team/independents/${contract.slug}`} />}>{name}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>Trial tracker</BreadcrumbItem>
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
          <ObjectiveRow index={objective.kind === "kpi" ? 1 : objective.kind === "okr" ? 2 : 0}>{objective.title}</ObjectiveRow>
          {/* TB-079 — type, status, countdown and both dates sit on the objective itself. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] leading-[1.4] text-ink-2">
            <StatusDot tone={status.tone}>{status.label}</StatusDot>
            <Chip size="sm">{k.label}</Chip>
            {daysLeft !== null && <span>{daysLeft} days remaining ·</span>}
            <span>
              {contract.started} – {objective.due ?? contract.ends}
            </span>
          </div>
          <p className="text-[14px] leading-[1.4] text-ink-2">
            {first} {k.about.charAt(0).toLowerCase() + k.about.slice(1)}
          </p>

          {/* Each objective type earns a different dashboard (TB-061 / TB-062 / TB-063). */}
          {objective.kind === "kpi" && <ManualMetrics />}
          {objective.kind === "okr" && <AutomaticBreakdown krs={KEY_RESULTS} href={(x) => `${objHref}?kr=${x.id}`} />}
          {objective.kind === "task" && <DefaultTimeline started={contract.started} due={objective.due ?? contract.ends} daysLeft={daysLeft} />}
          <div className="flex flex-col gap-2.5 rounded-lg bg-[#fafafa] p-4 leading-[1.4] outline -outline-offset-1 outline-border">
            <div className="flex items-center justify-between whitespace-nowrap">
              <span className="text-[14px] font-medium text-ink">Update from {first}</span>
              <span className="text-[13px] text-ink-2">{k.update.date}</span>
            </div>
            <p className="text-[14px] text-ink">{k.update.text}</p>
            <p className="flex items-center gap-1.5 text-[13px] text-primary">
              <Attach size={18} aria-hidden /> {k.update.file}
            </p>
            <p className="flex gap-2 text-[13px] whitespace-nowrap">
              <span className="text-ink-2">{k.update.progress[0]}</span>
              <span className="font-medium text-ink">{k.update.progress[1]}</span>
            </p>
          </div>
          <div className="flex flex-col">
            <p className="text-[14px] leading-[1.4] font-medium text-ink">Update history</p>
            {k.history.map((h, i) => (
              <div key={h.date + h.text} className="flex items-center gap-3 border-b border-border py-2.5">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-[13px] leading-[1.4] whitespace-nowrap">
                  <span className="font-medium text-ink">{h.date}</span>
                  <span className="text-ink-2">{h.text}</span>
                </span>
                <StatusDot tone={i === 0 && decided ? (decided === "Approved" ? "ok" : "danger") : h.status.tone}>{i === 0 && decided ? decided : h.status.label}</StatusDot>
              </div>
            ))}
          </div>
          {/* TB-114 — a verdict is only offered while the submission is actually Pending Approval. */}
          {!pending && !decided ? (
            <p className="rounded-lg bg-surface-2 px-4 py-3 text-[13px] leading-[1.4] text-ink-2">
              Nothing to rule on yet — {first} has to mark this as done before you can approve or send it back.
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
                    <Button size="lg" disabled={!!decided} onClick={() => setVerdict("reject")}>
                      Reject
                    </Button>
                    <Button size="lg" disabled={!!decided} onClick={() => setVerdict("revise")}>
                      Request revision
                    </Button>
                    <Button size="lg" variant="primary" disabled={!!decided} onClick={() => decide("approve")}>
                      Approve
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {discussion}
      </div>
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
