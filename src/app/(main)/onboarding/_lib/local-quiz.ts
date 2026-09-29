import type { PublicSignupRole } from '@/web-app/lib/auth/auth-role-mapping';

import { quizConfig } from '../_data/quiz-config';
import type { QuizPosition, QuizQuestionWithAnswers } from './quiz-types';

/**
 * The real app loads the quiz from its backend (quiz-questions.server.ts). The prototype has no
 * backend, so the questions are the quiz script itself (_data/quiz-config.json) with ids made up
 * from their order: a question's id is its place in the quiz (1–6), and an answer's is that times
 * ten plus its position, so a saved response carries everything needed to read it back.
 */
export function localQuizQuestions(
  role: PublicSignupRole,
): QuizQuestionWithAnswers[] {
  return quizConfig[role].questions.map((question, index) => {
    const questionId = index + 1;
    return {
      questionId,
      source: 'graphql',
      dimensionId: question.dimensionId,
      questionText: question.questionText,
      sequenceOrder: questionId,
      answers: question.answers.map((answer) => ({
        answerId: questionId * 10 + answer.position,
        answerText: answer.answerText,
        tag: answer.tag,
        position: answer.position,
        sequenceOrder: answer.position,
      })),
    };
  });
}

/** The question (0-based, in quiz order) and answer position a local answer id stands for. */
export function decodeLocalAnswer(
  questionId: number,
  answerId: number,
): { index: number; position: QuizPosition } | null {
  const position = answerId % 10;
  const valid =
    Math.floor(answerId / 10) === questionId &&
    position >= 1 &&
    position <= 4;
  return valid
    ? { index: questionId - 1, position: position as QuizPosition }
    : null;
}
