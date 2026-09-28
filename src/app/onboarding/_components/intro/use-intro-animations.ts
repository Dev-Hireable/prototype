'use client';

import { useReducer, useRef, useState, type RefObject } from 'react';
import { useGSAP } from '@gsap/react';

import { loadGsap, reportGsapLoadError } from '@/web-app/lib/load-gsap';
import { ONBOARDING_CONFETTI_COLORS } from '@/web-app/lib/brand-colors';
import { prefersReducedMotion } from '@/web-app/lib/motion';
import { useIsOnboardingRevealed } from '../shared/splash-gate';

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

/** The success splash's image and title. */
type SuccessRefs = {
  image: RefObject<HTMLDivElement | null>;
  title: RefObject<HTMLHeadingElement | null>;
};

/** The intro's logo, heading and button, which come in and leave in turn. */
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

/** The intro's logo, heading and button, once all three are on the page. */
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
 * The success splash: the image and title rise in, hold for SUCCESS_DISPLAY_DURATION, then leave,
 * and `onDone` swaps in the intro (at once, if GSAP won't load). Confetti's module loads with GSAP
 * so a new account's confetti fires as the splash starts.
 */
function playSuccessSplash(
  success: SuccessRefs,
  celebrate: boolean,
  run: EntranceRun,
  onDone: () => void,
) {
  const image = success.image.current;
  const title = success.title.current;
  if (!image || !title) return;

  void Promise.all([
    loadGsap(),
    import('canvas-confetti')
      .then(() => undefined)
      .catch(() => undefined),
  ])
    .then(([{ default: gsap }]) => {
      if (run.isCancelled()) return;

      gsap.set(image, ANIM.fadeInUpScale);
      gsap.set(title, ANIM.fadeInUp);

      const tl = gsap.timeline({
        onComplete: () => {
          if (!run.isCancelled()) onDone();
        },
      });
      run.timelineRef.current = tl;

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
      if (!run.isCancelled()) onDone();
    });
}

/** The intro's entrance: the logo, the heading, then the button rise in, each over the last. */
function playIntroEntrance(intro: IntroRefs, run: EntranceRun) {
  const targets = getIntroTargets(intro);
  if (!targets) return;

  const { logo, heading, button } = targets;
  void loadGsap()
    .then(({ default: gsap }) => {
      if (run.isCancelled()) return;

      const tl = gsap.timeline({ delay: 0.1 });
      run.timelineRef.current = tl;

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
  success: SuccessRefs;
  intro: IntroRefs;
  timelineRef: TimelineRef;
};

/**
 * Plays the success splash once the splash gate lifts and the image has loaded, gives way to the
 * intro when it ends, then plays the intro's entrance. Reduced motion skips to the intro at rest.
 */
function useIntroEntrance({
  celebrate,
  containerRef,
  success,
  intro,
  timelineRef,
}: IntroEntranceOptions) {
  const isRevealed = useIsOnboardingRevealed();
  const [showSuccess, setShowSuccess] = useState(true);
  const [isImageReady, markImageReady] = useReducer(() => true, false);

  useGSAP(
    () => {
      // The splash still covers the screen; this re-runs the moment it lifts,
      // in the same commit that unhides the tree, so nothing paints early.
      if (!isRevealed) return;

      let cancelled = false;

      clearTimeline(timelineRef);

      if (prefersReducedMotion()) {
        if (showSuccess) {
          setShowSuccess(false);
        } else {
          revealIntroTargets(intro);
        }
        return;
      }

      const run: EntranceRun = { isCancelled: () => cancelled, timelineRef };
      if (showSuccess) {
        if (!isImageReady) return;

        playSuccessSplash(success, celebrate, run, () => setShowSuccess(false));
      } else {
        playIntroEntrance(intro, run);
      }

      return () => {
        cancelled = true;
        clearTimeline(timelineRef);
      };
    },
    {
      dependencies: [showSuccess, isImageReady, isRevealed, celebrate],
      scope: containerRef,
    },
  );

  return { showSuccess, markImageReady };
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

    // Reduced motion hands over at once, as the entrance skips to the intro at rest.
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
 * The intro step's motion: the success splash (confetti for a new account) and the intro's
 * entrance once the splash gate lifts, and the intro's exit on continue. They share one timeline,
 * so whichever starts stops the one before. Returns whether the success splash is up, the splash
 * image's ready callback, and the continue handler.
 */
export function useOnboardingIntroAnimations({
  onContinue,
  ...entrance
}: Omit<IntroEntranceOptions, 'timelineRef'> & { onContinue: () => void }) {
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const { showSuccess, markImageReady } = useIntroEntrance({
    ...entrance,
    timelineRef,
  });
  const handleContinue = useIntroExit(entrance.intro, timelineRef, onContinue);

  return { showSuccess, markImageReady, handleContinue };
}
