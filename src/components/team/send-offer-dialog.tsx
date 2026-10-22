"use client";

import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Avatar, Button, Checkbox, Chip, Field, InfoBanner, KeyValue, MatchPill, Modal, Steps } from "@/components/portal/ui";
import { Signature } from "@/components/portal/offer-parts";
import { TaskPlanList } from "@/components/portal/tasks/task-plan";
import { CardOnFile } from "@/components/team/card-on-file";
import { MATCH_TOOLTIP } from "@/lib/portal/match";
import { shortName, signatureMatches } from "@/lib/portal/names";
import { addWorkingDays, dayLabel, dayRangeLabel, durationDays, trialLength, fromISODate, startOfToday, isoDay } from "@/lib/portal/dates";
import type { DealProposal } from "@/lib/demo/deal";
import { rateAmount, usd } from "@/lib/demo/disputes";
import { FT_BENEFITS, hoursLabel, JOB_TYPE_LABEL, payFor, proposedStart } from "@/lib/contract/job-types";
import type { OfferTask, PlannedTask } from "@/lib/demo/tasks";
import type { Independent, PaymentMethod, Role } from "@/lib/team/data";

/** Hireable's platform fee, charged on top of a trial's escrow rather than out of it. */
const FEE_RATE = 0.1;

/**
 * Dates stay yyyy-mm-dd strings, read and written in local time, and are shown the way every other
 * date reads ("04 Nov 2026": en-GB's toLocaleDateString said "Sept").
 */
const pretty = (s: string) => (fromISODate(s) ? dayLabel(fromISODate(s)) : "Not set");

/** The terms a sent offer carries, for the type of role it is, and the tasks it sets. */
export type OfferTerms = { rate: string; start: string; end?: string; deposit?: { escrow: number; fee: number }; hours?: number; benefits?: string[]; tasks: OfferTask[] };

type StepKey = "letter" | "tasks" | "dates" | "deposit" | "terms";

/**
 * The steps in order. The last one is signed where it's filled in: a trial funds its escrow and signs
 * on one step, an ongoing role reads its terms and signs. A separate Review & Sign step only repeated
 * what the earlier steps had confirmed.
 */
function stepKeys(trial: boolean): StepKey[] {
  return trial ? ["letter", "tasks", "dates", "deposit"] : ["letter", "tasks", "terms"];
}

/** What each step is called in the stepper. */
const STEP_LABELS: Record<StepKey, string> = {
  letter: "Offer Letter",
  tasks: "Tasks",
  dates: "Start & End Dates",
  deposit: "Deposit & Sign",
  terms: "Terms & Sign",
};

/**
 * The role's tasks, which the offer carries as they stand (the talent first reads them here, with
 * the offer), or, on a proposal from before the tasks were the Team Builder's to set, the ones it listed.
 */
function plannedTasks(role: Role, proposal: DealProposal) {
  return role.tasks?.length ? role.tasks : (proposal.tasks ?? []);
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
   * A trial's pay is one total for the whole trial, and the trial is funded in full: the escrow is
   * that total, with the platform fee on top. A full-time or part-time role's pay is monthly.
   */
  const rate = trial ? rateAmount(proposal.rate) : rateAmount(pay);
  const escrow = trial ? rate : 0;
  const fee = Math.round(escrow * FEE_RATE * 100) / 100;
  const weekly = Number(hours);
  const hoursOk = role.type !== "part-time" || (Number.isInteger(weekly) && weekly >= 1 && weekly <= 40);
  /** $0 can't pay anyone: the proposal step refuses it too. */
  const payable = rate > 0;
  const payLabel = `${usd(rate)}/mo`;
  return { days, startDate, startPassed, end, rate, escrow, fee, weekly, hoursOk, payable, payLabel };
}

type Figures = ReturnType<typeof offerFigures>;

/**
 * Whether a step is done enough to continue from. A trial is judged on its tasks, so it needs one; an
 * ongoing role can start with none. A start that has passed stops it: that takes a revision. An
 * ongoing role's pay is charged monthly to a card, so its terms need one on file.
 */
function canLeave(kind: StepKey, { trial, tasks, figures, deposited, hasCard }: { trial: boolean; tasks: PlannedTask[]; figures: Figures; deposited: boolean; hasCard: boolean }) {
  const { payable, hoursOk, startPassed } = figures;
  return kind === "letter" ? payable : kind === "tasks" ? !trial || tasks.length > 0 : kind === "dates" ? !startPassed : kind === "terms" ? !startPassed && payable && hoursOk && hasCard : kind === "deposit" ? deposited : true;
}

/** The summary signed on the last step: the role and pay, then the trial's dates, tasks and escrow, or the ongoing role's start, terms and tasks. */
function reviewRows({ role, person, proposal, trial, figures, start, benefits, tasks }: { role: Role; person: Independent; proposal: DealProposal; trial: boolean; figures: Figures; start: string; benefits: string[]; tasks: PlannedTask[] }) {
  const { end, escrow, fee, weekly, payLabel } = figures;
  const count: [string, string] = ["Tasks", tasks.length ? `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}` : "None yet. You add them once it starts"];
  return [
    ["Role", role.title],
    // Not hired yet, so the surname stays an initial ("Juan D.").
    ["Candidate", shortName(person.name)],
    ["Contract", JOB_TYPE_LABEL[role.type]],
    ["Pay", payFor(role.type, trial ? proposal.rate : payLabel)],
    ...(trial
      ? ([
          ["Trial", dayRangeLabel(start, end)],
          count,
          // The trial is funded in full: its pay, the one total for the whole trial.
          ["In escrow", usd(escrow)],
          ["Platform fee", usd(fee)],
        ] as [string, string][])
      : ([["Starts", pretty(start)], ...(role.type === "part-time" ? [["Hours", hoursLabel(weekly)]] : [["Benefits", benefits.length ? `${benefits.length} included` : "None"]]), count] as [string, string][])),
  ] as [string, string][];
}

/**
 * What the offer goes out with: a trial's dates and escrow deposit, or an ongoing role's pay with its
 * hours (part-time) or benefits (full-time), and, either way, the tasks it sets.
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
 * The offer as it's filled in. What the proposal settled (the start, the pay and a part-time role's
 * hours) is read, not entered (TB-105), and the tasks are the role's: only the card, the deposit, a
 * full-time role's benefits and the signature are the Team Builder's to add here. The card is the one
 * picked, else the default, else the first on file.
 */
function useOfferDraft(role: Role, proposal: DealProposal, cards: PaymentMethod[]) {
  const start = proposedStart(role.type, role.duration, proposal.start);
  const [deposited, setDeposited] = useState(false);
  const [signature, setSignature] = useState("");
  /** The tick on the platform contract that every offer is signed with, as the talent's is. */
  const [agree, setAgree] = useState(false);
  const [cardId, setCardId] = useState<string | null>(null);
  const card = cards.find((c) => c.id === cardId) ?? cards.find((c) => c.isDefault) ?? cards[0];
  const pay = String(rateAmount(proposal.rate) || "");
  const hours = String(proposal.hours ?? role.hours ?? 20);
  const [benefits, setBenefits] = useState<string[]>(() => (role.benefits?.length ? role.benefits.map((b) => b.label) : FT_BENEFITS));
  const tasks = plannedTasks(role, proposal);
  const figures = offerFigures(role, proposal, start, pay, hours);
  return { start, deposited, setDeposited, signature, setSignature, agree, setAgree, card, setCardId, benefits, setBenefits, tasks, figures };
}

type OfferDraft = ReturnType<typeof useOfferDraft>;

/**
 * The dialog's state: the step it's on and the offer as it's filled in, whether that step is done
 * enough to continue from, whether the typed name signs it (the account's name), `close` (which starts
 * it over at the first step, with the deposit and the signature cleared) and `send`.
 */
function useOfferDialog({ role, proposal, cards, signer, onClose, onSend }: { role: Role; proposal: DealProposal; cards: PaymentMethod[]; signer: string; onClose: () => void; onSend: (terms: OfferTerms) => void }) {
  const trial = role.type === "trial";
  const keys = stepKeys(trial);
  const steps = keys.map((k) => STEP_LABELS[k]);
  const [step, setStep] = useState(0);
  const kind = keys[step];
  const draft = useOfferDraft(role, proposal, cards);
  const { start, deposited, tasks, figures, card } = draft;

  const close = () => {
    onClose();
    setStep(0);
    draft.setDeposited(false);
    draft.setSignature("");
    draft.setAgree(false);
  };
  const canAdvance = canLeave(kind, { trial, tasks, figures, deposited, hasCard: !!card });
  /** Signed: the account's full name typed, and the platform contract ticked. */
  const signed = signatureMatches(draft.signature, signer) && draft.agree;
  const send = () => {
    onSend(offerTerms({ role, proposal, figures, start, benefits: draft.benefits, tasks }));
    close();
  };
  return { steps, step, setStep, kind, last: steps.length - 1, canAdvance, signed, draft, close, send };
}

/**
 * TB-105 Send Offer. The offer carries what the proposal settled, and nothing here changes it: the
 * start the talent proposed with the end it comes to, and the pay and hours. Changing any of it is a
 * proposal revision (TB-106), before an offer. Its tasks are the role's, which the talent first reads
 * with the offer. A trial runs Start & End Dates → Deposit & Sign, and the deposit gates the send: it
 * can't go out until escrow is funded. A full-time or part-time role hires straight onto the
 * contract, with no trial and no escrow: Terms & Sign reads its start, pay and hours, and a full-time
 * offer's benefits are the one thing chosen there. Either way the card it's paid from is asked for on
 * the last step when none is on file, and the Team Builder signs with their account's full name.
 */
export function SendOfferDialog({
  open,
  onClose,
  person,
  role,
  proposal,
  cards,
  signer,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  person: Independent;
  role: Role;
  proposal: DealProposal;
  /** The cards on file, to pay from: the default is picked to begin with. */
  cards: PaymentMethod[];
  /** The Team Builder's full name on their account: the signature has to match it. */
  signer: string;
  onSend: (terms: OfferTerms) => void;
}) {
  const { steps, step, setStep, kind, last, canAdvance, signed, draft, close, send } = useOfferDialog({ role, proposal, cards, signer, onClose, onSend });
  const first = person.name.split(" ")[0];

  return (
    <Modal
      open={open}
      onClose={close}
      width={640}
      title={`Send an offer to ${first}`}
      footer={
        <OfferFooter
          step={step}
          last={last}
          canAdvance={canAdvance}
          signed={signed}
          payable={draft.figures.payable}
          onBack={() => (step === 0 ? close() : setStep(step - 1))}
          onNext={() => setStep((s) => Math.min(s + 1, last))}
          onSend={send}
        />
      }
    >
      <div className="flex flex-col gap-5">
        <Steps steps={steps} current={step} />
        <OfferStep kind={kind} person={person} role={role} proposal={proposal} cards={cards} signer={signer} draft={draft} />
      </div>
    </Modal>
  );
}

/** The open step's fields, from the offer letter to the signature. */
function OfferStep({ kind, person, role, proposal, cards, signer, draft }: { kind: StepKey; person: Independent; role: Role; proposal: DealProposal; cards: PaymentMethod[]; signer: string; draft: OfferDraft }) {
  const trial = role.type === "trial";
  const first = person.name.split(" ")[0];
  const { figures, tasks } = draft;
  const total = usd(figures.escrow + figures.fee);
  /** Another card means another charge to agree to. */
  const pickCard = (id: string) => {
    draft.setCardId(id);
    draft.setDeposited(false);
  };
  /** The last step's parts: the summary of the offer, the card it's paid from, and the typed name that signs it. */
  const sign: SignParts = {
    summary: <OfferSummary rows={reviewRows({ role, person, proposal, trial, figures, start: draft.start, benefits: draft.benefits, tasks })} total={trial ? total : undefined} />,
    card: <CardOnFile cards={cards} card={draft.card} onPick={pickCard} label={trial ? "Deposit charged to" : "Monthly pay charged to"} empty={trial ? `Add a card to pay the ${total} deposit.` : `Add a card for ${first}'s monthly pay.`} />,
    // The one signature every offer is signed with: the account's full name, and the platform contract's tick.
    signature: <Signature name={draft.signature} onName={draft.setSignature} agree={draft.agree} onAgree={draft.setAgree} fullName={signer} />,
  };
  return (
    <>
      {kind === "letter" && <LetterStep person={person} role={role} proposal={proposal} trial={trial} start={draft.start} payable={figures.payable} first={first} />}

      {/* TB-105 — the role's tasks: they become the contract's task list when it's signed. */}
      {kind === "tasks" && <TasksStep trial={trial} first={first} tasks={tasks} start={draft.start} end={figures.end} />}

      {kind === "dates" && <DatesStep proposal={proposal} figures={figures} start={draft.start} first={first} />}

      {kind === "terms" && <TermsStep type={role.type} figures={figures} start={draft.start} benefits={draft.benefits} onBenefits={draft.setBenefits} first={first} sign={sign} />}

      {kind === "deposit" && <DepositStep figures={figures} card={draft.card} deposited={draft.deposited} onDeposited={draft.setDeposited} sign={sign} />}
    </>
  );
}

/** The action bar: Cancel or Back, then Continue and, on the last step, Sign & send once it's signed: the account's name typed and the platform contract ticked. */
function OfferFooter({
  step,
  last,
  canAdvance,
  signed,
  payable,
  onBack,
  onNext,
  onSend,
}: {
  step: number;
  last: number;
  canAdvance: boolean;
  signed: boolean;
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
          Continue
        </Button>
      ) : (
        // The last step is signed where it's filled in: a trial's deposit, or an ongoing role's terms and card, gate it too.
        <Button size="lg" variant="primary" disabled={!canAdvance || !signed || !payable} onClick={onSend}>
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
          <p className="text-[15px] font-semibold text-ink">{shortName(person.name)}</p>
          <p className="text-[13px] text-ink-2">
            {person.level} · {person.location}
          </p>
        </div>
        <MatchPill pct={person.match} coded title={MATCH_TOOLTIP.team} />
      </div>
      <div className="flex gap-2">
        <KeyValue label="Pay" value={payFor(role.type, proposal.rate)} />
        <KeyValue label="Contract" value={JOB_TYPE_LABEL[role.type]} />
        {trial && <KeyValue label="Duration" value={trialLength(durationDays(role.duration))} />}
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
      {!payable && <InfoBanner tone="warn">This proposal has no pay to offer. Ask {first} for a revision with their pay before you send an offer.</InfoBanner>}
    </div>
  );
}

/** Tasks: the role's tasks, read-only: the trial's, or an ongoing role's first tasks if it has any. */
function TasksStep({ trial, first, tasks, start, end }: { trial: boolean; first: string; tasks: PlannedTask[]; start: string; end: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] leading-[1.45] text-ink-2">{trial ? `These are the trial tasks. ${first} sees them with your offer.` : `The first tasks from your role. You add the rest once ${first} starts.`}</p>
      <TaskPlanList tasks={tasks} start={start} lastDay={trial ? end : undefined} empty={trial ? "No trial tasks." : `None yet. You add work once ${first} starts.`} />
      {trial && tasks.length === 0 && <InfoBanner tone="warn">A trial needs at least one task to be judged on, and this role has none.</InfoBanner>}
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

/** Start & End Dates: the start the talent proposed, with the end its working days come to: read, not picked. */
function DatesStep({ proposal, figures, start, first }: { proposal: DealProposal; figures: Figures; start: string; first: string }) {
  const { days, end, startPassed } = figures;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <KeyValue label="Trial start date" value={pretty(start)} />
        <KeyValue label="End date" value={pretty(end)} />
      </div>
      {startPassed ? <PassedStart start={start} first={first} /> : <InfoBanner>To change the dates, ask {first} for a revision.</InfoBanner>}
      <div className="flex gap-2">
        <KeyValue label="Pay" value={payFor("trial", proposal.rate)} />
        <KeyValue label="Trial duration" value={trialLength(days)} />
        <KeyValue label="Payment" value="Escrow, released at trial end" />
      </div>
    </div>
  );
}

/** The last step's signing parts: the summary of the offer, the card it's paid from, and the typed name that signs it. */
type SignParts = { summary: ReactNode; card: ReactNode; signature: ReactNode };

/**
 * Terms & Sign: an ongoing role's start, pay and part-time hours as the proposal settled them, read
 * and not entered, then a full-time role's benefits, which are the offer's to choose, the card its
 * monthly pay is charged to, and the signature. It's the last step: no separate review repeats it.
 */
function TermsStep({ type, figures, start, benefits, onBenefits, first, sign }: { type: Role["type"]; figures: Figures; start: string; benefits: string[]; onBenefits: Dispatch<SetStateAction<string[]>>; first: string; sign: SignParts }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] leading-[1.45] text-ink-2">
        {type === "full-time" ? "Start date and pay" : "Start date, pay and hours"} come from {first}&apos;s proposal. To change them, ask {first} for a revision.
      </p>
      {sign.summary}
      {figures.startPassed && <PassedStart start={start} first={first} />}
      {type === "part-time" ? null : (
        <Field label="Benefits">
          <div className="flex flex-col gap-2">
            {FT_BENEFITS.map((b) => (
              <Checkbox key={b} checked={benefits.includes(b)} onChange={(on) => onBenefits((all) => (on ? [...all, b] : all.filter((x) => x !== b)))}>
                {b}
              </Checkbox>
            ))}
          </div>
        </Field>
      )}
      {/* The one notice: how a role is paid without a trial or escrow, and what a dispute does to it. */}
      <InfoBanner>No trial or escrow: {first} is paid at the end of each month, and a disputed amount is held from the next pay.</InfoBanner>
      {sign.card}
      {sign.signature}
    </div>
  );
}

/**
 * Deposit & Sign: the offer as it'll be sent with the total it charges, the card it's charged to (Add
 * a card when there's none on file, Change to pick another), the agreement to the charge, which a
 * trial's offer can't be sent without, and the signature.
 */
function DepositStep({ figures, card, deposited, onDeposited, sign }: { figures: Figures; card?: PaymentMethod; deposited: boolean; onDeposited: (on: boolean) => void; sign: SignParts }) {
  return (
    <div className="flex flex-col gap-4">
      {sign.summary}
      {sign.card}
      <InfoBanner>The escrow is held until the trial ends; the platform fee is not refunded.</InfoBanner>
      {/* The deposit is required before the offer can be sent (TB-105). */}
      <Checkbox checked={deposited} disabled={!card || !figures.payable} onChange={onDeposited}>
        I agree to this charge
      </Checkbox>
      {sign.signature}
    </div>
  );
}

/** The offer's terms as they'll be sent, a row each, and on a trial the total charged under a rule. */
function OfferSummary({ rows, total }: { rows: [string, string][]; total?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4 text-[14px] leading-[1.5] text-ink">
      {rows.map(([k, v]) => (
        <span key={k} className="flex justify-between gap-4">
          <span className="text-ink-2">{k}</span> {v}
        </span>
      ))}
      {total ? (
        <>
          <span aria-hidden className="my-1 h-px w-full bg-border" />
          <span className="flex justify-between gap-4 font-semibold">
            <span>Total charged</span> {total}
          </span>
        </>
      ) : null}
    </div>
  );
}
