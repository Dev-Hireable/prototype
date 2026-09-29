"use client";

import Image from "next/image";
import Link from "next/link";
import { Pills } from "@/components/portal/ui";
import { useWithReturn } from "@/components/portal/return";
import { MONTHS } from "@/lib/portal/dates";

/** One notification as the feed shows it, whichever portal it came from. */
export type FeedItem = {
  id: string;
  title: string;
  body: string;
  unread: boolean;
  /** Where the row opens. The whole row is the link. */
  href?: string;
  /** Who it is from. Rows without a photo show their initials instead. */
  avatar?: string;
  initials?: string;
  /** When it happened (epoch ms). Older records carry only the stored group and time. */
  at?: number;
  group: string;
  time: string;
};

type Group = "Today" | "Yesterday" | "Earlier";
const GROUPS: Group[] = ["Today", "Yesterday", "Earlier"];

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

function Sender({ item }: { item: FeedItem }) {
  if (item.avatar) return <Image src={item.avatar} alt="" width={72} height={72} className="size-9 shrink-0 rounded-full bg-[#d2d8db] object-cover object-top" />;
  return (
    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e8f1fa] text-[12px] font-semibold text-primary">
      {item.initials ?? "H"}
    </span>
  );
}

/**
 * The notification feed, in both portals: pill filters, one list with group headers, unread rows
 * tinted, and the whole row opens what it is about. Each row also shows who it is from. The Team
 * Builder's feed was a different design (separate cards, a breadcrumb, an action button) for the
 * same events.
 */
export function NotificationFeed<F extends string>({
  items,
  unread,
  filter,
  filters,
  onFilter,
  onRead,
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
}) {
  const withReturn = useWithReturn();
  const rows = items.map((n) => ({ n, ...when(n) }));

  return (
    <>
      {/* Mark all as read is plain text at the row's right end. It was a button beside the pills;
          text is enough. Where the pills leave no room, it wraps to a line of its own, still right. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Pills value={filter} onChange={onFilter} options={filters} />
        <button
          type="button"
          onClick={() => onRead()}
          disabled={!unread}
          className="ml-auto shrink-0 rounded-md text-[13px] font-medium text-primary enabled:hover:underline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:text-[#c3c3c3]"
        >
          Mark all as read
        </button>
      </div>
      <div className="overflow-hidden rounded-lg bg-white outline -outline-offset-1 outline-line">
        {GROUPS.map((g) => {
          const group = rows.filter((r) => r.group === g);
          if (!group.length) return null;
          return (
            <section key={g}>
              <h2 className="px-4 pt-3 pb-1.5 text-[10.5px] leading-[1.45] font-semibold text-muted uppercase">{g}</h2>
              <ul>
                {group.map(({ n, time }) => (
                  <FeedRow key={n.id} item={n} time={time} href={n.href ? withReturn(n.href) : undefined} onRead={() => onRead(n.id)} />
                ))}
              </ul>
            </section>
          );
        })}
        {items.length === 0 && <p className="px-4 py-8 text-center text-[13px] text-muted">You’re all caught up.</p>}
      </div>
    </>
  );
}

/**
 * One row of the feed: the unread dot, who it's from, what happened and when. The whole row opens
 * `href` (already carrying the way back) and marks it read; a row with nowhere to go only marks it read.
 */
function FeedRow({ item: n, time, href, onRead }: { item: FeedItem; time: string; href?: string; onRead: () => void }) {
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
  const row = "flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-alt";
  return (
    <li className={`border-t border-line leading-[1.45] ${n.unread ? "bg-[#f0f5fc]" : "bg-white"}`}>
      {href ? (
        <Link href={href} onClick={onRead} className={row}>
          {inner}
        </Link>
      ) : (
        <button type="button" onClick={onRead} className={row}>
          {inner}
        </button>
      )}
    </li>
  );
}
