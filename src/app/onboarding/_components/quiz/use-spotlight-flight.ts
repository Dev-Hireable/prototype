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
  from: DOMRect | undefined;
  to: DOMRect;
  fromTop: number;
  scale: number;
};

/**
 * Where the closing line travels from and to, and how far it zooms on the way. Sets the
 * spotlight's line to the chat row's width first, so the two wrap alike.
 */
function measureSpotlightFlight(
  content: HTMLDivElement,
  line: HTMLDivElement,
): SpotlightFlight {
  const lines = content.querySelectorAll('[data-quiz-assistant-message]');
  const row =
    lines[lines.length - 1]?.closest<HTMLElement>(
      '[data-quiz-assistant-row]',
    ) ?? null;
  const from = row?.getBoundingClientRect();
  // As wide as the row, so the line wraps exactly as it did in the chat.
  if (from) line.style.width = `${from.width}px`;
  const to = line.getBoundingClientRect();
  // Lift off from where the line can be seen: the chat may still be scrolling it into view.
  const chat = row
    ?.closest<HTMLElement>('[data-onboarding-quiz-chat]')
    ?.getBoundingClientRect();
  const fromTop =
    from && chat
      ? Math.min(Math.max(from.top, chat.top), chat.bottom - from.height)
      : (from?.top ?? 0);
  const scale = Math.max(
    1,
    Math.min(SPOTLIGHT_SCALE, (content.clientWidth - 48) / to.width),
  );
  return { row, from, to, fromTop, scale };
}

/**
 * The flight itself: the card leaves the chat row (hidden meanwhile) for the middle, zooming as it
 * goes, or fades in there if the row is gone; the spinner comes in as it settles.
 */
function playSpotlightFlight(
  card: HTMLDivElement,
  spinner: HTMLSpanElement,
  { row, from, to, fromTop, scale }: SpotlightFlight,
) {
  return gsap.context(() => {
    const timeline = gsap.timeline();
    if (row && from) {
      row.style.visibility = 'hidden';
      timeline.fromTo(
        card,
        { x: from.left - to.left, y: fromTop - to.top, scale: 1 },
        {
          x: 0,
          y: 0,
          scale,
          duration: SPOTLIGHT_TRAVEL_S,
          ease: 'power3.inOut',
        },
      );
    } else {
      timeline.fromTo(
        card,
        { autoAlpha: 0, scale: scale * 0.94 },
        { autoAlpha: 1, scale, duration: 0.5, ease: 'power3.out' },
      );
    }
    // The spinner comes in as the line settles, and turns until the curtain.
    timeline.fromTo(
      spinner,
      { autoAlpha: 0, scale: 0.6 },
      { autoAlpha: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' },
      '-=0.25',
    );
  });
}

/**
 * The wrap-up spotlight's flight (QuizFinalSpotlight), set up before its first paint and undone
 * when it goes. Returns the refs for its card, its line and the spinner.
 */
export function useSpotlightFlight(
  contentRef: RefObject<HTMLDivElement | null>,
) {
  const cardRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const spinnerRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const card = cardRef.current;
    const line = lineRef.current;
    const spinner = spinnerRef.current;
    const content = contentRef.current;
    if (!card || !line || !spinner || !content) return;

    const flight = measureSpotlightFlight(content, line);
    const ctx = playSpotlightFlight(card, spinner, flight);

    return () => {
      ctx.revert();
      line.style.width = '';
      if (flight.row) flight.row.style.visibility = '';
    };
  }, [contentRef]);

  return { cardRef, lineRef, spinnerRef };
}
