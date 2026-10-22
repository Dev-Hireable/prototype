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
 * How long the splash stays once the page has hydrated, in ms: a brief transition into the intro.
 * Nothing loads behind it by then (the wizard is already rendered and the stored traits are read in
 * the same commit's effects), so it used to hold a full screen with nothing to do for 4.2 s, between
 * sign-up's Continue and the intro.
 */
const SPLASH_MS = 1000;

export function OnboardingSplashGate({ children }: OnboardingSplashGateProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), SPLASH_MS);
    return () => clearTimeout(timer);
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
