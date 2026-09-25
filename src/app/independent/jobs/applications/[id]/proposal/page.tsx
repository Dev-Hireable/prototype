"use client";

import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { Button, Card, Field, InfoBanner, Input, LinkButton, Modal, Page, Steps, Textarea, Toast, useToast } from "@/components/independent/ui";
import { TaskPlanList } from "@/components/portal/tasks/TaskPlan";
import { ProposalBody } from "@/components/portal/ProposalReview";
import { SuggestTasks } from "@/components/independent/SuggestTasks";
import type { TaskSuggestion } from "@/lib/demo/suggestions";
import { planWeeks } from "@/lib/demo/tasks";
import { durationDays, today } from "@/lib/demo/dates";
import { useDeal } from "@/lib/demo/deal";
import { rateAmount } from "@/lib/demo/disputes";
import { hoursLabel, startLabel } from "@/lib/demo/job-types";
import type { JobType } from "@/lib/demo/job-types";
import { useJobView } from "@/lib/independent/job-view";
import { useDemo } from "@/lib/independent/store";

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The steps, named for what the first one asks for on each kind of role. */
const STEPS: Record<JobType, string[]> = {
  trial: ["Propose Rate", "Cover Letter", "Review & Send"],
  "full-time": ["Expected Salary", "Cover Letter", "Review & Send"],
  "part-time": ["Rate & Hours", "Cover Letter", "Review & Send"],
};

/** A saved draft. Drafts saved while proposals still listed tasks keep them too; they're ignored. */
type Draft = { rate: string; letter: string; portfolio: string; hours?: string };
const draftKey = (roleSlug: string) => `hireable.demo.ind.proposalDraft.${roleSlug}`;
/** Portal pages render after hydration, so the draft can be read straight into the first render. */
function loadDraft(roleSlug: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(roleSlug));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

/**
 * Figma "Proposals and offers / Propose rate → Cover letter → Review and send → Proposal sent · confirm"
 * (+ Revise), IN-072. The Team Builder sets the work — a trial's tasks are in its job post, and every
 * role's go into the offer — so the proposal is the talent's terms and pitch for it: the trial's
 * tasks are shown alongside, read-only, to price against. Frame: px 140, pt 40, pb 80, gap 40; every
 * block 720 wide; the step card is p 40 / gap 40 / radius 16.
 */
export default function ProposalWizard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { applications, submitProposal, profile } = useDemo();
  const app = applications.find((a) => a.id === id);
  const deal = useDeal();
  const router = useRouter();
  const search = useSearchParams();
  const job = useJobView(app ?? { id, roleSlug: "", title: "", company: "", match: 0, submitted: "", stage: "applied" });
  const live = app && deal?.roleSlug === app.roleSlug ? deal : null;
  /** A revision starts from what was actually sent, with the Team Builder's note above it. */
  const previous = live?.proposal;
  const revisionNote = live?.revision;
  const revise = search.get("revise") === "1" && !!revisionNote;
  const reviewOnly = search.get("review") === "1";
  /** A saved draft wins over a blank form; a revision starts from the version that was sent. */
  const [initial] = useState<Draft | null>(() => (app ? loadDraft(app.roleSlug) : null));
  const seed: Draft | null = initial ?? (revise && previous ? { rate: String(rateAmount(previous.rate)), letter: previous.letter, portfolio: previous.portfolio ?? "", hours: previous.hours ? String(previous.hours) : undefined } : null);

  const [step, setStep] = useState(0);
  const [rate, setRate] = useState(seed?.rate ?? "");
  const [hours, setHours] = useState(seed?.hours ?? (job.hours ? String(job.hours) : "20"));
  const [letter, setLetter] = useState(seed?.letter ?? "");
  const [portfolio, setPortfolio] = useState(seed?.portfolio ?? profile.links.portfolio ?? "");
  const [sent, setSent] = useState(false);
  /** IN-073 — changes to the trial's tasks suggested with this revision; the company decides on each. */
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [toast, setToast] = useToast();
  if (!app) notFound();
  const back = `/independent/jobs/applications/${app.id}`;
  const type = job.type;
  const trial = type === "trial";
  const steps = STEPS[type];

  /**
   * IN-072 — a proposal answers a request. The wizard used to open at any stage by URL, and
   * submitting from it moved a signed — even ended — contract back to "Proposal submitted".
   */
  const open = app.stage === "proposal_requested";
  /** Pay is monthly on every kind of role — the trial's escrow, a salary, a part-time rate. */
  const amount = rateAmount(rate);
  const rateLabel = `${money(amount)}/mo`;
  const weekly = Number(hours);
  const hoursOk = type !== "part-time" || (Number.isInteger(weekly) && weekly >= 1 && weekly <= 40);
  /** The posted range, as a nudge — the Team Builder can still accept anything. */
  const [lo, hi] = (job.budget.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Number(n.replace(/,/g, "")));
  const outside = amount > 0 && lo !== undefined && hi !== undefined && (amount < lo || amount > hi);

  /** Saves where the talent got to; the draft comes back the next time the wizard opens. */
  const saveDraft = () => {
    try {
      localStorage.setItem(draftKey(app.roleSlug), JSON.stringify({ rate, letter, portfolio, hours } satisfies Draft));
    } catch {
      /* private mode — nothing to keep */
    }
    setToast("Draft saved — it's here when you come back");
  };
  /**
   * Saved the moment it is submitted, not when the confirmation closes — leaving any other way
   * used to drop it, and the Team Builder reviewed a sample proposal instead of this one.
   */
  const submit = () => {
    const ok = submitProposal(app.id, { rate: rateLabel, letter: letter.trim(), portfolio: portfolio.trim() || undefined, hours: type === "part-time" ? weekly : undefined, ...(suggesting && suggestions.length ? { suggestions } : {}) });
    if (!ok) return setToast("This proposal can't be sent — no proposal is requested right now");
    try {
      localStorage.removeItem(draftKey(app.roleSlug));
    } catch {
      /* ignore */
    }
    setSent(true);
  };
  const finish = () => router.push(back);

  const canContinue = [amount > 0 && hoursOk, letter.trim().length > 0, true][step];
  /** The role's terms, with the hours it was posted at. */
  const terms: [string, string][] = [
    ["Contract", job.contract],
    [trial ? "Duration" : "Start", trial ? job.duration : startLabel(job.duration)],
  ];
  const posted: [string, string][] = type === "part-time" && job.hours ? [...terms, ["Hours", hoursLabel(job.hours)]] : terms;
  /** The trial's tasks as its Team Builder set them — what the rate is for. */
  const trialTasks = trial ? <TaskPlanList tasks={job.tasks} empty={`${job.company} hasn't listed the trial's tasks yet — they're set in the offer.`} /> : null;
  /** IN-073 — a revision of a trial's proposal can push back on its tasks: suggest changes the company decides on. */
  const suggesting = revise && trial && !!job.tasks?.length;

  // Not once it has just been sent: the stage has moved on, and the confirmation belongs on top of the form.
  if (!reviewOnly && !open && !sent)
    return (
      <Page title="Submit proposal" heading="modal" onClose={() => router.push(back)} padded={false}>
        <div className="mx-auto flex w-[720px] flex-col gap-4 pt-10">
          <InfoBanner tone="warn">
            {app.stage === "proposal_sent"
              ? `Your proposal is with ${job.company} — you can revise it if they ask for changes.`
              : app.stage === "offer_received" || app.stage === "offer_accepted" || app.stage === "hired"
                ? `Your proposal has been answered with an offer, so there is nothing to submit here.`
                : `There is no proposal to submit right now — ${job.company} asks for one after the interview.`}
          </InfoBanner>
          <LinkButton size="lg" href={back} className="self-start">
            Back to application
          </LinkButton>
        </div>
      </Page>
    );

  return (
    <Page title={revise ? "Revise proposal" : reviewOnly ? (trial ? "Trial tasks" : "Role details") : "Submit proposal"} heading="modal" onClose={() => router.push(back)} padded={false}>
      <div className="mx-auto flex w-[720px] flex-col gap-10 pt-10 pb-20">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-[32px] leading-[1.5] font-semibold text-black" style={{ fontVariationSettings: '"opsz" 14' }}>
            {reviewOnly ? job.title : `${revise ? "Revise proposal" : "Proposal"} — ${job.title}`}
          </h2>
          <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">
            {revise
              ? `${job.title} · Proposal v${previous?.version ?? 1} · sent ${previous?.sent ?? ""}`
              : reviewOnly
                ? trial
                  ? `What ${job.company} wants done in the ${durationDays(job.duration)}-day trial. Your proposal names your rate for it.`
                  : `What the role involves. Your proposal names your ${type === "full-time" ? "expected salary" : "rate and hours"} for it.`
                : trial
                  ? `Read the trial's tasks, propose your monthly rate for them and send your proposal. ${job.company} sets the tasks; you work from them once the offer is signed.`
                  : `Name your ${type === "full-time" ? "expected salary" : "rate and hours"} and send your proposal for this ${job.contract.toLowerCase()} role. ${job.company} sets your first tasks in the offer.`}
          </p>
        </div>

        {revise && revisionNote && (
          <InfoBanner tone="warn">
            <span className="font-semibold">Revision requested to Proposal v{previous?.version ?? 1}:</span> {revisionNote.note}
          </InfoBanner>
        )}
        {!revise && live?.proposalRequest?.note && (
          <InfoBanner>
            <span className="font-semibold">Note from {job.company}:</span> {live.proposalRequest.note}
          </InfoBanner>
        )}
        {initial && !reviewOnly && <InfoBanner>Picked up from the draft you saved.</InfoBanner>}

        {!reviewOnly && (
          <div className="px-4 py-10">
            <Steps steps={steps} current={step} />
          </div>
        )}

        {!reviewOnly && step === 0 && (
          <StepCard
            title={steps[0] === "Propose Rate" ? "Propose rate" : steps[0] === "Expected Salary" ? "Expected salary" : "Rate & hours"}
            body={
              trial
                ? "Set your monthly rate for the trial's tasks. This is what the client sees when reviewing your proposal."
                : type === "full-time"
                  ? "The monthly salary you're looking for. The company sees it with your proposal and makes the offer."
                  : "Your monthly rate, and the hours a week it covers."
            }
          >
            {trial && (
              <div className="flex flex-col gap-2">
                <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">The trial&apos;s tasks</p>
                {suggesting ? <SuggestTasks tasks={job.tasks ?? []} weeks={planWeeks(durationDays(job.duration))} company={job.company} value={suggestions} onChange={setSuggestions} /> : trialTasks}
              </div>
            )}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label className="flex h-11 flex-1 items-center gap-2 rounded-lg border border-border px-4 text-[14px] tracking-[0.2px] focus-within:border-primary">
                    <span className="text-ink-2">$</span>
                    <input value={rate} onChange={(e) => setRate(e.target.value.replace(/[^0-9.,]/g, ""))} inputMode="decimal" placeholder="0.00" aria-label={type === "full-time" ? "Monthly salary" : "Monthly rate"} className="min-w-0 flex-1 outline-none placeholder:text-ink-2" />
                  </label>
                  <span className="w-[120px] text-ink-2">/ month</span>
                </div>
                {/* A trial is paid from escrow in monthly units — a weekly or hourly rate used to be funded as if it were monthly. */}
                <p className="text-[12px] leading-[1.4] text-ink-2">
                  {trial ? "The whole trial is funded into escrow up front at this monthly rate, and released to you when it ends." : "Paid at the end of each month once you start. There's no escrow on an ongoing role."}
                </p>
                {rate.trim() !== "" && amount <= 0 && <p className="text-[12px] leading-[1.4] text-danger">Enter an amount above $0.</p>}
                {outside && <p className="text-[12px] leading-[1.4] text-warn">Outside the posted range ({job.budget}). You can still send it — say why in your cover letter.</p>}
              </div>
              {type === "part-time" && (
                <Field label="Hours a week" hint={job.hours ? `The role is posted at ${hoursLabel(job.hours)}.` : undefined} error={hours.trim() && !hoursOk ? "Enter whole hours between 1 and 40." : undefined}>
                  <Input value={hours} onChange={(e) => setHours(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="!w-[160px]" />
                </Field>
              )}
            </div>
            <Footer onDraft={saveDraft} onBack={() => router.push(back)} backLabel="Cancel" onNext={() => setStep(1)} nextLabel="Continue" nextDisabled={!canContinue} />
          </StepCard>
        )}

        {!reviewOnly && step === 1 && (
          <StepCard title="Write cover letter" body="Tell the client why you're the right fit. Be specific about your experience and what you can deliver.">
            <div className="flex flex-col gap-4">
              <Field label="Cover letter">
                <Textarea rows={6} value={letter} onChange={(e) => setLetter(e.target.value)} placeholder="Why are you the right fit?" />
              </Field>
              <Field
                label={
                  <>
                    Portfolio / work samples <span className="font-normal text-ink-2">(optional)</span>
                  </>
                }
              >
                <Input value={portfolio} onChange={(e) => setPortfolio(e.target.value)} className="!text-primary" />
              </Field>
            </div>
            <Footer onDraft={saveDraft} onBack={() => setStep(0)} backLabel="Previous" onNext={() => setStep(2)} nextLabel="Review & send" nextDisabled={!canContinue} />
          </StepCard>
        )}

        {/* Review & send: the proposal exactly as the Team Builder will read it — the same body their
            Review proposal dialog shows, the job post it answers included. */}
        {!reviewOnly && step === 2 && (
          <div className="flex flex-col gap-6">
            <InfoBanner>This is how {job.company} will see your proposal.</InfoBanner>
            <ProposalBody
              viewer="independent"
              author={{ name: profile.name, avatar: profile.photo, role: profile.headline, match: app.match }}
              post={{ title: job.title, type, duration: job.duration, budget: job.budget, hours: job.hours, expectation: job.expectation, attachment: job.attachment, tasks: job.tasks }}
              proposal={{ version: (previous?.version ?? 0) + 1, sent: today(), rate: rateLabel, letter: letter.trim(), portfolio: portfolio.trim() || undefined, hours: type === "part-time" ? weekly : undefined, ...(suggesting && suggestions.length ? { suggestions } : {}) }}
            />
            <div className="flex justify-end gap-2">
              <Button size="xl" onClick={() => setStep(1)}>
                Previous
              </Button>
              <Button size="xl" variant="primary" onClick={submit}>
                {revise ? "Send revised proposal" : "Submit proposal"}
              </Button>
            </div>
          </div>
        )}

        {/* The job post, beside the steps that write the proposal (Review & send shows it inside the proposal). */}
        {(reviewOnly || step < 2) && (
        <section className="flex flex-col gap-6 text-[14px] leading-[1.2] tracking-[0.2px]">
          {trial ? (
            <>
              {/* Review mode is the trial's brief on its own; while proposing, the tasks already sit in the step above. */}
              {reviewOnly && (
                <div className="flex flex-col gap-3 text-ink">
                  <h3 className="font-semibold">Trial tasks</h3>
                  {trialTasks}
                </div>
              )}
              {job.expectation && (
                <div className="flex flex-col gap-3 text-ink">
                  <h3 className="font-semibold">Notes from {job.company}</h3>
                  <p className="leading-[1.4] whitespace-pre-line">{job.expectation}</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-3 text-ink">
              <h3 className="font-semibold">About the role</h3>
              <p className="leading-[1.4] whitespace-pre-line">{job.expectation || job.description || "No description was added to this role."}</p>
            </div>
          )}
          {job.attachment && (
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-ink">Attachment</h3>
              <Link href={job.attachment} className="text-accent-ink" target="_blank">
                {job.attachment}
              </Link>
            </div>
          )}
          <dl className="flex flex-col gap-3 rounded-lg bg-surface-2 p-3 outline -outline-offset-1 outline-border">
            {[
              [
                "ROLE",
                <Link key="r" href={back} className="text-accent-ink underline">
                  {job.title}
                </Link>,
              ],
              ["BUDGET", job.budget],
              ...posted.map(([k, v]) => [k.toUpperCase(), v]),
            ].map(([k, v]) => (
              <div key={k as string} className="flex h-5 items-center justify-between">
                <dt className="font-semibold text-ink-2">{k}</dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {reviewOnly && open && (
            <div className="flex justify-end">
              <Button size="lg" variant="primary" onClick={() => router.push(`/independent/jobs/applications/${app.id}/proposal`)}>
                Start proposal
              </Button>
            </div>
          )}
        </section>
        )}
      </div>

      <Modal
        open={sent}
        onClose={finish}
        title="Proposal submitted"
        description={`${job.company} has been notified. Your proposal now shows as Proposal submitted in the pipeline.`}
        footer={
          <Button size="lg" variant="primary" onClick={finish}>
            Back to application
          </Button>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** Figma "container": p 40, gap 40, radius 16, 1px #c3c3c3. */
function StepCard({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
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
