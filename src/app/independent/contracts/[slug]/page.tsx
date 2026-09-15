"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use, useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Breadcrumb, Button, Card, Field, Initials, Input, JobBadge, LinkButton, Modal, ObjectiveRow, Page, Progress, Stat, StatusDot, Tabs, Textarea, Toast, useToast } from "@/components/independent/ui";
import { contracts, evaluation } from "@/lib/independent/data";
import type { Objective } from "@/lib/independent/data";

const More = ICONS.moreV;

const OBJ_STATUS: Record<Objective["status"], { label: string; tone: "warn" | "ok" | "trial"; bar: "primary" | "ok" | "warn" }> = {
  pending: { label: "Update pending", tone: "warn", bar: "primary" },
  complete: { label: "Complete", tone: "ok", bar: "ok" },
  risk: { label: "At risk", tone: "trial", bar: "warn" },
  on: { label: "On track", tone: "ok", bar: "primary" },
};

const DM = { fontVariationSettings: '"opsz" 14' } as const;

/** Figma "Contracts / Trial tracker · Full-time tracker · Update progress · Mark as done · Evaluation received": DM Sans 24 header + tabs. */
export default function ContractTracker({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const contract = contracts.find((c) => c.slug === slug);
  if (!contract) notFound();
  const [tab, setTab] = useState<"dashboard" | "evaluation">("dashboard");
  const [objectives, setObjectives] = useState(contract.objectives);
  const [updating, setUpdating] = useState<Objective | null>(null);
  const [marking, setMarking] = useState<Objective | null>(null);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [toast, setToast] = useToast();
  const isTrial = contract.type === "trial";
  const completed = objectives.filter((o) => o.status === "complete").length;
  const evaluationReady = contract.status.label === "Evaluation received";

  const openUpdate = (o: Objective) => {
    setValue(String(o.current ?? ""));
    setNote("");
    if (o.kind === "task" && o.status !== "complete") setMarking(o);
    else setUpdating(o);
  };
  const sendUpdate = () => {
    setObjectives((os) =>
      os.map((o) =>
        o.id === updating?.id
          ? { ...o, status: "pending", current: Number(value) || o.current, progress: o.target ? Math.round(((Number(value) || 0) / o.target) * 100) : o.progress, meta: `${value} of ${o.target ?? ""} · sent just now` }
          : o,
      ),
    );
    setUpdating(null);
    setToast(`Update sent to ${contract.managerFirst} for review`);
  };
  const markDone = () => {
    setObjectives((os) => os.map((o) => (o.id === marking?.id ? { ...o, status: "pending", progress: 100, meta: "Pending approval · sent just now" } : o)));
    setMarking(null);
    setToast(`Sent to ${contract.company} for approval`);
  };

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
            { value: "dashboard", label: "Dashboard" },
            { value: "evaluation", label: "Evaluation" },
          ]}
        />
      }
    >
      <Breadcrumb items={[{ label: "All contracts", href: "/independent/contracts" }, `${contract.title} — ${contract.company}`, ...(tab === "evaluation" ? ["Evaluation"] : [])]} />

      {tab === "evaluation" ? (
        <Evaluation ready={evaluationReady} company={contract.company} />
      ) : (
        <>
          {/* Figma "Independent header": p 20, gap 12 */}
          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-4">
              <Initials text={contract.initials} className="size-14 text-[14px]" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="flex items-center gap-2">
                  <span className="font-display text-[22px] leading-[1.5] font-semibold text-ink" style={DM}>
                    {contract.company}
                  </span>
                  <JobBadge type={contract.type} />
                  <StatusDot tone={contract.status.tone}>{contract.status.label}</StatusDot>
                </p>
                <p className="text-[14px] leading-[1.4] text-ink-2">{contract.manager} · Hiring manager</p>
              </div>
              <div className="flex items-center gap-2">
                <LinkButton size="lg" href="/independent/messages">
                  Message {contract.managerFirst}
                </LinkButton>
                <Button size="lg" variant="primary" onClick={() => openUpdate(objectives.find((o) => o.status !== "complete") ?? objectives[0])}>
                  Update progress
                </Button>
                <button type="button" aria-label="More" className="text-ink">
                  <More size={24} aria-hidden />
                </button>
              </div>
            </div>
            <p className="flex gap-6 text-[13px] leading-[1.4] whitespace-nowrap text-ink-2">
              <span>
                {isTrial ? "Trial started" : "Full-time since"} {contract.started}
              </span>
              <span>{contract.day}</span>
              <span>{isTrial ? `Ends ${contract.ends}` : "Quarter: Q3 2026 (Jul to Sep)"}</span>
              <span>{contract.rate}</span>
              <span>Hiring manager: {contract.manager}</span>
            </p>
          </Card>

          <div className="flex gap-4">
            <Stat label={contract.progressLabel} value={`${contract.progress}%`} sub={contract.day} />
            <Stat label="Objectives" value={String(objectives.length)} sub={`${completed} completed · ${objectives.filter((o) => o.status === "on" || o.status === "pending").length} on track · ${objectives.filter((o) => o.status === "risk").length} at risk`} />
            <Stat label="Updates pending review" value={String(objectives.filter((o) => o.status === "pending").length)} sub={`Sent 8 Sep · awaiting ${contract.managerFirst}`} />
            <Stat label={isTrial ? "Hours you logged this week" : "Next review"} value={isTrial ? "38h" : "Q3 2026"} sub={isTrial ? "Target 40h" : "Opens 1 Oct"} />
          </div>

          <div className="flex items-start gap-6">
            <section className="flex min-w-0 flex-1 flex-col gap-3">
              <h2 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={DM}>
                {isTrial ? "Objectives" : "My objectives"}
              </h2>
              {objectives.map((o, i) => {
                const st = OBJ_STATUS[o.status];
                return (
                  <Card key={o.id} className="flex flex-col gap-3 p-4">
                    <Link href={`/independent/contracts/${contract.slug}/objectives/${o.id}`} className="block hover:opacity-80">
                      <ObjectiveRow index={i}>{o.title}</ObjectiveRow>
                    </Link>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[13px] leading-[1.4] whitespace-nowrap text-ink-2">
                        <Progress value={o.progress} tone={st.bar} label />
                        <StatusDot tone={st.tone}>{st.label}</StatusDot>
                        <span>{o.meta}</span>
                      </div>
                      <Button size="sm" onClick={() => openUpdate(o)} disabled={o.status === "complete"}>
                        Update
                      </Button>
                    </div>
                  </Card>
                );
              })}
              {!isTrial && <p className="text-[13px] leading-[1.4] text-ink-2">Objectives, updates and approvals work exactly like the trial tracker. Only the trial timer and the evaluation gate are gone.</p>}
            </section>

            <aside className="flex w-[360px] shrink-0 flex-col gap-4">
              <Card className="flex flex-col gap-3.5 p-5">
                <h3 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={DM}>
                  Your fit so far
                </h3>
                <p className="max-w-[320px] text-[13px] leading-[1.4] text-ink-2">
                  From {contract.managerFirst}’s reviews of your updates. {contract.managerFirst === "Rowena" ? "Her" : "Their"} final evaluation opens on Day 30.
                </p>
                {(
                  [
                    ["Quality of work", 85, "primary"],
                    ["Communication", 70, "muted"],
                    ["Reliability", 90, "primary"],
                  ] as const
                ).map(([l, v, tone]) => (
                  <div key={l} className="flex flex-col gap-1.5">
                    <p className="text-[13px] leading-[1.4] font-medium text-ink">{l}</p>
                    <Progress value={v} tone={tone} label className="w-full" />
                  </div>
                ))}
                <div className="flex flex-col gap-2 pt-2 text-[13px] leading-[1.4]">
                  <p className="font-medium text-ink">Recent reviews</p>
                  <p className="text-ink-2">8 Sep · Demo update awaiting your review</p>
                  <p className="text-ink-2">3 Sep · Email sequence approved</p>
                  <p className="text-ink-2">29 Aug · CRM cleanup approved</p>
                </div>
              </Card>

              <div className="flex flex-col gap-2.5 rounded-lg bg-white p-[18px] outline -outline-offset-1 outline-[#e3e3e3]">
                <div className="flex items-center gap-2">
                  <h3 className="flex-1 text-[14px] leading-[1.45] font-semibold text-ink">Activity</h3>
                  <StatusDot tone="ok">8-day streak · Thriving</StatusDot>
                </div>
                <Heatmap />
                <p className="text-[11px] leading-[1.45] text-ink-2">Mon–Fri, one column per week across the quarter. Green is a full log, light green a partial one, grey nothing yet. Any log keeps the streak alive; only an empty weekday breaks it.</p>
              </div>

              <div className="flex flex-col gap-2 rounded-lg bg-white p-[18px] outline -outline-offset-1 outline-[#e3e3e3]">
                <h3 className="text-[14px] leading-[1.45] font-semibold text-ink">Contract &amp; payment</h3>
                {(
                  [
                    ["Rate", contract.rate],
                    [isTrial ? "Trial" : "Term", `${contract.started} – ${contract.ends}`],
                    ["Escrow", `$1,600 held since ${contract.started}`],
                    ["Payout", "Released at trial end on approval, to Maya ····4471"],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex gap-2.5 leading-[1.45]">
                    <span className="w-14 shrink-0 text-[11.5px] text-ink-2">{k}</span>
                    <span className="min-w-0 flex-1 text-[12px] text-ink">{v}</span>
                  </div>
                ))}
                <Button size="sm" className="self-start" onClick={() => setToast("Dispute form opens in Messages with Hireable support")}>
                  Raise a payment dispute
                </Button>
              </div>
            </aside>
          </div>
        </>
      )}

      <Modal
        open={!!updating}
        onClose={() => setUpdating(null)}
        title={`Update progress: ${updating?.title ?? ""}`}
        description={`Tell ${contract.managerFirst} what changed. ${contract.managerFirst === "Rowena" ? "She reviews" : "They review"} the update and can approve it or ask for a revision.`}
        footer={
          <>
            <Button size="lg" onClick={() => setUpdating(null)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" onClick={sendUpdate}>
              Send update
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {updating?.target && (
            <Field label="Current value" hint={`Target: ${updating.target} ${updating.title.toLowerCase().includes("demo") ? "qualified demos by day 30" : ""}`}>
              <Input value={value} onChange={(e) => setValue(e.target.value)} inputMode="numeric" />
            </Field>
          )}
          <Field label="What changed since your last update?">
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={() => setToast("File picker opens here")}>
              Attach a file
            </Button>
            <span className="text-[12px] leading-[1.4] text-ink-2">Optional: a report, a screenshot or a link</span>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!marking}
        onClose={() => setMarking(null)}
        title={`Mark “${marking?.title ?? ""}” as done?`}
        description={`This sends the task to ${contract.company} for approval. It shows as Pending approval until they confirm, then moves to Completed.`}
        footer={
          <>
            <Button size="lg" onClick={() => setMarking(null)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" onClick={markDone}>
              Mark as done
            </Button>
          </>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** Figma "Activity" grid: 18px cells, 3px gaps, 28px day labels, 9px week numbers. */
function Heatmap() {
  const cells = [
    [2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [2, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ];
  const c = ["bg-[#eeeeee]", "bg-[#a3dfb5]", "bg-ok"];
  return (
    <div className="flex flex-col gap-[3px]">
      {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, r) => (
        <div key={d} className="flex items-center gap-[3px]">
          <span className="w-7 text-[10px] leading-[1.45] text-ink-2">{d}</span>
          {cells[r].map((v, i) => (
            <span key={i} className={`size-[18px] rounded-[3px] ${c[v]}`} />
          ))}
        </div>
      ))}
      <div className="flex gap-[3px] text-[9px] text-ink-2">
        <span className="w-7" />
        {[...Array(14)].map((_, i) => (
          <span key={i} className="w-[18px]">
            {i % 4 === 0 ? i + 1 : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Figma "Contracts / Evaluation received · view". */
function Evaluation({ ready, company }: { ready: boolean; company: string }) {
  if (!ready) {
    return (
      <Card className="p-10 text-center">
        <p className="text-[16px] leading-[1.5] font-semibold text-ink">Evaluation opens on Day 30</p>
        <p className="mt-2 text-[13px] leading-[1.4] text-ink-2">{company} submits scores after the trial ends. They feed your trial fit score.</p>
      </Card>
    );
  }
  return (
    <div className="flex items-start gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-[20px] leading-[1.5] font-semibold text-ink" style={DM}>
            Your evaluation from {company}
          </h2>
          <p className="text-[14px] leading-[1.4] text-ink-2">{evaluation.submitted}</p>
        </div>
        <Card className="flex flex-col gap-4 p-5">
          {evaluation.scores.map((s) => (
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
              <StatusDot tone="ok">Hire full-time</StatusDot>
              {evaluation.average}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[14px] leading-[1.4] font-medium text-ink">Comments from your employer</p>
            <p className="rounded-md bg-[#fafafa] p-3 text-[14px] leading-[1.4] text-ink outline -outline-offset-1 outline-border">{evaluation.comments}</p>
          </div>
          <div className="flex justify-end">
            <LinkButton size="lg" href="/independent/messages">
              Message {company}
            </LinkButton>
          </div>
        </Card>
      </div>
      <div className="flex w-[320px] shrink-0 flex-col gap-3 rounded-lg bg-[#f3faf6] p-5 outline -outline-offset-1 outline-[#bfe3cc]">
        <p className="text-[14px] leading-[1.4] font-medium text-ink-2">Trial fit score · final</p>
        <p className="font-display text-[40px] leading-[1.5] font-semibold text-ink" style={DM}>
          {evaluation.fit.score}
        </p>
        <p className="max-w-[280px] text-[13px] leading-[1.4] text-ink-2">{evaluation.fit.locked}</p>
        {evaluation.fit.parts.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1.5 rounded-md bg-white p-3">
            <p className="text-[13px] leading-[1.4] font-medium text-ink">{k}</p>
            <span className="block h-1.5 w-full overflow-hidden rounded-[3px] bg-[#e6e6e6]">
              <span className="block h-full rounded-[3px] bg-[#2e9e5b]" style={{ width: `${parseInt(v, 10)}%` }} />
            </span>
            <p className="text-[12px] leading-[1.4] text-ink-2">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
