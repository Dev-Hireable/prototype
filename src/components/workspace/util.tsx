"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Renders a long list a slice at a time: the first `step` rows, then the next slice as the end of
 * the list comes within a screen of view. A 600-item board mounts about a tenth of its cards up
 * front, and scrolling never hits a blank gap. `as` matches the list's element (a table needs a row).
 */
export function useProgressive(total: number, step = 60, as: "li" | "tr" = "li"): { shown: number; sentinel: ReactNode } {
  const [shown, setShown] = useState(step);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || shown >= total) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setShown((s) => s + step);
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [shown, total, step]);
  const sentinel =
    shown < total ? (
      as === "tr" ? (
        <tr ref={ref as React.RefObject<HTMLTableRowElement>} aria-hidden className="h-px">
          <td colSpan={99} />
        </tr>
      ) : (
        <li ref={ref as React.RefObject<HTMLLIElement>} aria-hidden className="h-px shrink-0 list-none" />
      )
    ) : null;
  return { shown, sentinel };
}

/** Put the focus back on an item after it moves (it re-mounts in its new column or row). */
export function focusItem(id: string) {
  if (typeof document === "undefined") return;
  const find = () => document.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(id)}"]`);
  requestAnimationFrame(() => requestAnimationFrame(() => find()?.focus({ preventScroll: false })));
}

/** "just now", "5 min ago", "3 h ago", or the day — when something was last changed. */
export function ago(ms: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} ${d === 1 ? "day" : "days"} ago`;
  const date = new Date(ms);
  return `${date.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getMonth()]} ${date.getFullYear()}`;
}

/** The width of an element, kept current as it resizes. Pass the setter as the element's ref. */
export function useWidth<T extends HTMLElement>(): [(el: T | null) => void, number] {
  const [el, setEl] = useState<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, width];
}
