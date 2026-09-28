"use client";

import { Page } from "@/components/independent/ui";
import { NotificationPreferencesCard, type NotificationPreference } from "@/components/portal/settings";

const EVENTS = [
  { key: "apps", title: "Applications and matches", body: "New applications, invite responses, match updates", app: true, email: true },
  { key: "interviews", title: "Interviews", body: "Invites accepted, rescheduled or cancelled", app: true, email: true },
  { key: "proposals", title: "Proposals and offers", body: "Proposal received, revised or declined; offer accepted", app: true, email: true, appDisabled: true },
  { key: "updates", title: "Task reviews", body: "Tasks sent to you for review", app: true, email: false },
  { key: "evals", title: "Evaluations", body: "Trial ended, evaluation due", app: true, email: true },
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
