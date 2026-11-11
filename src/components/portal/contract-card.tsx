import Link from "next/link";
import type { ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { Card, JobBadge, Row, TableContent } from "@/components/portal/ui";
import { Badge } from "@/components/portal/badge";
import { Tip } from "@/components/portal/tip";
import { ROW_LINK, TOOLBAR_BUTTON } from "@/components/portal/toolbar";
import { TRAY, TRAY_PANEL } from "@/components/portal/styles";
import { ViewSwitch } from "@/components/portal/view-switch";
import { WorkLegend, WorkMeter } from "@/components/portal/work-progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { CONTRACT_LAYOUTS } from "@/lib/contract/view";
import { daysLeftLabel, startsInLabel } from "@/lib/portal/dates";
import type { JobType } from "@/lib/contract/job-types";
import { taskCounts } from "@/lib/demo/tasks";
import type { Task } from "@/lib/demo/tasks";

const Message = ICONS.messages;
const DM = { fontVariationSettings: '"opsz" 14' } as const;

/** One contract as either layout draws it. */
export type ContractSummary = {
  /** Drawn at the size asked for: 44px on a card, 36px in a row. */
  avatar: (size: number) => ReactNode;
  /** The other party: the independent's name, or the role for the independent's own list. */
  name: string;
  sub: string;
  /** The contract's tracker. */
  href: string;
  /** The thread with the other party; it says who in its label. */
  messageHref: string;
  type: JobType;
  tasks: Task[];
  tfs: number | null;
  /** Working days left in a trial after today; null on a full-time or part-time contract. */
  left: number | null;
  /** A trial that is over: its countdown reads "Trial closed", where none left on its last day reads "Last day". */
  over?: boolean;
  inactive: boolean;
  /** When it ended, shown once it has. */
  ended: string;
  started: string;
  /** The first day, while the contract is signed but hasn't started: the clock counts down to it and there's no Trial fit yet. */
  startsOn?: string;
  /** Where the contract stands, when the list filters by it. */
  status?: ReactNode;
  /** One call to action under the summary, when there's something to do now. */
  action?: ReactNode;
};

type ContractLayout = (typeof CONTRACT_LAYOUTS)[number];
const CONTRACT_LAYOUT_OPTIONS = [
  { value: "grid", label: "Grid", icon: "viewGrid" },
  { value: "list", label: "List", icon: "viewList" },
] as const;

/**
 * The Team Builder's All independents and the independent's All contracts, as cards or as rows:
 * the same contracts and the same facts either way, so switching only changes how dense it is.
 */
export function ContractList({ layout, items, who = "Contract", toolbar, empty }: {
  layout: ContractLayout;
  items: (ContractSummary & { id: string })[];
  who?: string;
  toolbar: ReactNode;
  empty: ReactNode;
}) {
  return (
    <Card trayClassName="w-full min-w-0">
      <div className="border-b border-line px-3 py-3">{toolbar}</div>
      {items.length === 0 ? (
        <div className="p-3">{empty}</div>
      ) : layout === "grid" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,360px),1fr))] gap-4 p-3">
          {items.map(({ id, ...c }) => <ContractCard key={id} {...c} />)}
        </div>
      ) : (
        <ContractRows items={items} who={who} />
      )}
    </Card>
  );
}

function ContractRows({ items, who }: { items: (ContractSummary & { id: string })[]; who: string }) {
  // Trial fit, status and a call to action get a column only when some row has one.
  const withFit = items.some(showsFit);
  const withStatus = items.some((c) => c.status);
  const withAction = items.some((c) => c.action);
  // Who, then what it is and where it stands, then how the work goes, then the clock and the thread.
  const cols = [COLS.who, COLS.type, ...(withStatus ? [COLS.status] : []), COLS.progress, ...(withFit ? [COLS.fit] : []), COLS.time, withAction ? COLS.actionWide : COLS.action];
  const head = [who, "Type", ...(withStatus ? ["Status"] : []), "Progress", ...(withFit ? ["Trial fit"] : []), "Time", ""];
  return (
    <TableContent cols={cols} head={head}>
      {items.map(({ id, ...c }) => (
        <ContractRow key={id} {...c} withFit={withFit} withStatus={withStatus} withAction={withAction} />
      ))}
    </TableContent>
  );
}

const COLS = {
  // The name keeps to its own width and the bar takes what's spare, up to a point, so the facts
  // sit beside the name rather than across the page from it. A phone's card (Table) leads with who,
  // its type at the line's end as on a card in the grid, then the bar across the card, then the
  // rest, the message last; a cell left empty there (no trial fit, no status) takes no room.
  who: "w-[280px] max-md:basis-0! max-md:grow!",
  type: "w-[112px]",
  progress: "min-w-[200px] max-w-[440px] flex-1 max-md:basis-full!",
  fit: "w-[112px] max-md:empty:hidden",
  time: "w-[176px]",
  status: "w-[152px] max-md:empty:hidden",
  action: "ml-auto w-[112px] justify-end",
  actionWide: "ml-auto w-[248px] justify-end",
};

type Counts = ReturnType<typeof taskCounts>;

/**
 * TB-057 / IN-076 — the at-a-glance card for one contract: who it's with and the contract type, the
 * task list as the contract's Overview draws it (the Progress bar and its key) under TB-057's counts,
 * and a footer with the time, the Trial Fit Score on a trial, where it stands and the thread. The
 * whole card opens the contract — the name's link stretches over it — while the footer's controls
 * and any call to action sit above that. The Team Builder's All independents and the independent's
 * All contracts both draw it.
 */
function ContractCard({ avatar, name, sub, href, messageHref, type, tasks, tfs, left, over, inactive, ended, started, startsOn, status, action }: ContractSummary) {
  return (
    <article
      className={`relative flex flex-col ${TRAY} transition-[box-shadow,outline-color] duration-200 hover:shadow-[0_12px_28px_-16px_rgba(16,24,40,0.3)] hover:outline-[#a6a6a6] ${inactive ? "opacity-60" : ""}`}
    >
      {/* Who and how the work stands on the white panel; time left, the score and the thread on the tray. */}
      <div className={`flex flex-col gap-5 p-5 ${TRAY_PANEL}`}>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-start gap-3">
            {avatar(44)}
            <Link href={href} className={`flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.3] ${ROW_LINK}`}>
              <span className="truncate text-[15px] font-semibold text-ink">{name}</span>
              <span className="truncate text-[13px] text-ink-2">{sub}</span>
            </Link>
            <JobBadge type={type} />
          </div>
          {/* Where it stands and, on a trial, how it's scoring: read with who it's with, under the name. */}
          {(status || showsFit({ type, tfs, startsOn })) && (
            <div className="relative z-10 flex flex-wrap gap-1.5 pl-14">
              {status}
              {showsFit({ type, tfs, startsOn }) && tfs !== null && <TfsBadge tfs={tfs} />}
            </div>
          )}
        </div>
        <CardWork counts={taskCounts(tasks)} />
        {action && <div className="relative z-10 flex flex-col">{action}</div>}
      </div>
      <div className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 px-5 pt-2 pb-1.5 text-[12.5px] leading-[1.3] text-ink-2">
        <TimeLeft type={type} left={left} over={over} inactive={inactive} ended={ended} started={started} startsOn={startsOn} />
        <span className="relative z-10 ml-auto flex items-center">
          <MessageLink href={messageHref} name={name} showLabel />
        </span>
      </div>
    </article>
  );
}

/** The card's work: how many tasks, how many are overdue and how much is done, then the Overview's bar and key. */
function CardWork({ counts }: { counts: Counts }) {
  const pct = counts.total ? Math.round((counts.done / counts.total) * 100) : 0;
  return (
    <div className="flex flex-col gap-3">
      <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12.5px] leading-none text-ink-2">
        <span>
          <Figure>{counts.total}</Figure> {counts.total === 1 ? "task" : "tasks"}
        </span>
        <span className={counts.overdue ? "text-danger" : ""}>
          <Figure danger={counts.overdue > 0}>{counts.overdue}</Figure> overdue
        </span>
        <span className="ml-auto">
          <Figure>{pct}%</Figure> done
        </span>
      </p>
      <WorkMeter counts={counts} />
      <WorkLegend counts={counts} grid />
    </div>
  );
}

/** A number in the card's summary line, in the display face. */
function Figure({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return (
    <span className={`font-display text-[16px] font-semibold tabular-nums ${danger ? "text-danger" : "text-ink"}`} style={DM}>
      {children}
    </span>
  );
}

/**
 * The same contract as one row of the list: who, the type, the Overview's Progress bar with how much
 * is done and anything overdue, the Trial Fit Score, the time and where it stands. The whole row
 * opens the contract — the name's link stretches over it — while the message button and any call
 * to action sit above that and stay their own.
 */
function ContractRow({ avatar, name, sub, href, messageHref, type, tasks, tfs, left, over, inactive, ended, started, startsOn, status, action, withFit, withStatus, withAction }: ContractSummary & { withFit: boolean; withStatus: boolean; withAction: boolean }) {
  const counts = taskCounts(tasks);
  return (
    <Row className={`relative cursor-pointer ${inactive ? "opacity-60" : ""}`}>
      <span className={`${COLS.who} flex gap-3`}>
        {avatar(36)}
        <Link href={href} className={`flex min-w-0 flex-col gap-0.5 leading-[1.3] ${ROW_LINK}`}>
          <span className="truncate text-[14px] font-semibold text-ink">{name}</span>
          <span className="truncate text-[12.5px] text-ink-2">{sub}</span>
        </Link>
      </span>
      <span className={`${COLS.type} flex`}>
        <JobBadge type={type} />
      </span>
      {withStatus && <span className={`${COLS.status} relative z-10 flex`}>{status}</span>}
      <span className={`${COLS.progress} flex flex-col justify-center gap-1.5 !items-stretch`}>
        <WorkMeter counts={counts} compact />
        <WorkLine counts={counts} />
      </span>
      {withFit && <span className={`${COLS.fit} flex`}>{showsFit({ type, tfs, startsOn }) && tfs !== null && <TfsBadge tfs={tfs} />}</span>}
      <span className={`${COLS.time} flex text-[12.5px] text-ink-2`}>
        <TimeLeft type={type} left={left} over={over} inactive={inactive} ended={ended} started={started} startsOn={startsOn} />
      </span>
      <span className={`${withAction ? COLS.actionWide : COLS.action} relative z-10 flex gap-2`}>
        {action}
        <MessageLink href={messageHref} name={name} showLabel />
      </span>
    </Row>
  );
}

/** The line under a row's bar: how much is done and anything overdue — or that it's all done. */
function WorkLine({ counts }: { counts: Counts }) {
  if (counts.total === 0) return <span className="text-[12px] leading-none text-ink-2">No tasks yet</span>;
  if (counts.done === counts.total) return <span className="text-[12px] leading-none font-medium text-ok">All done</span>;
  return (
    <span className="flex gap-1.5 text-[12px] leading-none text-ink-2 tabular-nums">
      <span>
        <b className="font-semibold text-ink">{counts.done}</b> of {counts.total} done
      </span>
      {counts.overdue > 0 && (
        <>
          <span aria-hidden>·</span>
          <span className="font-medium text-danger">{counts.overdue} overdue</span>
        </>
      )}
    </span>
  );
}


/** A 14px ring filled to the score: the Trial Fit Score badge's glyph, the ScoreRing in small. */
function MiniRing({ value }: { value: number }) {
  const r = 5.25;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 14 14" aria-hidden>
      <circle cx="7" cy="7" r={r} fill="none" stroke="currentColor" strokeOpacity={0.22} strokeWidth={2.5} />
      <circle cx="7" cy="7" r={r} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeDasharray={`${(Math.min(100, value) / 100) * c} ${c}`} transform="rotate(-90 7 7)" />
    </svg>
  );
}

/** A trial's Trial fit score so far, as TB-057's pill: "Trial fit 50%". */
function TfsBadge({ tfs }: { tfs: number }) {
  return (
    <Badge tone="accent" icon={<MiniRing value={tfs} />}>
      Trial fit {tfs}%
    </Badge>
  );
}

/**
 * A trial's Trial fit shows once it has begun: before its first day there is no work to score, so a
 * number there only read as a verdict on nothing.
 */
const showsFit = ({ type, tfs, startsOn }: Pick<ContractSummary, "type" | "tfs" | "startsOn">) => type === "trial" && tfs !== null && !startsOn;

/**
 * How long is left on a trial, when the contract began, or when it ended — orange once a trial is
 * down to its last 7 days (TB-057). Before its first day it counts down to that instead: a trial's
 * working days don't start running until then, and "Started" would be untrue.
 */
function TimeLeft({ type, left, over = false, inactive, ended, started, startsOn }: Pick<ContractSummary, "type" | "left" | "over" | "inactive" | "ended" | "started" | "startsOn">) {
  const upcoming = !inactive && !!startsOn;
  const trial = type === "trial" && !inactive && !upcoming;
  const soon = trial && !over && left !== null && left <= 7;
  const Icon = trial ? ICONS.hourglass : ICONS.calendar;
  return (
    <span className={`inline-flex items-center gap-1.5 leading-4 whitespace-nowrap ${soon ? "font-semibold text-brand-orange" : ""}`}>
      <Icon size={16} aria-hidden className="block shrink-0" />
      <span>{inactive ? `Ended ${ended}` : upcoming ? startsInLabel(startsOn) : trial ? daysLeftLabel(left ?? 0, over) : `Started ${started}`}</span>
    </span>
  );
}

/**
 * A link to a thread. Contract lists display a label. Pipeline cards use the compact icon and
 * can display an unread count.
 */
export function MessageLink({ href, name, unread = 0, showLabel = false }: { href: string; name: string; unread?: number; showLabel?: boolean }) {
  return (
    <Tip label={`Message ${name}`}>
      <Link href={href} aria-label={`Message ${name}`} className={`relative flex h-8 shrink-0 items-center justify-center transition hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary ${showLabel ? "gap-1.5 rounded-lg border border-border bg-white px-2.5 text-xs font-medium text-ink" : "size-8 rounded-full text-ink-2"}`}>
        <Message size={showLabel ? 16 : 18} aria-hidden />
        {showLabel && "Message"}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-none font-semibold text-white">
            <span className="badge-count">{unread > 9 ? "9+" : unread}</span>
          </span>
        )}
      </Link>
    </Tip>
  );
}


/** The contract types the lists filter by. */
const CONTRACT_TYPE_FILTERS = ["All", "Trial", "Full-time", "Part-time"] as const;
export type ContractTypeFilter = (typeof CONTRACT_TYPE_FILTERS)[number];

/**
 * The bar over All independents and All contracts, in the contract workspace's toolbar style: one
 * 36px line of search, a Type menu and a Show inactive toggle, with the count and the Grid / List
 * switch at the right. (It was a 44px search box and select beside a loose checkbox and a smaller
 * switch — four heights on one line.)
 */
export function ContractListToolbar({
  q,
  onQ,
  placeholder,
  type,
  onType,
  showInactive,
  onShowInactive,
  count,
  layout,
  onLayout,
}: {
  q: string;
  onQ: (q: string) => void;
  placeholder: string;
  type: ContractTypeFilter;
  onType: (t: ContractTypeFilter) => void;
  showInactive: boolean;
  onShowInactive: (on: boolean) => void;
  /** "3 independents", "1 contract". */
  count: string;
  layout: ContractLayout;
  onLayout: (l: ContractLayout) => void;
}) {
  const Check = ICONS.check;
  return (
    <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Search and filter">
      <label className="flex h-9 w-full max-w-[300px] min-w-44 flex-1 items-center gap-2 rounded-lg border border-border bg-white px-3 text-ink-2 focus-within:border-primary sm:w-auto">
        <ICONS.search size={17} aria-hidden />
        <input type="search" value={q} onChange={(e) => onQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-2" />
      </label>
      <DropdownMenu>
        <DropdownMenuTrigger className={TOOLBAR_BUTTON} aria-label={`Type: ${type}`}>
          <span className="text-ink-2">Type:</span> {type}
          <ICONS.chevron size={16} aria-hidden className="text-ink-2" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuRadioGroup value={type} onValueChange={(v) => onType(v as ContractTypeFilter)}>
            {CONTRACT_TYPE_FILTERS.map((t) => (
              <DropdownMenuRadioItem key={t} value={t} closeOnClick>
                {t === "All" ? "All types" : t}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* TB-054: ended contracts are hidden by default; one press brings them back. */}
      <button type="button" aria-pressed={showInactive} onClick={() => onShowInactive(!showInactive)} className={`${TOOLBAR_BUTTON} ${showInactive ? "!border-accent-soft !bg-accent-bg text-accent-ink" : ""}`}>
        <span aria-hidden className={`flex size-4 items-center justify-center rounded border ${showInactive ? "border-primary bg-primary text-white" : "border-[#a6a6a6] bg-white"}`}>
          {showInactive && <Check size={12} />}
        </span>
        Show inactive
      </button>
      <span className="ml-auto text-[13px] leading-[1.2] text-ink-2 tabular-nums">{count}</span>
      <ViewSwitch label="Layout" value={layout} onChange={onLayout} options={CONTRACT_LAYOUT_OPTIONS} />
    </div>
  );
}
