"use client";

import { useState } from "react";
import { Button, Chip, Field, InfoBanner, Input, KeyValue, MatchPill, Modal, ObjectiveRow, Steps } from "@/components/independent/ui";
import { Avatar, MATCH_TOOLTIP } from "@/components/team/ui";
import { OBJECTIVE_KIND } from "@/lib/team/data";
import type { Independent, Objective, PaymentMethod, Role } from "@/lib/team/data";

const STEPS = ["Offer Letter", "Start & End Dates", "Deposit Payment", "Review & Sign"];
/** Platform fee on the first cycle, shown in the deposit breakdown. */
const FEE_RATE = 0.1;

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Trial length in calendar days, parsed from the role's duration ("30 Days"). */
const durationDays = (duration: string) => Number(duration.match(/\d+/)?.[0] ?? 30);

/**
 * Weekdays only — the trial counts working days, so a 30-day trial spans six calendar weeks.
 * TB-105: "the trial duration automatically counts only weekdays as working days".
 */
function addWorkingDays(from: Date, days: number) {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) left--;
  }
  return d;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const pretty = (s: string) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");

/**
 * TB-105 Send Offer — the four-step flow the AC describes: Offer Letter → Start & End Dates →
 * Deposit Payment → Review & Sign. The deposit gates the send: the offer can't go out until
 * escrow is funded, and the Independent is notified only once it's signed.
 */
export function SendOfferDialog({
  open,
  onClose,
  person,
  role,
  proposal,
  card,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  person: Independent;
  role: Role;
  proposal: { rate: string; objectives: { title: string; kind: Objective["kind"] }[]; letter: string };
  card?: PaymentMethod;
  onSend: () => void;
}) {
  const [step, setStep] = useState(0);
  const [start, setStart] = useState(iso(new Date()));
  const [deposited, setDeposited] = useState(false);
  const [signature, setSignature] = useState("");

  const days = durationDays(role.duration);
  const end = start ? iso(addWorkingDays(new Date(start), days)) : "";
  const rate = Number(proposal.rate.replace(/[^0-9.]/g, "")) || 0;
  const fee = rate * FEE_RATE;

  const close = () => {
    onClose();
    setStep(0);
    setDeposited(false);
    setSignature("");
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const canAdvance = step === 1 ? !!start : step === 2 ? deposited : true;

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Send an offer to ${person.name.split(" ")[0]}`}
      description={STEPS[step]}
      footer={
        <>
          <Button size="lg" onClick={() => (step === 0 ? close() : setStep(step - 1))}>
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button size="lg" variant="primary" disabled={!canAdvance} onClick={next}>
              {step === 2 ? "Deposit & continue" : "Continue"}
            </Button>
          ) : (
            <Button size="lg" variant="primary" disabled={!signature.trim()} onClick={() => { onSend(); close(); }}>
              Sign &amp; send offer
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Steps steps={STEPS} current={step} />

        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar src={person.avatar} size={48} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.3]">
                <p className="text-[15px] font-semibold text-ink">{person.name}</p>
                <p className="text-[13px] text-ink-2">
                  {person.level} · {person.location}
                </p>
              </div>
              <MatchPill pct={person.match} coded title={MATCH_TOOLTIP} />
            </div>
            <div className="flex gap-2">
              <KeyValue label="Rate" value={proposal.rate} />
              <KeyValue label="Contract" value={role.type === "trial" ? "Trial" : "Full-time"} />
              <KeyValue label="Duration" value={role.duration} />
            </div>
            <div className="flex flex-wrap gap-2">
              {person.skills.map((s) => (
                <Chip key={s} size="sm">
                  {s}
                </Chip>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-semibold text-ink">Committed objectives</p>
              {/* TB-105 — each objective carries the type it will be tracked as, so what the
                  independent commits to here matches what shows up on the trial dashboard. */}
              {proposal.objectives.map((o, i) => (
                <div key={o.title} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <ObjectiveRow index={i}>{o.title}</ObjectiveRow>
                  </span>
                  <Chip size="sm">{OBJECTIVE_KIND[o.kind]}</Chip>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[13px] font-semibold text-ink">Cover letter</p>
              <p className="text-[13px] leading-[1.45] text-ink-2">{proposal.letter}</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <Field label="Trial start date" className="flex-1">
                <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <Field label={`End date (${days} working days)`} className="flex-1">
                <Input value={pretty(end)} readOnly />
              </Field>
            </div>
            <InfoBanner>The trial duration automatically counts only weekdays as working days, excluding weekends.</InfoBanner>
            <div className="flex gap-2">
              <KeyValue label="Rate" value={proposal.rate} />
              <KeyValue label="Trial duration" value={role.duration} />
              <KeyValue label="Payment cadence" value="Monthly" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 rounded-lg border border-border p-4 text-[14px] leading-[1.4] text-ink">
              <span className="flex justify-between">
                <span className="text-ink-2">Rate (first cycle)</span> {money(rate)}
              </span>
              <span className="flex justify-between">
                <span className="text-ink-2">Platform fee ({Math.round(FEE_RATE * 100)}%)</span> {money(fee)}
              </span>
              <span aria-hidden className="my-1 h-px w-full bg-border" />
              <span className="flex justify-between font-semibold">
                <span>Total deposit</span> {money(rate + fee)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-[14px] text-ink">
              <span>{card ? `${card.brand} ending ${card.last4}` : "No payment method on file"}</span>
              <span className="text-[13px] text-ink-2">{card ? `Expires ${card.expires}` : "Add one in Settings"}</span>
            </div>
            <InfoBanner>Funds are held in escrow and released only when you approve the work or at the end of each payment cycle.</InfoBanner>
            {/* The deposit is required before the offer can be sent (TB-105). */}
            <label className="flex items-center gap-3 text-[14px] leading-[1.3] text-ink">
              <input type="checkbox" checked={deposited} disabled={!card} onChange={(e) => setDeposited(e.target.checked)} className="size-5 shrink-0 accent-primary" />
              Deposit {money(rate + fee)} into escrow now
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 rounded-lg border border-border p-4 text-[14px] leading-[1.5] text-ink">
              <span className="flex justify-between">
                <span className="text-ink-2">Role</span> {role.title}
              </span>
              <span className="flex justify-between">
                <span className="text-ink-2">Candidate</span> {person.name}
              </span>
              <span className="flex justify-between">
                <span className="text-ink-2">Rate</span> {proposal.rate}
              </span>
              <span className="flex justify-between">
                <span className="text-ink-2">Trial</span> {pretty(start)} → {pretty(end)}
              </span>
              <span className="flex justify-between">
                <span className="text-ink-2">Deposited</span> {money(rate + fee)}
              </span>
            </div>
            <Field label="Type your full name to sign">
              <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Alex Rivera" />
            </Field>
          </div>
        )}
      </div>
    </Modal>
  );
}
