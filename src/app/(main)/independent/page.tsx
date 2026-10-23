"use client";

import Link from "next/link";
import { ICONS } from "@/components/icons";
import { Initials, JobBadge, Page } from "@/components/portal/ui";
import { DashboardBanner, DashboardBarChart, DashboardFrame, DashboardGreeting, DashboardHero, DashboardQuickAction, DashboardSetupCard, DashboardStat, DashboardSummaryCard, DashboardSummaryGrid, type DashboardChecklistItem } from "@/components/portal/dashboard";
import { DashboardTasks } from "@/components/portal/dashboard-tasks";
import { trialClosed } from "@/lib/contract/lifecycle";
import { dayLabel, daysLeftLabel, sinceOrFrom } from "@/lib/portal/dates";
import { lifecycleOfDeal, useDeal } from "@/lib/demo/deal";
import type { Deal } from "@/lib/demo/deal";
import { JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import { KYC_NOTE, MARKETING_BANNER, ME, SETUP_STEP, setupSteps } from "@/lib/independent/data";
import type { Application, Contract, Interview } from "@/lib/independent/data";
import { traitTagsFor } from "@/lib/demo/work-style";
import { useApplications } from "@/lib/independent/applications";
import { useIndependentContracts } from "@/lib/independent/contracts";
import { useIndependentAccount, useIndependentBanner } from "@/lib/independent/account";
import { useInterviewTime } from "@/lib/independent/interview-time";

const Work = ICONS.work;
const Search = ICONS.search;
const Account = ICONS.account;

/**
 * The tasks card once the trial is over and its work is shut: `frozen` says what the work waits
 * for, and `lead` puts the offer to review at the top while one is out.
 */
function workOnHold(deal: Deal | null, working: Contract | undefined) {
  /** Where the contract is: once the trial is over its work waits on the evaluation, or on the offer. */
  const life = working ? lifecycleOfDeal(deal) : null;
  const offer = life?.phase === "offer" && deal?.conversion ? deal.conversion : undefined;
  const lead = offer && working ? { href: `/independent/contracts/${working.slug}/offer`, title: `Review your ${JOB_TYPE_LABEL[offer.type].toLowerCase()} offer`, meta: `From ${working.company}` } : undefined;
  const frozen =
    life && working && trialClosed(life)
      ? life.phase === "evaluation"
        ? `Your trial ended. Your work is with ${working.managerFirst} for the evaluation${life.trial ? `, due ${dayLabel(life.trial.evaluationDue)}` : ""}.`
        : life.phase === "offer"
          ? "Your work reopens when you accept the offer."
          : `Your trial is complete and ${working.managerFirst} has sent your evaluation.`
      : undefined;
  return { lead, frozen };
}

export default function Dashboard() {
  const { profile, workStyle } = useIndependentAccount();
  const { contracts } = useIndependentContracts();
  const { applications, interviews } = useApplications();
  const banner = useIndependentBanner();
  /** IN-004 — every ongoing engagement, not a hardcoded card. */
  const active = contracts.filter((c) => c.status.label !== "Ended" && c.status.label !== "Contract complete");
  /** The interviews actually booked on the engagement — this read an empty seed, so it never showed one. */
  const upcoming = interviews.filter((iv) => !iv.past && (iv.status === "starts" || iv.status === "accepted"));
  /** The contract with a work list (the live engagement), while it runs — its tasks get their own card. */
  const deal = useDeal();
  const working = deal?.contract ? active.find((c) => c.slug === deal.roleSlug) : undefined;
  const { lead, frozen } = workOnHold(deal, working);

  return (
    <Page title="Dashboard" padded={false}>
      <DashboardFrame>
        {/* IN-002 — dismissible, and the whole strip disappears when there is no active banner. */}
        <DashboardBanner banner={MARKETING_BANNER} dismissed={banner.dismissed} onDismiss={banner.dismiss} />

        <Hero photo={profile.photo} workStyle={workStyle} steps={setupSteps({ applications, workStyle, profile })} tasks={working && { href: `/independent/contracts/${working.slug}?assignee=independent`, about: working.title }} />

        <DashboardSummaryGrid
          main={[
            // IN-090 — straight to the work: their open tasks, in the order they put them, each a click from its sheet.
            working && (
              <DashboardTasks key="tasks"
                side="independent"
                me={profile.name}
                base={`/independent/contracts/${working.slug}`}
                allHref={`/independent/contracts/${working.slug}?assignee=independent`}
                about={`${working.title} at ${working.company}`}
                counterpart={working.managerFirst}
                lead={lead}
                frozen={frozen}
              />
            ),

            <ApplicationsCard key="Applications" applications={applications} />,
          ]}
          side={[
            // The next interviews actually on the books, not one fixed row.
            <InterviewsCard key="Interviews" upcoming={upcoming} />,

            // IN-004 — every ongoing engagement with the company, role, type and where it's up to.
            <ContractsCard key="Active contracts" active={active} />,
          ]}
        />
      </DashboardFrame>
    </Page>
  );
}

/** Whether the checklist step with this label is still to do. */
const isOpen = (steps: readonly DashboardChecklistItem[], label: string) => steps.some((s) => s.label === label && !s.done);

/** The card's heading while setup is open, naming what's left: the profile until it's set up, then the first application. */
function setupHeading(steps: readonly DashboardChecklistItem[]) {
  return !isOpen(steps, SETUP_STEP.profile) && isOpen(steps, SETUP_STEP.apply)
    ? { title: "Apply to your first role", description: "Your profile is ready. Apply to a role to finish setting up." }
    : { title: "Finish setting up your profile", description: "Complete your profile to boost role matches." };
}

/** The greeting with its two quick actions, beside the card that walks through setting up the profile (on a phone, between them). */
function Hero({ photo, workStyle, steps, tasks }: { photo: string; workStyle: readonly number[]; steps: readonly DashboardChecklistItem[]; tasks?: { href: string; about: string } }) {
  const heading = setupHeading(steps);
  return (
    <DashboardHero
      greeting={<DashboardGreeting name={ME.first} />}
      card={
        <DashboardSetupCard
          side="independent"
          avatarSrc={photo}
          title={heading.title}
          description={heading.description}
          items={steps}
          note={KYC_NOTE}
          traits={traitTagsFor(workStyle, "independent")}
          matching="Companies match you on these tags."
          profileHref="/independent/profile"
        />
      }
      actions={
        <>
          <DashboardQuickAction tour="find-role" title="Find your next role" body="Browse roles matched to your work style." href="/independent/jobs" icon={<Search size={20} aria-hidden />} />
          {/* Profile help only while the profile step is open; once it's done, the trial's work, if there is one. */}
          {isOpen(steps, SETUP_STEP.profile) ? (
            <DashboardQuickAction title="Complete your profile" body="A fuller profile lifts your match score." href="/independent/profile" icon={<Account size={20} aria-hidden />} />
          ) : (
            tasks && <DashboardQuickAction title="Go to my tasks" body={`Your open work on ${tasks.about}.`} href={tasks.href} icon={<Work size={20} aria-hidden />} />
          )}
        </>
      }
    />
  );
}

/** The Applications card: how many were sent, and how many are still in progress against hired. */
function ApplicationsCard({ applications }: { applications: Application[] }) {
  return (
    <DashboardSummaryCard title="Applications" href="/independent/jobs/applications">
      {/* Counted from the applications you've actually sent. */}
      <DashboardStat href="/independent/jobs/applications" icon={<Work size={20} aria-hidden />} value={applications.length} label={applications.length === 1 ? "Application sent" : "Applications sent"} />
      {/* Split by where they've actually got to, rather than two fixed bars. */}
      <DashboardBarChart
        bars={[
          { value: applications.filter((a) => a.stage !== "hired" && a.stage !== "offer_accepted").length, label: "In progress", background: "bg-[#c9ccd0]" },
          { value: applications.filter((a) => a.stage === "hired" || a.stage === "offer_accepted").length, label: "Hired", background: "bg-gradient-to-b from-primary to-[#64bceb]" },
        ]}
      />
    </DashboardSummaryCard>
  );
}

/** The Interviews card: the next three, each opening its application — or a note that none are scheduled. */
function InterviewsCard({ upcoming }: { upcoming: Interview[] }) {
  /** Each time in the talent's clock, with the Team Builder's beside it. */
  const clock = useInterviewTime();
  return (
    <DashboardSummaryCard title="Interviews" href="/independent/jobs/interviews">
      {upcoming.length === 0 ? (
        // It fills the card where the card is levelled with the one beside it; a phone stacks them, so there it's as tall as its words.
        <p className="flex items-center justify-center rounded-lg bg-white px-4 py-6 text-center text-[12px] leading-[1.4] text-ink-2 md:flex-1">No interviews scheduled. Apply to a role and a Team Builder can invite you.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {upcoming.slice(0, 3).map((iv) => (
            <li key={iv.id} className="flex items-center gap-4 rounded-lg bg-white p-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1 tracking-[0.2px]">
                <p className="truncate text-[14px] font-semibold text-ink">{iv.role}</p>
                <p className="text-[12px] leading-[1.4] text-ink-2">{clock.both(iv)}</p>
              </div>
              <Link href={iv.roleHref} className="flex h-10 shrink-0 items-center rounded-full bg-primary px-4 text-[13px] leading-[1.2] font-semibold tracking-[0.2px] text-white hover:brightness-110">
                {iv.status === "starts" ? "Respond" : "Open"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardSummaryCard>
  );
}

/** The Active contracts card: the first three, each with its type and time left or since, and a link to the rest. */
function ContractsCard({ active }: { active: Contract[] }) {
  return (
    <DashboardSummaryCard title="Active contracts" href="/independent/contracts">
      {active.length === 0 ? (
        // Fills a levelled card, as Interviews' note does; as tall as its words on a phone.
        <p className="flex items-center justify-center rounded-lg bg-white px-4 py-6 text-center text-[12px] leading-[1.4] text-ink-2 md:flex-1">No active contracts yet. Apply to a role and your engagements appear here.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {active.slice(0, 3).map((c) => {
            const left = c.left;
            return (
              <li key={c.slug}>
                <Link href={`/independent/contracts/${c.slug}`} className="flex items-center gap-3 rounded-lg bg-white p-3 hover:bg-surface-alt">
                  <Initials text={c.initials} className="size-8 shrink-0 text-[11px]" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.2] tracking-[0.2px]">
                    <span className="truncate text-[14px] font-semibold text-ink">{c.company}</span>
                    <span className="truncate text-[12px] text-ink-2">
                      {c.title} · {left === null ? `${sinceOrFrom(c.started)} ${c.started}` : daysLeftLabel(left, c.over)}
                    </span>
                  </span>
                  <JobBadge type={c.type} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {active.length > 3 && (
        <Link href="/independent/contracts" className="mt-2 text-center text-[13px] leading-[1.2] font-medium tracking-[0.2px] text-primary hover:underline">
          View all {active.length} contracts
        </Link>
      )}
    </DashboardSummaryCard>
  );
}
