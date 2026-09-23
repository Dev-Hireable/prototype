"use client";

import { useState } from "react";
import { Button, Chip, Field, InfoBanner, Input, KeyValue, MatchPill, Modal, ObjectiveRow, Steps } from "@/components/independent/ui";
import { DatePicker, fromISODate, startOfToday, toISODate } from "@/components/portal/DatePicker";
import { kindIndex } from "@/components/team/ObjectiveViews";
import { Avatar, MATCH_TOOLTIP } from "@/components/team/ui";
import { addWorkingDays, dayLabel, durationDays, trialMonths } from "@/lib/demo/dates";
import { rateAmount } from "@/lib/demo/disputes";
import { OBJECTIVE_KIND } from "@/lib/team/data";
import type { Independent, Objective, PaymentMethod, Role } from "@/lib/team/data";

const STEPS = ["Offer Letter", "Start & End Dates", "Deposit Payment", "Review & Sign"];
/** Hireable's platform fee, charged on top of the escrow rather than out of it. */
const FEE_RATE = 0.1;

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Dates stay yyyy-mm-dd strings, read and written in local time, and are shown the way every other
 * date reads ("04 Nov 2026" — en-GB's toLocaleDateString said "Sept").
 */
const pretty = (s: string) => (fromISODate(s) ? dayLabel(fromISODate(s)) : "—");

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
  onSend: (terms: { start: string; end: string; deposit: { escrow: number; fee: number } }) => void;
}) {
  const [step, setStep] = useState(0);
  const [start, setStart] = useState(toISODate(new Date()));
  const [deposited, setDeposited] = useState(false);
  const [signature, setSignature] = useState("");

  const days = durationDays(role.duration);
  const startDate = fromISODate(start);
  const end = startDate ? toISODate(addWorkingDays(startDate, days)) : "";
  /**
   * The trial is funded in full: the monthly rate for each month of it. It used to deposit one
   * "first cycle" whatever the length or the rate's unit, so a 90-day trial held a month of pay.
   */
  const rate = rateAmount(proposal.rate);
  const months = trialMonths(days);
  const escrow = rate * months;
  const fee = Math.round(escrow * FEE_RATE * 100) / 100;
  /** $0 can't fund a trial — the proposal step now refuses it too. */
  const fundable = escrow > 0;

  const close = () => {
    onClose();
    setStep(0);
    setDeposited(false);
    setSignature("");
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const canAdvance = step === 0 ? fundable : step === 1 ? !!start : step === 2 ? deposited : true;

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
            <Button size="lg" variant="primary" disabled={!signature.trim() || !fundable} onClick={() => { onSend({ start, end, deposit: { escrow, fee } }); close(); }}>
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
              {proposal.objectives.map((o) => (
                <div key={o.title} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <ObjectiveRow index={kindIndex(o.kind)}>{o.title}</ObjectiveRow>
                  </span>
                  <Chip size="sm">{OBJECTIVE_KIND[o.kind]}</Chip>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[13px] font-semibold text-ink">Cover letter</p>
              <p className="text-[13px] leading-[1.45] text-ink-2">{proposal.letter}</p>
            </div>
            {!fundable && <InfoBanner tone="warn">This proposal has no rate to fund. Ask {person.name.split(" ")[0]} for a revision with a monthly rate before sending an offer.</InfoBanner>}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <Field label="Trial start date" className="flex-1">
                <DatePicker value={startDate} onChange={(d) => setStart(d ? toISODate(d) : "")} disabled={{ before: startOfToday() }} />
              </Field>
              <Field label={`End date (${days} working days)`} className="flex-1">
                <Input value={pretty(end)} readOnly />
              </Field>
            </div>
            <InfoBanner>The trial duration automatically counts only weekdays as working days, excluding weekends.</InfoBanner>
            <div className="flex gap-2">
              <KeyValue label="Rate" value={proposal.rate} />
              <KeyValue label="Trial duration" value={role.duration} />
              <KeyValue label="Payment" value="Escrow, released at trial end" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 rounded-lg border border-border p-4 text-[14px] leading-[1.4] text-ink">
              <span className="flex justify-between">
                <span className="text-ink-2">
                  Escrow — {money(rate)} × {months} {months === 1 ? "month" : "months"}
                </span>{" "}
                {money(escrow)}
              </span>
              <span className="flex justify-between">
                <span className="text-ink-2">Platform fee ({Math.round(FEE_RATE * 100)}%)</span> {money(fee)}
              </span>
              <span aria-hidden className="my-1 h-px w-full bg-border" />
              <span className="flex justify-between font-semibold">
                <span>Total charged</span> {money(escrow + fee)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-[14px] text-ink">
              <span>{card ? `${card.brand} ending ${card.last4}` : "No payment method on file"}</span>
              <span className="text-[13px] text-ink-2">{card ? `Expires ${card.expires}` : "Add one in Settings"}</span>
            </div>
            <InfoBanner>The escrow is held until the trial ends and you release it, or until a dispute ruling moves part of it. The fee is Hireable&apos;s and is not refunded.</InfoBanner>
            {/* The deposit is required before the offer can be sent (TB-105). */}
            <label className="flex items-center gap-3 text-[14px] leading-[1.3] text-ink">
              <input type="checkbox" checked={deposited} disabled={!card || !fundable} onChange={(e) => setDeposited(e.target.checked)} className="size-5 shrink-0 accent-primary" />
              Charge {money(escrow + fee)} — {money(escrow)} into escrow, {money(fee)} fee
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
                <span className="text-ink-2">In escrow</span> {money(escrow)}
              </span>
              <span className="flex justify-between">
                <span className="text-ink-2">Platform fee</span> {money(fee)}
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
