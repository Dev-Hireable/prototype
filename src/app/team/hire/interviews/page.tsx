"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Checkbox, Field, LinkButton, Modal, Page, Select, StatusDot, Toast, useToast } from "@/components/independent/ui";
import { canJoin, DatePicker, formatDate, startOfToday } from "@/components/portal/DatePicker";
import { INTERVIEW_TIMES } from "@/components/team/InterviewDialog";
import { ICONS } from "@/components/admin/icons";
import { ROW_LINK, TOOLBAR_BUTTON } from "@/components/portal/toolbar";
import { ViewSwitch } from "@/components/portal/ViewSwitch";
import { Avatar, Row, Table } from "@/components/team/ui";
import { byName } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";
import { useQueryState } from "@/lib/portal/query-state";
import { useWithReturn } from "@/components/portal/return";
import type { Interview } from "@/lib/team/data";

/**
 * Candidate flex · Role · Date and time · Format · Status · Actions. The date and time sit on two
 * lines: on one, "Tue 29 Sep 2026, 10:00 AM (PHT)" ran past its 205px cell into Format. Actions is
 * wide enough for the three buttons an upcoming interview has.
 */
const COLS = ["min-w-[200px] flex-1", "w-[180px]", "w-[150px]", "w-[110px]", "w-[120px]", "w-[248px]"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

/** Figma "Interviews / Scheduled list · Reschedule interview · modal · Cancel interview · confirm · Interview availability · setup". */
export default function Interviews() {
  const [tab, setTab] = useQueryState("tab", "upcoming", ["upcoming", "past"] as const);
  /* From the store, so an interview scheduled from a candidate profile appears here. */
  const { interviews: items, rescheduleInterview, cancelInterview } = useDemo();
  const withReturn = useWithReturn();
  const [rescheduling, setRescheduling] = useState<Interview | null>(null);
  /** The new slot. It used to be a date box that was ignored: every reschedule said Thu 17 Sep 2026, 2:00 PM. */
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [newTime, setNewTime] = useState(INTERVIEW_TIMES[0]);
  const closeReschedule = () => {
    setRescheduling(null);
    setNewDate(undefined);
    setNewTime(INTERVIEW_TIMES[0]);
  };
  const [cancelling, setCancelling] = useState<Interview | null>(null);
  const [availability, setAvailability] = useState(false);
  const [days, setDays] = useState(new Set(["Mon", "Tue", "Wed", "Thu"]));
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
        {rows.map((iv) => {
          const p = byName(iv.independent);
          const [date, time] = iv.when.split(", ");
          // The tracker card it was booked from, and the role's board opened at its Interview column.
          const card = iv.roleSlug && iv.candidate ? withReturn(`/team/hire/roles/${iv.roleSlug}/candidates/${iv.candidate}`) : undefined;
          const board = iv.roleSlug ? withReturn(`/team/hire/roles/${iv.roleSlug}?stage=interview`) : undefined;
          const confirmed = iv.status.label === "Confirmed";
          const joinable = confirmed && !!iv.link && canJoin(iv.when);
          return (
            // The whole row opens the candidate's card; the role's board link and the buttons stay their own.
            <Row key={iv.id} className="relative">
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
                    <Button size="sm" onClick={() => setRescheduling(iv)}>
                      Reschedule
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setCancelling(iv)}>
                      Cancel
                    </Button>
                  </>
                )}
              </span>
            </Row>
          );
        })}
        {rows.length === 0 && (
          <p className="border-t border-border px-4 py-8 text-center text-[13px] text-ink-2">
            {tab === "upcoming" ? "No interviews coming up. Invite a candidate to interview from their card in the pipeline." : "No past interviews yet."}
          </p>
        )}
      </Table>
      <p className="text-[12px] leading-[1.4] text-ink-2">Join call turns on 15 minutes before the start. Links come from your connected calendar or the link you typed in the invite.</p>

      <Modal
        open={!!rescheduling}
        onClose={closeReschedule}
        title={`Reschedule with ${rescheduling ? byName(rescheduling.independent).name : ""}`}
        description="They get the new slot by email and in-app. The old slot is released back to your availability."
        footer={
          <>
            <Button size="lg" onClick={closeReschedule}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant="primary"
              disabled={!newDate}
              onClick={() => {
                if (rescheduling && newDate) rescheduleInterview(rescheduling.id, `${formatDate(newDate)}, ${newTime}`);
                closeReschedule();
                setToast("New time sent");
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
      <Modal
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        tone="danger"
        title="Cancel this interview?"
        description={`${cancelling ? byName(cancelling.independent).name : "The candidate"} gets a note and stays in the tracker. You can invite them again later.`}
        footer={
          <>
            <Button size="lg" onClick={() => setCancelling(null)}>
              Keep it
            </Button>
            <Button size="lg" variant="danger" onClick={() => { if (cancelling) cancelInterview(cancelling.id); setCancelling(null); setToast("Interview cancelled"); }}>
              Cancel interview
            </Button>
          </>
        }
      />
      <Modal
        open={availability}
        onClose={() => setAvailability(false)}
        title="Interview availability"
        description="Candidates pick from these slots when they accept an invite. Times are in your time zone, (GMT+8) Manila."
        footer={
          <>
            <Button size="lg" onClick={() => setAvailability(false)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" onClick={() => { setAvailability(false); setToast("Availability saved"); }}>
              Save availability
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-4">
            {DAYS.map((d) => (
              <Checkbox
                key={d}
                checked={days.has(d)}
                onChange={(v) =>
                  setDays((s) => {
                    const n = new Set(s);
                    if (v) n.add(d);
                    else n.delete(d);
                    return n;
                  })
                }
              >
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
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
