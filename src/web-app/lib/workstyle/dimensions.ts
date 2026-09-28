/**
 * The six work-style dimensions are the backbone of the product: quiz
 * questions, persisted responses, results copy and trait tags all key off
 * them. Declare them once here so a new dimension is a single edit that the
 * type checker propagates everywhere.
 */
export type WorkstyleDimension =
  | 'decision-making'
  | 'adaptability'
  | 'responsiveness'
  | 'time-management'
  | 'cooperativeness'
  | 'communication';

/** Canonical question order. Index N of the quiz maps to dimension N. */
export const WORKSTYLE_DIMENSIONS: readonly WorkstyleDimension[] = [
  'decision-making',
  'adaptability',
  'responsiveness',
  'time-management',
  'cooperativeness',
  'communication',
];

export function isWorkstyleDimension(
  value: string,
): value is WorkstyleDimension {
  return (WORKSTYLE_DIMENSIONS as readonly string[]).includes(value);
}

export function getDimensionByQuestionIndex(
  questionIndex: number,
): WorkstyleDimension {
  const normalizedIndex =
    ((questionIndex % WORKSTYLE_DIMENSIONS.length) +
      WORKSTYLE_DIMENSIONS.length) %
    WORKSTYLE_DIMENSIONS.length;
  return WORKSTYLE_DIMENSIONS[normalizedIndex];
}
