import Image from "next/image";
import Link from "next/link";
import { ICONS } from "@/components/admin/icons";
import { TraitTag } from "@/components/portal/TraitTag";
import type { WorkStyleTag } from "@/lib/demo/work-style";
import type { DashboardChecklistItem } from "@/components/portal/dashboard";

const Check = ICONS.check;
const Lock = ICONS.lock;

/**
 * "Action required" panel (TB-001 / IN-002).
 *
 * Replaces the horizontal step pills, which had to be a single row of five and so fought every
 * layout below ~1000px. This is the standard dashboard pattern instead: a vertical list where
 * each row has room for a label, a line of explanation, and its own button.
 *
 * The list is always open — a setup checklist people are meant to finish shouldn't hide its
 * actions behind a click. Once every step is done the card stays where it is and turns into the
 * work-style traits earned along the way: the dashboard doesn't reshuffle itself the moment
 * someone finishes setting up, and the space keeps saying something.
 *
 * Acceptance criteria the pills used to cover still hold: the percentage and progress bar are
 * derived from `items`, completed steps are checked off and greyed, each incomplete step links
 * to the section that completes it, and steps with unmet `requires` are locked.
 */
export function DashboardSetupCard({
  avatarSrc,
  avatarClassName = "",
  title,
  description,
  completionHref,
  items,
  traits = [],
  completeDescription = "Setup complete — here is the work style you are matched on.",
  profileHref,
}: {
  avatarSrc: string;
  avatarClassName?: string;
  title: string;
  description: string;
  completionHref: string;
  items: readonly DashboardChecklistItem[];
  /** Shown in place of the checklist once it is finished. */
  traits?: readonly WorkStyleTag[];
  completeDescription?: string;
  /** Where the traits are shown in full once setup is done. */
  profileHref?: string;
}) {
  const done = items.filter((i) => i.done).length;
  const percent = items.length ? Math.round((done / items.length) * 100) : 100;
  const complete = done === items.length;

  return (
    // Stretches to the greeting column's height either way. Once complete, the white traits panel
    // grows to fill it — a short card ended ~100px above the greeting and left a gap beside it.
    <section className="relative flex w-full min-w-0 flex-col overflow-hidden rounded-[40px] bg-gradient-to-b from-[#edf9ff] via-[#f6f9f9] to-[#fff9f3] p-4">
      {/* Sized as a share of the card and anchored right, so it scales with the card instead of
          drifting over the header copy — a fixed 330px-from-left offset put it on top of the
          text as the card grew. The header text is capped below so the two never meet. */}
      <Image src="/independent/complete-profile.png" alt="" width={600} height={600} priority className="pointer-events-none absolute -top-10 right-2 aspect-square w-[40%] max-w-[330px] rotate-[6.6deg] opacity-80" />
      <Image src="/independent/complete-profile-blur.svg" alt="" width={1009} height={386} className="pointer-events-none absolute top-[53px] left-[-213px] max-w-none" />

      <SetupHeading avatarSrc={avatarSrc} avatarClassName={avatarClassName} title={complete ? "You're all set" : title} description={complete ? completeDescription : description} percent={percent} />

      <Link href={completionHref} className="absolute top-4 right-4 flex h-10 w-16 items-center justify-center rounded-full bg-ink text-[14px] leading-[1.2] font-bold tracking-[0.2px] text-white">
        {percent}%
      </Link>

      {complete ? <WorkStylePanel traits={traits} profileHref={profileHref} /> : <Checklist items={items} />}
    </section>
  );
}

/** The card's head: the avatar, what's left to do (or that it's done), and the progress bar. */
function SetupHeading({ avatarSrc, avatarClassName, title, description, percent }: { avatarSrc: string; avatarClassName: string; title: string; description: string; percent: number }) {
  return (
    <div className="relative flex items-center gap-4 pr-20">
      <Image src={avatarSrc} alt="" width={96} height={96} className={`size-12 shrink-0 rounded-full bg-[#d2d8db] object-cover ${avatarClassName}`} />
      {/* Capped so the copy wraps before it runs under the decorative art on the right. */}
      <div className="flex min-w-0 max-w-[50%] flex-1 flex-col gap-1.5 leading-[1.25] tracking-[0.2px]">
        <p className="text-[18px] font-semibold text-ink">{title}</p>
        <p className="text-[14px] text-ink-2">{description}</p>
        <div role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Account setup progress" className="mt-1 h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-white/70">
          <span className="block h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}

/** In place of the checklist once every step is done: the work-style traits earned along the way. */
function WorkStylePanel({ traits, profileHref }: { traits: readonly WorkStyleTag[]; profileHref?: string }) {
  return (
    // A section of its own: what it is, the traits, and where to see them in full.
    <div className="relative mt-4 flex flex-1 flex-col gap-3 rounded-[20px] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,.04)] sm:px-5">
      <p className="text-[13px] leading-[1.3] font-semibold tracking-[0.2px] text-ink-2">Your work style</p>
      {traits.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {traits.map((t) => (
            <TraitTag key={`${t.trait}-${t.label}`} tag={t} />
          ))}
        </div>
      ) : (
        <p className="text-[14px] leading-[1.35] text-ink-2">Take the work-style quiz to earn your trait badges.</p>
      )}
      {profileHref && (
        <Link href={profileHref} className="mt-auto inline-flex items-center gap-1 self-start pt-1 text-[13px] leading-[1.2] font-semibold text-primary hover:underline">
          See your profile <ICONS.arrowForward size={16} aria-hidden />
        </Link>
      )}
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
              <span className="truncate text-[13px] text-ink-2">{locked ? `Finish ${missing.join(" and ")} first` : (item.hint ?? "")}</span>
            </span>
            {item.done ? (
              <span className="shrink-0 text-[13px] leading-[1.2] font-medium text-ink-2">Done</span>
            ) : locked || !item.href ? (
              <span className="shrink-0 text-[13px] leading-[1.2] font-medium text-ink-2 opacity-70">Locked</span>
            ) : (
              <Link href={item.href} className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-[13px] leading-[1.2] font-semibold text-white hover:brightness-110">
                {item.label.toLowerCase().startsWith("verify") ? "Verify" : "Complete"}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
