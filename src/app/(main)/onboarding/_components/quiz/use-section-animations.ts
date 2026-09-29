'use client';

import { useLayoutEffect, useEffect } from 'react';
import type { RefObject } from 'react';
import { loadGsap, reportGsapLoadError } from '@/web-app/lib/load-gsap';
import { prefersReducedMotion } from '@/web-app/lib/motion';

type QuizSectionTargets = {
  header: Element | null;
  headerChildren: HTMLElement[];
  chat: HTMLElement | null;
};

function getQuizSectionTargets(
  container: HTMLDivElement,
): QuizSectionTargets {
  const header = container.querySelector('[data-onboarding-quiz-header]');
  const headerChildren = header
    ? Array.from(
        header.querySelectorAll<HTMLElement>(
          '[data-onboarding-quiz-header-copy], [data-onboarding-quiz-header-progress]',
        ),
      )
    : [];
  return {
    header,
    headerChildren,
    chat: container.querySelector<HTMLElement>('[data-onboarding-quiz-chat]'),
  };
}

/** Holds the entrance targets just below their places, hidden, until the entrance plays. */
function hideForEntrance(targets: HTMLElement[]) {
  for (const target of targets) {
    target.style.opacity = '0';
    target.style.transform = 'translateY(10px)';
    target.style.willChange = 'opacity, transform';
  }
}

/** Hands the entrance targets back to the stylesheet, for when the entrance can't play. */
function clearEntranceStyles(targets: HTMLElement[]) {
  for (const target of targets) {
    target.style.opacity = '';
    target.style.transform = '';
    target.style.willChange = '';
  }
}

/** The header's copy and progress rise into place, and the chat follows just behind them. */
function addSectionEntrance(
  animationTimeline: gsap.core.Timeline,
  headerChildren: HTMLElement[],
  chat: HTMLElement | null,
) {
  const hasHeaderChildren = headerChildren.length > 0;

  if (hasHeaderChildren) {
    animationTimeline.to(headerChildren, {
      autoAlpha: 1,
      y: 0,
      duration: 0.5,
      ease: 'power3.out',
      clearProps: 'transform,willChange',
    });
  }

  if (chat) {
    animationTimeline.to(
      chat,
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.5,
        ease: 'power3.out',
        clearProps: 'transform,willChange',
      },
      hasHeaderChildren ? '-=0.26' : 0,
    );
  }
}

/** The header and chat fade up out of the way together, and the header's rule with them. */
function addSectionExit(
  animationTimeline: gsap.core.Timeline,
  targets: HTMLElement[],
  header: Element | null,
) {
  if (targets.length > 0) {
    animationTimeline.to(targets, {
      autoAlpha: 0,
      y: -10,
      duration: 0.44,
      ease: 'sine.inOut',
      clearProps: 'transform,willChange',
    });
  }
  // The header's own rule goes too: the spotlight holds the screen long enough for a
  // stray line across the top to show.
  if (header) {
    animationTimeline.to(
      header,
      { autoAlpha: 0, duration: 0.44, ease: 'sine.inOut' },
      0,
    );
  }
}

/** The header and chat's entrance when the quiz opens, set up before its first paint. */
function useQuizSectionEntrance(contentRef: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    if (!contentRef.current) return;
    if (prefersReducedMotion()) return;

    const { headerChildren, chat } = getQuizSectionTargets(contentRef.current);
    const entranceTargets = [...headerChildren];
    if (chat) entranceTargets.push(chat);

    hideForEntrance(entranceTargets);

    let cancelled = false;
    let timeline: { kill: () => void } | null = null;

    void loadGsap()
      .then(({ default: loadedGsap }) => {
        if (cancelled || !contentRef.current) return;

        loadedGsap.set(contentRef.current, { opacity: 1, x: 0 });
        const animationTimeline = loadedGsap.timeline();
        timeline = animationTimeline;
        addSectionEntrance(animationTimeline, headerChildren, chat);
      })
      .catch((error) => {
        reportGsapLoadError(error);
        clearEntranceStyles(entranceTargets);
      });

    return () => {
      cancelled = true;
      timeline?.kill();
    };
  }, [contentRef]);
}

/** The header and chat making way for the wrap-up spotlight after the last question. */
function useQuizSectionExit(
  contentRef: RefObject<HTMLDivElement | null>,
  isLastQuestion: boolean,
  isWrappingUp: boolean,
) {
  useEffect(() => {
    if (!isLastQuestion || !isWrappingUp || !contentRef.current) return;
    if (prefersReducedMotion()) return;

    const { header, headerChildren, chat } = getQuizSectionTargets(
      contentRef.current,
    );
    if (headerChildren.length === 0 && !chat) return;

    let cancelled = false;
    let timeline: { kill: () => void } | null = null;

    void loadGsap()
      .then(({ default: loadedGsap }) => {
        if (cancelled) return;

        const targets = [...headerChildren];
        if (chat) targets.push(chat);
        loadedGsap.killTweensOf(targets);
        const animationTimeline = loadedGsap.timeline();
        timeline = animationTimeline;
        addSectionExit(animationTimeline, targets, header);
      })
      .catch(reportGsapLoadError);

    return () => {
      cancelled = true;
      timeline?.kill();
    };
  }, [contentRef, isLastQuestion, isWrappingUp]);
}

export function useQuizSectionAnimations(
  contentRef: RefObject<HTMLDivElement | null>,
  isLastQuestion: boolean,
  // The header and chat make way once the wrap-up spotlight starts, not the moment answers save.
  isWrappingUp: boolean,
) {
  useQuizSectionEntrance(contentRef);
  useQuizSectionExit(contentRef, isLastQuestion, isWrappingUp);
}
