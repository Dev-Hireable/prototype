"use client";

import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { Suspense, use, useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, Chip, Field, Input, JobBadge, Modal, ObjectiveRow, Page, Progress, StatusDot, Textarea, Toast, useToast } from "@/components/independent/ui";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { AutomaticBreakdown, DefaultTimeline, ManualMetrics, TaskList } from "@/components/team/ObjectiveViews";
import { move, PAIR } from "@/lib/demo/live";
import { daysLeft, ME, objectiveStatus } from "@/lib/independent/data";
import { useDemo } from "@/lib/independent/store";
import { krProgress, krValue, MANUAL_METRIC, OBJECTIVE_KIND } from "@/lib/team/data";

const Attach = ICONS.attach;

/** IN-041 — every recorded submission carries the time it happened, in the same shape as the seeds. */
const stamp = () => {
  const now = new Date();
  return `${now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}, ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} PHT`;
};

/**
 * IN-026 / IN-028 / IN-077 — one dashboard per objective type. The panels themselves are the
 * same components the Team Builder reviews from, so the two sides of a trial cannot drift; only
 * the actions differ, because logging progress is the independent's job and ruling on it is theirs.
 */
const KIND = {
  kpi: {
    title: "Manual Objective Dashboard",
    label: OBJECTIVE_KIND.kpi,
    cadence: "Daily updates",
    about: "Progress is the value you log against the target. Update it at the agreed cadence — your Team Builder reviews each update and can approve it or ask for a revision.",
    update: { date: "11 Sep 2026", text: "Logged this week’s numbers and attached the working file. The afternoon block is landing better with the US west coast, so the pace should hold.", file: "weekly-log.csv", progress: ["Progress reported:", "72%"] },
    activity: [
      { at: "11 Sep 2026, 4:20 PM PHT", text: "Progress update sent for review", status: { label: "Pending approval", tone: "warn" as const } },
      { at: "10 Sep 2026, 5:40 PM PHT", text: "Progress update approved", status: { label: "Approved", tone: "ok" as const } },
      { at: "09 Sep 2026, 5:05 PM PHT", text: "Flagged off track — behind the agreed pace", status: { label: "Off track", tone: "danger" as const } },
    ],
  },
  okr: {
    title: "Automatic Objective Dashboard",
    label: OBJECTIVE_KIND.okr,
    cadence: "Driven by key results",
    about: "Progress here is the share of connected key results that are done. It moves when a key result is completed and approved, so there is nothing to log by hand.",
    update: { date: "10 Sep 2026", text: "Marked the hand-over key result done and attached the file. One key result is still open.", file: "handover.pdf", progress: ["Progress reported:", "33% — 1 of 3 key results approved"] },
    activity: [
      { at: "11 Sep 2026, 9:20 AM PHT", text: "Key result “Hand over pipeline doc” approved", status: { label: "Approved", tone: "ok" as const } },
      { at: "10 Sep 2026, 9:15 AM PHT", text: "Key result “Hand over pipeline doc” marked done", status: { label: "Pending approval", tone: "warn" as const } },
      { at: "25 Aug 2026, 9:00 AM PHT", text: "Objective and three key results agreed at offer", status: { label: "Started", tone: "ok" as const } },
    ],
  },
  task: {
    title: "Default Objective Dashboard",
    label: OBJECTIVE_KIND.task,
    cadence: "Binary — done or not done",
    about: "A binary objective: done or not done. Mark it as done when the work is delivered — it sits at Pending approval until your Team Builder confirms it.",
    update: { date: "10 Sep 2026", text: "Delivered and attached the evidence — screenshots and the log are in the file.", file: "evidence.png · log.csv", progress: ["Marked as done ·", "awaiting approval"] },
    activity: [
      { at: "10 Sep 2026, 11:05 AM PHT", text: "Marked as done and sent for approval", status: { label: "Pending approval", tone: "warn" as const } },
      { at: "02 Sep 2026, 2:00 PM PHT", text: "Scope confirmed with your Team Builder", status: { label: "Approved", tone: "ok" as const } },
      { at: "25 Aug 2026, 9:00 AM PHT", text: "Objective started", status: { label: "Started", tone: "ok" as const } },
    ],
  },
};

export default function ObjectiveDashboardPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  return (
    <Suspense>
      <ObjectiveDashboard params={params} />
    </Suspense>
  );
}

/** Figma "Contracts / KPI Dashboard · OKR Dashboard · Task Dashboard · talent view": objective card (p 24, gap 16) + 340px Discussion. */
function ObjectiveDashboard({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);
  const { contracts, setObjectives, keyResults, markTask } = useDemo();
  const contract = contracts.find((c) => c.slug === slug);
  const objective = contract?.objectives.find((o) => o.id === id);
  if (!contract || !objective) notFound();
  const k = KIND[objective.kind];
  const first = contract.managerFirst;
  const [comments, setComments] = useState([
    { who: contract.manager, when: "2 days ago", text: "Good jump this week — what changed?" },
    { who: ME.name, when: "2 days ago", text: "Moved my working block later in the day, so there is more overlap with your team." },
    { who: contract.manager, when: "Yesterday", text: "Keep that going for the rest of the trial." },
  ]);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useToast();
  const [updating, setUpdating] = useState(false);
  const [marking, setMarking] = useState(false);
  /** IN-045 — a task is marked done through the same confirmation prompt an objective gets. */
  const [confirmTask, setConfirmTask] = useState<string | null>(null);
  const [value, setValue] = useState(String(objective.current ?? ""));
  const [note, setNote] = useState("");
  const left = daysLeft(contract.day);
  /** A full-time contract counts down its review period, not a trial. */
  const leftLabel = contract.type === "trial" ? "days left in the trial" : "days left this quarter";
  const status = objectiveStatus(objective, left);
  /** IN-077 — a Default objective is read-only once it is Pending Approval; only a verdict moves it on. */
  const locked = objective.status === "complete" || (objective.kind === "task" && objective.status === "pending");

  /**
   * IN-029 — a key result and its tasks are the same dashboard one level down, so they ride on
   * query params rather than two more route files. `?kr=` opens the key result, `&tasks=1` its tasks.
   */
  const search = useSearchParams();
  const router = useRouter();
  const kr = keyResults.find((x) => x.id === search.get("kr"));
  const showTasks = !!kr?.tasks && search.get("tasks") === "1";
  const objHref = `/independent/contracts/${contract.slug}/objectives/${objective.id}`;
  const krNow = krProgress(keyResults);
  /** IN-040 / IN-041 — this objective’s own numbers drive the metric panels, not one fixed demo metric. */
  const metric = {
    ...MANUAL_METRIC,
    current: objective.current ?? MANUAL_METRIC.current,
    target: objective.target ?? MANUAL_METRIC.target,
    dailyTarget: objective.dailyTarget ?? MANUAL_METRIC.dailyTarget,
    unit: objective.unit ?? MANUAL_METRIC.unit,
    trend: objective.trend ?? MANUAL_METRIC.trend,
  };

  const notifyTeam = (kind: "objective_update" | "objective_done") => {
    if (contract.manager === PAIR.team.name) move(kind, { slug: contract.slug, title: contract.title });
  };

  /**
   * IN-030 / IN-044 — ticking a task moves the key result, and the key result moves the objective,
   * so the objective's own progress is rewritten from the key results rather than left where it was.
   */
  const completeTask = (taskId: string) => {
    if (!kr) return;
    markTask(kr.id, taskId);
    const next = keyResults.map((x) => (x.id === kr.id && x.tasks ? { ...x, tasks: x.tasks.map((t) => (t.id === taskId ? { ...t, done: true } : t)) } : x));
    const { done, total, percent } = krProgress(next);
    const title = kr.tasks?.find((t) => t.id === taskId)?.title ?? "Task";
    setObjectives(contract.slug, (os) =>
      os.map((o) =>
        o.id === objective.id
          ? { ...o, progress: percent, meta: `${done} of ${total} key results approved`, updated: "Today", activity: [{ at: stamp(), text: `Task “${title}” marked done — key result at ${krValue({ ...kr, tasks: next.find((x) => x.id === kr.id)?.tasks })}%` }, ...(o.activity ?? [])] }
          : o,
      ),
    );
    setConfirmTask(null);
    setToast("Task marked done — key result and objective updated");
  };

  /**
   * IN-026 / IN-041 / IN-045 / IN-077 — a submission is written to the contract, so the tracker,
   * the trend chart and a reload all agree, and it lands in Recent activity with a timestamp.
   */
  const submit = (done: boolean) => {
    const percent = done ? 100 : objective.target ? Math.min(100, Math.round((Number(value) / objective.target) * 100)) : objective.progress;
    setObjectives(contract.slug, (os) =>
      os.map((o) =>
        o.id === objective.id
          ? {
              ...o,
              status: "pending",
              progress: percent,
              current: done ? o.current : Number(value),
              meta: done ? "Marked as done · awaiting approval" : `${value} of ${o.target ?? ""} · sent for review`,
              updated: "Today",
              trend: done ? o.trend : [...(o.trend ?? []), percent],
              activity: [{ at: stamp(), text: done ? "Marked as done and sent for approval" : `Logged ${value}${o.unit ? ` ${o.unit}` : ""} — ${percent}%, sent for review` }, ...(o.activity ?? [])],
            }
          : o,
      ),
    );
    notifyTeam(done ? "objective_done" : "objective_update");
    setUpdating(false);
    setMarking(false);
    setToast(done ? `Sent to ${first} for approval` : `Update sent to ${first} for review`);
  };

  /** IN-026 / IN-028 / IN-029 / IN-077 — the same discussion panel serves the objective and its key results. */
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
          setComments((c) => [...c, { who: ME.name, when: "Just now", text: draft.trim() }]);
          setDraft("");
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment…"
          className="h-11 w-full rounded-lg border border-border px-4 text-[14px] leading-[1.2] tracking-[0.2px] outline-none placeholder:text-ink-2 focus:border-primary"
        />
      </form>
    </div>
  );

  const recentActivity = (items: { at: string; text: string; status?: { label: string; tone: "ok" | "warn" | "danger" } }[]) => (
    <div className="flex flex-col gap-2 rounded-lg bg-white p-6 outline -outline-offset-1 outline-[#e3e3e3]">
      <p className="text-[14px] leading-[1.45] font-semibold text-ink">Recent activity</p>
      {items.map((a) => (
        <div key={a.at} className="flex items-center gap-3 border-b border-border py-2 last:border-b-0 last:pb-0">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[13px] leading-[1.4] text-ink">{a.text}</span>
            <span className="text-[11.5px] leading-[1.3] text-ink-2">{a.at}</span>
          </span>
          {a.status && <StatusDot tone={a.status.tone}>{a.status.label}</StatusDot>}
        </div>
      ))}
    </div>
  );

  // IN-029 — the key result dashboard: its own type, progress, dates, tasks, discussion and activity.
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
                <BreadcrumbLink render={<Link href="/independent/contracts" />}>All contracts</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href={`/independent/contracts/${contract.slug}`} />}>{contract.title}</BreadcrumbLink>
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
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-lg bg-white p-6 outline -outline-offset-1 outline-[#e3e3e3]">
              <h2 className="text-[18px] leading-[1.4] font-semibold text-ink">{kr.title}</h2>
              <div className="flex flex-wrap items-center gap-2 text-[13px] leading-[1.4] text-ink-2">
                <Chip size="sm">{OBJECTIVE_KIND[kr.kind === "manual" ? "kpi" : kr.kind === "automatic" ? "okr" : "task"]}</Chip>
                <StatusDot tone={kr.status.tone}>{kr.status.label}</StatusDot>
                {left !== null && <span>{Math.max(0, left)} {leftLabel}</span>}
                <span>
                  {kr.started} – {kr.due}
                </span>
              </div>
              <Progress value={krValue(kr)} label className="w-full" />
              {kr.tasks && !showTasks && (
                <Button size="md" className="self-start" onClick={() => router.push(`${objHref}?kr=${kr.id}&tasks=1`)}>
                  View {kr.tasks.length} connected tasks
                </Button>
              )}
            </div>
            {showTasks && kr.tasks && <TaskList tasks={kr.tasks} onDone={setConfirmTask} />}
            {recentActivity(kr.activity)}
          </div>
          {discussion}
        </div>

        {/* IN-045 — a task gets a confirmation prompt too, and cannot be undone once sent. */}
        <Modal
          open={!!confirmTask}
          onClose={() => setConfirmTask(null)}
          title={`Mark “${kr.tasks?.find((t) => t.id === confirmTask)?.title ?? ""}” as done?`}
          description={`This moves ${kr.title} forward straight away, and the objective above it. You cannot undo it — ${first} decides what happens next.`}
          footer={
            <>
              <Button size="lg" onClick={() => setConfirmTask(null)}>
                Cancel
              </Button>
              <Button size="lg" variant="primary" onClick={() => confirmTask && completeTask(confirmTask)}>
                Mark as done
              </Button>
            </>
          }
        />
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
      nav={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/independent/contracts" />}>All contracts</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={`/independent/contracts/${contract.slug}`} />}>{contract.title}</BreadcrumbLink>
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
          {/* Type, status, countdown and both dates sit on the objective itself. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] leading-[1.4] text-ink-2">
            <StatusDot tone={status.tone}>{status.label}</StatusDot>
            <Chip size="sm">{k.label}</Chip>
            <span>{k.cadence} ·</span>
            {left !== null && <span>{Math.max(0, left)} {leftLabel} ·</span>}
            <span>
              {contract.started} – {objective.due ?? contract.ends}
            </span>
          </div>
          <p className="text-[14px] leading-[1.4] text-ink-2">{k.about}</p>

          {/* Each objective type earns its own dashboard (IN-026 / IN-028 / IN-077). */}
          {objective.kind === "kpi" && <ManualMetrics metric={metric} />}
          {objective.kind === "okr" && <AutomaticBreakdown krs={keyResults} href={(x) => `${objHref}?kr=${x.id}`} />}
          {objective.kind === "task" && <DefaultTimeline started={contract.started} due={objective.due ?? contract.ends} daysLeft={left === null ? null : Math.max(0, left)} />}

          {/* Figma "Latest update": #fafafa, p 16, gap 10 */}
          <div className="flex flex-col gap-2.5 rounded-lg bg-[#fafafa] p-4 leading-[1.4] outline -outline-offset-1 outline-border">
            <div className="flex items-center justify-between whitespace-nowrap">
              <span className="text-[14px] font-medium text-ink">Your last update</span>
              <span className="text-[13px] text-ink-2">{k.update.date}</span>
            </div>
            <p className="text-[14px] text-ink">{k.update.text}</p>
            <p className="flex items-center gap-1.5 text-[13px] text-primary">
              <Attach size={18} aria-hidden /> {k.update.file}
            </p>
            {/* An automatic objective states where its key results actually stand, not a copy of where they stood. */}
            <p className="flex gap-2 text-[13px] whitespace-nowrap">
              <span className="text-ink-2">{k.update.progress[0]}</span>
              <span className="font-medium text-ink">{objective.kind === "okr" ? `${krNow.percent}% — ${krNow.done} of ${krNow.total} key results approved` : k.update.progress[1]}</span>
            </p>
          </div>

          {/* IN-041 — what this contract actually recorded comes first; the seeded history sits under it. */}
          {recentActivity([...(objective.activity ?? []), ...k.activity])}

          {/* IN-028 — an automatic objective has no button: its progress is its key results. */}
          {objective.kind === "okr" ? (
            <p className="rounded-lg bg-surface-2 px-4 py-3 text-[13px] leading-[1.4] text-ink-2">Progress here is driven by key result completion only — mark a key result done to move it.</p>
          ) : locked ? (
            <p className="rounded-lg bg-surface-2 px-4 py-3 text-[13px] leading-[1.4] text-ink-2">
              {objective.status === "complete" ? `Achieved — approved by ${first}.` : `Sent to ${first} and waiting on their approval. It is read-only until they approve it or ask for a revision.`}
            </p>
          ) : (
            <div className="flex justify-end">
              {objective.kind === "task" ? (
                <Button size="lg" variant="primary" onClick={() => setMarking(true)}>
                  Mark as done
                </Button>
              ) : (
                <Button size="lg" variant="primary" onClick={() => setUpdating(true)}>
                  Update progress
                </Button>
              )}
            </div>
          )}
        </div>

        {discussion}
      </div>

      <Modal
        open={updating}
        onClose={() => setUpdating(false)}
        title={`Update progress: ${objective.title}`}
        description={`Tell ${first} what changed. They review the update and can approve it or ask for a revision.`}
        footer={
          <>
            <Button size="lg" onClick={() => setUpdating(false)}>
              Cancel
            </Button>
            {/* IN-041 — an empty or non-numeric submission is not allowed. */}
            <Button size="lg" variant="primary" disabled={!Number.isFinite(Number(value)) || value.trim() === ""} onClick={() => submit(false)}>
              Send update
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {/* IN-041 — the modal states the type, the daily target and where the value stands today. */}
          <div className="flex flex-wrap items-center gap-2 text-[13px] leading-[1.4] text-ink-2">
            <Chip size="sm">{k.label}</Chip>
            <span>
              Daily target {metric.dailyTarget} {metric.dailyTarget === 1 ? metric.unit.replace(/s$/, "") : metric.unit}
            </span>
            <span>·</span>
            <span>
              Current value <span className="font-medium text-ink">{objective.current ?? 0}</span> of {objective.target ?? metric.target}
            </span>
          </div>
          <Field label="New value" hint={`Target: ${objective.target ?? metric.target} ${metric.unit}`}>
            <Input value={value} onChange={(e) => setValue(e.target.value)} inputMode="numeric" />
          </Field>
          <Field label="What changed since your last update?">
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={marking}
        onClose={() => setMarking(false)}
        title={`Mark “${objective.title}” as done?`}
        description={`This sends it to ${contract.company} for approval. It shows as Pending approval until they confirm, then moves to Achieved.`}
        footer={
          <>
            <Button size="lg" onClick={() => setMarking(false)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" onClick={() => submit(true)}>
              Mark as done
            </Button>
          </>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
