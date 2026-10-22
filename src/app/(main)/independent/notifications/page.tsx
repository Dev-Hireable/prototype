"use client";

import { useSyncExternalStore } from "react";
import { Page } from "@/components/portal/ui";
import { NotificationFeed } from "@/components/portal/notification-feed";
import { storedCompanyLogo, useNotifications } from "@/lib/demo/live";
import { categoryOf, NOTE_CATEGORIES, type NoteCategory } from "@/lib/portal/notification-categories";
import { useQueryState } from "@/lib/portal/query-state";

type Filter = "all" | "unread" | NoteCategory;
/** The shared categories (@/lib/portal/notification-categories), the same names as notification settings. */
const FILTERS: { value: Filter; label: string }[] = [{ value: "all", label: "All" }, { value: "unread", label: "Unread" }, ...NOTE_CATEGORIES];
const VALUES = FILTERS.map((f) => f.value);

/** Nothing to subscribe to: the logo is saved on the Team Builder's side, and this reads it as it loads. */
const NO_SUBSCRIBE = () => () => {};

/**
 * The feed both portals share (@/components/portal/NotificationFeed). Every row opens the item it's
 * about, and can be marked or deleted; the company's own notices wear its uploaded logo, or its initials until it has one.
 */
export default function Notifications() {
  const { notifications, markRead, mark, remove } = useNotifications("independent");
  const [filter, setFilter] = useQueryState<Filter>("filter", "all", VALUES);
  const logo = useSyncExternalStore(NO_SUBSCRIBE, storedCompanyLogo, () => null);
  const list = notifications.filter((n) => (filter === "all" ? true : filter === "unread" ? n.unread : categoryOf(n) === filter)).map((n) => (logo && n.initials ? { ...n, logo } : n));

  return (
    <Page title="Notifications">
      <NotificationFeed items={list} unread={notifications.filter((n) => n.unread).length} filter={filter} filters={FILTERS} onFilter={setFilter} onRead={markRead} onMark={mark} onDelete={remove} />
    </Page>
  );
}
