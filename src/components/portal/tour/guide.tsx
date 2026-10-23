"use client";

import Image from "next/image";
import type { ComponentProps, ReactNode } from "react";
import { GUIDES, type TourSide } from "@/lib/portal/tours";
import { GUIDE_LOOK } from "./guide-look";

/**
 * The guide's card, one design for a tour's steps and the help menu: white, rounded, a wash of the
 * guide's colour along its top, and the guide standing on it, shoulders and all. The space they
 * stand in is part of the card's box, so whatever places the card places them with it. With
 * `nameTag` their name sits beside their head, for a card whose words don't say it.
 */
export function GuideCard({ side, nameTag = false, className = "", children, ...rest }: { side: TourSide; nameTag?: boolean; className?: string; children: ReactNode } & Omit<ComponentProps<"div">, "children" | "className">) {
  return (
    <div {...rest} className={`relative pt-[94px] text-ink ${className}`}>
      {/* The portrait's flat foot rests 2px behind the card's edge, so there's never a gap under it. */}
      <Image src={GUIDES[side].figure} alt="" width={83} height={96} unoptimized draggable={false} className="pointer-events-none absolute top-0 right-7 h-[96px] w-auto select-none" loading="eager" />
      {nameTag && <GuideName side={side} className="absolute top-[26px] right-[116px] z-10 px-3 py-1 text-[14px] leading-[1.4] shadow-[0_2px_6px_rgba(0,0,0,.16)]" />}
      <div className="relative overflow-hidden rounded-[24px] bg-white p-5 shadow-[0_12px_32px_rgba(0,0,0,.24)]">
        <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b to-transparent ${GUIDE_LOOK[side].wash}`} />
        <div className="relative flex flex-col gap-4">{children}</div>
      </div>
    </div>
  );
}

/** The guide's name as their name tag, in their colour. */
function GuideName({ side, className = "inline-block px-2 align-baseline leading-[1.4]" }: { side: TourSide; className?: string }) {
  return <span className={`rounded-full font-semibold tracking-[0.2px] whitespace-nowrap ${GUIDE_LOOK[side].tag} ${className}`}>{GUIDES[side].name}</span>;
}

/** A line of the guide's with their name in it: the name is shown as their name tag. A line says it once at most. */
export function WithGuideName({ side, text }: { side: TourSide; text: string }) {
  const name = GUIDES[side].name;
  const at = text.indexOf(name);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <GuideName side={side} />
      {text.slice(at + name.length)}
    </>
  );
}
