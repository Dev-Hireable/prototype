import { useState, type ReactNode } from "react";
import { MdOutlineLibraryBooks } from "react-icons/md";
import { Button, InfoBanner, Input, Modal, Pills, Select, Textarea } from "@/components/portal/ui";
import { SkillPicker } from "@/components/portal/controls";
import { TaskPlanEditor } from "@/components/portal/tasks/task-plan";
import { RateSourceModal, TemplateBrowser, TemplateSuggestions } from "@/components/team/role-templates";
import type { JobType, OngoingType } from "@/lib/contract/job-types";
import { GENERAL_SKILLS } from "@/lib/portal/skills";
import { durationDays } from "@/lib/portal/dates";
import { rangeText } from "@/lib/team/rates";
import { LEVELS, levelName, suggestRange } from "@/lib/team/role-templates";
import type { RoleTemplate } from "@/lib/team/role-templates";
import type { RoleForm, Templates } from "../_lib/form";
import { settleMoney } from "@/lib/portal/money";
import { BENEFITS_DISCLAIMER, chipLong, chipText, rangeError, TRIAL_TASKS, type PathCopy } from "../_lib/wizard";
import { BenefitsEditor, Block, Counter, DurationChips, HoursChips, MoneyRange, Required, SkillChips, TrialNotes } from "./fields";
import { StepCard } from "./frame";

/** Step 1 — Role details: the role, what it involves, the skills and level it needs, and how many to hire. */
export function DetailsStep({ f, t, type, editing, templates, onType, cta }: { f: RoleForm; t: PathCopy; type: JobType; editing: boolean; templates: Templates; onType: (type: OngoingType) => void; cta: ReactNode }) {
  return (
    <>
      <StepCard
        title="Role details"
        body="Independents see this on your role post."
        action={
          // Templates open in their own dialog, keeping the form itself uncluttered. They're for
          // a new post — a draft being finished already has its own details.
          !editing && (
            <Button size="md" className="shrink-0" onClick={() => templates.setBrowsing(true)}>
              <MdOutlineLibraryBooks size={18} aria-hidden />
              {templates.template ? "Change template" : "Use a template"}
            </Button>
          )
        }
      >
        <div className="flex flex-col gap-6">
          {/* Build Team hires for an ongoing role, full-time or part-time; the steps after this follow the choice. */}
          {type !== "trial" && (
            <Block label="Employment type" helper={[type === "full-time" ? "A full working week, with benefits." : "Set hours a week, for monthly pay.", ""]}>
              <Pills<OngoingType>
                size="lg"
                aria-label="Employment type"
                value={type}
                onChange={onType}
                options={[
                  { value: "full-time", label: "Full-time" },
                  { value: "part-time", label: "Part-time" },
                ]}
              />
            </Block>
          )}
          <Block label="Role" required>
            <Input value={f.title} onChange={(e) => f.setTitle(e.target.value)} placeholder="Add e.g. Marketing Manager, Virtual Assistant" required />
            {!editing && <TemplateSuggestions query={f.title} applied={templates.template} onPick={templates.pickSuggestion} />}
          </Block>
          <Block label="Role Description" required helper={["", `${f.desc.length} / 500`]}>
            <Textarea value={f.desc} maxLength={500} onChange={(e) => f.setDesc(e.target.value)} placeholder={t.descPlaceholder} className="!h-[131px] resize-none" required />
          </Block>
          <Block label="Skills" required helper={["", `${f.skills.length} / 5`]}>
            <SkillPicker options={GENERAL_SKILLS} value={f.skills} onChange={f.setSkills} max={5} />
            <SkillChips skills={f.skills} onRemove={(s) => f.setSkills((all) => all.filter((x) => x !== s))} />
          </Block>
          <Block label="Experience Level" required>
            <Select options={[...LEVELS]} value={f.level} onChange={(e) => f.setLevel(e.target.value)} />
          </Block>
          <div className="flex flex-col gap-2">
            <p className="text-[16px] leading-6 font-bold text-[#111827]">How many to hire</p>
            <Counter value={f.hires} onChange={f.setHires} />
          </div>
        </div>
        {cta}
      </StepCard>
      <TemplateDialogs templates={templates} type={type} />
    </>
  );
}

/** The template library, and the confirmation that opens over it when a pick would replace something typed. */
function TemplateDialogs({ templates, type }: { templates: Templates; type: JobType }) {
  const { pending, setPending } = templates;
  return (
    <>
      <TemplateBrowser open={templates.browsing} onClose={() => templates.setBrowsing(false)} onPick={templates.pick} onClear={() => templates.pick("blank")} applied={templates.template} trial={type === "trial"} />
      {/* Opens over the library when a pick would replace something typed; Cancel keeps both. */}
      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pending === "blank" ? "Start from scratch?" : `Use the ${pending?.title ?? ""} template?`}
        description={
          pending === "blank"
            ? `This clears the role, description, skills, experience level${type === "trial" ? ", trial tasks and notes" : ""} and pay you've entered.`
            : `This fills in the role name, description and skills${type === "trial" ? ", plus one example task" : ""}. It replaces what you typed in those fields.`
        }
        footer={
          <>
            <Button size="lg" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" onClick={() => pending && templates.apply(pending)}>
              {pending === "blank" ? "Clear the form" : "Use template"}
            </Button>
          </>
        }
      />
    </>
  );
}

/** Step 2 — Trial tasks: the work the trial is for, which the offer carries into the contract. */
export function TasksStep({ f, weeks, cta }: { f: RoleForm; weeks: number; cta: ReactNode }) {
  return (
    <>
      <div className="w-[720px] max-w-full">
        <InfoBanner>{TRIAL_TASKS.shared}</InfoBanner>
      </div>
      <StepCard title={TRIAL_TASKS.title}>
        <div className="flex flex-col gap-10">
          <Block label={TRIAL_TASKS.label} required>
            <TaskPlanEditor rows={f.taskRows} onChange={f.setTaskRows} weeks={weeks} placeholder="Name a task for the trial" />
          </Block>
          <TrialNotes expectation={f.expectation} onExpectation={f.setExpectation} attachment={f.attachment} onAttachment={f.setAttachment} copy={TRIAL_TASKS} />
        </div>
        {cta}
      </StepCard>
    </>
  );
}

/** Step 3 — Pay: a trial's pay and length, or Build Team's pay and start (with a part-time role's hours). */
export function BudgetStep({ f, t, type, template, cta }: { f: RoleForm; t: PathCopy; type: JobType; template: RoleTemplate | null; cta: ReactNode }) {
  const [sourceOpen, setSourceOpen] = useState(false);
  /** The suggested range and its sources (See source), from what step one says, a part-time role's share for its hours. */
  // A trial's suggestion is for the whole trial, at the length picked below: the monthly range for each month of it.
  const suggestion = suggestRange({ title: f.title, skills: f.skills, level: f.level, template, hours: type === "part-time" ? f.hours : undefined, trialDays: type === "trial" ? durationDays(t.chips[f.chip]) : undefined });
  const inUse = !!suggestion && f.min === settleMoney(String(suggestion.min)) && f.max === settleMoney(String(suggestion.max));
  const fillRange = () => {
    if (!suggestion) return;
    f.setMin(settleMoney(String(suggestion.min)));
    f.setMax(settleMoney(String(suggestion.max)));
  };
  const error = rangeError(f);
  return (
    <>
      <StepCard title={t.h3} body={t.sub3} bodySize={16}>
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">
              {t.pay}
              <Required />
            </p>
            <MoneyRange min={f.min} max={f.max} onMin={f.setMin} onMax={f.setMax} unit={type === "trial" ? undefined : "/month"} />
            {error && <p className="text-[12px] leading-[1.2] tracking-[0.2px] text-danger">{error}</p>}
            <SuggestedRange f={f} suggestion={suggestion} inUse={inUse} onSource={() => setSourceOpen(true)} onUse={fillRange} />
          </div>
          {type === "part-time" && (
            <div className="flex flex-col gap-6">
              <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Hours a week</p>
              <HoursChips value={f.hours} onChange={f.setHours} />
            </div>
          )}
          <div className="flex flex-col gap-6">
            <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{t.label3}</p>
            <DurationChips chips={t.chips} label={(c) => chipText(type, c)} value={f.chip} onChange={f.setChip} />
            {type === "trial" && <p className="-mt-3 text-[12px] leading-[1.4] tracking-[0.2px] text-ink-2">{chipLong(type, t.chips[f.chip])} from the trial&apos;s start date.</p>}
          </div>
        </div>
        {cta}
      </StepCard>
      <RateSourceModal open={sourceOpen} onClose={() => setSourceOpen(false)} suggestion={suggestion} role={f.title.trim()} inUse={inUse} onUse={fillRange} />
    </>
  );
}

/**
 * The range itself, what backs it, and a one-click fill. The line used to promise a suggestion
 * without showing one, beside a "See source" that opened All roles; then it credited "similar roles
 * on Hireable" for a range that comes from published market rates.
 */
function SuggestedRange({ f, suggestion, inUse, onSource, onUse }: { f: RoleForm; suggestion: ReturnType<typeof suggestRange>; inUse: boolean; onSource: () => void; onUse: () => void }) {
  if (!suggestion) {
    // Step one is always complete by here, so no suggestion means no published rates to go on.
    return <p className="w-[533px] max-w-full text-[12px] leading-[1.5] tracking-[0.2px] text-ink-2">No published market rates for this role yet, so set the range you have in mind.</p>;
  }
  // The level the figure is for: the role's own, or "all levels" when the only published figure covers every level.
  const covers = suggestion.basis.level === null ? "all levels" : levelName(f.level !== LEVELS[0] ? f.level : suggestion.guide.level);
  return (
    <p className="w-[533px] max-w-full text-[12px] leading-[1.5] tracking-[0.2px] text-ink-2">
      Suggested pay for {f.title.trim() || suggestion.guide.title} ({covers}): <strong className="font-semibold text-ink">{rangeText(suggestion, suggestion.hours, suggestion.trialDays)}</strong>, based on published market rates.{" "}
      <button type="button" onClick={onSource} className="font-medium text-primary underline underline-offset-2">
        See source
      </button>
      {!inUse && (
        <>
          {" · "}
          <button type="button" onClick={onUse} className="font-medium text-primary underline underline-offset-2">
            Use this range
          </button>
        </>
      )}
    </p>
  );
}

/** Benefits — full-time only, optional, skippable (TB-024). */
export function BenefitsStep({ f, cta }: { f: RoleForm; cta: ReactNode }) {
  return (
    <StepCard title="Benefits" body="Optional, and you can add it later. List anything you cover on top of their pay." bodySize={16}>
      <div className="flex flex-col gap-6">
        <BenefitsEditor value={f.benefits} onChange={f.setBenefits} />
        <InfoBanner>{BENEFITS_DISCLAIMER}</InfoBanner>
      </div>
      {cta}
    </StepCard>
  );
}
