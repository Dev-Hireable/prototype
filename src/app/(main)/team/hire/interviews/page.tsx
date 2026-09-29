"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar, Button, Checkbox, Field, LinkButton, Modal, Page, Row, Select, StatusDot, Table, Toast } from "@/components/portal/ui";
import { DatePicker } from "@/components/portal/date-picker";
import { canJoin, formatDate, startOfToday } from "@/lib/portal/dates";
import { ICONS } from "@/components/icons";
import { ROW_LINK, TOOLBAR_BUTTON } from "@/components/portal/toolbar";
import { ViewSwitch } from "@/components/portal/view-switch";
import { byName, INTERVIEW_TIMES } from "@/lib/team/data";
import { usePipeline } from "@/lib/team/pipeline";
import { useQueryState } from "@/lib/portal/query-state";
import { useToast, type SetToast } from "@/lib/portal/toast";
import { useWithReturn } from "@/components/portal/return";
import type { Interview } from "@/lib/team/data";

/**
 * Candidate flex · Role · Date and time · Format · Status · Actions. The date and time sit on two
 * lines: on one, "Tue 29 Sep 2026, 10:00 AM (PHT)" ran past its 205px cell into Format. Actions is
 * wide enough for the three buttons an upcoming interview has.
 */
const COLS = ["min-w-[200px] flex-1", "w-[180px]", "w-[150px]", "w-[110px]", "w-[120px]", "w-[272px]"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

/** What a row's buttons open: the reschedule and the cancel confirmations. */
type RowActions = { onReschedule: (iv: Interview) => void; onCancel: (iv: Interview) => void };

export default function Interviews() {
  const [tab, setTab] = useQueryState("tab", "upcoming", ["upcoming", "past"] as const);
  /* From the store, so an interview scheduled from a candidate profile appears here. */
  const { interviews: items, rescheduleInterview, cancelInterview } = usePipeline();
  const [rescheduling, setRescheduling] = useState<Interview | null>(null);
  const [cancelling, setCancelling] = useState<Interview | null>(null);
  const [availability, setAvailability] = useState(false);
  const [toast, setToast] = useToast();
  const upcoming = items.filter((i) => !i.past);
  const past = items.filter((i) => i.past);
  const rows = tab === "upcoming" ? upcoming : past;

  return (
    <Page title="Interviews">
      {/* One 36px toolbar: the same switch and button as every list's toolbar. */}
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
        <span className="flex-1" />
        <button type="button" onClick={() => setAvailability(true)} className={TOOLBAR_BUTTON}>
          <ICONS.calendar size={16} aria-hidden /> Set availability
        </button>
      </div>
      <Table cols={COLS} head={["Candidate", "Role", "Date and time", "Format", "Status", "Actions"]}>
        {rows.map((iv) => (
          <InterviewRow key={iv.id} iv={iv} onReschedule={setRescheduling} onCancel={setCancelling} />
        ))}
        {rows.length === 0 && (
          <p className="border-t border-border px-4 py-8 text-center text-[13px] text-ink-2">
            {tab === "upcoming" ? "No interviews coming up. Invite a candidate to interview from their card in the pipeline." : "No past interviews yet."}
          </p>
        )}
      </Table>
      <p className="text-[12px] leading-[1.4] text-ink-2">Join call turns on 15 minutes before the start. Links come from your connected calendar or the link you typed in the invite.</p>

      <RescheduleDialog interview={rescheduling} onClose={() => setRescheduling(null)} onSend={rescheduleInterview} onToast={setToast} />
      <CancelDialog interview={cancelling} onClose={() => setCancelling(null)} onCancel={cancelInterview} onToast={setToast} />
      <AvailabilityDialog open={availability} onClose={() => setAvailability(false)} onToast={setToast} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** One interview: who with (the row opens their card), the role's board, when, the format, the status and what's left to do. */
function InterviewRow({ iv, ...actions }: { iv: Interview } & RowActions) {
  const withReturn = useWithReturn();
  const p = byName(iv.independent);
  const [date, time] = iv.when.split(", ");
  // The tracker card it was booked from, and the role's board opened at its Interview column.
  const card = iv.roleSlug && iv.candidate ? withReturn(`/team/hire/roles/${iv.roleSlug}/candidates/${iv.candidate}`) : undefined;
  const board = iv.roleSlug ? withReturn(`/team/hire/roles/${iv.roleSlug}?stage=interview`) : undefined;
  return (
    // The whole row opens the candidate's card; the role's board link and the buttons stay their own.
    <Row className="relative">
      <span className={`${COLS[0]} flex gap-3`}>
        <Avatar src={p.avatar} size={36} />
        <Link href={card ?? withReturn(`/team/discover/${p.slug}`)} className={`flex min-w-0 flex-col gap-0.5 leading-[1.3] ${ROW_LINK}`}>
          <span className="truncate text-[14px] font-semibold text-ink">{p.name}</span>
          <span className="truncate text-[12.5px] text-ink-2">{p.role}</span>
        </Link>
      </span>
      <span className={`${COLS[1]} relative z-10 !whitespace-normal text-[13.5px] leading-[1.35]`}>
        {board ? (
          <Link href={board} className="line-clamp-2 hover:text-primary hover:underline">
            {iv.role}
          </Link>
        ) : (
          <span className="line-clamp-2">{iv.role}</span>
        )}
      </span>
      <span className={COLS[2]}>
        <span className="block">{date}</span>
        <span className="block text-[12px] text-ink-2">{time}</span>
      </span>
      <span className={`${COLS[3]} text-ink-2`}>{iv.format}</span>
      <span className={COLS[4]}>
        <StatusDot tone={iv.status.tone}>{iv.status.label}</StatusDot>
      </span>
      <span className={`${COLS[5]} relative z-10 flex gap-2`}>
        {iv.past ? (
          // Over, so what is left is the candidate's card in the pipeline.
          card && (
            <LinkButton size="sm" href={card}>
              View in pipeline
            </LinkButton>
          )
        ) : (
          <UpcomingActions iv={iv} {...actions} />
        )}
      </span>
    </Row>
  );
}

/** An upcoming interview's buttons: join the call once it's confirmed and about to start, reschedule, or cancel. */
function UpcomingActions({ iv, onReschedule, onCancel }: { iv: Interview } & RowActions) {
  const confirmed = iv.status.label === "Confirmed";
  const joinable = confirmed && !!iv.link && canJoin(iv.when);
  return (
    <>
      <Button
        size="sm"
        variant="primary"
        disabled={!joinable}
        title={joinable ? undefined : confirmed ? "Opens 15 minutes before the start" : "Opens once they confirm the interview"}
        onClick={() => iv.link && window.open(iv.link, "_blank", "noopener")}
      >
        Join call
      </Button>
      <Button size="sm" onClick={() => onReschedule(iv)}>
        Reschedule
      </Button>
      <Button size="sm" variant="danger" onClick={() => onCancel(iv)}>
        Cancel
      </Button>
    </>
  );
}

/** A new date and time for one interview, sent to the candidate. Closing it, either way, clears the slot it was given. */
function RescheduleDialog({ interview, onClose, onSend, onToast }: { interview: Interview | null; onClose: () => void; onSend: (id: string, when: string) => void; onToast: SetToast }) {
  /** The new slot. It used to be a date box that was ignored: every reschedule said Thu 17 Sep 2026, 2:00 PM. */
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [newTime, setNewTime] = useState(INTERVIEW_TIMES[0]);
  const close = () => {
    onClose();
    setNewDate(undefined);
    setNewTime(INTERVIEW_TIMES[0]);
  };
  return (
    <Modal
      open={!!interview}
      onClose={close}
      title={`Reschedule with ${interview ? byName(interview.independent).name : ""}`}
      description="They get the new slot by email and in-app. The old slot is released back to your availability."
      footer={
        <>
          <Button size="lg" onClick={close}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant="primary"
            disabled={!newDate}
            onClick={() => {
              if (interview && newDate) onSend(interview.id, `${formatDate(newDate)}, ${newTime}`);
              close();
              onToast("New time sent");
            }}
          >
            Send new time
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <Field label="Date" className="flex-1" hint={!newDate ? "Required" : undefined}>
          <DatePicker value={newDate} onChange={setNewDate} disabled={{ before: startOfToday() }} placeholder="Pick a date" />
        </Field>
        <Field label="Time" className="flex-1">
          <Select options={INTERVIEW_TIMES} value={newTime} onChange={(e) => setNewTime(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/** Calling off one interview, once confirmed: the candidate gets a note and keeps their place in the tracker. */
function CancelDialog({ interview, onClose, onCancel, onToast }: { interview: Interview | null; onClose: () => void; onCancel: (id: string) => void; onToast: SetToast }) {
  return (
    <Modal
      open={!!interview}
      onClose={onClose}
      tone="danger"
      title="Cancel this interview?"
      description={`${interview ? byName(interview.independent).name : "The candidate"} gets a note and stays in the tracker. You can invite them again later.`}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Keep it
          </Button>
          <Button size="lg" variant="danger" onClick={() => { if (interview) onCancel(interview.id); onClose(); onToast("Interview cancelled"); }}>
            Cancel interview
          </Button>
        </>
      }
    />
  );
}

/** The slots candidates pick from when they accept an invite: which days, between which hours, and how long each is. */
function AvailabilityDialog({ open, onClose, onToast }: { open: boolean; onClose: () => void; onToast: SetToast }) {
  const [days, setDays] = useState(new Set(["Mon", "Tue", "Wed", "Thu"]));
  const toggle = (d: string, on: boolean) =>
    setDays((s) => {
      const n = new Set(s);
      if (on) n.add(d);
      else n.delete(d);
      return n;
    });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Interview availability"
      description="Candidates pick from these slots when they accept an invite. Times are in your time zone, (GMT+8) Manila."
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" onClick={() => { onClose(); onToast("Availability saved"); }}>
            Save availability
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-4">
          {DAYS.map((d) => (
            <Checkbox key={d} checked={days.has(d)} onChange={(v) => toggle(d, v)}>
              {d}
            </Checkbox>
          ))}
        </div>
        <div className="flex gap-3">
          <Field label="From" className="flex-1">
            <Select options={["9:00 AM", "10:00 AM", "1:00 PM"]} />
          </Field>
          <Field label="To" className="flex-1">
            <Select options={["5:00 PM", "4:00 PM", "6:00 PM"]} />
          </Field>
          <Field label="Slot length" className="flex-1">
            <Select options={["45 min", "30 min", "60 min"]} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
