"use client";

import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { Suspense, use, useEffect, useRef, useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { BackLink, Card, Chip, JobBadge, KeyValue, LinkButton, MatchPill, Page, StatusDot, Tabs, Toast, useToast, WorkStyleChart } from "@/components/independent/ui";
import { ScrollFade } from "@/components/portal/ScrollFade";
import { InterviewDialog } from "@/components/team/InterviewDialog";
import { Avatar, MATCH_TOOLTIP } from "@/components/team/ui";
import { byName, TRACKER_COLUMNS } from "@/lib/team/data";
import type { Candidate } from "@/lib/team/data";
import { PAIR, unreadChat, useLive } from "@/lib/demo/live";
import { useDemo } from "@/lib/team/store";
import { useQueryState } from "@/lib/portal/query-state";
import { stageCanMessage } from "@/lib/demo/deal";
import { ReturnNav, useWithReturn } from "@/components/portal/return";

const H3 = "text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-[#0a0a0a]";
const Message = ICONS.messages;

export default function RolePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense>
      <Role params={params} />
    </Suspense>
  );
}

/**
 * Figma "Candidate tracker / Trial · Full-time", built to TB-037: a seven-column Kanban
 * (Candidates → Dropped) with per-column counts, and a read-only Job Details tab alongside it.
 * Switching tabs keeps the pipeline state because both live in this one component.
 */
function Role({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { roles, candidates, setStage, setDropped } = useDemo();
  const withReturn = useWithReturn();
  /** TB-037 — booking happens on the board, so a first interview is one click from the column. */
  const [inviting, setInviting] = useState<Candidate | null>(null);
  const live = useLive();
  const role = roles.find((r) => r.slug === slug);
  const [tab, setTab] = useQueryState("tab", "candidates", ["candidates", "details"] as const);
  const [toast, setToast] = useToast();
  /**
   * `?stage=` comes from a count on All roles: scroll the board so that column sits as close to
   * the middle as the scroll range allows, and frame it for a moment so it's obvious which one
   * was opened. Scrolled by hand rather than scrollIntoView, which would also scroll the page.
   */
  const focusKey = useSearchParams().get("stage");
  const [focused, setFocused] = useState<string | null>(null);
  const columnRefs = useRef<Record<string, HTMLElement | null>>({});
  // The roles hydrate from storage after mount, so wait for this one before looking for columns.
  const ready = !!role;
  useEffect(() => {
    if (!ready || !focusKey || tab !== "candidates") return;
    // Next frame: the board has laid out its final width by then.
    const frame = requestAnimationFrame(() => {
      const el = columnRefs.current[focusKey];
      const board = el?.parentElement;
      if (!el || !board) return;
      const col = el.getBoundingClientRect();
      const box = board.getBoundingClientRect();
      board.scrollTo({ left: board.scrollLeft + col.left - box.left - (board.clientWidth - col.width) / 2, behavior: "smooth" });
      setFocused(focusKey);
    });
    const t = setTimeout(() => setFocused(null), 2500);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(t);
    };
  }, [ready, focusKey, tab]);
  if (!role) notFound();

  const list = candidates.filter((c) => c.role === role.slug);
  const workStyle = byName(list[0]?.independent ?? "juan-dela-cruz");
  const unread = unreadChat(live, "team");

  /** A dropped candidate leaves their stage column and sits in Dropped (TB-037). */
  const inColumn = (col: (typeof TRACKER_COLUMNS)[number], c: Candidate) => (col.key === "dropped" ? !!c.dropped : !c.dropped && col.stages.includes(c.stage));

  /** TB-103 — moves them to Proposal Requested and notifies them to submit one. */
  const requestProposal = (c: Candidate) => {
    setStage(c.id, "proposal_requested", { label: "Awaiting proposal", tone: "warn" });
    setToast(`Proposal requested from ${byName(c.independent).name}`);
  };

  return (
    <Page
      title={
        <>
          {role.title} <JobBadge type={role.type} />
        </>
      }
      padded={false}
      nav={<ReturnNav fallback={<BackLink href="/team/hire/roles">Back to jobs</BackLink>} />}
      navActions={
        tab === "candidates" ? (
          <LinkButton size="md" href={withReturn("/team/discover")} variant="primary">
            Invite independents
          </LinkButton>
        ) : undefined
      }
      tabs={
        <Tabs
          className="px-4"
          value={tab}
          onChange={setTab}
          options={[
            { value: "candidates", label: "Candidates" },
            { value: "details", label: "Job Details" },
          ]}
        />
      }
    >
      {/* flex-1, not h-full: Page's `padded={false}` slot is a flex column, so the board grows into
          the space under the nav row instead of overflowing by its height. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 pt-4">
        {tab === "candidates" ? (
          /* The 40px side and bottom gutters are padding inside the board, so its horizontal bar
             runs along the panel's bottom edge, 8px in, the same as every vertical bar — it used
             to float 48px up with an empty strip under it. At rest the padding still lines the
             columns up with the back link; scrolled, cards fade out at the edge rather than stopping
             short. overflow-y-hidden stops a nested vertical scrollbar. */
          <ScrollFade className="flex min-h-0 w-full min-w-0 flex-1">
            <div className="scroll-fade flex w-full min-w-0 gap-2 overflow-x-auto overflow-y-hidden px-10 pb-10">
              {TRACKER_COLUMNS.map((col) => {
                const cards = list.filter((c) => inColumn(col, c));
                return (
                  <section
                    key={col.key}
                    ref={(el) => {
                      columnRefs.current[col.key] = el;
                    }}
                    /* The frame is a real border inside a constant p-1, transparent until focused, so
                       it sits around the header and cards instead of under them and the layout
                       doesn't shift when it appears. */
                    className={`flex h-full min-h-0 w-[320px] shrink-0 flex-col gap-3 rounded-xl border-2 p-1 transition-colors duration-500 ${focused === col.key ? "border-accent-soft bg-accent-bg" : "border-transparent"}`}
                  >
                    <header
                      className="flex items-center justify-between rounded px-3 py-2 text-[14px] leading-[1.2] font-medium tracking-[0.2px]"
                      style={{ background: col.bg, color: col.text }}
                    >
                      {col.label}
                      <span className="min-w-9 rounded p-1 text-center" style={{ background: col.count }}>
                        {cards.length}
                      </span>
                    </header>
                    <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                      {cards.map((c) => {
                        const p = byName(c.independent);
                        const isPair = c.independent === PAIR.independent.slug;
                        // Hired cards go to the trial dashboard; everyone else to their profile.
                        const href = c.stage === "hired" ? `/team/independents/${c.independent}` : `/team/hire/roles/${role.slug}/candidates/${c.id}`;
                        return (
                          <li key={c.id} className={`flex flex-col gap-2.5 rounded-lg bg-white p-3 outline -outline-offset-1 outline-border ${c.dropped ? "opacity-60" : ""}`}>
                            <div className="flex items-start gap-2.5">
                              <Avatar src={p.avatar} size={36} />
                              <Link href={href} className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.25]">
                                <span className="truncate text-[14px] font-semibold tracking-[0.2px] text-ink hover:text-primary">{p.name}</span>
                                <span className="truncate text-[12px] text-ink-2">{p.role}</span>
                              </Link>
                              {/* TB-037: unread messages show a red badge on the message icon. */}
                              {/* The thread opens at the interview invite, for every card — not just the live pair. */}
                              {stageCanMessage(c.stage) ? (
                                <Link href={withReturn("/team/messages")} aria-label={`Message ${p.name}`} className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-ink hover:bg-surface-alt">
                                  <Message size={16} aria-hidden />
                                  {isPair && unread > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-none font-semibold text-white">{unread > 9 ? "9+" : unread}</span>
                                  )}
                                </Link>
                              ) : (
                                <span title="Messaging opens once you invite them to interview" className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-ink-2 opacity-50">
                                  <Message size={16} aria-hidden />
                                </span>
                              )}
                            </div>
                            <p className="text-[12px] leading-[1.35] tracking-[0.2px] text-ink-2">
                              {p.rate} · {p.level}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <MatchPill pct={p.match} coded title={MATCH_TOOLTIP} />
                              {c.dropped ? <StatusDot tone="danger">Dropped</StatusDot> : c.status && <StatusDot tone={c.status.tone}>{c.status.label}</StatusDot>}
                            </div>
                            <p className="text-[11.5px] leading-[1.2] text-ink-2">{c.status?.meta ?? c.submitted}</p>

                            {/* TB-037: book the interview from the column, without opening a profile. */}
                            {!c.dropped && (col.key === "candidates" || col.key === "matched") && (
                              <button type="button" onClick={() => setInviting(c)} className="h-9 rounded-lg bg-primary text-[13px] leading-[1.2] font-semibold text-white hover:brightness-110">
                                Invite to interview
                              </button>
                            )}
                            {/* TB-103: Request Proposal once the interview is under way. */}
                            {!c.dropped && col.key === "interview" && (
                              <button type="button" onClick={() => requestProposal(c)} className="h-9 rounded-lg bg-primary text-[13px] leading-[1.2] font-semibold text-white hover:brightness-110">
                                Request Proposal
                              </button>
                            )}
                            {/* TB-104: Review Proposal once they've actually submitted one. */}
                            {!c.dropped && c.stage === "proposal_sent" && (
                              <LinkButton size="sm" variant="primary" href={`/team/hire/roles/${role.slug}/candidates/${c.id}`} className="justify-center">
                                Review Proposal
                              </LinkButton>
                            )}
                            {/* TB-037: the sent offer is reviewable but not editable. */}
                            {!c.dropped && col.key === "offer" && (
                              <LinkButton size="sm" href={withReturn("/team/hire/offers")} className="justify-center">
                                Review Sent Offer
                              </LinkButton>
                            )}
                            {/* TB-044: drop from any stage, undrop back to where they were.
                                Hired candidates can't be dropped (TB-037). */}
                            {c.dropped ? (
                              <button type="button" onClick={() => setDropped(c.id, false)} className="h-9 rounded-lg border border-border bg-white text-[13px] leading-[1.2] font-medium text-ink hover:bg-surface-alt">
                                Undrop
                              </button>
                            ) : (
                              c.stage !== "hired" && (
                                <button type="button" onClick={() => setDropped(c.id, true)} className="h-9 rounded-lg border border-border bg-white text-[13px] leading-[1.2] font-medium text-ink-2 hover:bg-surface-alt hover:text-danger">
                                  Drop
                                </button>
                              )
                            )}
                          </li>
                        );
                      })}
                      {cards.length === 0 && <li className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-[12px] leading-[1.4] text-ink-2">Nothing here yet</li>}
                    </ul>
                  </section>
                );
              })}
            </div>
          </ScrollFade>
        ) : (
          /* Figma "Right column": one 640px column of role cards. Read-only (TB-037). The gutters
             are inside this scroller too, so its bar sits at the panel's edge like the board's. */
          <div className="min-h-0 flex-1 overflow-y-auto px-10 pb-10">
            <div className="mx-auto flex w-[640px] flex-col gap-4 pb-6">
              <Card className="flex flex-col gap-4 p-4">
                <h2 className="font-display text-[24px] leading-[1.5] font-semibold tracking-[0.2px] text-black" style={{ fontVariationSettings: '"opsz" 14' }}>
                  {role.title}
                </h2>
                <p className="flex items-center gap-2 text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
                  <JobBadge type={role.type} />
                  <StatusDot tone={role.status === "Active" ? "ok" : role.status === "Draft" ? "neutral" : "danger"}>{role.status}</StatusDot>
                  {role.status === "Draft" ? "Not posted yet" : `Posted ${role.updated}`}
                </p>
                <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink">{role.description}</p>
              </Card>
              <Card className="flex flex-col gap-6 p-4">
                <h3 className={H3}>Budget &amp; details</h3>
                <div className="flex gap-2">
                  <KeyValue label="Budget" value={role.budget} />
                  <KeyValue label="Duration" value={role.duration} />
                  <KeyValue label="Experience" value={role.experience} />
                </div>
              </Card>
              <Card className="flex flex-col gap-6 p-4">
                <h3 className={H3}>Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {role.skills.map((s) => (
                    <Chip key={s} size="sm">
                      {s}
                    </Chip>
                  ))}
                </div>
              </Card>
              <WorkStyleChart builder={workStyle.workStyle.builder} independent={workStyle.workStyle.independent} match={workStyle.match} />
              <div className="flex flex-col gap-6 text-[14px] leading-[1.2] tracking-[0.2px] text-ink">
                <div className="flex flex-col gap-3">
                  <h3 className="font-semibold">{role.type === "trial" ? "Trial expectation" : "Responsibilities"}</h3>
                  <p>{role.expectation}</p>
                </div>
                {role.attachment && (
                  <div className="flex flex-col gap-3">
                    <h3 className="font-semibold">Attachment</h3>
                    <a href={role.attachment} target="_blank" rel="noreferrer" className="text-accent-ink">
                      {role.attachment}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <InterviewDialog candidate={inviting} roleTitle={role.title} onClose={() => setInviting(null)} onSent={(name) => setToast(`Interview invitation sent to ${name}`)} />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
