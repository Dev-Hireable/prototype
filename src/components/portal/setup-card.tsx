"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { Meter } from "@/components/portal/meter";
import { RetakeQuizDialog } from "@/components/portal/retake-quiz-dialog";
import { TraitTag } from "@/components/portal/trait-tag";
import { useNextRetake } from "@/lib/demo/retake";
import type { WorkStyleSide, WorkStyleTag } from "@/lib/demo/work-style";

/**
 * `href` is the shortcut link an incomplete step exposes (TB-001 / IN-003).
 * `hint` is the one line explaining what the step actually asks for.
 * `requires` names the steps that must be done first — until they are, this step is locked:
 * not a link, and it says what is still missing. Applying to a role with no profile and no
 * payout method is the case this exists for.
 */
export type DashboardChecklistItem = { label: string; done: boolean; href?: string; hint?: string; requires?: string[]; /** The open step's button, when "Complete" (or "Verify") doesn't say what it does. */ action?: string };

const Check = ICONS.check;
const Lock = ICONS.lock;

type SetupCardProps = {
  side: WorkStyleSide;
  avatarSrc: string;
  avatarClassName?: string;
  title: string;
  description: string;
  items: readonly DashboardChecklistItem[];
  /** One line under the open checklist: what comes later, said early. */
  note?: string;
  /** Shown in place of the checklist once it is finished. */
  traits: readonly WorkStyleTag[];
  /** The line under "Your work style" once setup is done: who is matched on these tags. */
  matching: string;
  /** Where the tags are shown in full, and retaken, once setup is done. */
  profileHref: string;
};

/**
 * "Action required" panel (TB-001 / IN-003).
 *
 * Replaces the horizontal step pills, which had to be a single row of five and so fought every
 * layout below ~1000px. This is the standard dashboard pattern instead: a vertical list where
 * each row has room for a label, a line of explanation, and its own button.
 *
 * The list is always open — a setup checklist people are meant to finish shouldn't hide its
 * actions behind a click. Once every step is done the card stays where it is and turns into the
 * work style the setup produced: the dashboard doesn't reshuffle itself the moment someone
 * finishes setting up, and the space keeps saying something. Nothing is left to do then, so the
 * progress goes with the checklist.
 *
 * Acceptance criteria the pills used to cover still hold: the percentage and progress bar are
 * derived from `items`, completed steps are checked off and greyed, each incomplete step links
 * to the section that completes it, and steps with unmet `requires` are locked.
 */
export function DashboardSetupCard({ side, avatarSrc, avatarClassName = "", title, description, items, note, traits, matching, profileHref }: SetupCardProps) {
  const heading = useId();
  const done = items.filter((i) => i.done).length;
  const complete = done === items.length;

  return (
    // Stretches to the greeting column's height either way. Once setup is done the head stacks the
    // photo over the copy from the top (see SetupHeading) and the tags take the rest (TagPanel).
    // data-tour: the getting-started tours point it out (@/lib/portal/tours).
    <section data-tour="setup" aria-labelledby={heading} className="relative flex w-full min-w-0 flex-col overflow-hidden rounded-[40px] bg-gradient-to-b from-[#edf9ff] via-[#f6f9f9] to-[#fff9f3] p-4">
      {/* Sized as a share of the card and anchored right, so it scales with the card instead of
          drifting over the header copy — a fixed 330px-from-left offset put it on top of the
          text as the card grew. The header text is capped below so the two never meet. */}
      <Image src="/independent/complete-profile.png" alt="" width={600} height={600} preload className="pointer-events-none absolute -top-10 right-2 aspect-square w-[40%] max-w-[330px] rotate-[6.6deg] opacity-80 max-md:-top-6 max-md:-right-2 max-md:w-[32%]" />
      <Image src="/independent/complete-profile-blur.svg" alt="" width={1009} height={386} className="pointer-events-none absolute top-[53px] left-[-213px] max-w-none" />

      {complete ? (
        <>
          {/* The line on matching sits right over the tags it's about. */}
          <SetupHeading id={heading} avatarSrc={avatarSrc} avatarClassName={avatarClassName} title="Your work style" description={matching} stacked>
            <WorkStyleActions side={side} profileHref={profileHref} />
          </SetupHeading>
          <TagPanel traits={traits} />
        </>
      ) : (
        <>
          <SetupHeading id={heading} avatarSrc={avatarSrc} avatarClassName={avatarClassName} title={title} description={description}>
            <SetupProgress done={done} total={items.length} />
          </SetupHeading>
          <Checklist items={items} />
          {note && (
            <p className="relative mt-3 flex items-center gap-1.5 px-1 text-[13px] leading-[1.35] tracking-[0.2px] text-ink-2">
              <ICONS.idCheck size={16} aria-hidden className="shrink-0" />
              {note}
            </p>
          )}
        </>
      )}
    </section>
  );
}

/**
 * The card's head: the avatar, what's left to do (or the work style, once nothing is), and the
 * progress while there's some. `stacked` puts the photo over the copy, from the top of the card:
 * the done card is shorter than the greeting beside it, and a row of three short lines left
 * empty bands above and below.
 */
function SetupHeading({ id, avatarSrc, avatarClassName, title, description, stacked = false, children }: { id: string; avatarSrc: string; avatarClassName: string; title: string; description: string; stacked?: boolean; children?: ReactNode }) {
  return (
    // On a phone the art takes the card's top-right third, so the copy keeps to the rest of the width.
    <div className={`relative flex max-md:pr-[34%] ${stacked ? "flex-col items-start gap-3" : "items-center gap-4 max-md:items-start max-md:gap-3"}`}>
      <Image src={avatarSrc} alt="" width={96} height={96} className={`shrink-0 rounded-full bg-[#d2d8db] object-cover ${stacked ? "size-14 max-md:size-12" : "size-12 max-md:size-10"} ${avatarClassName}`} />
      {/* Capped so the copy wraps before it runs under the decorative art on the right. */}
      <div className="flex min-w-0 max-w-[50%] flex-1 flex-col gap-1.5 leading-[1.25] tracking-[0.2px] max-md:max-w-none">
        <h2 id={id} className="text-[18px] font-semibold text-ink max-md:text-[16px]">
          {title}
        </h2>
        <p className="text-[14px] text-ink-2 max-md:text-[13px]">{description}</p>
        {children}
      </div>
    </div>
  );
}

/** TB-001's progress bar, as the one bar the cards draw (Meter), with the percentage on it. */
function SetupProgress({ done, total }: { done: number; total: number }) {
  return (
    <div className="mt-1 max-w-72">
      <Meter parts={[{ value: done, color: "var(--color-primary)", label: "Done" }]} total={total} pill={`${Math.round((done / total) * 100)}%`} label={`Account setup: ${done} of ${total} steps done`} />
    </div>
  );
}

/** The head's actions are links in its own type, so they read as part of it rather than as a form's buttons. */
const ACTION = "inline-flex items-center gap-1 text-[13px] leading-[1.2] font-semibold text-primary hover:underline";

/**
 * Under the line on matching once setup is done: the way to the profile, where the tags are shown in
 * full, and Retake quiz while the yearly retake is open. Until it is, the profile's own Retake says
 * when it opens.
 */
function WorkStyleActions({ side, profileHref }: { side: WorkStyleSide; profileHref: string }) {
  const [asking, setAsking] = useState(false);
  const canRetake = useNextRetake(side) === null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <Link href={profileHref} className={ACTION}>
        See your profile <ICONS.arrowForward size={16} aria-hidden />
      </Link>
      {canRetake && (
        <button type="button" onClick={() => setAsking(true)} className={ACTION}>
          <ICONS.restart size={16} aria-hidden /> Retake quiz
        </button>
      )}
      <RetakeQuizDialog side={side} open={asking} onClose={() => setAsking(false)} />
    </div>
  );
}

/**
 * In place of the checklist once every step is done: the work style tags, on their own. It takes
 * whatever height the greeting beside the card leaves, with the tags centred in it, so the spare
 * reads as room round the tags rather than an empty band under the head.
 */
function TagPanel({ traits }: { traits: readonly WorkStyleTag[] }) {
  return (
    <div className="relative mt-4 flex flex-1 flex-wrap content-center items-center gap-2 rounded-[20px] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,.04)] sm:px-5">
      {traits.length > 0 ? traits.map((t) => <TraitTag key={`${t.trait}-${t.label}`} tag={t} />) : <p className="text-[14px] leading-[1.35] text-ink-2">Take the work style quiz to get your tags.</p>}
    </div>
  );
}

/** The setup steps: each checked off, locked behind the steps it needs, or linked to where it's done. */
function Checklist({ items }: { items: readonly DashboardChecklistItem[] }) {
  return (
    <ul className="relative mt-4 flex flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_1px_2px_rgba(0,0,0,.04)]">
      {items.map((item) => {
        const missing = (item.requires ?? []).filter((r) => !items.find((i) => i.label === r)?.done);
        const locked = !item.done && missing.length > 0;
        return (
          // flex-wrap: once the column is too narrow for label + button side by side, the
          // button drops below the text rather than being clipped by the list's rounded mask.
          <li key={item.label} className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-b border-[#eeeeee] px-4 py-3.5 sm:px-5 last:border-b-0">
            <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${item.done ? "bg-primary text-white" : locked ? "bg-[#f2f2f2] text-ink-2" : "border-[1.5px] border-[#d8d8d8]"}`}>
              {item.done ? <Check size={17} aria-hidden /> : locked ? <Lock size={15} aria-hidden /> : null}
            </span>
            <span className="flex min-w-[120px] flex-1 flex-col gap-0.5 leading-[1.35] tracking-[0.2px]">
              <span className={`text-[15px] font-medium ${item.done ? "text-ink-2 line-through" : "text-ink"}`}>{item.label}</span>
              {/* Wraps rather than truncating: on a phone the line was cut off mid-sentence. */}
              <span className="text-[13px] text-ink-2">{locked ? `Finish ${missing.join(" and ")} first` : (item.hint ?? "")}</span>
            </span>
            {item.done ? (
              <span className="shrink-0 text-[13px] leading-[1.2] font-medium text-ink-2">Done</span>
            ) : locked || !item.href ? (
              <span className="shrink-0 text-[13px] leading-[1.2] font-medium text-ink-2 opacity-70">Locked</span>
            ) : (
              <Link href={item.href} className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-[13px] leading-[1.2] font-semibold text-white hover:brightness-110">
                {item.action ?? (item.label.toLowerCase().startsWith("verify") ? "Verify" : "Complete")}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
