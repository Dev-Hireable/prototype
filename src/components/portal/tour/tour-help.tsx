"use client";

import Image from "next/image";
import { useState } from "react";
import { ICONS } from "@/components/icons";
import { Button } from "@/components/portal/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTourRecords, type TourRecord } from "@/lib/demo/tours";
import { GUIDES, homeTour, tourFor, type Tour } from "@/lib/portal/tours";
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
      <PopoverContent side="right" align="end" sideOffset={8} className="w-80 gap-3 p-4">
        <TourMenu onPick={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

/** The guide's hello and the tours to take here: the rail's Help popover, and on a phone a part of the Menu sheet. */
export function TourMenu({ onPick }: { onPick: () => void }) {
  const menu = useTourMenu();
  const records = useTourRecords();
  if (!menu) return null;
  const { side, pathname, start: onStart } = menu;
  const guide = GUIDES[side];
  const here = tourFor(pathname);
  const home = homeTour(side);
  const tours = here && here.id !== home.id ? [here, home] : [home];
  const go = (id: string, step?: number) => {
    onPick();
    onStart(id, step);
  };
  return (
    <>
      <div className="flex items-center gap-3">
        <Image src={guide.avatar} alt="" width={40} height={40} unoptimized className="size-10 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-[14px] leading-[1.2] font-semibold text-ink">Need a hand?</p>
          <p className="text-[13px] leading-[1.3] text-ink-2">{side === "team" ? `I'm ${guide.name}. Pick a tour and I'll walk you through it.` : `I'm ${guide.name}! Pick a tour and I'll show you around.`}</p>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {tours.map((t) => (
          <TourRow key={t.id} tour={t} record={records[t.id]} here={t.id === here?.id} onGo={go} />
        ))}
      </ul>
    </>
  );
}

/** One tour in the menu: its name and where it stands, with Resume (when it stopped part way) and Start / Restart. */
function TourRow({ tour, record, here, onGo }: { tour: Tour; record: TourRecord | undefined; here: boolean; onGo: (id: string, step?: number) => void }) {
  const resumable = record?.status === "skipped" && record.step > 0;
  return (
    <li className="flex flex-col gap-2.5 rounded-lg bg-surface-2 p-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[14px] leading-[1.2] font-semibold text-ink">{here ? `${tour.name} (this page)` : tour.name}</span>
        <span className="text-[12px] leading-[1.2] text-ink-2">{standing(tour, record)}</span>
      </div>
      <div className="flex items-center gap-2">
        {resumable && (
          <Button size="sm" variant="primary" onClick={() => onGo(tour.id, record.step)}>
            <Resume size={16} aria-hidden /> Resume
          </Button>
        )}
        <Button size="sm" variant={resumable ? "secondary" : "primary"} onClick={() => onGo(tour.id)}>
          {record && <Restart size={16} aria-hidden />}
          {record ? "Restart" : "Start"}
        </Button>
      </div>
    </li>
  );
}
