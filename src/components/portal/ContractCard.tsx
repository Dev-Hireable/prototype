import Link from "next/link";
import type { ReactNode } from "react";
import { ICONS } from "@/components/admin/icons";
import { JobBadge } from "@/components/independent/ui";
import { Badge } from "@/components/portal/Badge";
import { Tip } from "@/components/portal/Tip";
import { ROW_LINK, TOOLBAR_BUTTON } from "@/components/portal/toolbar";
import { ViewSwitch } from "@/components/portal/ViewSwitch";
import { WorkLegend, WorkMeter } from "@/components/portal/WorkProgress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Row, Table } from "@/components/team/ui";
import type { CONTRACT_LAYOUTS } from "@/lib/contract/view";
import { daysLeftLabel } from "@/lib/demo/dates";
import type { JobType } from "@/lib/demo/job-types";
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
  /** Working days left in a trial; null on a full-time or part-time contract. */
  left: number | null;
  inactive: boolean;
  /** When it ended, shown once it has. */
  ended: string;
  started: string;
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
export function ContractList({ layout, items, who = "Contract" }: { layout: ContractLayout; items: (ContractSummary & { id: string })[]; /** The first column's heading in the list: who each row is. */ who?: string }) {
  if (layout === "grid")
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-4">
        {items.map(({ id, ...c }) => (
          <ContractCard key={id} {...c} />
        ))}
      </div>
    );
  // Trial fit, status and a call to action get a column only when some row has one.
  const withFit = items.some((c) => c.type === "trial" && c.tfs !== null);
  const withStatus = items.some((c) => c.status);
  const withAction = items.some((c) => c.action);
  const cols = [COLS.who, COLS.type, COLS.progress, ...(withFit ? [COLS.fit] : []), COLS.time, ...(withStatus ? [COLS.status] : []), withAction ? COLS.actionWide : COLS.action];
  const head = [who, "Type", "Progress", ...(withFit ? ["Trial fit"] : []), "Time", ...(withStatus ? ["Status"] : []), ""];
  return (
    <Table cols={cols} head={head}>
      {items.map(({ id, ...c }) => (
        <ContractRow key={id} {...c} withFit={withFit} withStatus={withStatus} withAction={withAction} />
      ))}
    </Table>
  );
}

const COLS = {
  // The name keeps to its own width and the bar takes what's spare, up to a point, so the facts
  // sit beside the name rather than across the page from it.
  who: "w-[280px]",
  type: "w-[112px]",
  progress: "min-w-[240px] max-w-[440px] flex-1",
  fit: "w-[112px]",
  time: "w-[176px]",
  status: "w-[120px]",
  action: "w-[64px] justify-end",
  actionWide: "w-[190px] justify-end",
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
function ContractCard({ avatar, name, sub, href, messageHref, type, tasks, tfs, left, inactive, ended, started, status, action }: ContractSummary) {
  return (
    <article
      className={`relative flex flex-col rounded-lg bg-white outline -outline-offset-1 outline-border transition-[box-shadow,outline-color] duration-200 hover:shadow-[0_12px_28px_-16px_rgba(16,24,40,0.3)] hover:outline-[#a6a6a6] ${inactive ? "opacity-60" : ""}`}
    >
      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-start gap-3">
          {avatar(44)}
          <Link href={href} className={`flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.3] ${ROW_LINK}`}>
            <span className="truncate text-[15px] font-semibold text-ink">{name}</span>
            <span className="truncate text-[13px] text-ink-2">{sub}</span>
          </Link>
          <JobBadge type={type} />
        </div>
        <CardWork counts={taskCounts(tasks)} />
        {action && <div className="relative z-10 flex flex-col">{action}</div>}
      </div>
      <div className="flex min-h-13 flex-wrap items-center gap-x-3 gap-y-2 border-t border-line px-5 py-2.5 text-[12.5px] leading-[1.3] text-ink-2">
        <TimeLeft type={type} left={left} inactive={inactive} ended={ended} started={started} />
        {type === "trial" && tfs !== null && <TfsBadge tfs={tfs} />}
        <span className="relative z-10 ml-auto flex items-center gap-2">
          {status}
          <MessageLink href={messageHref} name={name} />
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
function ContractRow({ avatar, name, sub, href, messageHref, type, tasks, tfs, left, inactive, ended, started, status, action, withFit, withStatus, withAction }: ContractSummary & { withFit: boolean; withStatus: boolean; withAction: boolean }) {
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
      <span className={`${COLS.progress} flex flex-col justify-center gap-2 !items-stretch`}>
        <WorkMeter counts={counts} />
        <WorkLine counts={counts} />
      </span>
      {withFit && <span className={`${COLS.fit} flex`}>{type === "trial" && tfs !== null && <TfsBadge tfs={tfs} />}</span>}
      <span className={`${COLS.time} flex text-[12.5px] text-ink-2`}>
        <TimeLeft type={type} left={left} inactive={inactive} ended={ended} started={started} />
      </span>
      {withStatus && <span className={`${COLS.status} relative z-10 flex`}>{status}</span>}
      <span className={`${withAction ? COLS.actionWide : COLS.action} relative z-10 flex gap-2`}>
        {action}
        <MessageLink href={messageHref} name={name} />
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

/** A trial's Trial Fit Score so far (TB-057's TFS pill). */
function TfsBadge({ tfs }: { tfs: number }) {
  return (
    <Badge tone="accent" icon={<MiniRing value={tfs} />}>
      TFS {tfs}%
    </Badge>
  );
}

/** How long is left on a trial, when the contract began, or when it ended — orange once a trial is down to its last 7 days (TB-057). */
function TimeLeft({ type, left, inactive, ended, started }: Pick<ContractSummary, "type" | "left" | "inactive" | "ended" | "started">) {
  const trial = type === "trial" && !inactive;
  const soon = trial && left !== null && left <= 7;
  const Icon = trial ? ICONS.hourglass : ICONS.calendar;
  return (
    <span className={`flex items-center gap-1.5 whitespace-nowrap ${soon ? "font-semibold text-brand-orange" : ""}`}>
      <Icon size={15} aria-hidden className="shrink-0" />
      {inactive ? `Ended ${ended}` : trial ? daysLeftLabel(left ?? 0) : `Started ${started}`}
    </span>
  );
}

/** The thread with the other party: a quiet icon button, named for screen readers and in its tooltip. */
function MessageLink({ href, name }: { href: string; name: string }) {
  return (
    <Tip label={`Message ${name}`}>
      <Link href={href} aria-label={`Message ${name}`} className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-2 transition hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary">
        <Message size={18} aria-hidden />
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
