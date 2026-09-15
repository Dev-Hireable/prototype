"use client";

import Image from "next/image";
import Link from "next/link";
import { Page } from "@/components/independent/ui";

/** Figma "JobTypeCard" · Enabled / Hover variants — illustrations and their hover twins are Figma exports (284-based; hover assets are the same shapes at 1.05×). */
const CARDS = [
  {
    kind: "trial",
    title: "Test Independents",
    body: "Run a paid, short-term trial on real work to evaluate performance and fit before committing to a full-time hire.",
    art: "/team/test-independents.svg",
    hover: "/team/test-independents-hover.svg",
    w: 284,
    h: 153.76,
    top: -12.26,
    ring: "group-hover:border-brand-orange",
    glow: "radial-gradient(321px at 50% 50%, rgba(255,255,255,0) 40%, rgba(255,221,191,.5) 70%, rgba(255,187,126,1) 100%)",
  },
  {
    kind: "full-time",
    title: "Build Team",
    body: "Hire for a long-term role with defined responsibilities, strong collaboration, and room for growth.",
    art: "/team/build-team.svg",
    hover: "/team/build-team-hover.svg",
    w: 284,
    h: 181,
    top: -12.5,
    ring: "group-hover:border-primary",
    glow: "radial-gradient(321px at 50% 50%, rgba(255,255,255,0) 40%, rgba(158,223,255,.5) 70%, rgba(110,208,255,.75) 85%, rgba(61,192,255,1) 100%)",
  },
] as const;

/** Figma "Hire / Create job post · start / · Test Independents hovered / · Build Team hovered": DM Sans 32 heading + two 320px cards that grow to 336 on hover. */
export default function CreateRole() {
  return (
    <Page title="Create Role" padded={false}>
      <div className="flex h-full flex-col items-center justify-center gap-4 p-20">
        <div className="flex w-[544px] flex-col gap-2 text-center leading-[1.5]">
          <h2 className="font-display text-[32px] font-semibold text-black" style={{ fontVariationSettings: '"opsz" 14' }}>
            What type of role are you creating?
          </h2>
          <p className="text-[16px] tracking-[0.2px] text-ink-2">Choose how you want to start working together.</p>
        </div>
        <div className="flex items-center">
          {CARDS.map((c, i) => (
            <Link key={c.kind} href={`/team/hire/new?type=${c.kind}`} className={`group flex size-[380px] items-center justify-center ${i === 0 ? "-mr-[30px]" : ""}`}>
              <span className={`relative flex size-[320px] flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-border bg-white p-4 transition duration-300 ease-out group-hover:scale-105 group-hover:shadow-[0_6px_8px_rgba(0,0,0,.10)] ${c.ring}`}>
                <span aria-hidden className="absolute inset-0 opacity-0 transition duration-300 ease-out group-hover:opacity-100" style={{ backgroundImage: c.glow }} />
                <span className="relative h-24 w-[284px]">
                  <Image src={c.art} alt="" width={c.w} height={c.h} className="absolute left-0 max-w-none transition duration-300 ease-out group-hover:opacity-0" style={{ top: c.top, width: c.w, height: c.h }} />
                  <Image src={c.hover} alt="" width={c.w} height={c.h} className="absolute left-0 max-w-none opacity-0 transition duration-300 ease-out group-hover:opacity-100" style={{ top: c.top, width: c.w, height: c.h }} />
                </span>
                <span className="relative flex w-full flex-col gap-1 text-center tracking-[0.2px]">
                  <span className="text-[16px] leading-[1.5] font-semibold text-ink">{c.title}</span>
                  <span className="text-[14px] leading-[1.2] text-ink-2">{c.body}</span>
                </span>
                <span className="relative flex h-10 items-center justify-center rounded-lg border border-border bg-white px-4 text-[14px] font-medium text-ink opacity-0 transition duration-300 ease-out group-hover:opacity-100">Post a Job</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </Page>
  );
}
