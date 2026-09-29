import type { WorkstyleDimension } from '@/web-app/lib/workstyle/dimensions';
import type { PersonaConfig } from '../_data/quiz-config';

export const QUIZ_POSITIONS = [1, 2, 3, 4] as const;
export type QuizPosition = (typeof QUIZ_POSITIONS)[number];
export type QuizResponseSource = 'predefined' | 'other';

export type QuizQuestionWithAnswers = {
  questionId: number;
  source: 'graphql';
  dimensionId: WorkstyleDimension;
  questionText: string;
  sequenceOrder: number;
  answers: QuizAnswerOption[];
};

export type QuizAnswerOption = {
  answerId: number;
  answerText: string;
  tag: string;
  position: QuizPosition;
  sequenceOrder: number;
};

export type QuizSubmissionPayload = {
  selectedOptionIndex: number | null;
  freeText: string;
  displayedResponseText: string;
};

export type QuizChatMessage = {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
};

export type QuizPersona = Pick<
  PersonaConfig,
  'assistantName' | 'greeting' | 'completionMessage'
>;
