import type { PublicSignupRole } from '@/web-app/lib/auth/auth-role-mapping';
import { REQUIRED_WORKSTYLE_RESPONSE_COUNT } from '@/web-app/lib/onboarding/completion';
import { saveWorkStyle, sideOfQuizRole, valueForPosition } from '@/lib/demo/work-style';

import type { WorkstyleResponse } from './onboarding-schemas';
import { decodeLocalAnswer } from './local-quiz';

export type SaveQuizResponsesResult =
  | {
      status: 'saved';
    }
  | {
      status: 'auth_redirect';
      destination: string;
    }
  | {
      status: 'retryable_failure';
    };

/**
 * The real app's server action saves the answers through GraphQL and polls until the profile
 * reports them complete. The prototype keeps each portal's state in the browser, so this stores
 * the six answers where that portal reads them (@/lib/demo/work-style), and the badges, chart and
 * match scores pick them up when it next loads. Same signature and results as the real action.
 */
export async function saveQuizResponsesAction(
  role: PublicSignupRole,
  workstyleResponses: WorkstyleResponse[],
): Promise<SaveQuizResponsesResult> {
  const answers: number[] = [];
  for (const response of workstyleResponses) {
    const decoded = decodeLocalAnswer(response.questionId, response.answerId);
    if (!decoded) {
      return { status: 'retryable_failure' };
    }
    answers[decoded.index] = valueForPosition(decoded.position);
  }

  if (
    answers.length !== REQUIRED_WORKSTYLE_RESPONSE_COUNT ||
    answers.some((value) => value === undefined)
  ) {
    return { status: 'retryable_failure' };
  }

  try {
    saveWorkStyle(sideOfQuizRole(role), answers);
  } catch (error) {
    console.error('[onboarding] Could not store quiz answers.', error);
    return { status: 'retryable_failure' };
  }

  return { status: 'saved' };
}
