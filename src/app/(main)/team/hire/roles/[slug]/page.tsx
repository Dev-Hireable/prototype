"use client";

import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { Suspense, use, useEffect, useRef, useState } from "react";
import { ICONS } from "@/components/icons";
import { Avatar, Button, Card, Chip, JobBadge, LinkButton, MatchPill, MessageButton, Modal, Page, StatusDot, Tabs, Toast } from "@/components/portal/ui";
import { KanbanColumn, KanbanEmpty, KanbanJump, KanbanList } from "@/components/portal/board";
import { useBoardJump } from "@/components/portal/board-jump";
import { PHONE_BOARD } from "@/components/portal/styles";
import { FactStrip } from "@/components/portal/page-parts";
import { BreadcrumbBack } from "@/components/portal/nav";
import { ScrollFade } from "@/components/portal/scroll-fade";
import { TaskPlanList } from "@/components/portal/tasks/task-plan";
import { Tip } from "@/components/portal/tip";
import { DropDialog } from "@/components/team/drop-dialog";
import { ProfileDrawer, SaveButton } from "@/components/team/ui";
import { InterviewDialog } from "@/components/team/interview-dialog";
import { ProposalReviewDialog } from "@/components/team/proposal-review-dialog";
import { CompleteInterviewDialog, MissedInterviewDialog, RequestProposalDialog } from "@/components/team/interview-steps";
import { MATCH_TOOLTIP } from "@/lib/portal/match";
import { awaitsApplication, byName, columnOf, needsNewSlot, NEW_TIME_REQUESTED, TRACKER_COLUMNS } from "@/lib/team/data";
import type { Candidate, Role as RoleData } from "@/lib/team/data";
import { jobFacts, payFor } from "@/lib/contract/job-types";
import { PAIR, unreadChat, useLive } from "@/lib/demo/live";
import { useRoles } from "@/lib/team/roles";
import { usePipeline } from "@/lib/team/pipeline";
import { useQueryState } from "@/lib/portal/query-state";
import { shortName } from "@/lib/portal/names";
import { useToast, type SetToast } from "@/lib/portal/toast";
import { useDeal } from "@/lib/demo/deal";
import { DEAL_ID } from "@/lib/team/deal-view";
import { ReturnNav, useWithReturn } from "@/components/portal/return";

const H3 = "text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-[#0a0a0a]";
const Message = ICONS.messages;

/** A card's primary buttons, filled and full height. */
const PRIMARY = "h-9 rounded-lg bg-primary text-[13px] leading-[1.2] font-semibold text-white hover:brightness-110";
/** The same, for one that waits on the candidate: greyed while disabled. */
const PRIMARY_WAITS = `${PRIMARY} w-full disabled:cursor-not-allowed disabled:bg-[#e5e5e5] disabled:text-[#c3c3c3]`;
/** A card's quiet second step, beside its main one. */
const SECONDARY = "h-9 rounded-lg border border-border bg-white text-[13px] leading-[1.2] font-medium text-ink hover:bg-surface-alt";
/** Delete, on a declined card: the one solid red button. Decline itself is a red text link (#279). */
const DANGER = "h-9 rounded-lg bg-danger text-[13px] leading-[1.2] font-medium text-white hover:bg-danger-hover";

const firstOf = (c: Candidate) => byName(c.independent).name.split(" ")[0];

/** What a card's buttons open: each one's confirmation dialog, never a change on one click. */
type CardActions = { open: (c: Candidate) => void; invite: (c: Candidate) => void; complete: (c: Candidate) => void; miss: (c: Candidate) => void; request: (c: Candidate) => void; review: (c: Candidate) => void; drop: (c: Candidate) => void; remove: (c: Candidate) => void };

export default function RolePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense>
      <Role params={params} />
    </Suspense>
  );
}

/**
 * The role's pipeline, built to TB-037: a Kanban of its candidates (Applied → Declined) with
 * per-column counts, and a read-only Role details tab alongside it. Switching tabs keeps the
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
  if (!role) notFound();

  return (
    <Page
      title={
        <>
          {role.title} <JobBadge type={role.type} />
        </>
      }
      padded={false}
      nav={<ReturnNav fallback={<BreadcrumbBack href="/team/hire/roles">Back to all roles</BreadcrumbBack>} />}
      navActions={
        tab === "candidates" ? (
          <LinkButton size="md" href={withReturn("/team/discover")} variant="primary">
            Invite Independents
          </LinkButton>
        ) : undefined
      }
      tabs={
        <Tabs
          value={tab}
          onChange={setTab}
          aria-label="Role sections"
          options={[
            { value: "candidates", label: "Candidates" },
            { value: "details", label: "Role details" },
          ]}
        />
      }
    >
      {/* flex-1, not h-full: Page's `padded={false}` slot is a flex column, so the board grows into
          the space under the nav row instead of overflowing by its height. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 pt-4">
        {tab === "candidates" ? (
          <Board role={role} list={candidates.filter((c) => c.role === role.slug)} unread={unreadChat(live, "team")} actions={dialogs.actions} />
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
  /** The card being declined or restored, while its confirmation is open (TB-044: never on one click). */
  const [dropping, setDropping] = useState<Candidate | null>(null);
  /** The declined card being deleted, while its confirmation is open. */
  const [deleting, setDeleting] = useState<Candidate | null>(null);
  /** TB-037 — booking happens on the board, so a first interview is one click from the column. */
  const [inviting, setInviting] = useState<Candidate | null>(null);
  /** The two confirmations in front of a proposal request: the interview is done, then the request. */
  const [completing, setCompleting] = useState<Candidate | null>(null);
  const [requesting, setRequesting] = useState<Candidate | null>(null);
  /** #313 — an interview marked done on its own that didn't happen, while its confirmation is open. */
  const [missing, setMissing] = useState<Candidate | null>(null);
  /** TB-104 — the proposal opens from its card, without a detour through the profile. */
  const [reviewingId, setReviewing] = useState<string | null>(null);
  /** The candidate whose profile is open in the sheet, over the board. */
  const [previewing, setPreviewing] = useState<Candidate | null>(null);
  const actions: CardActions = {
    open: setPreviewing,
    invite: setInviting,
    complete: setCompleting,
    miss: setMissing,
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
    missing,
    setMissing,
    reviewing: candidates.find((x) => x.id === reviewingId),
    previewing,
    setPreviewing,
    setReviewing,
  };
}

type CardDialogs = ReturnType<typeof useCardDialogs>;

/** The confirmations the cards open, each for the card it came from: decline, delete, invite, mark the interview done (or not held), request and review the proposal. */
function BoardDialogs({ role, dialogs, onToast }: { role: RoleData; dialogs: CardDialogs; onToast: SetToast }) {
  const { requestProposal, deleteCandidate } = usePipeline();
  const { dropping, deleting, inviting, requesting, reviewing } = dialogs;
  return (
    <>
      {/* A name opens the profile over the board; its View profile leads on to the candidate's own page. */}
      <CandidateSheet role={role} dialogs={dialogs} />
      <DropDialog candidate={dropping} role={role.title} onClose={() => dialogs.setDropping(null)} onDone={onToast} />
      {deleting && (
        <DeleteDialog
          candidate={deleting}
          onClose={() => dialogs.setDeleting(null)}
          onDelete={() => {
            const name = shortName(byName(deleting.independent).name);
            deleteCandidate(deleting.id);
            dialogs.setDeleting(null);
            onToast(`Deleted ${name} from ${role.title}`);
          }}
        />
      )}
      <InterviewDialog candidate={inviting} onClose={() => dialogs.setInviting(null)} onSent={(name) => onToast(`Interview invitation sent to ${name}`)} />
      <InterviewStepDialogs dialogs={dialogs} onToast={onToast} />
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
 * The interview's two confirmations: marked done before the slot is over (it's done on its own once
 * it has passed), and not held, for one marked done on its own that didn't happen (#313).
 */
function InterviewStepDialogs({ dialogs, onToast }: { dialogs: CardDialogs; onToast: SetToast }) {
  const { interviews, completeInterview, missInterview } = usePipeline();
  const { completing, missing } = dialogs;
  return (
    <>
      <CompleteInterviewDialog
        open={!!completing}
        name={completing ? firstOf(completing) : ""}
        interview={completing ? interviews.find((i) => i.independent === completing.independent && !i.past) : undefined}
        onClose={() => dialogs.setCompleting(null)}
        onConfirm={() => {
          if (!completing) return;
          completeInterview(completing.id);
          onToast(`Interview with ${firstOf(completing)} marked done`);
          dialogs.setCompleting(null);
        }}
      />
      <MissedInterviewDialog
        open={!!missing}
        name={missing ? firstOf(missing) : ""}
        onClose={() => dialogs.setMissing(null)}
        onConfirm={() => {
          if (!missing) return;
          missInterview(missing.id);
          onToast(`Interview with ${firstOf(missing)} marked as not held`);
          dialogs.setMissing(null);
        }}
      />
    </>
  );
}

/** The previewed candidate's profile in a sheet over the board, with Message (every stage has a thread) and Save. */
function CandidateSheet({ role, dialogs }: { role: RoleData; dialogs: CardDialogs }) {
  const { previewing } = dialogs;
  const withReturn = useWithReturn();
  return (
    <ProfileDrawer
      person={previewing ? byName(previewing.independent) : null}
      onClose={() => dialogs.setPreviewing(null)}
      href={() => (previewing ? `/team/hire/roles/${role.slug}/candidates/${previewing.id}` : "")}
      actions={(p) => (
        <>
          {previewing && <MessageButton href={withReturn("/team/messages")} />}
          <SaveButton person={p} />
        </>
      )}
    />
  );
}

/**
 * `?stage=` comes from a count on All roles, or a notification: open the board at that column,
 * scrolled as near the middle as the scroll range allows and framed for a moment so it's obvious
 * which one was opened. Without one, a phone opens at the first column with a candidate in it.
 */
function useColumnJump(start: string | null) {
  const focusKey = useSearchParams().get("stage");
  const { board, jumpTo, current } = useBoardJump(focusKey ? null : start);
  const [focused, setFocused] = useState<string | null>(null);
  const unframe = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(unframe.current), []);
  useEffect(() => {
    if (!focusKey) return;
    // Next frame: the board has laid out its final width by then.
    const frame = requestAnimationFrame(() => {
      if (!jumpTo(focusKey)) return;
      setFocused(focusKey);
      clearTimeout(unframe.current);
      unframe.current = setTimeout(() => setFocused(null), 2500);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusKey, jumpTo]);
  return { board, jumpTo, current, focused };
}

/**
 * TB-037 — the role's candidates by column, with per-column counts; on a phone, a column at a time
 * with a chip per column to jump between them.
 */
function Board({ role, list, unread, actions }: { role: RoleData; list: Candidate[]; unread: number; actions: CardActions }) {
  /** Trial Ended only means something on a trial role — unless a card is already in it. A declined candidate sits in Declined (TB-037) and a closed trial in Trial Ended, not their stage's column. */
  const columns = TRACKER_COLUMNS.filter((col) => col.key !== "trial_ended" || role.type === "trial" || list.some((c) => c.trialEnded)).map((col) => ({ col, cards: list.filter((c) => columnOf(c) === col.key) }));
  const { board, jumpTo, current, focused } = useColumnJump(columns.find((c) => c.cards.length)?.col.key ?? null);
  return (
    <>
      <KanbanJump label="Pipeline stages" columns={columns.map(({ col, cards }) => ({ key: col.key, label: col.label, count: cards.length, colors: col }))} current={current} onJump={jumpTo} />
      {/* The 40px side and bottom gutters are padding inside the board, so its horizontal bar
          runs along the panel's bottom edge, 8px in, the same as every vertical bar — it used
          to float 48px up with an empty strip under it. At rest the padding still lines the
          columns up with the back link; scrolled, cards fade out at the edge rather than stopping
          short. overflow-y-hidden stops a nested vertical scrollbar. */}
      <ScrollFade className="flex min-h-0 w-full min-w-0 flex-1">
        {/* data-tour: the role's tour points at the board and at a candidate's card (@/lib/portal/tours). */}
        <div ref={board} data-tour="role-board" className={`edge-fade flex w-full min-w-0 gap-3 overflow-x-auto overflow-y-hidden px-(--page-gutter) pb-10 max-md:scroll-px-(--page-gutter) ${PHONE_BOARD}`}>
          {columns.map(({ col, cards }) => (
            <KanbanColumn
              key={col.key}
              data-column={col.key}
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
                  <CandidateCard key={c.id} c={c} type={role.type} column={col.key} unread={c.independent === PAIR.independent.slug ? unread : 0} actions={actions} />
                ))}
                {cards.length === 0 && <ColumnEmpty column={col} />}
              </KanbanList>
            </KanbanColumn>
          ))}
        </div>
      </ScrollFade>
    </>
  );
}

/** #268 — what an empty column says it holds; an empty Matched says where matches come from, with the way there. */
function ColumnEmpty({ column }: { column: (typeof TRACKER_COLUMNS)[number] }) {
  const withReturn = useWithReturn();
  return (
    <KanbanEmpty>
      <span className="flex flex-col items-center gap-3">
        {column.empty}
        {column.key === "matched" && (
          <LinkButton size="sm" variant="primary" href={withReturn("/team/discover")}>
            Discover Independents
          </LinkButton>
        )}
      </span>
    </KanbanEmpty>
  );
}

/** One candidate on the board: who they are, where they stand, and the step their column offers. */
function CandidateCard({ c, type, column, unread, actions }: { c: Candidate; type: RoleData["type"]; column: string; unread: number; actions: CardActions }) {
  const p = byName(c.independent);
  const deal = useDeal();
  // The surname stays an initial ("Juan D.") until they're hired.
  const name = c.stage === "hired" ? p.name : shortName(p.name);
  // Once they've proposed, the card reads the pay they proposed, as the offer will (a trial's one total).
  // Before, a full-time or part-time role shows their own monthly rate; a trial shows none, since its
  // pay is one total that only the proposal sets.
  const proposed = c.id === DEAL_ID ? deal?.proposal?.rate : undefined;
  const pay = proposed ? payFor(type, proposed) : type === "trial" ? undefined : p.rate;
  return (
    <li data-tour="candidate" className={`flex flex-col gap-2.5 rounded-lg bg-white p-3 outline -outline-offset-1 outline-border ${c.dropped ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-2.5">
        <Avatar src={p.avatar} size={36} />
        <CardName c={c} name={name} headline={p.role} onOpen={actions.open} />
        <MessageLink name={name} unread={unread} />
      </div>
      <p className="text-[12px] leading-[1.35] tracking-[0.2px] text-ink-2">{pay ? `${pay} · ${p.level}` : p.level}</p>
      <div className="flex flex-wrap items-center gap-2">
        <MatchPill pct={p.match} coded title={MATCH_TOOLTIP.team} />
        {c.dropped ? <StatusDot tone="danger">Declined</StatusDot> : c.status && <StatusDot tone={c.status.tone}>{c.status.label}</StatusDot>}
      </div>
      <p className="text-[11.5px] leading-[1.2] text-ink-2">{c.status?.meta ?? c.submitted}</p>
      <StageButtons c={c} column={column} actions={actions} />
      {/* TB-044: decline at any stage, restore to where they were. Hired candidates can't be
          declined (TB-037). Decline is a red text link, so it doesn't vie with the column's step (#279). */}
      {c.dropped ? (
        // Restore, or delete for good so the Declined column doesn't pile up.
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => actions.drop(c)} className={SECONDARY}>
            Restore
          </button>
          <button type="button" onClick={() => actions.remove(c)} className={DANGER}>
            Delete
          </button>
        </div>
      ) : (
        c.stage !== "hired" && (
          <button type="button" onClick={() => actions.drop(c)} className="self-start text-[13px] leading-[1.2] font-medium text-danger hover:underline">
            Decline
          </button>
        )
      )}
    </li>
  );
}

/**
 * A hired card's name goes to their contract; anyone else's opens their profile in a sheet over the
 * board (TB-040), so the pipeline stays where it was.
 */
function CardName({ c, name, headline, onOpen }: { c: Candidate; name: string; headline: string; onOpen: (c: Candidate) => void }) {
  const className = "flex min-w-0 flex-1 flex-col gap-0.5 text-left leading-[1.25]";
  const label = (
    <>
      <span className="truncate text-[14px] font-semibold tracking-[0.2px] text-ink hover:text-primary">{name}</span>
      <span className="truncate text-[12px] text-ink-2">{headline}</span>
    </>
  );
  if (c.stage === "hired")
    return (
      <Link href={`/team/independents/${c.independent}`} className={className}>
        {label}
      </Link>
    );
  return (
    <button type="button" onClick={() => onOpen(c)} className={className}>
      {label}
    </button>
  );
}

/**
 * TB-037: unread messages show a red badge on the message icon. Every card can be messaged: the
 * thread exists from the invite to apply or the application, for every card, not just the live pair.
 */
function MessageLink({ name, unread }: { name: string; unread: number }) {
  const withReturn = useWithReturn();
  return (
    <Link href={withReturn("/team/messages")} aria-label={`Message ${name}`} className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-ink hover:bg-surface-alt">
      <Message size={16} aria-hidden />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-none font-semibold text-white"><span className="badge-count">{unread > 9 ? "9+" : unread}</span></span>
      )}
    </Link>
  );
}

/** The step a card's column offers: invite, mark the interview done, request or review the proposal, review the offer, or open the hire's contract. */
function StageButtons({ c, column, actions }: { c: Candidate; column: string; actions: CardActions }) {
  if (c.dropped) return null;
  const waiting = awaitsApplication(c);
  return (
    <>
      {/* TB-037: book the interview from the column, without opening a profile — once
          they've applied. A match invited to apply hasn't yet, so it waits on them. */}
      {(column === "candidates" || column === "matched") && (
        <Tip label={waiting ? `${firstOf(c)} hasn't applied yet. You can invite them to interview once they do.` : undefined} wrap={waiting}>
          <button type="button" disabled={waiting} onClick={() => actions.invite(c)} className={PRIMARY_WAITS}>
            Invite to interview
          </button>
        </Tip>
      )}
      {column === "interview" && <InterviewButton c={c} actions={actions} />}
      {/* TB-104: Review proposal once they've actually submitted one — it opens right
          here on the board, the same dialog the profile opens — and while a revision
          is out, so its history stays one click away. */}
      {(c.stage === "proposal_sent" || (c.stage === "proposal_requested" && c.status?.label === "Revision requested")) && (
        <button type="button" onClick={() => actions.review(c)} className={PRIMARY}>
          Review proposal
        </button>
      )}
      {/* TB-037: the sent offer is reviewable but not editable: its card on the candidate's page reads it and withdraws it. */}
      {column === "offer" && (
        <LinkButton size="sm" href={`/team/hire/roles/${c.role}/candidates/${c.id}`} className="justify-center">
          Review sent offer
        </LinkButton>
      )}
      {(column === "hired" || column === "trial_ended") && <ContractLink c={c} running={column === "hired"} />}
    </>
  );
}

/** #327 — a hire's way on: the trial's progress while it runs, the contract otherwise (a direct hire, a converted or a closed trial). */
function ContractLink({ c, running }: { c: Candidate; running: boolean }) {
  const withReturn = useWithReturn();
  return (
    <Link href={withReturn(`/team/independents/${c.independent}`)} className={`${PRIMARY} flex items-center justify-center`}>
      {running && c.hiredAs === "trial" ? "Track trial progress" : "Open contract"}
    </Link>
  );
}

/**
 * TB-103 behind IN-018: the interview is marked done first (on its own once its slot has passed, or
 * by hand when they met sooner), and only then can a proposal be requested — each step confirmed in
 * a dialog, never on one click. Before the candidate has confirmed the interview there is nothing
 * to mark. One marked done on its own can still be marked as not held (#313).
 */
function InterviewButton({ c, actions }: { c: Candidate; actions: CardActions }) {
  if (c.stage === "interviewed") {
    return (
      <>
        <button type="button" onClick={() => actions.request(c)} className={PRIMARY}>
          Request proposal
        </button>
        {c.autoDone && (
          <button type="button" onClick={() => actions.miss(c)} className={SECONDARY}>
            Did not happen
          </button>
        )}
      </>
    );
  }
  // They declined it, asked for another time, or it was cancelled: a new slot is the way on.
  if (needsNewSlot(c)) {
    return (
      <button type="button" onClick={() => actions.invite(c)} className={PRIMARY}>
        {c.status?.label === NEW_TIME_REQUESTED ? "Review new time" : "Offer a new time"}
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
    <div className="min-h-0 flex-1 overflow-y-auto px-(--page-gutter) pb-10">
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
          <h3 className={H3}>Pay &amp; details</h3>
          {/* The facts strip the talent's job page shows, so the post reads the same on both sides. */}
          <FactStrip size="sm" cells={jobFacts({ type: role.type, pay: role.budget, duration: role.duration, hours: role.hours, level: role.experience })} />
        </Card>
        {/* TB-025 — the trial's tasks, as the job post sets them; the offer carries them (TB-105). */}
        {role.type === "trial" && (
          <Card className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-1">
              <h3 className={H3}>Trial tasks</h3>
              <p className="text-[13px] leading-[1.4] text-ink-2">Independents see these tasks after you accept their proposal.</p>
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
              <h3 className="font-semibold">{role.type === "trial" ? "Notes (shared with the Independent once hired)" : "Responsibilities"}</h3>
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

/** Deleting a declined card for good, so the Declined column doesn't pile up. */
function DeleteDialog({ candidate, onClose, onDelete }: { candidate: Candidate; onClose: () => void; onDelete: () => void }) {
  const first = firstOf(candidate);
  return (
    <Modal
      open
      tone="danger"
      onClose={onClose}
      title={`Delete ${shortName(byName(candidate.independent).name)} from this role?`}
      description={`This removes ${first} from this role for good. ${first} is not notified.`}
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
