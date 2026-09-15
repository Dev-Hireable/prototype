"use client";

import { useState } from "react";
import { Button, Card, Checkbox, Page, Toast, useToast } from "@/components/independent/ui";

const EVENTS = [
  { key: "apps", title: "Applications and proposals", body: "Role invites, proposal requests, revision rounds", app: true, email: true },
  { key: "interviews", title: "Interviews", body: "Invites received, rescheduled or cancelled", app: true, email: true },
  { key: "offers", title: "Offers", body: "Offer received, updated or withdrawn", app: true, email: true, locked: true },
  { key: "logs", title: "Objectives and activity logs", body: "Your updates approved or sent back for revision", app: true, email: false },
  { key: "evals", title: "Evaluations", body: "Trial ended, evaluation received", app: true, email: true },
  { key: "payments", title: "Payments", body: "Escrow funded, payout released", app: true, email: true, locked: true },
  { key: "product", title: "Product updates", body: "New features and tips", app: false, email: false },
];

/** Figma "Settings / Notification preferences": DM Sans 24 header; 760 card, p 24, gap 16; rows py 10 with 80px check columns. */
export default function NotificationPrefs() {
  const [prefs, setPrefs] = useState(EVENTS);
  const [toast, setToast] = useToast();
  const toggle = (key: string, field: "app" | "email", v: boolean) => setPrefs((p) => p.map((e) => (e.key === key ? { ...e, [field]: v } : e)));

  return (
    <Page title="Settings">
      <Card className="mx-auto flex w-[760px] flex-col gap-4 p-6">
        <h2 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
          Notification preferences
        </h2>
        <p className="max-w-[700px] text-[13px] leading-[1.4] text-ink-2">Choose where you hear about each event. In-app notifications for offers and payments cannot be turned off.</p>
        <div className="flex items-center gap-4 border-b border-border py-2 text-[12px] leading-[1.4] font-medium text-ink-2">
          <span className="flex-1">Event</span>
          <span className="w-20 text-center">In-app</span>
          <span className="w-20 text-center">Email</span>
        </div>
        {prefs.map((e) => (
          <div key={e.key} className="flex items-center gap-4 border-b border-border py-2.5 leading-[1.4] whitespace-nowrap">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-[14px] font-medium text-ink">{e.title}</p>
              <p className="text-[12px] text-ink-2">{e.body}</p>
            </div>
            <span className="flex h-6 w-20 items-center justify-center">
              <Checkbox checked={e.app} disabled={e.locked} onChange={(v) => toggle(e.key, "app", v)} />
            </span>
            <span className="flex h-6 w-20 items-center justify-center">
              <Checkbox checked={e.email} disabled={e.key === "payments"} onChange={(v) => toggle(e.key, "email", v)} />
            </span>
          </div>
        ))}
        <div className="flex justify-end">
          <Button size="lg" variant="primary" onClick={() => setToast("Preferences saved")}>
            Save preferences
          </Button>
        </div>
      </Card>
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
