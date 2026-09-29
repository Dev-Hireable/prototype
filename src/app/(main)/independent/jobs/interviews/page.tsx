"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, LinkButton, Modal, Page, Row, StatusDot, Table, Toast } from "@/components/portal/ui";
import { canJoin } from "@/lib/portal/dates";
import type { Interview } from "@/lib/independent/data";
import { useApplications } from "@/lib/independent/applications";
import { useQueryState } from "@/lib/portal/query-state";
import { useToast } from "@/lib/portal/toast";
import { ROW_LINK } from "@/components/portal/toolbar";
import { ViewSwitch } from "@/components/portal/view-switch";
import { useWithReturn } from "@/components/portal/return";

const STATUS: Record<Interview["status"], { label: string; tone: "info" | "ok" | "neutral" | "danger" }> = {
  // A booking the talent hasn't answered yet. It read "Starts in 12 min" whatever the date was.
  starts: { label: "Awaiting reply", tone: "info" },
  accepted: { label: "Confirmed", tone: "ok" },
  completed: { label: "Completed", tone: "neutral" },
  declined: { label: "Declined", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

/**
 * Role flex · Company · Date and time · Format · Status · Actions, on the same grid table as every
 * other portal list (it was a hand-rolled one without column rules). Date and time take two lines,
 * as on the Team Builder's side, so a long slot can't run into Format.
 */
const COLS = ["min-w-[220px] flex-1", "w-[180px]", "w-[150px]", "w-[120px]", "w-[130px]", "w-[200px]"];

export default function Interviews() {
  const [tab, setTab] = useQueryState("tab", "upcoming", ["upcoming", "past"] as const);
  /** IN-070 — the interviews the Team Builder has actually booked, not a copy in page state. */
  const { interviews: items, declineInterview, setStage } = useApplications();
  const withReturn = useWithReturn();
  const [declining, setDeclining] = useState<Interview | null>(null);
  const [toast, setToast] = useToast();
  const upcoming = items.filter((i) => !i.past);
  const past = items.filter((i) => i.past);
  const rows = tab === "upcoming" ? upcoming : past;
  /** IN-070 — accepting confirms the slot, and it shows as confirmed on the application. */
  const accept = (iv: Interview) => {
    setStage(iv.id, "invite_accepted", { label: "Interview confirmed", tone: "info", meta: iv.when });
    setToast("Interview accepted");
  };

  return (
    <Page title="Interviews">
      {/* The same 36px switch as every list's toolbar. */}
      <div className="flex items-center gap-2" role="toolbar" aria-label="Interviews">
        <ViewSwitch
          label="Show"
          value={tab}
          onChange={setTab}
          options={[
            { value: "upcoming", label: `Upcoming (${upcoming.length})`, icon: "schedule" },
            { value: "past", label: `Past (${past.length})`, icon: "history" },
          ]}
        />
      </div>
      <Table cols={COLS} head={["Role", "Company", "Date and time", "Format", "Status", "Actions"]}>
        {rows.map((iv) => (
          <InterviewRow key={iv.id} iv={iv} href={withReturn(iv.roleHref)} onAccept={() => accept(iv)} onDecline={() => setDeclining(iv)} />
        ))}
        {rows.length === 0 && (
          <p className="border-t border-border px-4 py-8 text-center text-[13px] text-ink-2">
            {tab === "upcoming" ? "No interviews coming up. Invitations from Team Builders land here." : "No past interviews yet."}
          </p>
        )}
      </Table>
      <p className="text-[12px] leading-[1.4] text-ink-2">Accept to confirm the slot; Join call then opens the meeting link. Declining sends the employer a note and keeps your application open.</p>

      <DeclineInterview
        interview={declining}
        onClose={() => setDeclining(null)}
        onDecline={() => {
          if (declining) declineInterview(declining.id);
          setDeclining(null);
          setToast("Interview declined");
        }}
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** One interview: the role (the whole row opens its application), the company, when, the format and status, and what can be done. */
function InterviewRow({ iv, href, onAccept, onDecline }: { iv: Interview; href: string; onAccept: () => void; onDecline: () => void }) {
  const [date, time] = iv.when.split(", ");
  return (
    // The whole row opens the application; the buttons stay their own.
    <Row className="relative">
      <span className={`${COLS[0]} !whitespace-normal`}>
        <Link href={href} className={`line-clamp-2 text-[14px] leading-[1.35] font-semibold text-ink ${ROW_LINK}`}>
          {iv.role}
        </Link>
      </span>
      <span className={`${COLS[1]} truncate`}>{iv.company}</span>
      <span className={COLS[2]}>
        <span className="block">{date}</span>
        <span className="block text-[12px] text-ink-2">{time}</span>
      </span>
      <span className={`${COLS[3]} text-ink-2`}>{iv.format}</span>
      <span className={COLS[4]}>
        <StatusDot tone={STATUS[iv.status].tone}>{STATUS[iv.status].label}</StatusDot>
      </span>
      <span className={`${COLS[5]} relative z-10 flex gap-2`}>
        <RowActions iv={iv} href={href} onAccept={onAccept} onDecline={onDecline} />
      </span>
    </Row>
  );
}

/** A row's buttons: the application once the interview is over; before it, Accept or Join call, and Decline. */
function RowActions({ iv, href, onAccept, onDecline }: { iv: Interview; href: string; onAccept: () => void; onDecline: () => void }) {
  if (iv.past) {
    return (
      // Over — declined, cancelled or held — so what is left is the application itself.
      <LinkButton size="sm" href={href}>
        View application
      </LinkButton>
    );
  }
  const joinable = iv.status === "accepted" && !!iv.link && canJoin(iv.when);
  return (
    <>
      {/* IN-070 — an invitation is answered here too, not only from the application page. */}
      {iv.status === "starts" ? (
        <Button size="sm" variant="primary" onClick={onAccept}>
          Accept
        </Button>
      ) : (
        <Button
          size="sm"
          variant="primary"
          disabled={!joinable}
          title={joinable ? undefined : !iv.link ? "No meeting link yet — ask the Team Builder to share one" : "Opens 15 minutes before the start"}
          onClick={() => iv.link && window.open(iv.link, "_blank", "noopener")}
        >
          Join call
        </Button>
      )}
      <Button size="sm" variant="danger" onClick={onDecline}>
        Decline
      </Button>
    </>
  );
}

/** Declining an interview: the company gets a note, and the application for the role stays open. */
function DeclineInterview({ interview, onClose, onDecline }: { interview: Interview | null; onClose: () => void; onDecline: () => void }) {
  return (
    <Modal
      open={!!interview}
      onClose={onClose}
      tone="danger"
      title="Decline this interview?"
      description={`${interview?.company} gets a note and your application for ${interview?.role} stays open. You can ask to reschedule from Messages.`}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="danger" onClick={onDecline}>
            Decline
          </Button>
        </>
      }
    />
  );
}
