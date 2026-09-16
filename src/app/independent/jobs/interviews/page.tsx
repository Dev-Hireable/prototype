"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Modal, Page, Pills, StatusDot, Toast, useToast } from "@/components/independent/ui";
import { interviews as seed } from "@/lib/independent/data";
import type { Interview } from "@/lib/independent/data";

const STATUS: Record<Interview["status"], { label: string; tone: "info" | "ok" | "neutral" | "danger" }> = {
  starts: { label: "Starts in 12 min", tone: "info" },
  accepted: { label: "Accepted", tone: "ok" },
  completed: { label: "Completed", tone: "neutral" },
  declined: { label: "Declined", tone: "danger" },
};

/** Figma table columns: Role flex · Company 180 · Date and time 215 · Format 120 · Status 120 · Actions 200. */
const COLS = ["min-w-0 flex-1", "w-[180px]", "w-[215px]", "w-[120px]", "w-[120px]", "w-[200px]"];

/** Figma "Interviews / My interviews · list": pill tabs, table (header #f2f2f2, px 16 / py 12), 12px footnote. */
export default function Interviews() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [items, setItems] = useState(seed);
  const [declining, setDeclining] = useState<Interview | null>(null);
  const [toast, setToast] = useToast();
  const upcoming = items.filter((i) => !i.past);
  const past = items.filter((i) => i.past);
  const rows = tab === "upcoming" ? upcoming : past;

  return (
    <Page title="Interviews" heading="default">
      <Pills
        value={tab}
        onChange={setTab}
        options={[
          { value: "upcoming", label: `Upcoming (${upcoming.length})` },
          { value: "past", label: `Past (${past.length})` },
        ]}
      />
      <div className="overflow-hidden rounded-lg outline -outline-offset-1 outline-border">
        <div className="flex items-center gap-4 bg-surface-2 px-4 py-3 text-[13px] leading-[1.4] font-medium whitespace-nowrap text-ink-2">
          {["Role", "Company", "Date and time", "Format", "Status", "Actions"].map((h, i) => (
            <span key={h} className={COLS[i]}>
              {h}
            </span>
          ))}
        </div>
        {rows.map((iv) => (
          <div key={iv.id} className="flex items-center gap-4 border-t border-border px-4 py-3 text-[13px] leading-[1.4] whitespace-nowrap text-ink">
            <span className={COLS[0]}>
              <Link href={iv.roleHref} className="text-[14px] font-medium text-primary hover:underline">
                {iv.role}
              </Link>
            </span>
            <span className={COLS[1]}>{iv.company}</span>
            <span className={COLS[2]}>{iv.when}</span>
            <span className={`${COLS[3]} text-ink-2`}>{iv.format}</span>
            <span className={COLS[4]}>
              <StatusDot tone={STATUS[iv.status].tone}>{STATUS[iv.status].label}</StatusDot>
            </span>
            <span className={`${COLS[5]} flex gap-2`}>
              <Button size="sm" variant="primary" disabled={iv.status !== "starts"} onClick={() => setToast("Opening Google Meet…")}>
                Join call
              </Button>
              <Button size="sm" disabled={iv.status === "declined" || iv.past} onClick={() => setDeclining(iv)}>
                Decline
              </Button>
            </span>
          </div>
        ))}
        {rows.length === 0 && <p className="border-t border-border px-4 py-8 text-center text-[13px] text-ink-2">Nothing here.</p>}
      </div>
      <p className="text-[12px] leading-[1.4] text-ink-2">Join call turns on 15 minutes before the start. Declining sends the employer a note and keeps your application open.</p>

      <Modal
        open={!!declining}
        onClose={() => setDeclining(null)}
        tone="danger"
        title="Decline this interview?"
        description={`${declining?.company} gets a note and your application for ${declining?.role} stays open. You can ask to reschedule from Messages.`}
        footer={
          <>
            <Button size="lg" onClick={() => setDeclining(null)}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant="danger"
              onClick={() => {
                setItems((all) => all.map((i) => (i.id === declining?.id ? { ...i, status: "declined", past: true } : i)));
                setDeclining(null);
                setToast("Interview declined");
              }}
            >
              Decline
            </Button>
          </>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
