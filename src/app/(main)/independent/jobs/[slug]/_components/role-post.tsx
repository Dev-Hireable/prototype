import { LockedTasks } from "@/components/portal/tasks/locked-tasks";
import { Chip, JobBadge, MatchPill } from "@/components/portal/ui";
import { FactStrip, Section } from "@/components/portal/page-parts";
import { TaskPlanList } from "@/components/portal/tasks/task-plan";
import { WorkStyleMatch } from "@/components/portal/work-style-match";
import { durationDays, trialLength } from "@/lib/portal/dates";
import { JOB_TYPE_LABEL, jobFacts } from "@/lib/contract/job-types";
import type { JobType } from "@/lib/contract/job-types";
import type { PlannedTask } from "@/lib/demo/tasks";
import { MATCH_TOOLTIP } from "@/lib/portal/match";
import type { Role } from "@/lib/independent/data";

const DM = { fontVariationSettings: '"opsz" 14' };

/** The role's header, read like the talent profile's: the company, the title with its type and match, and a facts strip. */
export function RoleHeader({ role }: { role: Role }) {
  /** Three facts, as on the profile: the pay (with a part-time role's hours), how long or when, and the level. */
  const facts = jobFacts({ type: role.type, pay: role.rateRange, duration: role.duration, hours: role.hours, level: role.level });
  return (
    // data-tour: the role's tour points at the role and at its work style (@/lib/portal/tours).
    <header data-tour="role-head" className="flex max-w-[768px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-[14px] leading-[1.4] text-ink-2">
          <span className="font-semibold text-ink">{role.company}</span> · {role.about.location} · {role.posted}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="font-display text-[32px] leading-[1.3] font-semibold text-ink" style={DM}>
            {role.title}
          </h2>
          <span className="flex items-center gap-2">
            <JobBadge type={role.type} />
            {/* IN-012 — colour coded by band, with the tooltip that explains the score. */}
            <MatchPill pct={role.match} coded title={MATCH_TOOLTIP.independent} />
          </span>
        </div>
      </div>
      <FactStrip cells={facts} />
    </header>
  );
}

/**
 * Under the header, the role itself: what it is and the skills it asks for, how the talent's work
 * style lines up with the company's, a trial's tasks, and how hiring runs.
 */
export function RoleSections({ role, theirs, mine, tasks, tasksShared }: { role: Role; theirs: readonly number[]; mine: readonly number[]; tasks: PlannedTask[]; tasksShared: boolean }) {
  return (
    <>
      <Section title="About the role">
        {role.description.map((p) => (
          <p key={p} className="text-[14px] leading-[1.5] tracking-[0.2px] whitespace-pre-line text-ink">
            {p}
          </p>
        ))}
      </Section>

      <Section title="Skills">
        <div className="flex flex-wrap gap-2">
          {role.skills.map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
        </div>
      </Section>

      {/* Section takes no extra props, so the tour's anchor is a wrapper. */}
      <div data-tour="role-style">
        <Section title="Work style">
          <WorkStyleMatch company={role.company} theirs={theirs} mine={mine} />
        </Section>
      </div>

      {role.type === "trial" && <TrialTasks company={role.company} tasks={tasks} shared={tasksShared} />}

      <Section title="How hiring works">
        <HiringSteps type={role.type} company={role.company} duration={role.duration} />
      </Section>
    </>
  );
}

/** A trial's tasks, set by the company: listed once the talent's proposal is accepted, and until then only how many there are. */
function TrialTasks({ company, tasks, shared }: { company: string; tasks: PlannedTask[]; shared: boolean }) {
  return (
    <Section title="Trial tasks" action={shared && tasks.length > 0 && <span className="text-[13px] leading-[1.4] text-ink-2">Set by {company}</span>}>
      {shared ? <TaskPlanList tasks={tasks} empty={`${company} hasn't listed the trial's tasks yet.`} /> : <LockedTasks company={company} count={tasks.length} />}
    </Section>
  );
}

/**
 * How the role is hired, as four numbered steps: a trial ends in paid, escrowed work on the tasks
 * the company set; a full-time or part-time role hires straight onto the contract.
 */
function HiringSteps({ type, company, duration }: { type: JobType; company: string; duration: string }) {
  const first = [
    { title: "Apply", body: "Send your profile, with a short note if you like." },
    { title: "Interview", body: `${company} invites its best matches to a call.` },
    { title: "Proposal", body: `Your pay${type === "part-time" ? ", hours a week" : ""} and start date, with a cover letter.` },
  ];
  const steps = [
    ...first,
    type === "trial"
      ? { title: "Paid trial", body: `${trialLength(durationDays(duration))} of real work, paid from escrow when it ends.` }
      : { title: "Offer", body: `Hired straight into the ${JOB_TYPE_LABEL[type].toLowerCase()} role, paid monthly.` },
  ];
  return (
    // Four across where there's room, two by two where there isn't — the line runs on to the next step in its row.
    <div className="@container">
      <ol className="grid grid-cols-2 gap-x-4 gap-y-6 @xl:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="flex min-w-0 flex-col gap-2">
            <span className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-bg text-[13px] leading-none font-semibold text-primary">{i + 1}</span>
              {i < steps.length - 1 && <span aria-hidden className={`h-px flex-1 bg-border ${i % 2 ? "hidden @xl:block" : ""}`} />}
            </span>
            <span className="text-[14px] leading-[1.3] font-semibold text-ink">{s.title}</span>
            <span className="text-[13px] leading-[1.45] text-ink-2">{s.body}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
