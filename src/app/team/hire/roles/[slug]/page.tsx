"use client";

import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { Suspense, use, useCallback, useEffect, useRef, useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, Card, Chip, JobBadge, LinkButton, MatchPill, Modal, Page, StatusDot, Tabs, Toast, useToast } from "@/components/independent/ui";
import { KanbanColumn, KanbanEmpty, KanbanList } from "@/components/portal/board";
import { FactStrip } from "@/components/portal/PageParts";
import { BreadcrumbBack } from "@/components/portal/nav";
import { ScrollFade } from "@/components/portal/ScrollFade";
import { TaskPlanList } from "@/components/portal/tasks/TaskPlan";
import { Tip } from "@/components/portal/Tip";
import { DropDialog } from "@/components/team/DropDialog";
import { InterviewDialog } from "@/components/team/InterviewDialog";
import { ProposalReviewDialog } from "@/components/team/ProposalReviewDialog";
import { CompleteInterviewDialog, RequestProposalDialog } from "@/components/team/InterviewSteps";
import { Avatar, MATCH_TOOLTIP } from "@/components/team/ui";
import { awaitsApplication, byName, columnOf, needsNewSlot, TRACKER_COLUMNS } from "@/lib/team/data";
import type { Candidate } from "@/lib/team/data";
import { jobFacts } from "@/lib/demo/job-types";
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
  const { roles, candidates, interviews, requestProposal, deleteCandidate, completeInterview } = useDemo();
  /** The card being dropped or undropped, while its confirmation is open (TB-044: never on one click). */
  const [dropping, setDropping] = useState<Candidate | null>(null);
  /** The dropped card being deleted, while its confirmation is open. */
  const [deleting, setDeleting] = useState<Candidate | null>(null);
  const withReturn = useWithReturn();
  /** TB-037 — booking happens on the board, so a first interview is one click from the column. */
  const [inviting, setInviting] = useState<Candidate | null>(null);
  /** The two confirmations in front of a proposal request: the interview is done, then the request. */
  const [completing, setCompleting] = useState<Candidate | null>(null);
  const [requesting, setRequesting] = useState<Candidate | null>(null);
  /** TB-104 — the proposal opens from its card, without a detour through the profile. */
  const [reviewingId, setReviewing] = useState<string | null>(null);
  const reviewing = candidates.find((x) => x.id === reviewingId);
  const live = useLive();
  const role = roles.find((r) => r.slug === slug);
  const [tab, setTab] = useQueryState("tab", "candidates", ["candidates", "details"] as const);
  const [toast, setToast] = useToast();
  const focusKey = useSearchParams().get("stage");
  const [focused, setFocused] = useState<string | null>(null);
  const columnRefs = useRef<Record<string, HTMLElement | null>>({});
  const boardRef = useRef<HTMLDivElement>(null);
  const unframe = useRef<ReturnType<typeof setTimeout>>(undefined);
  /**
   * Scroll the board so a column sits as close to the middle as the scroll range allows, and frame
   * it for a moment so it's obvious which one was opened. By hand rather than scrollIntoView,
   * which would also scroll the page.
   */
  const jumpTo = useCallback((key: string) => {
    const el = columnRefs.current[key];
    const board = boardRef.current;
    if (!el || !board) return;
    const col = el.getBoundingClientRect();
    const box = board.getBoundingClientRect();
    board.scrollTo({ left: board.scrollLeft + col.left - box.left - (board.clientWidth - col.width) / 2, behavior: "smooth" });
    setFocused(key);
    clearTimeout(unframe.current);
    unframe.current = setTimeout(() => setFocused(null), 2500);
  }, []);
  useEffect(() => () => clearTimeout(unframe.current), []);
  // The roles hydrate from storage after mount, so wait for this one before looking for columns.
  const ready = !!role;
  /** `?stage=` comes from a count on All roles, or a notification: open the board at that column. */
  useEffect(() => {
    if (!ready || !focusKey || tab !== "candidates") return;
    // Next frame: the board has laid out its final width by then.
    const frame = requestAnimationFrame(() => jumpTo(focusKey));
    return () => cancelAnimationFrame(frame);
  }, [ready, focusKey, tab, jumpTo]);
  if (!role) notFound();

  const list = candidates.filter((c) => c.role === role.slug);
  const unread = unreadChat(live, "team");

  /** A dropped candidate sits in Dropped (TB-037) and a closed trial in Trial Ended, not their stage's column. */
  const inColumn = (col: (typeof TRACKER_COLUMNS)[number], c: Candidate) => columnOf(c) === col.key;
  /** Trial Ended only means something on a trial role — unless a card is already in it. */
  const columns = TRACKER_COLUMNS.filter((col) => col.key !== "trial_ended" || role.type === "trial" || list.some((c) => c.trialEnded));

  const firstOf = (c: Candidate) => byName(c.independent).name.split(" ")[0];

  return (
    <Page
      title={
        <>
          {role.title} <JobBadge type={role.type} />
        </>
      }
      padded={false}
      nav={<ReturnNav fallback={<BreadcrumbBack href="/team/hire/roles">Back to jobs</BreadcrumbBack>} />}
      navActions={
        tab === "candidates" ? (
          <LinkButton size="md" href={withReturn("/team/discover")} variant="primary">
            Invite independents
          </LinkButton>
        ) : undefined
      }
      tabs={
        <Tabs
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
            <div ref={boardRef} className="edge-fade flex w-full min-w-0 gap-3 overflow-x-auto overflow-y-hidden px-10 pb-10">
              {columns.map((col) => {
                const cards = list.filter((c) => inColumn(col, c));
                return (
                  <KanbanColumn
                    key={col.key}
                    ref={(el) => {
                      columnRefs.current[col.key] = el;
                    }}
                    label={col.label}
                    count={cards.length}
                    colors={col}
                    unit={["candidate", "candidates"]}
                    // The frame lights up round the column a `?stage=` link opened, then fades.
                    frame={focused === col.key ? "focused" : "rest"}
                    width="min-w-[300px] max-w-[380px] flex-1"
                    className="duration-500"
                  >
                    <KanbanList>
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
                                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-none font-semibold text-white"><span className="badge-count">{unread > 9 ? "9+" : unread}</span></span>
                                  )}
                                </Link>
                              ) : (
                                <Tip label="Messaging opens once you invite them to interview">
                                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-ink-2 opacity-50">
                                    <Message size={16} aria-hidden />
                                  </span>
                                </Tip>
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

                            {/* TB-037: book the interview from the column, without opening a profile — once
                                they've applied. A match invited to apply hasn't yet, so it waits on them. */}
                            {!c.dropped && (col.key === "candidates" || col.key === "matched") && (
                              <Tip label={awaitsApplication(c) ? `${firstOf(c)} hasn't applied yet — you can invite them to interview once they do` : undefined} wrap={awaitsApplication(c)}>
                                <button
                                  type="button"
                                  disabled={awaitsApplication(c)}
                                  onClick={() => setInviting(c)}
                                  className="h-9 w-full rounded-lg bg-primary text-[13px] leading-[1.2] font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[#e5e5e5] disabled:text-[#c3c3c3]"
                                >
                                  Invite to interview
                                </button>
                              </Tip>
                            )}
                            {/* TB-103 behind IN-018: the interview is marked done first, and only then can a
                                proposal be requested — each step confirmed in a dialog, never on one click.
                                Before the candidate has confirmed the interview there is nothing to mark. */}
                            {!c.dropped && col.key === "interview" &&
                              (c.stage === "interviewed" ? (
                                <button type="button" onClick={() => setRequesting(c)} className="h-9 rounded-lg bg-primary text-[13px] leading-[1.2] font-semibold text-white hover:brightness-110">
                                  Request Proposal
                                </button>
                              ) : needsNewSlot(c) ? (
                                // They declined it, or it was cancelled: a new slot is the way on.
                                <button type="button" onClick={() => setInviting(c)} className="h-9 rounded-lg bg-primary text-[13px] leading-[1.2] font-semibold text-white hover:brightness-110">
                                  Offer a new time
                                </button>
                              ) : (
                                <Tip label={c.stage === "invited" ? `Waiting for ${firstOf(c)} to confirm the interview` : undefined} wrap={c.stage === "invited"}>
                                  <button
                                    type="button"
                                    disabled={c.stage === "invited"}
                                    onClick={() => setCompleting(c)}
                                    className="h-9 w-full rounded-lg bg-primary text-[13px] leading-[1.2] font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[#e5e5e5] disabled:text-[#c3c3c3]"
                                  >
                                    Mark interview done
                                  </button>
                                </Tip>
                              ))}
                            {/* TB-104: Review Proposal once they've actually submitted one — it opens right
                                here on the board, the same dialog the profile opens — and while a revision
                                is out, so its history stays one click away. */}
                            {!c.dropped && (c.stage === "proposal_sent" || (c.stage === "proposal_requested" && c.status?.label === "Revision requested")) && (
                              <button type="button" onClick={() => setReviewing(c.id)} className="h-9 rounded-lg bg-primary text-[13px] leading-[1.2] font-semibold text-white hover:brightness-110">
                                Review Proposal
                              </button>
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
                              // Undrop, or delete for good so the Dropped column doesn't pile up.
                              <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => setDropping(c)} className="h-9 rounded-lg border border-border bg-white text-[13px] leading-[1.2] font-medium text-ink hover:bg-surface-alt">
                                  Undrop
                                </button>
                                <button type="button" onClick={() => setDeleting(c)} className="h-9 rounded-lg bg-danger text-[13px] leading-[1.2] font-medium text-white hover:bg-danger-hover">
                                  Delete
                                </button>
                              </div>
                            ) : (
                              c.stage !== "hired" && (
                                <button type="button" onClick={() => setDropping(c)} className="h-9 rounded-lg bg-danger text-[13px] leading-[1.2] font-medium text-white hover:bg-danger-hover">
                                  Drop
                                </button>
                              )
                            )}
                          </li>
                        );
                      })}
                      {cards.length === 0 && <KanbanEmpty>Nothing here yet</KanbanEmpty>}
                    </KanbanList>
                  </KanbanColumn>
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
              <Card className="flex flex-col gap-4 p-4">
                <h3 className={H3}>Budget &amp; details</h3>
                {/* The facts strip the talent's job page shows, so the post reads the same on both sides. */}
                <FactStrip size="sm" cells={jobFacts({ type: role.type, pay: role.budget, duration: role.duration, hours: role.hours, level: role.experience })} />
              </Card>
              {/* TB-025 — the trial's tasks, as the job post sets them; each offer starts from them. */}
              {role.type === "trial" && (
                <Card className="flex flex-col gap-4 p-4">
                  <div className="flex flex-col gap-1">
                    <h3 className={H3}>Trial tasks</h3>
                    <p className="text-[13px] leading-[1.4] text-ink-2">Shared with candidates you match with or invite. Each offer starts from these, and you can adjust them per candidate.</p>
                  </div>
                  <TaskPlanList tasks={role.tasks ?? []} empty="No trial tasks yet — add them when you send an offer." />
                </Card>
              )}
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
              <div className="flex flex-col gap-6 text-[14px] leading-[1.2] tracking-[0.2px] text-ink">
                {role.expectation && (
                  <div className="flex flex-col gap-3">
                    <h3 className="font-semibold">{role.type === "trial" ? "Notes for candidates" : "Responsibilities"}</h3>
                    <p className="leading-[1.4] whitespace-pre-line">{role.expectation}</p>
                  </div>
                )}
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
      <DropDialog candidate={dropping} role={role.title} onClose={() => setDropping(null)} onDone={setToast} />
      {deleting && (
        <Modal
          open
          tone="danger"
          onClose={() => setDeleting(null)}
          title={`Delete ${byName(deleting.independent).name} from this role?`}
          description={`Their card comes off ${role.title}'s tracker for good, so it can't be undropped. Nothing is sent to ${firstOf(deleting)}, and any past interview stays on the Interviews page.`}
          footer={
            <>
              <Button size="lg" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button
                size="lg"
                variant="danger"
                onClick={() => {
                  const name = byName(deleting.independent).name;
                  deleteCandidate(deleting.id);
                  setDeleting(null);
                  setToast(`Deleted ${name} from ${role.title}`);
                }}
              >
                Delete
              </Button>
            </>
          }
        />
      )}
      <InterviewDialog candidate={inviting} onClose={() => setInviting(null)} onSent={(name) => setToast(`Interview invitation sent to ${name}`)} />
      <CompleteInterviewDialog
        open={!!completing}
        name={completing ? firstOf(completing) : ""}
        when={completing ? interviews.find((i) => i.independent === completing.independent && !i.past)?.when : undefined}
        onClose={() => setCompleting(null)}
        onConfirm={() => {
          if (!completing) return;
          completeInterview(completing.id);
          setToast(`Interview with ${firstOf(completing)} marked done`);
          setCompleting(null);
        }}
      />
      {/* TB-103 — moves them to Proposal Requested and notifies them to submit one. */}
      <RequestProposalDialog
        open={!!requesting}
        name={requesting ? firstOf(requesting) : ""}
        onClose={() => setRequesting(null)}
        onSend={(note) => {
          if (!requesting) return;
          requestProposal(requesting.id, note);
          setToast(`Proposal requested from ${firstOf(requesting)}`);
          setRequesting(null);
        }}
      />
      {/* TB-104 — looked up by id, so it follows the candidate as a revision or decline moves them. */}
      {reviewing && <ProposalReviewDialog candidate={reviewing} role={role} open onClose={() => setReviewing(null)} onToast={setToast} />}
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
