"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ICONS } from "@/components/icons";
import { Button, Modal } from "@/components/portal/ui";
import { Tip } from "@/components/portal/tip";
import { useHydrated } from "@/lib/demo/deal";
import { signOut } from "@/lib/demo/auth";
import { useContractClock } from "@/lib/demo/contract";
import { unseenByAdmin, useDisputeDeadlines, useDisputes } from "@/lib/demo/disputes";
import { unreadChat, useLive } from "@/lib/demo/live";
import { menuItemFor, sectionFor } from "@/lib/portal/nav";
import type { MenuItem, Section } from "@/lib/portal/nav";

/*
 * The shell's geometry:
 *   frame      bg #f2f2f2, 4px padding, gap 4
 *   sidebar    336 wide = rail 96 + panel 240 (panel absolutely at x 96)
 *   rail item  68 tall, pl 8 on the column, px 8 / py 16 inside, icon 24, label 10px
 *   panel      p 16, gap 24, 1px #c3c3c3 stroke (inside), radius 8
 *   active tab white "browser tab" shape: x 8 → 108 (12px into the panel), radius 12,
 *              joined to the panel edge with 12px concave fillets top and bottom
 *   collapsed  56px strip, chevrons at (17, 17), submenu icons at (15, 63 + 42i)
 */

const TAB_H = 68;
const TAB_R = 12;
const CollapseIcon = ICONS.collapse;
/** One curve for every sidebar morph (no overshoot). */
const EASE = "duration-400 ease-[cubic-bezier(.2,.8,.2,1)]";

export function PortalShell({
  sections,
  profileHref,
  avatar,
  children,
}: {
  sections: Section[];
  /** Where the avatar in the rail goes. */
  profileHref: string;
  avatar: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const section = sectionFor(sections, pathname);
  const activeMenuHref = menuItemFor(section, pathname);
  /** Destination of a pending log-out, held while the confirm dialog is open. */
  const [logout, setLogout] = useState<string | null>(null);
  const hydrated = useHydrated();
  // A dispute turn that runs out closes the case — whichever portal happens to be open checks.
  useDisputeDeadlines();
  // The contract's own clock: the evaluation reminder, the escrow's release when the window closes, monthly pay.
  useContractClock();
  /** A bare page (Messages) draws its own panels, so the shell draws no page panel around them. */
  const bare = section.menu.find((m) => m.href === activeMenuHref)?.bare;

  return (
    // min-h keeps the rail (7 × 68) + avatar intact on short viewports; 560 lets a 14" laptop window
    // (600–650 tall once the browser toolbars take theirs) fit without the whole app scrolling
    <div className="flex h-[calc(100dvh/var(--ui-scale))] min-h-[560px] gap-1 bg-surface-2 p-1 font-sans text-ink">
      <Sidebar sections={sections} section={section} activeMenuHref={activeMenuHref} profileHref={profileHref} avatar={avatar} onLogout={setLogout} />

      <div className={`flex h-full min-w-0 flex-1 flex-col ${bare ? "" : "overflow-clip rounded-lg bg-white shadow-[inset_0_0_0_1px_#c3c3c3]"}`}>
        {/* The demo's records live in localStorage, so the page waits one paint for them rather
            than rendering against nothing — a detail screen would otherwise 404 on a refresh. */}
        {/* Pages read the URL (?from=, ?tab=), which a prerendered page may only do under a
            Suspense boundary — this one covers every portal page, so none needs its own. */}
        <Suspense>{hydrated ? children : null}</Suspense>
      </div>

      <LogoutDialog to={logout} onClose={() => setLogout(null)} />
    </div>
  );
}

/**
 * The sidebar: the icon rail, the open section's tab, and its panel — at full width, folded to its
 * icons, or (on a phone) left out so the rail stands alone.
 */
function Sidebar({ sections, section, activeMenuHref, profileHref, avatar, onLogout }: { sections: Section[]; section: Section; activeMenuHref: string | undefined; profileHref: string; avatar: string; onLogout: (href: string) => void }) {
  const pathname = usePathname();
  const rail = sections.filter((s) => !s.hidden);
  const activeIndex = rail.indexOf(section); // -1 when a hidden section (Profile) is open
  const { collapsed, railOnly, toggle } = useSidebarFold();
  const { badges, railBadges } = useNavBadges(pathname);

  return (
    // Sidebar width eases 336 ↔ 152, or just the rail on a phone; main is flex-1 so it follows the same curve.
    // Rail only, there's no section panel for the active tab to join, so main's own panel takes its
    // place: the sidebar keeps the tab's 12px reach (108) and main tucks under it (-mr-4 undoes that
    // and the 4px gap), so main's edge sits on x 96 where the section panel's would, and the tab runs
    // into it. The sidebar floats above main there, click-through except the rail itself.
    <div
      className={`relative h-full shrink-0 overflow-hidden transition-[width,margin] ${EASE} ${
        railOnly ? "pointer-events-none z-10 -mr-4 w-[108px]" : collapsed ? "w-[152px]" : "w-[336px]"
      }`}
    >
      {/* Icon rail */}
      <SectionRail rail={rail} activeIndex={activeIndex} badges={railBadges} profileHref={profileHref} avatar={avatar} />

      {/* Active tab — one outline with the panel's edge, above the panel so it hides that stroke where
          they join. Profile (hidden section, reached from the avatar) is the same shape flipped to the bottom. */}
      <ActiveTab index={activeIndex >= 0 ? activeIndex : "profile"} />

      {/* Section panel — ONE set of DOM nodes for both states so items morph instead of swapping.
          On a phone it stays mounted at no width. */}
      <SectionPanel section={section} activeMenuHref={activeMenuHref} badges={badges} collapsed={collapsed} railOnly={railOnly} onToggle={toggle} onLogout={onLogout} />
    </div>
  );
}

/** Whether the section panel is folded to its icons or (on a phone) left out, and the toggle that folds and unfolds it. */
function useSidebarFold() {
  // Collapsed by default below 1440px — 14" laptops at 125–150% scaling (1280–1400 wide), where
  // the full 336px panel left the page ~930px and boards, tables and workspaces scrolled sideways.
  // A 1512-wide window (a 14" MacBook) keeps it open. The toggle overrides that for the session.
  // On a phone only the rail is left.
  const narrow = useMedia("(max-width: 1439px)");
  const tiny = useMedia("(max-width: 639px)");
  const [chosen, setChosen] = useState<boolean | null>(null);
  const collapsed = chosen ?? narrow;
  /** On a phone the sidebar is just the rail. */
  const railOnly = tiny;
  return { collapsed, railOnly, toggle: () => setChosen(!collapsed) };
}

/** Log out's confirm: Log out signs out and follows the menu item's link; Cancel stays. */
function LogoutDialog({ to, onClose }: { to: string | null; onClose: () => void }) {
  const router = useRouter();
  return (
    <Modal
      open={!!to}
      onClose={onClose}
      tone="danger"
      title="Log out?"
      description="You'll be signed out of this device. Anything you haven't saved is lost, and you'll need to sign in again to get back in."
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="danger" onClick={() => { signOut(); if (to) router.push(to); }}>
            Log out
          </Button>
        </>
      }
    />
  );
}

/** The unread counts the nav carries, by href: `badges` for the section menus, `railBadges` for the rail. */
function useNavBadges(pathname: string) {
  /* Live unread counts on the Messages and Notifications nav items (TB-007/008, IN-007/008). */
  const live = useLive();
  const side = pathname.startsWith("/team") ? "team" : "independent";
  const root = `/${side === "team" ? "team" : "independent"}`;
  /* TB-093 / IN-082 / AD-032 — Admin is told about a new dispute, a withdrawal or a new statement
     by the Disputes nav, which counts disputes with activity Admin hasn't opened yet. */
  const disputes = useDisputes();
  const badges: Record<string, number> = pathname.startsWith("/admin")
    ? { "/admin/disputes": unseenByAdmin(disputes).length }
    : {
        [`${root}/messages`]: unreadChat(live, side),
        [`${root}/notifications`]: live[side].filter((n) => n.unread).length,
      };
  /* TB-008 / IN-008 — the rail carries a section's total too, so unread messages are visible from
     every section, not only the one whose submenu happens to list Messages. Rail only: the Home
     section and its Dashboard item share a href, and the count belongs on Messages, not Dashboard. */
  const railBadges: Record<string, number> = pathname.startsWith("/admin") ? badges : { ...badges, [root]: unreadChat(live, side) };
  return { badges, railBadges };
}

/** The icon rail: a tab per section with its unread count, and at its foot the avatar that opens My profile. */
function SectionRail({ rail, activeIndex, badges, profileHref, avatar }: { rail: Section[]; activeIndex: number; badges: Record<string, number>; profileHref: string; avatar: string }) {
  return (
    <nav aria-label="Sections" className="pointer-events-auto absolute top-0 left-0 h-full w-24 overflow-clip rounded-lg">
      <ul className="flex flex-col pl-2">
        {rail.map((s, i) => {
          const active = i === activeIndex;
          const badge = badges[s.href] ?? 0;
          return (
            <li key={s.href} className="relative z-20">
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex h-[68px] w-full flex-col items-center gap-1 px-2 py-4 text-[10px] leading-[1.2] tracking-[0.2px] whitespace-nowrap transition-colors
                      ${active ? "font-semibold text-accent-ink" : "font-normal text-ink-2 hover:text-ink"}`}
              >
                {/* On hover a white card comes up behind the glyph and label, a lighter take on the open
                    section's white tab, so a section reads as something to click. -z-10 keeps it behind
                    them, inside the li's own z-20. */}
                {!active && <span aria-hidden className="absolute inset-1 -z-10 rounded-xl transition-colors group-hover:bg-white" />}
                <RailGlyph icon={s.icon} active={active} />
                {badge > 0 && (
                  <span aria-label={`${badge} unread`} className="pointer-events-none absolute top-2.5 right-[22px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1.5 text-[10.5px] leading-none font-semibold text-white">
                    <span className="badge-count">{badge > 9 ? "9+" : badge}</span>
                  </span>
                )}
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
      {/* z-20: paints above the active tab when Profile is open */}
      <Tip label="My profile" side="right">
        <Link
          href={profileHref}
          aria-label="My profile"
          aria-current={activeIndex === -1 ? "page" : undefined}
          className="group absolute bottom-0 left-5 z-20 flex h-[68px] w-16 items-center justify-center rounded-lg px-2 py-4"
        >
          {/* The sections' hover card, as wide as theirs (x 12 → 92), unless Profile is the open tab */}
          {activeIndex !== -1 && <span aria-hidden className="absolute -inset-x-2 inset-y-1 -z-10 rounded-xl transition-colors group-hover:bg-white" />}
          <span className="rounded-full p-[4.8px]">
            <Image
              src={avatar}
              alt=""
              width={128}
              height={128}
              preload
              className="size-[38.4px] rounded-full bg-[#d2d8db] object-cover"
            />
          </span>
        </Link>
      </Tip>
    </nav>
  );
}

/** The open section's panel beside the rail: its title, the collapse button and its menu, at full width, folded to icons, or none. */
function SectionPanel({
  section,
  activeMenuHref,
  badges,
  collapsed,
  railOnly,
  onToggle,
  onLogout,
}: {
  section: Section;
  activeMenuHref: string | undefined;
  badges: Record<string, number>;
  collapsed: boolean;
  railOnly: boolean;
  onToggle: () => void;
  onLogout: (href: string) => void;
}) {
  return (
    <div
      inert={railOnly}
      className={`absolute top-0 left-24 h-full overflow-clip rounded-lg bg-white shadow-[inset_0_0_0_1px_#c3c3c3] ${EASE} transition-[width] ${
        railOnly ? "w-0" : collapsed ? "w-14" : "w-60"
      }`}
    >
      <h2
        className={`absolute top-4 left-4 text-[16px] leading-[1.5] font-semibold tracking-[0.2px] whitespace-nowrap text-ink ${EASE} transition-opacity ${
          collapsed ? "opacity-0" : "opacity-100"
        }`}
      >
        {section.title}
      </h2>
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expand menu" : "Collapse menu"}
        aria-expanded={!collapsed}
        className={`absolute flex size-6 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink ${EASE} transition-[left,top,background-color,color]`}
        style={{ left: collapsed ? 15 : 200, top: collapsed ? 15 : 16 }}
      >
        <CollapseIcon size={20} aria-hidden className={`${EASE} transition-transform ${collapsed ? "rotate-180" : ""}`} />
      </button>

      {/* z-20: above the active tab's 12px overhang (z-10) */}
      <SectionMenu items={section.menu} activeMenuHref={activeMenuHref} badges={badges} collapsed={collapsed} onLogout={onLogout} />
    </div>
  );
}

/** The section's menu: each item's icon and label (the icon alone while collapsed), its unread count, and Log out's confirm. */
function SectionMenu({ items, activeMenuHref, badges, collapsed, onLogout }: { items: MenuItem[]; activeMenuHref: string | undefined; badges: Record<string, number>; collapsed: boolean; onLogout: (href: string) => void }) {
  return (
    <ul
      className={`absolute z-20 flex flex-col ${EASE} transition-[left,top,gap] ${collapsed ? "gap-0.5" : "gap-2"}`}
      style={{ left: collapsed ? 7 : 16, top: collapsed ? 55 : 64 }}
    >
      {items.map((item) => (
        <SectionMenuItem key={item.href} item={item} active={item.href === activeMenuHref} badge={badges[item.href] ?? 0} collapsed={collapsed} onLogout={onLogout} />
      ))}
    </ul>
  );
}

/** One item of the menu: its unread count, then its link (Log out's button) — named on hover while collapsed to its icon. */
function SectionMenuItem({ item, active, badge, collapsed, onLogout }: { item: MenuItem; active: boolean; badge: number; collapsed: boolean; onLogout: (href: string) => void }) {
  // Hover greys an item in and press darkens it, so the list reads as links; the open one keeps its blue
  const cls = `flex items-center gap-2 overflow-hidden rounded-lg p-2 text-[14px] leading-[1.2] tracking-[0.2px] whitespace-nowrap ${EASE} transition-[width,height,background-color,color] ${
    active ? "bg-accent-bg font-semibold text-accent-ink" : "font-normal text-ink-2 hover:bg-surface-2 hover:text-ink active:bg-black/8"
  }`;
  const style = collapsed ? { width: 40, height: 40 } : { width: 208, height: 34 };
  const body = <ItemFace item={item} collapsed={collapsed} />;
  return (
    <li className="relative">
      {badge > 0 && (
        <span
          aria-label={`${badge} unread`}
          className={`pointer-events-none absolute z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1.5 text-[10.5px] leading-none font-semibold text-white ${EASE} transition-[left,top]`}
          style={collapsed ? { left: 24, top: 2 } : { left: 178, top: 8 }}
        >
          <span className="badge-count">{badge > 9 ? "9+" : badge}</span>
        </span>
      )}
      {/* Collapsed to its icon, an item names itself on hover */}
      <Tip label={item.label} side="right" off={!collapsed}>
        {item.action === "logout" ? (
          <button type="button" onClick={() => onLogout(item.href)} aria-label={collapsed ? item.label : undefined} className={cls} style={style}>
            {body}
          </button>
        ) : (
          <Link
            href={item.href}
            aria-label={collapsed ? item.label : undefined}
            aria-current={active ? "page" : undefined}
            className={cls}
            style={style}
          >
            {body}
          </Link>
        )}
      </Tip>
    </li>
  );
}

/** A menu item's glyph and label: collapsed, the glyph grows to 24 and the label folds away. */
function ItemFace({ item, collapsed }: { item: MenuItem; collapsed: boolean }) {
  const Glyph = ICONS[item.icon];
  return (
    <>
      <Glyph
        aria-hidden
        className={`shrink-0 ${EASE} transition-[width,height]`}
        style={{ width: collapsed ? 24 : 18, height: collapsed ? 24 : 18 }}
      />
      <span
        className={`overflow-hidden ${EASE} transition-[opacity,max-width] ${
          collapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100"
        }`}
      >
        {item.label}
      </span>
    </>
  );
}

/** Whether a media query matches — false on the server and the first paint, then live. */
function useMedia(query: string) {
  return useSyncExternalStore(
    (fn) => {
      const m = matchMedia(query);
      m.addEventListener("change", fn);
      return () => m.removeEventListener("change", fn);
    },
    () => matchMedia(query).matches,
    () => false,
  );
}

function RailGlyph({ icon, active }: { icon: Section["icon"]; active: boolean }) {
  if (icon === "logo") {
    // The mark carries its own brand colours; desaturate it when inactive so it reads like the
    // other rail glyphs, which are mono #616161 until their section is open.
    return <Image src="/hireable-mark.svg" alt="" width={24} height={24} className={`size-6 shrink-0 ${active ? "" : "grayscale"}`} />;
  }
  const Glyph = ICONS[icon];
  return <Glyph size={24} aria-hidden className="shrink-0" />;
}

/** A rail slot, or Profile — the same tab flipped onto the sidebar's bottom edge. */
type TabAt = number | "profile";

const SLIDE_MS = 500;
/** The slide overshoots ~4% of the move and settles ("gooey"). */
const bounce = cubicBezier(0.3, 1.35, 0.5, 1);
/** At Home / Profile there's no room to overshoot, so the tab gives by up to this much instead. */
const SQUASH = 10;

/**
 * The active tab: a white body with a 12px left radius and a 1px #c3c3c3 stroke,
 * joined to the panel's edge by 12px concave fillets. It's drawn as one outline with that edge
 * rather than as pieces laid over it: near the panel's top or bottom (Home, Profile) a fillet and
 * the panel's own 8px corner shrink together, so the tab's edge runs straight into the panel's
 * instead of swapping shapes as it arrives.
 *
 * The slide overshoots and settles on every move. Past Home or Profile it would leave the sidebar,
 * so there the tab stays joined to the panel's edge and squashes against it, then springs back.
 */
function ActiveTab({ index }: { index: TabAt }) {
  const ref = useRef<SVGSVGElement>(null);
  /** The slot the tab rests on — it only moves on once the slide there has finished. */
  const [rest, setRest] = useState(index);
  /** What's on screen mid-slide; null at rest. */
  const [frame, setFrame] = useState<Frame | null>(null);
  /** The last target and, mid-slide, the tab's position — a click mid-slide carries on from there. */
  const pos = useRef<{ at: TabAt; y: number | null }>({ at: index, y: null });

  useEffect(() => {
    const box = ref.current?.parentElement;
    const { at, y } = pos.current;
    if (!box || (at === index && y === null)) return;
    const yOf = (a: TabAt) => (a === "profile" ? box.clientHeight - TAB_H : a * TAB_H);
    const from = y ?? yOf(at);
    pos.current = { at: index, y: from };
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let start: number | undefined;
    const step = (now: number) => {
      start ??= now;
      const p = still ? 1 : (now - start) / SLIDE_MS;
      if (p >= 1) {
        pos.current.y = null;
        setRest(index);
        setFrame(null);
        return;
      }
      pos.current.y = from + (yOf(index) - from) * bounce(p);
      setFrame(frameAt(pos.current.y, box.clientHeight));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [index]);

  const { top, h, gapTop, gapBottom } = frame ?? restFrame(rest);
  const { outline, fill } = tabPaths(h, gapTop, gapBottom);
  return (
    <svg ref={ref} aria-hidden width={X_END} height={h} className="pointer-events-none absolute z-10 overflow-visible" style={{ left: 8, top }}>
      <path d={fill} className="fill-white" />
      <path d={outline} className="fill-none stroke-border" />
    </svg>
  );
}

/** One drawing of the tab: its top, its height, and how far each end of it is from the panel's end. */
type Frame = { top: number | string; h: number; gapTop: number; gapBottom: number };

function restFrame(at: TabAt): Frame {
  // The sidebar's height is only known to CSS here, so Profile rests on it with calc()
  if (at === "profile") return { top: `calc(100% - ${TAB_H}px)`, h: TAB_H, gapTop: Infinity, gapBottom: 0 };
  return { top: at * TAB_H, h: TAB_H, gapTop: at * TAB_H, gapBottom: Infinity };
}

/** The tab at `y` in a sidebar `sidebarH` tall. Past either end it keeps to that end and squashes instead. */
function frameAt(y: number, sidebarH: number): Frame {
  const last = sidebarH - TAB_H;
  // Follows a small overshoot 1:1 and eases a long one off towards SQUASH
  const give = (over: number) => SQUASH * (1 - Math.exp(-over / SQUASH));
  // Whole device pixels only: the browser snaps the svg's box to them, which would nudge a joined edge off the panel's
  const top = Math.round((y < 0 ? 0 : y > last ? last + give(y - last) : y) * devicePixelRatio) / devicePixelRatio;
  const bottom = y < 0 ? TAB_H - give(-y) : y > last ? sidebarH : top + TAB_H;
  return { top, h: bottom - top, gapTop: top, gapBottom: sidebarH - bottom };
}

/*
 * The outline in the tab's own coordinates (x 0 is x 8 in the sidebar). Strokes are 1px, so each
 * line sits on a pixel centre and each radius is measured to the middle of its stroke.
 */
const X_EDGE = 88.5; // the panel's left stroke, x 96 in the sidebar
const X_END = 100; // the tab reaches 12px into the panel (x 108)
const R_TAB = TAB_R - 0.5;
const R_PANEL = 8 - 0.5; // the panel's rounded-lg corner
/** Any closer to the panel's end and a full fillet and the panel's corner no longer both fit. */
const JOIN = R_TAB + R_PANEL;

/** `outline` strokes the tab's edge and both joints; `fill` closes that shape through the panel. */
function tabPaths(h: number, gapTop: number, gapBottom: number) {
  const top = 0.5;
  const bottom = h - 0.5;
  const t = joint(gapTop);
  const b = joint(gapBottom);
  // Top joint, from the panel's side: its corner while shrunk, then the fillet onto the tab's top edge
  const joinedTop = t.corner < R_PANEL;
  const [x0, y0] = joinedTop ? [X_END, top - gapTop] : [X_EDGE, top - t.fillet];
  let d = joinedTop ? `H${X_EDGE + t.corner}A${t.corner} ${t.corner} 0 0 0 ${X_EDGE} ${top - gapTop + t.corner}` : "";
  d += `V${top - t.fillet}A${t.fillet} ${t.fillet} 0 0 1 ${X_EDGE - t.fillet} ${top}`;
  // The tab: top edge, both 12px left corners, bottom edge
  d += `H${TAB_R}A${R_TAB} ${R_TAB} 0 0 0 0.5 ${TAB_R}V${h - TAB_R}A${R_TAB} ${R_TAB} 0 0 0 ${TAB_R} ${bottom}`;
  // Bottom joint: the fillet onto the panel's edge, then its corner while shrunk
  d += `H${X_EDGE - b.fillet}A${b.fillet} ${b.fillet} 0 0 1 ${X_EDGE} ${bottom + b.fillet}`;
  let y1 = bottom + b.fillet;
  if (b.corner < R_PANEL) {
    y1 = bottom + gapBottom;
    d += `V${y1 - b.corner}A${b.corner} ${b.corner} 0 0 0 ${X_EDGE + b.corner} ${y1}H${X_END}`;
  }
  return { outline: `M${x0} ${y0}${d}`, fill: `M${X_END} ${y0}L${x0} ${y0}${d}L${X_END} ${y1}Z` };
}

/** A joint `gap` px from the panel's end: full size from JOIN px out, shrinking with the panel's corner to a straight edge at 0. */
function joint(gap: number) {
  const k = Math.min(1, Math.max(0, gap) / JOIN);
  return { fillet: R_TAB * k, corner: R_PANEL * k };
}

/** CSS's cubic-bezier() as a function — the tab is drawn from its position every frame, so its curve can't live in a transition. */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
  return (x: number) => {
    // x rises with t (x1 and x2 are within 0–1), so bisect for the t that lands on x
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (at(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return at(y1, y2, (lo + hi) / 2);
  };
}
