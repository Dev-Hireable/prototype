"use client";

import Image from "next/image";
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ICONS } from "@/components/icons";
import { Button } from "@/components/portal/ui";
import { placeCard, spotlightBox, type Box } from "@/lib/portal/tour-placement";
import { GUIDES, type Tour } from "@/lib/portal/tours";

const Forward = ICONS.arrowForward;
/** The dim over the rest of the screen: dark enough that the highlighted part is plainly the one to look at. */
const DIM = "rgba(17, 24, 39, 0.6)";

export type TourControls = { onBack: () => void; onNext: () => void; onSkip: () => void; onAction: () => void };

/** The highlight's corner radius: rounded-xl, as the ring drawn round it. */
const HOLE_RADIUS = 12;

/**
 * The dim as one path: the whole window and, with `hole`, a rounded rectangle cut out of it. The
 * hole is always drawn, at no size when there's nothing to highlight, so the shape keeps the same
 * commands from step to step and can ease between them.
 */
function dimPath(view: { width: number; height: number }, hole: Box | null) {
  const { x, y, width: w, height: h } = hole ?? { x: view.width / 2, y: view.height / 2, width: 0, height: 0 };
  const r = Math.min(HOLE_RADIUS, w / 2, h / 2);
  const cut = `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  return `M0 0H${view.width}V${view.height}H0Z${cut}`;
}

/** Whether the reader asked for less motion — false on the server, then live. */
function useReducedMotion() {
  return useSyncExternalStore(
    (fn) => {
      const m = matchMedia("(prefers-reduced-motion: reduce)");
      m.addEventListener("change", fn);
      return () => m.removeEventListener("change", fn);
    },
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/** The step's element, if it's on screen: there, laid out, and not in a part of the page that's switched off. */
function findTarget(selector: string | undefined): HTMLElement | null {
  if (!selector) return null;
  const el = document.querySelector<HTMLElement>(selector);
  if (!el || el.closest("[inert]")) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? el : null;
}

/** Brings the element into view unless all of it already is. */
function revealTarget(el: HTMLElement, reduced: boolean) {
  const r = el.getBoundingClientRect();
  const inView = r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth;
  if (!inView) el.scrollIntoView({ block: "center", inline: "nearest", behavior: reduced ? "auto" : "smooth" });
}

/**
 * Where the step's element is on screen, kept up to date as the page scrolls, resizes or settles
 * (a smooth scroll, the sidebar folding). Null for a step with nothing to highlight.
 */
function useTargetBox(selector: string | undefined, reduced: boolean): Box | null {
  const [box, setBox] = useState<Box | null>(null);
  useEffect(() => {
    let el = findTarget(selector);
    if (el) revealTarget(el, reduced);
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!el?.isConnected) el = findTarget(selector);
        const r = el?.getBoundingClientRect();
        setBox(r && r.width > 0 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null);
      });
    };
    measure();
    const timers = [150, 400, 800].map((ms) => setTimeout(measure, ms));
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    if (el) observer.observe(el);
    addEventListener("resize", measure);
    addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
      observer.disconnect();
      removeEventListener("resize", measure);
      removeEventListener("scroll", measure, true);
    };
  }, [selector, reduced]);
  return box;
}

/** The card's top-left corner beside `box`, from the card's own measured size. */
function useCardPosition(cardRef: RefObject<HTMLDivElement | null>, box: Box | null, step: number) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const card = cardRef.current?.getBoundingClientRect();
    if (!card) return;
    // oxlint-disable-next-line react/set-state-in-effect -- placed from its measured size, before paint
    setPos(placeCard(box, { width: card.width, height: card.height }, { width: innerWidth, height: innerHeight }));
  }, [cardRef, box, step]);
  return pos;
}

/**
 * The tour on screen: the page dimmed, a cut-out round the step's element, and the step's card
 * beside it. The page under it can't be clicked while it's up; the card is the dialog, and keeps
 * the keyboard: ← and → step, Esc skips, Tab stays inside.
 *
 * It's portalled to <body>, outside the app's laptop zoom (.ui-zoom), so the cut-out lines up with
 * what the browser measures; the card zooms itself, as the app's other popups do.
 */
export function TourOverlay({ tour, step, ...controls }: { tour: Tour; step: number } & TourControls) {
  const reduced = useReducedMotion();
  const current = tour.steps[step];
  const box = useTargetBox(current.target, reduced);
  const cardRef = useRef<HTMLDivElement>(null);
  const pos = useCardPosition(cardRef, box, step);
  const view = { width: typeof innerWidth === "number" ? innerWidth : 0, height: typeof innerHeight === "number" ? innerHeight : 0 };
  const moves = reduced ? "" : "transition-[left,top,width,height] duration-300 ease-out";
  const hole = box ? spotlightBox(box, view) : null;

  return createPortal(
    <div className="fixed inset-0 z-[80]" data-tour-overlay={hole ? "highlight" : "centred"}>
      {/* The dim, with the highlight cut out of it, takes the clicks: the page waits while the tour
          talks about it. One shape with a hole (even-odd), not a huge box-shadow round the hole,
          which Chrome drew at a fraction of its colour. */}
      <svg aria-hidden className="absolute inset-0 size-full">
        <path fillRule="evenodd" fill={DIM} className={reduced ? "" : "transition-[d] duration-300 ease-out"} style={{ d: `path("${dimPath(view, hole)}")` }} />
      </svg>
      {hole && <div aria-hidden className={`pointer-events-none absolute rounded-xl outline-2 outline-white ${moves}`} style={{ left: hole.x, top: hole.y, width: hole.width, height: hole.height }} />}
      <div ref={cardRef} className={`absolute ${pos ? moves : "opacity-0"}`} style={{ left: pos?.x ?? 0, top: pos?.y ?? 0 }}>
        <TourCard tour={tour} step={step} {...controls} />
      </div>
    </div>,
    document.body,
  );
}

/** ← / → step and Esc skips; Tab and Shift+Tab go round the card's controls instead of out to the page under it. */
function useCardKeys(controls: TourControls, first: boolean) {
  return (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") return controls.onSkip();
    if (e.key === "ArrowRight") return controls.onNext();
    if (e.key === "ArrowLeft" && !first) return controls.onBack();
    if (e.key !== "Tab") return;
    const focusable = [...e.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled])")];
    const at = focusable.indexOf(document.activeElement as HTMLElement);
    const next = e.shiftKey ? (at <= 0 ? focusable.length - 1 : at - 1) : at === focusable.length - 1 ? 0 : at + 1;
    e.preventDefault();
    focusable[next]?.focus();
  };
}

/** The step's card: who's talking and how far along it is, what this is and when to use it, and the controls. */
function TourCard({ tour, step, ...controls }: { tour: Tour; step: number } & TourControls) {
  const guide = GUIDES[tour.side];
  const current = tour.steps[step];
  const first = step === 0;
  const last = step === tour.steps.length - 1;
  const id = useId();
  const footerRef = useRef<HTMLDivElement>(null);
  // Every step lands on its main button, so Enter carries on and the step is read out from there.
  useEffect(() => {
    (footerRef.current?.lastElementChild as HTMLElement | null)?.focus({ preventScroll: true });
  }, [step]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-body`}
      onKeyDown={useCardKeys(controls, first)}
      className="ui-zoom flex w-[min(360px,calc((100vw-24px)/var(--ui-scale)))] flex-col gap-4 rounded-xl bg-white p-5 text-ink shadow-[0_12px_32px_rgba(0,0,0,.24)]"
    >
      <TourCardHeader name={guide.name} avatar={guide.avatar} step={step} total={tour.steps.length} />
      <div aria-live="polite" className="flex flex-col gap-1.5">
        <h2 id={`${id}-title`} className="text-[16px] leading-[1.4] font-semibold tracking-[0.2px]">
          {current.title}
        </h2>
        <p id={`${id}-body`} className="text-[14px] leading-[1.45] tracking-[0.2px] text-ink-2">
          {current.body}
        </p>
      </div>
      {last && current.action && (
        <button type="button" onClick={controls.onAction} className="flex items-center gap-1.5 self-start text-[14px] font-semibold text-accent-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          {current.action.label} <Forward size={18} aria-hidden />
        </button>
      )}
      <div className="flex items-center justify-between gap-3">
        {last ? <span /> : (
          <button type="button" onClick={controls.onSkip} className="text-[14px] font-medium text-ink-2 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            Skip tour
          </button>
        )}
        <div ref={footerRef} className="flex items-center gap-2">
          {!first && <Button onClick={controls.onBack}>Back</Button>}
          <Button variant="primary" onClick={controls.onNext}>
            {last ? "Finish" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** The guide's face and name, and where the tour has got to. */
function TourCardHeader({ name, avatar, step, total }: { name: string; avatar: string; step: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <Image src={avatar} alt="" width={40} height={40} unoptimized className="size-10 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px]">{name}</span>
        <span className="text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
          Step {step + 1} of {total}
        </span>
      </div>
    </div>
  );
}
