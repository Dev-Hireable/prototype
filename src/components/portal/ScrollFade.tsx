"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Depth of the top and side fades, in px. */
const RAMP = 24;
/** The bottom one is deeper and fades right out (globals.css says why). */
const RAMP_BOTTOM = 64;

/**
 * Fades whichever edges of a scroller still have content behind them, so a half-cut card reads as
 * "there's more this way" instead of a broken layout.
 *
 * Wrap the scroll container directly: the first child is the scroller, and it carries the
 * `edge-fade` class (globals.css) in its own className, so React keeps it through re-renders.
 * This keeps the mask's edge lengths and scrollbar sizes in step with the scroll position. It used to lay white gradient strips over the scroller instead — and those
 * painted over whatever sat under them, including the border of the panel the scroller runs
 * flush against, which disappeared along the bottom of every page with more content below. The
 * mask only thins the scroller's own content, so nothing outside it is ever covered; menus are
 * portalled to <body>, so they're outside it too.
 */
export function ScrollFade({ className = "", children }: { className?: string; children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current?.firstElementChild;
    if (!(el instanceof HTMLElement)) return;
    const set = (name: string, on: boolean, depth = RAMP) => el.style.setProperty(name, on ? `${depth}px` : "0px");
    const update = () => {
      set("--fade-top", el.scrollTop > 1);
      set("--fade-bottom", Math.ceil(el.scrollTop + el.clientHeight) < el.scrollHeight - 1, RAMP_BOTTOM);
      set("--fade-left", el.scrollLeft > 1);
      set("--fade-right", Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth - 1);
      // The bars' own size, so the mask's solid strips cover them exactly (0 for overlay bars).
      el.style.setProperty("--bar-y", `${el.offsetWidth - el.clientWidth}px`);
      el.style.setProperty("--bar-x", `${el.offsetHeight - el.clientHeight}px`);
    };
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

  return (
    // Still the positioned, isolated box it always was, so nothing laid out against it moves.
    <div ref={host} className={`relative isolate ${className}`}>
      {children}
    </div>
  );
}
