'use client';

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/web-app/lib/motion';
import {
  FINAL_ASSISTANT_WRAP_UP_DELAY_MS,
  FINAL_SPOTLIGHT_DELAY_MS,
} from '../../_lib/quiz-thread';

export function useFinalCurtainTransition({
  isLastQuestion,
  isSubmitting,
  internalSubmitting,
  onFinalTransitionComplete,
}: {
  isLastQuestion: boolean;
  isSubmitting: boolean;
  internalSubmitting: boolean;
  /** The wrap-up has run its length: time for the curtain (the wizard's OnboardingCurtain). */
  onFinalTransitionComplete: () => void;
}) {
  const onFinalTransitionCompleteRef = useRef(onFinalTransitionComplete);
  // The answers are saved and the assistant has signed off: its line takes the middle of the
  // screen (the spotlight) until the wrap-up has run its length, then the curtain comes down.
  const isWrappingUp = isLastQuestion && isSubmitting;
  const [isSpotlightDue, setSpotlightDue] = useState(false);
  const isFinalSpotlightVisible = isWrappingUp && isSpotlightDue;
  const shouldSuppressFinalIndicators =
    isLastQuestion && (internalSubmitting || isSubmitting);

  useEffect(() => {
    onFinalTransitionCompleteRef.current = onFinalTransitionComplete;
  }, [onFinalTransitionComplete]);

  useEffect(() => {
    if (!isWrappingUp) return;

    // Reduced motion keeps the still wrap-up: the line stays in the chat until the results.
    const spotlight = prefersReducedMotion()
      ? null
      : window.setTimeout(() => setSpotlightDue(true), FINAL_SPOTLIGHT_DELAY_MS);
    const done = window.setTimeout(
      () => onFinalTransitionCompleteRef.current(),
      FINAL_ASSISTANT_WRAP_UP_DELAY_MS,
    );
    return () => {
      if (spotlight !== null) window.clearTimeout(spotlight);
      window.clearTimeout(done);
    };
  }, [isWrappingUp]);

  return {
    isFinalSpotlightVisible,
    shouldSuppressFinalIndicators,
  };
}
