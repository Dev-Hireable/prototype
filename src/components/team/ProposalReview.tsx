"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ICONS } from "@/components/admin/icons";
import { JobBadge, MatchPill } from "@/components/independent/ui";
import { Avatar, MATCH_TOOLTIP } from "@/components/team/ui";
import { OBJECTIVE_KIND } from "@/lib/team/data";
import type { Independent, Objective, Role } from "@/lib/team/data";

const Chevron = ICONS.chevron;
const Calendar = ICONS.calendar;
const Close = ICONS.close;
const Collapse = ICONS.chevronLeft;

export type ProposedKeyResult = { title: string; description: string; target?: string };
export type ProposedObjective = { title: string; kind: Objective["kind"]; description: string; keyResults: ProposedKeyResult[] };
export type Proposal = { version: number; sent: string; rate: string; letter: string; objectives: ProposedObjective[] };

/** The diamond that marks an objective's type, coloured per kind. */
const DIAMOND: Record<Objective["kind"], string> = { kpi: "bg-[#f2994a]", okr: "bg-primary", task: "bg-[#27ae60]" };

function Card({ children }: { children: ReactNode }) {
  return <section className="flex flex-col gap-4 rounded-lg p-6 outline -outline-offset-1 outline-border">{children}</section>;
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg bg-surface-2 p-2">
      <span className="text-[12px] leading-[1.2] text-ink-2">{label}</span>
      <span className="truncate text-[14px] leading-[1.2] text-ink">{value}</span>
    </div>
  );
}

/**
 * Figma "Proposals and offers / Review proposal · objectives" (node 11338-10290): a 1100×800
 * dialog split 660 / 440 — the proposal scrolls on the left above its own action bar, and the
 * objective you pick opens on the right, full height.
 *
 * The first cut of this was a 512px single column: objective titles as flat rows, with the
 * key results, their targets, the trial expectation, the attachment and the role terms all
 * missing — which is most of what a Team Builder is judging.
 */
export function ProposalReview({
  person,
  role,
  proposal,
  onClose,
  actions,
}: {
  person: Independent;
  role: Role;
  proposal: Proposal;
  onClose: () => void;
  actions: ReactNode;
}) {
  const [openObjective, setOpenObjective] = useState(0);
  /** Which key result is expanded within the chosen objective; the first starts open. */
  const [openKr, setOpenKr] = useState(0);
  const objective = proposal.objectives[openObjective];
  const contract = role.type === "trial" ? "Trial" : "Full-time";

  return (
    <div className="flex max-h-[90vh] flex-col">
      {/* 48px header: role, type, duration, close. */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <span className="text-[16px] leading-[1.5] font-semibold text-ink">{role.title}</span>
        <JobBadge type={role.type} />
        <span className="inline-flex h-6 items-center gap-2 rounded px-2 text-[12px] leading-[1.2] text-ink outline -outline-offset-1 outline-border">
          <Calendar size={14} aria-hidden /> {role.duration}
        </span>
        <button type="button" onClick={onClose} aria-label="Close" className="ml-auto text-ink-2 hover:text-ink">
          <Close size={16} aria-hidden />
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left column: the proposal, with its action bar pinned under it. */}
        <div className="flex w-[660px] min-w-0 shrink-0 flex-col border-r border-border">
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-10">
            <div className="flex flex-col gap-3.5">
              <h3 className="font-display text-[32px] leading-[1.2] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
                Proposal from {person.name}
              </h3>
              <p className="text-[12px] leading-[1.2] text-ink-2">
                {person.name.split(" ")[0]} {person.name.split(" ").at(-1)?.[0]}. Proposal v{proposal.version} · {proposal.sent}
              </p>
            </div>

            <Card>
              <div className="flex items-center gap-3">
                <Avatar src={person.avatar} size={44} />
                <div className="flex min-w-0 flex-1 flex-col leading-[1.3]">
                  <span className="truncate text-[20px] font-semibold text-ink">{person.name}</span>
                  <span className="truncate text-[14px] text-ink-2">{person.role}</span>
                </div>
                <MatchPill pct={person.match} coded title={MATCH_TOOLTIP} />
              </div>
              <span className="h-px w-full bg-border" />
              <div className="flex gap-2">
                <Term label="Rate" value={proposal.rate} />
                <Term label="Contract" value={contract} />
                <Term label="Duration" value={role.duration} />
              </div>
            </Card>

            <Card>
              <p className="text-[16px] leading-[1.5] font-semibold text-ink">Cover letter</p>
              <p className="text-[14px] leading-[1.6] text-ink-2">{proposal.letter}</p>
            </Card>

            <Card>
              <p className="text-[16px] leading-[1.5] font-semibold text-ink">Objectives</p>
              <div className="flex flex-col gap-2">
                {proposal.objectives.map((o, i) => (
                  <button
                    key={o.title}
                    type="button"
                    aria-pressed={i === openObjective}
                    onClick={() => {
                      setOpenObjective(i);
                      setOpenKr(0);
                    }}
                    className={`flex h-12 items-center gap-3 rounded-lg px-3 text-left outline -outline-offset-1 ${i === openObjective ? "bg-accent-bg outline-primary" : "outline-border hover:bg-surface-alt"}`}
                  >
                    <span className={`size-2 shrink-0 rotate-45 ${DIAMOND[o.kind]}`} aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-[14px] leading-[1.2] text-ink">{o.title}</span>
                    <span className="shrink-0 text-[12px] leading-[1.2] text-ink-2">{OBJECTIVE_KIND[o.kind]}</span>
                  </button>
                ))}
              </div>
            </Card>

            {/* The job post's own terms, so the proposal can be read against what was asked for. */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[14px] leading-[1.2] font-semibold text-ink">Trial expectation</p>
              <p className="text-[14px] leading-[1.45] text-ink-2">{role.expectation}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[14px] leading-[1.2] font-semibold text-ink">Attachment</p>
              <a href={role.attachment} target="_blank" rel="noreferrer" className="truncate text-[14px] leading-[1.2] text-primary hover:underline">
                {role.attachment}
              </a>
            </div>
            <dl className="flex flex-col rounded-lg p-3 outline -outline-offset-1 outline-border">
              {(
                [
                  ["ROLE", role.title],
                  ["CONTRACT TYPE", contract],
                  ["BUDGET", role.budget],
                  ["DURATION", role.duration],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 py-1.5 text-[14px] leading-[1.2]">
                  <dt className="text-[12px] font-semibold tracking-[0.4px] text-ink-2">{k}</dt>
                  <dd className="truncate text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex shrink-0 items-center gap-2.5 border-t border-border p-4">{actions}</div>
        </div>

        {/* Right column: the selected objective, full height. */}
        <aside className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-2">
            <Collapse size={20} aria-hidden className="text-ink-2" />
            <span className="text-[16px] leading-[1.5] font-semibold text-ink">Objective</span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            <span className="flex items-center gap-2 text-[13px] leading-[1.2] font-medium text-ink">
              <span className={`size-2.5 rotate-45 ${DIAMOND[objective.kind]}`} aria-hidden />
              {OBJECTIVE_KIND[objective.kind]}
            </span>
            <h4 className="font-display text-[28px] leading-[1.28] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
              {objective.title}
            </h4>
            <p className="text-[14px] leading-[1.45] text-ink-2">{objective.description}</p>

            <p className="pt-2 text-[14px] leading-[1.2] font-semibold text-ink">Key results</p>
            <div className="flex flex-col gap-2">
              {objective.keyResults.map((kr, i) => (
                <div key={kr.title} className="rounded-lg outline -outline-offset-1 outline-border">
                  <button type="button" aria-expanded={i === openKr} onClick={() => setOpenKr(i === openKr ? -1 : i)} className="flex w-full items-center gap-2 p-4 text-left">
                    <span className="min-w-0 flex-1 text-[14px] leading-[1.2] font-medium text-ink">{kr.title}</span>
                    <Chevron size={20} aria-hidden className={`shrink-0 text-ink-2 transition-transform ${i === openKr ? "rotate-180" : ""}`} />
                  </button>
                  {i === openKr && (
                    <div className="flex flex-col gap-4 px-4 pb-4">
                      <p className="text-[13px] leading-[1.45] text-ink-2">{kr.description}</p>
                      {kr.target && <p className="text-[13px] leading-[1.2] text-ink-2">Target: {kr.target}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
