"use client";

import { Page } from "@/components/portal/ui";
import { NotificationFeed } from "@/components/portal/notification-feed";
import { useNotifications } from "@/lib/demo/live";
import { useQueryState } from "@/lib/portal/query-state";

type Filter = "all" | "unread" | "interviews" | "contracts" | "offers" | "payments";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "interviews", label: "Interviews" },
  { value: "contracts", label: "Contracts" },
  { value: "offers", label: "Offers" },
  { value: "payments", label: "Payments" },
];
/** Every pill is an allowed value. Interviews was left off this list, so choosing it snapped back to All. */
const VALUES = FILTERS.map((f) => f.value);

/** The feed both portals share (@/components/portal/NotificationFeed). */
export default function Notifications() {
  const { notifications, markRead } = useNotifications("independent");
  const [filter, setFilter] = useQueryState<Filter>("filter", "all", VALUES);
  const list = notifications.filter((n) => (filter === "all" ? true : filter === "unread" ? n.unread : n.kind === filter));

  return (
    <Page title="Notifications">
      <NotificationFeed items={list} unread={notifications.filter((n) => n.unread).length} filter={filter} filters={FILTERS} onFilter={setFilter} onRead={markRead} />
    </Page>
  );
}
