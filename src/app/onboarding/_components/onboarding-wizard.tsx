'use client';

import { useCallback, useState } from 'react';

import type { PublicSignupRole } from '@/web-app/lib/auth/auth-role-mapping';
import { getDashboardPath } from '@/web-app/lib/auth/auth-routes';
import { prefersReducedMotion } from '@/web-app/lib/motion';

import { OnboardingIntroStep } from './intro/intro-step';
import { OnboardingQuizStep } from './quiz/quiz-step';
import { OnboardingResultsStep } from './results/results-step';
import { OnboardingCurtain, type CurtainPhase } from './shared/curtain';
import { useOnboardingWizardController } from './use-wizard-controller';
import { useCurrentTraits } from './use-current-traits';
import { saveQuizResponsesAction } from '../_lib/onboarding-actions';
import type { QuizTagMetadata } from '@/web-app/lib/workstyle/tag-metadata';
import type { QuizQuestionWithAnswers } from '../_lib/quiz-types';
import {
  ONBOARDING_COPY,
  ONBOARDING_RETAKE_COPY,
} from '../_data/onboarding-copy';

type OnboardingWizardProps = {
  role: PublicSignupRole;
  initialQuizQuestions: QuizQuestionWithAnswers[];
  initialTagMetadata: QuizTagMetadata;
};

export function OnboardingWizard({
  role,
  initialQuizQuestions,
  initialTagMetadata,
}: OnboardingWizardProps) {
  const {
    flowState,
    dispatchFlow,
    totalQuestions,
    currentQuestion,
    isLastQuestion,
    continueFromIntro,
    handleQuizSubmitResponse,
    handleQuizFinalTransitionComplete,
  } = useOnboardingWizardController({
    role,
    initialQuizQuestions,
    saveQuizResponses: saveQuizResponsesAction,
  });
  const copy = ONBOARDING_COPY[role];
  // Someone who already has traits is retaking the quiz: welcomed back, not congratulated.
  const currentTraits = useCurrentTraits(role);
  const retake =
    currentTraits.length > 0 ? ONBOARDING_RETAKE_COPY[role] : null;

  // The curtain comes down over the quiz's wrap-up, the results mount behind it, and it lifts on
  // them (OnboardingCurtain).
  const [curtain, setCurtain] = useState<CurtainPhase | null>(null);
  const finishQuiz = useCallback(() => {
    if (prefersReducedMotion()) {
      handleQuizFinalTransitionComplete();
      return;
    }
    setCurtain('covering');
  }, [handleQuizFinalTransitionComplete]);
  const handleCurtainCovered = useCallback(() => {
    handleQuizFinalTransitionComplete();
    setCurtain('lifting');
  }, [handleQuizFinalTransitionComplete]);
  const handleCurtainLifted = useCallback(() => setCurtain(null), []);

  const renderStep = () => {
    switch (flowState.step) {
      case 'intro':
        return (
          <OnboardingIntroStep
            copy={retake?.intro ?? copy.intro}
            celebrate={!retake}
            retake={
              retake
                ? {
                    traits: currentTraits,
                    tagMetadata: initialTagMetadata,
                    keepHref: getDashboardPath(role),
                  }
                : null
            }
            continueFromIntro={continueFromIntro}
          />
        );
      case 'quiz':
        return (
          <OnboardingQuizStep
            role={role}
            copy={copy.quiz}
            greeting={retake?.greeting ?? null}
            flowState={flowState}
            dispatchFlow={dispatchFlow}
            totalQuestions={totalQuestions}
            currentQuestion={currentQuestion}
            isLastQuestion={isLastQuestion}
            handleQuizSubmitResponse={handleQuizSubmitResponse}
            handleQuizFinalTransitionComplete={finishQuiz}
          />
        );
      case 'results':
        return (
          <OnboardingResultsStep
            role={role}
            copy={copy.results}
            flowState={flowState}
            tagMetadata={initialTagMetadata}
          />
        );
    }
  };

  return (
    <>
      {renderStep()}
      {curtain ? (
        <OnboardingCurtain
          phase={curtain}
          onCovered={handleCurtainCovered}
          onLifted={handleCurtainLifted}
        />
      ) : null}
    </>
  );
}
