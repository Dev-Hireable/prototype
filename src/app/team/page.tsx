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
  DashboardSummaryCard,
  DashboardSummaryGrid,
} from "@/components/portal/dashboard";
import { Avatar } from "@/components/team/ui";
import { useDemo } from "@/lib/team/store";
import { usePersisted } from "@/lib/demo/live";
import { CONTRACT_NAMES, independents, MARKETING_BANNER, setupSteps } from "@/lib/team/data";
import { COMPANY_WORK_STYLE } from "@/lib/team/deal-view";
import { traitTagsFor } from "@/lib/independent/data";

const NorthEast = ICONS.northEast;
const Work = ICONS.workOutline;
const Add = ICONS.add;
const Search = ICONS.search;

const nameOf = (slug: string, independent: string) => CONTRACT_NAMES[slug] ?? independents.find((i) => i.slug === independent)?.name ?? slug;
const avatarOf = (independent: string) => independents.find((i) => i.slug === independent)?.avatar ?? "/team/juan.jpg";

/**
 * Figma "Home / Dashboard" (Team Builder), built to TB-001: dismissible marketing banner,
 * 5-step setup checklist with per-step shortcuts, active contracts widget with a + Hire button
 * and an empty state, and two always-visible quick action cards.
 */
export default function Dashboard() {
  /* TB-120/121 — the greeting and the avatar follow whatever the profile page saved. */
  /* Contracts and interviews come from the store: ending a contract or scheduling an interview
     elsewhere in the app has to show up in these widgets. */
  const { profile, contracts, interviews, company, cards, roles, candidates } = useDemo();
  /** TB-002 — counted from the pipeline, not three numbers typed into the card. */
  const live = candidates.filter((c) => !c.dropped);
  const inTrial = contracts.filter((c) => c.status.label !== "Ended").length;
  const shortlisted = live.filter((c) => c.stage !== "applied" && c.stage !== "hired").length;
  /* TB-001 — computed from what is actually set up, so finishing a step moves the bar. */
  const steps = setupSteps({ company, cards, roles });
  const [dismissed, setDismissed] = usePersisted("team.bannerDismissed", "");
  /** Active = every trial and full-time engagement that hasn't ended. */
  const active = contracts.filter((c) => c.status.label !== "Ended");
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
            traits={traitTagsFor(COMPANY_WORK_STYLE)}
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
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.25] tracking-[0.2px]">
                      <p className="truncate text-[14px] font-semibold text-ink">{nameOf(iv.independent, iv.independent)}</p>
                      <p className="truncate text-[12px] text-ink-2">{iv.when.replace(/^\w{3} /, "")}</p>
                    </div>
                    <Link href="/team/hire/interviews" className="flex h-10 shrink-0 items-center rounded-full bg-primary px-4 text-[13px] leading-[1.2] font-semibold tracking-[0.2px] text-white hover:brightness-110">
                      Join
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </DashboardSummaryCard>

          <DashboardSummaryCard title="Applicants" href="/team/hire/roles">
            <div className="flex items-center gap-4 rounded-lg bg-white px-4 py-3">
              <span className="flex size-10 items-center justify-center rounded-full border border-border bg-white text-ink">
                <Work size={20} aria-hidden />
              </span>
              <div className="flex-1 whitespace-nowrap">
                <p className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px] text-ink">{live.length}</p>
                <p className="text-[13px] leading-[1.2] tracking-[0.2px] text-ink-2">{live.length === 1 ? "Applicant so far" : "Applicants so far"}</p>
              </div>
              <Link href="/team/hire/roles" aria-label="Open applicants" className="rounded-full bg-white p-1 text-ink">
                <NorthEast size={24} aria-hidden />
              </Link>
            </div>
            <DashboardBarChart
              bars={[
                { value: inTrial, label: "In trial", background: "bg-[#c9ccd0]" },
                { value: shortlisted, label: "Shortlisted", background: "bg-gradient-to-b from-primary to-[#64bceb]" },
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
