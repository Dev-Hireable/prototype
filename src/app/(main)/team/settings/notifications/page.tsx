"use client";

import { Page } from "@/components/portal/ui";
import { NotificationPreferencesCard, type NotificationPreference } from "@/components/portal/settings";

/** Under the same names as the Notifications filters (@/lib/portal/notification-categories). */
const EVENTS = [
  { key: "applications", title: "Applications", body: "New applications, proposals, and offers accepted or declined", app: true, email: true, appDisabled: true },
  { key: "interviews", title: "Interviews", body: "Invites accepted, declined, rescheduled or cancelled", app: true, email: true },
  { key: "tasks", title: "Tasks", body: "Tasks sent for review, comments, evaluations due", app: true, email: false },
  { key: "messages", title: "Messages", body: "New messages and calls", app: true, email: true },
  { key: "payments", title: "Payments", body: "Escrow charged, salary paid, disputes", app: true, email: true, appDisabled: true, emailDisabled: true },
  { key: "product", title: "Product updates", body: "New features and tips", app: false, email: false },
] satisfies readonly NotificationPreference[];

export default function NotificationPrefs() {
  return (
    <Page title="Settings">
      <NotificationPreferencesCard events={EVENTS} />
    </Page>
  );
}
