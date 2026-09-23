"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, Modal } from "@/components/independent/ui";
import { useHydrated } from "@/lib/demo/deal";
import { signOut } from "@/lib/demo/auth";
import { unseenByAdmin, useDisputes } from "@/lib/demo/disputes";
import { unreadChat, useLive } from "@/lib/demo/live";
import { menuItemFor, sectionFor } from "@/lib/portal/nav";
import type { Section } from "@/lib/portal/nav";

/*
 * Geometry is lifted 1:1 from the Figma frames (1512×982):
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
  const rail = sections.filter((s) => !s.hidden);
  const activeIndex = rail.indexOf(section); // -1 when a hidden section (Profile) is open
  const activeMenuHref = menuItemFor(section, pathname);
  const [collapsed, setCollapsed] = useState(false);
  /** Destination of a pending log-out, held while the confirm dialog is open. */
  const [logout, setLogout] = useState<string | null>(null);
  const hydrated = useHydrated();
  const router = useRouter();

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
        /* TB-008 / IN-008 — the rail carries a section's total too, so unread messages are visible
           from every section, not only the one whose submenu happens to list Messages. */
        [root]: unreadChat(live, side),
      };

  return (
    // min-h keeps the rail + avatar intact on short viewports (the page scrolls instead of squashing)
    <div className="flex h-dvh min-h-[700px] gap-1 bg-surface-2 p-1 font-sans text-ink">
      {/* Sidebar width eases 336 ↔ 152; main is flex-1 so it follows the same curve. */}
      <div
        className={`relative h-full shrink-0 overflow-hidden transition-[width] ${EASE} ${
          collapsed ? "w-[152px]" : "w-[336px]"
        }`}
      >
        {/* Icon rail */}
        <nav aria-label="Sections" className="absolute top-0 left-0 h-full w-24 overflow-clip rounded-lg">
          <ul className="flex flex-col pl-2">
            {rail.map((s, i) => {
              const active = i === activeIndex;
              const badge = badges[s.href] ?? 0;
              return (
                <li key={s.href} className="relative z-20">
                  <Link
                    href={s.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex h-[68px] w-full flex-col items-center gap-1 px-2 py-4 text-[10px] leading-[1.2] tracking-[0.2px] whitespace-nowrap
                      ${active ? "font-semibold text-accent-ink" : "font-normal text-ink-2"}`}
                  >
                    <RailGlyph icon={s.icon} active={active} />
                    {badge > 0 && (
                      <span aria-label={`${badge} unread`} className="pointer-events-none absolute top-2.5 right-[22px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1.5 text-[10.5px] leading-none font-semibold text-white">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                    {s.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          {/* z-20: paints above the active tab when Profile is open */}
          <Link
            href={profileHref}
            aria-label="My profile"
            aria-current={activeIndex === -1 ? "page" : undefined}
            className="absolute bottom-0 left-5 z-20 flex h-[68px] w-16 items-center justify-center rounded-lg px-2 py-4"
          >
            <span className="rounded-full p-[4.8px]">
              <Image
                src={avatar}
                alt=""
                width={128}
                height={128}
                priority
                className="size-[38.4px] rounded-full bg-[#d2d8db] object-cover"
              />
            </span>
          </Link>
        </nav>

        {/* Active tab — one outline with the panel's edge, above the panel so it hides that stroke where
            they join. Profile (hidden section, reached from the avatar) is the same shape flipped to the bottom. */}
        <ActiveTab index={activeIndex >= 0 ? activeIndex : "profile"} />

        {/* Section panel — ONE set of DOM nodes for both states so items morph instead of swapping. */}
        <div
          className={`absolute top-0 left-24 h-full overflow-clip rounded-lg bg-white shadow-[inset_0_0_0_1px_#c3c3c3] ${EASE} transition-[width] ${
            collapsed ? "w-14" : "w-60"
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
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            aria-expanded={!collapsed}
            className={`absolute flex size-6 items-center justify-center rounded-lg text-ink-2 ${EASE} transition-[left,top]`}
            style={{ left: collapsed ? 15 : 200, top: collapsed ? 15 : 16 }}
          >
            <CollapseIcon size={20} aria-hidden className={`${EASE} transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>

          {/* z-20: above the active tab's 12px overhang (z-10) */}
          <ul
            className={`absolute z-20 flex flex-col ${EASE} transition-[left,top,gap] ${collapsed ? "gap-0.5" : "gap-2"}`}
            style={{ left: collapsed ? 7 : 16, top: collapsed ? 55 : 64 }}
          >
            {section.menu.map((item) => {
              const active = item.href === activeMenuHref;
              const Glyph = ICONS[item.icon];
              const cls = `flex items-center gap-2 overflow-hidden rounded-lg p-2 text-[14px] leading-[1.2] tracking-[0.2px] whitespace-nowrap ${EASE} transition-[width,height] ${
                active ? "bg-accent-bg font-semibold text-accent-ink" : "font-normal text-ink-2"
              }`;
              const style = collapsed ? { width: 40, height: 40 } : { width: 208, height: 34 };
              const body = (
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
              const badge = badges[item.href] ?? 0;
              return (
                <li key={item.href} className="relative">
                  {badge > 0 && (
                    <span
                      aria-label={`${badge} unread`}
                      className={`pointer-events-none absolute z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1.5 text-[10.5px] leading-none font-semibold text-white ${EASE} transition-[left,top]`}
                      style={collapsed ? { left: 24, top: 2 } : { left: 178, top: 8 }}
                    >
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                  {item.action === "logout" ? (
                    <button type="button" onClick={() => setLogout(item.href)} aria-label={collapsed ? item.label : undefined} className={cls} style={style}>
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
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-clip rounded-lg bg-white shadow-[inset_0_0_0_1px_#c3c3c3]">
        {/* The demo's records live in localStorage, so the page waits one paint for them rather
            than rendering against nothing — a detail screen would otherwise 404 on a refresh. */}
        {/* Pages read the URL (?from=, ?tab=), which a prerendered page may only do under a
            Suspense boundary — this one covers every portal page, so none needs its own. */}
        <Suspense>{hydrated ? children : null}</Suspense>
      </div>

      <Modal
        open={!!logout}
        onClose={() => setLogout(null)}
        tone="danger"
        title="Log out?"
        description="You'll be signed out of this device. Anything you haven't saved is lost, and you'll need to sign in again to get back in."
        footer={
          <>
            <Button size="lg" onClick={() => setLogout(null)}>
              Cancel
            </Button>
            <Button size="lg" variant="danger" onClick={() => { signOut(); if (logout) router.push(logout); }}>
              Log out
            </Button>
          </>
        }
      />
    </div>
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
 * Figma's "active-tab" vector: a white body with a 12px left radius and a 1px #c3c3c3 stroke,
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
