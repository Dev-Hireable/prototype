"use client";

import { Page } from "@/components/portal/ui";
import { NotificationFeed } from "@/components/portal/notification-feed";
import { useNotifications } from "@/lib/demo/live";
import { categoryOf, NOTE_CATEGORIES, type NoteCategory } from "@/lib/portal/notification-categories";
import { useQueryState } from "@/lib/portal/query-state";

type Filter = "all" | "unread" | NoteCategory;
/** The shared categories (@/lib/portal/notification-categories), the same names as notification settings. */
const FILTERS: { value: Filter; label: string }[] = [{ value: "all", label: "All" }, { value: "unread", label: "Unread" }, ...NOTE_CATEGORIES];
const VALUES = FILTERS.map((f) => f.value);

/** The feed both portals share (@/components/portal/NotificationFeed). Every row opens its entry in the Messages thread. */
export default function Notifications() {
  const { notifications, markRead } = useNotifications("team");
  const [filter, setFilter] = useQueryState<Filter>("filter", "all", VALUES);
  const list = notifications.filter((n) => (filter === "all" ? true : filter === "unread" ? n.unread : categoryOf(n) === filter));

  return (
    <Page title="Notifications">
      <NotificationFeed items={list} unread={notifications.filter((n) => n.unread).length} filter={filter} filters={FILTERS} onFilter={setFilter} onRead={markRead} />
    </Page>
  );
}
