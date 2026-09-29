import type { PublicSignupRole } from '@/web-app/lib/auth/auth-role-mapping';

import { getFollowupPrompt } from './quiz-conversation-spec';
import { normalizeText, normalizeTextOrNull } from './onboarding-schemas';
import type {
  QuizQuestionWithAnswers,
  QuizSubmissionPayload,
} from './quiz-types';
import {
  classifyOtherResponse,
  resolveAssessmentTag,
  type PendingFollowup,
  type QuizAssessment,
} from './quiz-response-classifier';
import type { WorkstyleResponse } from './onboarding-schemas';

type ResolvedQuizSubmission =
  | { type: 'noop' }
  | { type: 'request-followup'; followup: PendingFollowup }
  | { type: 'assessment'; assessment: QuizAssessment };

export function buildPersistableResponses(
  assessmentsByDimension: Partial<
    Record<QuizAssessment['dimensionId'], QuizAssessment>
  >,
): WorkstyleResponse[] {
  const responses: WorkstyleResponse[] = [];

  for (const assessment of Object.values(assessmentsByDimension)) {
    if (
      assessment == null ||
      !assessment.canPersistResponse ||
      assessment.questionId <= 0 ||
      assessment.answerId == null ||
      assessment.answerId <= 0
    ) {
      continue;
    }

    responses.push({
      questionId: assessment.questionId,
      answerId: assessment.answerId,
    });
  }

  return responses;
}

function buildPredefinedAssessment(params: {
  role: PublicSignupRole;
  question: QuizQuestionWithAnswers;
  answer: QuizQuestionWithAnswers['answers'][number];
}): QuizAssessment {
  const { role, question, answer } = params;
  const resolvedTag =
    normalizeTextOrNull(answer.tag) ??
    resolveAssessmentTag(role, question, answer.position).tag;

  return {
    dimensionId: question.dimensionId,
    questionId: question.questionId,
    position: answer.position,
    tag: resolvedTag,
    source: 'predefined',
    answerId: answer.answerId,
    canPersistResponse: answer.answerId > 0,
    rawInput: null,
  };
}

function buildOtherAssessment(params: {
  question: QuizQuestionWithAnswers;
  position: QuizAssessment['position'];
  tag: string;
  answerId: number | null;
  rawInput: string;
}): QuizAssessment {
  const { question, position, tag, answerId, rawInput } = params;

  return {
    dimensionId: question.dimensionId,
    questionId: question.questionId,
    position,
    tag,
    source: 'other',
    answerId,
    canPersistResponse: typeof answerId === 'number' && answerId > 0,
    rawInput,
  };
}

/**
 * Free text is classified into a position on the dimension. The first vague
 * answer earns one follow-up prompt; the reply to it is merged with the
 * original text and classified again, this time without another follow-up.
 */
function resolveFreeTextSubmission(params: {
  role: PublicSignupRole;
  question: QuizQuestionWithAnswers;
  freeText: string;
  answeringFollowup: boolean;
  originalInput: string | null;
}): ResolvedQuizSubmission {
  const { role, question, freeText, answeringFollowup, originalInput } = params;

  const mergedInput = answeringFollowup
    ? normalizeText(`${originalInput} ${freeText}`)
    : freeText;

  const classification = classifyOtherResponse({
    dimensionId: question.dimensionId,
    text: mergedInput,
    allowFollowup: !answeringFollowup,
  });

  if (classification.needsFollowup && !answeringFollowup) {
    return {
      type: 'request-followup',
      followup: {
        dimensionId: question.dimensionId,
        prompt: getFollowupPrompt(role, question.dimensionId),
        originalInput: freeText,
      },
    };
  }

  const { tag, answerId } = resolveAssessmentTag(
    role,
    question,
    classification.position,
  );

  return {
    type: 'assessment',
    assessment: buildOtherAssessment({
      question,
      position: classification.position,
      tag,
      answerId,
      rawInput: mergedInput,
    }),
  };
}

export function resolveQuizSubmission(params: {
  role: PublicSignupRole;
  currentQuestion: QuizQuestionWithAnswers | null;
  payload: QuizSubmissionPayload;
  pendingFollowup: PendingFollowup | null;
}): ResolvedQuizSubmission {
  const { role, currentQuestion, payload, pendingFollowup } = params;
  if (!currentQuestion) {
    return { type: 'noop' };
  }

  const selectedOptionIndex = payload.selectedOptionIndex;
  if (selectedOptionIndex !== null && selectedOptionIndex >= 0) {
    const answer = currentQuestion.answers[selectedOptionIndex] ?? null;
    return answer
      ? {
          type: 'assessment',
          assessment: buildPredefinedAssessment({
            role,
            question: currentQuestion,
            answer,
          }),
        }
      : { type: 'noop' };
  }

  const freeText = normalizeText(payload.freeText);
  if (freeText.length === 0) {
    return { type: 'noop' };
  }

  const answeringFollowup =
    pendingFollowup?.dimensionId === currentQuestion.dimensionId;

  return resolveFreeTextSubmission({
    role,
    question: currentQuestion,
    freeText,
    answeringFollowup,
    originalInput: answeringFollowup ? pendingFollowup.originalInput : null,
  });
}
