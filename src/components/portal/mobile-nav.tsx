"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ICONS } from "@/components/icons";
import { ResetDemoDialog } from "@/components/portal/demo-reset";
import { TourMenu } from "@/components/portal/tour/tour-help";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { MenuItem, Section } from "@/lib/portal/nav";
import { revealInRow } from "@/lib/portal/reveal";

/*
 * A phone's navigation, below 768px where the rail and section panel don't fit beside a page.
 * Everything you reach for sits in the thumb's half of the screen:
 *   tab bar     the first four sections and Menu along the bottom edge, 64px tall (+ the home
 *               indicator's inset), each tab a full fifth of the width, the Hireable mark's
 *               section (Hire, Job Board) in the middle on both sides
 *   Menu sheet  rises from the bottom: My profile, the open section's pages (Dashboard · Messages,
 *               Create Role · All Roles), the sections the bar has no room for, Help's tours,
 *               Reset demo and Log out — every row 52px
 *   page links  over a section's own pages, a row of links to the others (SectionStrip)
 * A tablet keeps the rail: it's held in both hands, and the rail is in reach of the left one.
 */

/** How many sections the tab bar holds before the rest go into Menu. */
const TABS = 4;

type Props = {
  /** Left off a screen that needs the whole height (isFocused). */
  hidden?: boolean;
  sections: Section[];
  section: Section;
  activeMenuHref: string | undefined;
  profileHref: string;
  avatar: string;
  /** Unread counts by href: `badges` for menu items, `railBadges` for sections. */
  badges: Record<string, number>;
  railBadges: Record<string, number>;
  onLogout: (href: string) => void;
};

/** The bottom tab bar and its Menu sheet. */
export function MobileTabBar({ hidden = false, sections, section, activeMenuHref, profileHref, avatar, badges, railBadges, onLogout }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rail = sections.filter((s) => !s.hidden);
  // Five fit: then every section is a tab and Menu holds the rest of the chrome only.
  const shown = rail.length <= TABS + 1 ? rail : rail.slice(0, TABS);
  // The tabs are the rail's first few, so Menu's are the rest of it.
  const more = rail.slice(shown.length);
  const tabs = markInMiddle(shown);
  const menuBadge = more.reduce((n, s) => n + (railBadges[s.href] ?? 0), 0);
  const menuActive = !tabs.includes(section);

  return (
    <>
      <nav aria-label="Sections" hidden={hidden} className="shrink-0 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="flex">
          {tabs.map((s) => (
            <li key={s.href} className="min-w-0 flex-1">
              <Link href={s.href} aria-current={s === section ? "page" : undefined} className={TAB}>
                <TabFace icon={s.icon} label={s.label} active={s === section} badge={railBadges[s.href] ?? 0} />
              </Link>
            </li>
          ))}
          <li className="min-w-0 flex-1">
            <button type="button" data-tour="help" aria-haspopup="dialog" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} className={TAB}>
              <TabFace icon="menu" label="Menu" active={menuActive} badge={menuBadge} />
            </button>
          </li>
        </ul>
      </nav>
      <MenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        sections={sections}
        more={more}
        section={section}
        activeMenuHref={activeMenuHref}
        profileHref={profileHref}
        avatar={avatar}
        pageBadges={badges}
        badges={railBadges}
        onLogout={onLogout}
      />
    </>
  );
}

/**
 * A phone's row of the open section's pages over the page — Discover roles · My applications · Saved
 * roles · Interviews — the one open lit as the tab bar lights its tab. Without it a section's other
 * pages were in the Menu sheet only, out of sight. Drawn on the section's own pages only (a detail
 * page has its back link instead), and not on Messages, whose thread takes the whole screen.
 */
export function SectionStrip({ section, pathname, badges }: { section: Section; pathname: string; badges: Record<string, number> }) {
  const row = useRef<HTMLUListElement>(null);
  const pages = section.menu.filter((m: MenuItem) => !m.action);
  const here = pages.find((m) => m.href === pathname);
  // The open page's link in sight, when the row runs past the screen's edge.
  useEffect(() => {
    const on = row.current?.querySelector<HTMLElement>("[aria-current=page]");
    if (row.current && on) revealInRow(row.current, on, "instant");
  }, [pathname]);
  if (pages.length < 2 || !here || here.bare) return null;
  return (
    <nav aria-label={`${section.title} pages`} className="shrink-0 border-b border-border md:hidden">
      <ul ref={row} className="flex gap-1.5 overflow-x-auto px-(--page-gutter) py-2">
        {pages.map((m) => (
          <li key={m.href} className="shrink-0">
            <Link href={m.href} prefetch={false} aria-current={m === here ? "page" : undefined} className={STRIP_LINK}>
              {m.label}
              {(badges[m.href] ?? 0) > 0 && <Count n={badges[m.href]} />}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const STRIP_LINK =
  "flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[14px] leading-none font-medium text-ink-2 active:bg-black/8 aria-[current=page]:bg-accent-bg aria-[current=page]:font-semibold aria-[current=page]:text-accent-ink [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-primary";

/**
 * The section drawn with the Hireable mark (Hire, Job Board) takes the bar's middle slot, the same on
 * both sides: the Team Builder's Hire is third in the rail and falls there anyway, the Independent's
 * Job Board is second and moves over one. The rail keeps its own order.
 */
function markInMiddle(tabs: Section[]) {
  const mark = tabs.find((s) => s.icon === "logo");
  if (!mark) return tabs;
  const rest = tabs.filter((s) => s !== mark);
  // Menu is the bar's last slot, so the middle counts it.
  const middle = Math.floor((tabs.length + 1) / 2);
  return [...rest.slice(0, middle), mark, ...rest.slice(middle)];
}

const TAB =
  "group relative flex h-16 w-full items-center justify-center px-0.5 text-[10.5px] leading-[1.2] tracking-[-0.1px] text-ink-2 outline-none select-none [-webkit-tap-highlight-color:transparent] focus-visible:text-ink";

/** A tab's glyph over its label, with its unread count; the open one is filled in, a card around both. */
function TabFace({ icon, label, active, badge }: { icon: Section["icon"] | "menu"; label: string; active: boolean; badge: number }) {
  return (
    <span
      className={`relative flex h-[46px] w-full max-w-[84px] flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 transition-colors group-active:bg-black/8 group-focus-visible:outline-2 group-focus-visible:outline-primary ${
        active ? "bg-accent-bg font-semibold text-accent-ink" : ""
      }`}
    >
      {icon === "logo" ? (
        <Image src="/hireable-mark.svg" alt="" width={22} height={22} className={`size-[22px] ${active ? "" : "grayscale"}`} />
      ) : (
        <Glyph icon={icon} size={22} />
      )}
      <span className="max-w-full truncate">{label}</span>
      {badge > 0 && <Count n={badge} className="absolute -top-1 left-1/2 ml-1.5" />}
    </span>
  );
}

function Glyph({ icon, size = 24 }: { icon: keyof typeof ICONS; size?: number }) {
  const G = ICONS[icon];
  return <G size={size} aria-hidden className="shrink-0" />;
}

function Count({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span aria-label={`${n} unread`} className={`pointer-events-none flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1.5 text-[10.5px] leading-none font-semibold text-white ${className}`}>
      <span className="badge-count">{n > 9 ? "9+" : n}</span>
    </span>
  );
}

type MenuSheetProps = {
  open: boolean;
  onClose: () => void;
  sections: Section[];
  more: Section[];
  section: Section;
  activeMenuHref: string | undefined;
  profileHref: string;
  avatar: string;
  pageBadges: Record<string, number>;
  badges: Record<string, number>;
  onLogout: (href: string) => void;
};

/**
 * Menu, from the bottom edge: the profile, the sections the tab bar left out, Help's tours, and the
 * demo's Reset and Log out at the foot, where the thumb already is.
 */

function MenuSheet({ open, onClose, sections, more, section, activeMenuHref, profileHref, avatar, pageBadges, badges, onLogout }: MenuSheetProps) {
  const [resetting, setResetting] = useState(false);
  const profileOpen = !!section.hidden;
  return (
    <>
      <Sheet side="bottom" open={open} onOpenChange={(next) => !next && onClose()}>
        <SheetContent showCloseButton={false} className="max-h-[88dvh] gap-0 overflow-y-auto border-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <nav aria-label="More" className="flex flex-col px-3 pt-2">
            <Link href={profileHref} prefetch={false} onClick={onClose} aria-current={profileOpen ? "page" : undefined} className={`${ROW} h-16`}>
              <Image src={avatar} alt="" width={80} height={80} className="size-10 shrink-0 rounded-full bg-[#d2d8db] object-cover" />
              <span className="flex-1">My profile</span>
              <Glyph icon="chevronRight" size={20} />
            </Link>
            {/* A section in Menu's own list shows its pages there instead. */}
            {!more.includes(section) && <SectionPages section={section} activeMenuHref={activeMenuHref} badges={pageBadges} onClose={onClose} />}
            <MoreSections more={more} section={section} activeMenuHref={activeMenuHref} badges={badges} pageBadges={pageBadges} onClose={onClose} />
          </nav>
          <section aria-label="Help" className="mx-3 mt-3 flex flex-col gap-3 rounded-xl bg-surface-2 p-3 [&_li]:bg-white">
            <TourMenu onPick={onClose} collapsible />
          </section>
          <MenuFoot
            sections={sections}
            onReset={() => {
              onClose();
              setResetting(true);
            }}
            onLogout={(href) => {
              onClose();
              onLogout(href);
            }}
          />
        </SheetContent>
      </Sheet>
      {/* Outside the sheet: it opens as the sheet closes. */}
      <ResetDemoDialog open={resetting} onClose={() => setResetting(false)} />
    </>
  );
}

/** The open section's own pages, when it has more than one (Dashboard · Messages, Personal · Company profile). */
function SectionPages({ section, activeMenuHref, badges, onClose }: { section: Section; activeMenuHref: string | undefined; badges: Record<string, number>; onClose: () => void }) {
  const pages = section.menu.filter((m: MenuItem) => !m.action);
  if (pages.length < 2) return null;
  return (
    <>
      <hr className="my-2 border-border" />
      <p className="px-3 pt-1 pb-1 text-[12px] leading-[1.2] font-semibold tracking-[0.4px] text-ink-2 uppercase">{section.title}</p>
      {pages.map((m) => (
        <Link key={m.href} href={m.href} prefetch={false} onClick={onClose} aria-current={m.href === activeMenuHref ? "page" : undefined} className={ROW}>
          <Glyph icon={m.icon} size={22} />
          <span className="flex-1">{m.label}</span>
          {(badges[m.href] ?? 0) > 0 && <Count n={badges[m.href]} />}
        </Link>
      ))}
    </>
  );
}

/** The sections the tab bar had no room for, each with its unread count. */
function MoreSections({ more, section, activeMenuHref, badges, pageBadges, onClose }: { more: Section[]; section: Section; activeMenuHref: string | undefined; badges: Record<string, number>; pageBadges: Record<string, number>; onClose: () => void }) {
  if (more.length === 0) return null;
  return (
    <>
      <hr className="my-2 border-border" />
      {more.map((s) => (
        <MoreSection key={s.href} s={s} current={s === section} activeMenuHref={activeMenuHref} badge={badges[s.href] ?? 0} pageBadges={pageBadges} onClose={onClose} />
      ))}
    </>
  );
}

/**
 * One of them: a link to it, or — when it has several pages (Settings: Account, Security, Payment
 * method…) — a row that opens to list them, open already while you're in that section.
 */
function MoreSection({ s, current, activeMenuHref, badge, pageBadges, onClose }: { s: Section; current: boolean; activeMenuHref: string | undefined; badge: number; pageBadges: Record<string, number>; onClose: () => void }) {
  const pages = s.menu.filter((m: MenuItem) => !m.action);
  const [open, setOpen] = useState(current);
  const face = (
    <>
      {s.icon === "logo" ? <Image src="/hireable-mark.svg" alt="" width={22} height={22} className="size-[22px]" /> : <Glyph icon={s.icon} size={22} />}
      <span className="flex-1">{s.label}</span>
      {badge > 0 && <Count n={badge} />}
    </>
  );
  if (pages.length < 2)
    return (
      <Link href={s.href} prefetch={false} onClick={onClose} aria-current={current ? "page" : undefined} className={ROW}>
        {face}
        <Glyph icon="chevronRight" size={20} />
      </Link>
    );
  return (
    <>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={`${ROW} w-full text-left ${current ? "font-semibold" : ""}`}>
        {face}
        <ICONS.chevron size={22} aria-hidden className={`shrink-0 text-ink-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open &&
        pages.map((m) => (
          <Link key={m.href} href={m.href} prefetch={false} onClick={onClose} aria-current={m.href === activeMenuHref ? "page" : undefined} className={`${ROW} h-11 pl-[46px] text-[14px]`}>
            <span className="flex-1">{m.label}</span>
            {(pageBadges[m.href] ?? 0) > 0 && <Count n={pageBadges[m.href]} />}
          </Link>
        ))}
    </>
  );
}

/** The sheet's foot: Reset demo and Log out side by side, under the thumb. */
function MenuFoot({ sections, onReset, onLogout }: { sections: Section[]; onReset: () => void; onLogout: (href: string) => void }) {
  const logout = sections.flatMap((s) => s.menu).find((m) => m.action === "logout");
  return (
    <div className="flex gap-3 p-3">
      <button type="button" onClick={onReset} className={FOOT}>
        <Glyph icon="restart" size={20} /> Reset demo
      </button>
      {logout && (
        <button type="button" onClick={() => onLogout(logout.href)} className={FOOT}>
          <Glyph icon="logout" size={20} /> Log out
        </button>
      )}
    </div>
  );
}

const ROW =
  "flex h-[52px] items-center gap-3 rounded-xl px-3 text-[15px] leading-[1.2] text-ink active:bg-black/8 aria-[current=page]:bg-accent-bg aria-[current=page]:font-semibold aria-[current=page]:text-accent-ink [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-primary";

const FOOT =
  "flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border text-[14px] font-medium text-ink active:bg-black/8 [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-primary";
