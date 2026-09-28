import { z } from 'zod';

import {
  WORKSTYLE_DIMENSIONS,
  type WorkstyleDimension,
} from '@/web-app/lib/workstyle/dimensions';

import quizConfigData from './quiz-config.json';

/**
 * The quiz script is human-edited content. Parsing it through a schema at
 * module load turns a bad edit (missing follow-up prompt, only three answers,
 * renamed dimension) into an immediate, named failure rather than an
 * `undefined` that reaches the user mid-quiz.
 */
const positionSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

const canonicalAnswerSchema = z.object({
  answerText: z.string().min(1),
  tag: z.string().min(1),
  position: positionSchema,
});

const canonicalQuestionSchema = z.object({
  dimensionId: z.enum(
    WORKSTYLE_DIMENSIONS as unknown as [
      WorkstyleDimension,
      ...WorkstyleDimension[],
    ],
  ),
  questionText: z.string().min(1),
  followupPrompt: z.string().min(1),
  answers: z.tuple([
    canonicalAnswerSchema,
    canonicalAnswerSchema,
    canonicalAnswerSchema,
    canonicalAnswerSchema,
  ]),
});

const personaSchema = z.object({
  assistantName: z.string().min(1),
  greeting: z.string().min(1),
  completionMessage: z.string().min(1),
  shortAcknowledgments: z.array(z.string().min(1)).min(1),
  otherReflectionsByPosition: z.object({
    1: z.string().min(1),
    2: z.string().min(1),
    3: z.string().min(1),
    4: z.string().min(1),
  }),
});

const roleConfigSchema = z.object({
  persona: personaSchema,
  questions: z
    .array(canonicalQuestionSchema)
    .length(WORKSTYLE_DIMENSIONS.length),
});

const quizConfigSchema = z.object({
  client: roleConfigSchema,
  talent: roleConfigSchema,
});

export type CanonicalQuestion = z.infer<typeof canonicalQuestionSchema>;
export type PersonaConfig = z.infer<typeof personaSchema>;

export const quizConfig = quizConfigSchema.parse(quizConfigData);
