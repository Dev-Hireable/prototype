"use client";

import { Page } from "@/components/portal/ui";
import { NotificationPreferencesCard, type NotificationPreference } from "@/components/portal/settings";

/** Under the same names as the Notifications filters (@/lib/portal/notification-categories). */
const EVENTS = [
  { key: "applications", title: "Applications", body: "Role invites, proposal requests and revisions, offers received or withdrawn", app: true, email: true, appDisabled: true },
  { key: "interviews", title: "Interviews", body: "Invites received, rescheduled or cancelled", app: true, email: true },
  { key: "tasks", title: "Tasks", body: "Tasks approved, sent back or added, comments, evaluations", app: true, email: false },
  { key: "messages", title: "Messages", body: "New messages and calls", app: true, email: true },
  { key: "payments", title: "Payments", body: "Escrow funded, payouts released, disputes", app: true, email: true, appDisabled: true, emailDisabled: true },
  { key: "product", title: "Product updates", body: "New features and tips", app: false, email: false },
] satisfies readonly NotificationPreference[];

export default function NotificationPrefs() {
  return (
    <Page title="Settings">
      <NotificationPreferencesCard events={EVENTS} />
    </Page>
  );
}
