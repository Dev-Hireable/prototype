'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';

/** How far the closing line zooms in the middle of the screen, where there's room for it. */
const SPOTLIGHT_SCALE = 1.4;
/** Seconds the line takes to travel from the chat to the middle. */
const SPOTLIGHT_TRAVEL_S = 0.8;

type SpotlightFlight = {
  /** The chat row the line lifts out of, while it's still in the chat. */
  row: HTMLElement | null;
  /** Where the row's bottom-left corner sits: the avatar's corner, which both layouts share. */
  fromLeft: number;
  fromBottom: number;
  to: DOMRect;
  scale: number;
  /**
   * Screen px per layout px. The app is drawn at a UI scale (--ui-scale), so what
   * getBoundingClientRect reports is scaled while widths and transforms are not.
   */
  screen: number;
};

/** How far right an element runs from the row's left edge (0 if it isn't there). */
function reach(el: Element | null | undefined, rowLeft: number) {
  return el ? el.getBoundingClientRect().right - rowLeft : 0;
}

/**
 * Lays the spotlight's line out exactly like the chat row (name shown only if the row shows it,
 * and only as wide as the row's bubble, so it wraps alike and centres on its real width),
 * then measures where it travels from and to.
 */
function measureSpotlightFlight(
  content: HTMLDivElement,
  line: HTMLDivElement,
): SpotlightFlight {
  const messages = content.querySelectorAll('[data-quiz-assistant-message]');
  const message = messages[messages.length - 1] ?? null;
  const row = message?.closest<HTMLElement>('[data-quiz-assistant-row]') ?? null;
  const from = row?.getBoundingClientRect();
  const screen =
    row && from && from.width > 0 && row.offsetWidth > 0
      ? from.width / row.offsetWidth
      : 1;

  if (row && from) {
    const name = line.querySelector<HTMLElement>('[data-spotlight-name]');
    if (name && !row.querySelector('[data-quiz-assistant-name]')) {
      name.style.display = 'none';
    }
    // From the row's left edge to the end of its bubble (or its name, if that runs further),
    // plus a pixel for rounding: the bubble hugs its text, so it wraps the same at that width.
    const widest = Math.max(
      reach(message, from.left),
      reach(row.querySelector('[data-quiz-assistant-name]'), from.left),
    );
    line.style.width = `${Math.ceil((widest > 0 ? widest : from.width) / screen) + 1}px`;
  }

  const to = line.getBoundingClientRect();
  // Lift off from where the row can be seen: the chat may still be scrolling it into view.
  const chat = row
    ?.closest<HTMLElement>('[data-onboarding-quiz-chat]')
    ?.getBoundingClientRect();
  const fromBottom =
    from && chat
      ? Math.min(Math.max(from.bottom, chat.top + from.height), chat.bottom)
      : (from?.bottom ?? 0);
  const scale = Math.max(
    1,
    Math.min(SPOTLIGHT_SCALE, (content.clientWidth - 48) / (to.width / screen)),
  );
  return { row, fromLeft: from?.left ?? 0, fromBottom, to, scale, screen };
}

/**
 * The flight: the line leaves the chat row (hidden meanwhile) for the middle, zooming a little on
 * the way, or fades in there if the row is gone. Once it lands, the spinner comes in beside the
 * bubble and turns until the curtain: it sits outside the text, so nothing in it moves.
 */
function playSpotlightFlight(
  line: HTMLDivElement,
  spinner: HTMLSpanElement,
  { row, fromLeft, fromBottom, to, scale, screen }: SpotlightFlight,
) {
  return gsap.context(() => {
    const timeline = gsap.timeline();
    // Scale from the bottom-left corner, where the avatar is, so the corner is the anchor.
    gsap.set(line, { transformOrigin: '0% 100%' });
    // Land centred: the zoom grows the line from its corner, so shift back by half the growth.
    const landX = (-(scale - 1) * to.width) / screen / 2;
    const landY = ((scale - 1) * to.height) / screen / 2;
    if (row) {
      row.style.visibility = 'hidden';
      timeline.fromTo(
        line,
        {
          x: (fromLeft - to.left) / screen,
          y: (fromBottom - to.bottom) / screen,
          scale: 1,
        },
        {
          x: landX,
          y: landY,
          scale,
          duration: SPOTLIGHT_TRAVEL_S,
          ease: 'power3.inOut',
        },
      );
    } else {
      timeline.fromTo(
        line,
        { autoAlpha: 0, x: landX, y: landY + 8, scale },
        { autoAlpha: 1, y: landY, duration: 0.5, ease: 'power3.out' },
      );
    }
    timeline.fromTo(
      spinner,
      { autoAlpha: 0, scale: 0.6 },
      { autoAlpha: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' },
      '-=0.15',
    );
  });
}

/**
 * The wrap-up spotlight's flight (QuizFinalSpotlight), set up before its first paint and undone
 * when it goes. Returns the refs for its line and its spinner.
 */
export function useSpotlightEntrance(
  contentRef: RefObject<HTMLDivElement | null>,
) {
  const lineRef = useRef<HTMLDivElement>(null);
  const spinnerRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const line = lineRef.current;
    const spinner = spinnerRef.current;
    const content = contentRef.current;
    if (!line || !spinner || !content) return;

    const flight = measureSpotlightFlight(content, line);
    const ctx = playSpotlightFlight(line, spinner, flight);

    return () => {
      ctx.revert();
      line.style.width = '';
      if (flight.row) flight.row.style.visibility = '';
    };
  }, [contentRef]);

  return { lineRef, spinnerRef };
}
