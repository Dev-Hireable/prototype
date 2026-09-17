import { MdOutlineAutorenew, MdOutlineBalance, MdOutlineBolt, MdOutlineChatBubbleOutline, MdOutlineGroups, MdOutlineSchedule } from "react-icons/md";
import type { IconType } from "react-icons";

/**
 * Work-style trait badge, matching the real app's `WorktraitTag`: a pill coloured by the trait it
 * came from, with that trait's icon. The six colours and the order are the product's, so a tag
 * reads the same here as it does there.
 */
const TRAITS: { icon: IconType; bg: string }[] = [
  { icon: MdOutlineBalance, bg: "#66c8ff" }, // Decision making
  { icon: MdOutlineAutorenew, bg: "#ff739a" }, // Adaptability
  { icon: MdOutlineBolt, bg: "#ff73d1" }, // Responsiveness
  { icon: MdOutlineSchedule, bg: "#ffa366" }, // Time management
  { icon: MdOutlineGroups, bg: "#c86bfa" }, // Cooperativeness
  { icon: MdOutlineChatBubbleOutline, bg: "#b4ffff" }, // Communication
];

export function TraitTag({ label, trait }: { label: string; trait: number }) {
  const { icon: Icon, bg } = TRAITS[trait % TRAITS.length];
  return (
    <span className="inline-flex h-7 items-center justify-center gap-1.5 rounded-full px-2.5 text-ink" style={{ backgroundColor: bg }}>
      <Icon size={16} aria-hidden className="shrink-0" />
      <span className="text-[12px] leading-none font-semibold tracking-wide uppercase">{label}</span>
    </span>
  );
}
