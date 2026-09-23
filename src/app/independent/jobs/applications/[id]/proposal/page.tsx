"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, Card, Chip, Field, InfoBanner, Input, KeyValue, LinkButton, MatchPill, Modal, ObjectiveRow, Page, Select, Steps, Textarea, Toast, useToast } from "@/components/independent/ui";
import { kindIndex } from "@/components/team/ObjectiveViews";
import { useDeal } from "@/lib/demo/deal";
import type { ObjectiveKind, ProposedObjective } from "@/lib/demo/deal";
import { rateAmount } from "@/lib/demo/disputes";
import { useJobView } from "@/lib/independent/job-view";
import { useDemo } from "@/lib/independent/store";
import { OBJECTIVE_KIND } from "@/lib/team/data";

const STEPS = ["Add Objectives", "Propose Rate", "Cover Letter", "Review & Send"];
const Add = ICONS.add;
const X = ICONS.close;
const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The three types, in the words the talent picks between. */
const TYPES: { label: string; kind: ObjectiveKind; hint: string }[] = [
  { label: "Default — done or not done", kind: "task", hint: "You mark it done when the work is delivered; the Team Builder approves it." },
  { label: "Manual — a number against a target", kind: "kpi", hint: "You log the value as you go; progress is the value against the target." },
  { label: "Automatic — driven by key results", kind: "okr", hint: "Progress is the share of its key results done; the last one sends it for approval." },
];

type Draft = { objectives: ProposedObjective[]; rate: string; letter: string; portfolio: string };
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

/** A proposed objective in one line: its type and what it is measured by. */
const detailOf = (o: ProposedObjective) => (o.kind === "kpi" && o.target ? `Target ${o.target} ${o.unit ?? ""}`.trim() : o.kind === "okr" && o.keyResults?.length ? `${o.keyResults.length} key ${o.keyResults.length === 1 ? "result" : "results"}` : "");

/**
 * Figma "Proposals and offers / Add objectives → Propose rate → Cover letter → Review and send → Proposal sent · confirm" (+ Revise).
 * Frame: px 140, pt 40, pb 80, gap 40; every block 720 wide; the step card is p 40 / gap 40 / radius 16.
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
  const seed: Draft | null = initial ?? (revise && previous ? { objectives: previous.objectives, rate: String(rateAmount(previous.rate)), letter: previous.letter, portfolio: previous.portfolio ?? "" } : null);

  const [step, setStep] = useState(0);
  const [objectives, setObjectives] = useState<ProposedObjective[]>(seed?.objectives ?? []);
  const [composer, setComposer] = useState({ title: "", type: TYPES[0].label, target: "", unit: "", kr: "", keyResults: [] as string[] });
  const [rate, setRate] = useState(seed?.rate ?? "");
  const [letter, setLetter] = useState(seed?.letter ?? "");
  const [portfolio, setPortfolio] = useState(seed?.portfolio ?? profile.links.portfolio ?? "");
  const [sent, setSent] = useState(false);
  const [toast, setToast] = useToast();
  if (!app) notFound();
  const back = `/independent/jobs/applications/${app.id}`;

  /**
   * IN-072 — a proposal answers a request. The wizard used to open at any stage by URL, and
   * submitting from it moved a signed — even ended — contract back to "Proposal submitted".
   */
  const open = app.stage === "proposal_requested";
  const kind = TYPES.find((t) => t.label === composer.type)?.kind ?? "task";
  const composerReady = composer.title.trim().length > 1 && (kind === "kpi" ? Number(composer.target) > 0 && !!composer.unit.trim() : kind === "okr" ? composer.keyResults.length > 0 : true);
  const addObjective = () => {
    if (!composerReady) return;
    setObjectives((os) => [
      ...os,
      { title: composer.title.trim(), kind, target: kind === "kpi" ? Number(composer.target) : undefined, unit: kind === "kpi" ? composer.unit.trim() : undefined, keyResults: kind === "okr" ? composer.keyResults : undefined },
    ]);
    setComposer({ title: "", type: composer.type, target: "", unit: "", kr: "", keyResults: [] });
  };
  const addKeyResult = () => {
    if (!composer.kr.trim()) return;
    setComposer((c) => ({ ...c, keyResults: [...c.keyResults, c.kr.trim()], kr: "" }));
  };
  /** Trial pay is monthly — the rate, the escrow and the offer are all per month. */
  const amount = rateAmount(rate);
  const rateLabel = `${money(amount)}/mo`;
  /** The posted range, as a nudge — the Team Builder can still accept anything. */
  const [lo, hi] = (job.budget.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Number(n.replace(/,/g, "")));
  const outside = amount > 0 && lo !== undefined && hi !== undefined && (amount < lo || amount > hi);

  /** Saves where the talent got to; the draft comes back the next time the wizard opens. */
  const saveDraft = () => {
    try {
      localStorage.setItem(draftKey(app.roleSlug), JSON.stringify({ objectives, rate, letter, portfolio } satisfies Draft));
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
    const ok = submitProposal(app.id, { rate: rateLabel, letter: letter.trim(), portfolio: portfolio.trim() || undefined, objectives });
    if (!ok) return setToast("This proposal can't be sent — no proposal is requested right now");
    try {
      localStorage.removeItem(draftKey(app.roleSlug));
    } catch {
      /* ignore */
    }
    setSent(true);
  };
  const finish = () => router.push(back);

  const canContinue = [objectives.length > 0, amount > 0, letter.trim().length > 0, true][step];

  if (!reviewOnly && !open)
    return (
      <Page title="Submit proposal" heading="modal" onClose={() => router.push(back)} padded={false}>
        <div className="mx-auto flex w-[720px] flex-col gap-4 pt-10">
          <InfoBanner tone="warn">
            {app.stage === "proposal_sent"
              ? `Your proposal is with ${job.company}. You can revise it if they ask for changes.`
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
    <Page title={revise ? "Revise proposal" : reviewOnly ? "Trial expectations" : "Submit proposal"} heading="modal" onClose={() => router.push(back)} padded={false}>
      <div className="mx-auto flex w-[720px] flex-col gap-10 pt-10 pb-20">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-[32px] leading-[1.5] font-semibold text-black" style={{ fontVariationSettings: '"opsz" 14' }}>
            {revise ? "Revise proposal" : "Proposal"} — {job.title}
          </h2>
          <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">
            {revise
              ? `${job.title} · Proposal v${previous?.version ?? 1} · sent ${previous?.sent ?? ""}`
              : "Understand what's expected, set clear objectives, and submit your proposed rate for the trial engagement and send proposal."}
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
            <Steps steps={STEPS} current={step} />
          </div>
        )}

        {!reviewOnly && step === 0 && (
          <StepCard title="Trial Objectives" body="This outlines the expected outcome a candidate should achieve within the trial period to demonstrate success in the role.">
            <div className="flex flex-col gap-4">
              {objectives.map((o, i) => (
                <ObjectiveRow
                  key={o.title + i}
                  index={kindIndex(o.kind)}
                  right={
                    <span className="flex items-center gap-2">
                      <Chip size="sm">{OBJECTIVE_KIND[o.kind]}</Chip>
                      {detailOf(o) && <span className="text-[12px] whitespace-nowrap text-ink-2">{detailOf(o)}</span>}
                      <button type="button" aria-label="Remove objective" onClick={() => setObjectives((os) => os.filter((_, k) => k !== i))} className="text-ink-2">
                        <X size={16} aria-hidden />
                      </button>
                    </span>
                  }
                >
                  {o.title}
                </ObjectiveRow>
              ))}

              {/* IN-072 — the talent says how each objective is measured; the type used to be assigned
                  by position, so every proposal's first objective was an Automatic one that no one
                  could ever complete. */}
              <div className="flex flex-col gap-3 rounded-lg bg-surface-2 p-4">
                <Input value={composer.title} onChange={(e) => setComposer((c) => ({ ...c, title: e.target.value }))} placeholder="Describe an objective" />
                <Select options={TYPES.map((t) => t.label)} value={composer.type} onChange={(e) => setComposer((c) => ({ ...c, type: e.target.value }))} />
                <p className="text-[12px] leading-[1.4] text-ink-2">{TYPES.find((t) => t.kind === kind)?.hint}</p>
                {kind === "kpi" && (
                  <div className="flex gap-3">
                    <Field label="Target" className="flex-1">
                      <Input value={composer.target} inputMode="numeric" onChange={(e) => setComposer((c) => ({ ...c, target: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="10" />
                    </Field>
                    <Field label="Counted in" className="flex-1">
                      <Input value={composer.unit} onChange={(e) => setComposer((c) => ({ ...c, unit: e.target.value }))} placeholder="e.g. demos" />
                    </Field>
                  </div>
                )}
                {kind === "okr" && (
                  <div className="flex flex-col gap-2">
                    {composer.keyResults.map((kr, i) => (
                      <span key={`${kr}-${i}`} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[14px] leading-[1.3] text-ink">
                        <span className="min-w-0 flex-1">{kr}</span>
                        <button type="button" aria-label={`Remove ${kr}`} onClick={() => setComposer((c) => ({ ...c, keyResults: c.keyResults.filter((_, k) => k !== i) }))} className="text-ink-2">
                          <X size={14} aria-hidden />
                        </button>
                      </span>
                    ))}
                    <div className="flex gap-2">
                      <Input value={composer.kr} onChange={(e) => setComposer((c) => ({ ...c, kr: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyResult())} placeholder="Add a key result" />
                      <Button onClick={addKeyResult} disabled={!composer.kr.trim()}>
                        Add
                      </Button>
                    </div>
                  </div>
                )}
                <Button variant="ghost" onClick={addObjective} disabled={!composerReady} className="self-start !text-[16px]">
                  <Add size={14} aria-hidden /> Add objective
                </Button>
              </div>
            </div>
            <Footer onDraft={saveDraft} onBack={() => router.push(back)} backLabel="Cancel" onNext={() => setStep(1)} nextLabel="Continue" nextDisabled={!canContinue} />
          </StepCard>
        )}

        {!reviewOnly && step === 1 && (
          <StepCard title="Propose rate" body="Set your expected monthly rate. This is what the client will see when reviewing your proposal.">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label className="flex h-11 flex-1 items-center gap-2 rounded-lg border border-border px-4 text-[14px] tracking-[0.2px] focus-within:border-primary">
                  <span className="text-ink-2">$</span>
                  <input value={rate} onChange={(e) => setRate(e.target.value.replace(/[^0-9.,]/g, ""))} inputMode="decimal" placeholder="0.00" className="min-w-0 flex-1 outline-none placeholder:text-ink-2" />
                </label>
                <span className="w-[120px] text-ink-2">/ month</span>
              </div>
              {/* A trial is paid from escrow in monthly units — a weekly or hourly rate used to be funded as if it were monthly. */}
              <p className="text-[12px] leading-[1.4] text-ink-2">The whole trial is funded into escrow up front at this monthly rate, and released to you when it ends.</p>
              {rate.trim() !== "" && amount <= 0 && <p className="text-[12px] leading-[1.4] text-danger">Enter a rate above $0.</p>}
              {outside && <p className="text-[12px] leading-[1.4] text-warn">Outside the posted range ({job.budget}). You can still send it — say why in your cover letter.</p>}
            </div>
            <Footer onDraft={saveDraft} onBack={() => setStep(0)} backLabel="Previous" onNext={() => setStep(2)} nextLabel="Continue" nextDisabled={!canContinue} />
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
            <Footer onDraft={saveDraft} onBack={() => setStep(1)} backLabel="Previous" onNext={() => setStep(3)} nextLabel="Review & send" nextDisabled={!canContinue} />
          </StepCard>
        )}

        {!reviewOnly && step === 3 && (
          <div className="flex flex-col items-end gap-4">
            <Card className="flex w-full flex-col gap-2 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="relative size-11">
                    <Image src={profile.photo} alt="" width={88} height={88} className="size-11 rounded-full bg-white object-cover outline -outline-offset-1 outline-border" />
                    <span className="absolute top-[34px] left-[34px] size-2 rounded-full bg-ok ring-2 ring-white" />
                  </span>
                  <div className="flex flex-col whitespace-nowrap">
                    <p className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px] text-ink">{profile.name}</p>
                    <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">{profile.headline}</p>
                  </div>
                </div>
                <MatchPill pct={app.match} />
              </div>
              <hr className="my-2 border-[#e5e5e5]" />
              <div className="flex gap-2">
                <KeyValue label="Rate" value={rateLabel} />
                <KeyValue label="Contract" value={job.contract} />
                <KeyValue label="Duration" value={job.duration} />
              </div>
            </Card>
            <Card className="flex w-full flex-col gap-4 p-6 tracking-[0.2px] text-ink">
              <h3 className="text-[16px] leading-[1.5] font-semibold">Cover letter</h3>
              <p className="text-[14px] leading-[1.2] whitespace-pre-line">{letter}</p>
              {portfolio.trim() && <p className="text-[13px] text-ink-2">Portfolio: {portfolio.trim()}</p>}
            </Card>
            <Card className="flex w-full flex-col gap-4 p-6">
              <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Objectives</h3>
              <div className="flex flex-col gap-2">
                {objectives.map((o, i) => (
                  <ObjectiveRow key={o.title + i} index={kindIndex(o.kind)} right={<span className="text-[12px] whitespace-nowrap text-ink-2">{[OBJECTIVE_KIND[o.kind], detailOf(o)].filter(Boolean).join(" · ")}</span>}>
                    {o.title}
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
            <p className="whitespace-pre-line">{job.expectation || "No trial expectation was added to this role."}</p>
          </div>
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
              ["ROLE", <Link key="r" href={back} className="text-accent-ink underline">{job.title}</Link>],
              ["CONTRACT TYPE", job.contract],
              ["BUDGET", job.budget],
              ["DURATION", job.duration],
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
