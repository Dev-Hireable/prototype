"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MdExpandMore, MdKeyboardDoubleArrowLeft, MdKeyboardDoubleArrowRight } from "react-icons/md";
import { ICONS } from "@/components/admin/icons";
import { ICON_BUTTON } from "@/components/portal/styles";
import { InfoBanner, JobBadge, MatchPill } from "@/components/independent/ui";
import { Badge } from "@/components/portal/Badge";
import { TaskPlanList } from "@/components/portal/tasks/TaskPlan";
import { ChatBubble, type Receipt } from "@/components/portal/ChatBubble";
import { CommentBox } from "@/components/portal/CommentBox";
import { ScrollFade } from "@/components/portal/ScrollFade";
import { Tip } from "@/components/portal/Tip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, MATCH_TOOLTIP } from "@/components/team/ui";
import { addWorkingDays, dayLabel, durationDays, fromISODate } from "@/lib/demo/dates";
import type { DealProposal, ProposalEvent } from "@/lib/demo/deal";
import { hoursLabel, JOB_TYPE_LABEL, startLabel } from "@/lib/demo/job-types";
import { readBy, useLive } from "@/lib/demo/live";
import type { JobType } from "@/lib/demo/job-types";
import type { PlannedTask } from "@/lib/demo/tasks";
import { keyed } from "@/lib/portal/keys";
import type { Side } from "@/lib/work/model";
import { describeSuggestion, type SuggestionDecision, type TaskSuggestion } from "@/lib/demo/suggestions";

const Calendar = ICONS.calendar;
const Close = ICONS.close;
const Attach = ICONS.attach;

/** What the composer sends: a note on the proposal (and the thread), or a revision request. */
export type ComposerKind = "message" | "revision";

/** Which side is reading: the Team Builder reviewing it, or the talent who wrote it. */
export type ProposalViewer = "team" | "independent";

/** Who sent it, as both portals know them (the Team Builder's Independent fits as is). */
export type ProposalAuthor = {
  name: string;
  avatar: string;
  role: string;
  match: number;
};

/** The job post it answers, as both portals know it (the Team Builder's Role fits as is). */
export type ProposalPost = {
  title: string;
  type: JobType;
  duration: string;
  budget: string;
  hours?: number;
  expectation?: string;
  attachment?: string;
  tasks?: PlannedTask[];
};

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`flex flex-col gap-4 rounded-lg bg-white p-6 outline -outline-offset-1 outline-border ${className}`}>{children}</section>;
}

/**
 * The talent's suggested changes to the tasks, one per row with their reason. The Team Builder
 * accepts (it goes into the offer's tasks) or ignores each; everyone else reads where each stands.
 */
function Suggestions({ suggestions, decisions, onDecide, team, first }: { suggestions: TaskSuggestion[]; decisions?: Readonly<Record<string, SuggestionDecision>>; onDecide?: (id: string, d: SuggestionDecision) => void; team: boolean; first: string }) {
  const accepted = suggestions.filter((s) => decisions?.[s.id] === "accepted").length;
  return (
    <Card>
      <div className="flex flex-col gap-1">
        <p className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Suggested task changes</p>
        <p className="text-[12px] leading-[1.35] tracking-[0.2px] text-ink-2">
          {team ? `${first} suggested ${suggestions.length === 1 ? "a change" : `${suggestions.length} changes`} to the tasks. Accept or ignore each: the offer carries the tasks as you settle them here.` : "Your suggestions. The company decides; what it accepts goes into the offer's tasks."}
          {accepted > 0 && ` ${accepted} accepted so far.`}
        </p>
      </div>
      <ul className="flex flex-col">
        {suggestions.map((s) => {
          const d = decisions?.[s.id];
          return (
            <li key={s.id} className="flex items-start gap-3 border-t border-[#eeeeee] py-3 first:border-t-0 first:pt-0 last:pb-0">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-[14px] leading-[1.35] text-ink">{describeSuggestion(s)}</p>
                <p className="text-[13px] leading-[1.4] whitespace-pre-line text-ink-2 [overflow-wrap:anywhere]">“{s.note}”</p>
              </div>
              {onDecide && !d ? (
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => onDecide(s.id, "ignored")} className="h-8 rounded-lg border border-border bg-white px-3 text-[13px] font-medium text-ink hover:bg-surface-alt">
                    Ignore
                  </button>
                  <button type="button" onClick={() => onDecide(s.id, "accepted")} className="h-8 rounded-lg bg-primary px-3 text-[13px] font-semibold text-white hover:brightness-110">
                    Accept
                  </button>
                </div>
              ) : (
                <span className="flex shrink-0 items-center gap-2">
                  <Badge tone={d === "accepted" ? "ok" : "neutral"}>{d === "accepted" ? "Accepted" : d === "ignored" ? (team ? "Ignored" : "Not taken") : "Awaiting decision"}</Badge>
                  {/* A decision can be taken back until the offer goes out. */}
                  {onDecide && d && (
                    <button type="button" onClick={() => onDecide(s.id, d === "accepted" ? "ignored" : "accepted")} className="text-[12.5px] font-medium text-accent-ink hover:underline">
                      {d === "accepted" ? "Ignore" : "Accept"}
                    </button>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 rounded bg-surface-2 p-2 leading-[1.2] tracking-[0.2px]">
      <span className="text-[10px] text-ink-2">{label}</span>
      <span className="truncate text-[14px] text-[#101828]">{value}</span>
    </div>
  );
}

/** "23 Sep 2026, 3:04 PM" → "23 Sep 2026 at 3:04 PM"; a day-only stamp from an older deal passes through. */
const when = (at: string) => at.replace(", ", " at ");
/** "Juan D." for Juan Dela Cruz — how a version is named. */
const shortName = (name: string) => {
  const [first, next] = name.split(" ");
  return next ? `${first} ${next[0]}.` : first;
};

/** The Duration / Start term: how long a trial runs, or when any other role starts. */
const durationOf = (post: ProposalPost) => (post.type === "trial" ? post.duration : startLabel(post.duration));

/**
 * When they'd start (IN-072): the day they proposed — a trial's with the end its working days come to
 * — or, on a proposal from before a start was asked for, the one the role was posted with.
 */
function startOf(post: ProposalPost, proposal: DealProposal): string {
  const start = fromISODate(proposal.start ?? "");
  if (!start) return post.type === "trial" ? "Not given" : startLabel(post.duration);
  if (post.type !== "trial") return dayLabel(start);
  return `${dayLabel(start)} → ${dayLabel(addWorkingDays(start, durationDays(post.duration) - 1))}`;
}

/** What they propose — the rate, when they'd start and, on a part-time role, the hours — beside the role's terms. */
function termsOf(post: ProposalPost, proposal: DealProposal): [string, string][] {
  return [
    [post.type === "full-time" ? "Salary" : "Rate", proposal.rate],
    ["Contract", JOB_TYPE_LABEL[post.type]],
    ...(post.type === "trial" ? ([["Duration", post.duration]] as [string, string][]) : []),
    [post.type === "trial" ? "Dates" : "Start", startOf(post, proposal)],
    ...(post.type === "part-time" ? ([["Hours", hoursLabel(proposal.hours ?? post.hours)]] as [string, string][]) : []),
  ];
}

/** The job post as published, so the proposal can be read against what was asked for. */
function postedOf(post: ProposalPost): [string, string][] {
  return [
    ["ROLE", post.title],
    ["CONTRACT TYPE", JOB_TYPE_LABEL[post.type]],
    ["BUDGET", post.budget],
    [post.type === "trial" ? "DURATION" : "START", durationOf(post)],
    ...(post.type === "part-time" && post.hours ? ([["HOURS", hoursLabel(post.hours)]] as [string, string][]) : []),
  ];
}

/**
 * The tasks card's words, by where its tasks came from and who is reading: the title, what it says
 * with none listed, and the note under the list.
 */
function tasksCopy({ legacy, trial, team, first }: { legacy: boolean; trial: boolean; team: boolean; first: string }) {
  return {
    title: legacy ? (team ? "Tasks they proposed" : "Tasks you proposed") : trial ? "Trial tasks" : "Starting tasks",
    empty: trial
      ? team
        ? `Your job post has no trial tasks yet. Add them, then ask ${first} for a revision — the offer carries the tasks the proposal settles.`
        : "No trial tasks are listed yet. They're agreed in the proposal, before any offer."
      : team
        ? `None yet. You add the work once ${first} starts.`
        : "None yet. The work is added once you start.",
    note: legacy
      ? team
        ? "Sent before the tasks were yours to set. The offer carries them as they stand."
        : "Sent before the tasks were set by the company. The offer carries them as they stand."
      : trial
        ? team
          ? `From your job post. The offer carries them as the proposal settles them — with any changes ${first} suggests that you accept; you approve each one as it's finished.`
          : "From the job post. Your rate covers these, and the offer carries them as agreed here."
        : "Once the contract starts, new tasks are added as work comes in, and each is approved as it's finished.",
  };
}

/**
 * The proposal itself, exactly as the Team Builder reads it — the talent and their terms, the cover
 * letter, the tasks it prices and the job post it answers. The Review proposal dialog shows it on its
 * left, and the talent's own Review & send step shows the same thing, so both sides see one layout.
 */
export function ProposalBody({
  author,
  post,
  proposal,
  viewer = "team",
  decisions,
  onDecide,
}: {
  author: ProposalAuthor;
  post: ProposalPost;
  proposal: DealProposal;
  viewer?: ProposalViewer;
  /** TB-106 — the Team Builder's answer to each task suggestion so far. */
  decisions?: Readonly<Record<string, SuggestionDecision>>;
  /** The Team Builder's buttons; without it each suggestion reads as it stands. */
  onDecide?: (id: string, decision: SuggestionDecision) => void;
}) {
  const first = author.name.split(" ")[0];
  const team = viewer === "team";
  const terms = termsOf(post, proposal);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h3 className="font-display text-[32px] leading-[1.5] font-semibold text-black" style={{ fontVariationSettings: '"opsz" 14' }}>
          Proposal from {author.name}
        </h3>
        <p className="text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
          {shortName(author.name)} Proposal v{proposal.version} · {proposal.sent}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <AuthorCard author={author} terms={terms} />
        <CoverLetter letter={proposal.letter} portfolio={proposal.portfolio} />

        {/* The work the proposal prices: the task list. */}
        <TasksCard post={post} proposal={proposal} team={team} first={first} />

        {/* IN-073 / TB-106 — changes to the tasks the talent suggested in this revision; the Team Builder decides. */}
        {!!proposal.suggestions?.length && <Suggestions suggestions={proposal.suggestions} decisions={decisions} onDecide={onDecide} team={team} first={first} />}
      </div>

      {/* The job post it answers. */}
      <PostedJob post={post} />
    </div>
  );
}

/** Who sent it — their photo, name, role and match — over the terms they propose. */
function AuthorCard({ author, terms }: { author: ProposalAuthor; terms: [string, string][] }) {
  return (
    <Card className="!gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar src={author.avatar} size={44} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[20px] leading-[1.5] font-semibold tracking-[0.4px] text-ink">{author.name}</span>
            <span className="truncate text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">{author.role}</span>
          </div>
        </div>
        <MatchPill pct={author.match} coded title={MATCH_TOOLTIP} />
      </div>
      <span className="my-2 h-px w-full bg-border" />
      <div className="flex gap-2">
        {terms.map(([label, value]) => (
          <Term key={label} label={label} value={value} />
        ))}
      </div>
    </Card>
  );
}

/** The cover letter as written, with the portfolio link under it when there is one. */
function CoverLetter({ letter, portfolio }: { letter: string; portfolio?: string }) {
  return (
    <Card>
      <p className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Cover letter</p>
      <p className="text-[14px] leading-[1.2] tracking-[0.2px] whitespace-pre-line [overflow-wrap:anywhere] text-ink">{letter}</p>
      {/* The work samples the talent linked. */}
      {portfolio && (
        <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">
          Portfolio:{" "}
          <a href={/^https?:\/\//.test(portfolio) ? portfolio : `https://${portfolio}`} target="_blank" rel="noreferrer" className="text-accent-ink hover:underline">
            {portfolio}
          </a>
        </p>
      )}
    </Card>
  );
}

/** The tasks the proposal prices: how many, the list itself, and where they came from. */
function TasksCard({ post, proposal, team, first }: { post: ProposalPost; proposal: DealProposal; team: boolean; first: string }) {
  /** The job post's tasks; a proposal from before they were the Team Builder's to set lists its own. */
  const legacy = !post.tasks?.length && !!proposal.tasks?.length;
  const listed = (legacy ? proposal.tasks : post.tasks) ?? [];
  const copy = tasksCopy({ legacy, trial: post.type === "trial", team, first });
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">{copy.title}</p>
        {listed.length > 0 && (
          <span className="text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
            {listed.length} {listed.length === 1 ? "task" : "tasks"}
          </span>
        )}
      </div>
      <TaskPlanList tasks={listed} empty={copy.empty} />
      <p className="text-[12px] leading-[1.35] tracking-[0.2px] text-ink-2">{copy.note}</p>
    </Card>
  );
}

/** The job post, as published: what it expects, its attachment, and its terms. */
function PostedJob({ post }: { post: ProposalPost }) {
  return (
    <div className="flex flex-col gap-6 text-[14px] leading-[1.2] tracking-[0.2px]">
      {post.expectation && (
        <div className="flex flex-col gap-3">
          <p className="font-semibold text-ink">{post.type === "trial" ? "Trial expectation" : "Responsibilities"}</p>
          <p className="whitespace-pre-line [overflow-wrap:anywhere] text-ink">{post.expectation}</p>
        </div>
      )}
      {post.attachment && (
        <div className="flex flex-col gap-3">
          <p className="font-semibold text-ink">Attachment</p>
          <a href={post.attachment} target="_blank" rel="noreferrer" className="truncate text-accent-ink hover:underline">
            {post.attachment}
          </a>
        </div>
      )}
      <dl className="flex flex-col gap-3 rounded-lg bg-surface-2 p-3 outline -outline-offset-1 outline-border">
        {postedOf(post).map(([k, v]) => (
          <div key={k} className="flex h-5 items-center justify-between gap-4">
            <dt className="font-semibold whitespace-nowrap text-ink-2">{k}</dt>
            <dd className={`truncate ${k === "ROLE" ? "text-accent-ink underline" : "text-ink"}`}>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** What either side's review dialog passes in: the proposal and its history, and what that side can do there. */
export type ProposalReviewProps = {
  author: ProposalAuthor;
  post: ProposalPost;
  proposal: DealProposal;
  history: ProposalEvent[];
  viewer?: ProposalViewer;
  /** The other side, named under their notes: the company for the talent; the talent's first name by default. */
  counterpart?: string;
  /** The warning across the top of the proposal, e.g. while a revision is outstanding. */
  banner?: ReactNode;
  onClose: () => void;
  /** The action bar under the proposal; none, and there is no bar. */
  actions?: ReactNode;
  /** Whether the Team Builder's composer may send a revision request right now. */
  canRevise?: boolean;
  onSend: (kind: ComposerKind, text: string) => void;
  onAttach?: (file: File) => void;
  /** TB-106 — answers to the talent's task suggestions, and the Team Builder's way to give them. */
  decisions?: Readonly<Record<string, SuggestionDecision>>;
  onDecide?: (id: string, decision: SuggestionDecision) => void;
};

/**
 * TB-104 / TB-106 — reviewing a proposal: a 1100px
 * dialog split 660 / 440, the same on both sides. The proposal (ProposalBody) scrolls on the left
 * under a banner and above its action bar. On the right, Activity: the proposal's history — each
 * version (open one to read it), every revision request and note — with a composer at the foot.
 * The Team Builder's composer sends a message or a revision request; the talent's sends a message.
 * Each side's own notes sit on the right of the feed. » in the Activity header folds it to a slim
 * rail, whose « brings it back.
 */
export function ProposalReview({ author, post, proposal, history, viewer = "team", counterpart, banner, onClose, actions, canRevise = false, onSend, onAttach, decisions, onDecide }: ProposalReviewProps) {
  /** The version open on the left; null follows the latest. */
  const [viewing, setViewing] = useState<number | null>(null);
  const [activityOpen, setActivityOpen] = useState(true);

  const versions = history.flatMap((e) => (e.kind === "proposal" ? [e.proposal] : []));
  const shown = (viewing !== null && versions.find((v) => v.version === viewing)) || proposal;
  const superseded = shown.version !== proposal.version;
  /** The Activity header (and the folded rail's) matches the banner's height when there is one. */
  const headerHeight = banner ? "h-[53px]" : "h-[49px]";

  return (
    <div className="flex h-[min(800px,calc(90vh/var(--ui-scale)))] flex-col">
      {/* Header: role, type, duration or start, close. */}
      <ReviewHeader post={post} onClose={onClose} />

      <div className="flex min-h-0 flex-1">
        {/* Left: the proposal, with its action bar pinned under it. */}
        <ProposalPane withActivity={activityOpen} banner={banner} notice={superseded && <SupersededBanner shown={shown} latest={proposal} onBack={() => setViewing(null)} />} actions={actions}>
          {/* Only the latest version's suggestions can be answered; an older one's read as they stood. */}
          <ProposalBody author={author} post={post} proposal={shown} viewer={viewer} decisions={decisions} onDecide={superseded ? undefined : onDecide} />
        </ProposalPane>

        {/* Activity, or — folded away — a slim rail with the button that brings it back. With a banner
            across the proposal, the header takes its height (16 + 20 + 16, and the border), so the
            two bottom edges run as one line across the dialog. */}
        {!activityOpen ? (
          <aside className="flex w-12 shrink-0 flex-col items-center border-l border-border bg-surface-2" aria-label="Activity">
            <div className={`flex w-full shrink-0 items-center justify-center border-b border-border bg-white ${headerHeight}`}>
              <FoldButton label="Show activity" onClick={() => setActivityOpen(true)}>
                <MdKeyboardDoubleArrowLeft size={16} aria-hidden />
              </FoldButton>
            </div>
          </aside>
        ) : (
          <aside className="flex w-[440px] shrink-0 flex-col border-l border-border bg-surface-2" aria-label="Activity">
            <div className={`flex shrink-0 items-center justify-between gap-2 border-b border-border bg-white px-4 ${headerHeight}`}>
              <span className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Activity</span>
              <FoldButton label="Hide activity" onClick={() => setActivityOpen(false)}>
                <MdKeyboardDoubleArrowRight size={16} aria-hidden />
              </FoldButton>
            </div>
            <ActivityFeed history={history} author={author} viewer={viewer} counterpart={counterpart ?? author.name.split(" ")[0]} viewing={shown.version} onOpen={(v) => setViewing(v === proposal.version ? null : v)} />
            <Composer viewer={viewer} canRevise={canRevise} onSend={onSend} onAttach={onAttach} />
          </aside>
        )}
      </div>
    </div>
  );
}

/** The dialog's header: the role, its contract type, how long it runs or when it starts, and Close. */
function ReviewHeader({ post, onClose }: { post: ProposalPost; onClose: () => void }) {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
      <span className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{post.title}</span>
      <JobBadge type={post.type} />
      <Badge variant="outline" icon={<Calendar aria-hidden />}>
        {durationOf(post)}
      </Badge>
      <button type="button" onClick={onClose} aria-label="Close" className={`${ICON_BUTTON} -m-1.5 ml-auto size-8`}>
        <Close size={16} aria-hidden />
      </button>
    </header>
  );
}

/**
 * The dialog's left side, 660 beside Activity or the whole width once it's folded: the banner and any
 * notice across the top, the proposal scrolling under them, and its action bar pinned at the foot.
 */
function ProposalPane({ withActivity, banner, notice, actions, children }: { withActivity: boolean; banner?: ReactNode; notice?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className={`flex min-w-0 flex-col ${withActivity ? "w-[660px] shrink-0" : "flex-1"}`}>
      {banner && (
        <InfoBanner tone="warn" className="shrink-0 border-b border-[#f2c94c]">
          {banner}
        </InfoBanner>
      )}
      {notice}

      {/* items-start, so the body keeps its own height and the scroller's bottom padding comes
          after it (stretched, it overflowed its own box and the padding was lost); the edges
          fade while there is more to scroll. */}
      <ScrollFade className="flex min-h-0 flex-1 flex-col">
        <div className="edge-fade flex min-h-0 flex-1 items-start overflow-y-auto px-10 py-8">{children}</div>
      </ScrollFade>

      {actions && <div className="flex shrink-0 items-center gap-2.5 border-t border-border p-4">{actions}</div>}
    </div>
  );
}

/** Over an older version: which one it is and when it was sent, with the way back to the latest. */
function SupersededBanner({ shown, latest, onBack }: { shown: DealProposal; latest: DealProposal; onBack: () => void }) {
  return (
    <InfoBanner className="shrink-0">
      <span className="flex items-center justify-between gap-3">
        You&apos;re reading v{shown.version}, sent {shown.sent}. v{latest.version} is the latest.
        <button type="button" onClick={onBack} className="font-semibold whitespace-nowrap hover:underline">
          Back to v{latest.version}
        </button>
      </span>
    </InfoBanner>
  );
}

/** Activity's « and », named on hover: they fold the pane to its rail and bring it back. */
function FoldButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tip label={label} side="left">
      <button type="button" aria-label={label} onClick={onClick} className="flex size-6 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink">
        {children}
      </button>
    </Tip>
  );
}

/** The proposal's history, oldest first, kept scrolled to its foot as new entries arrive. */
function ActivityFeed({ history, author, viewer, counterpart, viewing, onOpen }: { history: ProposalEvent[]; author: ProposalAuthor; viewer: ProposalViewer; counterpart: string; viewing: number; onOpen: (version: number) => void }) {
  const feedRef = useRef<HTMLDivElement>(null);

  // New entries land at the foot of the feed; keep it scrolled there as they arrive.
  useEffect(() => {
    const feed = feedRef.current;
    if (feed) feed.scrollTop = feed.scrollHeight;
  }, [history.length]);

  /**
   * A note's sent / seen receipt: it went out as a chat message too, so it's read when that message
   * is — the same tick Messages shows. Notes from before they were linked to the thread have none.
   */
  const live = useLive();
  const other: Side = viewer === "team" ? "independent" : "team";
  const receiptOf = (e: ProposalEvent): Receipt | undefined => {
    if (e.kind !== "comment" || !e.chatId) return undefined;
    const i = live.chat.findIndex((m) => m.id === e.chatId);
    return i >= 0 && readBy(live, other, i) ? "seen" : "sent";
  };

  return (
    <ScrollFade className="flex min-h-0 flex-1 flex-col">
      <div ref={feedRef} className="edge-fade flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pt-4 pb-6">
        {history.length === 0 && <p className="text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">Nothing yet.</p>}
        {keyed(history, (e) => `${e.kind}-${e.at}`).map(({ item: e, key }) => (
          <ActivityEntry key={key} event={e} author={author} viewer={viewer} counterpart={counterpart} receipt={receiptOf(e)} viewing={viewing} onOpen={onOpen} />
        ))}
      </div>
    </ScrollFade>
  );
}

/** One line of the proposal's history. */
function ActivityEntry({
  event,
  author,
  viewer,
  counterpart,
  receipt,
  viewing,
  onOpen,
}: {
  event: ProposalEvent;
  author: ProposalAuthor;
  viewer: ProposalViewer;
  counterpart: string;
  /** A note's receipt, read off the chat message it went out as. */
  receipt?: Receipt;
  viewing: number;
  onOpen: (version: number) => void;
}) {
  if (event.kind === "proposal") return <VersionEntry version={event.proposal} at={event.at} author={author} open={event.proposal.version === viewing} onOpen={onOpen} />;
  if (event.kind === "declined")
    return (
      <div className="flex flex-col gap-2">
        <Meta label="Proposal declined" at={event.at} />
        {event.reason && <p className="pl-3 text-[14px] leading-[1.2] tracking-[0.2px] text-ink">{event.reason}</p>}
      </div>
    );
  // A note is a chat message, drawn as Messages draws it: the reader's own in blue on the right with
  // its sent / seen receipt, the other side's in white on the left.
  if (event.kind === "comment")
    return (
      <div className={`flex ${event.by === viewer ? "justify-end" : "justify-start"}`}>
        <ChatBubble mine={event.by === viewer} time={when(event.at)} receipt={receipt} className="max-w-80">
          <span>{event.text}</span>
        </ChatBubble>
      </div>
    );
  // A revision request (always the Team Builder's) keeps its 320px card, on the same side.
  return <RevisionEntry note={event.note} at={event.at} mine={viewer === "team"} counterpart={counterpart} />;
}

/** A version in the history: submitted or resubmitted, and when, over the tile that opens it on the left. */
function VersionEntry({ version: v, at, author, open, onOpen }: { version: DealProposal; at: string; author: ProposalAuthor; open: boolean; onOpen: (version: number) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <Meta label={v.version > 1 ? "Proposal resubmitted" : "Proposal submitted"} at={at} />
      {/* A border, not an outline, and a tile that isn't positioned: a positioned child paints over
          its parent's outline, which is how the tile's edges went missing. The open version adds a
          1px ring outside the border, so it reads 2px without shifting. */}
      <button
        type="button"
        onClick={() => onOpen(v.version)}
        aria-pressed={open}
        className={`flex items-center overflow-hidden rounded-lg border bg-white text-left transition ${open ? "border-primary shadow-[0_0_0_1px_var(--color-primary)]" : "border-border hover:border-ink-2"}`}
      >
        <span className="flex h-14 w-20 shrink-0 justify-center overflow-hidden pt-4">
          {/* The proposal tile: the 52px document glyph from 16px down, cropped by the 56px tile. */}
          <Image src="/icons/proposal/document.svg" alt="" width={52} height={52} className="size-[52px] max-w-none shrink-0" />
        </span>
        <span className="flex-1 text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">
          {shortName(author.name)} Proposal v{v.version} · {v.sent}
        </span>
      </button>
    </div>
  );
}

/** A revision request in the history: its note in a 320px card, then who asked for it and when. */
function RevisionEntry({ note, at, mine, counterpart }: { note: string; at: string; mine: boolean; counterpart: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${mine ? "items-end" : "items-start"}`}>
      <div className="flex w-80 flex-col overflow-hidden rounded-lg bg-white outline -outline-offset-1 outline-border">
        <p className="border-b border-border px-4 pt-4 pb-3 text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Revision request</p>
        <p className="px-4 pt-3 pb-4 text-[14px] leading-[1.2] tracking-[0.2px] whitespace-pre-line [overflow-wrap:anywhere] text-ink">{note}</p>
      </div>
      {/* Who asked for it and when. */}
      <span className="text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
        {mine ? "You" : counterpart} · {when(at)}
      </span>
    </div>
  );
}

function Meta({ label, at }: { label: string; at: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
      <span className="size-1 shrink-0 rounded-full bg-ink-2" aria-hidden />
      <span className="flex-1">{label}</span>
      <span>{when(at)}</span>
    </div>
  );
}

const KIND_LABEL: Record<ComposerKind, string> = {
  message: "Message",
  revision: "Revision request",
};

/**
 * The foot of Activity: the shared CommentBox, with attach and — for the Team Builder — what it
 * sends: a message, or a revision request when one can be asked for.
 */
function Composer({
  viewer,
  canRevise,
  onSend,
  onAttach,
}: {
  viewer: ProposalViewer;
  canRevise: boolean;
  onSend: (kind: ComposerKind, text: string) => void;
  onAttach?: (file: File) => void;
}) {
  const [picked, setKind] = useState<ComposerKind>("message");
  const kind = picked === "revision" && !canRevise ? "message" : picked;

  return (
    <div className="shrink-0 border-t border-border bg-surface-2 p-4">
      <CommentBox
        label={kind === "revision" ? "What should change?" : "Add a comment"}
        placeholder={kind === "revision" ? "What should change?" : "Add a comment..."}
        sendLabel={kind === "revision" ? "Send revision request" : "Send"}
        onSend={(text) => {
          onSend(kind, text);
          setKind("message");
        }}
        tools={
          <>
            {onAttach && <AttachTool onAttach={onAttach} divider={viewer === "team"} />}
            {/* The Team Builder picks what it sends; the talent's only sends a message, so there's nothing to pick. */}
            {viewer === "team" && <KindMenu kind={kind} canRevise={canRevise} onPick={setKind} />}
          </>
        }
      />
    </div>
  );
}

/** Attach a file: the paperclip opens the file picker and hands on what's picked; `divider` rules it off from what follows. */
function AttachTool({ onAttach, divider }: { onAttach: (file: File) => void; divider: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Tip label="Attach a file">
        <button type="button" aria-label="Attach a file" onClick={() => fileRef.current?.click()} className="flex size-6 items-center justify-center rounded-[4.8px] text-ink-2 hover:bg-surface-2 hover:text-ink">
          <Attach size={15} aria-hidden />
        </button>
      </Tip>
      <input
        ref={fileRef}
        type="file"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onAttach(file);
          e.target.value = "";
        }}
      />
      {divider && <span className="h-4 w-px bg-border" aria-hidden />}
    </>
  );
}

/** What the Team Builder's composer sends: a message, or a revision request while one can be asked for. */
function KindMenu({ kind, canRevise, onPick }: { kind: ComposerKind; canRevise: boolean; onPick: (kind: ComposerKind) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 rounded px-2 py-1 text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2 hover:bg-surface-2 data-popup-open:bg-surface-2">
        {KIND_LABEL[kind]}
        <MdExpandMore size={16} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" style={{ width: 200 }}>
        <DropdownMenuItem onClick={() => onPick("message")} className="px-3 py-2 text-[13px] text-ink">
          Message
        </DropdownMenuItem>
        <Tip label={canRevise ? undefined : "A revision can be asked for once per version"} wrap={!canRevise} wrapClassName="w-full">
          <DropdownMenuItem disabled={!canRevise} onClick={() => onPick("revision")} className="w-full px-3 py-2 text-[13px] text-ink">
            Revision request
          </DropdownMenuItem>
        </Tip>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
