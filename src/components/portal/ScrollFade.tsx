"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Depth of each ramp, in px. */
const RAMP = 24;

/**
 * Fades whichever edges of a scroller still have content behind them, so a half-cut card reads as
 * "there's more this way" instead of a broken layout.
 *
 * Wrap the scroll container directly — this box should hug it, so the ramps land on the scrollport
 * edges rather than out in a page gutter. They paint just above the cards and peak below solid
 * white, so the cut edge is buried without erasing the outline underneath it.
 */
export function ScrollFade({ className = "", children }: { className?: string; children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ top: false, bottom: false, left: false, right: false, barX: 0, barY: 0 });

  useEffect(() => {
    const el = host.current?.firstElementChild;
    if (!(el instanceof HTMLElement)) return;
    const update = () =>
      setEdge({
        top: el.scrollTop > 1,
        bottom: Math.ceil(el.scrollTop + el.clientHeight) < el.scrollHeight - 1,
        left: el.scrollLeft > 1,
        right: Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth - 1,
        barX: el.offsetHeight - el.clientHeight,
        barY: el.offsetWidth - el.clientWidth,
      });
    update();
    el.addEventListener("scroll", update, { passive: true });
    // Catches both the scroller resizing and its content growing (cards added, columns filtered).
    // Deferred a frame: when content grows the browser clamps scrollTop *after* this callback and
    // doesn't always fire a scroll event, which would otherwise leave a fade stuck on.
    const ro = new ResizeObserver(() => requestAnimationFrame(update));
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  /**
   * One continuous stop-to-stop ramp — no mid stop, so there's no banding edge in it. It peaks at
   * 80% rather than solid white: enough to bury the cut at the very edge, sheer enough that a card
   * outline running through it stays legible a few px in.
   */
  const ramp = (to: string) => `linear-gradient(to ${to}, rgb(255 255 255 / 0.8), transparent)`;

  // z-5 under `isolate`: above the cards (which are position:relative at z-auto) so the fade is
  // actually visible, but below their own z-10 dropdown menu so it never washes that out.
  const base = "pointer-events-none absolute z-[5] transition-opacity duration-200";
  const edges = [
    ["top", "top-0 left-0", { right: edge.barY, height: RAMP, backgroundImage: ramp("bottom") }],
    ["bottom", "left-0", { right: edge.barY, bottom: edge.barX, height: RAMP, backgroundImage: ramp("top") }],
    ["left", "top-0 left-0", { bottom: edge.barX, width: RAMP, backgroundImage: ramp("right") }],
    ["right", "top-0", { right: edge.barY, bottom: edge.barX, width: RAMP, backgroundImage: ramp("left") }],
  ] as const;

  return (
    <div ref={host} className={`relative isolate ${className}`}>
      {children}
      {edges.map(([side, cls, style]) => (
        <span key={side} aria-hidden className={`${base} ${cls} ${edge[side] ? "opacity-100" : "opacity-0"}`} style={style} />
      ))}
    </div>
  );
}
