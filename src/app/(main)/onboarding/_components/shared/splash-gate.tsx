'use client';

import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { LoadingScreen } from '@/web-app/components/ui/loading-screen';

/**
 * False while the splash still covers the screen. Children now render behind
 * it from the first paint, so entrance animations must wait for this instead
 * of starting on mount — otherwise they would play unseen behind the splash.
 * Defaults to true so the steps animate normally outside this gate.
 */
const OnboardingRevealContext = createContext(true);

export function useIsOnboardingRevealed(): boolean {
  return useContext(OnboardingRevealContext);
}

type OnboardingSplashGateProps = {
  children: ReactNode;
};

/**
 * How long the finished Hireable logo stays on screen before the splash fades, in ms. The splash
 * lifts once the logo has drawn in full, never part-way through: a fixed second cut the draw
 * (about 1.8 s) short, so the quiz came in over half a logo.
 */
const DRAWN_HOLD_MS = 300;

/**
 * The longest the splash stays, in ms, if the logo never reports a finished draw (GSAP's chunk
 * stalls, say). Well past a normal draw, about 2.5 s even with the SVGs' 2 s wait, so it never cuts
 * one short.
 */
const SPLASH_CEILING_MS = 8000;

export function OnboardingSplashGate({ children }: OnboardingSplashGateProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [isLogoDrawn, setIsLogoDrawn] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setIsLoading(false),
      isLogoDrawn ? DRAWN_HOLD_MS : SPLASH_CEILING_MS,
    );
    return () => clearTimeout(timer);
  }, [isLogoDrawn]);

  const handleLogoDrawn = useCallback(() => {
    setIsLogoDrawn(true);
  }, []);

  const handleExitComplete = useCallback(() => {
    setShowContent(true);
  }, []);

  return (
    <>
      <LoadingScreen
        key="onboarding-splash-loader"
        fullscreen
        isLoading={isLoading}
        onLoaderDrawn={handleLogoDrawn}
        onExitComplete={handleExitComplete}
      />
      {/*
        Rendered from the start so the server markup ships with the response
        and the wizard hydrates while the splash plays. `hidden` keeps it out
        of sight and out of layout until the splash lifts, exactly as
        returning null did.
      */}
      <div hidden={!showContent}>
        <OnboardingRevealContext.Provider value={showContent}>
          {children}
        </OnboardingRevealContext.Provider>
      </div>
    </>
  );
}
