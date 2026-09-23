'use client';

import { useCallback, useEffect, useReducer } from 'react';
import type { Dispatch } from 'react';
import type { PublicSignupRole } from '@/web-app/lib/auth/auth-role-mapping';

import { toast } from 'sonner';
import type { QuizAssessment } from '../_lib/quiz-response-classifier';
import type {
  QuizQuestionWithAnswers,
  QuizSubmissionPayload,
} from '../_lib/quiz-types';
import { buildAssistantAcknowledgement } from '../_lib/quiz-conversation-spec';
import { resolveQuizSubmission } from '../_lib/onboarding-quiz-submission';
import type {
  WizardFlowAction,
  WizardFlowState,
} from '../_lib/onboarding-wizard-flow';
import {
  INITIAL_WIZARD_FLOW_STATE,
  QUIZ_FINAL_TRANSITION_FALLBACK_MS,
  onboardingFlowReducer,
} from '../_lib/onboarding-wizard-flow';
import type { SaveQuizResponsesResult } from '../_lib/onboarding-actions';
import type { WorkstyleResponse } from '../_lib/onboarding-schemas';
import { useOnboardingQuizPersistence } from './quiz/use-quiz-persistence';

function useQuizResultsTransitionFallback({
  isArmed,
  onTimeout,
}: {
  isArmed: boolean;
  onTimeout: () => void;
}) {
  useEffect(() => {
    if (!isArmed) {
      return;
    }

    const fallbackTimer = window.setTimeout(
      onTimeout,
      QUIZ_FINAL_TRANSITION_FALLBACK_MS,
    );

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, [isArmed, onTimeout]);
}

type UseOnboardingWizardControllerParams = {
  role: PublicSignupRole;
  initialQuizQuestions: QuizQuestionWithAnswers[];
  saveQuizResponses: (
    role: PublicSignupRole,
    workstyleResponses: WorkstyleResponse[],
  ) => Promise<SaveQuizResponsesResult>;
};

type UseOnboardingWizardControllerResult = {
  flowState: WizardFlowState;
  dispatchFlow: Dispatch<WizardFlowAction>;
  totalQuestions: number;
  currentQuestion: QuizQuestionWithAnswers | null;
  isLastQuestion: boolean;
  continueFromIntro: () => void;
  handleQuizSubmitResponse: (payload: QuizSubmissionPayload) => Promise<void>;
  handleQuizFinalTransitionComplete: () => void;
};

export function useOnboardingWizardController({
  role,
  initialQuizQuestions,
  saveQuizResponses,
}: UseOnboardingWizardControllerParams): UseOnboardingWizardControllerResult {
  // Owns durable client flow state that must survive across quiz questions.
  const [flowState, dispatchFlow] = useReducer(
    onboardingFlowReducer,
    INITIAL_WIZARD_FLOW_STATE,
  );

  const {
    step,
    currentQuestionIndex,
    assessmentsByDimension,
    pendingFollowup,
    isQuizSubmitting,
    workstyleTags,
  } = flowState;

  const totalQuestions = initialQuizQuestions.length;
  const currentQuestion = initialQuizQuestions[currentQuestionIndex] ?? null;
  const isLastQuestion =
    totalQuestions > 0 && currentQuestionIndex === totalQuestions - 1;

  const continueFromIntro = useCallback(() => {
    if (totalQuestions === 0) {
      toast.error('No quiz questions available.');
      return;
    }

    dispatchFlow({ type: 'setStep', step: 'quiz' });
  }, [totalQuestions]);

  // Persistence stays behind this adapter so server mutations do not leak into
  // the quiz interaction state managed by useOnboardingQuizController.
  const { completeFinalQuestionSubmission } = useOnboardingQuizPersistence({
    dispatchFlow,
    initialQuizQuestions,
    role,
    saveQuizResponses,
  });

  const finalizeDimensionAssessment = useCallback(
    async (assessment: QuizAssessment) => {
      const nextAssessmentsByDimension = {
        ...assessmentsByDimension,
        [assessment.dimensionId]: assessment,
      };

      dispatchFlow({ type: 'upsertAssessment', assessment });
      dispatchFlow({ type: 'setPendingFollowup', followup: null });
      if (!isLastQuestion) {
        dispatchFlow({
          type: 'setLastAssistantAcknowledgement',
          text: buildAssistantAcknowledgement({
            role,
            source: assessment.source,
            position: assessment.position,
            seed: currentQuestionIndex,
          }),
        });
      }
      dispatchFlow({ type: 'setSelectedOption', option: null });

      if (isLastQuestion) {
        await completeFinalQuestionSubmission(nextAssessmentsByDimension);
        return;
      }

      dispatchFlow({
        type: 'setCurrentQuestionIndex',
        index: currentQuestionIndex + 1,
      });
    },
    [
      assessmentsByDimension,
      completeFinalQuestionSubmission,
      currentQuestionIndex,
      dispatchFlow,
      isLastQuestion,
      role,
    ],
  );

  const handleQuizSubmitResponse = useCallback(
    async (payload: QuizSubmissionPayload) => {
      if (isQuizSubmitting) {
        return;
      }
      const submission = resolveQuizSubmission({
        role,
        currentQuestion,
        payload,
        pendingFollowup,
      });

      if (submission.type === 'noop') {
        return;
      }

      if (submission.type === 'request-followup') {
        dispatchFlow({
          type: 'setPendingFollowup',
          followup: submission.followup,
        });
        dispatchFlow({ type: 'setSelectedOption', option: null });
        return;
      }

      await finalizeDimensionAssessment(submission.assessment);
    },
    [
      currentQuestion,
      dispatchFlow,
      finalizeDimensionAssessment,
      isQuizSubmitting,
      pendingFollowup,
      role,
    ],
  );

  const completeQuizResultsTransition = useCallback(() => {
    dispatchFlow({ type: 'setStep', step: 'results' });
    dispatchFlow({ type: 'setQuizSubmitting', isSubmitting: false });
  }, []);

  // The quiz normally advances when its exit animation reports back; this timer
  // is the safety net for when that callback never arrives.
  useQuizResultsTransitionFallback({
    isArmed:
      step === 'quiz' && isQuizSubmitting && workstyleTags.length > 0,
    onTimeout: completeQuizResultsTransition,
  });

  return {
    flowState,
    dispatchFlow,
    totalQuestions,
    currentQuestion,
    isLastQuestion,
    continueFromIntro,
    handleQuizSubmitResponse,
    handleQuizFinalTransitionComplete: completeQuizResultsTransition,
  };
}
