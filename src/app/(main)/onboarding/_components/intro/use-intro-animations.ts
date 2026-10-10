'use client';

import { useRef, type RefObject } from 'react';
import { useGSAP } from '@gsap/react';

import { loadGsap, reportGsapLoadError } from '@/web-app/lib/load-gsap';
import { ONBOARDING_CONFETTI_COLORS } from '@/web-app/lib/brand-colors';
import { prefersReducedMotion } from '@/web-app/lib/motion';
import { useIsOnboardingRevealed } from '../shared/splash-gate';

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

type TimelineRef = RefObject<gsap.core.Timeline | null>;

/** The intro's mascot, heading and button, which come in and leave in turn. */
type IntroRefs = {
  logo: RefObject<HTMLDivElement | null>;
  heading: RefObject<HTMLDivElement | null>;
  button: RefObject<HTMLDivElement | null>;
};

/** One run of the entrance effect: whether it has been cleaned up, and where its timeline goes. */
type EntranceRun = {
  isCancelled: () => boolean;
  timelineRef: TimelineRef;
};

/** Stops whatever the step's timeline is playing. */
function clearTimeline(timelineRef: TimelineRef) {
  if (timelineRef.current) {
    timelineRef.current.kill();
    timelineRef.current = null;
  }
}

/** The intro's mascot, heading and button, once all three are on the page. */
function getIntroTargets(intro: IntroRefs) {
  const logo = intro.logo.current;
  const heading = intro.heading.current;
  const button = intro.button.current;
  return logo && heading && button ? { logo, heading, button } : null;
}

/** Shows the intro at rest: for reduced motion, or when GSAP won't load. */
function revealIntroTargets(intro: IntroRefs) {
  const targets = getIntroTargets(intro);
  if (!targets) return;
  for (const target of Object.values(targets)) {
    target.style.opacity = '1';
    target.style.transform = 'none';
  }
}

/**
 * The intro's entrance: the mascot, the heading, then the button rise in, each over the last. A
 * new account's confetti fires as it starts; its module loads with GSAP so it doesn't lag behind.
 */
function playIntroEntrance(
  intro: IntroRefs,
  celebrate: boolean,
  run: EntranceRun,
) {
  const targets = getIntroTargets(intro);
  if (!targets) return;

  const { logo, heading, button } = targets;
  void Promise.all([
    loadGsap(),
    import('canvas-confetti')
      .then(() => undefined)
      .catch(() => undefined),
  ])
    .then(([{ default: gsap }]) => {
      if (run.isCancelled()) return;

      const tl = gsap.timeline({ delay: 0.1 });
      run.timelineRef.current = tl;
      if (celebrate) void fireOnboardingCelebrationConfetti();

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
      if (!run.isCancelled()) revealIntroTargets(intro);
    });
}

type IntroEntranceOptions = {
  celebrate: boolean;
  containerRef: RefObject<HTMLElement | null>;
  intro: IntroRefs;
  timelineRef: TimelineRef;
};

/**
 * Plays the intro's entrance once the splash gate lifts. It used to follow a full-screen
 * "Congratulations, your account has been created" (or "Welcome back") that held for two seconds
 * with nothing to do; this screen says it now. Reduced motion shows the intro at rest.
 */
function useIntroEntrance({
  celebrate,
  containerRef,
  intro,
  timelineRef,
}: IntroEntranceOptions) {
  const isRevealed = useIsOnboardingRevealed();

  useGSAP(
    () => {
      // The splash still covers the screen; this re-runs the moment it lifts,
      // in the same commit that unhides the tree, so nothing paints early.
      if (!isRevealed) return;

      let cancelled = false;

      clearTimeline(timelineRef);

      if (prefersReducedMotion()) {
        revealIntroTargets(intro);
        return;
      }

      playIntroEntrance(intro, celebrate, {
        isCancelled: () => cancelled,
        timelineRef,
      });

      return () => {
        cancelled = true;
        clearTimeline(timelineRef);
      };
    },
    {
      dependencies: [isRevealed, celebrate],
      scope: containerRef,
    },
  );
}

/**
 * Continuing from the intro: its pieces leave in turn, then `onContinue` hands over to the quiz.
 * Presses while that's under way are ignored.
 */
function useIntroExit(
  intro: IntroRefs,
  timelineRef: TimelineRef,
  onContinue: () => void,
) {
  const continueRequestedRef = useRef(false);

  return () => {
    if (continueRequestedRef.current) return;

    continueRequestedRef.current = true;

    const proceed = () => {
      try {
        onContinue();
      } finally {
        continueRequestedRef.current = false;
      }
    };
    const targets = getIntroTargets(intro);

    // Reduced motion hands over at once, as the entrance shows the intro at rest.
    if (!targets || prefersReducedMotion()) {
      proceed();
      return;
    }

    clearTimeline(timelineRef);

    void loadGsap()
      .then(({ default: gsap }) => {
        timelineRef.current = animateIntroExit(targets, gsap, proceed);
      })
      .catch((error: unknown) => {
        reportGsapLoadError(error);
        proceed();
      });
  };
}

/**
 * The intro step's motion: its entrance (confetti for a new account) once the splash gate lifts,
 * and its exit on continue. They share one timeline, so whichever starts stops the one before.
 * Returns the continue handler.
 */
export function useOnboardingIntroAnimations({
  onContinue,
  ...entrance
}: Omit<IntroEntranceOptions, 'timelineRef'> & { onContinue: () => void }) {
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  useIntroEntrance({ ...entrance, timelineRef });
  return useIntroExit(entrance.intro, timelineRef, onContinue);
}
