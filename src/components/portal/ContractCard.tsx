import Link from "next/link";
import type { ReactNode } from "react";
import { ICONS } from "@/components/admin/icons";
import { JobBadge } from "@/components/independent/ui";
import { ROW_LINK, TOOLBAR_BUTTON } from "@/components/portal/toolbar";
import { ViewSwitch } from "@/components/portal/ViewSwitch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Row, Table } from "@/components/team/ui";
import { daysLeftLabel } from "@/lib/demo/dates";
import type { JobType } from "@/lib/demo/job-types";
import { taskCounts } from "@/lib/demo/tasks";
import type { Task } from "@/lib/demo/tasks";

const Message = ICONS.messages;

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

export const CONTRACT_LAYOUTS = ["grid", "list"] as const;
export type ContractLayout = (typeof CONTRACT_LAYOUTS)[number];
export const CONTRACT_LAYOUT_OPTIONS = [
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
  // Status and a call to action get a column only when some row has one.
  const withStatus = items.some((c) => c.status);
  const withAction = items.some((c) => c.action);
  const cols = [COLS.who, COLS.type, COLS.progress, COLS.fit, COLS.time, ...(withStatus ? [COLS.status] : []), withAction ? COLS.actionWide : COLS.action];
  const head = [who, "Type", "Progress", "Trial fit", "Time", ...(withStatus ? ["Status"] : []), ""];
  return (
    <Table cols={cols} head={head}>
      {items.map(({ id, ...c }) => (
        <ContractRow key={id} {...c} withStatus={withStatus} withAction={withAction} />
      ))}
    </Table>
  );
}

const COLS = {
  who: "min-w-[240px] flex-1",
  type: "w-[112px]",
  progress: "w-[240px]",
  fit: "w-[96px]",
  time: "w-[150px]",
  status: "w-[120px]",
  action: "w-[64px] justify-end",
  actionWide: "w-[190px] justify-end",
};

/**
 * TB-057 / IN-076 — the at-a-glance card for one contract: who it's with, the task list's breakdown,
 * contract type, TFS and time left. The Team Builder's All independents and the independent's All
 * contracts both draw it, so the two lists of the same contracts look the same from either side.
 */
export function ContractCard({ avatar, name, sub, href, messageHref, type, tasks, tfs, left, inactive, ended, started, status, action }: ContractSummary) {
  const counts = taskCounts(tasks);
  /** Open and on time; the overdue ones are counted on their own. */
  const inProgress = counts.total - counts.done - counts.overdue;

  return (
    <article className={`flex flex-col gap-4 rounded-lg bg-white p-4 outline -outline-offset-1 outline-border ${inactive ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        {avatar(44)}
        <Link href={href} className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.3]">
          <span className="truncate text-[15px] font-semibold text-ink hover:text-primary">{name}</span>
          <span className="truncate text-[13px] text-ink-2">{sub}</span>
        </Link>
        <Link href={messageHref} aria-label={`Message ${name}`} className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-ink hover:bg-surface-alt">
          <Message size={18} aria-hidden />
        </Link>
      </div>

      {/* Tasks / In progress / Overdue / Done, colour coded per the AC. */}
      <dl className="grid grid-cols-4 gap-2 rounded-lg bg-surface-2 p-3 text-center">
        <Count label="Tasks" value={counts.total} tone="text-ink" />
        <Count label="In progress" value={inProgress} tone="text-primary" />
        <Count label="Overdue" value={counts.overdue} tone="text-danger" />
        <Count label="Done" value={counts.done} tone="text-ok" />
      </dl>

      <div className="flex flex-wrap items-center gap-2 text-[13px] leading-[1.3] text-ink-2">
        <TypeBadges type={type} tfs={tfs} />
        <TimeLeft type={type} left={left} inactive={inactive} ended={ended} started={started} />
        {status && <span className="ml-auto">{status}</span>}
      </div>

      {action}
    </article>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="order-2 text-[11.5px] leading-[1.2] text-ink-2">{label}</dt>
      <dd className={`order-1 text-[18px] leading-[1.2] font-semibold ${tone}`}>{value}</dd>
    </div>
  );
}

/**
 * The same contract as one row of the list: who, the type, how far the work has got (a bar and
 * "2 of 5 done", with what's in progress and overdue under it), the Trial Fit Score, and the time.
 * The whole row opens the contract — the name's link stretches over it — while the message button
 * and any call to action sit above that and stay their own.
 */
function ContractRow({ avatar, name, sub, href, messageHref, type, tasks, tfs, left, inactive, ended, started, status, action, withStatus, withAction }: ContractSummary & { withStatus: boolean; withAction: boolean }) {
  const counts = taskCounts(tasks);
  const inProgress = counts.total - counts.done - counts.overdue;
  const pct = counts.total ? Math.round((counts.done / counts.total) * 100) : 0;
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
      <span className={`${COLS.progress} flex flex-col justify-center gap-1.5 !items-stretch`}>
        <span className="flex items-center gap-2.5">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="Tasks done" aria-valuemin={0} aria-valuemax={counts.total} aria-valuenow={counts.done}>
            <span className="block h-full rounded-full bg-ok" style={{ width: `${pct}%` }} />
          </span>
          <span className="text-[12.5px] text-ink tabular-nums">
            <b className="font-semibold">{counts.done}</b> of {counts.total} done
          </span>
        </span>
        <span className="flex gap-3 text-[12px] text-ink-2 tabular-nums">
          <span>
            <b className="font-semibold text-primary">{inProgress}</b> in progress
          </span>
          <span className={counts.overdue ? "text-danger" : ""}>
            <b className="font-semibold">{counts.overdue}</b> overdue
          </span>
        </span>
      </span>
      <span className={`${COLS.fit} flex`}>{type === "trial" && tfs !== null ? <TfsBadge tfs={tfs} /> : <span className="text-ink-2">—</span>}</span>
      <span className={`${COLS.time} flex text-[12.5px] text-ink-2`}>
        <TimeLeft type={type} left={left} inactive={inactive} ended={ended} started={started} />
      </span>
      {withStatus && <span className={`${COLS.status} relative z-10 flex`}>{status}</span>}
      <span className={`${withAction ? COLS.actionWide : COLS.action} relative z-10 flex gap-2`}>
        {action}
        <Link href={messageHref} aria-label={`Message ${name}`} className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-white text-ink hover:bg-surface-alt">
          <Message size={18} aria-hidden />
        </Link>
      </span>
    </Row>
  );
}

/** The contract type, and on a trial its Trial Fit Score so far. */
function TypeBadges({ type, tfs }: { type: JobType; tfs: number | null }) {
  return (
    <>
      <JobBadge type={type} />
      {type === "trial" && tfs !== null && <TfsBadge tfs={tfs} />}
    </>
  );
}

/** A trial's Trial Fit Score so far. */
function TfsBadge({ tfs }: { tfs: number }) {
  return <span className="rounded-md bg-[#eef6ff] px-2 py-1 text-[12.5px] leading-[1.2] font-semibold whitespace-nowrap text-[#005b99]">TFS {tfs}%</span>;
}

/** How long is left on a trial, when the contract began, or when it ended. */
function TimeLeft({ type, left, inactive, ended, started }: Pick<ContractSummary, "type" | "left" | "inactive" | "ended" | "started">) {
  if (inactive) return <span>Ended {ended}</span>;
  // 7 days or fewer reads as a warning (TB-057).
  if (type === "trial") return <span className={left !== null && left <= 7 ? "font-semibold text-brand-orange" : ""}>{daysLeftLabel(left ?? 0, "remaining")}</span>;
  return <span>Started {started}</span>;
}


/** The contract types the lists filter by. */
export const CONTRACT_TYPE_FILTERS = ["All", "Trial", "Full-time", "Part-time"] as const;
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
