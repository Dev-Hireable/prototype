"use client";

import Link from "next/link";
import { ICONS } from "@/components/admin/icons";
import { Initials, JobBadge, Page } from "@/components/independent/ui";
import { DashboardBanner, DashboardBarChart, DashboardFrame, DashboardGreeting, DashboardHero, DashboardQuickAction, DashboardSetupCard, DashboardStat, DashboardSummaryCard, DashboardSummaryGrid } from "@/components/portal/dashboard";
import { daysLeftLabel, sinceOrFrom } from "@/lib/demo/dates";
import { usePersisted } from "@/lib/demo/live";
import { MARKETING_BANNER, ME, setupSteps } from "@/lib/independent/data";
import { traitTagsFor } from "@/lib/demo/work-style";
import { useDemo } from "@/lib/independent/store";

const Work = ICONS.work;
const Search = ICONS.search;
const Account = ICONS.account;

/** Figma "Home / Dashboard": p 40, gap 40; greeting DM Sans 40; three #f2f2f2 summary cards. */
export default function Dashboard() {
  const { payouts, applications, contracts, profile, workStyle, interviews } = useDemo();
  const [dismissed, setDismissed] = usePersisted("ind.bannerDismissed", "");
  /** IN-004 — every ongoing engagement, not a hardcoded card. */
  const active = contracts.filter((c) => c.status.label !== "Ended" && c.status.label !== "Contract complete");
  /** The interviews actually booked on the engagement — this read an empty seed, so it never showed one. */
  const upcoming = interviews.filter((iv) => !iv.past && (iv.status === "starts" || iv.status === "accepted"));

  return (
    <Page title="Dashboard" padded={false}>
      <DashboardFrame>
        {/* IN-002 — dismissible, and the whole strip disappears when there is no active banner. */}
        <DashboardBanner banner={MARKETING_BANNER} dismissed={dismissed === MARKETING_BANNER.id} onDismiss={() => setDismissed(MARKETING_BANNER.id)} />

        <DashboardHero>
          <DashboardGreeting name={ME.first}>
            <DashboardQuickAction title="Find your next role" body="Browse roles matched to your work style." href="/independent/jobs" icon={<Search size={20} aria-hidden />} />
            <DashboardQuickAction title="Complete your profile" body="A fuller profile lifts your match score." href="/independent/profile?edit=profile" icon={<Account size={20} aria-hidden />} />
          </DashboardGreeting>

          <DashboardSetupCard
            avatarSrc={profile.photo}
            title="Finish setting up your profile"
            description="Complete your profile to boost role matches."
            completionHref="/independent/profile?edit=profile"
            items={setupSteps({ payouts, applications, workStyle, bio: profile.bio })}
            traits={traitTagsFor(workStyle, "independent")}
            completeDescription="Your profile is live. These are the work-style traits companies match you on."
          />
        </DashboardHero>

        <DashboardSummaryGrid>
          {/* The next interviews actually on the books, not one fixed row. */}
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

          {/* IN-004 — every ongoing engagement with the company, role, type and where it's up to. */}
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

        </DashboardSummaryGrid>
      </DashboardFrame>
    </Page>
  );
}
