"use client";

import { Page } from "@/components/portal/ui";
import { NotificationFeed } from "@/components/portal/notification-feed";
import { useNotifications } from "@/lib/demo/live";
import { useQueryState } from "@/lib/portal/query-state";

type Filter = "all" | "unread" | "hiring" | "independents" | "payments";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "hiring", label: "Hiring" },
  { value: "independents", label: "Independents" },
  { value: "payments", label: "Payments" },
];
const VALUES = FILTERS.map((f) => f.value);

/**
 * The same feed as the independent's (@/components/portal/NotificationFeed). This page had its own
 * design for the same events: separate cards, a breadcrumb and a button per row.
 */
export default function Notifications() {
  const { notifications, markRead } = useNotifications("team");
  const [filter, setFilter] = useQueryState<Filter>("filter", "all", VALUES);
  const list = notifications.filter((n) => (filter === "all" ? true : filter === "unread" ? n.unread : n.kind === filter));

  return (
    <Page title="Notifications">
      <NotificationFeed items={list} unread={notifications.filter((n) => n.unread).length} filter={filter} filters={FILTERS} onFilter={setFilter} onRead={markRead} />
    </Page>
  );
}
