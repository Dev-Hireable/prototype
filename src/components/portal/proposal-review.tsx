"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { ICON_BUTTON } from "@/components/portal/styles";
import { Avatar, InfoBanner, JobBadge, MatchPill } from "@/components/portal/ui";
import { Badge } from "@/components/portal/badge";
import { LockedTasks } from "@/components/portal/tasks/locked-tasks";
import { TaskPlanList } from "@/components/portal/tasks/task-plan";
import { ScrollFade } from "@/components/portal/scroll-fade";
import { MATCH_TOOLTIP } from "@/lib/portal/match";
import { addWorkingDays, dayLabel, dayRangeLabel, durationDays, fromISODate, trialLength, workingDaysLabel } from "@/lib/portal/dates";
import type { DealProposal, ProposalEvent } from "@/lib/demo/deal";
import { hoursLabel, JOB_TYPE_LABEL, payFor, startLabel } from "@/lib/contract/job-types";
import type { JobType } from "@/lib/contract/job-types";
import type { PlannedTask } from "@/lib/demo/tasks";
// "Juan D." for Juan Dela Cruz: how a version is named.
import { shortName } from "@/lib/portal/names";

const Calendar = ICONS.calendar;
const Close = ICONS.close;

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
  /** Who posted it, named on the talent's locked trial tasks. */
  company?: string;
  /** The talent may read the trial's tasks: an offer has carried them. Until then they read how many there are. */
  tasksShared?: boolean;
};

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`flex flex-col gap-4 rounded-lg bg-white p-6 outline -outline-offset-1 outline-border ${className}`}>{children}</section>;
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 rounded bg-surface-2 p-2 leading-[1.2] tracking-[0.2px]">
      <span className="text-[10px] text-ink-2">{label}</span>
      {/* Wraps rather than cut off: a trial's dates take two lines in a narrow cell. */}
      <span className="text-[14px] [overflow-wrap:anywhere] text-[#101828]">{value}</span>
    </div>
  );
}

/** How long a trial runs, in the working days its clock counts, or when any other role starts. */
const durationOf = (post: ProposalPost, long = false) => {
  if (post.type !== "trial") return startLabel(post.duration);
  const days = durationDays(post.duration);
  return long ? trialLength(days) : workingDaysLabel(days);
};

/**
 * When they'd start (IN-072): the day they proposed (a trial's with the end its working days come
 * to), or, on a proposal from before a start was asked for, the one the role was posted with.
 */
function startOf(post: ProposalPost, proposal: DealProposal): string {
  const start = fromISODate(proposal.start ?? "");
  if (!start) return post.type === "trial" ? "Not given" : startLabel(post.duration);
  if (post.type !== "trial") return dayLabel(start);
  return dayRangeLabel(start, addWorkingDays(start, durationDays(post.duration) - 1));
}

/** What they propose (the pay, when they'd start and, on a part-time role, the hours) beside the role's terms. */
function termsOf(post: ProposalPost, proposal: DealProposal): [string, string][] {
  return [
    ["Pay", payFor(post.type, proposal.rate)],
    ["Contract", JOB_TYPE_LABEL[post.type]],
    ...(post.type === "trial" ? ([["Duration", durationOf(post, true)]] as [string, string][]) : []),
    [post.type === "trial" ? "Dates" : "Start", startOf(post, proposal)],
    ...(post.type === "part-time" ? ([["Hours", hoursLabel(proposal.hours ?? post.hours)]] as [string, string][]) : []),
  ];
}

/**
 * The job post's terms, so the proposal can be read against what was asked for. An ongoing role's
 * START is the day the proposal starts it ("05 Oct 2026"), not the posted "In 2 weeks", which said
 * no date.
 */
function postedOf(post: ProposalPost, proposal: DealProposal): [string, string][] {
  return [
    ["ROLE", post.title],
    ["CONTRACT TYPE", JOB_TYPE_LABEL[post.type]],
    ["PAY", payFor(post.type, post.budget)],
    post.type === "trial" ? ["DURATION", durationOf(post, true)] : ["START", startOf(post, proposal)],
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
    empty: trial ? (team ? "This role has no trial tasks." : "No trial tasks are listed yet.") : team ? `None yet. You add the work once ${first} starts.` : "None yet. The work is added once you start.",
    note: legacy
      ? team
        ? "Sent before the tasks were yours to set."
        : "Sent before the tasks were set by the company."
      : trial
        ? team
          ? `Your trial tasks. ${first} sees them with your offer.`
          : ""
        : "Once the contract starts, new tasks are added as work comes in, and each is approved as it's finished.",
  };
}

/**
 * The proposal itself, exactly as the Team Builder reads it: the talent and their terms, the cover
 * letter, the trial's tasks and the job post it answers. The Review proposal dialog shows it, and the
 * talent's own Review & send step shows the same thing, so both sides see one layout. A proposal is
 * the pay, the start and a cover letter; the tasks are the role's, which the talent reads once an
 * offer carries them. `versions` sits under the heading when there is more than one.
 */
export function ProposalBody({ author, post, proposal, viewer = "team", versions }: { author: ProposalAuthor; post: ProposalPost; proposal: DealProposal; viewer?: ProposalViewer; versions?: ReactNode }) {
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
      {versions}

      <div className="flex flex-col gap-4">
        <AuthorCard author={author} terms={terms} viewer={viewer} />
        <CoverLetter letter={proposal.letter} portfolio={proposal.portfolio} />

        {/* The trial's tasks: the role's own, which the talent reads once an offer carries them. */}
        <TasksCard post={post} proposal={proposal} team={team} first={first} />
      </div>

      {/* The job post it answers. */}
      <PostedJob post={post} proposal={proposal} />
    </div>
  );
}

/** Who sent it — their photo, name, role and match — over the terms they propose. */
function AuthorCard({ author, terms, viewer }: { author: ProposalAuthor; terms: [string, string][]; viewer: ProposalViewer }) {
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
        <MatchPill pct={author.match} coded title={MATCH_TOOLTIP[viewer]} />
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

/**
 * The trial's tasks: how many, the list itself, and where they came from. The talent reads only how
 * many there are until an offer carries them (`post.tasksShared`); a proposal they wrote the tasks
 * for themselves, before the tasks were the Team Builder's to set, lists its own.
 */
function TasksCard({ post, proposal, team, first }: { post: ProposalPost; proposal: DealProposal; team: boolean; first: string }) {
  const legacy = !post.tasks?.length && !!proposal.tasks?.length;
  const listed = (legacy ? proposal.tasks : post.tasks) ?? [];
  const trial = post.type === "trial";
  const locked = !team && trial && !legacy && !post.tasksShared;
  const copy = tasksCopy({ legacy, trial, team, first });
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">{copy.title}</p>
        {listed.length > 0 && !locked && (
          <span className="text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
            {listed.length} {listed.length === 1 ? "task" : "tasks"}
          </span>
        )}
      </div>
      {locked ? <LockedTasks company={post.company ?? "The company"} count={listed.length} /> : <TaskPlanList tasks={listed} empty={copy.empty} />}
      {!locked && copy.note && <p className="text-[12px] leading-[1.35] tracking-[0.2px] text-ink-2">{copy.note}</p>}
    </Card>
  );
}

/** The job post, as published: what it expects, its attachment, and its terms. */
function PostedJob({ post, proposal }: { post: ProposalPost; proposal: DealProposal }) {
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
        {postedOf(post, proposal).map(([k, v]) => (
          <div key={k} className="flex h-5 items-center justify-between gap-4">
            <dt className="font-semibold whitespace-nowrap text-ink-2">{k}</dt>
            <dd className={`truncate ${k === "ROLE" ? "text-accent-ink underline" : "text-ink"}`}>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** What either side's review dialog passes in: the proposal and its versions, and what that side can do there. */
export type ProposalReviewProps = {
  author: ProposalAuthor;
  post: ProposalPost;
  proposal: DealProposal;
  /** The proposal's history, oldest first: each version sent is read off it. */
  history: ProposalEvent[];
  viewer?: ProposalViewer;
  /** The warning across the top of the proposal, e.g. while a revision is outstanding. */
  banner?: ReactNode;
  onClose: () => void;
  /** The action bar under the proposal; none, and there is no bar. */
  actions?: ReactNode;
};

/**
 * TB-104 / TB-106 — reviewing a proposal, the same dialog on both sides: the proposal (ProposalBody)
 * scrolls under a banner and above its action bar. What happens around it (each version sent, a
 * revision asked for with its note, a decline) is logged in the Messages thread with the other side,
 * which opens this dialog again: there's no second chat in here. With more than one version, their
 * bars under the heading open each one.
 */
export function ProposalReview({ author, post, proposal, history, viewer = "team", banner, onClose, actions }: ProposalReviewProps) {
  /** The version open; null follows the latest. */
  const [viewing, setViewing] = useState<number | null>(null);
  const versions = history.flatMap((e) => (e.kind === "proposal" ? [e.proposal] : []));
  const shown = (viewing !== null && versions.find((v) => v.version === viewing)) || proposal;
  const superseded = shown.version !== proposal.version;

  return (
    <div className="flex h-[min(800px,calc(90vh/var(--ui-scale)))] flex-col">
      {/* Header: role, type, duration or start, close. */}
      <ReviewHeader post={post} onClose={onClose} />
      <ProposalPane banner={banner} notice={superseded && <SupersededBanner shown={shown} latest={proposal} onBack={() => setViewing(null)} />} actions={actions}>
        <ProposalBody
          author={author}
          post={post}
          proposal={shown}
          viewer={viewer}
          versions={versions.length > 1 && <Versions versions={versions} author={author} viewing={shown.version} onOpen={(v) => setViewing(v === proposal.version ? null : v)} />}
        />
      </ProposalPane>
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

/** The dialog's body: the banner and any notice across the top, the proposal scrolling under them, and its action bar pinned at the foot. */
function ProposalPane({ banner, notice, actions, children }: { banner?: ReactNode; notice?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* A warning is orange: the warn tokens, its rule a tint of the same. */}
      {banner && (
        <InfoBanner tone="warn" className="shrink-0 border-b border-warn/30">
          {banner}
        </InfoBanner>
      )}
      {notice}

      {/* items-start, so the body keeps its own height and the scroller's bottom padding comes
          after it (stretched, it overflowed its own box and the padding was lost); the edges
          fade while there is more to scroll. */}
      <ScrollFade className="flex min-h-0 flex-1 flex-col">
        <div className="edge-fade flex min-h-0 flex-1 items-start overflow-y-auto px-(--page-gutter) py-8">{children}</div>
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

/** Every version sent, oldest first, a bar each: a bar opens its version, and the open one is ringed. */
function Versions({ versions, author, viewing, onOpen }: { versions: DealProposal[]; author: ProposalAuthor; viewing: number; onOpen: (version: number) => void }) {
  return (
    <section aria-label="Versions" className="flex flex-col gap-2">
      {versions.map((v) => (
        <VersionEntry key={v.version} version={v} author={author} open={v.version === viewing} onOpen={onOpen} />
      ))}
    </section>
  );
}

/** One version's bar: who sent it, its number and the day, on the tile that opens it. */
function VersionEntry({ version: v, author, open, onOpen }: { version: DealProposal; author: ProposalAuthor; open: boolean; onOpen: (version: number) => void }) {
  return (
    // A border, not an outline, and a tile that isn't positioned: a positioned child paints over its
    // parent's outline, which is how the tile's edges went missing. The open version adds a 1px ring
    // outside the border, so it reads 2px without shifting.
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
  );
}
