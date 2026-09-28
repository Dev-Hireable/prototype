import type { PublicSignupRole } from '@/web-app/lib/auth/auth-role-mapping';

import type { WorkstyleDimension } from '@/web-app/lib/workstyle/dimensions';
import type { QuizPosition, QuizResponseSource } from './quiz-types';
import {
  quizConfig,
  type CanonicalQuestion,
  type PersonaConfig,
} from '../_data/quiz-config';

const CANONICAL_QUIZ_BY_ROLE: Record<PublicSignupRole, CanonicalQuestion[]> = {
  client: quizConfig.client.questions,
  talent: quizConfig.talent.questions,
};

const PERSONA_BY_ROLE: Record<PublicSignupRole, PersonaConfig> = {
  client: quizConfig.client.persona,
  talent: quizConfig.talent.persona,
};

function pickDeterministic<T>(values: readonly T[], seed: number): T {
  if (values.length === 0) {
    throw new TypeError('pickDeterministic requires at least one value.');
  }

  return values[Math.abs(seed) % values.length] as T;
}

export function getQuizPersona(role: PublicSignupRole) {
  return PERSONA_BY_ROLE[role];
}

export function getFollowupPrompt(
  role: PublicSignupRole,
  dimensionId: WorkstyleDimension,
): string {
  const question = CANONICAL_QUIZ_BY_ROLE[role].find(
    (item) => item.dimensionId === dimensionId,
  );
  return (
    question?.followupPrompt ??
    'Would you lean toward moving now, or waiting for more context first?'
  );
}

export function buildAssistantAcknowledgement({
  role,
  source,
  position,
  seed,
}: {
  role: PublicSignupRole;
  source: QuizResponseSource;
  position: QuizPosition;
  seed: number;
}): string {
  const persona = PERSONA_BY_ROLE[role];
  const shortAck = pickDeterministic(persona.shortAcknowledgments, seed);

  if (source === 'predefined') {
    return shortAck;
  }

  return `${persona.otherReflectionsByPosition[position]} ${shortAck}`;
}

export function getCanonicalTagForPosition(
  role: PublicSignupRole,
  dimensionId: WorkstyleDimension,
  position: QuizPosition,
): string {
  const question = CANONICAL_QUIZ_BY_ROLE[role].find(
    (item) => item.dimensionId === dimensionId,
  );
  const answer = question?.answers.find((item) => item.position === position);
  return answer?.tag ?? '';
}
