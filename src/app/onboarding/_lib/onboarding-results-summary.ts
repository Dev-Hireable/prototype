import type { PublicSignupRole } from '@/web-app/lib/auth/auth-role-mapping';
import {
  getDimensionByQuestionIndex,
  WORKSTYLE_DIMENSIONS,
  type WorkstyleDimension,
} from '@/web-app/lib/workstyle/dimensions';
import {
  PROFILE_AUDIENCES,
  workstyleResultsContent,
  type ProfileAudience,
} from '@/web-app/lib/workstyle/results-content';
import { toTagKey } from '@/web-app/lib/workstyle/results-traits';
import type { QuizTagMetadata } from '@/web-app/lib/workstyle/tag-metadata';
import { QUIZ_POSITIONS, type QuizPosition } from './quiz-types';

type DominanceKey = '1' | '2' | '3' | '4' | 'mixed';
type ProfileKey =
  | 'all-1'
  | 'all-2'
  | 'all-3'
  | 'all-4'
  | 'mostly-1-2'
  | 'mostly-2-1'
  | 'mostly-2-3'
  | 'mostly-3-2'
  | 'mostly-3-4'
  | 'mostly-4-3'
  | 'mixed';

type SummaryInput = {
  role: PublicSignupRole;
  tags: string[];
  tagMetadata?: QuizTagMetadata | null;
};

type RankedTag = {
  index: number;
  rawTag: string;
  normalizedTag: string;
  dimension: WorkstyleDimension;
  position: QuizPosition | null;
};

type PositionMapsByDimension = Record<
  WorkstyleDimension,
  Record<string, QuizPosition>
>;
type AudienceDimensionRecord<TValue> = Record<
  ProfileAudience,
  Record<WorkstyleDimension, TValue>
>;

const EMPTY_SUMMARY =
  'Your quiz traits will appear here once you complete more answers.';

const ROLE_TO_AUDIENCE: Record<PublicSignupRole, ProfileAudience> = {
  client: 'team-builder',
  talent: 'independent',
};

function buildAudienceDimensionRecord<TInput, TOutput>(
  source: AudienceDimensionRecord<TInput>,
  mapValue: (value: TInput) => TOutput,
): AudienceDimensionRecord<TOutput> {
  return Object.fromEntries(
    PROFILE_AUDIENCES.map((audience) => [
      audience,
      Object.fromEntries(
        WORKSTYLE_DIMENSIONS.map((dimension) => [
          dimension,
          mapValue(source[audience][dimension]),
        ]),
      ) as Record<WorkstyleDimension, TOutput>,
    ]),
  ) as AudienceDimensionRecord<TOutput>;
}

const POSITION_BY_AUDIENCE_AND_DIMENSION = buildAudienceDimensionRecord(
  workstyleResultsContent.positions,
  (entries) => {
    const map: Record<string, QuizPosition> = {};
    for (const [position, tags] of entries) {
      for (const tag of tags) {
        map[toTagKey(tag)] = position;
      }
    }
    return map;
  },
);

const OPENINGS: Record<
  ProfileAudience,
  Record<string, string>
> = workstyleResultsContent.openings;
const CLOSINGS: Record<
  ProfileAudience,
  Record<string, string>
> = workstyleResultsContent.closings;

const BODY_SENTENCES = buildAudienceDimensionRecord(
  workstyleResultsContent.sentences,
  (entries) => {
    const map: Record<string, string> = {};
    for (const [tag, sentence] of Object.entries(entries)) {
      map[toTagKey(tag)] = sentence;
    }
    return map;
  },
);

const PREWRITTEN_SUMMARIES: Record<
  ProfileAudience,
  Record<string, string>
> = workstyleResultsContent.prewritten;

function resolveDimension(
  positionMapByDimension: PositionMapsByDimension,
  tagKey: string,
  questionIndex: number,
  rawTag: string,
  tagMetadata?: QuizTagMetadata | null,
): WorkstyleDimension {
  const fallbackDimension = getDimensionByQuestionIndex(questionIndex);
  const metadataDimension = tagMetadata?.dimension?.[rawTag];
  const dimensionCandidates: WorkstyleDimension[] = [fallbackDimension];

  if (metadataDimension && metadataDimension !== fallbackDimension) {
    dimensionCandidates.push(metadataDimension);
  }

  for (const dimension of dimensionCandidates) {
    if (positionMapByDimension[dimension][tagKey] !== undefined) {
      return dimension;
    }
  }

  for (const dimension of WORKSTYLE_DIMENSIONS) {
    if (positionMapByDimension[dimension][tagKey] !== undefined) {
      return dimension;
    }
  }

  return fallbackDimension;
}

function toRankedTags(
  audience: ProfileAudience,
  tags: string[],
  tagMetadata?: QuizTagMetadata | null,
): RankedTag[] {
  const positionMapByDimension = POSITION_BY_AUDIENCE_AND_DIMENSION[audience];

  return tags.slice(0, 6).map((rawTag, index) => {
    const normalizedTag = toTagKey(rawTag);
    const dimension = resolveDimension(
      positionMapByDimension,
      normalizedTag,
      index,
      rawTag,
      tagMetadata,
    );
    const position = positionMapByDimension[dimension][normalizedTag] ?? null;

    return {
      index,
      rawTag,
      normalizedTag,
      dimension,
      position,
    };
  });
}

function getPositionCounts(tags: RankedTag[]): Record<QuizPosition, number> {
  const counts: Record<QuizPosition, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  };

  for (const tag of tags) {
    if (tag.position !== null) {
      counts[tag.position] += 1;
    }
  }

  return counts;
}

function getDominantPosition(
  counts: Record<QuizPosition, number>,
): QuizPosition | null {
  let dominantPosition: QuizPosition | null = null;
  let maxCount = 0;
  let isTie = false;

  for (const position of QUIZ_POSITIONS) {
    const count = counts[position];

    if (count > maxCount) {
      maxCount = count;
      dominantPosition = position;
      isTie = false;
      continue;
    }

    if (count === maxCount && count > 0) {
      isTie = true;
    }
  }

  if (maxCount === 0 || isTie) {
    return null;
  }

  return dominantPosition;
}

function isMixedPresetPattern(counts: Record<QuizPosition, number>): boolean {
  const nonZeroPositions = QUIZ_POSITIONS.filter((position) => counts[position] > 0);

  if (nonZeroPositions.length < 3) {
    return false;
  }

  const isContiguous =
    nonZeroPositions[nonZeroPositions.length - 1] - nonZeroPositions[0] + 1 ===
    nonZeroPositions.length;

  if (!isContiguous) {
    return false;
  }

  const maxCount = Math.max(...QUIZ_POSITIONS.map((position) => counts[position]));
  return maxCount <= 2;
}

function findAllSamePattern(
  counts: Record<QuizPosition, number>,
): ProfileKey | null {
  for (const position of QUIZ_POSITIONS) {
    if (counts[position] === 6) {
      return `all-${position}` as ProfileKey;
    }
  }
  return null;
}

/** The neighbouring position the answers lean towards, if any answers do. */
function findStrongestAdjacentPosition(
  counts: Record<QuizPosition, number>,
  dominant: QuizPosition,
): QuizPosition | null {
  return QUIZ_POSITIONS.filter(
    (position) => Math.abs(position - dominant) === 1,
  ).reduce<QuizPosition | null>(
    (strongest, position) =>
      strongest === null || counts[position] > counts[strongest]
        ? position
        : strongest,
    null,
  );
}

function findMostlyLeaningPattern(
  counts: Record<QuizPosition, number>,
): ProfileKey | null {
  const dominant = getDominantPosition(counts);
  if (dominant === null || counts[dominant] < 3) return null;

  const leaningPosition = findStrongestAdjacentPosition(counts, dominant);
  if (leaningPosition === null) return null;

  const dominantCount = counts[dominant];
  const leaningCount = counts[leaningPosition];
  const totalResolved = QUIZ_POSITIONS.reduce((sum, pos) => sum + counts[pos], 0);

  // "Mostly X, leaning Y" only holds when every answer sits on those two
  // adjacent positions, with a clear majority on the dominant one.
  const isMostly =
    totalResolved === dominantCount + leaningCount &&
    ((dominantCount >= 4 && leaningCount >= 1) ||
      (dominantCount >= 3 && leaningCount >= 2));
  if (!isMostly) return null;

  // Adjacency guarantees one of the six `mostly-N-M` keys the content defines.
  return `mostly-${dominant}-${leaningPosition}` as ProfileKey;
}

function tryGetPrewrittenProfileKey(
  counts: Record<QuizPosition, number>,
): ProfileKey | null {
  const totalResolved = QUIZ_POSITIONS.reduce((s, p) => s + counts[p], 0);
  if (totalResolved < 6) return null;

  const allSame = findAllSamePattern(counts);
  if (allSame) return allSame;

  const mostlyLeaning = findMostlyLeaningPattern(counts);
  if (mostlyLeaning) return mostlyLeaning;

  if (isMixedPresetPattern(counts)) return 'mixed';

  return null;
}

function toDominanceKey(counts: Record<QuizPosition, number>): DominanceKey {
  const dominant = getDominantPosition(counts);
  if (dominant === null) {
    return 'mixed';
  }

  return String(dominant) as DominanceKey;
}

function getBodySentence(
  audience: ProfileAudience,
  tag: RankedTag,
): string | null {
  return BODY_SENTENCES[audience][tag.dimension][tag.normalizedTag] ?? null;
}

function buildSummaryFromParts(
  audience: ProfileAudience,
  tags: RankedTag[],
  counts: Record<QuizPosition, number>,
): string {
  const parts: string[] = [];
  const firstResolvedTagByDimension = new Map<WorkstyleDimension, RankedTag>();

  for (const tag of tags) {
    if (
      tag.position !== null &&
      !firstResolvedTagByDimension.has(tag.dimension)
    ) {
      firstResolvedTagByDimension.set(tag.dimension, tag);
    }
  }

  const dominanceKey = toDominanceKey(counts);
  const opening = OPENINGS[audience][dominanceKey];
  if (opening) {
    parts.push(opening);
  }

  for (const dimension of WORKSTYLE_DIMENSIONS) {
    const tag = firstResolvedTagByDimension.get(dimension);
    if (!tag) continue;

    const sentence = getBodySentence(audience, tag);
    if (sentence) {
      parts.push(sentence);
    }
  }

  const closing = CLOSINGS[audience][dominanceKey];
  if (closing) {
    parts.push(closing);
  }

  return parts.join(' ');
}

export function getWorkstyleResultsSummary({
  role,
  tags,
  tagMetadata,
}: SummaryInput): string {
  if (!tags || tags.length === 0) {
    return EMPTY_SUMMARY;
  }

  const audience = ROLE_TO_AUDIENCE[role];
  const rankedTags = toRankedTags(audience, tags, tagMetadata);
  const counts = getPositionCounts(rankedTags);

  const prewrittenKey = tryGetPrewrittenProfileKey(counts);
  if (prewrittenKey) {
    const prewritten = PREWRITTEN_SUMMARIES[audience][prewrittenKey];
    if (prewritten) {
      return prewritten;
    }
  }

  if (tags.length < 6) {
    return EMPTY_SUMMARY;
  }

  return buildSummaryFromParts(audience, rankedTags, counts);
}
