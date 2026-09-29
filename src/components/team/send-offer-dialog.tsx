"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Avatar, Button, Checkbox, Chip, Field, InfoBanner, Input, KeyValue, MatchPill, Modal, Steps } from "@/components/portal/ui";
import { TaskPlanList } from "@/components/portal/tasks/task-plan";
import { MATCH_TOOLTIP } from "@/lib/portal/match";
import { addWorkingDays, dayLabel, durationDays, trialMonths, fromISODate, startOfToday, isoDay } from "@/lib/portal/dates";
import type { DealProposal } from "@/lib/demo/deal";
import { rateAmount, usd } from "@/lib/demo/disputes";
import { FT_BENEFITS, hoursLabel, JOB_TYPE_LABEL, proposedStart } from "@/lib/contract/job-types";
import type { OfferTask, PlannedTask } from "@/lib/demo/tasks";
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

/** The steps in order: a trial funds its escrow before it's signed; an ongoing role sets its terms instead. */
function stepKeys(trial: boolean): StepKey[] {
  return trial ? ["letter", "tasks", "dates", "deposit", "sign"] : ["letter", "tasks", "terms", "sign"];
}

/** What each step is called, in the stepper and under the dialog's title. */
function stepLabels(type: Role["type"]): Record<StepKey, string> {
  return {
    letter: "Offer Letter",
    tasks: "Tasks",
    dates: "Start & End Dates",
    deposit: "Deposit Payment",
    terms: type === "full-time" ? "Start & Salary" : "Start & Hours",
    sign: "Review & Sign",
  };
}

/**
 * The job post's tasks with the talent's accepted suggestions applied (`startTasks`) — or, on a
 * proposal from before the tasks were the Team Builder's, the ones it listed.
 */
function plannedTasks(startTasks: PlannedTask[] | undefined, role: Role, proposal: DealProposal) {
  return startTasks?.length ? startTasks : role.tasks?.length ? role.tasks : (proposal.tasks ?? []);
}

/** The dates and money the offer adds up to, from the start, pay and hours the proposal settled. */
function offerFigures(role: Role, proposal: DealProposal, start: string, pay: string, hours: string) {
  const trial = role.type === "trial";
  const days = durationDays(role.duration);
  const startDate = fromISODate(start);
  /** The proposal's start has gone by: the offer can't start in the past, so it waits for a revision. */
  const startPassed = !!startDate && startDate < startOfToday();
  // The start day is day one of the trial, so its last day is `days - 1` working days later.
  const end = trial && startDate ? isoDay(addWorkingDays(startDate, days - 1)) : "";
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
  return { days, startDate, startPassed, end, rate, months, escrow, fee, weekly, hoursOk, payable, payLabel };
}

type Figures = ReturnType<typeof offerFigures>;

/**
 * Whether a step is done enough to continue from. A trial is judged on its tasks, so it needs one; an
 * ongoing role can start with none. A start that has passed stops it: that takes a revision.
 */
function canLeave(kind: StepKey, { trial, tasks, figures, deposited }: { trial: boolean; tasks: PlannedTask[]; figures: Figures; deposited: boolean }) {
  const { payable, hoursOk, startPassed } = figures;
  return kind === "letter" ? payable : kind === "tasks" ? !trial || tasks.length > 0 : kind === "dates" ? !startPassed : kind === "terms" ? !startPassed && payable && hoursOk : kind === "deposit" ? deposited : true;
}

/** Review & Sign's summary: the role and pay, then the trial's dates and escrow or the ongoing role's start and terms, then the tasks. */
function reviewRows({ role, person, proposal, trial, figures, start, benefits, tasks }: { role: Role; person: Independent; proposal: DealProposal; trial: boolean; figures: Figures; start: string; benefits: string[]; tasks: PlannedTask[] }) {
  const { end, escrow, fee, weekly, payLabel } = figures;
  return [
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
  ] as [string, string][];
}

/**
 * What the offer goes out with: a trial's dates and escrow deposit, or an ongoing role's pay with its
 * hours (part-time) or benefits (full-time) — and, either way, the tasks it sets.
 */
function offerTerms({ role, proposal, figures, start, benefits, tasks }: { role: Role; proposal: DealProposal; figures: Figures; start: string; benefits: string[]; tasks: PlannedTask[] }): OfferTerms {
  const { end, escrow, fee, weekly, payLabel } = figures;
  // Ids the tasks keep on the contract, so a notification can link straight to one.
  const offerTasks = tasks.map((t, i) => ({ ...t, id: `task-${i + 1}` }));
  return role.type === "trial"
    ? { rate: proposal.rate, start, end, deposit: { escrow, fee }, tasks: offerTasks }
    : { rate: payLabel, start, hours: role.type === "part-time" ? weekly : undefined, benefits: role.type === "full-time" ? benefits : undefined, tasks: offerTasks };
}

/**
 * The offer as it's filled in. What the proposal settled — the tasks, the start, the pay and a
 * part-time role's hours — is read, not entered (TB-105): only the deposit, a full-time role's
 * benefits and the signature are the Team Builder's to add here.
 */
function useOfferDraft(role: Role, proposal: DealProposal, startTasks: PlannedTask[] | undefined) {
  const start = proposedStart(role.type, role.duration, proposal.start);
  const [deposited, setDeposited] = useState(false);
  const [signature, setSignature] = useState("");
  const pay = String(rateAmount(proposal.rate) || "");
  const hours = String(proposal.hours ?? role.hours ?? 20);
  const [benefits, setBenefits] = useState<string[]>(() => (role.benefits?.length ? role.benefits.map((b) => b.label) : FT_BENEFITS));
  const tasks = plannedTasks(startTasks, role, proposal);
  const figures = offerFigures(role, proposal, start, pay, hours);
  return { start, deposited, setDeposited, signature, setSignature, benefits, setBenefits, tasks, figures };
}

type OfferDraft = ReturnType<typeof useOfferDraft>;

/**
 * The dialog's state: the step it's on and the offer as it's filled in, whether that step is done
 * enough to continue from, `close` — which starts it over at the first step, with the deposit and the
 * signature cleared — and `send`.
 */
function useOfferDialog({ role, proposal, startTasks, onClose, onSend }: { role: Role; proposal: DealProposal; startTasks?: PlannedTask[]; onClose: () => void; onSend: (terms: OfferTerms) => void }) {
  const trial = role.type === "trial";
  const keys = stepKeys(trial);
  const label = stepLabels(role.type);
  const steps = keys.map((k) => label[k]);
  const [step, setStep] = useState(0);
  const kind = keys[step];
  const draft = useOfferDraft(role, proposal, startTasks);
  const { start, deposited, tasks, figures } = draft;

  const close = () => {
    onClose();
    setStep(0);
    draft.setDeposited(false);
    draft.setSignature("");
  };
  const canAdvance = canLeave(kind, { trial, tasks, figures, deposited });
  const send = () => {
    onSend(offerTerms({ role, proposal, figures, start, benefits: draft.benefits, tasks }));
    close();
  };
  return { steps, step, setStep, kind, last: steps.length - 1, canAdvance, draft, close, send };
}

/**
 * TB-105 Send Offer. The offer carries what the proposal settled, and nothing here changes it: the
 * tasks (the job post's, with the talent's accepted suggestions), the start the talent proposed with
 * the end it comes to, and the pay and hours. Changing any of it is a proposal revision (TB-106),
 * before an offer. A trial runs Start & End Dates → Deposit Payment → Review & Sign, and the deposit
 * gates the send: it can't go out until escrow is funded. A full-time or part-time role hires
 * straight onto the contract, with no trial and no escrow — Start & Salary or Start & Hours, then
 * Review & Sign; a full-time offer's benefits are the one thing chosen here.
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
  const { steps, step, setStep, kind, last, canAdvance, draft, close, send } = useOfferDialog({ role, proposal, startTasks, onClose, onSend });
  const first = person.name.split(" ")[0];

  return (
    <Modal
      open={open}
      onClose={close}
      width={640}
      title={`Send an offer to ${first}`}
      description={steps[step]}
      footer={
        <OfferFooter
          step={step}
          last={last}
          kind={kind}
          canAdvance={canAdvance}
          signature={draft.signature}
          payable={draft.figures.payable}
          onBack={() => (step === 0 ? close() : setStep(step - 1))}
          onNext={() => setStep((s) => Math.min(s + 1, last))}
          onSend={send}
        />
      }
    >
      <div className="flex flex-col gap-5">
        <Steps steps={steps} current={step} />
        <OfferStep kind={kind} person={person} role={role} proposal={proposal} card={card} draft={draft} />
      </div>
    </Modal>
  );
}

/** The open step's fields, from the offer letter to the signature. */
function OfferStep({ kind, person, role, proposal, card, draft }: { kind: StepKey; person: Independent; role: Role; proposal: DealProposal; card?: PaymentMethod; draft: OfferDraft }) {
  const trial = role.type === "trial";
  const first = person.name.split(" ")[0];
  const { figures, tasks } = draft;
  return (
    <>
      {kind === "letter" && <LetterStep person={person} role={role} proposal={proposal} trial={trial} start={draft.start} payable={figures.payable} first={first} />}

      {/* TB-105 — the work the proposal settled: it becomes the contract's task list when it's signed. */}
      {kind === "tasks" && <TasksStep trial={trial} first={first} tasks={tasks} start={draft.start} end={figures.end} />}

      {kind === "dates" && <DatesStep role={role} proposal={proposal} figures={figures} start={draft.start} first={first} />}

      {kind === "terms" && <TermsStep type={role.type} proposal={proposal} figures={figures} start={draft.start} benefits={draft.benefits} onBenefits={draft.setBenefits} first={first} />}

      {kind === "deposit" && <DepositStep figures={figures} card={card} deposited={draft.deposited} onDeposited={draft.setDeposited} />}

      {kind === "sign" && <SignStep rows={reviewRows({ role, person, proposal, trial, figures, start: draft.start, benefits: draft.benefits, tasks })} signature={draft.signature} onSignature={draft.setSignature} />}
    </>
  );
}

/** The action bar: Cancel or Back, then Continue — Deposit & continue on the deposit — and, on the last step, Sign & send. */
function OfferFooter({
  step,
  last,
  kind,
  canAdvance,
  signature,
  payable,
  onBack,
  onNext,
  onSend,
}: {
  step: number;
  last: number;
  kind: StepKey;
  canAdvance: boolean;
  signature: string;
  payable: boolean;
  onBack: () => void;
  onNext: () => void;
  onSend: () => void;
}) {
  return (
    <>
      <Button size="lg" onClick={onBack}>
        {step === 0 ? "Cancel" : "Back"}
      </Button>
      {step < last ? (
        <Button size="lg" variant="primary" disabled={!canAdvance} onClick={onNext}>
          {kind === "deposit" ? "Deposit & continue" : "Continue"}
        </Button>
      ) : (
        <Button size="lg" variant="primary" disabled={!signature.trim() || !payable} onClick={onSend}>
          Sign &amp; send offer
        </Button>
      )}
    </>
  );
}

/** Offer Letter: who the offer is for, the terms they proposed, and their cover letter. */
function LetterStep({ person, role, proposal, trial, start, payable, first }: { person: Independent; role: Role; proposal: DealProposal; trial: boolean; start: string; payable: boolean; first: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar src={person.avatar} size={48} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.3]">
          <p className="text-[15px] font-semibold text-ink">{person.name}</p>
          <p className="text-[13px] text-ink-2">
            {person.level} · {person.location}
          </p>
        </div>
        <MatchPill pct={person.match} coded title={MATCH_TOOLTIP.team} />
      </div>
      <div className="flex gap-2">
        <KeyValue label={role.type === "full-time" ? "Proposed salary" : "Rate"} value={proposal.rate} />
        <KeyValue label="Contract" value={JOB_TYPE_LABEL[role.type]} />
        {trial && <KeyValue label="Duration" value={role.duration} />}
        <KeyValue label="Starts" value={pretty(start)} />
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
  );
}

/** Tasks: the list the proposal settled, read-only — the trial's, or an ongoing role's first tasks if it has any. */
function TasksStep({ trial, first, tasks, start, end }: { trial: boolean; first: string; tasks: PlannedTask[]; start: string; end: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] leading-[1.45] text-ink-2">
        {trial
          ? `The trial's tasks as ${first}'s proposal settled them: your job post's, with the changes you accepted. They become the trial's task list when ${first} signs. To change them, ask ${first} for a revision.`
          : `The first tasks, as ${first}'s proposal settled them. You add the rest once the contract starts.`}
      </p>
      <TaskPlanList tasks={tasks} start={start} lastDay={trial ? end : undefined} empty={trial ? "No trial tasks." : `None — you add work once ${first} starts.`} />
      {trial && tasks.length === 0 && <InfoBanner tone="warn">A trial needs at least one task to be judged on. Add the tasks to your job post, then ask {first} for a revision.</InfoBanner>}
    </div>
  );
}

/** A proposal's start that has gone by: the offer can't start in the past, so it waits for a revision with a new date. */
function PassedStart({ start, first }: { start: string; first: string }) {
  return (
    <InfoBanner tone="warn">
      {first}&apos;s proposed start, {pretty(start)}, has passed. Ask {first} for a revision with a new start date before sending an offer.
    </InfoBanner>
  );
}

/** Start & End Dates: the start the talent proposed, with the end its working days come to — read, not picked. */
function DatesStep({ role, proposal, figures, start, first }: { role: Role; proposal: DealProposal; figures: Figures; start: string; first: string }) {
  const { days, end, startPassed } = figures;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <KeyValue label="Trial start date" value={pretty(start)} />
        <KeyValue label={`End date (${days} working days)`} value={pretty(end)} />
      </div>
      {startPassed ? <PassedStart start={start} first={first} /> : <InfoBanner>The start {first} proposed, and the end its {days} working days come to — weekends don&apos;t count. To change them, ask {first} for a revision.</InfoBanner>}
      <div className="flex gap-2">
        <KeyValue label="Rate" value={proposal.rate} />
        <KeyValue label="Trial duration" value={role.duration} />
        <KeyValue label="Payment" value="Escrow, released at trial end" />
      </div>
    </div>
  );
}

/**
 * Start & Salary or Start & Hours: an ongoing role's start, pay and part-time hours as the proposal
 * settled them — read, not entered — then a full-time role's benefits, which are the offer's to choose.
 */
function TermsStep({ type, proposal, figures, start, benefits, onBenefits, first }: { type: Role["type"]; proposal: DealProposal; figures: Figures; start: string; benefits: string[]; onBenefits: Dispatch<SetStateAction<string[]>>; first: string }) {
  const { payLabel, weekly, startPassed } = figures;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <KeyValue label="Start date" value={pretty(start)} />
        <KeyValue label={type === "full-time" ? "Salary" : "Rate"} value={proposal.rate ? payLabel : "—"} />
        {type === "part-time" && <KeyValue label="Hours a week" value={hoursLabel(weekly)} />}
      </div>
      {startPassed ? <PassedStart start={start} first={first} /> : <InfoBanner>As {first}&apos;s proposal settled them. To change them, ask {first} for a revision.</InfoBanner>}
      {type === "part-time" ? null : (
        <Field label="Exclusive benefits">
          <div className="flex flex-col gap-2">
            {FT_BENEFITS.map((b) => (
              <Checkbox key={b} checked={benefits.includes(b)} onChange={(on) => onBenefits((all) => (on ? [...all, b] : all.filter((x) => x !== b)))}>
                {b}
              </Checkbox>
            ))}
          </div>
        </Field>
      )}
      <InfoBanner>No trial and no escrow: {first} starts on the {JOB_TYPE_LABEL[type].toLowerCase()} contract, paid at the end of each month.</InfoBanner>
    </div>
  );
}

/** Deposit Payment: the escrow and fee charged to the card on file, which a trial's offer can't be sent without. */
function DepositStep({ figures, card, deposited, onDeposited }: { figures: Figures; card?: PaymentMethod; deposited: boolean; onDeposited: (on: boolean) => void }) {
  const { rate, months, escrow, fee, payable } = figures;
  return (
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
      <Checkbox checked={deposited} disabled={!card || !payable} onChange={onDeposited}>
        Charge {usd(escrow + fee)} — {usd(escrow)} into escrow, {usd(fee)} fee
      </Checkbox>
    </div>
  );
}

/** Review & Sign: the offer's terms as they'll be sent, and the typed name that signs them. */
function SignStep({ rows, signature, onSignature }: { rows: [string, string][]; signature: string; onSignature: (name: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-lg border border-border p-4 text-[14px] leading-[1.5] text-ink">
        {rows.map(([k, v]) => (
          <span key={k} className="flex justify-between gap-4">
            <span className="text-ink-2">{k}</span> {v}
          </span>
        ))}
      </div>
      <Field label="Type your full name to sign">
        <Input value={signature} onChange={(e) => onSignature(e.target.value)} placeholder="Alex Rivera" />
      </Field>
    </div>
  );
}
