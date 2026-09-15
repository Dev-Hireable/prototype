"use client";

import { notFound } from "next/navigation";
import { use, useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Breadcrumb, Button, Chip, JobBadge, ObjectiveRow, Page, Progress, StatusDot, Tabs, Toast, useToast } from "@/components/independent/ui";
import { CONTRACT_NAMES, byName, contracts } from "@/lib/team/data";

const Attach = ICONS.attach;

const KIND = {
  kpi: { title: "KPI Dashboard", label: "KPI", cadence: "Daily · due 30 Sep 2026", target: "Target 12 calls this week · 9 logged so far", about: "Owns outbound for the US mid-market segment. A call counts once it is logged in HubSpot with an outcome. Target is 12 per week, logged daily.", update: { date: "11 Sep 2026", text: "Logged 3 calls today — 9 this week. The afternoon calling block is landing better with the US west coast; two more are booked for Thursday.", file: "call-log-week-3.csv", progress: ["Progress reported:", "72%"] }, history: [{ date: "11 Sep 2026", text: "+3 calls logged — 9 of 12 this week", status: { label: "Pending your review", tone: "warn" as const } }, { date: "10 Sep 2026", text: "+4 calls logged", status: { label: "Approved", tone: "ok" as const } }, { date: "09 Sep 2026", text: "+2 calls logged — flagged off track", status: { label: "Off track", tone: "danger" as const } }], progress: 72 },
  okr: { title: "OKR Dashboard", label: "OKR", cadence: "Due 30 Sep 2026", target: "2 of 3 key results complete · progress is completed KRs ÷ total", about: "Owns the Q4 pipeline build. This objective completes when all three key results are approved — progress moves only when a key result is marked done and approved.", update: { date: "10 Sep 2026", text: "Pipeline doc is in the shared drive and handed to the sales lead — marked that key result done. Eight opportunities qualified last week; the call target is the last one open.", file: "q4-pipeline-handover.pdf", progress: ["Progress reported:", "67%"] }, history: [{ date: "10 Sep 2026", text: "Key result “Hand over pipeline doc” marked done", status: { label: "Pending your review", tone: "warn" as const } }, { date: "04 Sep 2026", text: "Key result “Qualify 8 opportunities” approved", status: { label: "Approved", tone: "ok" as const } }, { date: "25 Aug 2026", text: "Objective and three key results agreed at offer", status: { label: "Started", tone: "ok" as const } }], progress: 67 },
  task: { title: "Task Dashboard", label: "Task", cadence: "Due 30 Sep 2026", target: "", about: "Owns the CRM setup for Q4 outreach. Done means the board is live in HubSpot with the six agreed stages, all 41 target accounts imported, and an owner on every account. A task is binary and needs your approval to count.", update: { date: "10 Sep 2026", text: "Board is live in HubSpot with the 6 stages we agreed, 41 accounts imported and owners assigned. Screenshots and the import log are attached.", file: "crm-board.png · import-log.csv", progress: ["Marked as done ·", "awaiting your approval"] }, history: [{ date: "10 Sep 2026", text: "Marked as done — board live, 41 accounts imported", status: { label: "Pending your review", tone: "warn" as const } }, { date: "02 Sep 2026", text: "Stage naming agreed", status: { label: "Approved", tone: "ok" as const } }, { date: "25 Aug 2026", text: "Task started", status: { label: "Started", tone: "ok" as const } }], progress: 100 },
};

const KRS = [
  { title: "Book 12 discovery calls per week", kind: "KPI", progress: 72, status: { label: "On track", tone: "ok" as const } },
  { title: "Qualify 8 opportunities over $10k", kind: "KPI", progress: 100, status: { label: "Approved", tone: "ok" as const } },
  { title: "Hand over pipeline doc to sales lead", kind: "Objective", progress: 100, status: { label: "Approved", tone: "ok" as const } },
];

/** Figma "Independents / KPI Dashboard · OKR Dashboard · Task Dashboard · shared" — the employer reviews from the same layout. */
export default function SharedObjectiveDashboard({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);
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
      <Breadcrumb items={[{ label: "All independents", href: "/team/independents" }, { label: name, href: `/team/independents/${contract.slug}` }, "Trial tracker", k.title]} />
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
          <p className="text-[14px] leading-[1.4] text-ink-2">
            {first} {k.about.charAt(0).toLowerCase() + k.about.slice(1)}
          </p>
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
          <div className="flex justify-end gap-3">
            <Button size="lg" disabled={!!decided} onClick={() => { setDecided("Revision requested"); setToast(`Revision requested from ${first}`); }}>
              Request revision
            </Button>
            <Button size="lg" variant="primary" disabled={!!decided} onClick={() => { setDecided("Approved"); setToast("Update approved"); }}>
              Approve update
            </Button>
          </div>
        </div>

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
              setComments((c) => [...c, { who: "Alex Rivera", when: "Just now", text: draft.trim() }]);
              setDraft("");
            }}
          >
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a comment…" className="h-11 w-full rounded-lg border border-border px-4 text-[14px] leading-[1.2] tracking-[0.2px] outline-none placeholder:text-ink-2 focus:border-primary" />
          </form>
        </div>
      </div>
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
