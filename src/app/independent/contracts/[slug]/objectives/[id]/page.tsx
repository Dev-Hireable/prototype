"use client";

import { notFound } from "next/navigation";
import { use, useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Breadcrumb, Button, Chip, JobBadge, ObjectiveRow, Page, Progress, StatusDot, Tabs, Toast, useToast } from "@/components/independent/ui";
import { contracts } from "@/lib/independent/data";

const Attach = ICONS.attach;

const KIND = {
  kpi: {
    title: "KPI Dashboard",
    label: "KPI",
    cadence: "Daily · due 30 Sep 2026",
    target: "Target 12 calls this week · 9 logged so far",
    about: "Juan owns outbound for the US mid-market segment. A call counts once it is logged in HubSpot with an outcome. Target is 12 per week, logged daily.",
    update: { date: "11 Sep 2026", text: "Logged 3 calls today — 9 this week. The afternoon calling block is landing better with the US west coast; two more are booked for Thursday.", file: "call-log-week-3.csv", progress: ["Progress reported:", "72%"] },
    history: [
      { date: "11 Sep 2026", text: "+3 calls logged — 9 of 12 this week", status: { label: "Approved", tone: "ok" as const } },
      { date: "10 Sep 2026", text: "+4 calls logged", status: { label: "Approved", tone: "ok" as const } },
      { date: "09 Sep 2026", text: "+2 calls logged — flagged off track", status: { label: "Off track", tone: "danger" as const } },
    ],
    discussion: [
      { who: "Alex Rivera", when: "2 days ago", text: "Nice jump on Wednesday — what changed?" },
      { who: "Juan Dela Cruz", when: "2 days ago", text: "Switched to the afternoon calling block, PHT. Better pickup from the US west coast." },
      { who: "Alex Rivera", when: "Yesterday", text: "Keep it. Let’s aim for 10+ this week." },
    ],
    progress: 72,
  },
  okr: {
    title: "OKR Dashboard",
    label: "OKR",
    cadence: "Due 30 Sep 2026",
    target: "2 of 3 key results complete · progress is completed KRs ÷ total",
    about: "Juan owns the Q4 pipeline build. This objective completes when all three key results below are approved — progress moves only when a key result is marked done and approved.",
    update: { date: "10 Sep 2026", text: "Pipeline doc is in the shared drive and handed to the sales lead — marked that key result done. Eight opportunities qualified last week; the call target is the last one open.", file: "q4-pipeline-handover.pdf", progress: ["Progress reported:", "67%"] },
    history: [
      { date: "10 Sep 2026", text: "Key result “Hand over pipeline doc” marked done", status: { label: "Pending approval", tone: "warn" as const } },
      { date: "04 Sep 2026", text: "Key result “Qualify 8 opportunities” approved", status: { label: "Approved", tone: "ok" as const } },
      { date: "25 Aug 2026", text: "Objective and three key results agreed at offer", status: { label: "Started", tone: "ok" as const } },
    ],
    discussion: [
      { who: "Alex Rivera", when: "3 days ago", text: "Once the 8 opps are qualified, let’s review the doc together before hand-over." },
      { who: "Juan Dela Cruz", when: "Today", text: "Doc is in the shared drive — marked the KR done." },
      { who: "Alex Rivera", when: "Today", text: "Approved. One KR to go." },
    ],
    progress: 67,
  },
  task: {
    title: "Task Dashboard",
    label: "Task",
    cadence: "Due 30 Sep 2026",
    target: "",
    about: "Juan owns the CRM setup for Q4 outreach. Done means the board is live in HubSpot with the six agreed stages, all 41 target accounts imported, and an owner on every account. A task is binary — done or not done — and needs Sam’s approval to count.",
    update: { date: "10 Sep 2026", text: "Board is live in HubSpot with the 6 stages we agreed, 41 accounts imported and owners assigned. Screenshots and the import log are attached.", file: "crm-board.png · import-log.csv", progress: ["Marked as done ·", "awaiting approval"] },
    history: [
      { date: "10 Sep 2026", text: "Marked as done — board live, 41 accounts imported", status: { label: "Pending approval", tone: "warn" as const } },
      { date: "02 Sep 2026", text: "Stage naming agreed with Alex", status: { label: "Approved", tone: "ok" as const } },
      { date: "25 Aug 2026", text: "Task started", status: { label: "Started", tone: "ok" as const } },
    ],
    discussion: [
      { who: "Juan Dela Cruz", when: "10 Sep", text: "Marked as done — let me know if you want a different stage naming." },
      { who: "Alex Rivera", when: "Today", text: "Looks right. Approving now." },
    ],
    progress: 100,
  },
};

const KRS = [
  { title: "Book 12 discovery calls per week", kind: "KPI", progress: 72, status: { label: "On track", tone: "ok" as const } },
  { title: "Qualify 8 opportunities over $10k", kind: "KPI", progress: 100, status: { label: "Approved", tone: "ok" as const } },
  { title: "Hand over pipeline doc to sales lead", kind: "Objective", progress: 100, status: { label: "Approved", tone: "ok" as const } },
];

/** Figma "Contracts / KPI Dashboard · OKR Dashboard · Task Dashboard · talent view": objective card (p 24, gap 16) + 340px Discussion. */
export default function ObjectiveDashboard({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);
  const contract = contracts.find((c) => c.slug === slug);
  const objective = contract?.objectives.find((o) => o.id === id);
  if (!contract || !objective) notFound();
  const k = KIND[objective.kind];
  const [comments, setComments] = useState(k.discussion);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useToast();
  const [tab, setTab] = useState<"dashboard" | "evaluation">("dashboard");
  const status = objective.kind === "task" ? { label: "Pending approval", tone: "warn" as const } : objective.status === "risk" ? { label: "At risk", tone: "trial" as const } : { label: "On track", tone: "ok" as const };

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
    >
      <Breadcrumb items={[{ label: "All contracts", href: "/independent/contracts" }, { label: contract.title, href: `/independent/contracts/${contract.slug}` }, "Trial tracker", k.title]} />
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-lg bg-white p-6 outline -outline-offset-1 outline-[#e3e3e3]">
          <ObjectiveRow index={objective.kind === "kpi" ? 1 : objective.kind === "okr" ? 2 : 0}>{objective.title}</ObjectiveRow>
          <div className="flex items-center gap-2 text-[13px] leading-[1.4] text-ink-2">
            <StatusDot tone={status.tone}>{status.label}</StatusDot>
            <Chip size="sm">{k.label}</Chip>
            {k.cadence}
          </div>
          {objective.kind !== "task" && (
            <div className="flex flex-col gap-1.5">
              <Progress value={k.progress} label className="w-full" />
              <p className="text-[13px] leading-[1.4] text-ink-2">{k.target}</p>
            </div>
          )}
          <p className="text-[14px] leading-[1.4] text-ink-2">{k.about}</p>

          {objective.kind === "kpi" && <Trend />}
          {objective.kind === "kpi" && <DailyPerformance />}
          {objective.kind === "okr" && (
            <div className="flex flex-col rounded-lg outline -outline-offset-1 outline-[#e3e3e3]">
              <p className="px-3.5 py-2.5 text-[13px] leading-[1.45] font-semibold text-ink">Key results</p>
              {KRS.map((kr) => (
                <div key={kr.title} className="flex flex-col gap-1.5 border-t border-[#e3e3e3] px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 text-[12.5px] leading-[1.45] text-ink">{kr.title}</span>
                    <Chip size="sm">{kr.kind}</Chip>
                    <StatusDot tone={kr.status.tone}>{kr.status.label}</StatusDot>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="block h-1.5 w-[100px] overflow-hidden rounded-[3px] bg-[#eeeeee]">
                      <span className={`block h-full rounded-[3px] ${kr.progress === 100 ? "bg-ok" : "bg-primary"}`} style={{ width: `${kr.progress}%` }} />
                    </span>
                    <span className="w-9 text-[11.5px] leading-[1.45] font-semibold text-ink">{kr.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Figma "Latest update": #fafafa, p 16, gap 10 */}
          <div className="flex flex-col gap-2.5 rounded-lg bg-[#fafafa] p-4 leading-[1.4] outline -outline-offset-1 outline-border">
            <div className="flex items-center justify-between whitespace-nowrap">
              <span className="text-[14px] font-medium text-ink">Update from Juan</span>
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
            {k.history.map((h) => (
              <div key={h.date + h.text} className="flex items-center gap-3 border-b border-border py-2.5">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-[13px] leading-[1.4] whitespace-nowrap">
                  <span className="font-medium text-ink">{h.date}</span>
                  <span className="text-ink-2">{h.text}</span>
                </span>
                <StatusDot tone={h.status.tone}>{h.status.label}</StatusDot>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <Button size="lg" onClick={() => setToast("Revision request sent to Alex")}>
              Request revision
            </Button>
            <Button size="lg" variant="primary" onClick={() => setToast("Update approved")}>
              Approve update
            </Button>
          </div>
        </div>

        {/* Figma "Discussion": 340 wide, p 20, gap 12 */}
        <div className="flex w-[340px] shrink-0 flex-col gap-3 rounded-lg bg-white p-5 outline -outline-offset-1 outline-[#e3e3e3]">
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
              setComments((c) => [...c, { who: "Juan Dela Cruz", when: "Just now", text: draft.trim() }]);
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
      </div>
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** Figma "Trend — last 3 weeks": 210px plot, 12-call target line, "9 today" callout. */
function Trend() {
  const pts = [2, 4, 7, 9, 10, 3, 5, 6, 7, 10, 2, 5, 9];
  const W = 698;
  const H = 194;
  const x = (i: number) => (i * W) / (pts.length - 1);
  const y = (v: number) => H - 14 - (v / 12) * (H - 20);
  const d = pts.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 text-[13px] leading-[1.45] font-semibold text-ink">Trend — last 3 weeks</span>
        <span className="flex items-center gap-3.5 text-[11px] leading-[1.3] text-ink-2">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-primary" /> Calls logged
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-warn" /> Target · 12 / week
          </span>
        </span>
      </div>
      <div className="relative h-[210px] w-full text-[10px] leading-[1.3] text-muted-2">
        {[
          [0, 175],
          [4, 118.33],
          [8, 61.67],
          [12, 5],
        ].map(([v, t]) => (
          <span key={v} className="absolute left-[22px] w-5" style={{ top: t }}>
            {v}
          </span>
        ))}
        {["Week 1", "Week 2", "Week 3"].map((w, i) => (
          <span key={w} className="absolute top-[190px] text-[10.5px] whitespace-nowrap" style={{ left: 36 + i * 276.8 }}>
            {w}
          </span>
        ))}
        <span className="absolute top-[24.5px] left-[673.5px] rounded-[5px] bg-ink px-[7px] py-[3px] text-[10.5px] font-semibold whitespace-nowrap text-white">9 today</span>
        <span className="absolute top-[-4px] left-[714px] text-[10px] font-semibold text-[#e0a100]">12</span>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute top-0 left-[30px] h-[194px] w-[698px]" role="img" aria-label="Calls logged per day over three weeks against a target of 12" preserveAspectRatio="none">
          {[0, 4, 8, 12].map((v) => (
            <line key={v} x1={0} x2={W} y1={y(v)} y2={y(v)} stroke="#edf0f2" />
          ))}
          <line x1={0} x2={W} y1={y(12)} y2={y(12)} stroke="#f7ba00" strokeDasharray="4 4" strokeWidth="1.5" />
          <path d={`${d} L${x(pts.length - 1)},${H - 14} L${x(0)},${H - 14} Z`} fill="#eaf4fb" />
          <path d={d} fill="none" stroke="#007acc" strokeWidth="2" />
          {pts.map((v, i) => (
            <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="#fff" stroke="#007acc" strokeWidth="1.5" />
          ))}
        </svg>
      </div>
    </div>
  );
}

/** Figma "Daily performance": 24px cells (radius 4, gap 3), 28px day labels, month labels below. */
function DailyPerformance() {
  const rows = [
    [2, 0, 1, 2],
    [2, 2, 3, 1],
    [3, 1, 2, 3],
    [2, 2, 2, 2],
    [3, 2, 0],
  ];
  const c = ["bg-[#eb5757]", "bg-[#f7ba00]", "bg-ok", "bg-[#1b6e2a]"];
  const months = ["Aug", "Sep", "", "", "", "", "Oct", "", "", "", "Nov", "", "", "", "Dec", "", "", "", "", "Jan", "", "", "", "Feb", "", ""];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <span className="min-w-0 flex-1 text-[13px] leading-[1.45] font-semibold text-ink">Daily performance</span>
        {[
          ["Overachieved", "bg-[#1b6e2a]"],
          ["Achieved", "bg-ok"],
          ["At risk", "bg-[#f7ba00]"],
          ["Missed", "bg-[#eb5757]"],
        ].map(([l, b]) => (
          <span key={l} className="flex items-center gap-1 text-[10px] leading-[1.45] text-ink-2">
            <span className={`size-2 rounded-[2px] ${b}`} /> {l}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-[3px]">
        {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, r) => (
          <div key={d} className="flex items-center gap-[3px]">
            <span className="w-7 text-[10px] leading-[1.45] text-muted-2">{d}</span>
            {months.map((_, i) => (
              <span key={i} className={`size-6 rounded ${rows[r][i] !== undefined ? c[rows[r][i]] : "bg-[#e9ecef]"}`} />
            ))}
          </div>
        ))}
        <div className="flex gap-[3px] text-[10px] leading-[1.4] text-muted-2">
          <span className="w-7" />
          {months.map((m, i) => (
            <span key={i} className="w-6">
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
