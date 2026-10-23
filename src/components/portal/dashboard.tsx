import Image from "next/image";
import Link from "next/link";
import { Children, isValidElement, type CSSProperties, type ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { PORTAL_CONTENT_CLASS } from "@/components/portal/layout";
import { dayLabel } from "@/lib/portal/dates";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const Forward = ICONS.arrowForward;
const NorthEast = ICONS.northEast;
const Close = ICONS.close;

// Lives in its own module purely to keep this file focused on layout primitives.
export { DashboardSetupCard, type DashboardChecklistItem } from "@/components/portal/setup-card";

export function DashboardFrame({ children }: { children: ReactNode }) {
  return <div className={`${PORTAL_CONTENT_CLASS} flex flex-col gap-10 p-(--page-gutter) max-md:gap-6`}>{children}</div>;
}

/**
 * Greeting and actions | setup card, side by side down to a tablet. Both tracks are minmax(0, …) so they
 * shrink instead of wrapping — a grid column can go narrower than its content, which is what
 * `flex-wrap` refused to do (the card's 604px minimum kept bumping it onto its own row).
 *
 * The ratio is proportional rather than a fixed 389px so the right column can't run away on a
 * wide screen: action rows past ~800px leave a dead gap between the label and its button.
 *
 * A phone stacks the greeting, the card, then the actions: your work style (or what's left to set
 * up) before the shortcuts, the user's call (2026-10-23). The markup runs in that order, so a
 * screen reader and Tab read it the way a phone shows it; from a tablet up the grid places each
 * part in its column.
 */
export function DashboardHero({ greeting, card, actions }: { greeting: ReactNode; card: ReactNode; actions: ReactNode }) {
  return (
    // The card spans both rows, so the left column is as tall as it is: the greeting at the top and
    // the actions at the foot (the second row takes the spare height), rather than one short block
    // over empty space.
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] grid-rows-[auto_1fr] gap-x-6 gap-y-8 max-md:grid-cols-1 max-md:grid-rows-none max-md:gap-y-6">
      <div className="min-w-0 md:pt-2">{greeting}</div>
      {/* A grid of one, so the card stretches to the rows it spans. */}
      <div className="grid min-w-0 md:col-start-2 md:row-span-2 md:row-start-1">{card}</div>
      {/* Stacked, matched width: these are the dashboard's primary actions now that the duplicate
          quick-action cards are gone. */}
      <div className="flex w-full min-w-0 flex-col gap-3 md:self-end md:pb-2">{actions}</div>
    </div>
  );
}

const cardKey = (card: ReactNode) => (isValidElement(card) ? String(card.key) : String(card));

/**
 * The cards under the hero, in rows that line up: two equal columns, `main` on the left beside
 * `side` on the right (each dashboard says which card goes where). Each row takes its taller card's
 * height and the card beside it stretches to match, so tops and bottoms are level across. Masonry
 * columns let each side split its height its own way, and a wide main beside a narrow side read as
 * lopsided — the user asked for two balanced columns.
 *
 * Without the tasks card (no live contract) one column is short a card, and its one card used to
 * stretch down beside two: the cards sit in one row of equal columns instead.
 */
export function DashboardSummaryGrid({ main, side }: { main: ReactNode[]; side: ReactNode[] }) {
  // toArray drops the cards that aren't there and keeps the keys the callers name them by.
  const columns = [Children.toArray(main), Children.toArray(side)];
  const rows = Math.max(...columns.map((c) => c.length), 1);
  // A phone has room for one column: the cards stack, main's first.
  if (columns[0].length !== columns[1].length) {
    const cards = columns.flat();
    return (
      <div className="grid grid-cols-(--cols) gap-4 max-md:grid-cols-1" style={{ "--cols": `repeat(${cards.length}, minmax(0, 1fr))` } as CSSProperties}>
        {cards.map((card) => (
          <div key={cardKey(card)} className="flex min-w-0 flex-col">
            {card}
          </div>
        ))}
      </div>
    );
  }
  // Row by row, the way they read: a phone stacks them in this order, and Tab follows it.
  const cells = columns.flatMap((cards, col) => cards.map((card, row) => ({ card, col, row, last: row === cards.length - 1 }))).sort((a, b) => a.row - b.row || a.col - b.col);
  return (
    <div className="grid grid-cols-2 grid-rows-(--rows) gap-4 max-md:grid-cols-1 max-md:grid-rows-none" style={{ "--rows": `repeat(${rows}, auto)` } as CSSProperties}>
      {cells.map(({ card, col, row, last }) => (
        // flex-col so the card (grow, shrink-0) fills the cell's height and never shrinks below its content.
        <div key={cardKey(card)} className="col-(--col) row-(--row) flex min-w-0 flex-col max-md:col-auto max-md:row-auto" style={{ "--col": col + 1, "--row": last ? `${row + 1} / ${rows + 1}` : row + 1 } as CSSProperties}>
          {card}
        </div>
      ))}
    </div>
  );
}

/** The hero's greeting: the name, then today's date. DashboardHero places it, and the actions under it. */
export function DashboardGreeting({ name, dateClassName = "text-[15px] tracking-[0.2px] text-ink-2" }: { name: string; dateClassName?: string }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      {/* clamp: scales with the hero instead of overflowing a narrow column. */}
      {/* Two deliberate lines — the name gets its own, the rest sits under it — instead of
          wrapping wherever the column width happens to break it. */}
      {/* Font size inline rather than an arbitrary Tailwind class: the JIT silently dropped the
          `text-[clamp(...)]` utility on rebuild and the headline fell back to 16px. */}
      <p className="font-display leading-[1.15] text-ink" style={{ fontVariationSettings: '"opsz" 14', fontSize: "clamp(24px, 2.8vw, 40px)" }}>
        <span className="block">
          Hey <span className="font-semibold">{name}</span>,
        </span>
        <span className="block">catching you up on today!</span>
      </p>
      {/* The real date — it was a fixed "Today, is 09 July 2026" on both dashboards. Portal pages
          render after hydration, so this never disagrees with a server render. */}
      <p className={dateClassName}>
        {/* react-doctor-disable-next-line react-doctor/rendering-hydration-mismatch-time -- PortalShell renders pages only once hydrated */}
        Today is {WEEKDAYS[new Date().getDay()]}, {dayLabel(new Date())}
      </p>
    </div>
  );
}

export type DashboardBar = { value: number; label: string; background: string };

/**
 * Bars sized from the values themselves. They used to carry hardcoded Tailwind heights
 * (h-12 / h-8 = 1.5:1) while the numbers said 8 and 4 (2:1), so the picture contradicted the
 * data — the whole point of the chart is judging one column against the other at a glance.
 *
 * The plot row is `flex-1` and each bar is a percentage of it, so the tallest always reaches the
 * top: the chart grows into whatever height the card has instead of leaving a void above the
 * bars, and the ratio between columns stays true at any size.
 */
export function DashboardBarChart({ bars, labelClassName = "" }: { bars: readonly DashboardBar[]; labelClassName?: string }) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="mt-5 flex min-h-[140px] flex-1 items-stretch gap-3" role="img" aria-label={bars.map((b) => `${b.label}: ${b.value}`).join(", ")}>
      {bars.map((bar) => (
        <div key={bar.label} className="grid flex-1 grid-rows-[auto_1fr_auto] gap-1.5">
          <p className="text-center text-[18px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{bar.value}</p>
          <div className="flex min-h-0 flex-col justify-end">
            {/* % of the 1fr track: the tallest column fills it, so the bars use the whole card. */}
            <div className={`w-full rounded-t ${bar.background}`} style={{ height: `${Math.max(4, (bar.value / max) * 100)}%` }} />
          </div>
          <p className={`text-center text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2 ${labelClassName}`}>{bar.label}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * `subtitle` is a line under the title, in the header beside the arrow rather than down in the body.
 * `linkLabel` names the arrow when "See more …" doesn't read well with the title ("My tasks").
 */
export function DashboardSummaryCard({ title, subtitle, href, linkLabel, children }: { title: string; subtitle?: ReactNode; href: string; linkLabel?: string; children: ReactNode }) {
  return (
    // grow + shrink-0: in a dashboard column a card starts at its content height and takes a share
    // of what's left, so both columns end level. flex-1 let it shrink below its content (the bar
    // chart spilled out the bottom). A phone stacks the cards, with no column to level, so there a
    // card is as tall as what it holds: its floor left a short one a band of empty grey.
    <section aria-label={title} className="flex min-w-0 shrink-0 grow flex-col gap-4 rounded-lg bg-surface-2 p-4 md:min-h-[259px]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">{title}</h2>
          {subtitle && <p className="text-[13px] leading-[1.4] tracking-[0.2px] text-ink-2">{subtitle}</p>}
        </div>
        {/* 48px: double the old 24px, which was both hard to spot and under the 44px minimum
            touch target. */}
        <Link href={href} aria-label={linkLabel ?? `See more ${title.toLowerCase()}`} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-ink hover:bg-surface-alt">
          <Forward size={24} aria-hidden />
        </Link>
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  );
}

/**
 * The count heading a summary card: icon, number and what it counts. The whole row is the link,
 * not just the arrow, the way the contract rows beside it are — on both dashboards.
 */
export function DashboardStat({ href, icon, value, label }: { href: string; icon: ReactNode; value: number; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 rounded-lg bg-white px-4 py-3 hover:bg-surface-alt">
      <span className="flex size-10 items-center justify-center rounded-full border border-border bg-white text-ink">{icon}</span>
      <span className="flex-1 whitespace-nowrap">
        <span className="block text-[20px] leading-[1.5] font-semibold tracking-[0.4px] text-ink">{value}</span>
        <span className="block text-[13px] leading-[1.2] tracking-[0.2px] text-ink-2">{label}</span>
      </span>
      <NorthEast size={24} aria-hidden className="shrink-0 text-ink" />
    </Link>
  );
}

/**
 * Marketing banner (TB-001). Text + optional image + optional CTA, dismissible by the user.
 * Callers pass `banner = null` when no campaign is active, and the space disappears entirely.
 */
export type DashboardBannerContent = { id: string; title: string; body: string; image?: string; cta?: { label: string; href: string } };

export function DashboardBanner({ banner, dismissed, onDismiss }: { banner: DashboardBannerContent | null; dismissed: boolean; onDismiss: () => void }) {
  if (!banner || dismissed) return null; // no active banner → the banner space is hidden
  // pr-14 keeps the CTA clear of the absolutely-positioned dismiss button in the corner.
  return (
    <section className="relative flex items-center gap-6 overflow-hidden rounded-lg bg-gradient-to-r from-[#0b2a43] to-[#17557f] py-5 pr-14 pl-6 text-white max-md:flex-col max-md:items-start max-md:gap-4 max-md:pl-5">
      <div className="flex min-w-0 flex-1 flex-col gap-1 leading-[1.3] tracking-[0.2px]">
        <p className="text-[16px] font-semibold">{banner.title}</p>
        <p className="max-w-[560px] text-[13px] text-white/75">{banner.body}</p>
      </div>
      {banner.image && <Image src={banner.image} alt="" width={160} height={96} className="hidden h-16 w-auto shrink-0 object-contain sm:block" />}
      {banner.cta && (
        <Link href={banner.cta.href} className="shrink-0 rounded-full bg-white px-4 py-2 text-[13px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">
          {banner.cta.label}
        </Link>
      )}
      <button type="button" onClick={onDismiss} aria-label="Dismiss banner" className="hit-area absolute top-3 right-3 flex size-7 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
        <Close size={18} aria-hidden />
      </button>
    </section>
  );
}

/**
 * Primary dashboard action (TB-001). Icon, label and a line saying what it does — used in the
 * greeting column as a 1-col stack rather than a separate row further down the page, so the
 * two main entry points sit with the greeting instead of duplicating it.
 */
/** `tour` names it for the guided tour that points it out (@/lib/portal/tours). */
export function DashboardQuickAction({ title, body, href, icon, tour }: { title: string; body: string; href: string; icon: ReactNode; tour?: string }) {
  return (
    <Link href={href} data-tour={tour} className="flex w-full items-center gap-4 rounded-lg bg-surface-2 p-4 hover:bg-[#e9e9e9]">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-ink">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.25] tracking-[0.2px]">
        <span className="text-[15px] font-semibold text-ink">{title}</span>
        <span className="text-[13px] text-ink-2">{body}</span>
      </span>
      <Forward size={20} aria-hidden className="shrink-0 text-ink-2" />
    </Link>
  );
}
