'use client';

import { useCallback, useRef } from 'react';
import type { Dispatch, RefObject } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from 'sonner';
import type { PublicSignupRole } from '@/web-app/lib/auth/auth-role-mapping';
import {
  buildWorkstyleTagsFromAssessments,
  type QuizAssessment,
} from '../../_lib/quiz-response-classifier';
import type { SaveQuizResponsesResult } from '../../_lib/onboarding-actions';
import type { WorkstyleDimension } from '@/web-app/lib/workstyle/dimensions';
import type { QuizQuestionWithAnswers } from '../../_lib/quiz-types';
import { buildPersistableResponses } from '../../_lib/onboarding-quiz-submission';
import type { WorkstyleResponse } from '../../_lib/onboarding-schemas';
import type { WizardFlowAction } from '../../_lib/onboarding-wizard-flow';

type UseOnboardingQuizPersistenceParams = {
  dispatchFlow: Dispatch<WizardFlowAction>;
  initialQuizQuestions: QuizQuestionWithAnswers[];
  role: PublicSignupRole;
  saveQuizResponses: (
    role: PublicSignupRole,
    workstyleResponses: WorkstyleResponse[],
  ) => Promise<SaveQuizResponsesResult>;
};

type PersistResponsesContext = Pick<
  UseOnboardingQuizPersistenceParams,
  'role' | 'saveQuizResponses'
> & {
  /** The set of answers last sent, so the same set isn't sent twice. */
  persistedResponsesKeyRef: RefObject<string | null>;
};

/**
 * Sends the responses to the server action, once per set of answers: no answers, or the set last
 * sent, count as saved. A save that doesn't go through forgets the set, so the next attempt tries
 * again, and says so.
 */
async function persistResponsesOnce(
  responses: WorkstyleResponse[],
  {
    role,
    saveQuizResponses,
    persistedResponsesKeyRef,
  }: PersistResponsesContext,
): Promise<SaveQuizResponsesResult> {
  if (responses.length === 0) {
    return {
      status: 'saved',
    };
  }

  const nextKey = responses
    .map((item) => `${item.questionId}:${item.answerId}`)
    .join('|');
  if (persistedResponsesKeyRef.current === nextKey) {
    return {
      status: 'saved',
    };
  }

  persistedResponsesKeyRef.current = nextKey;
  try {
    const result = await saveQuizResponses(role, responses);
    if (result.status === 'auth_redirect') {
      return result;
    }

    if (result.status !== 'saved') {
      persistedResponsesKeyRef.current = null;
      toast.error(
        'Your workstyle results are still syncing. Please try again in a moment.',
      );
      return result;
    }

    return result;
  } catch (error) {
    persistedResponsesKeyRef.current = null;
    console.error('[onboarding] Failed to autosave quiz responses.', error);
    toast.error(
      'Could not autosave quiz answers yet. Please try again shortly from your dashboard.',
    );
    return {
      status: 'retryable_failure',
    };
  }
}

export function useOnboardingQuizPersistence({
  dispatchFlow,
  initialQuizQuestions,
  role,
  saveQuizResponses,
}: UseOnboardingQuizPersistenceParams) {
  const router = useRouter();
  // Owns the client-side bridge to the server action for final quiz persistence.
  const persistedResponsesKeyRef = useRef<string | null>(null);

  const persistQuizResponses = useCallback(
    (responses: WorkstyleResponse[]): Promise<SaveQuizResponsesResult> =>
      persistResponsesOnce(responses, {
        role,
        saveQuizResponses,
        persistedResponsesKeyRef,
      }),
    [role, saveQuizResponses],
  );

  const completeFinalQuestionSubmission = useCallback(
    async (
      nextAssessmentsByDimension: Partial<
        Record<WorkstyleDimension, QuizAssessment>
      >,
    ) => {
      const responses = buildPersistableResponses(nextAssessmentsByDimension);
      const tags = buildWorkstyleTagsFromAssessments(
        role,
        initialQuizQuestions,
        nextAssessmentsByDimension,
      );
      const persistResult = await persistQuizResponses(responses);
      if (persistResult.status === 'auth_redirect') {
        router.replace(persistResult.destination);
        return;
      }

      if (persistResult.status !== 'saved') {
        return;
      }

      dispatchFlow({ type: 'setWorkstyleTags', tags });
      dispatchFlow({ type: 'setQuizSubmitting', isSubmitting: true });
    },
    [dispatchFlow, initialQuizQuestions, persistQuizResponses, role, router],
  );

  return {
    completeFinalQuestionSubmission,
  };
}
