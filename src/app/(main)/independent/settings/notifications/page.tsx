"use client";

import { Page } from "@/components/portal/ui";
import { NotificationPreferencesCard, type NotificationPreference } from "@/components/portal/settings";

const EVENTS = [
  { key: "apps", title: "Applications and proposals", body: "Role invites, proposal requests, revision rounds", app: true, email: true },
  { key: "interviews", title: "Interviews", body: "Invites received, rescheduled or cancelled", app: true, email: true },
  { key: "offers", title: "Offers", body: "Offer received, updated or withdrawn", app: true, email: true, appDisabled: true },
  { key: "logs", title: "Tasks and reviews", body: "Tasks approved, sent back with changes, or added for you", app: true, email: false },
  { key: "evals", title: "Evaluations", body: "Trial ended, evaluation received", app: true, email: true },
  { key: "payments", title: "Payments", body: "Escrow funded, payout released", app: true, email: true, appDisabled: true, emailDisabled: true },
  { key: "product", title: "Product updates", body: "New features and tips", app: false, email: false },
] satisfies readonly NotificationPreference[];

export default function NotificationPrefs() {
  return (
    <Page title="Settings">
      <NotificationPreferencesCard events={EVENTS} />
    </Page>
  );
}
