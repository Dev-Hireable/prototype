"use client";

import Image from "next/image";
import Link from "next/link";
import { ICONS } from "@/components/admin/icons";
import { JobBadge, LinkButton, Page } from "@/components/independent/ui";
import { ME } from "@/lib/team/data";

const Forward = ICONS.arrowForward;
const NorthEast = ICONS.northEast;
const Work = ICONS.workOutline;
const Check = ICONS.check;

/** Figma "Home / Dashboard" (Team Builder): p 40, gap 40; greeting DM Sans 40; Complete-account card; three #f2f2f2 summary cards. */
export default function Dashboard() {
  return (
    <Page title="Dashboard" padded={false}>
      <div className="flex flex-col gap-10 p-10">
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-10 pb-4">
            <div className="flex w-[389px] flex-col gap-4">
              <p className="font-display text-[40px] leading-[1.2] text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
                Hey <span className="font-semibold">{ME.first}</span>, catching you up on today!
              </p>
              <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">Today, is 09 July 2026</p>
            </div>
            <div className="flex gap-2">
              <LinkButton href="/team/discover" variant="primary">
                Discover Independents
              </LinkButton>
              <LinkButton href="/team/hire/roles">Track candidates</LinkButton>
            </div>
          </div>

          {/* Complete account card — same Figma component as the Independent dashboard (11321:3058), 22% here */}
          <div className="relative flex h-[225px] w-[604px] shrink-0 flex-col justify-between overflow-hidden rounded-[40px] bg-gradient-to-b from-[#edf9ff] via-[#f6f9f9] to-[#fff9f3] p-4">
            <Image src="/independent/complete-profile.png" alt="" width={600} height={600} priority className="pointer-events-none absolute top-[-21px] left-[330px] size-[290px] max-w-none rotate-[6.6deg] opacity-80" />
            <Image src="/independent/complete-profile-blur.svg" alt="" width={1009} height={386} className="pointer-events-none absolute top-[53px] left-[-213px] max-w-none" />
            <div className="relative flex items-center gap-4">
              <Image src={ME.avatar} alt="" width={80} height={80} className="size-10 rounded-full bg-[#d2d8db] object-cover object-top" />
              <div className="flex flex-col gap-1 leading-[1.2] tracking-[0.2px]">
                <p className="text-[14px] font-semibold text-ink">Finish setting up your account</p>
                <p className="text-[12px] text-ink-2">Complete your account to start hiring.</p>
              </div>
            </div>
            <div className="relative flex w-full items-center gap-4 rounded-full border border-[#e5e5e5] bg-white py-2 pr-3 pl-4">
              {(
                [
                  ["Email", true, true],
                  ["Work style", true, false],
                  ["Company", false, true],
                  ["Payment", false, true],
                ] as const
              ).map(([label, done, grow], i) => (
                <span key={label} className="contents">
                  {i > 0 && (
                    <span className="flex h-8 w-0 items-center justify-center">
                      <Image src="/independent/divider.svg" alt="" width={32} height={1} className="h-px w-8 max-w-none flex-none rotate-90" />
                    </span>
                  )}
                  <span className={`flex items-center gap-2 text-[12px] leading-[1.2] tracking-[0.2px] whitespace-nowrap text-ink ${grow ? "min-w-px flex-1" : ""}`}>
                    <span className={`flex size-6 items-center justify-center rounded-full ${done ? "bg-primary text-white" : "border-[1.5px] border-[#e5e5e5]"}`}>{done && <Check size={16} aria-hidden />}</span>
                    {label}
                  </span>
                </span>
              ))}
              <Link href="/team/profile/company" className="flex h-10 w-16 items-center justify-center rounded-full bg-ink text-[14px] leading-[1.2] font-bold tracking-[0.2px] text-white">
                22%
              </Link>
            </div>
          </div>
        </div>

        <div className="flex items-stretch gap-4">
          <Summary title="Interviews" href="/team/hire/interviews">
            <div className="flex items-center gap-4 rounded-lg bg-white p-3">
              <div className="flex flex-1 flex-col gap-1 leading-[1.2] tracking-[0.2px]">
                <p className="text-[14px] font-semibold text-ink">Maria Santos</p>
                <p className="text-[10px] text-ink-2">July 9 ⋅ 9:15 – 10:00pm</p>
              </div>
              <Link href="/team/hire/interviews" className="flex h-6 items-center rounded-full bg-primary px-2 text-[10px] leading-[1.2] tracking-[0.2px] text-white">
                Join
              </Link>
            </div>
          </Summary>

          <Summary title="Applicants" href="/team/hire/roles">
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
            <div className="mt-4 flex flex-1 gap-2">
              {[
                ["8", "In trial", "bg-[#e5e5e5]", "h-12"],
                ["4", "Shortlisted", "bg-gradient-to-b from-primary via-[#64bceb] to-[#c8dbe4]", "h-8"],
              ].map(([n, l, bg, h]) => (
                <div key={l} className="flex flex-1 flex-col items-center gap-4">
                  <div className="text-center leading-[1.2] tracking-[0.2px]">
                    <p className="text-[14px] font-semibold text-ink">{n}</p>
                    <p className="text-[10px] text-ink-2">{l}</p>
                  </div>
                  <div className="flex w-full flex-1 flex-col justify-end">
                    <div className={`w-full rounded-t ${bg} ${h}`} />
                  </div>
                </div>
              ))}
            </div>
          </Summary>

          <Summary title="Contracts" href="/team/independents">
            <Link href="/team/independents/juan-dela-cruz" className="flex items-center gap-4 rounded-lg bg-white p-3">
              <div className="flex flex-1 flex-col gap-1 leading-[1.2] tracking-[0.2px]">
                <p className="text-[14px] font-semibold text-ink">Juan Dela Cruz</p>
                <p className="text-[10px] text-ink-2">Marketing Specialist · trial</p>
              </div>
              <JobBadge type="trial" />
            </Link>
          </Summary>
        </div>
      </div>
    </Page>
  );
}

function Summary({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="flex min-h-[259px] min-w-0 flex-1 flex-col gap-4 rounded-lg bg-surface-2 p-4">
      <div className="flex items-start justify-between">
        <h2 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">{title}</h2>
        <Link href={href} aria-label={`See more ${title.toLowerCase()}`} className="flex size-6 items-center justify-center rounded-full bg-white text-ink">
          <Forward size={16} aria-hidden />
        </Link>
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  );
}
