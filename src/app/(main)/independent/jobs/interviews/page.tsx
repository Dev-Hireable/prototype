"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button, EmptyState, LinkButton, Modal, Page, Pills, Row, StatusDot, Table, Toast } from "@/components/portal/ui";
import { canJoin, JOIN_OPENS_MINUTES } from "@/lib/portal/dates";
import type { Interview } from "@/lib/independent/data";
import { useApplications } from "@/lib/independent/applications";
import { useInterviewTime } from "@/lib/independent/interview-time";
import { useQueryState } from "@/lib/portal/query-state";
import { useToast } from "@/lib/portal/toast";
import { ROW_LINK } from "@/components/portal/toolbar";
import { useWithReturn } from "@/components/portal/return";
import { RescheduleDialog } from "@/components/independent/reschedule-dialog";

const STATUS: Record<Interview["status"], { label: string; tone: "info" | "ok" | "neutral" | "danger" | "warn" }> = {
  // A booking the talent hasn't answered yet: the same words, and the same orange, as on the application.
  starts: { label: "Awaiting your reply", tone: "warn" },
  accepted: { label: "Confirmed", tone: "ok" },
  completed: { label: "Completed", tone: "neutral" },
  declined: { label: "Declined", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  reschedule: { label: "New time requested", tone: "warn" },
};

/**
 * Role flex · Company · Date and time · Format · Status · Actions, on the same grid table as every
 * other portal list (it was a hand-rolled one without column rules). The time takes two lines, the
 * talent's own clock over the Team Builder's, so a long slot can't run into Format. A phone shows
 * each row as a card in the same order: the role, the company and the time each on a line of their
 * own, the format beside the status, and the buttons sharing the last line.
 */
const COLS = [
  "min-w-[200px] flex-1 max-md:basis-full!",
  "w-[170px] max-md:basis-full! max-md:text-ink-2",
  "w-[190px] max-md:basis-full!",
  "w-[120px]",
  "w-[150px]",
  "w-[290px] max-md:mt-1.5 max-md:basis-full! max-md:*:flex-1 max-md:[&_button]:w-full",
];

/** What each list says with nothing on it. */
const NONE_UPCOMING = { title: "No upcoming interviews", body: "Invitations from Team Builders will show here." };
const NONE_PAST = { title: "No past interviews yet", body: "Interviews that are over, declined or cancelled show here." };

export default function Interviews() {
  const [tab, setTab] = useQueryState("tab", "upcoming", ["upcoming", "past"] as const);
  /** IN-070 — the interviews the Team Builder has actually booked, not a copy in page state. */
  const { interviews: items, declineInterview, requestReschedule, setStage } = useApplications();
  const clock = useInterviewTime();
  const withReturn = useWithReturn();
  const [declining, setDeclining] = useState<Interview | null>(null);
  const [rescheduling, setRescheduling] = useState<Interview | null>(null);
  const [toast, setToast] = useToast();
  const upcoming = items.filter((i) => !i.past);
  const past = items.filter((i) => i.past);
  const rows = tab === "upcoming" ? upcoming : past;
  /** IN-070 — accepting confirms the slot, and it shows as confirmed on the application. */
  const accept = (iv: Interview) => {
    setStage(iv.id, "invite_accepted", { label: "Interview confirmed", tone: "info", slot: { when: iv.when, offset: iv.offset } });
    setToast("Interview accepted");
  };

  return (
    <Page title="Interviews">
      <InterviewsToolbar tab={tab} onTab={setTab} upcoming={upcoming.length} past={past.length} />
      <InterviewList
        tab={tab}
        rows={rows}
        row={(iv) => <InterviewRow key={iv.id} iv={iv} time={clock.both(iv)} href={withReturn(iv.roleHref)} onAccept={() => accept(iv)} onDecline={() => setDeclining(iv)} onReschedule={() => setRescheduling(iv)} />}
      />

      <DeclineInterview
        interview={declining}
        onClose={() => setDeclining(null)}
        onDecline={() => {
          if (declining) declineInterview(declining.id);
          setDeclining(null);
          setToast("Interview declined");
        }}
        onReschedule={() => {
          setRescheduling(declining);
          setDeclining(null);
        }}
      />
      <RescheduleDialog
        open={!!rescheduling}
        company={rescheduling?.company ?? ""}
        when={rescheduling ? clock.mine(rescheduling) : ""}
        onClose={() => setRescheduling(null)}
        onSend={(when, note) => {
          if (rescheduling) requestReschedule(rescheduling.id, when, note, clock.viewer);
          setToast(`New time sent to ${rescheduling?.company}`);
        }}
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/**
 * Upcoming or past interviews, each with how many there are. Two filters over one list, so they're
 * the filter pills rather than a view switch.
 */
function InterviewsToolbar({ tab, onTab, upcoming, past }: { tab: "upcoming" | "past"; onTab: (tab: "upcoming" | "past") => void; upcoming: number; past: number }) {
  return (
    <Pills
      aria-label="Show interviews"
      value={tab}
      onChange={onTab}
      options={[
        { value: "upcoming", label: `Upcoming (${upcoming})` },
        { value: "past", label: `Past (${past})` },
      ]}
    />
  );
}

/**
 * The open tab's interviews, a row each, or what the tab says when it has none: an empty state of its
 * own, as inside the table it sat in the table's minimum width, off centre wherever the table scrolls
 * sideways.
 */
function InterviewList({ tab, rows, row }: { tab: "upcoming" | "past"; rows: Interview[]; row: (iv: Interview) => ReactNode }) {
  if (rows.length === 0) return <EmptyState {...(tab === "upcoming" ? NONE_UPCOMING : NONE_PAST)} />;
  return (
    <Table cols={COLS} head={["Role", "Company", "Date and time", "Format", "Status", "Actions"]}>
      {rows.map((iv) => row(iv))}
    </Table>
  );
}

/** One interview: the role (the whole row opens its application), the company, when, the format and status, and what can be done. */
type Answers = { onAccept: () => void; onDecline: () => void; onReschedule: () => void };

function InterviewRow({ iv, time, href, ...answers }: { iv: Interview; time: string; href: string } & Answers) {
  // "Tue 29 Sep, 10:00 AM your time · 10:00 PM Alex's time": the talent's clock over the Team Builder's.
  const [mine, theirs] = time.split(" · ");
  return (
    // The whole row opens the application; the buttons stay their own.
    <Row className="relative">
      <span className={`${COLS[0]} !whitespace-normal`}>
        <Link href={href} className={`line-clamp-2 text-[14px] leading-[1.35] font-semibold text-ink ${ROW_LINK}`}>
          {iv.role}
        </Link>
      </span>
      <span className={`${COLS[1]} truncate`}>{iv.company}</span>
      <span className={`${COLS[2]} !whitespace-normal`}>
        <span className="block">{mine}</span>
        {theirs && <span className="block text-[12px] text-ink-2">{theirs}</span>}
      </span>
      <span className={`${COLS[3]} text-ink-2`}>{iv.format}</span>
      <span className={COLS[4]}>
        <StatusDot tone={STATUS[iv.status].tone}>{STATUS[iv.status].label}</StatusDot>
      </span>
      <span className={`${COLS[5]} relative z-10 flex gap-2`}>
        <RowActions iv={iv} href={href} {...answers} />
      </span>
    </Row>
  );
}

/** A row's buttons: the application once the interview is over; before it, Accept or Join call, a new time, and Decline. */
function RowActions({ iv, href, onAccept, onDecline, onReschedule }: { iv: Interview; href: string } & Answers) {
  if (iv.past) {
    return (
      // Over — declined, cancelled or held — so what is left is the application itself.
      <LinkButton size="sm" href={href}>
        View application
      </LinkButton>
    );
  }
  const joinable = iv.status === "accepted" && !!iv.link && canJoin(iv.when, iv.offset);
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
          title={joinable ? undefined : !iv.link ? "No meeting link yet. Ask the Team Builder to share one." : `Opens ${JOIN_OPENS_MINUTES} minutes before the start`}
          onClick={() => iv.link && window.open(iv.link, "_blank", "noopener")}
        >
          Join call
        </Button>
      )}
      <Button size="sm" onClick={onReschedule}>
        New time
      </Button>
      {/* Declining keeps the application open, so it's a plain button here; the confirm is the red one. */}
      <Button size="sm" onClick={onDecline}>
        Decline
      </Button>
    </>
  );
}

/** Declining an interview: the company gets a note, and the application stays open. If it's only the time, a new one is a click away. */
function DeclineInterview({ interview, onClose, onDecline, onReschedule }: { interview: Interview | null; onClose: () => void; onDecline: () => void; onReschedule: () => void }) {
  return (
    <Modal
      open={!!interview}
      onClose={onClose}
      tone="danger"
      title="Decline this interview?"
      description="Can't make it? Ask for another time, or decline. Your application stays open either way."
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={onReschedule}>
            Ask for a new time
          </Button>
          <Button size="lg" variant="danger" onClick={onDecline}>
            Decline
          </Button>
        </>
      }
    />
  );
}
