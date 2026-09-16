"use client";

import Link from "next/link";
import { ICONS } from "@/components/admin/icons";
import { DashboardBarChart, DashboardFrame, DashboardGreeting, DashboardHero, DashboardSetupCard, DashboardSummaryCard, DashboardSummaryGrid } from "@/components/portal/dashboard";
import { JobBadge, LinkButton, Page } from "@/components/independent/ui";
import { ME } from "@/lib/team/data";

const NorthEast = ICONS.northEast;
const Work = ICONS.workOutline;

/** Figma "Home / Dashboard" (Team Builder): p 40, gap 40; greeting DM Sans 40; Complete-account card; three #f2f2f2 summary cards. */
export default function Dashboard() {
  return (
    <Page title="Dashboard" heading="default" padded={false}>
      <DashboardFrame>
        <DashboardHero>
          <DashboardGreeting name={ME.first} dateClassName="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">
            <LinkButton href="/team/discover" variant="primary">
              Discover Independents
            </LinkButton>
            <LinkButton href="/team/hire/roles">Track candidates</LinkButton>
          </DashboardGreeting>

          <DashboardSetupCard
            avatarSrc={ME.avatar}
            avatarClassName="object-top"
            title="Finish setting up your account"
            description="Complete your account to start hiring."
            completion="22%"
            completionHref="/team/profile/company"
            checklistClassName="gap-4"
            uncheckedStyle="border"
            items={[
              { label: "Email", done: true, grow: true },
              { label: "Work style", done: true },
              { label: "Company", done: false, grow: true },
              { label: "Payment", done: false, grow: true },
            ]}
          />
        </DashboardHero>

        <DashboardSummaryGrid>
          <DashboardSummaryCard title="Interviews" href="/team/hire/interviews">
            <div className="flex items-center gap-4 rounded-lg bg-white p-3">
              <div className="flex flex-1 flex-col gap-1 leading-[1.2] tracking-[0.2px]">
                <p className="text-[14px] font-semibold text-ink">Maria Santos</p>
                <p className="text-[10px] text-ink-2">July 9 ⋅ 9:15 – 10:00pm</p>
              </div>
              <Link href="/team/hire/interviews" className="flex h-6 items-center rounded-full bg-primary px-2 text-[10px] leading-[1.2] tracking-[0.2px] text-white">
                Join
              </Link>
            </div>
          </DashboardSummaryCard>

          <DashboardSummaryCard title="Applicants" href="/team/hire/roles">
            <div className="flex items-center gap-4 rounded-lg bg-white px-4 py-3">
              <span className="flex size-10 items-center justify-center rounded-full border border-border bg-white text-ink">
                <Work size={20} aria-hidden />
              </span>
              <div className="flex-1 whitespace-nowrap">
                <p className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px] text-ink">16</p>
                <p className="text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">Applicants this month</p>
              </div>
              <Link href="/team/hire/roles" aria-label="Open applicants" className="rounded-full bg-white p-1 text-ink">
                <NorthEast size={24} aria-hidden />
              </Link>
            </div>
            <DashboardBarChart
              labelClassName="text-center leading-[1.2] tracking-[0.2px]"
              bars={[
                { value: "8", label: "In trial", background: "bg-[#e5e5e5]", height: "h-12" },
                { value: "4", label: "Shortlisted", background: "bg-gradient-to-b from-primary via-[#64bceb] to-[#c8dbe4]", height: "h-8" },
              ]}
            />
          </DashboardSummaryCard>

          <DashboardSummaryCard title="Contracts" href="/team/independents">
            <Link href="/team/independents/juan-dela-cruz" className="flex items-center gap-4 rounded-lg bg-white p-3">
              <div className="flex flex-1 flex-col gap-1 leading-[1.2] tracking-[0.2px]">
                <p className="text-[14px] font-semibold text-ink">Juan Dela Cruz</p>
                <p className="text-[10px] text-ink-2">Marketing Specialist · trial</p>
              </div>
              <JobBadge type="trial" />
            </Link>
          </DashboardSummaryCard>
        </DashboardSummaryGrid>
      </DashboardFrame>
    </Page>
  );
}
