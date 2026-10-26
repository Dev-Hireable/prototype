import type { ReactNode } from "react";
import { Badge } from "@/components/portal/badge";
import { Button, Field, Input, Steps, Textarea } from "@/components/portal/ui";
import { StepCard } from "@/components/portal/step-card";
import { DatePicker } from "@/components/portal/date-picker";
import { ProposalReadiness } from "@/components/independent/id-verification";
import { ProposalBody, type ProposalAuthor } from "@/components/portal/proposal-review";
import { addWorkingDays, dayLabel, durationDays, fromISODate, isoDay, startOfToday, today, workingDaysLabel } from "@/lib/portal/dates";
import type { DealProposal } from "@/lib/demo/deal";
import { payFor, type JobType } from "@/lib/contract/job-types";
import type { JobView } from "@/lib/independent/job-view";
import { proposalBlocker, useIdVerification } from "@/lib/independent/kyc";
import { useWallet } from "@/lib/independent/wallet";
import { proposalTerms, stepBlocker, type ProposalFields } from "../_lib/proposal";
import type { Wizard } from "../_lib/wizard";

/** The steps, the first named for what it asks on each kind of role: the pay, a part-time role's hours, and the start. */
const STEPS: Record<JobType, string[]> = {
  trial: ["Pay and start date", "Cover letter", "Review & send"],
  "full-time": ["Pay and start date", "Cover letter", "Review & send"],
  "part-time": ["Pay, hours and start date", "Cover letter", "Review & send"],
};

/**
 * Writing the proposal: where the talent is in the three steps, and that step — the pay and the
 * day they'd start, the cover letter, or the proposal as the Team Builder will read it. The wizard
 * keeps the fields and the step.
 */
export function ProposalSteps({ wizard: w }: { wizard: Wizard }) {
  const { job, step, form, revise } = w;
  const { amount, hoursOk, startOk, terms } = proposalTerms(job, form);
  /** Why this step can't go on yet, as its button's tip. */
  const waiting = stepBlocker(step, { amount, hoursOk, startOk, letter: form.letter });
  // A first proposal waits on a payout method and the ID check (KYC); a revision has been through them.
  const { payouts } = useWallet();
  const { verified } = useIdVerification();
  const blocked = revise ? undefined : proposalBlocker(payouts, verified);
  return (
    <>
      <div className="px-4 py-10">
        <Steps steps={STEPS[job.type]} current={step} />
      </div>

      {step === 0 && <PayStep job={job} form={form} amount={amount} hoursOk={hoursOk} footer={<Footer onDraft={w.saveDraft} onBack={w.close} backLabel="Cancel" onNext={() => w.setStep(1)} nextLabel="Continue" waiting={waiting} />} />}

      {step === 1 && <LetterStep form={form} footer={<Footer onDraft={w.saveDraft} onBack={() => w.setStep(0)} backLabel="Previous" onNext={() => w.setStep(2)} nextLabel="Review & send" waiting={waiting} />} />}

      {/* Review & send: the proposal exactly as the Team Builder will read it — the same body their
          Review proposal dialog shows, the role it answers included. */}
      {step === 2 && (
        <ReviewStep
          job={job}
          author={w.author}
          proposal={{ ...terms, version: (w.previous?.version ?? 0) + 1, sent: today() }}
          revise={revise}
          checks={!revise && <ProposalReadiness onToast={w.setToast} />}
          blocked={blocked}
          onBack={() => w.setStep(1)}
          onSubmit={() => w.submit(terms)}
        />
      )}
    </>
  );
}

/** Step one: the pay, on a part-time role the hours a week, and the day they'd start. */
function PayStep({ job, form, amount, hoursOk, footer }: { job: JobView; form: ProposalFields; amount: number; hoursOk: boolean; footer: ReactNode }) {
  return (
    <StepCard title={STEPS[job.type][0]}>
      <div className="flex flex-col gap-4">
        <PayField job={job} rate={form.rate} onRate={form.setRate} amount={amount} />
        {job.type === "part-time" && <HoursField hours={form.hours} onHours={form.setHours} hoursOk={hoursOk} />}
        <StartField job={job} start={form.start} onStart={form.setStart} />
      </div>
      {footer}
    </StepCard>
  );
}

/**
 * The pay and how it's paid, with a nudge when it's nothing or outside the posted range. A trial's is
 * one total for the whole trial; a full-time or part-time role's is monthly.
 */
function PayField({ job, rate, onRate, amount }: { job: JobView; rate: string; onRate: (v: string) => void; amount: number }) {
  const { type } = job;
  const label = type === "trial" ? "Your pay for the trial" : "Pay";
  return (
    <Field label={label} required error={rate.trim() !== "" && amount <= 0 ? "Enter an amount above $0." : undefined}>
      <span className="flex items-center gap-2">
        <span className="flex h-11 flex-1 items-center gap-2 rounded-lg border border-border px-4 text-[14px] tracking-[0.2px] focus-within:border-primary">
          <span className="text-ink-2">$</span>
          <input value={rate} onChange={(e) => onRate(e.target.value.replace(/[^0-9.,]/g, ""))} inputMode="decimal" placeholder="0.00" required aria-label={label} className="min-w-0 flex-1 outline-none placeholder:text-ink-2" />
        </span>
        {type !== "trial" && <span className="w-[120px] text-ink-2">/ month</span>}
      </span>
      <span className="text-[12px] leading-[1.4] text-ink-2">{type === "trial" ? "The whole trial is funded into escrow up front, and released to you when it ends." : "Paid at the end of each month once you start. There's no escrow on an ongoing role."}</span>
      {outsideRange(amount, job.budget) && <span className="text-[12px] leading-[1.4] text-warn-ink">Outside the posted range ({payFor(type, job.budget)}). You can still send it. Say why in your cover letter.</span>}
    </Field>
  );
}

/** A part-time role's hours a week, filled in from the role; the role's terms below keep what it was posted at. */
function HoursField({ hours, onHours, hoursOk }: { hours: string; onHours: (v: string) => void; hoursOk: boolean }) {
  return (
    <Field label="Hours a week" required error={hours.trim() && !hoursOk ? "Enter whole hours between 1 and 40." : undefined}>
      <Input value={hours} onChange={(e) => onHours(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" required className="!w-[160px]" />
    </Field>
  );
}

/**
 * IN-072 — the day they'd start: today or later. The offer starts on it as proposed, and a trial's
 * end follows from its working days, so it says where that lands.
 */
function StartField({ job, start, onStart }: { job: JobView; start: string; onStart: (v: string) => void }) {
  const date = fromISODate(start);
  const days = durationDays(job.duration);
  const end = job.type === "trial" && date ? ` The trial runs ${workingDaysLabel(days)}, to ${dayLabel(addWorkingDays(date, days - 1))}.` : "";
  return (
    <Field label="Start date" required hint={`Your offer will use this start date.${end}`} error={start && !date ? "Pick the day you'd start." : undefined}>
      <DatePicker value={date} onChange={(d) => onStart(d ? isoDay(d) : "")} disabled={{ before: startOfToday() }} placeholder="Pick the day you'd start" aria-label={date ? `Start date: ${dayLabel(date)}` : "Start date"} />
    </Field>
  );
}

/** Whether an amount above nothing falls outside the range the role was posted with. */
function outsideRange(amount: number, budget: string) {
  /** The posted range, as a nudge — the Team Builder can still accept anything. */
  const [lo, hi] = (budget.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Number(n.replace(/,/g, "")));
  return amount > 0 && lo !== undefined && hi !== undefined && (amount < lo || amount > hi);
}

/** Step two: the cover letter (the step's heading names it, the placeholder asks it), and a link to work samples. */
function LetterStep({ form, footer }: { form: ProposalFields; footer: ReactNode }) {
  return (
    <StepCard title="Cover letter" required>
      <div className="flex flex-col gap-4">
        <Textarea rows={6} value={form.letter} onChange={(e) => form.setLetter(e.target.value)} placeholder="Why are you the right fit?" required aria-label="Cover letter" />
        <Field
          label={
            <>
              Portfolio / work samples <span className="font-normal text-ink-2">(optional)</span>
            </>
          }
        >
          <Input value={form.portfolio} onChange={(e) => form.setPortfolio(e.target.value)} className="!text-primary" />
        </Field>
      </div>
      {footer}
    </StepCard>
  );
}

/** Step three: the proposal as the Team Builder will read it, with Previous and the button that sends it. */
function ReviewStep({
  job,
  author,
  proposal,
  revise,
  checks,
  blocked,
  onBack,
  onSubmit,
}: {
  job: JobView;
  author: ProposalAuthor;
  proposal: DealProposal;
  revise: boolean;
  /** A first proposal's payout method and ID check, above the buttons. */
  checks?: ReactNode;
  /** Why Submit waits, as its tip. */
  blocked?: string;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Badge variant="outline" className="self-start">
        Preview
      </Badge>
      {/* The role's notes and link stay private until hire, so they don't go in; a trial's tasks only
          give the locked card its count, since they're shared once the proposal is accepted. */}
      <ProposalBody viewer="independent" author={author} post={{ title: job.title, type: job.type, duration: job.duration, budget: job.budget, hours: job.hours, tasks: job.tasks, company: job.company }} proposal={proposal} />
      {checks}
      <div className="flex justify-end gap-2">
        <Button size="xl" onClick={onBack}>
          Previous
        </Button>
        <Button size="xl" variant="primary" disabled={!!blocked} title={blocked} onClick={onSubmit}>
          {revise ? "Send revised proposal" : "Submit proposal"}
        </Button>
      </div>
    </div>
  );
}

function Footer({
  onDraft,
  onBack,
  backLabel,
  onNext,
  nextLabel,
  waiting,
}: {
  onDraft: () => void;
  onBack: () => void;
  backLabel: string;
  onNext: () => void;
  nextLabel: string;
  /** Why the next step waits, as its tip; nothing once it can go on. */
  waiting?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-3">
      <Button size="lg" variant="ghost" className="!px-2" onClick={onDraft}>
        Save as draft
      </Button>
      <Button size="lg" onClick={onBack}>
        {backLabel}
      </Button>
      <Button size="lg" variant="primary" onClick={onNext} disabled={!!waiting} title={waiting}>
        {nextLabel}
      </Button>
    </div>
  );
}
