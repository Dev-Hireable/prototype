'use client';

import { useReducer, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';

import { loadGsap, reportGsapLoadError } from '@/web-app/lib/load-gsap';
import { ONBOARDING_CONFETTI_COLORS } from '@/web-app/lib/brand-colors';
import { prefersReducedMotion } from '@/web-app/lib/motion';
import type { IntroCopy } from '../../_data/onboarding-copy';
import { useIsOnboardingRevealed } from '../shared/splash-gate';
import {
  OnboardingIntroContent,
  OnboardingSuccessSplash,
  type IntroRetake,
} from './intro-sections';

const SUCCESS_DISPLAY_DURATION = 2000;

const ANIM = {
  fadeInUp: { opacity: 0, y: 25 },
  fadeInUpScale: { opacity: 0, y: 30, scale: 0.8 },
  visible: { opacity: 1, y: 0, scale: 1, ease: 'power3.out' },
  visibleNoScale: { opacity: 1, y: 0, ease: 'power3.out' },
  exitUp: { opacity: 0, y: -15, ease: 'power2.in' },
  exitUpScale: { opacity: 0, y: -20, scale: 0.95, ease: 'power2.in' },
} as const;

async function fireOnboardingCelebrationConfetti(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }
  if (prefersReducedMotion()) return;

  try {
    const { default: confetti } = await import('canvas-confetti');
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: [...ONBOARDING_CONFETTI_COLORS],
    });
  } catch (err) {
    console.warn('Failed to load onboarding confetti', err);
  }
}

type OnboardingIntroStepProps = {
  copy: IntroCopy;
  /** Confetti for a new account; a retake is welcomed back without it. */
  celebrate: boolean;
  /** Set on a retake: the traits it will replace, and the way back without retaking. */
  retake: IntroRetake | null;
  continueFromIntro: () => void;
};

function animateIntroExit(
  targets: { logo: Element; heading: Element; button: Element },
  gsap: typeof import('gsap').default,
  onComplete: () => void,
): gsap.core.Timeline {
  const tl = gsap.timeline({ onComplete });

  tl.to(targets.button, { ...ANIM.exitUp, duration: 0.3 })
    .to(targets.heading, { ...ANIM.exitUp, duration: 0.3 }, '-=0.2')
    .to(targets.logo, { ...ANIM.exitUpScale, duration: 0.3 }, '-=0.2');

  return tl;
}

export function OnboardingIntroStep({
  copy,
  celebrate,
  retake,
  continueFromIntro: onContinue,
}: OnboardingIntroStepProps) {
  const isRevealed = useIsOnboardingRevealed();
  const [showSuccess, setShowSuccess] = useState(true);
  const [isImageReady, markImageReady] = useReducer(() => true, false);

  const containerRef = useRef<HTMLElement>(null);
  const successImageRef = useRef<HTMLDivElement>(null);
  const successTitleRef = useRef<HTMLHeadingElement>(null);
  const introLogoRef = useRef<HTMLDivElement>(null);
  const introHeadingRef = useRef<HTMLDivElement>(null);
  const introButtonRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const continueRequestedRef = useRef(false);

  const clearTimeline = () => {
    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }
  };

  const getIntroTargets = () => {
    const logo = introLogoRef.current;
    const heading = introHeadingRef.current;
    const button = introButtonRef.current;
    return logo && heading && button ? { logo, heading, button } : null;
  };

  const revealIntroTargets = () => {
    const targets = getIntroTargets();
    if (!targets) return;
    for (const target of Object.values(targets)) {
      target.style.opacity = '1';
      target.style.transform = 'none';
    }
  };

  useGSAP(
    () => {
      // The splash still covers the screen; this re-runs the moment it lifts,
      // in the same commit that unhides the tree, so nothing paints early.
      if (!isRevealed) return;

      let cancelled = false;

      clearTimeline();

      if (prefersReducedMotion()) {
        if (showSuccess) {
          setShowSuccess(false);
        } else {
          revealIntroTargets();
        }
        return;
      }

      if (showSuccess) {
        if (!isImageReady) return;

        const image = successImageRef.current;
        const title = successTitleRef.current;

        if (image && title) {
          void Promise.all([
            loadGsap(),
            import('canvas-confetti')
              .then(() => undefined)
              .catch(() => undefined),
          ])
            .then(([{ default: gsap }]) => {
              if (cancelled) return;

              gsap.set(image, ANIM.fadeInUpScale);
              gsap.set(title, ANIM.fadeInUp);

              const tl = gsap.timeline({
                onComplete: () => {
                  if (!cancelled) setShowSuccess(false);
                },
              });
              timelineRef.current = tl;

              if (celebrate) void fireOnboardingCelebrationConfetti();

              tl.fromTo(image, ANIM.fadeInUpScale, {
                ...ANIM.visible,
                duration: 0.6,
              })
                .fromTo(
                  title,
                  ANIM.fadeInUp,
                  { ...ANIM.visibleNoScale, duration: 0.5 },
                  '-=0.4',
                )
                .to({}, { duration: SUCCESS_DISPLAY_DURATION / 1000 })
                .to(title, { ...ANIM.exitUp, duration: 0.35 })
                .to(image, { ...ANIM.exitUpScale, duration: 0.35 }, '-=0.2');
            })
            .catch((error: unknown) => {
              reportGsapLoadError(error);
              if (!cancelled) setShowSuccess(false);
            });
        }
      } else {
        const targets = getIntroTargets();
        if (targets) {
          const { logo, heading, button } = targets;
          void loadGsap()
            .then(({ default: gsap }) => {
              if (cancelled) return;

              const tl = gsap.timeline({ delay: 0.1 });
              timelineRef.current = tl;

              tl.fromTo(logo, ANIM.fadeInUpScale, {
                ...ANIM.visible,
                duration: 0.55,
              })
                .fromTo(
                  heading,
                  ANIM.fadeInUp,
                  { ...ANIM.visibleNoScale, duration: 0.6 },
                  '-=0.2',
                )
                .fromTo(
                  button,
                  ANIM.fadeInUp,
                  { ...ANIM.visibleNoScale, duration: 0.5 },
                  '-=0.35',
                );
            })
            .catch((error: unknown) => {
              reportGsapLoadError(error);
              if (!cancelled) revealIntroTargets();
            });
        }
      }

      return () => {
        cancelled = true;
        clearTimeline();
      };
    },
    {
      dependencies: [showSuccess, isImageReady, isRevealed, celebrate],
      scope: containerRef,
    },
  );

  const handleContinue = () => {
    if (continueRequestedRef.current) return;

    continueRequestedRef.current = true;

    const proceed = () => {
      try {
        onContinue();
      } finally {
        continueRequestedRef.current = false;
      }
    };
    const targets = getIntroTargets();

    if (!targets) {
      proceed();
      return;
    }

    clearTimeline();

    void loadGsap()
      .then(({ default: gsap }) => {
        timelineRef.current = animateIntroExit(targets, gsap, proceed);
      })
      .catch((error: unknown) => {
        reportGsapLoadError(error);
        proceed();
      });
  };

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
