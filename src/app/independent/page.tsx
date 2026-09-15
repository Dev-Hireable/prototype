"use client";

import Image from "next/image";
import Link from "next/link";
import { ICONS } from "@/components/admin/icons";
import { Button, JobBadge, LinkButton, Page } from "@/components/independent/ui";
import { ME } from "@/lib/independent/data";

const Forward = ICONS.arrowForward;
const NorthEast = ICONS.northEast;
const Work = ICONS.work;
const Check = ICONS.check;

/** Figma "Home / Dashboard": p 40, gap 40; greeting DM Sans 40; three #f2f2f2 summary cards. */
export default function Dashboard() {
  return (
    <Page title="Dashboard" padded={false}>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 p-10">
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-10 pb-4">
            <div className="flex w-[389px] flex-col gap-4">
              <p className="font-display text-[40px] leading-[1.2] text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
                Hey <span className="font-semibold">{ME.first}</span>, catching you up on today!
              </p>
              <p className="text-[14px] tracking-[0.2px] text-ink-2">Today, is 09 July 2026</p>
            </div>
            <div className="flex gap-2">
              <LinkButton href="/independent/jobs" variant="primary">
                View roles
              </LinkButton>
              <LinkButton href="/independent/jobs/applications">Track applications</LinkButton>
            </div>
          </div>

          {/* Complete profile card — Figma 11321:3058 (604×225, radius 40, p 16). Art = exported PNG + "Rectangle 14" blur SVG. */}
          <div className="relative flex h-[225px] w-[604px] shrink-0 flex-col justify-between overflow-hidden rounded-[40px] bg-gradient-to-b from-[#edf9ff] via-[#f6f9f9] to-[#fff9f3] p-4">
            <Image
              src="/independent/complete-profile.png"
              alt=""
              width={600}
              height={600}
              priority
              className="pointer-events-none absolute top-[-21px] left-[330px] size-[290px] max-w-none rotate-[6.6deg] opacity-80"
            />
            <Image
              src="/independent/complete-profile-blur.svg"
              alt=""
              width={1009}
              height={386}
              className="pointer-events-none absolute top-[53px] left-[-213px] max-w-none"
            />
            <div className="relative flex items-center gap-4">
              <Image src={ME.avatar} alt="" width={80} height={80} className="size-10 rounded-full bg-[#d2d8db] object-cover" />
              <div className="flex flex-col gap-1 leading-[1.2] tracking-[0.2px]">
                <p className="text-[14px] font-semibold text-ink">Finish setting up your profile</p>
                <p className="text-[12px] text-ink-2">Complete your profile to boost role matches.</p>
              </div>
            </div>
            <div className="relative flex w-full items-center gap-4 rounded-full border border-[#e5e5e5] bg-white py-2 pr-3 pl-4">
              {(
                [
                  ["Email", true, true],
                  ["Work style", true, false],
                  ["Profile", false, true],
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
                    <span className={`flex size-6 items-center justify-center rounded-full ${done ? "bg-primary text-white" : "bg-[#f2f2f2]"}`}>
                      {done ? <Check size={16} aria-hidden /> : <span className="size-4 rounded-full border border-[#e5e5e5]" />}
                    </span>
                    {label}
                  </span>
                </span>
              ))}
              <Link href="/independent/profile/edit" className="flex h-10 w-16 items-center justify-center rounded-full bg-ink text-[14px] leading-[1.2] font-bold tracking-[0.2px] text-white">
                50%
              </Link>
            </div>
          </div>
        </div>

        <div className="flex items-stretch gap-4">
          <Summary title="Interviews" href="/independent/jobs/interviews">
            <div className="flex items-center gap-4 rounded-lg bg-white p-3">
              <div className="flex flex-1 flex-col gap-1 tracking-[0.2px]">
                <p className="text-[14px] font-semibold text-ink">Social Media Manager</p>
                <p className="text-[10px] text-ink-2">July 9 ⋅ 9:15 – 10:00pm</p>
              </div>
              <Button variant="primary" size="xs">
                Join
              </Button>
            </div>
          </Summary>

          <Summary title="Applications" href="/independent/jobs/applications">
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
            <div className="mt-4 flex flex-1 gap-2">
              {[
                ["8", "Active", "bg-[#e5e5e5]", "h-12"],
                ["4", "Matched", "bg-gradient-to-b from-primary via-[#64bceb] to-[#c8dbe4]", "h-8"],
              ].map(([n, l, bg, h]) => (
                <div key={l} className="flex flex-1 flex-col items-center gap-4">
                  <div className="text-center tracking-[0.2px]">
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

          <Summary title="Contracts" href="/independent/contracts">
            <Link href="/independent/contracts/sales-manager" className="flex items-center gap-4 rounded-lg bg-white p-3">
              <div className="flex flex-1 flex-col gap-1 tracking-[0.2px]">
                <p className="text-[14px] font-semibold text-ink">Content Strategist</p>
                <p className="text-[10px] text-ink-2">Marketing Specialist</p>
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
