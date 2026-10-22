"use client";

import Link from "next/link";
import { ICONS } from "@/components/icons";
import { Avatar, JobBadge, Page } from "@/components/portal/ui";
import {
  DashboardBanner,
  DashboardBarChart,
  DashboardFrame,
  DashboardGreeting,
  DashboardHero,
  DashboardQuickAction,
  DashboardSetupCard,
  DashboardStat,
  DashboardSummaryCard,
  DashboardSummaryGrid,
  type DashboardChecklistItem,
} from "@/components/portal/dashboard";
import { DashboardTasks } from "@/components/portal/dashboard-tasks";
import { useTeamAccount, useTeamBanner } from "@/lib/team/account";
import { useTeamContracts } from "@/lib/team/contracts";
import { slotForTeam, usePipeline } from "@/lib/team/pipeline";
import { useRoles } from "@/lib/team/roles";
import { dayLabel } from "@/lib/portal/dates";
import { shortName } from "@/lib/portal/names";
import { lifecycleOfDeal, useDeal, type Deal } from "@/lib/demo/deal";
import { JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import { PAIR } from "@/lib/demo/live";
import { CONTRACT_NAMES, liveIndependents, MARKETING_BANNER, setupSteps } from "@/lib/team/data";
import type { Candidate, Contract, Interview } from "@/lib/team/data";
import { traitTagsFor } from "@/lib/demo/work-style";

const Work = ICONS.workOutline;
const Add = ICONS.add;
const Search = ICONS.search;

const nameOf = (slug: string, independent: string) => CONTRACT_NAMES[slug] ?? liveIndependents().find((i) => i.slug === independent)?.name ?? slug;
const avatarOf = (independent: string) => liveIndependents().find((i) => i.slug === independent)?.avatar ?? "/team/juan.jpg";

/**
 * The live engagement's contract, while it runs, and what it needs from the Team Builder before any
 * task — the trial evaluation to send, the hire-or-end decision — or, while an offer is out, why its
 * work is frozen.
 */
function contractFocus(deal: Deal | null, active: Contract[]) {
  /** The contract with a work list (the live engagement), while it runs — what it needs from you gets its own card. */
  const working = deal?.contract ? active.find((c) => c.slug === PAIR.independent.slug) : undefined;
  const talent = working ? nameOf(working.slug, working.independent) : "";
  /** What the contract needs from you before any task, by where it is in its lifecycle. */
  const life = working ? lifecycleOfDeal(deal) : null;
  const who = talent.split(" ")[0];
  const contractHref = working ? `/team/independents/${working.slug}` : "";
  const lead =
    life?.phase === "evaluation" && life.trial
      ? { href: `${contractHref}?tab=evaluation`, title: `Send ${who}'s trial evaluation`, meta: life.trial.evaluationOverdue ? `Overdue since ${dayLabel(life.trial.evaluationDue)}` : `Due ${dayLabel(life.trial.evaluationDue)}`, overdue: life.trial.evaluationOverdue }
      : life?.phase === "decision"
        ? { href: `${contractHref}?tab=overview`, title: `Hire ${who}, or end the contract`, meta: "The trial is evaluated" }
        : undefined;
  /** While an offer is out the trial's work can't move, so there's nothing of it to list. */
  const frozen = life?.phase === "offer" && deal?.conversion ? `Your ${JOB_TYPE_LABEL[deal.conversion.type].toLowerCase()} offer is with ${who}. The work reopens when they accept.` : undefined;
  return { working, talent, who, lead, frozen };
}

/**
 * The Team Builder's dashboard, built to TB-001: dismissible marketing banner (once setup is done),
 * 4-step setup checklist with per-step shortcuts, active contracts widget with a + Hire button
 * and an empty state, and two always-visible quick action cards.
 */
export default function Dashboard() {
  /* Contracts and interviews come from the store: ending a contract or scheduling an interview
     elsewhere in the app has to show up in these widgets. */
  const { interviews, candidates } = usePipeline();
  const { contracts } = useTeamContracts();
  /** Active = every trial and full-time engagement that hasn't ended. */
  const active = contracts.filter((c) => c.status.label !== "Ended");
  const banner = useTeamBanner();
  /** Next few interviews that haven't happened yet. */
  const upcoming = interviews.filter((iv) => !iv.past).slice(0, 3);
  const deal = useDeal();
  const { working, talent, who, lead, frozen } = contractFocus(deal, active);
  const steps = useSetupSteps();
  const { profile } = useTeamAccount();

  return (
    <Page title="Dashboard" padded={false}>
      <DashboardFrame>
        {/* The banner's Create a role waits until setup is done, so it never sits above a checklist still asking for the company profile. */}
        <DashboardBanner banner={steps.every((s) => s.done) ? MARKETING_BANNER : null} dismissed={banner.dismissed} onDismiss={banner.dismiss} />

        <SetupHero steps={steps} />

        {/* New applications first, with My tasks beside them; Interviews and Active contracts under them. */}
        <DashboardSummaryGrid
          main={[
            <ApplicantsCard key="Applicants" candidates={candidates} active={active} />,

            <DashboardSummaryCard key="Interviews" title="Interviews" href="/team/hire/roles">
              <UpcomingInterviews upcoming={upcoming} />
            </DashboardSummaryCard>,
          ]}
          side={[
            // TB-147 — straight to what needs you: work sent for your review and your own tasks, in the order you put them, each a click from its sheet.
            working && (
              <DashboardTasks key="tasks" side="team" me={profile.name} base={`/team/independents/${working.slug}`} allHref={`/team/independents/${working.slug}`} about={`${talent} · ${working.role}`} counterpart={who} lead={lead} frozen={frozen} />
            ),

            // Active contracts: every ongoing Trial and Full-Time engagement, + Hire at the bottom.
            <DashboardSummaryCard key="Active contracts" title="Active contracts" href="/team/independents">
              <ActiveContracts active={active} />
            </DashboardSummaryCard>,
          ]}
        />

      </DashboardFrame>
    </Page>
  );
}

/** TB-001 — the setup steps, computed from what is actually set up, so finishing a step moves the bar. */
function useSetupSteps() {
  const { roles } = useRoles();
  const { company, workStyle } = useTeamAccount();
  return setupSteps({ company, roles, workStyle });
}

/** The greeting with the two quick actions, beside the account setup checklist. */
function SetupHero({ steps }: { steps: DashboardChecklistItem[] }) {
  /* TB-120/121 — the greeting and the avatar follow whatever the profile page saved. */
  const { profile, workStyle } = useTeamAccount();
  return (
    <DashboardHero>
      <DashboardGreeting name={profile.name.split(" ")[0]} dateClassName="text-[15px] leading-[1.2] tracking-[0.2px] text-ink-2">
        <DashboardQuickAction tour="create-role" title="Create a role" body="Post a role and start collecting applications." href="/team/hire" icon={<Add size={20} aria-hidden />} />
        <DashboardQuickAction title="Discover Independents" body="Browse matched talent and invite them to apply." href="/team/discover" icon={<Search size={20} aria-hidden />} />
      </DashboardGreeting>

      <DashboardSetupCard
        side="team"
        avatarSrc={profile.photo}
        avatarClassName="object-top"
        title="Finish setting up your account"
        description="Complete your account to start hiring."
        items={steps}
        traits={traitTagsFor(workStyle, "team")}
        matching="Independents are matched to these tags."
        profileHref="/team/profile"
      />
    </DashboardHero>
  );
}

/** The Applicants card: everyone in the pipeline, and the funnel from shortlisted to each kind of engagement. */
function ApplicantsCard({ candidates, active }: { candidates: Candidate[]; active: Contract[] }) {
  /** TB-002 — counted from the pipeline, not numbers typed into the card. */
  const live = candidates.filter((c) => !c.dropped);
  const shortlisted = live.filter((c) => c.stage !== "applied" && c.stage !== "hired").length;
  // One bar per kind of engagement: "In trial" used to count every active contract, so a trial
  // that converted to full-time was still reported as in trial.
  const inTrial = active.filter((c) => c.type === "trial").length;
  const fullTime = active.filter((c) => c.type === "full-time").length;
  const partTime = active.filter((c) => c.type === "part-time").length;
  return (
    <DashboardSummaryCard title="Applicants" href="/team/hire/roles">
      <DashboardStat href="/team/hire/roles" icon={<Work size={20} aria-hidden />} value={live.length} label={live.length === 1 ? "Applicant so far" : "Applicants so far"} />
      {/* The funnel in order. Shortlisted is grey like the independent's "In progress" bar;
          each engagement takes its badge's colour: TRIAL orange, FULL-TIME blue, PART-TIME magenta. */}
      <DashboardBarChart
        bars={[
          { value: shortlisted, label: "Shortlisted", background: "bg-[#c9ccd0]" },
          { value: inTrial, label: "In trial", background: "bg-gradient-to-b from-brand-orange to-[#ffb371]" },
          { value: fullTime, label: "Full-time", background: "bg-gradient-to-b from-brand-blue to-[#7fd3fb]" },
          { value: partTime, label: "Part-time", background: "bg-gradient-to-b from-brand-magenta to-[#ff97e2]" },
        ]}
      />
    </DashboardSummaryCard>
  );
}

/** The Interviews card: the next few, each linking to the candidate's card with a Join button, or a note that nothing is scheduled. */
function UpcomingInterviews({ upcoming }: { upcoming: Interview[] }) {
  return upcoming.length === 0 ? (
    <p className="flex flex-1 items-center justify-center rounded-lg bg-white px-4 py-6 text-center text-[13px] leading-[1.4] text-ink-2">Nothing scheduled. Invite a candidate to interview to see it here.</p>
  ) : (
    <ul className="flex flex-col gap-2">
      {upcoming.map((iv) => {
        // The candidate's card in the pipeline, where the interview is joined, moved or cancelled; else the role's Interview column.
        const href = iv.roleSlug && iv.candidate ? `/team/hire/roles/${iv.roleSlug}/candidates/${iv.candidate}` : iv.roleSlug ? `/team/hire/roles/${iv.roleSlug}?stage=interview` : "/team/hire/roles";
        return (
          <li key={iv.id} className="flex items-center gap-3 rounded-lg bg-white p-3">
            <Avatar src={avatarOf(iv.independent)} size={32} />
            <Link href={href} className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.25] tracking-[0.2px]">
              {/* Not hired yet, so the surname stays an initial. */}
              <span className="truncate text-[14px] font-semibold text-ink hover:text-primary">{shortName(nameOf(iv.independent, iv.independent))}</span>
              {/* #312 — in the Team Builder's clock, with the talent's beside it. */}
              <span className="line-clamp-2 text-[12px] leading-[1.35] text-ink-2">{slotForTeam(iv.when, iv.offset, iv.independent)}</span>
            </Link>
            <Link href={href} className="flex h-10 shrink-0 items-center rounded-full bg-primary px-4 text-[13px] leading-[1.2] font-semibold tracking-[0.2px] text-white hover:brightness-110">
              Join
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** The Active contracts card: the first three engagements, a link to the rest, and + Hire — or an empty state before the first hire. */
function ActiveContracts({ active }: { active: Contract[] }) {
  return (
    <>
      {active.length === 0 ? (
        <p className="flex flex-1 items-center justify-center rounded-lg bg-white px-4 py-6 text-center text-[12px] leading-[1.4] text-ink-2">
          No active engagements yet. Hire an Independent to see their contract here.
        </p>
      ) : (
        // Capped so a long roster doesn't stretch every card in the row to its height —
        // the rest are one click away behind the header arrow.
        <ul className="flex flex-col gap-2">
          {active.slice(0, 3).map((c) => (
            <li key={c.slug}>
              <Link href={`/team/independents/${c.slug}`} className="flex items-center gap-3 rounded-lg bg-white p-3 hover:bg-surface-alt">
                <Avatar src={avatarOf(c.independent)} size={32} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.2] tracking-[0.2px]">
                  <span className="truncate text-[15px] font-semibold text-ink">{nameOf(c.slug, c.independent)}</span>
                  <span className="truncate text-[12px] text-ink-2">{c.role}</span>
                </span>
                <JobBadge type={c.type} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {active.length > 3 && (
        <Link href="/team/independents" className="mt-2 text-center text-[13px] leading-[1.2] font-medium tracking-[0.2px] text-primary hover:underline">
          View all {active.length} contracts
        </Link>
      )}
      <Link href="/team/hire" className="mt-2 flex items-center justify-center gap-1 rounded-lg bg-white py-2.5 text-[13px] leading-[1.2] font-semibold tracking-[0.2px] text-primary hover:bg-surface-alt">
        <Add size={18} aria-hidden /> Hire
      </Link>
    </>
  );
}
