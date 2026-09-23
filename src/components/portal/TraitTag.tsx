import type { ReactElement } from "react";
import { MdOutlineAutorenew, MdOutlineBalance, MdOutlineBolt, MdOutlineChatBubbleOutline, MdOutlineGroups, MdOutlineSchedule } from "react-icons/md";
import type { IconType } from "react-icons";
import { Chip } from "@/components/independent/ui";
import { Tip } from "@/components/portal/Tip";
import { WORK_STYLE_TRAITS, type WorkStyleTag } from "@/lib/demo/work-style";

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

export function TraitTag({ tag, view }: { tag: WorkStyleTag; view?: "self" | "other" }) {
  const { icon: Icon, bg } = TRAITS[tag.trait % TRAITS.length];
  return (
    <TagMeaning tag={tag} view={view}>
      <span tabIndex={0} className={`inline-flex h-7 items-center justify-center gap-1.5 rounded-full px-2.5 text-ink ${FOCUS}`} style={{ backgroundColor: bg }}>
        <Icon size={16} aria-hidden className="shrink-0" />
        <span className="text-[12px] leading-none font-semibold tracking-wide uppercase">{tag.label}</span>
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
