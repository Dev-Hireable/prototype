'use client';

import { useCallback, useState } from 'react';

import type { WorkStyleTag } from '@/lib/demo/work-style';
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

/** Finishing the quiz: by way of the curtain, or straight to the results with reduced motion. */
function useResultsCurtain(showResults: () => void) {
  // The curtain comes down over the quiz's wrap-up, the results mount behind it, and it lifts on
  // them (OnboardingCurtain).
  const [curtain, setCurtain] = useState<CurtainPhase | null>(null);
  const finishQuiz = useCallback(() => {
    if (prefersReducedMotion()) {
      showResults();
      return;
    }
    setCurtain('covering');
  }, [showResults]);
  const handleCurtainCovered = useCallback(() => {
    showResults();
    setCurtain('lifting');
  }, [showResults]);
  const handleCurtainLifted = useCallback(() => setCurtain(null), []);

  return { curtain, finishQuiz, handleCurtainCovered, handleCurtainLifted };
}

type OnboardingWizardStepProps = {
  role: PublicSignupRole;
  /** The traits this side already has: any at all make this a retake. */
  currentTraits: WorkStyleTag[];
  tagMetadata: QuizTagMetadata;
  wizard: ReturnType<typeof useOnboardingWizardController>;
  /** Ends the quiz once its wrap-up has run (useResultsCurtain's finishQuiz). */
  finishQuiz: () => void;
};

/** The step the flow is on: the intro, the quiz, or the results. */
function OnboardingWizardStep({
  role,
  currentTraits,
  tagMetadata,
  wizard,
  finishQuiz,
}: OnboardingWizardStepProps) {
  const copy = ONBOARDING_COPY[role];
  const retake =
    currentTraits.length > 0 ? ONBOARDING_RETAKE_COPY[role] : null;
  const { flowState } = wizard;

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
                  tagMetadata,
                  keepHref: getDashboardPath(role),
                }
              : null
          }
          continueFromIntro={wizard.continueFromIntro}
        />
      );
    case 'quiz':
      return (
        <OnboardingQuizStep
          role={role}
          copy={copy.quiz}
          greeting={retake?.greeting ?? null}
          flowState={flowState}
          dispatchFlow={wizard.dispatchFlow}
          totalQuestions={wizard.totalQuestions}
          currentQuestion={wizard.currentQuestion}
          isLastQuestion={wizard.isLastQuestion}
          handleQuizSubmitResponse={wizard.handleQuizSubmitResponse}
          handleQuizFinalTransitionComplete={finishQuiz}
        />
      );
    case 'results':
      return (
        <OnboardingResultsStep
          role={role}
          copy={copy.results}
          flowState={flowState}
          tagMetadata={tagMetadata}
        />
      );
  }
}

export function OnboardingWizard({
  role,
  initialQuizQuestions,
  initialTagMetadata,
}: OnboardingWizardProps) {
  const wizard = useOnboardingWizardController({
    role,
    initialQuizQuestions,
    saveQuizResponses: saveQuizResponsesAction,
  });
  // Someone who already has traits is retaking the quiz: welcomed back, not congratulated.
  const currentTraits = useCurrentTraits(role);
  const { curtain, finishQuiz, handleCurtainCovered, handleCurtainLifted } =
    useResultsCurtain(wizard.handleQuizFinalTransitionComplete);

  return (
    <>
      <OnboardingWizardStep
        role={role}
        currentTraits={currentTraits}
        tagMetadata={initialTagMetadata}
        wizard={wizard}
        finishQuiz={finishQuiz}
      />
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
