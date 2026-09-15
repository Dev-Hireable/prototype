"use client";

import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { Suspense, use, useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Breadcrumb, Button, Card, Field, Input, JobBadge, LinkButton, Modal, ObjectiveRow, Page, Progress, Select, Stat, StatusDot, Tabs, Textarea, Toast, useToast } from "@/components/independent/ui";
import { Avatar, CardHeading } from "@/components/team/ui";
import { CONTRACT_NAMES, byName, contracts } from "@/lib/team/data";
import type { Objective } from "@/lib/team/data";

const More = ICONS.moreV;
const DM = { fontVariationSettings: '"opsz" 14' } as const;
const OBJ_STATUS: Record<Objective["status"], { label: string; tone: "warn" | "ok" | "trial"; bar: "primary" | "ok" | "warn" }> = {
  pending: { label: "Update pending", tone: "warn", bar: "primary" },
  complete: { label: "Complete", tone: "ok", bar: "ok" },
  risk: { label: "At risk", tone: "trial", bar: "warn" },
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
  const contract = contracts.find((c) => c.slug === slug);
  if (!contract) notFound();
  const p = byName(contract.independent);
  const name = CONTRACT_NAMES[contract.slug] ?? p.name;
  const first = name.split(" ")[0];
  const [tab, setTab] = useState<"dashboard" | "evaluation">(useSearchParams().get("tab") === "evaluation" ? "evaluation" : "dashboard");
  const [objectives, setObjectives] = useState(contract.objectives);
  const [review, setReview] = useState<Objective | null>(null);
  const [adding, setAdding] = useState(false);
  const [converting, setConverting] = useState(false);
  const [title, setTitle] = useState("");
  const [scores, setScores] = useState<number[]>([4, 5, 4, 3, 4]);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useToast();
  const isTrial = contract.type === "trial";
  const ended = contract.progress === 100 && isTrial;
  const completed = objectives.filter((o) => o.status === "complete").length;
  const pending = objectives.filter((o) => o.status === "pending").length;

  const decide = (verdict: "approve" | "revise" | "reject") => {
    setObjectives((os) => os.map((o) => (o.id === review?.id ? { ...o, status: verdict === "approve" ? "on" : verdict === "revise" ? "pending" : "risk", meta: verdict === "approve" ? "Approved just now" : verdict === "revise" ? "Revision requested · today" : "Rejected · today" } : o)));
    setReview(null);
    setToast({ approve: "Update approved", revise: `Revision requested from ${first}`, reject: "Update rejected" }[verdict]);
  };

  return (
    <Page
     
      title={
        <>
          {name} <JobBadge type={contract.type} />
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
      <Breadcrumb items={[{ label: "All independents", href: "/team/independents" }, name, ...(tab === "evaluation" ? ["Evaluation"] : [])]} />

      {tab === "evaluation" ? (
        <div className="flex items-start gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-[20px] leading-[1.5] font-semibold text-ink" style={DM}>
                {submitted ? `Your evaluation of ${name}` : `Evaluate ${name}`}
              </h2>
              <p className="text-[14px] leading-[1.4] text-ink-2">
                {ended || submitted ? "Scores are final once sent and feed the independent’s trial fit score." : `Locked until the trial ends on ${contract.ends}. You can prepare notes from the objectives in the meantime.`}
              </p>
            </div>
            <Card className={`flex flex-col gap-4 p-5 ${!ended && !submitted ? "opacity-60" : ""}`}>
              {SCORES.map((label, i) => (
                <div key={label} className="flex items-center justify-between">
                  <p className="text-[14px] leading-[1.4] font-medium text-ink">{label}</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={!ended || submitted}
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
                <Select options={["Hire full-time", "Extend the trial", "End the engagement"]} disabled={!ended || submitted} />
              </div>
              <Field label="Comments for the independent">
                <Textarea rows={3} disabled={!ended || submitted} defaultValue={submitted ? "Exceeded the call target in week three and booked six demos. Recommend a full-time offer at the trial rate." : ""} placeholder="What went well, what to improve" />
              </Field>
              <div className="flex justify-end gap-3">
                {submitted ? (
                  <Button size="lg" variant="primary" onClick={() => setConverting(true)}>
                    Convert to full-time
                  </Button>
                ) : (
                  <Button size="lg" variant="primary" disabled={!ended} onClick={() => { setSubmitted(true); setToast("Evaluation sent"); }}>
                    Send evaluation
                  </Button>
                )}
              </div>
            </Card>
          </div>
          <div className="flex w-[320px] shrink-0 flex-col gap-3 rounded-lg bg-[#f3faf6] p-5 outline -outline-offset-1 outline-[#bfe3cc]">
            <p className="text-[14px] leading-[1.4] font-medium text-ink-2">Trial fit score · {submitted ? "final" : "so far"}</p>
            <p className="font-display text-[40px] leading-[1.5] font-semibold text-ink" style={DM}>
              {submitted ? "88%" : "72%"}
            </p>
            <p className="max-w-[280px] text-[13px] leading-[1.4] text-ink-2">{submitted ? `Locked at phase 4 on ${contract.ends}, after your evaluation.` : "Locks after your evaluation. Performance updates as you approve objectives."}</p>
            {[
              ["Performance", submitted ? 60 : 44, "objectives and evaluation"],
              ["Profile", 100, "profile vs role alignment"],
              ["Work style", 100, "from the work-style quiz"],
            ].map(([k, v, s]) => (
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
                <LinkButton size="lg" href="/team/messages">
                  Message {first}
                </LinkButton>
                <Button size="lg" variant="primary" onClick={() => (pending ? setReview(objectives.find((o) => o.status === "pending") ?? null) : setTab("evaluation"))}>
                  {pending ? "Review update" : "Send evaluation"}
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
              <span>Manager: {contract.manager}</span>
            </p>
          </Card>

          <div className="flex gap-4">
            <Stat label={isTrial ? "Trial progress" : "Quarter progress"} value={`${contract.progress ?? 78}%`} sub={contract.day} />
            <Stat label="Objectives" value={String(objectives.length)} sub={`${completed} completed · ${objectives.filter((o) => o.status === "on" || o.status === "pending").length} on track · ${objectives.filter((o) => o.status === "risk").length} at risk`} />
            <Stat label="Updates to review" value={String(pending)} sub={pending ? `Sent 8 Sep by ${first}` : "Nothing waiting"} />
            <Stat label="Hours logged this week" value="38h" sub="Target 40h" />
          </div>

          <div className="flex items-start gap-6">
            <section className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={DM}>
                  Objectives
                </h2>
                <Button size="sm" onClick={() => setAdding(true)}>
                  Add objective
                </Button>
              </div>
              {objectives.map((o, i) => {
                const st = OBJ_STATUS[o.status];
                return (
                  <Card key={o.id} className="flex flex-col gap-3 p-4">
                    <Link href={`/team/independents/${contract.slug}/objectives/${o.id}`} className="block hover:opacity-80">
                      <ObjectiveRow index={i}>{o.title}</ObjectiveRow>
                    </Link>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[13px] leading-[1.4] whitespace-nowrap text-ink-2">
                        <Progress value={o.progress} tone={st.bar} label />
                        <StatusDot tone={st.tone}>{st.label}</StatusDot>
                        <span>{o.meta}</span>
                      </div>
                      <Button size="sm" variant={o.status === "pending" ? "primary" : "secondary"} disabled={o.status === "complete"} onClick={() => (o.status === "pending" ? setReview(o) : setToast("Nothing to review yet"))}>
                        {o.status === "pending" ? "Review" : "View"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </section>

            <aside className="flex w-[360px] shrink-0 flex-col gap-4">
              <Card className="flex flex-col gap-3.5 p-5">
                <CardHeading>{isTrial ? "Trial evaluation" : "Quarterly review"}</CardHeading>
                <p className="max-w-[320px] text-[13px] leading-[1.4] text-ink-2">{ended ? "The trial has ended. Send your evaluation to unlock the full-time decision." : `Opens on ${contract.ends}, once the trial ends. Your objective reviews feed the fit score until then.`}</p>
                <Button size="lg" variant={ended ? "primary" : "secondary"} onClick={() => setTab("evaluation")}>
                  {ended ? "Send evaluation" : "View evaluation"}
                </Button>
              </Card>
              <div className="flex flex-col gap-2 rounded-lg bg-white p-[18px] outline -outline-offset-1 outline-[#e3e3e3]">
                <h3 className="text-[14px] leading-[1.45] font-semibold text-ink">Contract &amp; payment</h3>
                {(
                  [
                    ["Rate", contract.rate],
                    [isTrial ? "Trial" : "Term", `${contract.started} – ${contract.ends}`],
                    ["Escrow", `${isTrial ? "$1,600 held since" : "Charged monthly from"} ${contract.started}`],
                    ["Payout", isTrial ? "Released at trial end on your approval" : "End of each month"],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex gap-2.5 leading-[1.45]">
                    <span className="w-14 shrink-0 text-[11.5px] text-ink-2">{k}</span>
                    <span className="min-w-0 flex-1 text-[12px] text-ink">{v}</span>
                  </div>
                ))}
                <Button size="sm" className="self-start" onClick={() => setToast("Dispute form opens in Messages with Hireable support")}>
                  Raise a dispute
                </Button>
              </div>
            </aside>
          </div>
        </>
      )}

      {/* Objective review — Figma "Independents / Objective review · approve update / request revision / reject update" */}
      <Modal
        open={!!review}
        onClose={() => setReview(null)}
        title={`Review update: ${review?.title ?? ""}`}
        description={`${first} reported ${review?.meta ?? ""}. Approve to move the objective forward, request a revision, or reject it.`}
        footer={
          <>
            <Button size="lg" variant="ghost" onClick={() => decide("reject")}>
              Reject
            </Button>
            <Button size="lg" onClick={() => decide("revise")}>
              Request revision
            </Button>
            <Button size="lg" variant="primary" onClick={() => decide("approve")}>
              Approve update
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="rounded-lg bg-[#fafafa] p-4 text-[14px] leading-[1.4] text-ink outline -outline-offset-1 outline-border">Logged 3 calls today — 9 this week. The afternoon calling block is landing better with the US west coast; two more are booked for Thursday.</div>
          <Field label="Note to the independent (optional)">
            <Textarea rows={3} className="h-[78px]" placeholder="What should change, or what worked" />
          </Field>
        </div>
      </Modal>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add an objective"
        description={`${first} is notified and commits to it from the tracker. Keep it measurable.`}
        footer={
          <>
            <Button size="lg" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" disabled={!title.trim()} onClick={() => { setObjectives((os) => [...os, { id: `o${Date.now()}`, title: title.trim(), kind: "kpi", progress: 0, status: "on", meta: "Added today" }]); setTitle(""); setAdding(false); setToast("Objective added"); }}>
              Add objective
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Objective">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Book 12 discovery calls per week" />
          </Field>
          <Field label="Type">
            <Select options={["KPI", "OKR", "Task"]} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={converting}
        onClose={() => setConverting(false)}
        title={`Convert ${first} to full-time?`}
        description={`A full-time offer at the trial rate (${contract.rate}) goes to ${first}. Escrow closes and salary is charged monthly once they accept.`}
        footer={
          <>
            <Button size="lg" onClick={() => setConverting(false)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" onClick={() => { setConverting(false); setToast(`Full-time offer sent to ${first}`); }}>
              Send full-time offer
            </Button>
          </>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
