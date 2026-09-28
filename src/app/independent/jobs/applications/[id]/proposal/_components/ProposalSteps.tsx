import type { ReactNode } from "react";
import { Button, Card, Field, InfoBanner, Input, Steps, Textarea } from "@/components/independent/ui";
import { DatePicker } from "@/components/portal/DatePicker";
import { SuggestTasks } from "@/components/independent/SuggestTasks";
import { ProposalBody, type ProposalAuthor } from "@/components/portal/ProposalReview";
import { addWorkingDays, dayLabel, durationDays, fromISODate, isoDay, startOfToday, today } from "@/lib/demo/dates";
import type { DealProposal } from "@/lib/demo/deal";
import { hoursLabel } from "@/lib/demo/job-types";
import type { JobType } from "@/lib/demo/job-types";
import { planWeeks } from "@/lib/demo/tasks";
import type { JobView } from "@/lib/independent/job-view";
import { proposalTerms, type ProposalFields } from "../_lib/proposal";
import type { Wizard } from "../_lib/wizard";

/** The steps, named for what the first one asks for on each kind of role. */
const STEPS: Record<JobType, string[]> = {
  trial: ["Propose Rate", "Cover Letter", "Review & Send"],
  "full-time": ["Expected Salary", "Cover Letter", "Review & Send"],
  "part-time": ["Rate & Hours", "Cover Letter", "Review & Send"],
};

/**
 * Writing the proposal: where the talent is in the three steps, and that step — the pay (with the
 * trial's tasks to price, or on a revision to suggest changes to), the cover letter, or the proposal
 * as the Team Builder will read it. The wizard keeps the fields, the suggestions and the step.
 */
export function ProposalSteps({ wizard: w, trialTasks }: { wizard: Wizard; trialTasks: ReactNode }) {
  const { job, step, form, revise } = w;
  const { amount, hoursOk, startOk, suggesting, terms } = proposalTerms(job, form, revise, w.suggestions);
  const canContinue = [amount > 0 && hoursOk && startOk, form.letter.trim().length > 0, true][step];
  return (
    <>
      <div className="px-4 py-10">
        <Steps steps={STEPS[job.type]} current={step} />
      </div>

      {step === 0 && (
        <RateStep
          job={job}
          form={form}
          hoursOk={hoursOk}
          amount={amount}
          tasks={
            job.type === "trial" && (
              <div className="flex flex-col gap-2">
                <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">The trial&apos;s tasks</p>
                {suggesting ? <SuggestTasks tasks={job.tasks ?? []} weeks={planWeeks(durationDays(job.duration))} company={job.company} value={w.suggestions} onChange={w.setSuggestions} /> : trialTasks}
              </div>
            )
          }
          footer={<Footer onDraft={w.saveDraft} onBack={w.close} backLabel="Cancel" onNext={() => w.setStep(1)} nextLabel="Continue" nextDisabled={!canContinue} />}
        />
      )}

      {step === 1 && <LetterStep form={form} footer={<Footer onDraft={w.saveDraft} onBack={() => w.setStep(0)} backLabel="Previous" onNext={() => w.setStep(2)} nextLabel="Review & send" nextDisabled={!canContinue} />} />}

      {/* Review & send: the proposal exactly as the Team Builder will read it — the same body their
          Review proposal dialog shows, the job post it answers included. */}
      {step === 2 && <ReviewStep job={job} author={w.author} proposal={{ ...terms, version: (w.previous?.version ?? 0) + 1, sent: today() }} revise={revise} onBack={() => w.setStep(1)} onSubmit={() => w.submit(terms)} />}
    </>
  );
}

/** Step one: the monthly pay, on a part-time role the hours a week, and the day they'd start — with the trial's tasks above to price against. */
function RateStep({ job, form, hoursOk, amount, tasks, footer }: { job: JobView; form: ProposalFields; hoursOk: boolean; amount: number; tasks: ReactNode; footer: ReactNode }) {
  const { title, body } = rateCopy(job.type);
  return (
    <StepCard title={title} body={body}>
      {tasks}
      <div className="flex flex-col gap-4">
        <RateField job={job} rate={form.rate} onRate={form.setRate} amount={amount} />
        {job.type === "part-time" && <HoursField posted={job.hours} hours={form.hours} onHours={form.setHours} hoursOk={hoursOk} />}
        <StartField job={job} start={form.start} onStart={form.setStart} />
      </div>
      {footer}
    </StepCard>
  );
}

/** The monthly amount and how it's paid, with a nudge when it's nothing or outside the posted range. */
function RateField({ job, rate, onRate, amount }: { job: JobView; rate: string; onRate: (v: string) => void; amount: number }) {
  const { type } = job;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-lg border border-border px-4 text-[14px] tracking-[0.2px] focus-within:border-primary">
          <span className="text-ink-2">$</span>
          <input value={rate} onChange={(e) => onRate(e.target.value.replace(/[^0-9.,]/g, ""))} inputMode="decimal" placeholder="0.00" aria-label={type === "full-time" ? "Monthly salary" : "Monthly rate"} className="min-w-0 flex-1 outline-none placeholder:text-ink-2" />
        </label>
        <span className="w-[120px] text-ink-2">/ month</span>
      </div>
      {/* A trial is paid from escrow in monthly units — a weekly or hourly rate used to be funded as if it were monthly. */}
      <p className="text-[12px] leading-[1.4] text-ink-2">{type === "trial" ? "The whole trial is funded into escrow up front at this monthly rate, and released to you when it ends." : "Paid at the end of each month once you start. There's no escrow on an ongoing role."}</p>
      {rate.trim() !== "" && amount <= 0 && <p className="text-[12px] leading-[1.4] text-danger">Enter an amount above $0.</p>}
      {outsideRange(amount, job.budget) && <p className="text-[12px] leading-[1.4] text-warn">Outside the posted range ({job.budget}). You can still send it — say why in your cover letter.</p>}
    </div>
  );
}

/** A part-time role's hours a week, with the hours it was posted at. */
function HoursField({ posted, hours, onHours, hoursOk }: { posted: number | undefined; hours: string; onHours: (v: string) => void; hoursOk: boolean }) {
  return (
    <Field label="Hours a week" hint={posted ? `The role is posted at ${hoursLabel(posted)}.` : undefined} error={hours.trim() && !hoursOk ? "Enter whole hours between 1 and 40." : undefined}>
      <Input value={hours} onChange={(e) => onHours(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="!w-[160px]" />
    </Field>
  );
}

/**
 * IN-072 — the day they'd start: today or later. The offer carries it as agreed, and a trial's end
 * follows from its working days, so it says where that lands.
 */
function StartField({ job, start, onStart }: { job: JobView; start: string; onStart: (v: string) => void }) {
  const date = fromISODate(start);
  const days = durationDays(job.duration);
  const hint = job.type === "trial" && date ? `The trial runs ${days} working days from it, to ${dayLabel(addWorkingDays(date, days - 1))}.` : "The offer starts on it, as agreed here.";
  return (
    <Field label="Start date" hint={hint} error={start && !date ? "Pick the day you'd start." : undefined}>
      <DatePicker value={date} onChange={(d) => onStart(d ? isoDay(d) : "")} disabled={{ before: startOfToday() }} placeholder="Pick the day you'd start" aria-label={date ? `Start date: ${dayLabel(date)}` : "Start date"} />
    </Field>
  );
}

/** Step one's heading and line, for the kind of role. */
function rateCopy(type: JobType) {
  return {
    title: STEPS[type][0] === "Propose Rate" ? "Propose rate" : STEPS[type][0] === "Expected Salary" ? "Expected salary" : "Rate & hours",
    body: type === "trial" ? "Set your monthly rate for the trial's tasks, and the day you'd start. This is what the client sees when reviewing your proposal." : type === "full-time" ? "The monthly salary you're looking for, and the day you'd start. The offer carries them as agreed." : "Your monthly rate, the hours a week it covers, and the day you'd start.",
  };
}

/** Whether an amount above nothing falls outside the range the role was posted with. */
function outsideRange(amount: number, budget: string) {
  /** The posted range, as a nudge — the Team Builder can still accept anything. */
  const [lo, hi] = (budget.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Number(n.replace(/,/g, "")));
  return amount > 0 && lo !== undefined && hi !== undefined && (amount < lo || amount > hi);
}

/** Step two: the cover letter, and a link to work samples. */
function LetterStep({ form, footer }: { form: ProposalFields; footer: ReactNode }) {
  return (
    <StepCard title="Write cover letter" body="Tell the client why you're the right fit. Be specific about your experience and what you can deliver.">
      <div className="flex flex-col gap-4">
        <Field label="Cover letter">
          <Textarea rows={6} value={form.letter} onChange={(e) => form.setLetter(e.target.value)} placeholder="Why are you the right fit?" />
        </Field>
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
function ReviewStep({ job, author, proposal, revise, onBack, onSubmit }: { job: JobView; author: ProposalAuthor; proposal: DealProposal; revise: boolean; onBack: () => void; onSubmit: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <InfoBanner>This is how {job.company} will see your proposal.</InfoBanner>
      <ProposalBody
        viewer="independent"
        author={author}
        post={{ title: job.title, type: job.type, duration: job.duration, budget: job.budget, hours: job.hours, expectation: job.expectation, attachment: job.attachment, tasks: job.tasks }}
        proposal={proposal}
      />
      <div className="flex justify-end gap-2">
        <Button size="xl" onClick={onBack}>
          Previous
        </Button>
        <Button size="xl" variant="primary" onClick={onSubmit}>
          {revise ? "Send revised proposal" : "Submit proposal"}
        </Button>
      </div>
    </div>
  );
}

function StepCard({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-10 rounded-2xl p-10">
      <div className="flex flex-col gap-1 leading-[1.5]">
        <h3 className="text-[20px] font-semibold tracking-[0.4px] text-ink">{title}</h3>
        <p className="text-[16px] tracking-[0.2px] text-ink-2">{body}</p>
      </div>
      {children}
    </Card>
  );
}

function Footer({
  onDraft,
  onBack,
  backLabel,
  onNext,
  nextLabel,
  nextDisabled,
}: {
  onDraft: () => void;
  onBack: () => void;
  backLabel: string;
  onNext: () => void;
  nextLabel: string;
  nextDisabled: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-3">
      <Button size="lg" variant="ghost" className="!px-2" onClick={onDraft}>
        Save as draft
      </Button>
      <Button size="lg" onClick={onBack}>
        {backLabel}
      </Button>
      <Button size="lg" variant="primary" onClick={onNext} disabled={nextDisabled}>
        {nextLabel}
      </Button>
    </div>
  );
}
