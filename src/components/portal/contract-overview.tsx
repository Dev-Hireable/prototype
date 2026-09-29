"use client";

import type { ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { Button } from "@/components/portal/ui";
import { FactStrip, SIDE_COLUMN, WITH_SIDE } from "@/components/portal/page-parts";
import { PanelCard } from "@/components/portal/panel-card";
import { StatusCircle } from "@/components/portal/tasks/task-bits";
import type { TaskPeople } from "@/components/workspace/labels";
import { WorkLegend, WorkMeter } from "@/components/portal/work-progress";
import { AssigneeChip } from "@/components/workspace/meta";
import { ago } from "@/components/workspace/util";
import { keyed } from "@/lib/portal/keys";
import { writeParams } from "@/lib/portal/query-state";
import { dayOf, relativeLabel, shortLabel, todayDay, type Day } from "@/lib/work/dates";
import { countsOf, isArchived, isCompleted, isOverdue, refOf, scoredItems, type WorkItem } from "@/lib/work/model";

const DM = { fontVariationSettings: '"opsz" 14' } as const;
/** How far ahead "Coming up" looks, in days. */
const AHEAD = 14;
/** Rows a list shows before it sends you to the work for the rest. */
const ROWS = 6;

/** Opens an item in the Work tab — or, with no id, the work itself. */
const openWork = (id?: string) => writeParams({ tab: null, task: id ?? null });

type Viewer = "team" | "independent";

/**
 * A contract's Overview tab, the same on both sides: the terms at a glance, how far the work has
 * got, what needs you now, what's due over the next two weeks and the latest changes — each item
 * opening in the Work tab, where it can be acted on — beside the page's own cards (the score, the
 * activity streak, the evaluation, the money). All of it is read from the contract's work items;
 * none of it is a summary kept anywhere else.
 */
export function ContractOverview({
  viewer,
  tasks,
  names,
  people,
  trial,
  facts,
  callouts,
  aside,
  work = { open: true, reviewOpen: true },
}: {
  viewer: Viewer;
  tasks: readonly WorkItem[];
  /** First names, for "Alex asked for changes". */
  names: Record<Viewer, string>;
  people: TaskPeople;
  /** A trial: its scored tasks get their own count. */
  trial: boolean;
  facts: { label: string; value: ReactNode }[];
  /** Banners for what's waiting on this person, above everything else. */
  callouts?: ReactNode;
  aside: ReactNode;
  /**
   * Whether the work can still move: once a trial is over nothing overdue can be moved and nothing
   * sent back can be resubmitted, and once the contract ends nothing waits on a review either — so
   * none of it is put in front of anyone as needing them.
   */
  work?: { open: boolean; reviewOpen: boolean };
}) {
  const today = todayDay();
  const live = tasks.filter((t) => !isArchived(t));
  return (
    <div className="flex flex-col gap-5">
      {callouts}
      <FactStrip cells={facts} />
      <div className={WITH_SIDE}>
        {/* Each card is a region, so a screen reader can jump between them. */}
        <div className="flex w-full min-w-0 flex-1 flex-col gap-4 [&>section]:flex [&>section]:flex-col">
          <section aria-label="Progress">
            <Progress items={live} today={today} trial={trial} />
          </section>
          <section aria-label="Needs attention">
            <Attention items={live} today={today} viewer={viewer} names={names} work={work} />
          </section>
          <section aria-label="Coming up">
            <ComingUp items={live} today={today} people={people} />
          </section>
          <section aria-label="Recent changes">
            <RecentChanges items={live} />
          </section>
        </div>
        <aside className={SIDE_COLUMN}>{aside}</aside>
      </div>
    </div>
  );
}

/**
 * How far the work has got: the share done as the headline, the smaller numbers beside it, and the
 * bar with its key — every status a part of it, To do the hatched rest.
 */
function Progress({ items, today, trial }: { items: WorkItem[]; today: Day; trial: boolean }) {
  const counts = countsOf(items, today);
  const scored = trial ? scoredItems(items) : [];
  const pct = counts.total ? Math.round((counts.done / counts.total) * 100) : 0;
  return (
    <PanelCard
      title="Progress"
      aside={
        <Button size="sm" onClick={() => openWork()}>
          Open the work
        </Button>
      }
    >
      {counts.total === 0 ? (
        <p className="text-[13px] leading-[1.4] text-ink-2">{trial ? "No trial tasks: the signed offer has none." : "Nothing on the list yet."}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
            <Headline pct={pct} label={`${counts.done} of ${counts.total} ${counts.total === 1 ? "item" : "items"} done`} />
            <Stats stats={statsOf(items, counts, scored)} />
          </div>
          <div className="flex flex-col gap-3">
            <WorkMeter counts={counts} />
            <WorkLegend counts={counts} />
          </div>
          {scored.length > 0 && <p className="text-[12.5px] leading-[1.4] text-ink-2">Trial tasks are the ones the Trial Fit Score&apos;s Performance counts.</p>}
        </>
      )}
    </PanelCard>
  );
}

type Stat = { label: string; value: number; of?: number; danger?: boolean };

/** Progress's smaller numbers: effort and trial tasks done out of all of them, what's in review, what's overdue. */
function statsOf(items: WorkItem[], counts: ReturnType<typeof countsOf>, scored: WorkItem[]): Stat[] {
  const effort = items.reduce((n, t) => n + (t.effort ?? 0), 0);
  const effortDone = items.filter((t) => isCompleted(t.status)).reduce((n, t) => n + (t.effort ?? 0), 0);
  return [
    ...(effort > 0 ? [{ label: "Effort done", value: effortDone, of: effort }] : []),
    ...(scored.length > 0 ? [{ label: "Trial tasks done", value: scored.filter((t) => isCompleted(t.status)).length, of: scored.length }] : []),
    { label: "In review", value: counts.review },
    ...(counts.overdue > 0 ? [{ label: "Overdue", value: counts.overdue, danger: true }] : []),
  ];
}

/** The share of the work that's done, big, over what it's a share of. */
function Headline({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-display text-[40px] leading-none font-semibold tracking-[-0.02em] text-ink tabular-nums" style={DM}>
        {pct}
        <span className="text-[24px] font-medium text-ink-2">%</span>
      </p>
      <p className="text-[12.5px] leading-[1.3] text-ink-2">{label}</p>
    </div>
  );
}

/** The smaller numbers beside the headline, each over its label, a hairline before each. */
function Stats({ stats }: { stats: Stat[] }) {
  return (
    <dl className="flex flex-wrap gap-y-3">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col-reverse gap-2 border-l border-line px-5">
          <dt className="text-[12.5px] leading-[1.3] text-ink-2">{s.label}</dt>
          <dd className={`font-display text-[20px] leading-none font-semibold tabular-nums ${s.danger ? "text-danger" : "text-ink"}`} style={DM}>
            {s.value}
            {s.of !== undefined && <span className="text-[14px] font-medium text-ink-2"> of {s.of}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * What's waiting on this person: reviews for the Team Builder, change requests for the
 * Independent — and anything overdue that's theirs to move.
 */
function Attention({ items, today, viewer, names, work }: { items: WorkItem[]; today: Day; viewer: Viewer; names: Record<Viewer, string>; work: { open: boolean; reviewOpen: boolean } }) {
  const rows = attentionRows(items, today, viewer, names, work);
  return (
    <PanelCard title="Needs attention" aside={rows.length > 0 ? <Count n={rows.length} /> : undefined}>
      {rows.length === 0 ? (
        <p className="flex items-center gap-2 text-[13px] leading-[1.4] text-ink-2">
          <ICONS.taskDone size={18} aria-hidden className="shrink-0 text-ok" />
          {viewer === "team" ? "Nothing is waiting on you." : "Nothing needs you right now."}
        </p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {rows.slice(0, ROWS).map(({ t, why }) => (
            <ItemRow key={t.id} item={t} meta={<span className={`shrink-0 text-[12.5px] font-medium ${why.startsWith("Waiting") ? "text-[#8e6f12]" : "text-danger"}`}>{why}</span>} />
          ))}
        </ul>
      )}
      <More total={rows.length} />
    </PanelCard>
  );
}

/** Needs attention's rows, each item once with the first reason found: a review or changes asked for, then overdue. */
function attentionRows(items: WorkItem[], today: Day, viewer: Viewer, names: Record<Viewer, string>, work: { open: boolean; reviewOpen: boolean }) {
  const rows: { t: WorkItem; why: string }[] = [];
  const seen = new Set<string>();
  const add = (t: WorkItem, why: string) => {
    if (seen.has(t.id)) return;
    seen.add(t.id);
    rows.push({ t, why });
  };
  if (viewer === "team" && work.reviewOpen) for (const t of items) if (t.status === "review" && t.assignee === "independent") add(t, "Waiting on your review");
  if (viewer === "independent" && work.open) for (const t of items) if (t.assignee === "independent" && t.changes && (t.status === "todo" || t.status === "doing")) add(t, `${names.team} asked for changes`);
  for (const t of work.open ? items : []) {
    const due = dayOf(t.due);
    if (due !== null && isOverdue(t, today) && (viewer === "team" || t.assignee === "independent")) add(t, `Overdue · was due ${due === today - 1 ? "yesterday" : shortLabel(due, today)}`);
  }
  return rows;
}

/** Everything still open that's due in the next two weeks, by day. */
function ComingUp({ items, today, people }: { items: WorkItem[]; today: Day; people: TaskPeople }) {
  const soon = items
    .flatMap((t) => {
      const due = dayOf(t.due);
      return due !== null && !isCompleted(t.status) && due >= today && due <= today + AHEAD ? [{ t, due }] : [];
    })
    .sort((a, b) => a.due - b.due || a.t.order - b.t.order);
  return (
    <PanelCard title="Coming up" aside={<span className="text-[12px] leading-[1.4] text-ink-2">Next two weeks</span>}>
      {soon.length === 0 ? (
        <p className="text-[13px] leading-[1.4] text-ink-2">Nothing is due in the next two weeks.</p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {soon.slice(0, ROWS).map(({ t, due }, i) => (
            <ItemRow
              key={t.id}
              item={t}
              lead={<span className={`w-[76px] shrink-0 text-[12.5px] ${due === today ? "font-semibold text-primary" : "text-ink-2"}`}>{i === 0 || soon[i - 1].due !== due ? relativeLabel(due, today) : ""}</span>}
              meta={<AssigneeChip assignee={t.assignee} people={people} size={20} />}
            />
          ))}
        </ul>
      )}
      <More total={soon.length} />
    </PanelCard>
  );
}

const clip = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** The newest things that happened on any item, comments included. */
function RecentChanges({ items }: { items: WorkItem[] }) {
  const feed = items
    .flatMap((t) => [...t.activity.map((e) => ({ t, ts: e.ts, text: e.text })), ...t.comments.map((c) => ({ t, ts: c.ts, text: `${c.name} commented: “${clip(c.text)}”` }))])
    .sort((a, b) => b.ts - a.ts)
    .slice(0, ROWS);
  return (
    <PanelCard title="Recent changes">
      {feed.length === 0 ? (
        <p className="text-[13px] leading-[1.4] text-ink-2">Nothing has happened on the work yet.</p>
      ) : (
        <ol className="-mx-2 flex flex-col">
          {keyed(feed, (f) => `${f.t.id}-${f.ts}`).map(({ item: f, key }) => (
            <li key={key}>
              <button type="button" onClick={() => openWork(f.t.id)} className="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary">
                <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#c3c3c3]" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[13px] leading-[1.4] break-words text-ink">{f.text}</span>
                  <span className="truncate text-[12px] leading-[1.3] text-ink-2">
                    {refOf(f.t)} {f.t.title}
                  </span>
                </span>
                <span className="shrink-0 text-[12px] leading-[1.4] whitespace-nowrap text-ink-2">{ago(f.ts)}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </PanelCard>
  );
}

/** One item in a list: its status, number and name, and whatever the list says about it. */
function ItemRow({ item: t, lead, meta }: { item: WorkItem; lead?: ReactNode; meta?: ReactNode }) {
  return (
    <li>
      <button type="button" onClick={() => openWork(t.id)} className="group flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[13.5px] hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary">
        {lead}
        <StatusCircle status={t.status} size={16} />
        <span className="shrink-0 text-[12px] text-ink-2 tabular-nums">{refOf(t)}</span>
        <span className="min-w-0 flex-1 truncate text-ink">{t.title}</span>
        {meta}
        <ICONS.chevronRight size={16} aria-hidden className="shrink-0 text-ink-2" />
      </button>
    </li>
  );
}

function Count({ n }: { n: number }) {
  return <span className="min-w-7 rounded bg-[#fff3cc] px-1.5 py-0.5 text-center text-[12.5px] font-medium text-[#8e6f12] tabular-nums">{n}</span>;
}

/** "3 more" when a list is cut short — they're all in the work. */
function More({ total }: { total: number }) {
  if (total <= ROWS) return null;
  return (
    <button type="button" onClick={() => openWork()} className="self-start text-[13px] font-medium text-primary hover:underline">
      {total - ROWS} more in the work
    </button>
  );
}
