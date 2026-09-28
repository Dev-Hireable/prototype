import Link from "next/link";
import { Button, Card, InfoBanner, Input, JobBadge, Select, Textarea } from "@/components/independent/ui";
import { SkillPicker } from "@/components/portal/controls";
import { TaskPlanEditor, TaskPlanList } from "@/components/portal/tasks/TaskPlan";
import { hoursLabel, type JobType } from "@/lib/demo/job-types";
import { fromDrafts } from "@/lib/demo/tasks";
import { GENERAL_SKILLS } from "@/lib/portal/skills";
import { LEVELS } from "@/lib/team/role-templates";
import type { ReviewEdits, RoleForm } from "../_lib/form";
import { BENEFITS_DISCLAIMER, CHIP_TONES, moneyLine, rangeError, type PathCopy } from "../_lib/wizard";
import { BenefitsEditor, Block, Counter, DateChip, DurationChips, HoursChips, MoneyRange, SkillChips, TrialNotes } from "./Fields";
import { ReviewItem } from "./Frame";

type Item = ReviewEdits["item"];

/**
 * Step 4 — Review. Each pencil turns that section into its fields right here (one at a time), with
 * Cancel / Save, instead of sending you back through the wizard.
 */
export function ReviewStep({ f, t, type, weeks, edits, canPublish, hasCard, onDraft, onPublish }: { f: RoleForm; t: PathCopy; type: JobType; weeks: number; edits: ReviewEdits; canPublish: boolean; hasCard: boolean; onDraft: () => void; onPublish: () => void }) {
  const busy = edits.editing ? "Save or cancel your edit first" : undefined;
  const publishTip = busy ?? (!canPublish ? "Finish your company profile and add a payment method first" : undefined);
  return (
    <div className="flex w-[720px] flex-col gap-6">
      <InfoBanner>{t.reviewNote}</InfoBanner>
      <MainFacts f={f} t={t} type={type} item={edits.item} />
      {/* The paths carry different extras: a trial has expectations + attachments, a
          full-time post its exclusive benefits breakdown (TB-024), a part-time post neither. */}
      {type === "trial" && <TrialExtras f={f} t={t} weeks={weeks} item={edits.item} />}
      {type === "full-time" && <BenefitExtras f={f} item={edits.item} />}
      {/* TB-001 — the checklist locks the first role behind a company profile and a card to fund
          escrow; publishing used to ignore the lock it advertised. Drafts are always allowed. */}
      {!canPublish && (
        <InfoBanner tone="warn">
          To publish, finish your <Link href="/team/profile/company" className="font-semibold underline">company profile</Link>
          {!hasCard && (
            <>
              {" "}and add a <Link href="/team/settings/payment" className="font-semibold underline">payment method</Link>
            </>
          )}
          . You can save this role as a draft now and publish it after.
        </InfoBanner>
      )}
      <div className="flex justify-end gap-3">
        <Button size="lg" className="!px-5" onClick={onDraft} disabled={edits.editing} title={busy}>
          Save as draft
        </Button>
        <Button size="lg" variant="primary" className="!px-5" onClick={onPublish} disabled={edits.editing || !canPublish} title={publishTip}>
          Publish Role
        </Button>
      </div>
    </div>
  );
}

/** The post's main facts, each with its pencil: the role, the pay, the description, the skills, when, the level, the hours and how many. */
function MainFacts({ f, t, type, item }: { f: RoleForm; t: PathCopy; type: JobType; item: Item }) {
  return (
    <Card className="flex flex-col gap-10 rounded-2xl p-10">
      <ReviewItem
        label="Role"
        {...item("title")}
        heading={
          <div className="flex items-center gap-4">
            <h3 className="font-display text-[32px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
              {f.title}
            </h3>
            <JobBadge type={type} />
          </div>
        }
        editor={<Input value={f.title} onChange={(e) => f.setTitle(e.target.value)} placeholder="Add e.g. Marketing Manager, Virtual Assistant" autoFocus />}
      />
      <ReviewItem label={t.money} value={moneyLine(f)} {...item("budget")} editor={<MoneyRange min={f.min} max={f.max} onMin={f.setMin} onMax={f.setMax} />} error={rangeError(f)} />
      <ReviewItem
        label="Role Description"
        {...item("description")}
        editor={
          <Block label="" helper={["Up to 500 characters", `${f.desc.length} / 500`]}>
            <Textarea value={f.desc} maxLength={500} onChange={(e) => f.setDesc(e.target.value)} placeholder={t.descPlaceholder} className="!h-[131px] resize-none" autoFocus />
          </Block>
        }
      >
        <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink">{f.desc || "No description yet."}</p>
      </ReviewItem>
      <ReviewItem
        label="Skills"
        {...item("skills")}
        editor={
          <Block label="" helper={["Select up to 5 skills", `${f.skills.length} / 5`]}>
            <SkillPicker options={GENERAL_SKILLS} value={f.skills} onChange={f.setSkills} max={5} />
            <SkillChips skills={f.skills} onRemove={(s) => f.setSkills((all) => all.filter((x) => x !== s))} />
          </Block>
        }
      >
        <SkillChips skills={f.skills} />
      </ReviewItem>
      <ReviewItem
        label={t.when}
        value={
          <DateChip tone={CHIP_TONES[f.chip]} selected>
            {t.chips[f.chip]}
          </DateChip>
        }
        {...item("duration")}
        editor={<DurationChips chips={t.chips} value={f.chip} onChange={f.setChip} />}
      />
      <ReviewItem label="Experience Level:" value={f.level === LEVELS[0] ? "Any level" : f.level} {...item("experience")} editor={<Select options={[...LEVELS]} value={f.level} onChange={(e) => f.setLevel(e.target.value)} />} />
      {type === "part-time" && <ReviewItem label="Hours a week:" value={hoursLabel(f.hours)} {...item("weekly")} editor={<HoursChips value={f.hours} onChange={f.setHours} />} />}
      <ReviewItem label="How many to hire:" value={String(f.hires)} {...item("hires")} editor={<Counter value={f.hires} onChange={f.setHires} />} />
    </Card>
  );
}

/** A trial's tasks, its notes and its link, under one pencil. */
function TrialExtras({ f, t, weeks, item }: { f: RoleForm; t: PathCopy; weeks: number; item: Item }) {
  return (
    <Card className="flex flex-col gap-10 rounded-2xl p-10">
      <ReviewItem
        label={t.field2}
        {...item("expectations")}
        editor={
          <div className="flex flex-col gap-6">
            <TaskPlanEditor rows={f.taskRows} onChange={f.setTaskRows} weeks={weeks} placeholder="Name a task for the trial" />
            <TrialNotes expectation={f.expectation} onExpectation={f.setExpectation} attachment={f.attachment} onAttachment={f.setAttachment} placeholder={t.ph2} hint={t.hint2} />
          </div>
        }
      >
        <TaskPlanList tasks={fromDrafts(f.taskRows)} empty="No tasks yet — the trial needs at least one." />
        {f.expectation.trim() && (
          <div className="flex flex-col gap-2">
            <span className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Notes</span>
            <p className="rounded-lg border border-border px-4 py-4 text-[14px] leading-[1.4] tracking-[0.2px] whitespace-pre-line text-ink">{f.expectation}</p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <span className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Attachments</span>
          {f.attachment ? (
            <Link href={f.attachment} target="_blank" className="flex h-11 items-center rounded-lg border border-border px-4 text-[14px] leading-[1.2] tracking-[0.2px] text-primary">
              {f.attachment}
            </Link>
          ) : (
            <span className="flex h-11 items-center rounded-lg border border-border px-4 text-[14px] text-ink-2">None</span>
          )}
        </div>
      </ReviewItem>
    </Card>
  );
}

/** TB-024 — a full-time post's exclusive benefits, and what each is worth a month. */
function BenefitExtras({ f, item }: { f: RoleForm; item: Item }) {
  const benefits = Object.entries(f.benefits);
  return (
    <Card className="flex flex-col gap-6 rounded-2xl p-10">
      <ReviewItem label="Exclusive Benefits" {...item("benefits")} editor={<BenefitsEditor value={f.benefits} onChange={f.setBenefits} />}>
        {benefits.length === 0 ? (
          <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">None added.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {benefits.map(([label, amount]) => (
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
  );
}
