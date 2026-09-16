import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ICONS } from "@/components/admin/icons";
import { PORTAL_CONTENT_CLASS } from "@/components/portal/layout";

const Check = ICONS.check;

export type DashboardChecklistItem = { label: string; done: boolean };

export function DashboardFrame({ children }: { children: ReactNode }) {
  return <div className={`${PORTAL_CONTENT_CLASS} flex flex-col gap-10 p-10`}>{children}</div>;
}

export function DashboardHero({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-6">{children}</div>;
}

export function DashboardSummaryGrid({ children }: { children: ReactNode }) {
  return <div className="flex items-stretch gap-4">{children}</div>;
}

export function DashboardGreeting({ name, dateClassName = "text-[14px] tracking-[0.2px] text-ink-2", children }: { name: string; dateClassName?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-10 pb-4">
      <div className="flex w-[389px] flex-col gap-4">
        <p className="font-display text-[40px] leading-[1.2] text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
          Hey <span className="font-semibold">{name}</span>, catching you up on today!
        </p>
        <p className={dateClassName}>Today, is 09 July 2026</p>
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

export type DashboardBar = { value: string; label: string; background: string; height: string };

export function DashboardBarChart({ bars, labelClassName = "text-center tracking-[0.2px]" }: { bars: readonly DashboardBar[]; labelClassName?: string }) {
  return (
    <div className="mt-4 flex flex-1 gap-2">
      {bars.map((bar) => (
        <div key={bar.label} className="flex flex-1 flex-col items-center gap-4">
          <div className={labelClassName}>
            <p className="text-[14px] font-semibold text-ink">{bar.value}</p>
            <p className="text-[10px] text-ink-2">{bar.label}</p>
          </div>
          <div className="flex w-full flex-1 flex-col justify-end">
            <div className={`w-full rounded-t ${bar.background} ${bar.height}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSetupCard({
  avatarSrc,
  avatarClassName = "",
  title,
  description,
  completion,
  completionHref,
  items,
  uncheckedStyle = "soft",
}: {
  avatarSrc: string;
  avatarClassName?: string;
  title: string;
  description: string;
  completion: string;
  completionHref: string;
  items: readonly DashboardChecklistItem[];
  uncheckedStyle?: "border" | "soft";
}) {
  return (
    <div className="relative flex min-h-[225px] w-full max-w-[604px] min-w-[min(100%,_604px)] flex-1 flex-col justify-between overflow-hidden rounded-[40px] bg-gradient-to-b from-[#edf9ff] via-[#f6f9f9] to-[#fff9f3] p-4">
      <Image src="/independent/complete-profile.png" alt="" width={600} height={600} priority className="pointer-events-none absolute top-[-21px] left-[330px] size-[290px] max-w-none rotate-[6.6deg] opacity-80" />
      <Image src="/independent/complete-profile-blur.svg" alt="" width={1009} height={386} className="pointer-events-none absolute top-[53px] left-[-213px] max-w-none" />
      <div className="relative flex items-center gap-4">
        <Image src={avatarSrc} alt="" width={80} height={80} className={`size-10 rounded-full bg-[#d2d8db] object-cover ${avatarClassName}`} />
        <div className="flex flex-col gap-1 leading-[1.2] tracking-[0.2px]">
          <p className="text-[14px] font-semibold text-ink">{title}</p>
          <p className="text-[12px] text-ink-2">{description}</p>
        </div>
      </div>
      <div className="relative flex w-full min-w-0 items-center justify-between gap-[8px] overflow-x-auto rounded-full border border-[#e5e5e5] bg-white py-2 pr-3 pl-4">
        {items.map((item, index) => (
          <span key={item.label} className="contents">
            {index > 0 && (
              <span className="flex h-8 w-0 shrink-0 items-center justify-center">
                <Image src="/independent/divider.svg" alt="" width={32} height={1} className="h-px w-8 max-w-none flex-none rotate-90" />
              </span>
            )}
            <span className="flex shrink-0 items-center gap-[8px] px-[8px] text-[12px] leading-[1.2] tracking-[0.2px] whitespace-nowrap text-ink">
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${item.done ? "bg-primary text-white" : uncheckedStyle === "border" ? "border-[1.5px] border-[#e5e5e5]" : "bg-[#f2f2f2]"}`}>
                {item.done ? <Check size={16} aria-hidden /> : uncheckedStyle === "soft" && <span className="size-4 rounded-full border border-[#e5e5e5]" />}
              </span>
              {item.label}
            </span>
          </span>
        ))}
      </div>
      <Link href={completionHref} className="absolute top-4 right-4 flex h-10 w-16 items-center justify-center rounded-full bg-ink text-[14px] leading-[1.2] font-bold tracking-[0.2px] text-white">
        {completion}
      </Link>
    </div>
  );
}

export function DashboardSummaryCard({ title, href, children }: { title: string; href: string; children: ReactNode }) {
  const Forward = ICONS.arrowForward;
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
