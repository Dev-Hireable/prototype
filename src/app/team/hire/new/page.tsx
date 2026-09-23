"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useState } from "react";
import { MdAdd, MdAttachMoney, MdBorderColor, MdOutlineCalendarToday, MdOutlineLibraryBooks, MdRemove } from "react-icons/md";
import { Button, Card, Chip, InfoBanner, Input, JobBadge, LinkButton, Modal, Page, Select, Steps, Textarea } from "@/components/independent/ui";
import { BreadcrumbBack } from "@/components/portal/nav";
import { SkillPicker } from "@/components/portal/controls";
import { Tip } from "@/components/portal/Tip";
import { RateSourceModal, TemplateBrowser, TemplateSuggestions } from "@/components/team/RoleTemplates";
import { GENERAL_SKILLS } from "@/lib/portal/skills";
import { LEVELS, levelName, suggestRange } from "@/lib/team/role-templates";
import type { RoleTemplate } from "@/lib/team/role-templates";
import { useDemo } from "@/lib/team/store";
import { today } from "@/lib/demo/dates";
import type { Role } from "@/lib/team/data";

const CHIP_TONES = ["text-ok", "text-primary", "text-[#e91e63]"];

/** TB-024 "Exclusive Benefits" — optional, full-time only, each with its own monthly amount. */
const BENEFITS = ["Health Insurance Coverage", "Government Contribution Coverage", "Internet Allowance", "Learning & Development Allowance"] as const;
const BENEFITS_DISCLAIMER =
  "Exclusive benefits apply to full-time hired freelancers only. These benefits are reimbursable, proof of payment (receipts) must be submitted to receive reimbursement.";

/** Every field the wizard edits — what Review's Edit → Cancel restores. */
type Snapshot = {
  title: string;
  desc: string;
  level: string;
  skills: string[];
  hires: number;
  expectation: string;
  attachment: string;
  min: string;
  max: string;
  chip: number;
  benefits: Record<string, string>;
};

type ReviewSection = "title" | "budget" | "description" | "skills" | "duration" | "experience" | "hires" | "expectations" | "benefits";

/** Copy per path — Figma "Path A · Test Independents (trial)" and "Path B · Build Team (full-time)". */
const PATH = {
  trial: {
    title: "Create a Trial",
    intro: "See how you work together with a paid trial before committing full-time. Fund escrow after they accept, before the trial starts.",
    steps: ["Role Details", "Trial Expectations", "Budget & Duration", "Review", "Publish"],
    /** Which card each step slot renders — the two paths don't share an order (TB-024 / TB-025). */
    sequence: ["details", "expectations", "budget", "review", "published"],
    next: ["Next: Trial Expectations", "Add budget & duration", "Review job post"],
    descPlaceholder: "What will they be doing during this trial?",
    note: "Trial expectations are only shared with Independents you invite or match with, they won't appear on your public role listing",
    h2: "What should the Independent achieve during this trial?",
    field2: "Trial Expectations",
    ph2: "e.g. Build a working landing page using React, write 3 blog posts optimized for SEO, or conduct 5 user interviews and summarize key findings…",
    hint2: "Walk your Independent through your expectations in your own words.",
    h3: "Budget & Duration",
    sub3: "Set your monthly rate and trial length.",
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
    title: "Build Team",
    intro: "Hire for a long-term role with defined responsibilities, strong collaboration, and room for growth.",
    steps: ["Job Details", "Budget", "Exclusive Benefits", "Review", "Published"],
    sequence: ["details", "budget", "benefits", "review", "published"],
    next: ["Add budget", "Add benefits", "Review job post"],
    descPlaceholder: "What will they be doing in this role?",
    note: "Responsibilities appear on your public role listing so candidates know what the job involves.",
    h2: "What will this person own in the role?",
    field2: "Responsibilities",
    ph2: "e.g. Own the outbound pipeline for our EU segment, run weekly reporting, and manage two SDRs…",
    hint2: "Walk candidates through the role in your own words.",
    h3: "Salary & Start",
    sub3: "Set the monthly salary and when they start.",
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

/** Whether a saved draft has enough to publish — the same bar the Next buttons enforce. */
export function draftReady(r: Role) {
  const hasBudget = /[1-9]/.test(r.budget);
  const base = r.title.trim().length > 1 && r.description.trim().length > 0 && r.skills.length > 0 && r.experience !== "Any level" && hasBudget;
  return r.type === "trial" ? base && r.expectation.trim().length > 0 : base;
}

/** First step slot whose required fields aren't filled yet — "where they left off" (TB-035). */
function resumeStep(r: Role, sequence: readonly string[]) {
  const done: Record<string, boolean> = {
    details: r.title.trim().length > 1 && r.description.trim().length > 0 && r.skills.length > 0 && r.experience !== "Any level",
    expectations: r.expectation.trim().length > 0,
    budget: /[1-9]/.test(r.budget),
    benefits: true,
  };
  const at = sequence.findIndex((k) => done[k] === false);
  return at === -1 ? sequence.indexOf("review") : at;
}

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
  const search = useSearchParams();
  const editSlug = search.get("edit");
  const { addRole, roles, canPublish, cards } = useDemo();
  const editing = editSlug ? roles.find((r) => r.slug === editSlug) : undefined;
  // An edited draft carries its own type; the query param only matters for a brand new post.
  const type = (editing?.type ?? (search.get("type") === "full-time" ? "full-time" : "trial")) as "trial" | "full-time";
  const t = PATH[type];
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [level, setLevel] = useState(LEVELS[0]);
  const [skills, setSkills] = useState<string[]>([]);
  const [hires, setHires] = useState(1);
  const [expectation, setExpectation] = useState("");
  const [attachment, setAttachment] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [chip, setChip] = useState(0);
  /** Benefit label → monthly amount; absent means the checkbox is off. */
  const [benefits, setBenefits] = useState<Record<string, string>>({});
  /**
   * Review edits in place: the one section being edited, and the values from before it opened so
   * Cancel can put them back. The fields write straight to the wizard state, so Save just closes.
   */
  const [open, setOpen] = useState<{ section: ReviewSection; before: Snapshot } | null>(null);
  /**
   * Role templates: the one filling the form, one waiting on "replace what you typed?" (or
   * "blank" for Start from scratch), and whether the full library is open.
   */
  const [template, setTemplate] = useState<RoleTemplate | null>(null);
  const [pending, setPending] = useState<RoleTemplate | "blank" | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  /**
   * Keep the draft's slug when editing, so publishing replaces it instead of leaving it behind. A
   * new role gets a slug no other role has — two roles with the same title used to share one, and
   * publishing the second silently replaced the first. Frozen once published, for the links after.
   */
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const base = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "new-role";
  let fresh = base;
  for (let n = 2; roles.some((r) => r.slug === fresh); n++) fresh = `${base}-${n}`;
  const slug = publishedSlug ?? editing?.slug ?? fresh;

  /**
   * TB-035 — open a draft with everything it already had. Drafts persist in localStorage, which
   * hydrates after mount, so this fills in when the role turns up rather than at first render.
   * A duplicated draft lands straight on Review (every field is already populated); one built
   * from scratch resumes at the first step still missing something.
   */
  const [prefilled, setPrefilled] = useState(false);
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    if (!editing || prefilled) return;
    setPrefilled(true);
    setTitle(editing.title);
    setDesc(editing.description);
    setLevel(LEVELS.includes(editing.experience) ? editing.experience : LEVELS[0]);
    setSkills(editing.skills);
    setExpectation(editing.expectation);
    setAttachment(editing.attachment);
    setHires(editing.hires ?? 1);
    // "$1,500.00 - $3,500.00 /mo" → 1500 / 3500. Split on the dash first, then take the whole
    // part of each side; stripping punctuation up front turned "1,500.00" into "1 500 00".
    const [lo, hi] = editing.budget.split(/[–-]/);
    const whole = (s?: string) => (s?.match(/[\d,]+/)?.[0] ?? "").replace(/,/g, "");
    setMin(settleMoney(whole(lo)));
    setMax(settleMoney(whole(hi)));
    setBenefits(Object.fromEntries((editing.benefits ?? []).map((b) => [b.label, b.amount])));
    const reviewStep = t.sequence.indexOf("review");
    setStep(editing.duplicatedFrom ? reviewStep : resumeStep(editing, t.sequence));
  }, [editing, prefilled, t.sequence]);
  /**
   * TB-024 / TB-025 — Next stays disabled until every required field on the step is filled.
   * Step 1 asks for role, description, at least one skill, an experience level and a headcount,
   * not just the title.
   */
  const detailsDone = title.trim().length > 1 && desc.trim().length > 0 && skills.length > 0 && level !== LEVELS[0] && hires >= 1;
  const money = `$${min || "0"} – $${max || "0"} /month`;
  /** Which card this slot shows — the two paths order their steps differently. */
  const kind = t.sequence[step];
  // Keyed off the card, not the slot index: budget is step 2 on one path and step 3 on the other.
  const amount = (v: string) => Number(v.replace(/,/g, ""));
  /** Both amounts filled, and the range isn't upside down. */
  const budgetOk = min.length > 0 && max.length > 0 && amount(min) <= amount(max);
  const rangeError = min && max && amount(min) > amount(max) ? "Minimum can't be more than the maximum." : null;
  const can = kind === "details" ? detailsDone : kind === "expectations" ? expectation.trim().length > 0 : kind === "budget" ? budgetOk : true;

  const roleFrom = (status: Role["status"]): Role => {
    return {
      slug,
      title: title.trim() || "Untitled role",
      type,
      status,
      candidates: 0,
      matched: 0,
      interviews: 0,
      offers: 0,
      hired: 0,
      updated: today(),
      description: desc,
      budget: money,
      duration: type === "trial" ? t.chips[chip] : `Starts ${t.chips[chip].toLowerCase()}`,
      experience: level === LEVELS[0] ? "Any level" : level,
      skills,
      expectation,
      attachment,
      hires,
      benefits: Object.entries(benefits).map(([label, amount]) => ({ label, amount: amount || "0" })),
    };
  };
  const publish = () => {
    if (!canPublish) return;
    const role = roleFrom("Active");
    addRole(role);
    setPublishedSlug(role.slug);
    setStep(4);
  };
  /**
   * TB-030 — Save as draft used to navigate away and keep nothing: the role was gone. It now
   * writes what has been filled in so far, so the draft can be reopened and finished.
   */
  const saveDraft = () => {
    addRole(roleFrom("Draft"));
    router.push("/team/hire/roles");
  };
  const snapshot = (): Snapshot => ({ title, desc, level, skills, hires, expectation, attachment, min, max, chip, benefits });
  const restore = (v: Snapshot) => {
    setTitle(v.title);
    setDesc(v.desc);
    setLevel(v.level);
    setSkills(v.skills);
    setHires(v.hires);
    setExpectation(v.expectation);
    setAttachment(v.attachment);
    setMin(v.min);
    setMax(v.max);
    setChip(v.chip);
    setBenefits(v.benefits);
  };
  /**
   * What a template writes, in the form's own shape. The trial path also takes the expectations
   * and trial length; the full-time path has neither step, so those stay as they are.
   */
  const fieldsFrom = (tpl: RoleTemplate) => ({
    title: tpl.title,
    desc: tpl.description,
    skills: tpl.skills.join("|"),
    level: tpl.level,
    expectation: type === "trial" ? tpl.trial : expectation,
    min: settleMoney(String(tpl.budget.min)),
    max: settleMoney(String(tpl.budget.max)),
    chip: type === "trial" ? Math.max(0, (t.chips as readonly string[]).indexOf(`${tpl.days} Days`)) : chip,
  });
  /** Everything a template would replace, other than the title, is still empty. */
  const onlyTitle = !desc.trim() && skills.length === 0 && level === LEVELS[0] && !expectation.trim() && !min && !max;
  const blank = onlyTitle && !title.trim();
  /** Nothing changed since the template went in, so switching or clearing can't lose anyone's typing. */
  const untouched = !!template && JSON.stringify(fieldsFrom(template)) === JSON.stringify({ title, desc, skills: skills.join("|"), level, expectation, min, max, chip });
  const applyTemplate = (tpl: RoleTemplate | "blank") => {
    if (tpl === "blank") {
      setTitle("");
      setDesc("");
      setSkills([]);
      setLevel(LEVELS[0]);
      if (type === "trial") setExpectation("");
      setMin("");
      setMax("");
      setChip(0);
      setTemplate(null);
    } else {
      const f = fieldsFrom(tpl);
      setTitle(f.title);
      setDesc(f.desc);
      setSkills([...tpl.skills]);
      setLevel(f.level);
      setExpectation(f.expectation);
      setMin(f.min);
      setMax(f.max);
      setChip(f.chip);
      setTemplate(tpl);
    }
    setPending(null);
    setBrowsing(false);
  };
  /** The budget step's suggested range and its sources (See source), from what step one says. */
  const suggestion = suggestRange({ title, skills, level, template });
  const noun = type === "trial" ? "rate" : "salary";
  const rangeInUse = !!suggestion && min === settleMoney(String(suggestion.min)) && max === settleMoney(String(suggestion.max));
  const useSuggested = () => {
    if (!suggestion) return;
    setMin(settleMoney(String(suggestion.min)));
    setMax(settleMoney(String(suggestion.max)));
  };
  /** Straight in on a blank or untouched form; otherwise confirm first, so a pick never eats typing. */
  const pickTemplate = (tpl: RoleTemplate | "blank") => (blank || untouched ? applyTemplate(tpl) : setPending(tpl));
  /**
   * A suggestion under the Role field comes from what was typed there, so replacing that title is
   * the point — it only asks when there is more than the title to lose.
   */
  const pickSuggestion = (tpl: RoleTemplate) => (onlyTitle || untouched ? applyTemplate(tpl) : setPending(tpl));
  const goTo = (next: number) => {
    setStep(next);
    window.scrollTo({ top: 0 });
  };
  const startEdit = (section: ReviewSection) => setOpen({ section, before: snapshot() });
  const cancelEdit = () => {
    if (open) restore(open.before);
    setOpen(null);
  };
  /** The previous step, or the role-type choice from the first one; an open Review edit is dropped first. */
  const back = () => {
    if (open) cancelEdit();
    if (step === 0) router.push("/team/hire");
    else goTo(step - 1);
  };
  const backLabel = step === 0 ? "Back to role type" : `Back to ${t.steps[step - 1]}`;
  /** Same rules as the wizard steps, so a quick edit can't leave a required field empty. */
  const sectionOk: Record<ReviewSection, boolean> = {
    title: title.trim().length > 1,
    budget: budgetOk,
    description: desc.trim().length > 0,
    skills: skills.length > 0,
    duration: true,
    experience: level !== LEVELS[0],
    hires: hires >= 1,
    expectations: expectation.trim().length > 0,
    benefits: true,
  };
  /** Props every review section shares: which one is open, and Save / Cancel for it. */
  const item = (section: ReviewSection) => ({
    editing: open?.section === section,
    locked: open !== null && open.section !== section,
    canSave: sectionOk[section],
    onEdit: () => startEdit(section),
    onSave: () => setOpen(null),
    onCancel: cancelEdit,
  });
  const cta = (disabled: boolean) => <Cta next={t.next[step]} disabled={disabled} onNext={() => goTo(step + 1)} onDraft={saveDraft} />;

  if (kind === "published")
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
    <Page title="Create Role" padded={false} nav={<BreadcrumbBack onClick={back}>{backLabel}</BreadcrumbBack>}>
      <div className="flex flex-col items-center gap-6 px-10 pt-4 pb-20">
        <div className="flex w-[720px] flex-col gap-2 tracking-[0.2px]">
          {kind === "review" ? (
            <h2 className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px] text-ink">{t.reviewTitle}</h2>
          ) : (
            <h2 className="font-display text-[24px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
              {t.title}
            </h2>
          )}
          <p className="text-[14px] leading-[1.2] text-ink-2">{kind === "review" ? "This is how your role will appear to Independents." : t.intro}</p>
        </div>
        <div className="w-[720px] px-4 py-10">
          <Steps steps={[...t.steps]} current={step} />
        </div>

        {/* Step 1 — Role Details */}
        {kind === "details" && (
          <StepCard
            title="Role Details"
            body="This is what Independents will see when they receive your offer."
            action={
              // Templates open in their own dialog, keeping the form itself uncluttered. They're for
              // a new post — a draft being finished already has its own details.
              !editing && (
                <Button size="md" className="shrink-0" onClick={() => setBrowsing(true)}>
                  <MdOutlineLibraryBooks size={18} aria-hidden />
                  {template ? "Change template" : "Use a template"}
                </Button>
              )
            }
          >
            <div className="flex flex-col gap-6">
              <Block label="Role">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add e.g. Marketing Manager, Virtual Assistant" />
                {!editing && <TemplateSuggestions query={title} applied={template} onPick={pickSuggestion} />}
              </Block>
              <Block label="Role Description" helper={["Up to 500 characters", `${desc.length} / 500`]}>
                <Textarea value={desc} maxLength={500} onChange={(e) => setDesc(e.target.value)} placeholder={t.descPlaceholder} className="!h-[131px] resize-none" />
              </Block>
              <Block label="Skills" helper={["Select up to 5 skills", `${skills.length} / 5`]}>
                <SkillPicker options={GENERAL_SKILLS} value={skills} onChange={setSkills} max={5} />
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
                <Counter value={hires} onChange={setHires} />
              </div>
            </div>
            {cta(!can)}
          </StepCard>
        )}

        {/* Step 2 — Trial expectations / Responsibilities */}
        {kind === "expectations" && (
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
              {cta(!can)}
            </StepCard>
          </>
        )}

        {/* Step 3 — Budget & Duration / Salary & Start */}
        {kind === "budget" && (
          <StepCard title={t.h3} body={t.sub3} bodySize={16}>
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-4">
                <div className="flex w-[533px] items-end gap-4">
                  <Money label="Minimum" value={min} onChange={setMin} />
                  <span aria-hidden className="mb-[22px] h-px w-6 bg-border" />
                  <Money label="Maximum" value={max} onChange={setMax} />
                  <span className="flex h-12 w-[51px] items-center justify-center text-[16px] leading-[1.5] tracking-[0.2px] text-ink">/month</span>
                </div>
                {rangeError && <p className="text-[12px] leading-[1.2] tracking-[0.2px] text-danger">{rangeError}</p>}
                {/* The range itself, what backs it, and a one-click fill. The line used to promise a
                    suggestion without showing one, beside a "See source" that opened All roles. */}
                {suggestion ? (
                  <p className="w-[533px] text-[12px] leading-[1.5] tracking-[0.2px] text-ink-2">
                    Suggested {noun}:{" "}
                    <strong className="font-semibold text-ink">
                      ${suggestion.min.toLocaleString("en-US")} – ${suggestion.max.toLocaleString("en-US")} /month
                    </strong>{" "}
                    for {title.trim() || suggestion.guide.title} ({levelName(level !== LEVELS[0] ? level : suggestion.guide.level)}), based on similar roles on Hireable.{" "}
                    <button type="button" onClick={() => setSourceOpen(true)} className="font-medium text-primary underline underline-offset-2">
                      See source
                    </button>
                    {!rangeInUse && (
                      <>
                        {" · "}
                        <button type="button" onClick={useSuggested} className="font-medium text-primary underline underline-offset-2">
                          Use this range
                        </button>
                      </>
                    )}
                  </p>
                ) : (
                  // Step one is always complete by here, so no suggestion means nothing similar to go on.
                  <p className="w-[533px] text-[12px] leading-[1.5] tracking-[0.2px] text-ink-2">There aren&apos;t similar roles on Hireable to suggest a {noun} from yet, so set the range you have in mind.</p>
                )}
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
            {cta(!can)}
          </StepCard>
        )}

        {/* Exclusive Benefits — full-time only, optional, skippable (TB-024) */}
        {kind === "benefits" && (
          <StepCard title="Exclusive Benefits" body="Optional. Add what you cover on top of salary — you can skip this and add it later." bodySize={16}>
            <div className="flex flex-col gap-6">
              <BenefitsEditor value={benefits} onChange={setBenefits} />
              <InfoBanner tone="warn">{BENEFITS_DISCLAIMER}</InfoBanner>
            </div>
            {cta(false)}
          </StepCard>
        )}

        {/* Step 4 — Review. Each pencil turns that section into its fields right here (one at a
            time), with Cancel / Save, instead of sending you back through the wizard. */}
        {kind === "review" && (
          <div className="flex w-[720px] flex-col gap-6">
            <InfoBanner>{t.reviewNote}</InfoBanner>
            <Card className="flex flex-col gap-10 rounded-2xl p-10">
              <ReviewItem
                label="Role"
                {...item("title")}
                heading={
                  <div className="flex items-center gap-4">
                    <h3 className="font-display text-[32px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
                      {title}
                    </h3>
                    <JobBadge type={type} />
                  </div>
                }
                editor={<Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add e.g. Marketing Manager, Virtual Assistant" autoFocus />}
              />
              <ReviewItem
                label={t.money}
                value={money}
                {...item("budget")}
                editor={
                  <div className="flex w-[533px] items-end gap-4">
                    <Money label="Minimum" value={min} onChange={setMin} />
                    <span aria-hidden className="mb-[22px] h-px w-6 bg-border" />
                    <Money label="Maximum" value={max} onChange={setMax} />
                    <span className="flex h-12 w-[51px] items-center justify-center text-[16px] leading-[1.5] tracking-[0.2px] text-ink">/month</span>
                  </div>
                }
                error={rangeError}
              />
              <ReviewItem
                label="Role Description"
                {...item("description")}
                editor={
                  <Block label="" helper={["Up to 500 characters", `${desc.length} / 500`]}>
                    <Textarea value={desc} maxLength={500} onChange={(e) => setDesc(e.target.value)} placeholder={t.descPlaceholder} className="!h-[131px] resize-none" autoFocus />
                  </Block>
                }
              >
                <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink">{desc || "No description yet."}</p>
              </ReviewItem>
              <ReviewItem
                label="Skills"
                {...item("skills")}
                editor={
                  <Block label="" helper={["Select up to 5 skills", `${skills.length} / 5`]}>
                    <SkillPicker options={GENERAL_SKILLS} value={skills} onChange={setSkills} max={5} />
                    <SkillChips skills={skills} onRemove={(s) => setSkills((all) => all.filter((x) => x !== s))} />
                  </Block>
                }
              >
                <SkillChips skills={skills} />
              </ReviewItem>
              <ReviewItem
                label={t.when}
                value={
                  <DateChip tone={CHIP_TONES[chip]} selected>
                    {t.chips[chip]}
                  </DateChip>
                }
                {...item("duration")}
                editor={
                  <div className="flex gap-4">
                    {t.chips.map((c, i) => (
                      <DateChip key={c} tone={CHIP_TONES[i]} selected={chip === i} onClick={() => setChip(i)}>
                        {c}
                      </DateChip>
                    ))}
                  </div>
                }
              />
              <ReviewItem
                label="Experience Level:"
                value={level === LEVELS[0] ? "Any level" : level}
                {...item("experience")}
                editor={<Select options={[...LEVELS]} value={level} onChange={(e) => setLevel(e.target.value)} />}
              />
              <ReviewItem label="How many to hire:" value={String(hires)} {...item("hires")} editor={<Counter value={hires} onChange={setHires} />} />
            </Card>
            {/* The two paths carry different extras: a trial has expectations + attachments,
                a full-time post has its exclusive benefits breakdown (TB-024). */}
            {type === "trial" ? (
              <Card className="flex flex-col gap-10 rounded-2xl p-10">
                <ReviewItem
                  label={t.field2}
                  {...item("expectations")}
                  editor={
                    <div className="flex flex-col gap-6">
                      <Block label="" helper={["Up to 500 characters", `${expectation.length} / 500`]}>
                        <Textarea value={expectation} maxLength={500} onChange={(e) => setExpectation(e.target.value)} placeholder={t.ph2} className="!h-[131px] resize-none" autoFocus />
                      </Block>
                      <label className="flex flex-col gap-2">
                        <span className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Attachments (Optional)</span>
                        <Input value={attachment} onChange={(e) => setAttachment(e.target.value)} placeholder="Add a link to a Loom, Google Doc, YouTube video, or anything that helps." />
                      </label>
                    </div>
                  }
                >
                  <p className="min-h-[131px] rounded-lg border border-border px-4 py-4 text-[14px] leading-[1.2] tracking-[0.2px] text-ink">{expectation}</p>
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
                </ReviewItem>
              </Card>
            ) : (
              <Card className="flex flex-col gap-6 rounded-2xl p-10">
                <ReviewItem label="Exclusive Benefits" {...item("benefits")} editor={<BenefitsEditor value={benefits} onChange={setBenefits} />}>
                  {Object.keys(benefits).length === 0 ? (
                    <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">None added.</p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {Object.entries(benefits).map(([label, amount]) => (
                        <li key={label} className="flex items-center justify-between gap-4 text-[14px] leading-[1.2] tracking-[0.2px] text-ink">
                          <span>{label}</span>
                          <span className="font-semibold">${amount || "0"} /month</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </ReviewItem>
                <InfoBanner tone="warn">{BENEFITS_DISCLAIMER}</InfoBanner>
              </Card>
            )}
            {/* TB-001 — the checklist locks the first role behind a company profile and a card to fund
                escrow; publishing used to ignore the lock it advertised. Drafts are always allowed. */}
            {!canPublish && (
              <InfoBanner tone="warn">
                To publish, finish your <Link href="/team/profile/company" className="font-semibold underline">company profile</Link>
                {cards.length === 0 && (
                  <>
                    {" "}and add a <Link href="/team/settings/payment" className="font-semibold underline">payment method</Link>
                  </>
                )}
                . You can save this role as a draft now and publish it after.
              </InfoBanner>
            )}
            <div className="flex justify-end gap-3">
              <Button size="lg" className="!px-5" onClick={saveDraft} disabled={open !== null} title={open ? "Save or cancel your edit first" : undefined}>
                Save as draft
              </Button>
              <Button size="lg" variant="primary" className="!px-5" onClick={publish} disabled={open !== null || !canPublish} title={open ? "Save or cancel your edit first" : !canPublish ? "Finish your company profile and add a payment method first" : undefined}>
                Publish Role
              </Button>
            </div>
          </div>
        )}
      </div>

      <TemplateBrowser open={browsing} onClose={() => setBrowsing(false)} onPick={pickTemplate} onClear={() => pickTemplate("blank")} applied={template} />
      <RateSourceModal open={sourceOpen} onClose={() => setSourceOpen(false)} suggestion={suggestion} role={title.trim()} noun={noun} inUse={rangeInUse} onUse={useSuggested} />
      {/* Opens over the library when a pick would replace something typed; Cancel keeps both. */}
      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pending === "blank" ? "Start from scratch?" : `Use the ${pending?.title ?? ""} template?`}
        description={
          pending === "blank"
            ? `This clears the role, description, skills, experience level${type === "trial" ? ", trial expectations" : ""} and budget you've entered.`
            : `It fills in the role, description, skills, experience level${type === "trial" ? ", trial expectations, trial length" : ""} and budget, replacing what you've entered in those fields.`
        }
        footer={
          <>
            <Button size="lg" onClick={() => setPending(null)}>
              Keep my changes
            </Button>
            <Button size="lg" variant="primary" onClick={() => pending && applyTemplate(pending)}>
              {pending === "blank" ? "Clear the form" : "Use template"}
            </Button>
          </>
        }
      />
    </Page>
  );
}

/** Figma step "container": 720 wide, p 40, gap 40, radius 16, header 20/600 + 14 (or 16) secondary. */
function StepCard({ title, body, bodySize = 14, action, children }: { title: string; body: string; bodySize?: 14 | 16; /** A button beside the heading, e.g. Use a template. */ action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="flex w-[720px] flex-col gap-10 rounded-2xl p-10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px] text-ink">{title}</h3>
          <p className={`leading-[1.5] tracking-[0.2px] text-ink-2 ${bodySize === 16 ? "text-[16px]" : "text-[14px] leading-[1.2]"}`}>{body}</p>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

/** Field block: 16px semibold label, 16px gap, optional 12px helper row (left text · counter). */
/** A plain group rather than a <label>: a label forwards clicks anywhere in it (heading, helper
 *  row, blank space) to the control inside, which popped dropdowns open from outside them. */
function Block({ label, helper, children }: { label: string; helper?: [string, string]; children: React.ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={label ? id : undefined} className="flex flex-col gap-4">
      {label && <span id={id} className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">{label}</span>}
      <span className="flex flex-col gap-2">
        {children}
        {helper && (
          <span className="flex justify-between text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
            <span>{helper[0]}</span>
            <span>{helper[1]}</span>
          </span>
        )}
      </span>
    </div>
  );
}

/** Live money formatting: digits only, thousands commas, one dot, at most two decimals ("1500.5" → "1,500.5"). */
function formatMoney(raw: string) {
  const clean = raw.replace(/[^0-9.]/g, "");
  const dot = clean.indexOf(".");
  const int = (dot < 0 ? clean : clean.slice(0, dot)).replace(/^0+(?=\d)/, "");
  const dec = dot < 0 ? null : clean.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec === null ? grouped : `${grouped || "0"}.${dec}`;
}

/** On blur, settle to two decimals ("1,500" → "1,500.00"); an empty field stays empty. */
function settleMoney(v: string) {
  if (!v) return "";
  const [int, dec = ""] = formatMoney(v).split(".");
  return `${int || "0"}.${dec.padEnd(2, "0")}`;
}

function Money({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="flex flex-1 flex-col gap-2">
      {label && <span className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{label}</span>}
      <span className="relative block">
        <MdAttachMoney size={16} aria-hidden className="pointer-events-none absolute top-3.5 left-4 text-ink" />
        <Input
          value={value}
          onChange={(e) => {
            // Re-place the caret by how many digits/dots sit before it, so inserted commas don't make it jump.
            const el = e.target;
            const before = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/[^0-9.]/g, "").length;
            const next = formatMoney(el.value);
            onChange(next);
            requestAnimationFrame(() => {
              let pos = 0;
              for (let seen = 0; pos < next.length && seen < before; pos++) if (/[0-9.]/.test(next[pos])) seen++;
              el.setSelectionRange(pos, pos);
            });
          }}
          onBlur={() => onChange(settleMoney(value))}
          placeholder="0.00"
          inputMode="decimal"
          disabled={disabled}
          className="!pl-10"
        />
      </span>
    </label>
  );
}

/** Figma "Duration" chip: h 44, 0.5px border, calendar icon in the chip's colour. */
function DateChip({ children, tone, selected, onClick }: { children: React.ReactNode; tone: string; selected?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-pressed={onClick ? !!selected : undefined}
      className={`flex h-11 items-center gap-2 rounded-lg border px-4 text-[14px] leading-[1.2] tracking-[0.2px] transition-colors ${
        selected ? "border-primary bg-accent-bg font-semibold text-accent-ink ring-1 ring-primary" : "border-border bg-white text-ink enabled:hover:border-[#a6a6a6] enabled:hover:bg-surface-alt"
      }`}
    >
      <MdOutlineCalendarToday size={16} aria-hidden className={tone} /> {children}
    </button>
  );
}

function EditButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Tip label={disabled ? "Save or cancel your edit first" : "Edit"} wrap={disabled}>
      <button
        type="button"
        aria-label={`Edit ${label.replace(/:$/, "")}`}
        onClick={onClick}
        disabled={disabled}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-ink enabled:hover:bg-surface-2 disabled:opacity-40"
      >
        <MdBorderColor size={16} aria-hidden />
      </button>
    </Tip>
  );
}

function Line({ label, value, onEdit, disabled }: { label: string; value?: React.ReactNode; onEdit: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-2 text-[16px] leading-[1.5] tracking-[0.2px] whitespace-nowrap text-ink">
        <span className="font-semibold">{label}</span>
        {value && <span>{value}</span>}
      </span>
      <EditButton label={label} onClick={onEdit} disabled={disabled} />
    </div>
  );
}

/** A Review section: its preview with a pencil, or — while editing — its fields with Cancel / Save. */
function ReviewItem({
  label,
  value,
  heading,
  children,
  editor,
  error,
  editing,
  locked,
  canSave,
  onEdit,
  onSave,
  onCancel,
}: {
  label: string;
  value?: React.ReactNode;
  /** Replaces the label line in preview (the role title shows as the big heading). */
  heading?: React.ReactNode;
  children?: React.ReactNode;
  editor: React.ReactNode;
  /** Shown under the fields while editing, e.g. why Save is disabled. */
  error?: string | null;
  editing: boolean;
  locked: boolean;
  canSave: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (editing)
    return (
      <div
        className="-mx-5 flex flex-col gap-4 rounded-xl border border-primary bg-accent-bg/40 p-5"
        onKeyDown={(e) => {
          if (e.key === "Escape" && !e.defaultPrevented) onCancel();
        }}
      >
        <span className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">{label.replace(/:$/, "")}</span>
        {editor}
        {error && <p className="text-[12px] leading-[1.2] tracking-[0.2px] text-danger">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={onSave} disabled={!canSave} title={canSave ? undefined : "This field can't be left empty"}>
            Save
          </Button>
        </div>
      </div>
    );
  return (
    <div className="flex flex-col gap-4">
      {heading ? (
        <div className="flex items-center gap-2">
          {heading}
          <EditButton label={label} onClick={onEdit} disabled={locked} />
        </div>
      ) : (
        <Line label={label} value={value} onEdit={onEdit} disabled={locked} />
      )}
      {children}
    </div>
  );
}

function SkillChips({ skills, onRemove }: { skills: string[]; onRemove?: (skill: string) => void }) {
  if (skills.length === 0) return onRemove ? null : <span className="text-[14px] text-ink-2">No skills added.</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((s) => (
        <Chip key={s} size="sm" onRemove={onRemove && (() => onRemove(s))}>
          {s}
        </Chip>
      ))}
    </div>
  );
}

function Counter({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex h-11 w-max items-center overflow-hidden rounded-lg border border-border bg-white">
      <button type="button" aria-label="Fewer" onClick={() => onChange(Math.max(1, value - 1))} className="flex size-11 items-center justify-center text-ink">
        <MdRemove size={18} aria-hidden />
      </button>
      <span className="flex h-11 w-16 items-center justify-center border-x border-border text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{value}</span>
      <button type="button" aria-label="More" onClick={() => onChange(value + 1)} className="flex size-11 items-center justify-center text-ink">
        <MdAdd size={18} aria-hidden />
      </button>
    </div>
  );
}

/** TB-024 benefit rows: a checkbox per benefit, its monthly amount enabled once ticked. */
function BenefitsEditor({ value, onChange }: { value: Record<string, string>; onChange: (next: Record<string, string>) => void }) {
  return (
    <>
      {BENEFITS.map((b) => {
        const on = b in value;
        return (
          <div key={b} className="flex w-[533px] items-center gap-4">
            <label className="flex flex-1 items-center gap-3 text-[14px] leading-[1.2] tracking-[0.2px] text-ink">
              <input
                type="checkbox"
                checked={on}
                onChange={() => {
                  const next = { ...value };
                  if (on) delete next[b];
                  else next[b] = "";
                  onChange(next);
                }}
                className="size-5 shrink-0 accent-primary"
              />
              {b}
            </label>
            <Money label="" value={value[b] ?? ""} onChange={(v) => onChange({ ...value, [b]: v })} disabled={!on} />
            <span className="flex h-12 w-[51px] items-center text-[14px] leading-[1.5] tracking-[0.2px] text-ink-2">/month</span>
          </div>
        );
      })}
    </>
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
