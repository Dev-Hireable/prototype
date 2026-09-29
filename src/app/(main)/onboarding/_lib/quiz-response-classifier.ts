import type { PublicSignupRole } from '@/web-app/lib/auth/auth-role-mapping';

import { getCanonicalTagForPosition } from './quiz-conversation-spec';
import { normalizeTextOrNull } from './onboarding-schemas';
import type { WorkstyleDimension } from '@/web-app/lib/workstyle/dimensions';
import {
  QUIZ_POSITIONS,
  type QuizPosition,
  type QuizQuestionWithAnswers,
  type QuizResponseSource,
} from './quiz-types';

export type QuizAssessment = {
  dimensionId: WorkstyleDimension;
  questionId: number;
  position: QuizPosition;
  tag: string;
  source: QuizResponseSource;
  answerId: number | null;
  canPersistResponse: boolean;
  rawInput: string | null;
};

export type PendingFollowup = {
  dimensionId: WorkstyleDimension;
  prompt: string;
  originalInput: string;
};

type ClassificationResult = {
  position: QuizPosition;
  confidence: number;
  needsFollowup: boolean;
  matchedSignals: string[];
};

type ClassifierInput = {
  dimensionId: WorkstyleDimension;
  text: string;
  allowFollowup?: boolean;
};

type SignalScore = {
  score: number;
  matched: string[];
};

const FOLLOWUP_CONFIDENCE_THRESHOLD = 0.7;
const DEFAULT_POSITION: QuizPosition = 2;

const GLOBAL_SIGNALS: Record<QuizPosition, string[]> = {
  1: [
    'just do it',
    'ship it',
    'keep going',
    'figure it out',
    'right away',
    'immediately',
    'now',
    'quickly',
    'move fast',
    'judgment call',
    'dont wait',
    "don't wait",
  ],
  2: [
    'check in',
    'quick read',
    'ask around',
    'within the hour',
    'most urgent',
    'prioritize',
    'balance',
    'communicate',
    'loop them in',
    'message first',
    'gut check',
  ],
  3: [
    'stick to the plan',
    'protect scope',
    'push back',
    'weekly',
    'calendar',
    'end of day',
    'structured',
    'consistent',
    'planned',
    'process',
  ],
  4: [
    'wait',
    'pause',
    'full picture',
    'one at a time',
    'scheduled',
    'check in later',
    'slow down',
    'replan',
    'careful',
    'thorough',
  ],
};

const DIMENSION_SIGNALS: Record<
  WorkstyleDimension,
  Record<QuizPosition, string[]>
> = {
  'decision-making': {
    1: ['green light', 'make the call', 'approve it'],
    2: ['quick read from the team', 'message then continue'],
    3: ['review options', 'document options'],
    4: ['hold off', 'pause until i hear back'],
  },
  adaptability: {
    1: ['pivot', 'redirect right away', 'keep shipping'],
    2: ['clarifying questions', 'understand why'],
    3: ['protect original scope', 'stick to original brief'],
    4: ['step back', 'pause sprint', 'replan'],
  },
  responsiveness: {
    1: ['reply right away', 'as soon as i see it'],
    2: ['come up for air', 'within the hour'],
    3: ['batch replies', 'end of day'],
    4: ['next sync', 'next standup', 'scheduled check-in'],
  },
  'time-management': {
    1: ['jump between', 'context switch', 'all at once'],
    2: ['most urgent first', 'time sensitive first', 'triage'],
    3: ['block calendar', 'stick to schedule', 'plan the week'],
    4: ['deep work', 'one project at a time', 'one thing at a time'],
  },
  cooperativeness: {
    1: ['back my decision', 'push back hard'],
    2: ['hear them out', 'understand theirs', 'talk it through'],
    3: ['middle ground', 'meet halfway', 'compromise'],
    4: ['let them decide', 'go with their feedback', 'best idea wins'],
  },
  communication: {
    1: ['throughout the day', 'keep a pulse', 'always online'],
    2: ['daily update', 'daily sync', 'daily standup'],
    3: ['weekly summary', 'weekly recap'],
    4: [
      'only when progress',
      'when there is something to share',
      'milestone updates',
    ],
  },
};

function normalizeClassifierText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreSignals(text: string, signals: string[]): SignalScore {
  let score = 0;
  const matched: string[] = [];
  const paddedText = ` ${text} `;

  for (const signal of signals) {
    const normalizedSignal = signal.trim();
    if (!normalizedSignal || !paddedText.includes(` ${normalizedSignal} `)) {
      continue;
    }

    matched.push(normalizedSignal);
    score += normalizedSignal.includes(' ') ? 2 : 1;
  }

  return { score, matched };
}

export function classifyOtherResponse({
  dimensionId,
  text,
  allowFollowup = true,
}: ClassifierInput): ClassificationResult {
  const normalized = normalizeClassifierText(text);
  const byPosition: Record<QuizPosition, SignalScore> = {
    1: { score: 0, matched: [] },
    2: { score: 0, matched: [] },
    3: { score: 0, matched: [] },
    4: { score: 0, matched: [] },
  };

  for (const position of QUIZ_POSITIONS) {
    byPosition[position] = scoreSignals(normalized, [
      ...GLOBAL_SIGNALS[position],
      ...DIMENSION_SIGNALS[dimensionId][position],
    ]);
  }

  const sorted = QUIZ_POSITIONS
    .map((position) => ({
      position,
      score: byPosition[position].score,
      matched: byPosition[position].matched,
    }))
    .sort((left, right) => right.score - left.score);

  const best = sorted[0];
  const runnerUp = sorted[1];
  const totalScore = sorted.reduce((sum, item) => sum + item.score, 0);

  if (best.score <= 0 || totalScore <= 0) {
    return {
      position: DEFAULT_POSITION,
      confidence: 0,
      needsFollowup: allowFollowup,
      matchedSignals: [],
    };
  }

  const confidence = Number(
    (best.score / Math.max(best.score + runnerUp.score, 1)).toFixed(2),
  );

  return {
    position: best.position,
    confidence,
    needsFollowup: allowFollowup && confidence < FOLLOWUP_CONFIDENCE_THRESHOLD,
    matchedSignals: best.matched,
  };
}

export function resolveAssessmentTag(
  role: PublicSignupRole,
  question: QuizQuestionWithAnswers,
  position: QuizPosition,
): { tag: string; answerId: number | null } {
  const matchedAnswer =
    question.answers.find((answer) => answer.position === position) ?? null;
  const normalizedTag = matchedAnswer
    ? normalizeTextOrNull(matchedAnswer.tag)
    : null;

  if (normalizedTag !== null) {
    return {
      tag: normalizedTag,
      answerId: matchedAnswer?.answerId ?? null,
    };
  }

  return {
    tag: getCanonicalTagForPosition(role, question.dimensionId, position),
    answerId: matchedAnswer?.answerId ?? null,
  };
}

export function buildWorkstyleTagsFromAssessments(
  role: PublicSignupRole,
  questions: QuizQuestionWithAnswers[],
  assessmentsByDimension: Partial<Record<WorkstyleDimension, QuizAssessment>>,
): string[] {
  return questions.map((question) => {
    const assessment = assessmentsByDimension[question.dimensionId];
    const normalizedTag = assessment
      ? normalizeTextOrNull(assessment.tag)
      : null;

    if (normalizedTag !== null) {
      return normalizedTag;
    }

    return getCanonicalTagForPosition(role, question.dimensionId, 2);
  });
}
