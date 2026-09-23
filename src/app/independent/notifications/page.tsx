"use client";

import Link from "next/link";
import { Button, Page, Pills } from "@/components/independent/ui";
import { resetDemo } from "@/lib/demo/live";
import { useDemo } from "@/lib/independent/store";
import { useQueryState } from "@/lib/portal/query-state";
import { useWithReturn } from "@/components/portal/return";

type Filter = "all" | "unread" | "interviews" | "contracts" | "offers" | "payments";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "interviews", label: "Interviews" },
  { value: "contracts", label: "Contracts" },
  { value: "offers", label: "Offers" },
  { value: "payments", label: "Payments" },
];

/** Figma "Notifications / Independent": 12.5px pill filters, #e3e8ed list with 10.5px group headers; unread rows #f0f5fc. */
export default function Notifications() {
  const { notifications, markRead } = useDemo();
  const withReturn = useWithReturn();
  const [filter, setFilter] = useQueryState<Filter>("filter", "all", ["all", "unread", "contracts", "offers", "payments"]);
  const list = notifications.filter((n) => (filter === "all" ? true : filter === "unread" ? n.unread : n.kind === filter));
  const groups = ["Today", "Yesterday", "Earlier"] as const;

  return (
    <Page title="Notifications">
      <div className="flex items-center gap-2">
        <Pills value={filter} onChange={setFilter} options={FILTERS} />
        <span className="w-2.5" />
        <Button size="sm" onClick={() => markRead()} disabled={!notifications.some((n) => n.unread)}>
          Mark all as read
        </Button>
        <button type="button" onClick={resetDemo} className="ml-auto text-[12.5px] leading-[1.45] font-medium text-muted underline underline-offset-2">
          Reset demo
        </button>
      </div>
      <div className="overflow-hidden rounded-lg bg-white outline -outline-offset-1 outline-line">
        {groups.map((g) => {
          const items = list.filter((n) => n.group === g);
          if (!items.length) return null;
          return (
            <section key={g}>
              <h2 className="px-4 pt-3 pb-1.5 text-[10.5px] leading-[1.45] font-semibold text-muted uppercase">{g}</h2>
              <ul>
                {items.map((n) => (
                  <li key={n.id} className={`border-t border-line leading-[1.45] ${n.unread ? "bg-[#f0f5fc]" : "bg-white"}`}>
                    <Link href={withReturn(n.href)} onClick={() => markRead(n.id)} className="flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-alt">
                      <span className={`mt-[5px] size-2 shrink-0 rounded-full ${n.unread ? "bg-accent" : "bg-line"}`} aria-hidden />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[13.5px] font-semibold text-ink-deep">{n.title}</span>
                        <span className="text-[12.5px] text-muted">{n.body}</span>
                      </span>
                      <span className="shrink-0 text-[11.5px] text-muted">{n.time}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {list.length === 0 && <p className="px-4 py-8 text-center text-[13px] text-muted">You’re all caught up.</p>}
      </div>
    </Page>
  );
}
