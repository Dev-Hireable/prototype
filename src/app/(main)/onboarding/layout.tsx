import type { ReactNode } from 'react';

import { OnboardingSplashGate } from './_components/shared/splash-gate';
import { Toaster } from '@/web-app/components/ui/toaster';
/** The real app's third face, for the trait tags on the results screen. */
import { nunitoSans } from '@/web-app/lib/fonts/nunito-sans';

/**
 * The real app's onboarding, ported unchanged (src/app/(main)/onboarding, src/web-app). What its root
 * layout gave it comes with it: Nunito Sans, the Toaster, and — through `.web-app-theme` in
 * globals.css — the real app's colours, radii and DM Sans body text, scoped to this subtree so
 * the portals keep their own.
 */
export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className={`web-app-theme ${nunitoSans.variable} flex min-h-full flex-1 flex-col bg-background font-sans text-foreground antialiased`}
    >
      <OnboardingSplashGate>{children}</OnboardingSplashGate>
      <Toaster />
    </div>
  );
}
