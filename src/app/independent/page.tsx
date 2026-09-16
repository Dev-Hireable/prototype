"use client";

import Link from "next/link";
import { ICONS } from "@/components/admin/icons";
import { Button, JobBadge, LinkButton, Page } from "@/components/independent/ui";
import { DashboardBarChart, DashboardFrame, DashboardGreeting, DashboardHero, DashboardSetupCard, DashboardSummaryCard, DashboardSummaryGrid } from "@/components/portal/dashboard";
import { ME } from "@/lib/independent/data";

const NorthEast = ICONS.northEast;
const Work = ICONS.work;

/** Figma "Home / Dashboard": p 40, gap 40; greeting DM Sans 40; three #f2f2f2 summary cards. */
export default function Dashboard() {
  return (
    <Page title="Dashboard" heading="default" padded={false}>
      <DashboardFrame>
        <DashboardHero>
          <DashboardGreeting name={ME.first}>
            <LinkButton href="/independent/jobs" variant="primary">
              Find your next role
            </LinkButton>
            <LinkButton href="/independent/profile/edit">Complete your profile</LinkButton>
          </DashboardGreeting>

          <DashboardSetupCard
            avatarSrc={ME.avatar}
            title="Finish setting up your profile"
            description="Complete your profile to boost role matches."
            completion="40%"
            completionHref="/independent/profile/edit"
            items={[
              { label: "Email", done: true },
              { label: "Work style", done: true },
              { label: "Profile", done: false },
              { label: "Payment", done: false },
              { label: "Apply to role", done: false },
            ]}
          />
        </DashboardHero>

        <DashboardSummaryGrid>
          <DashboardSummaryCard title="Interviews" href="/independent/jobs/interviews">
            <div className="flex items-center gap-4 rounded-lg bg-white p-3">
              <div className="flex flex-1 flex-col gap-1 tracking-[0.2px]">
                <p className="text-[14px] font-semibold text-ink">Social Media Manager</p>
                <p className="text-[10px] text-ink-2">July 9 ⋅ 9:15 – 10:00pm</p>
              </div>
              <Button variant="primary" size="xs">
                Join
              </Button>
            </div>
          </DashboardSummaryCard>

          <DashboardSummaryCard title="Applications" href="/independent/jobs/applications">
            <div className="flex items-center gap-4 rounded-lg bg-white px-4 py-3">
              <span className="flex size-10 items-center justify-center rounded-full border border-border bg-white text-ink-2">
                <Work size={20} aria-hidden />
              </span>
              <div className="flex-1">
                <p className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px] text-ink">16</p>
                <p className="text-[12px] tracking-[0.2px] text-ink-2">Applications sent</p>
              </div>
              <Link href="/independent/jobs/applications" aria-label="Open applications" className="rounded-full bg-white p-1 text-ink">
                <NorthEast size={24} aria-hidden />
              </Link>
            </div>
            <DashboardBarChart
              bars={[
                { value: "8", label: "Active", background: "bg-[#e5e5e5]", height: "h-12" },
                { value: "4", label: "Matched", background: "bg-gradient-to-b from-primary via-[#64bceb] to-[#c8dbe4]", height: "h-8" },
              ]}
            />
          </DashboardSummaryCard>

          <DashboardSummaryCard title="Contracts" href="/independent/contracts">
            <Link href="/independent/contracts/sales-manager" className="flex items-center gap-4 rounded-lg bg-white p-3">
              <div className="flex flex-1 flex-col gap-1 tracking-[0.2px]">
                <p className="text-[14px] font-semibold text-ink">Content Strategist</p>
                <p className="text-[10px] text-ink-2">Marketing Specialist</p>
              </div>
              <JobBadge type="trial" />
            </Link>
          </DashboardSummaryCard>
        </DashboardSummaryGrid>
      </DashboardFrame>
    </Page>
  );
}
