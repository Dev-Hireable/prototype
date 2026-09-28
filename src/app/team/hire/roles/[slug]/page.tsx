"use client";

import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { Suspense, use, useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, Card, Chip, JobBadge, LinkButton, MatchPill, Modal, Page, StatusDot, Tabs, Toast } from "@/components/independent/ui";
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
import type { Candidate, Role as RoleData } from "@/lib/team/data";
import { jobFacts } from "@/lib/demo/job-types";
import { PAIR, unreadChat, useLive } from "@/lib/demo/live";
import { useRoles } from "@/lib/team/roles";
import { usePipeline } from "@/lib/team/pipeline";
import { useQueryState } from "@/lib/portal/query-state";
import { useToast, type SetToast } from "@/lib/portal/toast";
import { stageCanMessage } from "@/lib/demo/deal";
import { ReturnNav, useWithReturn } from "@/components/portal/return";

const H3 = "text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-[#0a0a0a]";
const Message = ICONS.messages;

/** A card's primary buttons, filled and full height. */
const PRIMARY = "h-9 rounded-lg bg-primary text-[13px] leading-[1.2] font-semibold text-white hover:brightness-110";
/** The same, for one that waits on the candidate: greyed while disabled. */
const PRIMARY_WAITS = `${PRIMARY} w-full disabled:cursor-not-allowed disabled:bg-[#e5e5e5] disabled:text-[#c3c3c3]`;
/** Drop and Delete: the one solid red button. */
const DANGER = "h-9 rounded-lg bg-danger text-[13px] leading-[1.2] font-medium text-white hover:bg-danger-hover";

const firstOf = (c: Candidate) => byName(c.independent).name.split(" ")[0];

/** What a card's buttons open: each one's confirmation dialog, never a change on one click. */
type CardActions = { invite: (c: Candidate) => void; complete: (c: Candidate) => void; request: (c: Candidate) => void; review: (c: Candidate) => void; drop: (c: Candidate) => void; remove: (c: Candidate) => void };

export default function RolePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense>
      <Role params={params} />
    </Suspense>
  );
}

/**
 * The candidate tracker, built to TB-037: a seven-column Kanban (Candidates → Dropped) with
 * per-column counts, and a read-only Job Details tab alongside it. Switching tabs keeps the
 * pipeline state because both live in this one component.
 */
function Role({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { candidates } = usePipeline();
  const { roles } = useRoles();
  const dialogs = useCardDialogs(candidates);
  const withReturn = useWithReturn();
  const live = useLive();
  const role = roles.find((r) => r.slug === slug);
  const [tab, setTab] = useQueryState("tab", "candidates", ["candidates", "details"] as const);
  const [toast, setToast] = useToast();
  // The roles hydrate from storage after mount, so wait for this one before looking for columns.
  const { boardRef, setColumn, focused } = useColumnJump(!!role, tab === "candidates");
  if (!role) notFound();

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
          <Board role={role} list={candidates.filter((c) => c.role === role.slug)} unread={unreadChat(live, "team")} boardRef={boardRef} setColumn={setColumn} focused={focused} actions={dialogs.actions} />
        ) : (
          <JobDetails role={role} />
        )}
      </div>
      <BoardDialogs role={role} dialogs={dialogs} onToast={setToast} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** The card each confirmation is open for — a card's buttons open one, never change anything on one click — and those buttons' actions. */
function useCardDialogs(candidates: Candidate[]) {
  /** The card being dropped or undropped, while its confirmation is open (TB-044: never on one click). */
  const [dropping, setDropping] = useState<Candidate | null>(null);
  /** The dropped card being deleted, while its confirmation is open. */
  const [deleting, setDeleting] = useState<Candidate | null>(null);
  /** TB-037 — booking happens on the board, so a first interview is one click from the column. */
  const [inviting, setInviting] = useState<Candidate | null>(null);
  /** The two confirmations in front of a proposal request: the interview is done, then the request. */
  const [completing, setCompleting] = useState<Candidate | null>(null);
  const [requesting, setRequesting] = useState<Candidate | null>(null);
  /** TB-104 — the proposal opens from its card, without a detour through the profile. */
  const [reviewingId, setReviewing] = useState<string | null>(null);
  const actions: CardActions = {
    invite: setInviting,
    complete: setCompleting,
    request: setRequesting,
    review: (c) => setReviewing(c.id),
    drop: setDropping,
    remove: setDeleting,
  };
  return {
    actions,
    dropping,
    setDropping,
    deleting,
    setDeleting,
    inviting,
    setInviting,
    completing,
    setCompleting,
    requesting,
    setRequesting,
    reviewing: candidates.find((x) => x.id === reviewingId),
    setReviewing,
  };
}

type CardDialogs = ReturnType<typeof useCardDialogs>;

/** The confirmations the cards open, each for the card it came from: drop, delete, invite, mark the interview done, request and review the proposal. */
function BoardDialogs({ role, dialogs, onToast }: { role: RoleData; dialogs: CardDialogs; onToast: SetToast }) {
  const { interviews, requestProposal, deleteCandidate, completeInterview } = usePipeline();
  const { dropping, deleting, inviting, completing, requesting, reviewing } = dialogs;
  return (
    <>
      <DropDialog candidate={dropping} role={role.title} onClose={() => dialogs.setDropping(null)} onDone={onToast} />
      {deleting && (
        <DeleteDialog
          candidate={deleting}
          role={role.title}
          onClose={() => dialogs.setDeleting(null)}
          onDelete={() => {
            const name = byName(deleting.independent).name;
            deleteCandidate(deleting.id);
            dialogs.setDeleting(null);
            onToast(`Deleted ${name} from ${role.title}`);
          }}
        />
      )}
      <InterviewDialog candidate={inviting} onClose={() => dialogs.setInviting(null)} onSent={(name) => onToast(`Interview invitation sent to ${name}`)} />
      <CompleteInterviewDialog
        open={!!completing}
        name={completing ? firstOf(completing) : ""}
        when={completing ? interviews.find((i) => i.independent === completing.independent && !i.past)?.when : undefined}
        onClose={() => dialogs.setCompleting(null)}
        onConfirm={() => {
          if (!completing) return;
          completeInterview(completing.id);
          onToast(`Interview with ${firstOf(completing)} marked done`);
          dialogs.setCompleting(null);
        }}
      />
      {/* TB-103 — moves them to Proposal Requested and notifies them to submit one. */}
      <RequestProposalDialog
        open={!!requesting}
        name={requesting ? firstOf(requesting) : ""}
        onClose={() => dialogs.setRequesting(null)}
        onSend={(note) => {
          if (!requesting) return;
          requestProposal(requesting.id, note);
          onToast(`Proposal requested from ${firstOf(requesting)}`);
          dialogs.setRequesting(null);
        }}
      />
      {/* TB-104 — looked up by id, so it follows the candidate as a revision or decline moves them. */}
      {reviewing && <ProposalReviewDialog candidate={reviewing} role={role} open onClose={() => dialogs.setReviewing(null)} onToast={onToast} />}
    </>
  );
}

/**
 * `?stage=` comes from a count on All roles, or a notification: open the board at that column. It
 * scrolls the board so the column sits as close to the middle as the scroll range allows, and frames
 * it for a moment so it's obvious which one was opened.
 */
function useColumnJump(ready: boolean, onBoard: boolean) {
  const focusKey = useSearchParams().get("stage");
  const [focused, setFocused] = useState<string | null>(null);
  const columnRefs = useRef<Record<string, HTMLElement | null>>({});
  const boardRef = useRef<HTMLDivElement>(null);
  const unframe = useRef<ReturnType<typeof setTimeout>>(undefined);
  /** By hand rather than scrollIntoView, which would also scroll the page. */
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
  useEffect(() => {
    if (!ready || !focusKey || !onBoard) return;
    // Next frame: the board has laid out its final width by then.
    const frame = requestAnimationFrame(() => jumpTo(focusKey));
    return () => cancelAnimationFrame(frame);
  }, [ready, focusKey, onBoard, jumpTo]);
  /** Where each column is, for jumpTo to scroll it into the middle. */
  const setColumn = useCallback((key: string, el: HTMLElement | null) => {
    columnRefs.current[key] = el;
  }, []);
  return { boardRef, setColumn, focused };
}

/**
 * TB-037 — the role's candidates by column, with per-column counts. `focused` is the column a
 * `?stage=` link opened, and `setColumn` tells the jump where each column is.
 */
function Board({ role, list, unread, boardRef, setColumn, focused, actions }: { role: RoleData; list: Candidate[]; unread: number; boardRef: RefObject<HTMLDivElement | null>; setColumn: (key: string, el: HTMLElement | null) => void; focused: string | null; actions: CardActions }) {
  /** Trial Ended only means something on a trial role — unless a card is already in it. */
  const columns = TRACKER_COLUMNS.filter((col) => col.key !== "trial_ended" || role.type === "trial" || list.some((c) => c.trialEnded));
  return (
    /* The 40px side and bottom gutters are padding inside the board, so its horizontal bar
       runs along the panel's bottom edge, 8px in, the same as every vertical bar — it used
       to float 48px up with an empty strip under it. At rest the padding still lines the
       columns up with the back link; scrolled, cards fade out at the edge rather than stopping
       short. overflow-y-hidden stops a nested vertical scrollbar. */
    <ScrollFade className="flex min-h-0 w-full min-w-0 flex-1">
      <div ref={boardRef} className="edge-fade flex w-full min-w-0 gap-3 overflow-x-auto overflow-y-hidden px-10 pb-10">
        {columns.map((col) => {
          /** A dropped candidate sits in Dropped (TB-037) and a closed trial in Trial Ended, not their stage's column. */
          const cards = list.filter((c) => columnOf(c) === col.key);
          return (
            <KanbanColumn
              key={col.key}
              ref={(el) => setColumn(col.key, el)}
              label={col.label}
              count={cards.length}
              colors={col}
              unit={["candidate", "candidates"]}
              // The frame lights up round the column a `?stage=` link opened, then fades.
              frame={focused === col.key ? "focused" : "rest"}
              width="min-w-[300px] max-w-[380px] flex-1"
              className="transition-colors duration-500"
            >
              <KanbanList>
                {cards.map((c) => (
                  <CandidateCard key={c.id} c={c} column={col.key} role={role.slug} unread={c.independent === PAIR.independent.slug ? unread : 0} actions={actions} />
                ))}
                {cards.length === 0 && <KanbanEmpty>Nothing here yet</KanbanEmpty>}
              </KanbanList>
            </KanbanColumn>
          );
        })}
      </div>
    </ScrollFade>
  );
}

/** One candidate on the board: who they are, where they stand, and the step their column offers. */
function CandidateCard({ c, column, role, unread, actions }: { c: Candidate; column: string; role: string; unread: number; actions: CardActions }) {
  const p = byName(c.independent);
  // Hired cards go to the trial dashboard; everyone else to their profile.
  const href = c.stage === "hired" ? `/team/independents/${c.independent}` : `/team/hire/roles/${role}/candidates/${c.id}`;
  return (
    <li className={`flex flex-col gap-2.5 rounded-lg bg-white p-3 outline -outline-offset-1 outline-border ${c.dropped ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-2.5">
        <Avatar src={p.avatar} size={36} />
        <Link href={href} className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.25]">
          <span className="truncate text-[14px] font-semibold tracking-[0.2px] text-ink hover:text-primary">{p.name}</span>
          <span className="truncate text-[12px] text-ink-2">{p.role}</span>
        </Link>
        <MessageLink c={c} name={p.name} unread={unread} />
      </div>
      <p className="text-[12px] leading-[1.35] tracking-[0.2px] text-ink-2">
        {p.rate} · {p.level}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <MatchPill pct={p.match} coded title={MATCH_TOOLTIP} />
        {c.dropped ? <StatusDot tone="danger">Dropped</StatusDot> : c.status && <StatusDot tone={c.status.tone}>{c.status.label}</StatusDot>}
      </div>
      <p className="text-[11.5px] leading-[1.2] text-ink-2">{c.status?.meta ?? c.submitted}</p>
      <StageButtons c={c} column={column} actions={actions} />
      {/* TB-044: drop from any stage, undrop back to where they were.
          Hired candidates can't be dropped (TB-037). */}
      {c.dropped ? (
        // Undrop, or delete for good so the Dropped column doesn't pile up.
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => actions.drop(c)} className="h-9 rounded-lg border border-border bg-white text-[13px] leading-[1.2] font-medium text-ink hover:bg-surface-alt">
            Undrop
          </button>
          <button type="button" onClick={() => actions.remove(c)} className={DANGER}>
            Delete
          </button>
        </div>
      ) : (
        c.stage !== "hired" && (
          <button type="button" onClick={() => actions.drop(c)} className={DANGER}>
            Drop
          </button>
        )
      )}
    </li>
  );
}

/**
 * TB-037: unread messages show a red badge on the message icon. The thread opens at the interview
 * invite, for every card — not just the live pair.
 */
function MessageLink({ c, name, unread }: { c: Candidate; name: string; unread: number }) {
  const withReturn = useWithReturn();
  if (!stageCanMessage(c.stage)) {
    return (
      <Tip label="Messaging opens once you invite them to interview">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-ink-2 opacity-50">
          <Message size={16} aria-hidden />
        </span>
      </Tip>
    );
  }
  return (
    <Link href={withReturn("/team/messages")} aria-label={`Message ${name}`} className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-ink hover:bg-surface-alt">
      <Message size={16} aria-hidden />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-none font-semibold text-white"><span className="badge-count">{unread > 9 ? "9+" : unread}</span></span>
      )}
    </Link>
  );
}

/** The step a card's column offers: invite, mark the interview done, request or review the proposal, or review the offer. */
function StageButtons({ c, column, actions }: { c: Candidate; column: string; actions: CardActions }) {
  const withReturn = useWithReturn();
  if (c.dropped) return null;
  const waiting = awaitsApplication(c);
  return (
    <>
      {/* TB-037: book the interview from the column, without opening a profile — once
          they've applied. A match invited to apply hasn't yet, so it waits on them. */}
      {(column === "candidates" || column === "matched") && (
        <Tip label={waiting ? `${firstOf(c)} hasn't applied yet — you can invite them to interview once they do` : undefined} wrap={waiting}>
          <button type="button" disabled={waiting} onClick={() => actions.invite(c)} className={PRIMARY_WAITS}>
            Invite to interview
          </button>
        </Tip>
      )}
      {column === "interview" && <InterviewButton c={c} actions={actions} />}
      {/* TB-104: Review Proposal once they've actually submitted one — it opens right
          here on the board, the same dialog the profile opens — and while a revision
          is out, so its history stays one click away. */}
      {(c.stage === "proposal_sent" || (c.stage === "proposal_requested" && c.status?.label === "Revision requested")) && (
        <button type="button" onClick={() => actions.review(c)} className={PRIMARY}>
          Review Proposal
        </button>
      )}
      {/* TB-037: the sent offer is reviewable but not editable. */}
      {column === "offer" && (
        <LinkButton size="sm" href={withReturn("/team/hire/offers")} className="justify-center">
          Review Sent Offer
        </LinkButton>
      )}
    </>
  );
}

/**
 * TB-103 behind IN-018: the interview is marked done first, and only then can a proposal be
 * requested — each step confirmed in a dialog, never on one click. Before the candidate has
 * confirmed the interview there is nothing to mark.
 */
function InterviewButton({ c, actions }: { c: Candidate; actions: CardActions }) {
  if (c.stage === "interviewed") {
    return (
      <button type="button" onClick={() => actions.request(c)} className={PRIMARY}>
        Request Proposal
      </button>
    );
  }
  // They declined it, or it was cancelled: a new slot is the way on.
  if (needsNewSlot(c)) {
    return (
      <button type="button" onClick={() => actions.invite(c)} className={PRIMARY}>
        Offer a new time
      </button>
    );
  }
  return (
    <Tip label={c.stage === "invited" ? `Waiting for ${firstOf(c)} to confirm the interview` : undefined} wrap={c.stage === "invited"}>
      <button type="button" disabled={c.stage === "invited"} onClick={() => actions.complete(c)} className={PRIMARY_WAITS}>
        Mark interview done
      </button>
    </Tip>
  );
}

/**
 * One 640px column of role cards. Read-only (TB-037). The gutters are inside this scroller too, so
 * its bar sits at the panel's edge like the board's.
 */
function JobDetails({ role }: { role: RoleData }) {
  return (
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
        {/* TB-025 — the trial's tasks, as the job post sets them; each offer carries them as the proposal settles them (TB-105). */}
        {role.type === "trial" && (
          <Card className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-1">
              <h3 className={H3}>Trial tasks</h3>
              <p className="text-[13px] leading-[1.4] text-ink-2">Shared with candidates you match with or invite. Each offer carries them as the proposal settles them, and once it's signed they stay as agreed.</p>
            </div>
            <TaskPlanList tasks={role.tasks ?? []} empty="No trial tasks." />
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
  );
}

/** Deleting a dropped card for good, so the Dropped column doesn't pile up. */
function DeleteDialog({ candidate, role, onClose, onDelete }: { candidate: Candidate; role: string; onClose: () => void; onDelete: () => void }) {
  return (
    <Modal
      open
      tone="danger"
      onClose={onClose}
      title={`Delete ${byName(candidate.independent).name} from this role?`}
      description={`Their card comes off ${role}'s tracker for good, so it can't be undropped. Nothing is sent to ${firstOf(candidate)}, and any past interview stays on the Interviews page.`}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="danger" onClick={onDelete}>
            Delete
          </Button>
        </>
      }
    />
  );
}
