"use client";

import Link from "next/link";
import { ICONS } from "@/components/admin/icons";
import { Initials, JobBadge, Page } from "@/components/independent/ui";
import { DashboardBanner, DashboardBarChart, DashboardFrame, DashboardGreeting, DashboardHero, DashboardQuickAction, DashboardSetupCard, DashboardStat, DashboardSummaryCard, DashboardSummaryGrid, type DashboardChecklistItem } from "@/components/portal/dashboard";
import { DashboardTasks } from "@/components/portal/DashboardTasks";
import { trialClosed } from "@/lib/contract/lifecycle";
import { dayLabel, daysLeftLabel, sinceOrFrom } from "@/lib/demo/dates";
import { lifecycleOfDeal, useDeal } from "@/lib/demo/deal";
import type { Deal } from "@/lib/demo/deal";
import { JOB_TYPE_LABEL } from "@/lib/demo/job-types";
import { MARKETING_BANNER, ME, setupSteps } from "@/lib/independent/data";
import type { Application, Contract, Interview } from "@/lib/independent/data";
import { traitTagsFor } from "@/lib/demo/work-style";
import { useWallet } from "@/lib/independent/wallet";
import { useApplications } from "@/lib/independent/applications";
import { useIndependentContracts } from "@/lib/independent/contracts";
import { useIndependentAccount, useIndependentBanner } from "@/lib/independent/account";

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
        ? `Your trial ended — your work is with ${working.managerFirst} for the evaluation${life.trial ? `, due ${dayLabel(life.trial.evaluationDue)}` : ""}.`
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
  const { payouts } = useWallet();
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

        <Hero photo={profile.photo} workStyle={workStyle} steps={setupSteps({ payouts, applications, workStyle, bio: profile.bio })} />

        <DashboardSummaryGrid
          main={[
            // IN-090 — straight to the work: their open tasks, most pressing first, each a click from its sheet.
            working && (
              <DashboardTasks key="tasks"
                side="independent"
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

/** The greeting with its two quick actions, beside the card that walks through setting up the profile. */
function Hero({ photo, workStyle, steps }: { photo: string; workStyle: readonly number[]; steps: readonly DashboardChecklistItem[] }) {
  return (
    <DashboardHero>
      <DashboardGreeting name={ME.first}>
        <DashboardQuickAction title="Find your next role" body="Browse roles matched to your work style." href="/independent/jobs" icon={<Search size={20} aria-hidden />} />
        <DashboardQuickAction title="Complete your profile" body="A fuller profile lifts your match score." href="/independent/profile?edit=profile" icon={<Account size={20} aria-hidden />} />
      </DashboardGreeting>

      <DashboardSetupCard
        avatarSrc={photo}
        title="Finish setting up your profile"
        description="Complete your profile to boost role matches."
        completionHref="/independent/profile?edit=profile"
        items={steps}
        profileHref="/independent/profile"
        traits={traitTagsFor(workStyle, "independent")}
        completeDescription="Your profile is live. These are the work-style traits companies match you on."
      />
    </DashboardHero>
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
  return (
    <DashboardSummaryCard title="Interviews" href="/independent/jobs/interviews">
      {upcoming.length === 0 ? (
        <p className="flex flex-1 items-center justify-center rounded-lg bg-white px-4 py-6 text-center text-[12px] leading-[1.4] text-ink-2">No interviews scheduled. Apply to a role and a Team Builder can invite you.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {upcoming.slice(0, 3).map((iv) => (
            <li key={iv.id} className="flex items-center gap-4 rounded-lg bg-white p-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1 tracking-[0.2px]">
                <p className="truncate text-[14px] font-semibold text-ink">{iv.role}</p>
                <p className="truncate text-[12px] text-ink-2">{iv.when}</p>
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
        <p className="flex flex-1 items-center justify-center rounded-lg bg-white px-4 py-6 text-center text-[12px] leading-[1.4] text-ink-2">No active contracts yet. Apply to a role and your engagements appear here.</p>
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
                      {c.title} · {left === null ? `${sinceOrFrom(c.started)} ${c.started}` : daysLeftLabel(left)}
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
