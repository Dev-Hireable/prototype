import Image from "next/image";
import Link from "next/link";
import { ICONS } from "@/components/admin/icons";
import { TraitTag } from "@/components/portal/TraitTag";
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
}: {
  avatarSrc: string;
  avatarClassName?: string;
  title: string;
  description: string;
  completionHref: string;
  items: readonly DashboardChecklistItem[];
  /** Shown in place of the checklist once it is finished. */
  traits?: readonly { label: string; trait: number }[];
  completeDescription?: string;
}) {
  const done = items.filter((i) => i.done).length;
  const percent = items.length ? Math.round((done / items.length) * 100) : 100;
  const complete = done === items.length;

  return (
    // self-start once complete: the traits row is a third of the checklist's height, and stretching
    // to the greeting column left ~100px of empty gradient under it. Incomplete, it still stretches.
    <section className={`relative flex w-full min-w-0 flex-col overflow-hidden rounded-[40px] bg-gradient-to-b from-[#edf9ff] via-[#f6f9f9] to-[#fff9f3] p-4 ${complete ? "self-start" : ""}`}>
      {/* Sized as a share of the card and anchored right, so it scales with the card instead of
          drifting over the header copy — a fixed 330px-from-left offset put it on top of the
          text as the card grew. The header text is capped below so the two never meet. */}
      <Image src="/independent/complete-profile.png" alt="" width={600} height={600} priority className="pointer-events-none absolute -top-10 right-2 aspect-square w-[40%] max-w-[330px] rotate-[6.6deg] opacity-80" />
      <Image src="/independent/complete-profile-blur.svg" alt="" width={1009} height={386} className="pointer-events-none absolute top-[53px] left-[-213px] max-w-none" />

      <div className="relative flex items-center gap-4 pr-20">
        <Image src={avatarSrc} alt="" width={96} height={96} className={`size-12 shrink-0 rounded-full bg-[#d2d8db] object-cover ${avatarClassName}`} />
        {/* Capped so the copy wraps before it runs under the decorative art on the right. */}
        <div className="flex min-w-0 max-w-[50%] flex-1 flex-col gap-1.5 leading-[1.25] tracking-[0.2px]">
          <p className="text-[18px] font-semibold text-ink">{complete ? "You're all set" : title}</p>
          <p className="text-[14px] text-ink-2">{complete ? completeDescription : description}</p>
          <div role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Account setup progress" className="mt-1 h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-white/70">
            <span className="block h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>

      <Link href={completionHref} className="absolute top-4 right-4 flex h-10 w-16 items-center justify-center rounded-full bg-ink text-[14px] leading-[1.2] font-bold tracking-[0.2px] text-white">
        {percent}%
      </Link>

      {complete ? (
        <div className="relative mt-4 flex flex-wrap items-center gap-2 rounded-[20px] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,.04)] sm:px-5">
          {traits.length > 0 ? (
            traits.map((t) => <TraitTag key={t.label} label={t.label} trait={t.trait} />)
          ) : (
            <p className="text-[14px] leading-[1.35] text-ink-2">Take the work-style quiz to earn your trait badges.</p>
          )}
        </div>
      ) : (
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
      )}
    </section>
  );
}
