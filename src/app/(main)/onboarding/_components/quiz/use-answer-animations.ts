'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import gsap from 'gsap';
import { prefersReducedMotion } from '@/web-app/lib/motion';

const OPTION_ENTRANCE_FROM = {
  autoAlpha: 0,
  x: 24,
  y: 10,
  scale: 0.985,
  pointerEvents: 'none',
} as const;

const OPTION_ENTRANCE_TO = {
  autoAlpha: 1,
  x: 0,
  y: 0,
  scale: 1,
  pointerEvents: 'auto',
  duration: 0.56,
  stagger: 0.06,
  ease: 'power3.out',
  clearProps: 'transform,willChange',
} as const;

const HEADING_REVEAL_TO = {
  visibility: 'visible',
  autoAlpha: 1,
  y: 0,
  pointerEvents: 'auto',
  duration: 0.48,
  ease: 'power3.out',
  clearProps: 'transform',
} as const;

type EntranceTargets = {
  answerHeading: Element;
  composer: Element;
  optionsList: Element;
  optionElements: NodeListOf<Element>;
};

function collectEntranceTargets(
  answerSection: HTMLDivElement,
): EntranceTargets | null {
  const answerHeading = answerSection.querySelector(
    '[data-onboarding-quiz-answer-heading]',
  );
  const composer = answerSection.querySelector('[data-onboarding-quiz-button]');
  const optionsList = answerSection.querySelector(
    '[data-onboarding-quiz-options]',
  );
  const optionElements = answerSection.querySelectorAll(
    '[data-quiz-option-index]',
  );

  if (!answerHeading || !composer || !optionsList || !optionElements.length) {
    return null;
  }

  return { answerHeading, composer, optionsList, optionElements };
}

function revealEntranceWithoutMotion(targets: EntranceTargets): void {
  gsap.set(
    [
      targets.answerHeading,
      targets.composer,
      targets.optionsList,
      targets.optionElements,
    ],
    {
      visibility: 'visible',
      autoAlpha: 1,
      x: 0,
      y: 0,
      scale: 1,
      pointerEvents: 'auto',
      clearProps: 'transform,willChange',
    },
  );
}

/**
 * The first question reveals the whole answer panel as one sequence; later
 * questions keep their chrome on screen and only stagger the options back in.
 */
function playEntranceAnimation(
  targets: EntranceTargets,
  isFirstQuestionContext: boolean,
): { kill: () => void } {
  if (!isFirstQuestionContext) {
    return gsap.fromTo(
      targets.optionElements,
      OPTION_ENTRANCE_FROM,
      OPTION_ENTRANCE_TO,
    );
  }

  return gsap
    .timeline()
    .to(targets.composer, HEADING_REVEAL_TO)
    .fromTo(
      targets.optionElements,
      OPTION_ENTRANCE_FROM,
      OPTION_ENTRANCE_TO,
      '-=0.2',
    )
    .to(targets.answerHeading, HEADING_REVEAL_TO, '-=0.2');
}

export function useQuizAnswerEntranceAnimation(
  answerSectionRef: RefObject<HTMLDivElement | null>,
  hasAssistantPromptCompleted: boolean,
  currentQuestionIndex: number,
) {
  useLayoutEffect(() => {
    const answerSection = answerSectionRef.current;
    if (!answerSection) {
      return;
    }

    const targets = collectEntranceTargets(answerSection);
    if (!targets) {
      return;
    }

    const isFirstQuestionContext = currentQuestionIndex === 0;

    if (!hasAssistantPromptCompleted) {
      // Only the first question hides its chrome while the assistant is talking.
      if (isFirstQuestionContext) {
        gsap.set([targets.answerHeading, targets.composer], {
          visibility: 'hidden',
          autoAlpha: 0,
          y: 8,
        });
      }

      return;
    }

    gsap.set(targets.optionsList, { visibility: 'visible', autoAlpha: 1 });

    if (!isFirstQuestionContext) {
      gsap.set([targets.answerHeading, targets.composer], {
        visibility: 'visible',
        autoAlpha: 1,
        y: 0,
      });
    }

    gsap.set(targets.optionElements, { willChange: 'transform,opacity' });

    if (prefersReducedMotion()) {
      revealEntranceWithoutMotion(targets);
      return;
    }

    const entrance = playEntranceAnimation(targets, isFirstQuestionContext);

    return () => {
      entrance.kill();
      gsap.set(targets.optionElements, { clearProps: 'willChange' });
    };
  }, [answerSectionRef, currentQuestionIndex, hasAssistantPromptCompleted]);
}

type ExitTargets = {
  unselectedOptions: HTMLElement[];
  selectedOptionElement: HTMLElement | null;
  tailElements: HTMLElement[];
  all: HTMLElement[];
};

function collectExitTargets(
  answerSection: HTMLDivElement,
  selectedOption: number | null,
): ExitTargets {
  const optionElements = Array.from(
    answerSection.querySelectorAll<HTMLElement>('[data-quiz-option-index]'),
  );
  const answerHeading = answerSection.querySelector<HTMLElement>(
    '[data-onboarding-quiz-answer-heading]',
  );
  const composerShell = answerSection.querySelector<HTMLElement>(
    '[data-onboarding-quiz-button]',
  );

  const selectedOptionElement =
    selectedOption !== null && selectedOption >= 0
      ? (optionElements[selectedOption] ?? null)
      : null;
  const unselectedOptions = optionElements.filter(
    (_, index) => index !== selectedOption,
  );
  const tailElements = [answerHeading, composerShell].filter(
    (element): element is HTMLElement => element !== null,
  );

  const all = [...unselectedOptions];
  if (selectedOptionElement) all.push(selectedOptionElement);
  all.push(...tailElements);

  return { unselectedOptions, selectedOptionElement, tailElements, all };
}

const QUICK_OUT = {
  autoAlpha: 0,
  x: -24,
  scale: 0.96,
  duration: 0.34,
  stagger: 0.045,
  ease: 'power2.inOut',
  clearProps: 'transform,transformOrigin,willChange',
} as const;

const SELECTED_OUT = {
  autoAlpha: 0,
  x: -24,
  scale: 0.96,
  duration: 0.58,
  ease: 'sine.inOut',
  clearProps: 'transform,transformOrigin,willChange',
} as const;

function buildExitTimeline(
  targets: ExitTargets,
  isLastQuestion: boolean,
  onComplete: () => void,
): gsap.core.Timeline {
  const timeline = gsap.timeline({ onComplete });

  if (targets.unselectedOptions.length > 0) {
    timeline.to(targets.unselectedOptions, QUICK_OUT);
  }

  if (targets.selectedOptionElement) {
    timeline.to(targets.selectedOptionElement, SELECTED_OUT, 0);
  }

  if (isLastQuestion && targets.tailElements.length > 0) {
    timeline.to(targets.tailElements, QUICK_OUT, 0.12);
  }

  return timeline;
}

export function useQuizAnswerExitAnimation(
  answerSectionRef: RefObject<HTMLDivElement | null>,
  isSubmitting: boolean,
  isLastQuestion: boolean,
  selectedOption: number | null,
  onExitComplete: () => void,
) {
  const exitAnimationCycleRef = useRef(0);

  useEffect(() => {
    const answerSection = answerSectionRef.current;
    if (!answerSection || !isSubmitting) {
      return;
    }

    if (prefersReducedMotion()) {
      onExitComplete();
      return;
    }

    const exitAnimationCycle = ++exitAnimationCycleRef.current;
    const completeExit = () => {
      if (exitAnimationCycleRef.current !== exitAnimationCycle) {
        return;
      }
      onExitComplete();
    };

    const targets = collectExitTargets(answerSection, selectedOption);
    if (targets.all.length === 0) {
      completeExit();
      return;
    }

    gsap.killTweensOf(targets.all);
    gsap.set(targets.all, {
      willChange: 'transform,opacity',
      transformOrigin: 'right center',
    });

    const exitTimeline = buildExitTimeline(
      targets,
      isLastQuestion,
      completeExit,
    );

    return () => {
      exitTimeline.kill();
      gsap.set(targets.all, { clearProps: 'willChange' });
    };
  }, [
    answerSectionRef,
    isLastQuestion,
    isSubmitting,
    onExitComplete,
    selectedOption,
  ]);
}
