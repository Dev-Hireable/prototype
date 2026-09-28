'use client';

import { useGSAP } from '@gsap/react';
import type { RefObject } from 'react';
import { loadGsap, reportGsapLoadError } from '@/web-app/lib/load-gsap';
import { prefersReducedMotion } from '@/web-app/lib/motion';

type TimelineController = {
  kill: () => void;
};

type ResultsAnimationTargets = {
  badge: Element | null;
  header: Element | null;
  tags: NodeListOf<Element>;
  summary: Element | null;
  button: Element | null;
};

function getResultsAnimationTargets(
  container: HTMLDivElement,
): ResultsAnimationTargets {
  return {
    badge: container.querySelector('[data-results-badge]'),
    header: container.querySelector('[data-results-header]'),
    tags: container.querySelectorAll('.worktrait-tag'),
    summary: container.querySelector('[data-results-summary]'),
    button: container.querySelector('[data-results-button]'),
  };
}

type EntranceStep = {
  target: keyof ResultsAnimationTargets;
  from: gsap.TweenVars;
  to: gsap.TweenVars;
  /** Where it starts on the timeline: right after the step before when unset. */
  position?: string;
};

/**
 * The results come in top to bottom, each overlapping the one before: the badge, the header, the
 * tags one after another, the summary, then the button.
 */
const RESULTS_ENTRANCE_STEPS: readonly EntranceStep[] = [
  {
    target: 'badge',
    from: { autoAlpha: 0, y: 18, scale: 0.94 },
    to: {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      duration: 0.72,
      ease: 'power3.out',
      clearProps: 'opacity,visibility,transform',
    },
  },
  {
    target: 'header',
    from: { autoAlpha: 0, y: 20 },
    to: {
      autoAlpha: 1,
      y: 0,
      duration: 0.62,
      ease: 'power3.out',
      clearProps: 'opacity,visibility,transform',
    },
    position: '-=0.28',
  },
  {
    target: 'tags',
    from: { opacity: 0, scale: 0.85, y: 24 },
    to: {
      opacity: 1,
      scale: 1,
      y: 0,
      stagger: 0.1,
      duration: 0.5,
      ease: 'back.out(1.7)',
      clearProps: 'opacity,transform',
    },
    position: '-=0.4',
  },
  {
    target: 'summary',
    from: { autoAlpha: 0, y: 20 },
    to: {
      autoAlpha: 1,
      y: 0,
      duration: 0.5,
      ease: 'power3.out',
      clearProps: 'opacity,visibility,transform',
    },
    position: '-=0.18',
  },
  {
    target: 'button',
    from: { autoAlpha: 0, y: 20 },
    to: {
      autoAlpha: 1,
      y: 0,
      duration: 0.52,
      ease: 'power3.out',
      clearProps: 'opacity,visibility,transform',
    },
    position: '-=0.16',
  },
];

/** Whether a step's target is on the page: its element, or at least one tag. */
function isOnPage(
  target: ResultsAnimationTargets[keyof ResultsAnimationTargets],
): target is Element | NodeListOf<Element> {
  return target instanceof NodeList ? target.length > 0 : target !== null;
}

/**
 * The entrance timeline, over whichever of the results are on the page. Each step gets fresh
 * vars: GSAP writes into the ones it's given.
 */
function buildResultsEntrance(
  gsap: typeof import('gsap').default,
  targets: ResultsAnimationTargets,
): TimelineController {
  const animationTimeline = gsap.timeline();

  for (const step of RESULTS_ENTRANCE_STEPS) {
    const target = targets[step.target];
    if (isOnPage(target)) {
      animationTimeline.fromTo(
        target,
        { ...step.from },
        { ...step.to },
        step.position,
      );
    }
  }

  return animationTimeline;
}

function runGsapAnimation(
  run: (
    gsap: typeof import('gsap').default,
  ) => TimelineController | null | undefined,
): () => void {
  let cancelled = false;
  let timeline: TimelineController | null = null;

  void loadGsap()
    .then(({ default: gsap }) => {
      if (cancelled) {
        return;
      }

      timeline = run(gsap) ?? null;
    })
    .catch(reportGsapLoadError);

  return () => {
    cancelled = true;
    timeline?.kill();
  };
}

export function useOnboardingResultsEntranceAnimation(
  containerRef: RefObject<HTMLDivElement | null>,
  depKey: string,
) {
  useGSAP(
    () => {
      if (!containerRef.current) {
        return;
      }
      if (prefersReducedMotion()) return;

      return runGsapAnimation((gsap) => {
        const container = containerRef.current;
        if (!container) {
          return null;
        }

        return buildResultsEntrance(
          gsap,
          getResultsAnimationTargets(container),
        );
      });
    },
    { dependencies: [depKey], scope: containerRef },
  );
}

export function useOnboardingResultsExitAnimation(
  containerRef: RefObject<HTMLDivElement | null>,
  onComplete: () => void | Promise<void>,
): () => void {
  return () => {
    if (prefersReducedMotion()) {
      void onComplete();
      return;
    }

    if (!containerRef.current) {
      onComplete();
      return;
    }

    const { badge, header, summary, button } = getResultsAnimationTargets(
      containerRef.current,
    );
    const tags = containerRef.current.querySelector('[data-results-tags]');

    if (!badge && !header && !tags && !summary && !button) {
      onComplete();
      return;
    }

    void loadGsap()
      .then(({ default: gsap }) => {
        const tl = gsap.timeline({
          onComplete: () => {
            void onComplete();
          },
        });
        const exitTween = {
          opacity: 0,
          y: -15,
          duration: 0.3,
          ease: 'power2.in' as const,
        };

        if (button) tl.to(button, exitTween);
        if (summary) tl.to(summary, exitTween, '-=0.2');
        if (tags) tl.to(tags, exitTween, '-=0.2');
        if (header) tl.to(header, exitTween, '-=0.2');
        if (badge) tl.to(badge, { ...exitTween, scale: 0.95 }, '-=0.2');
      })
      .catch((error: unknown) => {
        reportGsapLoadError(error);
        void onComplete();
      });
  };
}
