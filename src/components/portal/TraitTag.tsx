import type { ReactElement } from "react";
import { MdOutlineAutorenew, MdOutlineBalance, MdOutlineBolt, MdOutlineChatBubbleOutline, MdOutlineGroups, MdOutlineSchedule } from "react-icons/md";
import type { IconType } from "react-icons";
import { Chip } from "@/components/independent/ui";
import { Tip } from "@/components/portal/Tip";
import { WORK_STYLE_TRAITS, type WorkStyleTag } from "@/lib/demo/work-style";
import { nunitoSans } from "@/web-app/lib/fonts/nunito-sans";

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

/**
 * Says what a work-style badge stands for, on hover or keyboard focus: the trait, then the
 * sentence the real app's results page uses for that tag. Those sentences speak to whoever took
 * the quiz ("You make calls quickly…"), so on someone else's badge (`view="other"`) the tooltip
 * quotes the answer they gave instead. The child is the badge itself, a focusable native element
 * so the tooltip can attach to it.
 */
export function TagMeaning({ tag, view = "self", children }: { tag: WorkStyleTag; view?: "self" | "other"; children: ReactElement }) {
  return (
    <Tip
      label={
        <span className="flex max-w-[240px] flex-col gap-0.5 text-left">
          <span className="font-semibold">{WORK_STYLE_TRAITS[tag.trait]}</span>
          {view === "self" ? tag.meaning : `Their answer: “${tag.answer}”`}
        </span>
      }
    >
      {children}
    </Tip>
  );
}

/** The ring a focused badge shows, since tabbing to one is how a keyboard user reads its tooltip. */
const FOCUS = "cursor-help outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary";

/**
 * `md` is the badge the dashboards show. `lg` is Figma "Worktrait Tags" as the talent profile
 * draws them (px 12 / py 8, gap 4, 16px icon, Nunito Sans Medium 14), in the real app's face.
 */
const SIZE = {
  md: { box: "h-7 items-center gap-1.5 px-2.5", label: "text-[12px] leading-none font-semibold tracking-wide" },
  lg: { box: "items-end gap-1 px-3 py-2", label: `${nunitoSans.className} text-[14px] leading-[1.2] font-medium tracking-[0.2px]` },
};

export function TraitTag({ tag, view, size = "md" }: { tag: WorkStyleTag; view?: "self" | "other"; size?: keyof typeof SIZE }) {
  const { icon: Icon, bg } = TRAITS[tag.trait % TRAITS.length];
  const s = SIZE[size];
  return (
    <TagMeaning tag={tag} view={view}>
      <span tabIndex={0} className={`inline-flex justify-center rounded-full text-ink ${s.box} ${FOCUS}`} style={{ backgroundColor: bg }}>
        <Icon size={16} aria-hidden className="shrink-0" />
        <span className={`${s.label} uppercase`}>{tag.label}</span>
      </span>
    </TagMeaning>
  );
}

/** A work-style tag as a plain chip (profile pages, the company card), with the same tooltip. */
export function WorkStyleChip({ tag, view }: { tag: WorkStyleTag; view?: "self" | "other" }) {
  return (
    <TagMeaning tag={tag} view={view}>
      <span tabIndex={0} className={`inline-flex rounded ${FOCUS}`}>
        <Chip>{tag.label}</Chip>
      </span>
    </TagMeaning>
  );
}
