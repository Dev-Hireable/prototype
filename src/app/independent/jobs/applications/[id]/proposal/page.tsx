"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, Card, Field, InfoBanner, Input, KeyValue, MatchPill, Modal, ObjectiveRow, Page, Select, Steps, Textarea } from "@/components/independent/ui";
import { ME, marketingSpecialist as job } from "@/lib/independent/data";
import { useDemo } from "@/lib/independent/store";

const STEPS = ["Add Objectives", "Propose Rate", "Cover Letter", "Review & Send"];
const Add = ICONS.add;
const X = ICONS.close;

/**
 * Figma "Proposals and offers / Add objectives → Propose rate → Cover letter → Review and send → Proposal sent · confirm" (+ Revise).
 * Frame: px 140, pt 40, pb 80, gap 40; every block 720 wide; the step card is p 40 / gap 40 / radius 16.
 */
export default function ProposalWizard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { applications, setStage } = useDemo();
  const app = applications.find((a) => a.id === id);
  if (!app) notFound();
  const router = useRouter();
  const search = useSearchParams();
  const revise = search.get("revise") === "1";
  const reviewOnly = search.get("review") === "1";
  const back = `/independent/jobs/applications/${app.id}`;

  const [step, setStep] = useState(0);
  const [objectives, setObjectives] = useState<string[]>(revise ? job.proposalObjectives : []);
  const [newObjective, setNewObjective] = useState("");
  const [rate, setRate] = useState(revise ? "1,500.00" : "");
  const [unit, setUnit] = useState("month");
  const [letter, setLetter] = useState(revise ? job.coverLetter : "");
  const [portfolio, setPortfolio] = useState("www.juandelacruz.com");
  const [sent, setSent] = useState(false);

  const addObjective = () => {
    if (!newObjective.trim()) return;
    setObjectives((o) => [...o, newObjective.trim()]);
    setNewObjective("");
  };
  const submit = () => setSent(true);
  const finish = () => {
    setStage(app.id, "proposal_sent", { label: "Proposal submitted", tone: "info", meta: revise ? "v2 · today" : "v1 · today" });
    router.push(back);
  };

  const canContinue = [objectives.length > 0, rate.trim().length > 0, letter.trim().length > 0, true][step];

  return (
    <Page title={revise ? "Revise proposal" : reviewOnly ? "Trial expectations" : "Submit proposal"} heading="modal" onClose={() => router.push(back)} padded={false}>
      <div className="mx-auto flex w-[720px] flex-col gap-10 pt-10 pb-20">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-[32px] leading-[1.5] font-semibold text-black" style={{ fontVariationSettings: '"opsz" 14' }}>
            {revise ? "Revise proposal" : "Proposal"} — {job.title}
          </h2>
          <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">
            {revise
              ? `${job.title} · Juan D. ${job.revision.version} · ${job.revision.date}`
              : "Understand what's expected, set clear objectives, and submit your proposed rate for the trial engagement and send proposal."}
          </p>
        </div>

        {revise && (
          <InfoBanner tone="warn">
            <span className="font-semibold">Revision requested to {job.revision.version}:</span> {job.revision.note}
          </InfoBanner>
        )}

        {!reviewOnly && (
          <div className="px-4 py-10">
            <Steps steps={STEPS} current={step} />
          </div>
        )}

        {!reviewOnly && step === 0 && (
          <StepCard title="Trial Objectives" body="This outlines the expected outcome a candidate should achieve within the trial period to demonstrate success in the role.">
            <div className="flex flex-col gap-4">
              {objectives.map((o, i) => (
                <ObjectiveRow
                  key={o + i}
                  index={i}
                  right={
                    <button type="button" aria-label="Remove objective" onClick={() => setObjectives((os) => os.filter((_, k) => k !== i))} className="text-ink-2">
                      <X size={16} aria-hidden />
                    </button>
                  }
                >
                  {o}
                </ObjectiveRow>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addObjective())}
                  placeholder="Describe an objective"
                />
                <Button variant="ghost" onClick={addObjective} disabled={!newObjective.trim()} className="shrink-0 !text-[16px]">
                  <Add size={14} aria-hidden /> Add objective
                </Button>
              </div>
            </div>
            <Footer onDraft={() => router.push(back)} onBack={() => router.push(back)} backLabel="Cancel" onNext={() => setStep(1)} nextLabel="Continue" nextDisabled={!canContinue} />
          </StepCard>
        )}

        {!reviewOnly && step === 1 && (
          <StepCard title="Propose rate" body="Set your expected compensation. This is what the client will see when reviewing your proposal.">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label className="flex h-11 flex-1 items-center gap-2 rounded-lg border border-border px-4 text-[14px] tracking-[0.2px] focus-within:border-primary">
                  <span className="text-ink-2">$</span>
                  <input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" placeholder="0.00" className="min-w-0 flex-1 outline-none placeholder:text-ink-2" />
                </label>
                <span className="text-ink-2">/</span>
                <Select options={["month", "week", "hour"]} value={unit} onChange={(e) => setUnit(e.target.value)} className="!w-[220px]" />
              </div>
              <p className="text-[12px] leading-[1.4] text-ink-2">Paid at the end of each calendar {unit}.</p>
            </div>
            <Footer onDraft={() => router.push(back)} onBack={() => setStep(0)} backLabel="Previous" onNext={() => setStep(2)} nextLabel="Continue" nextDisabled={!canContinue} />
          </StepCard>
        )}

        {!reviewOnly && step === 2 && (
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
            <Footer onDraft={() => router.push(back)} onBack={() => setStep(1)} backLabel="Previous" onNext={() => setStep(3)} nextLabel="Review & send" nextDisabled={!canContinue} />
          </StepCard>
        )}

        {!reviewOnly && step === 3 && (
          <div className="flex flex-col items-end gap-4">
            <Card className="flex w-full flex-col gap-2 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="relative size-11">
                    <Image src={ME.avatar} alt="" width={88} height={88} className="size-11 rounded-full bg-white object-cover outline -outline-offset-1 outline-border" />
                    <span className="absolute top-[34px] left-[34px] size-2 rounded-full bg-ok ring-2 ring-white" />
                  </span>
                  <div className="flex flex-col whitespace-nowrap">
                    <p className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px] text-ink">{ME.name}</p>
                    <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">{job.title}</p>
                  </div>
                </div>
                <MatchPill pct={app.match} />
              </div>
              <hr className="my-2 border-[#e5e5e5]" />
              <div className="flex gap-2">
                <KeyValue label="Rate" value={`$${rate}/${unit === "month" ? "mo" : unit}`} />
                <KeyValue label="Contract" value="Trial" />
                <KeyValue label="Duration" value="30 Days" />
              </div>
            </Card>
            <Card className="flex w-full flex-col gap-4 p-6 tracking-[0.2px] text-ink">
              <h3 className="text-[16px] leading-[1.5] font-semibold">Cover letter</h3>
              <p className="text-[14px] leading-[1.2] whitespace-pre-line">{letter}</p>
            </Card>
            <Card className="flex w-full flex-col gap-4 p-6">
              <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Objectives</h3>
              <div className="flex flex-col gap-2">
                {objectives.map((o, i) => (
                  <ObjectiveRow key={o + i} index={i}>
                    {o}
                  </ObjectiveRow>
                ))}
              </div>
            </Card>
            <div className="flex justify-end gap-2">
              <Button size="xl" onClick={() => router.push(back)}>
                Cancel
              </Button>
              <Button size="xl" variant="primary" onClick={submit}>
                {revise ? "Send revised proposal" : "Submit proposal"}
              </Button>
            </div>
          </div>
        )}

        <section className="flex flex-col gap-6 text-[14px] leading-[1.2] tracking-[0.2px]">
          <div className="flex flex-col gap-3 text-ink">
            <h3 className="font-semibold">Trial expectation</h3>
            <p>{job.expectation}</p>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-ink">Attachment</h3>
            <Link href={job.attachment} className="text-accent-ink" target="_blank">
              {job.attachment}
            </Link>
          </div>
          <dl className="flex flex-col gap-3 rounded-lg bg-surface-2 p-3 outline -outline-offset-1 outline-border">
            {[
              ["ROLE", <Link key="r" href={back} className="text-accent-ink underline">{job.summary.role}</Link>],
              ["CONTRACT TYPE", job.summary.contractType],
              ["BUDGET", job.summary.budget],
              ["DURATION", job.summary.duration],
            ].map(([k, v]) => (
              <div key={k as string} className="flex h-5 items-center justify-between">
                <dt className="font-semibold text-ink-2">{k}</dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {reviewOnly && (
            <div className="flex justify-end">
              <Button size="lg" variant="primary" onClick={() => router.push(`/independent/jobs/applications/${app.id}/proposal`)}>
                Start proposal
              </Button>
            </div>
          )}
        </section>
      </div>

      <Modal
        open={sent}
        onClose={finish}
        title="Proposal submitted"
        description={`${job.builder.contact} has been notified. Your proposal now shows as Proposal submitted in the pipeline.`}
        footer={
          <Button size="lg" variant="primary" onClick={finish}>
            Back to application
          </Button>
        }
      />
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
