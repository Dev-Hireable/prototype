import { GUIDES, type TourSide } from "@/lib/portal/tours";

/** Whether a line says the guide's name, and so carries their name tag itself (WithGuideName). */
export const namesGuide = (side: TourSide, ...lines: string[]): boolean => lines.some((l) => l.includes(GUIDES[side].name));

/**
 * Each guide's colours, from their portrait's own backdrop: Hiro's blue, Hira's pink. `tag` is the
 * name tag, `wash` a tint that fades down from the top (the tour card, the help menu's portrait),
 * `bar` the tour's progress bar (a deeper pink than the tag for Hira, so it still shows on white).
 */
export const GUIDE_LOOK: Record<TourSide, { tag: string; wash: string; bar: string }> = {
  team: { tag: "bg-[#007acc] text-white", wash: "from-[#e3f1fb]", bar: "bg-[#007acc]" },
  independent: { tag: "bg-[#ffa0d4] text-ink", wash: "from-[#ffeef7]", bar: "bg-[#e0559f]" },
};
