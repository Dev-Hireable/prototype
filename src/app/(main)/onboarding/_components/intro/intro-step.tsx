'use client';

import { useRef } from 'react';

import type { IntroCopy } from '../../_data/onboarding-copy';
import {
  OnboardingIntroContent,
  OnboardingSuccessSplash,
  type IntroRetake,
} from './intro-sections';
import { useOnboardingIntroAnimations } from './use-intro-animations';

type OnboardingIntroStepProps = {
  copy: IntroCopy;
  /** Confetti for a new account; a retake is welcomed back without it. */
  celebrate: boolean;
  /** Set on a retake: the traits it will replace, and the way back without retaking. */
  retake: IntroRetake | null;
  continueFromIntro: () => void;
};

export function OnboardingIntroStep({
  copy,
  celebrate,
  retake,
  continueFromIntro: onContinue,
}: OnboardingIntroStepProps) {
  const containerRef = useRef<HTMLElement>(null);
  const successImageRef = useRef<HTMLDivElement>(null);
  const successTitleRef = useRef<HTMLHeadingElement>(null);
  const introLogoRef = useRef<HTMLDivElement>(null);
  const introHeadingRef = useRef<HTMLDivElement>(null);
  const introButtonRef = useRef<HTMLDivElement>(null);
  const { showSuccess, markImageReady, handleContinue } =
    useOnboardingIntroAnimations({
      celebrate,
      onContinue,
      containerRef,
      success: { image: successImageRef, title: successTitleRef },
      intro: {
        logo: introLogoRef,
        heading: introHeadingRef,
        button: introButtonRef,
      },
    });

  return (
    <section
      ref={containerRef}
      className="bg-background flex min-h-[calc(100dvh/var(--ui-scale))] w-full items-center justify-center px-4"
    >
      {showSuccess ? (
        <OnboardingSuccessSplash
          copy={copy}
          successImageRef={successImageRef}
          successTitleRef={successTitleRef}
          onImageReady={markImageReady}
        />
      ) : (
        <OnboardingIntroContent
          copy={copy}
          retake={retake}
          introLogoRef={introLogoRef}
          introHeadingRef={introHeadingRef}
          introButtonRef={introButtonRef}
          onContinue={handleContinue}
        />
      )}
    </section>
  );
}
