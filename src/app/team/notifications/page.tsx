"use client";

import { useWithReturn } from "@/components/portal/return";
import { EmptyState, LinkButton, Page, Pills } from "@/components/independent/ui";
import { Avatar } from "@/components/team/ui";
import { resetDemo } from "@/lib/demo/live";
import { useDemo } from "@/lib/team/store";
import { useQueryState } from "@/lib/portal/query-state";

type Filter = "all" | "unread" | "hiring" | "independents" | "payments";

/** Figma "Notifications / Full page / Empty" (Team Builder): pill filters, grouped cards (px 16 / py 14), unread #f5faff with a dot. */
export default function Notifications() {
  const { notifications, markRead } = useDemo();
  const withReturn = useWithReturn();
  const [filter, setFilter] = useQueryState<Filter>("filter", "all", ["all", "unread", "hiring", "independents", "payments"]);
  const unread = notifications.filter((n) => n.unread).length;
  const list = notifications.filter((n) => (filter === "all" ? true : filter === "unread" ? n.unread : n.kind === filter));
  const groups = ["Today", "Last 7 days"] as const;

  return (
    <Page title="Notifications">
      <div className="flex items-center justify-between">
        <Pills
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "unread", label: `Unread (${unread})` },
            { value: "hiring", label: "Hiring" },
            { value: "independents", label: "Independents" },
            { value: "payments", label: "Payments" },
          ]}
        />
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => markRead()} disabled={!unread} className="text-[13px] leading-[1.4] font-medium text-primary disabled:text-ink-2">
            Mark all as read
          </button>
          <button type="button" onClick={resetDemo} className="text-[12.5px] leading-[1.4] font-medium text-ink-2 underline underline-offset-2">
            Reset demo
          </button>
        </div>
      </div>
      {list.length === 0 && <EmptyState title="You’re all caught up" body="New applications, interview replies and payment events land here." />}
      {groups.map((g) => {
        const items = list.filter((n) => n.group === g);
        if (!items.length) return null;
        return (
          <section key={g} className="flex flex-col gap-2">
            <h2 className="text-[13px] leading-[1.4] font-medium text-ink-2">{g}</h2>
            {items.map((n) => (
              <div key={n.id} className={`flex items-start gap-3 rounded-lg px-4 py-3.5 outline -outline-offset-1 outline-border ${n.unread ? "bg-[#f5faff]" : "bg-white"}`}>
                <span className="flex h-3.5 w-2 items-center justify-center">
                  <span className={`size-2 rounded-full ${n.unread ? "bg-primary" : "bg-transparent"}`} />
                </span>
                <Avatar src={n.avatar} size={36} />
                <button type="button" onClick={() => markRead(n.id)} className="flex min-w-0 flex-1 flex-col gap-1 text-left leading-[1.4]">
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <span className={`text-[14px] text-ink ${n.unread ? "font-semibold" : "font-medium"}`}>{n.title}</span>
                    <span className="text-[12px] text-ink-2">{n.crumb}</span>
                  </span>
                  <span className="max-w-[700px] text-[13px] text-ink-2">{n.body}</span>
                  {n.action && (
                    <span className="pt-1.5">
                      <LinkButton size="sm" variant={n.action.primary ? "primary" : "secondary"} href={withReturn(n.action.href)}>
                        {n.action.label}
                      </LinkButton>
                    </span>
                  )}
                </button>
                <span className="shrink-0 text-[12px] leading-[1.4] text-ink-2">{n.time}</span>
              </div>
            ))}
          </section>
        );
      })}
    </Page>
  );
}
