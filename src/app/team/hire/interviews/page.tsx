"use client";

import { useState } from "react";
import { Button, Checkbox, Field, Input, Modal, Page, Pills, Select, StatusDot, Toast, useToast } from "@/components/independent/ui";
import { Person, Row, Table } from "@/components/team/ui";
import { byName } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";
import type { Interview } from "@/lib/team/data";

/** Figma columns: Candidate flex · Role 165 · Date and time 205 · Format 90 · Status 135 · Actions 210. */
const COLS = ["min-w-0 flex-1", "w-[165px]", "w-[205px]", "w-[90px]", "w-[135px]", "w-[210px]"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

/** Figma "Interviews / Scheduled list · Reschedule interview · modal · Cancel interview · confirm · Interview availability · setup". */
export default function Interviews() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  /* From the store, so an interview scheduled from a candidate profile appears here. */
  const { interviews: items, setInterview } = useDemo();
  const [rescheduling, setRescheduling] = useState<Interview | null>(null);
  const [cancelling, setCancelling] = useState<Interview | null>(null);
  const [availability, setAvailability] = useState(false);
  const [days, setDays] = useState(new Set(["Mon", "Tue", "Wed", "Thu"]));
  const [toast, setToast] = useToast();
  const upcoming = items.filter((i) => !i.past);
  const past = items.filter((i) => i.past);
  const rows = tab === "upcoming" ? upcoming : past;

  return (
    <Page title="Interviews">
      <div className="flex items-center gap-3">
        <Pills
          value={tab}
          onChange={setTab}
          options={[
            { value: "upcoming", label: `Upcoming (${upcoming.length})` },
            { value: "past", label: `Past (${past.length})` },
          ]}
        />
        <span className="flex-1" />
        <Button size="lg" onClick={() => setAvailability(true)}>
          Set availability
        </Button>
      </div>
      <Table cols={COLS} head={["Candidate", "Role", "Date and time", "Format", "Status", "Actions"]}>
        {rows.map((iv) => {
          const p = byName(iv.independent);
          return (
            <Row key={iv.id}>
              <span className={COLS[0]}>
                <Person name={p.name} role={p.role} avatar={p.avatar} href={`/team/discover/${p.slug}`} />
              </span>
              <span className={`${COLS[1]} text-[14px]`}>{iv.role}</span>
              <span className={COLS[2]}>{iv.when}</span>
              <span className={`${COLS[3]} text-ink-2`}>{iv.format}</span>
              <span className={COLS[4]}>
                <StatusDot tone={iv.status.tone}>{iv.status.label}</StatusDot>
              </span>
              <span className={`${COLS[5]} flex gap-2`}>
                <Button size="sm" variant="primary" disabled={iv.status.label !== "Starts in 12 min"} onClick={() => setToast("Opening Google Meet…")}>
                  Join call
                </Button>
                {iv.status.label === "Awaiting reply" ? (
                  <Button size="sm" disabled={iv.past} onClick={() => setCancelling(iv)}>
                    Cancel
                  </Button>
                ) : (
                  <Button size="sm" disabled={iv.past} onClick={() => setRescheduling(iv)}>
                    Reschedule
                  </Button>
                )}
              </span>
            </Row>
          );
        })}
        {rows.length === 0 && <p className="border-t border-border px-4 py-8 text-center text-[13px] text-ink-2">No interviews here yet. Set your availability so candidates can pick a slot.</p>}
      </Table>
      <p className="text-[12px] leading-[1.4] text-ink-2">Join call turns on 15 minutes before the start. Links come from your connected calendar or the link you typed in the invite.</p>

      <Modal
        open={!!rescheduling}
        onClose={() => setRescheduling(null)}
        title={`Reschedule with ${rescheduling ? byName(rescheduling.independent).name : ""}`}
        description="They get the new slot by email and in-app. The old slot is released back to your availability."
        footer={
          <>
            <Button size="lg" onClick={() => setRescheduling(null)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" onClick={() => { if (rescheduling) setInterview(rescheduling.id, { when: "Thu 17 Sep 2026, 2:00 PM PHT", status: { label: "Awaiting reply", tone: "neutral" } }); setRescheduling(null); setToast("New time sent"); }}>
              Send new time
            </Button>
          </>
        }
      >
        <div className="flex gap-3">
          <Field label="Date" className="flex-1">
            <Input placeholder="Thu 17 Sep 2026" />
          </Field>
          <Field label="Time (PHT)" className="flex-1">
            <Select options={["2:00 PM", "9:30 AM", "4:00 PM"]} />
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
            <Button size="lg" variant="danger" onClick={() => { if (cancelling) setInterview(cancelling.id, { status: { label: "Cancelled", tone: "danger" }, past: true }); setCancelling(null); setToast("Interview cancelled"); }}>
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
