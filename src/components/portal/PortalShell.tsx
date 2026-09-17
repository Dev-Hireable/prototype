"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, Modal } from "@/components/independent/ui";
import { signOut } from "@/lib/demo/auth";
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
  const router = useRouter();

  /* Live unread counts on the Messages and Notifications nav items (TB-007/008, IN-007/008). */
  const live = useLive();
  const side = pathname.startsWith("/team") ? "team" : "independent";
  const root = `/${side === "team" ? "team" : "independent"}`;
  const badges: Record<string, number> = {
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
                      <span aria-label={`${badge} unread`} className="pointer-events-none absolute top-2.5 right-[22px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 text-[10.5px] leading-none font-semibold text-white">
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

        {/* Active tab silhouette — sits above the panel so it hides the panel's left stroke.
            Profile (hidden section, reached from the avatar) is the same shape flipped to the bottom. */}
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
                      className={`pointer-events-none absolute z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 text-[10.5px] leading-none font-semibold text-white ${EASE} transition-[left,top]`}
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
        {children}
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

/**
 * Pure-CSS version of Figma's exported "active-tab" vector: a white body with a 12px
 * left radius and 1px #c3c3c3 stroke, plus two 12px concave fillets where the tab meets
 * the panel edge. The end tabs have one fillet only: Home's top edge and Profile's bottom
 * edge run straight into the panel's border (Figma flips the Home shape for Profile).
 */
function ActiveTab({ index }: { index: number | "profile" }) {
  const top = index === "profile" ? `calc(100% - ${TAB_H}px)` : index * TAB_H;
  // The end tabs' straight edge only extends over the panel corner once the tab has *arrived*.
  const [settled, setSettled] = useState<number | "profile" | null>(index);
  const arrived = settled === index;
  const straight = index === 0 ? "top" : index === "profile" ? "bottom" : null;

  return (
    // `top` overshoots and settles ("gooey") on every move, end items included
    <span
      aria-hidden
      className="pointer-events-none absolute z-10 transition-[top] duration-500 ease-[cubic-bezier(.3,1.35,.5,1)]"
      style={{ left: 8, top, width: 100, height: TAB_H }}
      onTransitionStart={(e) => {
        if (e.propertyName === "top") setSettled(null);
      }}
      onTransitionEnd={(e) => {
        if (e.propertyName === "top") setSettled(index);
      }}
    >
      <span className="absolute inset-0 rounded-l-[12px] bg-white" />
      <span className="absolute top-0 left-0 h-full w-[76px] rounded-l-[12px] border-y border-l border-border" />
      {straight === "top" ? <StraightEdge side="top" long={arrived} /> : <Fillet corner="top" />}
      {straight === "bottom" ? <StraightEdge side="bottom" long={arrived} /> : <Fillet corner="bottom" />}
    </span>
  );
}

/** Straight stroke from the tab body to the panel: 12px while sliding, 24px once settled (covers the panel's rounded corner like the Figma export). */
function StraightEdge({ side, long }: { side: "top" | "bottom"; long: boolean }) {
  return <span className="absolute left-[76px] h-px bg-border" style={{ [side]: 0, width: long ? 24 : 12 }} />;
}

/**
 * A 12px concave corner: a 12×12 box with its outer corner rounded off and stroked on the two
 * edges that form the arc; a white box-shadow fills the cut-off corner. The wrapper clips the
 * shadow so only the region between the tab edge and the panel edge is painted.
 */
function Fillet({ corner }: { corner: "top" | "bottom" }) {
  const isTop = corner === "top";
  return (
    <span
      className="absolute overflow-hidden"
      // 13px wide so the right stroke lands on the panel's stroke column; shifted 1px so the
      // straight stroke shares a row with the tab body's border
      style={{ left: 76, top: isTop ? 1 - TAB_R : TAB_H - 1, width: TAB_R + 1, height: TAB_R }}
    >
      <span
        className={`absolute inset-0 border-r border-border ${
          isTop ? "rounded-br-[12px] border-b" : "rounded-tr-[12px] border-t"
        }`}
        style={{ boxShadow: `0 0 0 ${TAB_R}px #fff` }}
      />
    </span>
  );
}
