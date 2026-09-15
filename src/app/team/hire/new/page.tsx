"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { MdAdd, MdAttachMoney, MdBorderColor, MdOutlineCalendarToday, MdRemove } from "react-icons/md";
import { ICONS } from "@/components/admin/icons";
import { Button, Card, Chip, InfoBanner, Input, JobBadge, LinkButton, Page, Select, Steps, Textarea } from "@/components/independent/ui";
import { useDemo } from "@/lib/team/store";
import type { Role } from "@/lib/team/data";

const Back = ICONS.chevronLeft;
const LEVELS = ["Select experience level", "Beginner (0–2 years)", "Intermediate (2–5 years)", "Advanced (5–8 years)", "Expert (8+ years)"];
const CHIP_TONES = ["text-ok", "text-primary", "text-[#e91e63]"];

/** Copy per path — Figma "Path A · Test Independents (trial)" and "Path B · Build Team (full-time)". */
const PATH = {
  trial: {
    title: "Create a Trial",
    intro: "See how you work together with a paid trial before committing full-time. Fund escrow after they accept, before the trial starts.",
    steps: ["Role Details", "Trial Expectations", "Budget & Duration", "Review", "Publish"],
    next: ["Next: Trial Expectations", "Add budget & duration", "Review job post"],
    descPlaceholder: "What will they be doing during this trial?",
    note: "Trial expectations are only shared with Independents you invite or match with, they won't appear on your public role listing",
    h2: "What should the Independent achieve during this trial?",
    field2: "Trial Expectations",
    ph2: "e.g. Build a working landing page using React, write 3 blog posts optimized for SEO, or conduct 5 user interviews and summarize key findings…",
    hint2: "Walk your Independent through your expectations in your own words.",
    h3: "Budget & Duration",
    sub3: "Set your monthly rate and trial length.",
    hint3: "Suggested rate ranged based on similar roles on our platform.",
    label3: "Trial Duration",
    chips: ["30 Days", "60 Days", "90 Days"],
    money: "Budget:",
    when: "Duration:",
    reviewTitle: "Review your trial role",
    reviewNote: "Your trial expectations are only shared with candidates you personally invite to apply — they won't be visible on your public job post.",
    publishedTitle: "Job post published",
    publishedBody: "Your job is now live. Next, review applicants and invite the best matches to a work trial.",
  },
  "full-time": {
    title: "Build a Team",
    intro: "Hire for a long-term role with defined responsibilities and room for growth. The contract starts once they accept your offer.",
    steps: ["Role Details", "Responsibilities", "Salary & Start", "Review", "Publish"],
    next: ["Next: Responsibilities", "Add salary & start date", "Review role"],
    descPlaceholder: "What will they be doing in this role?",
    note: "Responsibilities appear on your public role listing so candidates know what the job involves.",
    h2: "What will this person own in the role?",
    field2: "Responsibilities",
    ph2: "e.g. Own the outbound pipeline for our EU segment, run weekly reporting, and manage two SDRs…",
    hint2: "Walk candidates through the role in your own words.",
    h3: "Salary & Start",
    sub3: "Set the monthly salary and when they start.",
    hint3: "Suggested salary range based on similar roles on our platform.",
    label3: "Start date",
    chips: ["Immediately", "In 2 weeks", "In 1 month"],
    money: "Salary:",
    when: "Start date:",
    reviewTitle: "Review your full-time role",
    reviewNote: "Responsibilities appear on your public job post so candidates know what the role involves.",
    publishedTitle: "Role published",
    publishedBody: "Your role is now live. Next, review applicants and invite the best matches to interview.",
  },
} as const;

export default function CreateRoleWizardPage() {
  return (
    <Suspense>
      <CreateRoleWizard />
    </Suspense>
  );
}

/** Figma "Hire / Create job post · job details → trial expectations → budget and duration → review → published" and the "Build team" twin. */
function CreateRoleWizard() {
  const router = useRouter();
  const type = useSearchParams().get("type") === "full-time" ? "full-time" : "trial";
  const t = PATH[type];
  const { addRole } = useDemo();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [level, setLevel] = useState(LEVELS[0]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skill, setSkill] = useState("");
  const [hires, setHires] = useState(1);
  const [expectation, setExpectation] = useState("");
  const [attachment, setAttachment] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [chip, setChip] = useState(0);
  const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "new-role";
  const can = [title.trim().length > 1, expectation.trim().length > 0, min.length > 0 && max.length > 0][step] ?? true;
  const money = `$${min || "0"} – $${max || "0"} /month`;

  const addSkill = () => {
    const s = skill.trim();
    if (!s || skills.length >= 5 || skills.includes(s)) return;
    setSkills((all) => [...all, s]);
    setSkill("");
  };
  const publish = () => {
    const r: Role = {
      slug,
      title: title.trim(),
      type,
      status: "Active",
      candidates: 0,
      matched: 0,
      interviews: 0,
      offers: 0,
      hired: 0,
      updated: "Today",
      description: desc,
      budget: money,
      duration: type === "trial" ? t.chips[chip] : `Starts ${t.chips[chip].toLowerCase()}`,
      experience: level === LEVELS[0] ? "Any level" : level,
      skills,
      expectation,
      attachment,
    };
    addRole(r);
    setStep(4);
  };
  const back = () => (step === 0 ? router.push("/team/hire") : setStep(step - 1));

  if (step === 4)
    return (
      <Page title="Create Role" padded={false}>
        <div className="flex h-full flex-col items-center justify-center gap-6 px-10 py-20">
          <Image src="/team/published.png" alt="" width={282} height={280} className="h-[140px] w-[141px]" />
          <div className="flex w-[733px] flex-col items-center gap-10 px-10">
            <div className="flex w-[378px] flex-col items-center gap-2 text-center text-ink">
              <h2 className="font-display text-[32px] leading-[1.5] font-semibold" style={{ fontVariationSettings: '"opsz" 14' }}>
                {t.publishedTitle}
              </h2>
              <p className="text-[14px] leading-[1.2] tracking-[0.2px]">{t.publishedBody}</p>
            </div>
            <div className="flex gap-2">
              <LinkButton size="lg" href="/team">
                Back to dashboard
              </LinkButton>
              <LinkButton size="lg" variant="primary" href={`/team/hire/roles/${slug}`}>
                Track applicants
              </LinkButton>
            </div>
          </div>
        </div>
      </Page>
    );

  return (
    <Page title="Create Role" padded={false}>
      <div className="flex flex-col items-center gap-6 px-10 pt-4 pb-20">
        <div className="w-full">
          <button type="button" onClick={back} className="flex h-5 items-center gap-1 text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">
            <Back size={16} aria-hidden /> back to previous
          </button>
        </div>
        <div className="flex w-[720px] flex-col gap-2 tracking-[0.2px]">
          {step === 3 ? (
            <h2 className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px] text-ink">{t.reviewTitle}</h2>
          ) : (
            <h2 className="font-display text-[24px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
              {t.title}
            </h2>
          )}
          <p className="text-[14px] leading-[1.2] text-ink-2">{step === 3 ? "This is how your role will appear to Independents." : t.intro}</p>
        </div>
        <div className="w-[720px] px-4 py-10">
          <Steps steps={[...t.steps]} current={step} />
        </div>

        {/* Step 1 — Role Details */}
        {step === 0 && (
          <StepCard title="Role Details" body="This is what Independents will see when they receive your offer.">
            <div className="flex flex-col gap-6">
              <Block label="Role">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add e.g. Marketing Manager, Virtual Assistant" />
              </Block>
              <Block label="Role Description" helper={["Up to 500 characters", `${desc.length} / 500`]}>
                <Textarea value={desc} maxLength={500} onChange={(e) => setDesc(e.target.value)} placeholder={t.descPlaceholder} className="!h-[131px] resize-none" />
              </Block>
              <Block label="Skills" helper={["Select up to 5 skills", `${skills.length} / 5`]}>
                <Input value={skill} onChange={(e) => setSkill(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())} onBlur={addSkill} placeholder="Search skills" disabled={skills.length >= 5} />
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <Chip key={s} size="sm" onRemove={() => setSkills((all) => all.filter((x) => x !== s))}>
                        {s}
                      </Chip>
                    ))}
                  </div>
                )}
              </Block>
              <Block label="Experience Level">
                <Select options={[...LEVELS]} value={level} onChange={(e) => setLevel(e.target.value)} />
              </Block>
              <div className="flex flex-col gap-2">
                <p className="text-[16px] leading-6 font-bold text-[#111827]">How many to hire</p>
                <div className="flex h-11 w-max items-center overflow-hidden rounded-lg border border-border bg-white">
                  <button type="button" aria-label="Fewer" onClick={() => setHires((n) => Math.max(1, n - 1))} className="flex size-11 items-center justify-center text-ink">
                    <MdRemove size={18} aria-hidden />
                  </button>
                  <span className="flex h-11 w-16 items-center justify-center border-x border-border text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{hires}</span>
                  <button type="button" aria-label="More" onClick={() => setHires((n) => n + 1)} className="flex size-11 items-center justify-center text-ink">
                    <MdAdd size={18} aria-hidden />
                  </button>
                </div>
              </div>
            </div>
            <Cta next={t.next[0]} disabled={!can} onNext={() => setStep(1)} onDraft={() => router.push("/team/hire/roles")} />
          </StepCard>
        )}

        {/* Step 2 — Trial expectations / Responsibilities */}
        {step === 1 && (
          <>
            <div className="w-[720px]">
              <InfoBanner>{t.note}</InfoBanner>
            </div>
            <StepCard title={t.h2} body="List what you need done. Deliverables, tasks, or goals. The more specific, the better.">
              <div className="flex flex-col gap-10">
                <Block label={t.field2} helper={["Up to 500 characters", `${expectation.length} / 500`]}>
                  <Textarea value={expectation} maxLength={500} onChange={(e) => setExpectation(e.target.value)} placeholder={t.ph2} className="!h-[131px] resize-none" />
                </Block>
                <label className="flex flex-col gap-2">
                  <span className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Attachments (Optional)</span>
                  <Input value={attachment} onChange={(e) => setAttachment(e.target.value)} placeholder="Add a link to a Loom, Google Doc, YouTube video, or anything that helps." />
                  <span className="text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">{t.hint2}</span>
                </label>
              </div>
              <Cta next={t.next[1]} disabled={!can} onNext={() => setStep(2)} onDraft={() => router.push("/team/hire/roles")} />
            </StepCard>
          </>
        )}

        {/* Step 3 — Budget & Duration / Salary & Start */}
        {step === 2 && (
          <StepCard title={t.h3} body={t.sub3} bodySize={16}>
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-4">
                <div className="flex w-[533px] items-end gap-4">
                  <Money label="Minimum" value={min} onChange={setMin} />
                  <span aria-hidden className="mb-[22px] h-px w-6 bg-border" />
                  <Money label="Maximum" value={max} onChange={setMax} />
                  <span className="flex h-12 w-[51px] items-center justify-center text-[16px] leading-[1.5] tracking-[0.2px] text-ink">/month</span>
                </div>
                <p className="w-[533px] text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">{t.hint3}</p>
              </div>
              <div className="flex flex-col gap-6">
                <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{t.label3}</p>
                <div className="flex gap-4">
                  {t.chips.map((c, i) => (
                    <DateChip key={c} tone={CHIP_TONES[i]} selected={chip === i} onClick={() => setChip(i)}>
                      {c}
                    </DateChip>
                  ))}
                </div>
              </div>
            </div>
            <Cta next={t.next[2]} disabled={!can} onNext={() => setStep(3)} onDraft={() => router.push("/team/hire/roles")} />
          </StepCard>
        )}

        {/* Step 4 — Review */}
        {step === 3 && (
          <div className="flex w-[720px] flex-col gap-6">
            <InfoBanner>{t.reviewNote}</InfoBanner>
            <Card className="flex flex-col gap-10 rounded-2xl p-10">
              <div className="flex items-center gap-4">
                <h3 className="font-display text-[32px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
                  {title}
                </h3>
                <JobBadge type={type} />
              </div>
              <Line label={t.money} value={money} onEdit={() => setStep(2)} />
              <div className="flex flex-col gap-4">
                <Line label="Role Description" onEdit={() => setStep(0)} />
                <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink">{desc || "No description yet."}</p>
              </div>
              <div className="flex flex-col gap-4">
                <Line label="Skills" onEdit={() => setStep(0)} />
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <Chip key={s} size="sm">
                      {s}
                    </Chip>
                  ))}
                  {skills.length === 0 && <span className="text-[14px] text-ink-2">No skills added.</span>}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">{t.when}</span>
                <DateChip tone={CHIP_TONES[chip]} selected>
                  {t.chips[chip]}
                </DateChip>
                <EditButton onClick={() => setStep(2)} />
              </div>
              <Line label="Experience Level:" value={level === LEVELS[0] ? "Any level" : level} onEdit={() => setStep(0)} />
              <Line label="How many to hire:" value={String(hires)} onEdit={() => setStep(0)} />
            </Card>
            <Card className="flex flex-col gap-10 rounded-2xl p-10">
              <div className="flex flex-col gap-4">
                <Line label={t.field2} onEdit={() => setStep(1)} />
                <p className="min-h-[131px] rounded-lg border border-border px-4 py-4 text-[14px] leading-[1.2] tracking-[0.2px] text-ink">{expectation}</p>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Attachments</span>
                {attachment ? (
                  <Link href={attachment} target="_blank" className="flex h-11 items-center rounded-lg border border-border px-4 text-[14px] leading-[1.2] tracking-[0.2px] text-primary">
                    {attachment}
                  </Link>
                ) : (
                  <span className="flex h-11 items-center rounded-lg border border-border px-4 text-[14px] text-ink-2">None</span>
                )}
              </div>
            </Card>
            <div className="flex justify-end gap-3">
              <Button size="lg" className="!px-5" onClick={() => router.push("/team/hire/roles")}>
                Save as draft
              </Button>
              <Button size="lg" variant="primary" className="!px-5" onClick={publish}>
                Publish Role
              </Button>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}

/** Figma step "container": 720 wide, p 40, gap 40, radius 16, header 20/600 + 14 (or 16) secondary. */
function StepCard({ title, body, bodySize = 14, children }: { title: string; body: string; bodySize?: 14 | 16; children: React.ReactNode }) {
  return (
    <Card className="flex w-[720px] flex-col gap-10 rounded-2xl p-10">
      <div className="flex flex-col gap-1">
        <h3 className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px] text-ink">{title}</h3>
        <p className={`leading-[1.5] tracking-[0.2px] text-ink-2 ${bodySize === 16 ? "text-[16px]" : "text-[14px] leading-[1.2]"}`}>{body}</p>
      </div>
      {children}
    </Card>
  );
}

/** Field block: 16px semibold label, 16px gap, optional 12px helper row (left text · counter). */
function Block({ label, helper, children }: { label: string; helper?: [string, string]; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-4">
      <span className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">{label}</span>
      <span className="flex flex-col gap-2">
        {children}
        {helper && (
          <span className="flex justify-between text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
            <span>{helper[0]}</span>
            <span>{helper[1]}</span>
          </span>
        )}
      </span>
    </label>
  );
}

function Money({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-1 flex-col gap-2">
      <span className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{label}</span>
      <span className="relative block">
        <MdAttachMoney size={16} aria-hidden className="pointer-events-none absolute top-3.5 left-4 text-ink" />
        <Input value={value} onChange={(e) => onChange(e.target.value.replace(/[^0-9,.]/g, ""))} placeholder="0.00" inputMode="decimal" className="!pl-10" />
      </span>
    </label>
  );
}

/** Figma "Duration" chip: h 44, 0.5px border, calendar icon in the chip's colour. */
function DateChip({ children, tone, selected, onClick }: { children: React.ReactNode; tone: string; selected?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className={`flex h-11 items-center gap-2 rounded-lg border bg-white px-4 text-[14px] leading-[1.2] tracking-[0.2px] text-ink ${selected ? "border-[#a6a6a6]" : "border-border"}`}>
      <MdOutlineCalendarToday size={16} aria-hidden className={tone} /> {children}
    </button>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" aria-label="Edit" onClick={onClick} className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-ink hover:bg-surface-2">
      <MdBorderColor size={16} aria-hidden />
    </button>
  );
}

function Line({ label, value, onEdit }: { label: string; value?: string; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-2 text-[16px] leading-[1.5] tracking-[0.2px] whitespace-nowrap text-ink">
        <span className="font-semibold">{label}</span>
        {value && <span>{value}</span>}
      </span>
      <EditButton onClick={onEdit} />
    </div>
  );
}

function Cta({ next, disabled, onNext, onDraft }: { next: string; disabled: boolean; onNext: () => void; onDraft: () => void }) {
  return (
    <div className="flex items-center justify-end gap-3">
      <Button size="lg" className="!px-5" onClick={onDraft}>
        Save as draft
      </Button>
      <Button size="lg" variant="primary" className="!px-5" disabled={disabled} onClick={onNext}>
        {next}
      </Button>
    </div>
  );
}
