'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingStepShell } from '../shared/step-shell';
import { OnboardingResultsContent } from './results-body';
import { getDashboardPath } from '@/web-app/lib/auth/auth-routes';
import type { PublicSignupRole } from '@/web-app/lib/auth/auth-role-mapping';
import type { QuizTagMetadata } from '@/web-app/lib/workstyle/tag-metadata';
import type { ResultsCopy } from '../../_data/onboarding-copy';
import type { WizardFlowState } from '../../_lib/onboarding-wizard-flow';
import {
  useOnboardingResultsEntranceAnimation,
  useOnboardingResultsExitAnimation,
} from './use-results-animations';

type OnboardingResultsStepProps = {
  role: PublicSignupRole;
  copy: ResultsCopy;
  flowState: WizardFlowState;
  tagMetadata: QuizTagMetadata;
};

export function OnboardingResultsStep({
  role,
  copy,
  flowState,
  tagMetadata,
}: OnboardingResultsStepProps) {
  const { push } = useRouter();
  const workstyleTags = flowState.workstyleTags;

  const onContinue = useCallback(() => {
    push(getDashboardPath(role));
  }, [role, push]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  useOnboardingResultsEntranceAnimation(containerRef, workstyleTags.join('|'));

  const triggerExit = useOnboardingResultsExitAnimation(
    containerRef,
    () => {
      try {
        onContinue();
      } finally {
        setIsNavigating(false);
      }
    },
  );

  const handleContinue = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    triggerExit();
  };

  return (
    <OnboardingStepShell hideHeader>
      <div className="sr-only">Preparing your results.</div>
      <OnboardingResultsContent
        containerRef={containerRef}
        copy={copy}
        isNavigating={isNavigating}
        onContinue={handleContinue}
        role={role}
        tagMetadata={tagMetadata}
        workstyleTags={workstyleTags}
      />
    </OnboardingStepShell>
  );
}
