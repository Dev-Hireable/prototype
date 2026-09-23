"use client";

import Link from "next/link";
import { ICONS } from "@/components/admin/icons";
import { JobBadge, Page } from "@/components/independent/ui";
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
} from "@/components/portal/dashboard";
import { Avatar } from "@/components/team/ui";
import { useDemo } from "@/lib/team/store";
import { usePersisted } from "@/lib/demo/live";
import { CONTRACT_NAMES, liveIndependents, MARKETING_BANNER, setupSteps } from "@/lib/team/data";
import { traitTagsFor } from "@/lib/demo/work-style";

const Work = ICONS.workOutline;
const Add = ICONS.add;
const Search = ICONS.search;

const nameOf = (slug: string, independent: string) => CONTRACT_NAMES[slug] ?? liveIndependents().find((i) => i.slug === independent)?.name ?? slug;
const avatarOf = (independent: string) => liveIndependents().find((i) => i.slug === independent)?.avatar ?? "/team/juan.jpg";

/**
 * Figma "Home / Dashboard" (Team Builder), built to TB-001: dismissible marketing banner,
 * 5-step setup checklist with per-step shortcuts, active contracts widget with a + Hire button
 * and an empty state, and two always-visible quick action cards.
 */
export default function Dashboard() {
  /* TB-120/121 — the greeting and the avatar follow whatever the profile page saved. */
  /* Contracts and interviews come from the store: ending a contract or scheduling an interview
     elsewhere in the app has to show up in these widgets. */
  const { profile, contracts, interviews, company, cards, roles, candidates, workStyle } = useDemo();
  /** Active = every trial and full-time engagement that hasn't ended. */
  const active = contracts.filter((c) => c.status.label !== "Ended");
  /** TB-002 — counted from the pipeline, not numbers typed into the card. */
  const live = candidates.filter((c) => !c.dropped);
  const shortlisted = live.filter((c) => c.stage !== "applied" && c.stage !== "hired").length;
  // One bar per kind of engagement: "In trial" used to count every active contract, so a trial
  // that converted to full-time was still reported as in trial.
  const inTrial = active.filter((c) => c.type === "trial").length;
  const fullTime = active.filter((c) => c.type === "full-time").length;
  /* TB-001 — computed from what is actually set up, so finishing a step moves the bar. */
  const steps = setupSteps({ company, cards, roles, workStyle });
  const [dismissed, setDismissed] = usePersisted("team.bannerDismissed", "");
  /** Next few interviews that haven't happened yet. */
  const upcoming = interviews.filter((iv) => !iv.past).slice(0, 3);

  return (
    <Page title="Dashboard" padded={false}>
      <DashboardFrame>
        <DashboardBanner banner={MARKETING_BANNER} dismissed={dismissed === MARKETING_BANNER.id} onDismiss={() => setDismissed(MARKETING_BANNER.id)} />

        <DashboardHero>
          <DashboardGreeting name={profile.name.split(" ")[0]} dateClassName="text-[15px] leading-[1.2] tracking-[0.2px] text-ink-2">
            <DashboardQuickAction title="Create a Role" body="Post a job and start collecting applications." href="/team/hire" icon={<Add size={20} aria-hidden />} />
            <DashboardQuickAction title="Discover Independents" body="Browse matched talent and invite them to apply." href="/team/discover" icon={<Search size={20} aria-hidden />} />
          </DashboardGreeting>

          <DashboardSetupCard
            avatarSrc={profile.photo}
            avatarClassName="object-top"
            title="Finish setting up your account"
            description="Complete your account to start hiring."
            completionHref="/team/profile/company"
            items={steps}
            traits={traitTagsFor(workStyle, "team")}
            completeDescription="Your account is ready. These are the work-style traits candidates are matched against."
          />
        </DashboardHero>

        <DashboardSummaryGrid>
          <DashboardSummaryCard title="Interviews" href="/team/hire/interviews">
            {upcoming.length === 0 ? (
              <p className="flex flex-1 items-center justify-center rounded-lg bg-white px-4 py-6 text-center text-[13px] leading-[1.4] text-ink-2">Nothing scheduled. Invite a candidate to interview to see it here.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {upcoming.map((iv) => (
                  <li key={iv.id} className="flex items-center gap-3 rounded-lg bg-white p-3">
                    <Avatar src={avatarOf(iv.independent)} size={32} />
                    {/* The candidate's card in the pipeline, as on the Interviews page. */}
                    <Link
                      href={iv.roleSlug && iv.candidate ? `/team/hire/roles/${iv.roleSlug}/candidates/${iv.candidate}` : "/team/hire/interviews"}
                      className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.25] tracking-[0.2px]"
                    >
                      <span className="truncate text-[14px] font-semibold text-ink hover:text-primary">{nameOf(iv.independent, iv.independent)}</span>
                      <span className="truncate text-[12px] text-ink-2">{iv.when.replace(/^\w{3} /, "")}</span>
                    </Link>
                    <Link href="/team/hire/interviews" className="flex h-10 shrink-0 items-center rounded-full bg-primary px-4 text-[13px] leading-[1.2] font-semibold tracking-[0.2px] text-white hover:brightness-110">
                      Join
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </DashboardSummaryCard>

          <DashboardSummaryCard title="Applicants" href="/team/hire/roles">
            <DashboardStat href="/team/hire/roles" icon={<Work size={20} aria-hidden />} value={live.length} label={live.length === 1 ? "Applicant so far" : "Applicants so far"} />
            {/* The funnel in order. Shortlisted is grey like the independent's "In progress" bar;
                each engagement takes its badge's colour, TRIAL orange and FULL-TIME blue. */}
            <DashboardBarChart
              bars={[
                { value: shortlisted, label: "Shortlisted", background: "bg-[#c9ccd0]" },
                { value: inTrial, label: "In trial", background: "bg-gradient-to-b from-brand-orange to-[#ffb371]" },
                { value: fullTime, label: "Full-time", background: "bg-gradient-to-b from-brand-blue to-[#7fd3fb]" },
              ]}
            />
          </DashboardSummaryCard>

          {/* Active contracts: every ongoing Trial and Full-Time engagement, + Hire at the bottom. */}
          <DashboardSummaryCard title="Active contracts" href="/team/independents">
            {active.length === 0 ? (
              <p className="flex flex-1 items-center justify-center rounded-lg bg-white px-4 py-6 text-center text-[12px] leading-[1.4] text-ink-2">
                No active engagements yet. Hire an independent to see their contract here.
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
          </DashboardSummaryCard>
        </DashboardSummaryGrid>

      </DashboardFrame>
    </Page>
  );
}
