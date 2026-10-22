"use client";

import Image from "next/image";
import { useState } from "react";
import { ICONS } from "@/components/icons";
import { Badge } from "@/components/portal/badge";
import { Button } from "@/components/portal/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTourRecords, type TourRecord } from "@/lib/demo/tours";
import { GUIDES, homeTour, tourFor, type Tour, type TourSide } from "@/lib/portal/tours";
import { GuideCard, WithGuideName } from "./guide";
import { GUIDE_LOOK } from "./guide-look";
import { useTourMenu } from "./tour-provider";

const Help = ICONS.help;
const Resume = ICONS.resume;
const Restart = ICONS.restart;

/** Where a tour stands, in a few words. */
function standing(tour: Tour, record: TourRecord | undefined): string {
  if (!record) return `${tour.steps.length} steps`;
  if (record.status === "done") return "Finished";
  return record.step > 0 ? `Stopped at step ${record.step + 1} of ${tour.steps.length}` : "Skipped";
}

/**
 * Help, the "?" in the sidebar's rail above the profile avatar, on every portal screen: opens a
 * menu with this screen's tour and the getting-started one, each to resume where it stopped or
 * start again from the top. In the rail it never covers a page's own controls (a corner button
 * sat on Messages' Send). A phone has no rail: the same menu is in its Menu sheet (TourMenu).
 */
export function TourHelp() {
  const [open, setOpen] = useState(false);
  if (!useTourMenu()) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-tour="help"
        aria-label="Help and tours"
        className="group absolute bottom-[68px] left-2 z-20 flex h-[68px] w-[88px] flex-col items-center gap-1 px-2 py-4 text-[10px] leading-[1.2] tracking-[0.2px] whitespace-nowrap text-ink-2 transition-colors outline-none hover:text-ink focus-visible:text-ink data-popup-open:font-semibold data-popup-open:text-accent-ink"
      >
        {/* The sections' hover card, so it reads as one of them. */}
        <span aria-hidden className="absolute inset-1 -z-10 rounded-xl transition-colors group-hover:bg-white group-focus-visible:bg-white group-focus-visible:outline-2 group-focus-visible:outline-primary group-data-popup-open:bg-white" />
        <Help size={24} aria-hidden className="shrink-0" />
        Help
      </PopoverTrigger>
      {/* No frame of its own: the menu is the tours' own card, guide standing on top included. */}
      <PopoverContent side="right" align="end" sideOffset={8} className="w-80 gap-0 border-0 bg-transparent p-0 shadow-none">
        <TourMenu onPick={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

/** What the guide says above the tours, their name in it. */
const helloLine = (side: TourSide) => (side === "team" ? `I'm ${GUIDES.team.name}. Pick a tour and I'll walk you through it.` : `I'm ${GUIDES.independent.name}! Pick a tour and I'll show you around.`);

/**
 * The guide's hello and the tours to take here. In the rail's Help popover it's the tours' own card
 * (GuideCard), as a tour step is: the guide standing on it, their line, then the tours. On a phone
 * it's part of the Menu sheet, where the hello is a row that opens the tours, which start folded away.
 */
export function TourMenu({ onPick, collapsible = false }: { onPick: () => void; collapsible?: boolean }) {
  const menu = useTourMenu();
  const records = useTourRecords();
  const [open, setOpen] = useState(!collapsible);
  if (!menu) return null;
  const { side, pathname, start: onStart } = menu;
  const here = tourFor(pathname);
  const home = homeTour(side);
  const tours = here && here.id !== home.id ? [here, home] : [home];
  const go = (id: string, step?: number) => {
    onPick();
    onStart(id, step);
  };
  const list = open && (
    <ul className={collapsible ? "flex flex-col gap-2" : "flex flex-col divide-y divide-border border-t border-border"}>
      {tours.map((t) => (
        <TourRow key={t.id} tour={t} record={records[t.id]} here={t.id === here?.id} boxed={collapsible} onGo={go} />
      ))}
    </ul>
  );
  if (!collapsible)
    return (
      <GuideCard side={side}>
        <div className="flex flex-col gap-1.5">
          <span className="text-[18px] leading-[1.35] font-bold tracking-[0.2px]">Need a hand?</span>
          <span className="text-[14px] leading-[1.5] tracking-[0.2px] text-ink-2">
            <WithGuideName side={side} text={helloLine(side)} />
          </span>
        </div>
        {list}
      </GuideCard>
    );
  return (
    <>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="-m-1 flex items-center gap-3 rounded-lg p-1 text-left focus-visible:outline-2 focus-visible:outline-primary">
        <GuideTile side={side} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[14px] leading-[1.2] font-semibold text-ink">Need a hand?</span>
          <span className="text-[13px] leading-[1.4] text-ink-2">
            <WithGuideName side={side} text={helloLine(side)} />
          </span>
        </span>
        <ICONS.chevron size={22} aria-hidden className={`shrink-0 text-ink-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {list}
    </>
  );
}

/** The guide in small, for the phone's Menu sheet: a tile of their colour, shoulders resting on its foot. */
function GuideTile({ side }: { side: TourSide }) {
  return (
    <span aria-hidden className={`flex size-14 shrink-0 items-end justify-center overflow-hidden rounded-xl bg-gradient-to-b to-white outline -outline-offset-1 outline-border ${GUIDE_LOOK[side].wash}`}>
      <Image src={GUIDES[side].figure} alt="" width={45} height={52} unoptimized draggable={false} className="h-[52px] w-auto" />
    </span>
  );
}

/**
 * One tour in the menu: its name (and whether it's this page's), where it stands, and on the right
 * Resume when it stopped part way, then Start, or Restart for one already taken. Only a next step
 * (Start, Resume) is the blue button; going round again is the quiet one.
 */
function TourRow({ tour, record, here, boxed, onGo }: { tour: Tour; record: TourRecord | undefined; here: boolean; /** A row of its own (the phone's Menu sheet), not a line of the card's list. */ boxed: boolean; onGo: (id: string, step?: number) => void }) {
  const resumable = record?.status === "skipped" && record.step > 0;
  return (
    <li className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3 ${boxed ? "rounded-lg px-3" : ""}`}>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2 text-[14px] leading-[1.2] font-semibold text-ink">
          {tour.name}
          {here && <Badge tone="info">This page</Badge>}
        </span>
        <span className="text-[12px] leading-[1.2] text-ink-2">{standing(tour, record)}</span>
      </div>
      <div className="flex items-center gap-2">
        {resumable && (
          <Button size="sm" variant="primary" onClick={() => onGo(tour.id, record.step)}>
            <Resume size={16} aria-hidden /> Resume
          </Button>
        )}
        <Button size="sm" variant={record ? "secondary" : "primary"} onClick={() => onGo(tour.id)}>
          {record && <Restart size={16} aria-hidden />}
          {record ? "Restart" : "Start"}
        </Button>
      </div>
    </li>
  );
}
