import { useState, type ReactNode } from "react";
import { MdOutlineLibraryBooks } from "react-icons/md";
import { Button, InfoBanner, Input, Modal, Pills, Select, Textarea } from "@/components/independent/ui";
import { SkillPicker } from "@/components/portal/controls";
import { TaskPlanEditor } from "@/components/portal/tasks/TaskPlan";
import { RateSourceModal, TemplateBrowser, TemplateSuggestions } from "@/components/team/RoleTemplates";
import type { JobType, OngoingType } from "@/lib/demo/job-types";
import { GENERAL_SKILLS } from "@/lib/portal/skills";
import { LEVELS, levelName, suggestRange } from "@/lib/team/role-templates";
import type { RoleTemplate } from "@/lib/team/role-templates";
import type { RoleForm, Templates } from "../_lib/form";
import { settleMoney } from "@/lib/portal/money";
import { BENEFITS_DISCLAIMER, rangeError, type PathCopy } from "../_lib/wizard";
import { BenefitsEditor, Block, Counter, DurationChips, HoursChips, MoneyRange, SkillChips, TrialNotes } from "./Fields";
import { StepCard } from "./Frame";

/** Step 1 — Role Details: the role, what it involves, the skills and level it needs, and how many to hire. */
export function DetailsStep({ f, t, type, editing, templates, onType, cta }: { f: RoleForm; t: PathCopy; type: JobType; editing: boolean; templates: Templates; onType: (type: OngoingType) => void; cta: ReactNode }) {
  return (
    <>
      <StepCard
        title="Role Details"
        body="This is what Independents will see when they receive your offer."
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
            <Block label="Employment type" helper={[type === "full-time" ? "A full working week, with exclusive benefits." : "Set hours a week, paid a monthly rate.", ""]}>
              <Pills<OngoingType>
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
          <Block label="Role">
            <Input value={f.title} onChange={(e) => f.setTitle(e.target.value)} placeholder="Add e.g. Marketing Manager, Virtual Assistant" />
            {!editing && <TemplateSuggestions query={f.title} applied={templates.template} onPick={templates.pickSuggestion} />}
          </Block>
          <Block label="Role Description" helper={["Up to 500 characters", `${f.desc.length} / 500`]}>
            <Textarea value={f.desc} maxLength={500} onChange={(e) => f.setDesc(e.target.value)} placeholder={t.descPlaceholder} className="!h-[131px] resize-none" />
          </Block>
          <Block label="Skills" helper={["Select up to 5 skills", `${f.skills.length} / 5`]}>
            <SkillPicker options={GENERAL_SKILLS} value={f.skills} onChange={f.setSkills} max={5} />
            <SkillChips skills={f.skills} onRemove={(s) => f.setSkills((all) => all.filter((x) => x !== s))} />
          </Block>
          <Block label="Experience Level">
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
      <TemplateBrowser open={templates.browsing} onClose={() => templates.setBrowsing(false)} onPick={templates.pick} onClear={() => templates.pick("blank")} applied={templates.template} />
      {/* Opens over the library when a pick would replace something typed; Cancel keeps both. */}
      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pending === "blank" ? "Start from scratch?" : `Use the ${pending?.title ?? ""} template?`}
        description={
          pending === "blank"
            ? `This clears the role, description, skills, experience level${type === "trial" ? ", trial tasks and notes" : ""} and budget you've entered.`
            : `It fills in the role, description, skills, experience level${type === "trial" ? ", trial tasks, trial length" : ""} and budget, replacing what you've entered in those fields.`
        }
        footer={
          <>
            <Button size="lg" onClick={() => setPending(null)}>
              Keep my changes
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
export function TasksStep({ f, t, weeks, cta }: { f: RoleForm; t: PathCopy; weeks: number; cta: ReactNode }) {
  return (
    <>
      <div className="w-[720px]">
        <InfoBanner>{t.note}</InfoBanner>
      </div>
      <StepCard title={t.h2} body="List the tasks for the trial. They go into your offer as the proposal settles them, and once it's signed each task's name, details, due week and priority stay as agreed.">
        <div className="flex flex-col gap-10">
          <Block label={t.field2}>
            <TaskPlanEditor rows={f.taskRows} onChange={f.setTaskRows} weeks={weeks} placeholder="Name a task for the trial" />
          </Block>
          <TrialNotes expectation={f.expectation} onExpectation={f.setExpectation} attachment={f.attachment} onAttachment={f.setAttachment} placeholder={t.ph2} hint={t.hint2} />
        </div>
        {cta}
      </StepCard>
    </>
  );
}

/** Step 3 — Budget & Duration, or Build Team's Salary & Start / Rate, Hours & Start. */
export function BudgetStep({ f, t, type, template, cta }: { f: RoleForm; t: PathCopy; type: JobType; template: RoleTemplate | null; cta: ReactNode }) {
  const [sourceOpen, setSourceOpen] = useState(false);
  /** The suggested range and its sources (See source), from what step one says. */
  const suggestion = suggestRange({ title: f.title, skills: f.skills, level: f.level, template });
  const noun = type === "full-time" ? "salary" : "rate";
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
            <MoneyRange min={f.min} max={f.max} onMin={f.setMin} onMax={f.setMax} />
            {error && <p className="text-[12px] leading-[1.2] tracking-[0.2px] text-danger">{error}</p>}
            <SuggestedRange f={f} suggestion={suggestion} noun={noun} inUse={inUse} onSource={() => setSourceOpen(true)} onUse={fillRange} />
          </div>
          {type === "part-time" && (
            <div className="flex flex-col gap-6">
              <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Hours a week</p>
              <HoursChips value={f.hours} onChange={f.setHours} />
            </div>
          )}
          <div className="flex flex-col gap-6">
            <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{t.label3}</p>
            <DurationChips chips={t.chips} value={f.chip} onChange={f.setChip} />
          </div>
        </div>
        {cta}
      </StepCard>
      <RateSourceModal open={sourceOpen} onClose={() => setSourceOpen(false)} suggestion={suggestion} role={f.title.trim()} noun={noun} inUse={inUse} onUse={fillRange} />
    </>
  );
}

/**
 * The range itself, what backs it, and a one-click fill. The line used to promise a suggestion
 * without showing one, beside a "See source" that opened All roles.
 */
function SuggestedRange({ f, suggestion, noun, inUse, onSource, onUse }: { f: RoleForm; suggestion: ReturnType<typeof suggestRange>; noun: "salary" | "rate"; inUse: boolean; onSource: () => void; onUse: () => void }) {
  if (!suggestion) {
    // Step one is always complete by here, so no suggestion means nothing similar to go on.
    return <p className="w-[533px] text-[12px] leading-[1.5] tracking-[0.2px] text-ink-2">There aren&apos;t similar roles on Hireable to suggest a {noun} from yet, so set the range you have in mind.</p>;
  }
  return (
    <p className="w-[533px] text-[12px] leading-[1.5] tracking-[0.2px] text-ink-2">
      Suggested {noun}:{" "}
      <strong className="font-semibold text-ink">
        ${suggestion.min.toLocaleString("en-US")} – ${suggestion.max.toLocaleString("en-US")} /month
      </strong>{" "}
      for {f.title.trim() || suggestion.guide.title} ({levelName(f.level !== LEVELS[0] ? f.level : suggestion.guide.level)}), based on similar roles on Hireable.{" "}
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

/** Exclusive Benefits — full-time only, optional, skippable (TB-024). */
export function BenefitsStep({ f, cta }: { f: RoleForm; cta: ReactNode }) {
  return (
    <StepCard title="Exclusive Benefits" body="Optional. Add what you cover on top of salary — you can skip this and add it later." bodySize={16}>
      <div className="flex flex-col gap-6">
        <BenefitsEditor value={f.benefits} onChange={f.setBenefits} />
        <InfoBanner tone="warn">{BENEFITS_DISCLAIMER}</InfoBanner>
      </div>
      {cta}
    </StepCard>
  );
}
