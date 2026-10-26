"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type RefObject } from "react";
import { flushSync } from "react-dom";
import type { IconType } from "react-icons";
import { ICONS } from "@/components/icons";
import { KebabMenu, MenuAction } from "@/components/portal/controls";
import { Avatar, Button, Checkbox, CheckboxBox, Pills, Toast } from "@/components/portal/ui";
import { useWithReturn } from "@/components/portal/return";
import { MONTHS } from "@/lib/portal/dates";
import { categoryOf, type NoteCategory } from "@/lib/portal/notification-categories";
import type { PageToast } from "@/lib/portal/toast";

/** One notification as the feed shows it, whichever portal it came from. */
export type FeedItem = {
  id: string;
  title: string;
  body: string;
  unread: boolean;
  /** Where the row opens. The whole row is the link. */
  href?: string;
  /** Who it is from: a person's photo; or the company's `logo`, else its `initials`; or, on Hireable's own (`system`), its category's icon. */
  avatar?: string;
  initials?: string;
  logo?: string;
  system?: boolean;
  /** Its category, for that icon. */
  kind?: string;
  /** When it happened (epoch ms). Older records carry only the stored group and time. */
  at?: number;
  group: string;
  time: string;
};

/** Each category's icon, on a notice from Hireable itself. */
const CATEGORY_ICON: Record<NoteCategory, IconType> = { applications: ICONS.applications, interviews: ICONS.interviews, tasks: ICONS.typeTask, messages: ICONS.messages, payments: ICONS.wallet };

type Group = "Today" | "Yesterday" | "Earlier";
const GROUPS: Group[] = ["Today", "Yesterday", "Earlier"];

/** How many notifications the feed shows at first, and how many more each "See older notifications" adds. */
const STEP = 10;

/** The text buttons beside the pills, Select and Mark all as read: blue, grey while there's nothing to do. */
const TEXT_ACTION = "hit-area rounded-md [--hit:32px] text-[13px] font-medium text-primary enabled:hover:underline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:text-[#c3c3c3]";

/** What a delete took out of the feed: how many, and what puts them back. */
type Removed = { count: number; undo: () => void };

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * Today / Yesterday / Earlier and the time beside each row, worked out from when it happened.
 * Both feeds used to stamp everything "Today" for good, and the Team Builder's rows said
 * "Just now" however old they were.
 */
function when(n: FeedItem, now = new Date()): { group: Group; time: string } {
  if (n.at === undefined) return { group: n.group === "Today" || n.group === "Yesterday" ? n.group : "Earlier", time: n.time };
  const d = new Date(n.at);
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  const clock = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (days <= 0) return { group: "Today", time: clock };
  if (days === 1) return { group: "Yesterday", time: clock };
  return { group: "Earlier", time: `${d.getDate()} ${MONTHS[d.getMonth()]}` };
}

/** Who a row is from: the person's photo, the company's logo or initials, or the type's icon on a notice from Hireable. */
function Sender({ item }: { item: FeedItem }) {
  if (item.system) {
    const Icon = CATEGORY_ICON[categoryOf({ kind: item.kind ?? "", title: item.title })];
    return (
      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e8f1fa] text-primary">
        <Icon size={18} />
      </span>
    );
  }
  if (item.avatar) return <Avatar src={item.avatar} size={36} />;
  if (item.logo) return <Image src={item.logo} alt="" width={72} height={72} className="size-9 shrink-0 rounded-full bg-white object-cover outline -outline-offset-1 outline-border" loading="eager" />;
  return (
    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e8f1fa] text-[12px] font-semibold text-primary">
      {item.initials ?? "H"}
    </span>
  );
}

/**
 * The notification feed, in both portals: pill filters, one list with group headers, unread rows
 * tinted, and the whole row opens what it is about. Each row also shows who it is from, and its ⋮
 * marks it read or unread, or deletes it. Select ticks several at once, or all in view, to mark or
 * delete together; a delete's toast has Undo. The Team Builder's feed was a different design
 * (separate cards, a breadcrumb, an action button) for the same events.
 */
export function NotificationFeed<F extends string>({
  items,
  unread,
  filter,
  filters,
  onFilter,
  onRead,
  onMark,
  onDelete,
}: {
  /** Already filtered. */
  items: FeedItem[];
  /** Unread across the whole feed, not just this filter. It drives Mark all as read. */
  unread: number;
  filter: F;
  filters: { value: F; label: string }[];
  onFilter: (f: F) => void;
  /** One row's id, or nothing for all of them. */
  onRead: (id?: string) => void;
  /** Marks these read, or unread again. */
  onMark: (ids: string[], unread: boolean) => void;
  /** Deletes these (nothing comes back when none of them was there). */
  onDelete: (ids: string[]) => Removed | undefined;
}) {
  const [shown, showMore] = usePaging(filter);
  const [deleted, setDeleted] = useState<{ toast: PageToast; undo: () => void } | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const selectButton = useRef<HTMLButtonElement>(null);
  const remove = (gone: FeedItem[]) => {
    const removed = onDelete(gone.map((n) => n.id));
    if (removed) setDeleted({ toast: { message: removed.count === 1 && gone.length === 1 ? `Deleted “${gone[0].title}”` : `Deleted ${removed.count} notifications`, tone: "success" }, undo: removed.undo });
  };
  const feed = useFeedActions({ items, shown, showMore, list, selectButton, onMark, remove });
  const rows = items.slice(0, shown);
  const ticked = items.filter((n) => feed.pick.ids.has(n.id));

  return (
    <>
      {feed.pick.on ? (
        <SelectionBar
          count={ticked.length}
          all={rows.length > 0 && rows.every((n) => feed.pick.ids.has(n.id))}
          onAll={(on) => feed.pick.set(on ? rows.map((n) => n.id) : [])}
          unread={ticked.some((n) => n.unread)}
          onMark={() => feed.markTicked(ticked)}
          onDelete={() => feed.deleteTicked(ticked)}
          onCancel={feed.endSelect}
        />
      ) : (
        <FeedTools filter={filter} filters={filters} onFilter={onFilter} canSelect={items.length > 0} unread={unread} onSelect={feed.startSelect} onReadAll={() => onRead()} selectRef={selectButton} />
      )}
      <FeedList ref={list} rows={rows} older={items.slice(shown)} ticked={feed.pick.on ? feed.pick.ids : null} onTick={feed.pick.toggle} onRead={onRead} onMark={(n) => onMark([n.id], !n.unread)} onDelete={feed.deleteRow} onOlder={feed.showOlder} />
      <Toast toast={deleted?.toast ?? null} action={deleted ? { label: "Undo", onClick: deleted.undo } : undefined} onClose={() => setDeleted(null)} />
    </>
  );
}

/** How many rows show: the latest STEP, STEP more for each "See older notifications", and the latest again whenever the filter changes. */
function usePaging(filter: string): [number, () => void] {
  const [paging, setPaging] = useState({ filter, shown: STEP });
  // Reset as the filter changes, during render (React's pattern for state that follows a prop), so
  // coming back to a filter doesn't bring back how far it was opened before.
  if (paging.filter !== filter) setPaging({ filter, shown: STEP });
  const shown = paging.filter === filter ? paging.shown : STEP;
  return [shown, () => setPaging({ filter, shown: shown + STEP })];
}

/** Select: whether it's on, and the rows ticked. Turning it off unticks them all. */
function useSelection() {
  const [on, setOn] = useState(false);
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set());
  return {
    on,
    ids,
    start: () => setOn(true),
    stop: () => {
      setOn(false);
      setIds(new Set());
    },
    toggle: (id: string, tick: boolean) => setIds((now) => new Set(tick ? [...now, id] : [...now].filter((x) => x !== id))),
    set: (next: string[]) => setIds(new Set(next)),
  };
}

/**
 * What the feed's controls do, with the keyboard kept in step: a deleted row hands the focus to the
 * one that takes its place, "See older notifications" to the first row it brings in, Select to the
 * first row's box, and leaving Select back to its button.
 */
function useFeedActions({ items, shown, showMore, list, selectButton, onMark, remove }: { items: FeedItem[]; shown: number; showMore: () => void; list: RefObject<HTMLDivElement | null>; selectButton: RefObject<HTMLButtonElement | null>; onMark: (ids: string[], unread: boolean) => void; remove: (gone: FeedItem[]) => void }) {
  const pick = useSelection();
  const focus = (selector: string) => list.current?.querySelector<HTMLElement>(selector)?.focus();
  const focusRow = (id?: string) => {
    if (id) focus(`[data-note="${CSS.escape(id)}"] ${pick.on ? "[data-slot=checkbox]" : "[data-note-open]"}`);
  };
  const leave = (then: () => void) => {
    flushSync(() => {
      then();
      pick.stop();
    });
    selectButton.current?.focus();
  };
  return {
    pick,
    startSelect: () => {
      flushSync(pick.start);
      focus("[data-note] [data-slot=checkbox]");
    },
    endSelect: () => leave(() => {}),
    markTicked: (ticked: FeedItem[]) => leave(() => onMark(ticked.map((n) => n.id), !ticked.some((n) => n.unread))),
    deleteTicked: (ticked: FeedItem[]) => leave(() => remove(ticked)),
    deleteRow: (n: FeedItem) => {
      const i = items.findIndex((m) => m.id === n.id);
      flushSync(() => remove([n]));
      focusRow((items[i + 1] ?? items[i - 1])?.id);
    },
    showOlder: () => {
      flushSync(showMore);
      focusRow(items[shown]?.id);
    },
  };
}

/** The filters, and what acts on the whole feed: Select, to pick some, and Mark all as read. Plain text at the row's right end, which wraps to a line of its own where the pills leave no room. */
function FeedTools<F extends string>({ filter, filters, onFilter, canSelect, unread, onSelect, onReadAll, selectRef }: { filter: F; filters: { value: F; label: string }[]; onFilter: (f: F) => void; canSelect: boolean; unread: number; onSelect: () => void; onReadAll: () => void; selectRef: RefObject<HTMLButtonElement | null> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Pills value={filter} onChange={onFilter} options={filters} />
      <span className="ml-auto flex shrink-0 items-center gap-4">
        <button ref={selectRef} type="button" onClick={onSelect} disabled={!canSelect} className={TEXT_ACTION}>
          Select
        </button>
        <button type="button" onClick={onReadAll} disabled={!unread} className={TEXT_ACTION}>
          Mark all as read
        </button>
      </span>
    </div>
  );
}

/**
 * Select's bar, in the filters' place while it's on: tick every row in view, how many are ticked, and
 * what to do with them, beside the count; Cancel at the far end, where the toasts come up. Mark as read
 * turns to Mark as unread when every ticked row is read already; Delete's toast has Undo, so it asks
 * nothing first.
 */
function SelectionBar({ count, all, onAll, unread, onMark, onDelete, onCancel }: { count: number; all: boolean; onAll: (on: boolean) => void; unread: boolean; onMark: () => void; onDelete: () => void; onCancel: () => void }) {
  const why = count ? undefined : "Select notifications first";
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Checkbox checked={all} onChange={onAll}>
        Select all
      </Checkbox>
      <span className="text-[13px] text-muted">{count} selected</span>
      <span className="-my-1 flex shrink-0 items-center gap-2">
        <Button size="sm" onClick={onMark} disabled={!count} title={why}>
          {unread || !count ? "Mark as read" : "Mark as unread"}
        </Button>
        <Button size="sm" variant="danger" onClick={onDelete} disabled={!count} title={why}>
          Delete
        </Button>
      </span>
      <Button size="sm" variant="ghost" onClick={onCancel} className="-my-1 ml-auto">
        Cancel
      </Button>
    </div>
  );
}

/**
 * The list card: the rows in view grouped Today / Yesterday / Earlier, "You're all caught up." when
 * there are none, and "See older notifications" at its foot while some are hidden. `ticked` is Select's
 * ticked rows, or null while Select is off.
 */
function FeedList({ ref, rows, older, ticked, onTick, onRead, onMark, onDelete, onOlder }: { ref: RefObject<HTMLDivElement | null>; rows: FeedItem[]; older: FeedItem[]; ticked: ReadonlySet<string> | null; onTick: (id: string, tick: boolean) => void; onRead: (id: string) => void; onMark: (n: FeedItem) => void; onDelete: (n: FeedItem) => void; onOlder: () => void }) {
  const withReturn = useWithReturn();
  const timed = rows.map((n) => ({ n, ...when(n) }));
  return (
    <div ref={ref} className="overflow-hidden rounded-lg bg-white outline -outline-offset-1 outline-line">
      {GROUPS.map((g) => {
        const group = timed.filter((r) => r.group === g);
        if (!group.length) return null;
        return (
          <section key={g}>
            <h2 className="px-4 pt-3 pb-1.5 text-[10.5px] leading-[1.45] font-semibold text-muted uppercase">{g}</h2>
            <ul>
              {group.map(({ n, time }) => (
                <FeedRow key={n.id} item={n} time={time} href={n.href ? withReturn(n.href) : undefined} ticked={ticked && ticked.has(n.id)} onTick={(tick) => onTick(n.id, tick)} onRead={() => onRead(n.id)} onMark={() => onMark(n)} onDelete={() => onDelete(n)} />
              ))}
            </ul>
          </section>
        );
      })}
      {rows.length === 0 && <p className="px-4 py-8 text-center text-[13px] text-muted">You’re all caught up.</p>}
      {older.length > 0 && <SeeOlder older={older} onClick={onOlder} />}
    </div>
  );
}

/** The list's foot while older notifications are hidden: how many there are, and how many of them are unread. */
function SeeOlder({ older, onClick }: { older: FeedItem[]; onClick: () => void }) {
  const unread = older.filter((n) => n.unread).length;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-wrap items-center justify-center gap-x-1.5 border-t border-line px-4 py-3 text-[13px] leading-[1.45] font-medium text-primary hover:bg-surface-alt focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
    >
      See older notifications
      <span className="font-normal text-muted">
        · {older.length} more{unread ? `, ${unread} unread` : ""}
      </span>
    </button>
  );
}

/**
 * One row of the feed: the unread dot, who it's from, what happened and when. The row opens `href`
 * (already carrying the way back) and marks it read; a row with nowhere to go only marks it read. Its
 * ⋮ follows the time. In Select (`ticked` isn't null) the whole row ticks its box instead, and opens nothing.
 */
function FeedRow({ item: n, time, href, ticked, onTick, onRead, onMark, onDelete }: { item: FeedItem; time: string; href?: string; ticked: boolean | null; onTick: (tick: boolean) => void; onRead: () => void; onMark: () => void; onDelete: () => void }) {
  const inner = (
    <>
      <span className={`mt-[14px] size-2 shrink-0 rounded-full ${n.unread ? "bg-accent" : "bg-line"}`} aria-hidden />
      <Sender item={n} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13.5px] font-semibold text-ink-deep">{n.title}</span>
        <span className="text-[12.5px] text-muted">{n.body}</span>
      </span>
      <span className="shrink-0 text-[11.5px] text-muted">{time}</span>
    </>
  );
  const area = "flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left";
  return (
    <li data-note={n.id} className={`group/note flex items-start border-t border-line leading-[1.45] hover:bg-surface-alt ${n.unread ? "bg-[#f0f5fc]" : "bg-white"}`}>
      {ticked !== null ? (
        <label className={`${area} cursor-pointer`}>
          <CheckboxBox checked={ticked} onChange={onTick} label={`Select “${n.title}”`} className="mt-[10px]" />
          {inner}
        </label>
      ) : href ? (
        <Link href={href} onClick={onRead} data-note-open className={area}>
          {inner}
        </Link>
      ) : (
        <button type="button" onClick={onRead} data-note-open className={area}>
          {inner}
        </button>
      )}
      {ticked === null && <RowMenu item={n} onMark={onMark} onDelete={onDelete} />}
    </li>
  );
}

/**
 * A row's ⋮: Mark as read (or Mark as unread) and Delete. It shows while the row is hovered or has the
 * focus, and while its menu is open (always on a touch screen, which can't hover), and the time moves
 * over to make room for it.
 */
function RowMenu({ item: n, onMark, onDelete }: { item: FeedItem; onMark: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <span className={`mt-1 mr-2 -ml-3 shrink-0 ${open ? "flex" : "hidden group-focus-within/note:flex group-hover/note:flex [@media(hover:none)]:flex"}`}>
      <KebabMenu label={`More actions for ${n.title}`} tip="More actions" open={open} onOpenChange={setOpen} menuWidth={176}>
        <MenuAction density="compact" onClick={onMark}>
          {n.unread ? "Mark as read" : "Mark as unread"}
        </MenuAction>
        <MenuAction density="compact" destructive onClick={onDelete}>
          Delete
        </MenuAction>
      </KebabMenu>
    </span>
  );
}
