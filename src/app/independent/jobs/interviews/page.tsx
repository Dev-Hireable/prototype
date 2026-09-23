"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Modal, Page, Pills, StatusDot, Toast, useToast } from "@/components/independent/ui";
import type { Interview } from "@/lib/independent/data";
import { useDemo } from "@/lib/independent/store";
import { useQueryState } from "@/lib/portal/query-state";
import { useWithReturn } from "@/components/portal/return";

const STATUS: Record<Interview["status"], { label: string; tone: "info" | "ok" | "neutral" | "danger" }> = {
  // A booking the talent hasn't answered yet. It read "Starts in 12 min" whatever the date was.
  starts: { label: "Awaiting reply", tone: "info" },
  accepted: { label: "Confirmed", tone: "ok" },
  completed: { label: "Completed", tone: "neutral" },
  declined: { label: "Declined", tone: "danger" },
};

/** Figma table columns: Role flex · Company 180 · Date and time 215 · Format 120 · Status 120 · Actions 200. */
const COLS = ["min-w-0 flex-1", "w-[180px]", "w-[215px]", "w-[120px]", "w-[120px]", "w-[200px]"];

/** Figma "Interviews / My interviews · list": pill tabs, table (header #f2f2f2, px 16 / py 12), 12px footnote. */
export default function Interviews() {
  const [tab, setTab] = useQueryState("tab", "upcoming", ["upcoming", "past"] as const);
  /** IN-070 — the interviews the Team Builder has actually booked, not a copy in page state. */
  const { interviews: items, declineInterview, setStage } = useDemo();
  const withReturn = useWithReturn();
  const [declining, setDeclining] = useState<Interview | null>(null);
  const [toast, setToast] = useToast();
  const upcoming = items.filter((i) => !i.past);
  const past = items.filter((i) => i.past);
  const rows = tab === "upcoming" ? upcoming : past;

  return (
    <Page title="Interviews">
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
              <Link href={withReturn(iv.roleHref)} className="text-[14px] font-medium text-primary hover:underline">
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
              {/* IN-070 — an invitation is answered here too, not only from the application page.
                  Join call used to be live only before accepting, and never opened the meeting. */}
              {iv.status === "starts" && !iv.past ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setStage(iv.id, "invite_accepted", { label: "Interview confirmed", tone: "info", meta: iv.when });
                    setToast("Interview accepted");
                  }}
                >
                  Accept
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={iv.status !== "accepted" || iv.past}
                  title={iv.status === "accepted" && !iv.link ? "No meeting link yet — ask the Team Builder to share one" : undefined}
                  onClick={() => {
                    if (!iv.link) return setToast("No meeting link yet — ask the Team Builder to share one.");
                    window.open(iv.link, "_blank", "noopener");
                  }}
                >
                  Join call
                </Button>
              )}
              <Button size="sm" disabled={iv.status === "declined" || iv.past} onClick={() => setDeclining(iv)}>
                Decline
              </Button>
            </span>
          </div>
        ))}
        {rows.length === 0 && <p className="border-t border-border px-4 py-8 text-center text-[13px] text-ink-2">Nothing here.</p>}
      </div>
      <p className="text-[12px] leading-[1.4] text-ink-2">Accept to confirm the slot; Join call then opens the meeting link. Declining sends the employer a note and keeps your application open.</p>

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
                if (declining) declineInterview(declining.id);
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
