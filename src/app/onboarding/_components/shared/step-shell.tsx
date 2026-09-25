import Image from 'next/image';
import type { ReactNode } from 'react';

import { ProgressBar } from '@/web-app/components/ui/progress-bar';

type OnboardingStepShellProps = {
  children: ReactNode;
  progress?: {
    current: number;
    total: number;
  };
  hideHeader?: boolean;
  /** When true, progress bar is not rendered (e.g. quiz step renders its own header with progress). */
  hideProgress?: boolean;
};

export function OnboardingStepShell({
  children,
  progress,
  hideHeader = false,
  hideProgress = false,
}: OnboardingStepShellProps) {
  return (
    <div className="bg-background flex min-h-[calc(100dvh/var(--ui-scale))] w-full flex-col">
      {!hideHeader ? (
        <header
          aria-label="Onboarding"
          className="bg-background flex w-full items-center justify-center px-6 py-4 lg:px-14 lg:py-8"
        >
          <Image
            src="/Logo-name.svg"
            alt="Hireable"
            width={120}
            height={24}
            loading="eager"
            unoptimized
          />
        </header>
      ) : null}
      {progress && !hideHeader && !hideProgress ? (
        <ProgressBar current={progress.current} total={progress.total} />
      ) : null}
      {children}
    </div>
  );
}
