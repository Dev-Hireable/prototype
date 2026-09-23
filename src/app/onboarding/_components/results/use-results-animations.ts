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

        const { badge, header, tags, summary, button } =
          getResultsAnimationTargets(container);

        const animationTimeline = gsap.timeline();

        if (badge) {
          animationTimeline.fromTo(
            badge,
            { autoAlpha: 0, y: 18, scale: 0.94 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.72,
              ease: 'power3.out',
              clearProps: 'opacity,visibility,transform',
            },
          );
        }
        if (header) {
          animationTimeline.fromTo(
            header,
            { autoAlpha: 0, y: 20 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.62,
              ease: 'power3.out',
              clearProps: 'opacity,visibility,transform',
            },
            '-=0.28',
          );
        }
        if (tags.length > 0) {
          animationTimeline.fromTo(
            tags,
            { opacity: 0, scale: 0.85, y: 24 },
            {
              opacity: 1,
              scale: 1,
              y: 0,
              stagger: 0.1,
              duration: 0.5,
              ease: 'back.out(1.7)',
              clearProps: 'opacity,transform',
            },
            '-=0.4',
          );
        }
        if (summary) {
          animationTimeline.fromTo(
            summary,
            { autoAlpha: 0, y: 20 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.5,
              ease: 'power3.out',
              clearProps: 'opacity,visibility,transform',
            },
            '-=0.18',
          );
        }
        if (button) {
          animationTimeline.fromTo(
            button,
            { autoAlpha: 0, y: 20 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.52,
              ease: 'power3.out',
              clearProps: 'opacity,visibility,transform',
            },
            '-=0.16',
          );
        }

        return animationTimeline;
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
