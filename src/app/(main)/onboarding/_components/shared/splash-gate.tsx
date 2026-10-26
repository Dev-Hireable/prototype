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
 * The longest the splash stays, in ms, if the logo never reports a finished cycle (GSAP's chunk
 * stalls, say). The splash otherwise lifts the moment the logo has drawn in, held and drawn back
 * out (about 4 s), never part-way through; this sits well past that, even with the SVGs' 2 s wait,
 * so it never cuts a cycle short.
 */
const SPLASH_CEILING_MS = 10000;

export function OnboardingSplashGate({ children }: OnboardingSplashGateProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), SPLASH_CEILING_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleLogoCycle = useCallback(() => {
    setIsLoading(false);
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
        onLoaderCycle={handleLogoCycle}
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
