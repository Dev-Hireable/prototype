"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, use, useState } from "react";
import { Button, Chip, Field, Input, JobBadge, Modal, ObjectiveRow, Page, StatusDot, Textarea, Toast, useToast } from "@/components/independent/ui";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { DefaultTimeline, Discussion, KeyResultPanel, kindIndex, LastUpdate, LiveMetrics, ObjectiveHistory } from "@/components/team/ObjectiveViews";
import { daysLeftLabel } from "@/lib/demo/dates";
import { objectiveStatus } from "@/lib/independent/data";
import { useDemo } from "@/lib/independent/store";
import { OBJECTIVE_KIND } from "@/lib/team/data";

/**
 * IN-026 / IN-028 / IN-077 — one dashboard per objective type. The panels themselves are the
 * same components the Team Builder reviews from, so the two sides of a trial cannot drift; only
 * the actions differ, because logging progress is the independent's job and ruling on it is theirs.
 */
const KIND = {
  kpi: {
    title: "Manual Objective Dashboard",
    cadence: "Logged against the target",
    about: (first: string) => `Progress is the value you log against the target. Each update goes to ${first}, who approves it or asks for a revision.`,
  },
  okr: {
    title: "Automatic Objective Dashboard",
    cadence: "Driven by key results",
    about: (first: string) => `Progress is the share of its key results that are done. Mark each one done as you finish it — the last one sends the objective to ${first} for approval.`,
  },
  task: {
    title: "Default Objective Dashboard",
    cadence: "Binary — done or not done",
    about: (first: string) => `A binary objective: done or not done. Mark it as done when the work is delivered — it sits at Pending approval until ${first} confirms it.`,
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
  const { contracts, submitObjective, completeKeyResult, commentOnObjective } = useDemo();
  const contract = contracts.find((c) => c.slug === slug);
  const objective = contract?.objectives.find((o) => o.id === id);
  const [toast, setToast] = useToast();
  const [updating, setUpdating] = useState(false);
  const [marking, setMarking] = useState(false);
  /** IN-045 — a key result is marked done through the same confirmation an objective gets. */
  const [confirmKr, setConfirmKr] = useState<string | null>(null);
  const [value, setValue] = useState(String(objective?.target ? (objective.current ?? "") : (objective?.progress ?? "")));
  const [note, setNote] = useState("");
  if (!contract || !objective) notFound();
  const k = KIND[objective.kind];
  const first = contract.managerFirst;
  const left = contract.left;
  /** A full-time contract counts down its review period, not a trial. */
  const status = objectiveStatus(objective, left);
  const krs = objective.keyResults ?? [];
  /** Achieved, or with the Team Builder — read-only until they rule on it. */
  const locked = objective.status === "complete" || objective.status === "pending";
  const hasTarget = !!objective.target;
  const number = Number(value);
  const valueOk = value.trim() !== "" && Number.isFinite(number) && number >= 0 && (hasTarget || number <= 100);
  const pendingKr = krs.find((x) => x.id === confirmKr);

  const sendUpdate = () => {
    submitObjective(contract.slug, objective.id, hasTarget ? { value: number, note } : { percent: number, note });
    setUpdating(false);
    setNote("");
    setToast(`Update sent to ${first} for review`);
  };
  const markDone = () => {
    submitObjective(contract.slug, objective.id, { done: true, note });
    setMarking(false);
    setNote("");
    setToast(`Sent to ${first} for approval`);
  };

  /** What the talent can do next, by type — nothing once it is with the Team Builder or achieved. */
  const action = locked ? (
    <p className="rounded-lg bg-surface-2 px-4 py-3 text-[13px] leading-[1.4] text-ink-2">
      {objective.status === "complete" ? `Achieved — approved by ${first}.` : `Sent to ${first} and waiting on their approval. It is read-only until they approve it or ask for a revision.`}
    </p>
  ) : objective.kind === "kpi" ? (
    <Button size="lg" variant="primary" onClick={() => setUpdating(true)}>
      Update progress
    </Button>
  ) : objective.kind === "okr" && krs.length > 0 && !krs.every((x) => x.done) ? (
    <p className="rounded-lg bg-surface-2 px-4 py-3 text-[13px] leading-[1.4] text-ink-2">Mark each key result done as you finish it — the last one sends this objective to {first} for approval.</p>
  ) : (
    // A Default objective, an Automatic one agreed without key results, or one sent back after
    // every key result was done: the talent submits it as a whole.
    <Button size="lg" variant="primary" onClick={() => setMarking(true)}>
      {objective.kind === "okr" && krs.length > 0 ? "Submit for approval" : "Mark as done"}
    </Button>
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
          {/* Type, status, countdown and both dates sit on the objective itself. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] leading-[1.4] text-ink-2">
            <StatusDot tone={status.tone}>{status.label}</StatusDot>
            <Chip size="sm">{OBJECTIVE_KIND[objective.kind]}</Chip>
            <span>{k.cadence} ·</span>
            {left !== null && (
              <span>
                {daysLeftLabel(left, "left in the trial")} ·
              </span>
            )}
            <span>
              {contract.started} – {objective.due ?? contract.ends}
            </span>
          </div>
          {objective.description && <p className="text-[14px] leading-[1.4] text-ink">{objective.description}</p>}
          <p className="text-[14px] leading-[1.4] text-ink-2">{k.about(first)}</p>
          {(objective.status === "revision" || objective.meta.startsWith("Sent back")) && <p className="rounded-lg bg-[#fff3cc] p-4 text-[14px] leading-[1.4] text-[#8e6f12]">{objective.meta}</p>}

          {/* Each objective type earns its own dashboard (IN-026 / IN-028 / IN-077). */}
          {objective.kind === "kpi" && <LiveMetrics current={objective.current} target={objective.target} unit={objective.unit} progress={objective.progress} trend={objective.trend} />}
          {objective.kind === "okr" &&
            (krs.length > 0 ? (
              <KeyResultPanel keyResults={krs} onDone={locked ? undefined : setConfirmKr} />
            ) : (
              <p className="rounded-lg bg-surface-2 px-4 py-3 text-[13px] leading-[1.4] text-ink-2">No key results were agreed for this objective — mark it done when it is achieved.</p>
            ))}
          {objective.kind === "task" && <DefaultTimeline started={contract.started} due={objective.due ?? contract.ends} daysLeft={left === null ? null : Math.max(0, left)} />}

          <LastUpdate title="Your last update" update={objective.lastUpdate} />
          <ObjectiveHistory activity={objective.activity} />
          <div className="flex justify-end">{action}</div>
        </div>

        <Discussion comments={objective.comments} onSend={(text) => commentOnObjective(contract.slug, objective.id, text)} />
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
            <Button size="lg" variant="primary" disabled={!valueOk} onClick={sendUpdate}>
              Send update
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {/* IN-041 — the modal states the type and where the value stands today. */}
          <div className="flex flex-wrap items-center gap-2 text-[13px] leading-[1.4] text-ink-2">
            <Chip size="sm">{OBJECTIVE_KIND[objective.kind]}</Chip>
            <span>{hasTarget ? `Current value ${objective.current ?? 0} of ${objective.target} ${objective.unit ?? ""}` : `Currently at ${objective.progress}%`}</span>
          </div>
          <Field label={hasTarget ? "New value" : "Progress (%)"} hint={hasTarget ? `Target: ${objective.target} ${objective.unit ?? ""}` : "0 to 100 — no numeric target was agreed for this objective"}>
            <Input value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" />
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
            <Button size="lg" variant="primary" onClick={markDone}>
              {objective.kind === "okr" && krs.length > 0 ? "Submit for approval" : "Mark as done"}
            </Button>
          </>
        }
      >
        <Field label="Anything for the reviewer? (optional)">
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Where the work is, and anything they should check" />
        </Field>
      </Modal>

      {/* IN-045 — a key result gets a confirmation prompt too, and cannot be undone once done. */}
      <Modal
        open={!!pendingKr}
        onClose={() => setConfirmKr(null)}
        title={`Mark “${pendingKr?.title ?? ""}” as done?`}
        description={
          krs.filter((x) => !x.done).length === 1
            ? `It is the last key result, so the objective goes to ${first} for approval. You cannot undo it.`
            : `This moves ${objective.title} forward straight away. You cannot undo it.`
        }
        footer={
          <>
            <Button size="lg" onClick={() => setConfirmKr(null)}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant="primary"
              onClick={() => {
                if (confirmKr) completeKeyResult(contract.slug, objective.id, confirmKr);
                setConfirmKr(null);
                setToast("Key result marked done");
              }}
            >
              Mark as done
            </Button>
          </>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
