"use client";

import { useState } from "react";
import { Button, Checkbox, Chip, Field, InfoBanner, Input, KeyValue, MatchPill, Modal, Steps } from "@/components/independent/ui";
import { DatePicker, fromISODate, startOfToday, toISODate } from "@/components/portal/DatePicker";
import { blankDraft, fromDrafts, TaskPlanEditor, toDrafts } from "@/components/portal/tasks/TaskPlan";
import type { DraftTask } from "@/components/portal/tasks/TaskPlan";
import { Avatar, MATCH_TOOLTIP } from "@/components/team/ui";
import { addWorkingDays, dayLabel, durationDays, trialMonths } from "@/lib/demo/dates";
import type { DealProposal } from "@/lib/demo/deal";
import { rateAmount, usd } from "@/lib/demo/disputes";
import { hoursLabel, JOB_TYPE_LABEL, postedStart, startLabel } from "@/lib/demo/job-types";
import { planWeeks } from "@/lib/demo/tasks";
import type { OfferTask, PlannedTask } from "@/lib/demo/tasks";
import { FT_BENEFITS } from "@/lib/team/data";
import type { Independent, PaymentMethod, Role } from "@/lib/team/data";

/** Hireable's platform fee, charged on top of a trial's escrow rather than out of it. */
const FEE_RATE = 0.1;

/**
 * Dates stay yyyy-mm-dd strings, read and written in local time, and are shown the way every other
 * date reads ("04 Nov 2026" — en-GB's toLocaleDateString said "Sept").
 */
const pretty = (s: string) => (fromISODate(s) ? dayLabel(fromISODate(s)) : "—");

/** The terms a sent offer carries, for the type of role it is, and the tasks it sets. */
export type OfferTerms = { rate: string; start: string; end?: string; deposit?: { escrow: number; fee: number }; hours?: number; benefits?: string[]; tasks: OfferTask[] };

type StepKey = "letter" | "tasks" | "dates" | "deposit" | "terms" | "sign";

/**
 * TB-105 Send Offer. The Team Builder sets the work here: the Tasks step starts from the trial's
 * tasks in the job post (or, on a proposal sent before the tasks were theirs to set, the ones it
 * listed) and can be changed for this candidate. They become the contract's task list once the offer
 * is signed. A trial then runs Start & End Dates → Deposit Payment → Review & Sign, and the deposit
 * gates the send: it can't go out until escrow is funded. A full-time or part-time role hires
 * straight onto the contract, with no trial and no escrow — Start & Salary or Start & Hours, then
 * Review & Sign — and its tasks are optional, since more can be added once it starts.
 */
export function SendOfferDialog({
  open,
  onClose,
  person,
  role,
  proposal,
  card,
  onSend,
  startTasks,
}: {
  open: boolean;
  onClose: () => void;
  person: Independent;
  role: Role;
  proposal: DealProposal;
  card?: PaymentMethod;
  onSend: (terms: OfferTerms) => void;
  /** TB-106 — the tasks to start from: the job post's with the accepted suggestions applied. */
  startTasks?: PlannedTask[];
}) {
  const trial = role.type === "trial";
  const keys: StepKey[] = trial ? ["letter", "tasks", "dates", "deposit", "sign"] : ["letter", "tasks", "terms", "sign"];
  const label: Record<StepKey, string> = {
    letter: "Offer Letter",
    tasks: "Tasks",
    dates: "Start & End Dates",
    deposit: "Deposit Payment",
    terms: role.type === "full-time" ? "Start & Salary" : "Start & Hours",
    sign: "Review & Sign",
  };
  const steps = keys.map((k) => label[k]);
  const [step, setStep] = useState(0);
  const kind = keys[step];
  /** A trial starts on the day it is offered; an ongoing role on the start it was posted with. */
  const [start, setStart] = useState(() => toISODate(trial ? new Date() : postedStart(role.duration)));
  const [deposited, setDeposited] = useState(false);
  const [signature, setSignature] = useState("");
  /** An ongoing role's pay starts from what was proposed; the Team Builder can offer another figure. */
  const [pay, setPay] = useState(String(rateAmount(proposal.rate) || ""));
  const [hours, setHours] = useState(String(proposal.hours ?? role.hours ?? 20));
  const [benefits, setBenefits] = useState<string[]>(() => (role.benefits?.length ? role.benefits.map((b) => b.label) : FT_BENEFITS));
  /**
   * The job post's tasks with the talent's accepted suggestions applied (`startTasks`) — or, on a
   * proposal from before the tasks were the Team Builder's, the ones it listed.
   */
  const planned = startTasks?.length ? startTasks : role.tasks?.length ? role.tasks : (proposal.tasks ?? []);
  const [rows, setRows] = useState<DraftTask[]>(() => (planned.length ? toDrafts(planned) : [blankDraft()]));
  const tasks = fromDrafts(rows);

  const days = durationDays(role.duration);
  const startDate = fromISODate(start);
  // The start day is day one of the trial, so its last day is `days - 1` working days later.
  const end = trial && startDate ? toISODate(addWorkingDays(startDate, days - 1)) : "";
  /**
   * The trial is funded in full: the monthly rate for each month of it. It used to deposit one
   * "first cycle" whatever the length or the rate's unit, so a 90-day trial held a month of pay.
   */
  const rate = trial ? rateAmount(proposal.rate) : rateAmount(pay);
  const months = trialMonths(days);
  const escrow = rate * months;
  const fee = Math.round(escrow * FEE_RATE * 100) / 100;
  const weekly = Number(hours);
  const hoursOk = role.type !== "part-time" || (Number.isInteger(weekly) && weekly >= 1 && weekly <= 40);
  /** $0 can't pay anyone — the proposal step refuses it too. */
  const payable = rate > 0;
  const payLabel = `${usd(rate)}/mo`;
  const first = person.name.split(" ")[0];

  const close = () => {
    onClose();
    setStep(0);
    setDeposited(false);
    setSignature("");
  };
  const last = steps.length - 1;
  /** A trial is judged on its tasks, so it needs one; an ongoing role can start with none. */
  const canAdvance =
    kind === "letter" ? payable : kind === "tasks" ? !trial || tasks.length > 0 : kind === "dates" ? !!start : kind === "terms" ? !!start && payable && hoursOk : kind === "deposit" ? deposited : true;
  const send = () => {
    // Ids the tasks keep on the contract, so a notification can link straight to one.
    const offerTasks = tasks.map((t, i) => ({ ...t, id: `task-${i + 1}` }));
    onSend(
      trial
        ? { rate: proposal.rate, start, end, deposit: { escrow, fee }, tasks: offerTasks }
        : { rate: payLabel, start, hours: role.type === "part-time" ? weekly : undefined, benefits: role.type === "full-time" ? benefits : undefined, tasks: offerTasks },
    );
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      width={640}
      title={`Send an offer to ${first}`}
      description={steps[step]}
      footer={
        <>
          <Button size="lg" onClick={() => (step === 0 ? close() : setStep(step - 1))}>
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < last ? (
            <Button size="lg" variant="primary" disabled={!canAdvance} onClick={() => setStep((s) => Math.min(s + 1, last))}>
              {kind === "deposit" ? "Deposit & continue" : "Continue"}
            </Button>
          ) : (
            <Button size="lg" variant="primary" disabled={!signature.trim() || !payable} onClick={send}>
              Sign &amp; send offer
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Steps steps={steps} current={step} />

        {kind === "letter" && (
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
              <KeyValue label={role.type === "full-time" ? "Proposed salary" : "Rate"} value={proposal.rate} />
              <KeyValue label="Contract" value={JOB_TYPE_LABEL[role.type]} />
              <KeyValue label={trial ? "Duration" : "Start"} value={trial ? role.duration : startLabel(role.duration)} />
              {role.type === "part-time" && <KeyValue label="Hours" value={hoursLabel(proposal.hours ?? role.hours)} />}
            </div>
            <div className="flex flex-wrap gap-2">
              {person.skills.map((s) => (
                <Chip key={s} size="sm">
                  {s}
                </Chip>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[13px] font-semibold text-ink">Cover letter</p>
              <p className="text-[13px] leading-[1.45] whitespace-pre-line text-ink-2">{proposal.letter}</p>
            </div>
            {!payable && <InfoBanner tone="warn">This proposal has no pay to offer. Ask {first} for a revision with a monthly {role.type === "full-time" ? "salary" : "rate"} before sending an offer.</InfoBanner>}
          </div>
        )}

        {/* TB-105 — the work the offer sets: it becomes the contract's task list when it's signed. */}
        {kind === "tasks" && (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] leading-[1.45] text-ink-2">
              {trial
                ? role.tasks?.length
                  ? `The trial's tasks from your job post. Change any for ${first} before you send — they become the trial's shared task list when ${first} signs.`
                  : `What ${first} should get done in the trial. The list becomes the trial's shared task list when ${first} signs.`
                : `The first tasks ${first} starts on. Optional — you can add more any time once the contract starts.`}
            </p>
            <TaskPlanEditor rows={rows} onChange={setRows} weeks={planWeeks(trial ? days : null)} placeholder={trial ? "Name a task for the trial" : "Name a first task"} />
            {trial && tasks.length === 0 && <p className="text-[12px] leading-[1.4] text-ink-2">A trial needs at least one task to be judged on.</p>}
          </div>
        )}

        {kind === "dates" && (
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

        {kind === "terms" && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <Field label="Start date" className="flex-1">
                <DatePicker value={startDate} onChange={(d) => setStart(d ? toISODate(d) : "")} disabled={{ before: startOfToday() }} />
              </Field>
              <Field label={role.type === "full-time" ? "Salary (USD / month)" : "Rate (USD / month)"} className="flex-1" error={pay.trim() && !payable ? "Enter an amount above $0." : undefined}>
                <Input value={pay} onChange={(e) => setPay(e.target.value.replace(/[^0-9.,]/g, ""))} inputMode="decimal" />
              </Field>
            </div>
            {role.type === "part-time" ? (
              <Field label="Hours a week" error={hours.trim() && !hoursOk ? "Enter whole hours between 1 and 40." : undefined}>
                <Input value={hours} onChange={(e) => setHours(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="!w-[160px]" />
              </Field>
            ) : (
              <Field label="Exclusive benefits">
                <div className="flex flex-col gap-2">
                  {FT_BENEFITS.map((b) => (
                    <Checkbox key={b} checked={benefits.includes(b)} onChange={(on) => setBenefits((all) => (on ? [...all, b] : all.filter((x) => x !== b)))}>
                      {b}
                    </Checkbox>
                  ))}
                </div>
              </Field>
            )}
            <InfoBanner>No trial and no escrow: {first} starts on the {JOB_TYPE_LABEL[role.type].toLowerCase()} contract, paid at the end of each month.</InfoBanner>
          </div>
        )}

        {kind === "deposit" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 rounded-lg border border-border p-4 text-[14px] leading-[1.4] text-ink">
              <span className="flex justify-between">
                <span className="text-ink-2">
                  Escrow — {usd(rate)} × {months} {months === 1 ? "month" : "months"}
                </span>{" "}
                {usd(escrow)}
              </span>
              <span className="flex justify-between">
                <span className="text-ink-2">Platform fee ({Math.round(FEE_RATE * 100)}%)</span> {usd(fee)}
              </span>
              <span aria-hidden className="my-1 h-px w-full bg-border" />
              <span className="flex justify-between font-semibold">
                <span>Total charged</span> {usd(escrow + fee)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-[14px] text-ink">
              <span>{card ? `${card.brand} ending ${card.last4}` : "No payment method on file"}</span>
              <span className="text-[13px] text-ink-2">{card ? `Expires ${card.expires}` : "Add one in Settings"}</span>
            </div>
            <InfoBanner>The escrow is held until the trial ends and you release it, or until a dispute ruling moves part of it. The fee is Hireable&apos;s and is not refunded.</InfoBanner>
            {/* The deposit is required before the offer can be sent (TB-105). */}
            <Checkbox checked={deposited} disabled={!card || !payable} onChange={setDeposited}>
              Charge {usd(escrow + fee)} — {usd(escrow)} into escrow, {usd(fee)} fee
            </Checkbox>
          </div>
        )}

        {kind === "sign" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 rounded-lg border border-border p-4 text-[14px] leading-[1.5] text-ink">
              {(
                [
                  ["Role", role.title],
                  ["Candidate", person.name],
                  ["Contract", JOB_TYPE_LABEL[role.type]],
                  [role.type === "full-time" ? "Salary" : "Rate", trial ? proposal.rate : payLabel],
                  ...(trial
                    ? ([
                        ["Trial", `${pretty(start)} → ${pretty(end)}`],
                        ["In escrow", usd(escrow)],
                        ["Platform fee", usd(fee)],
                      ] as [string, string][])
                    : ([["Starts", pretty(start)], ...(role.type === "part-time" ? [["Hours", hoursLabel(weekly)]] : [["Benefits", benefits.length ? `${benefits.length} included` : "None"]])] as [string, string][])),
                  ["Tasks", tasks.length ? `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}` : "None yet — add them once it starts"],
                ] as [string, string][]
              ).map(([k, v]) => (
                <span key={k} className="flex justify-between gap-4">
                  <span className="text-ink-2">{k}</span> {v}
                </span>
              ))}
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
