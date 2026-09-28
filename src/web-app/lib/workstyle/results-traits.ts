import type { MaterialSymbolName } from '@/web-app/lib/icons/material-symbol-names';
import {
  getDimensionByQuestionIndex,
  type WorkstyleDimension,
} from './dimensions';
import { workstyleResultsContent } from './results-content';
import type { QuizTagMetadata } from './tag-metadata';

const DEFAULT_ICON_NAME: MaterialSymbolName = 'bolt';
const TRAIT_TO_ICON: Record<string, MaterialSymbolName> =
  workstyleResultsContent.icons;

export function toTagKey(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function getTraitVariantByQuestionIndex(
  tag: string,
  questionIndex: number,
  metadata?: QuizTagMetadata | null,
): WorkstyleDimension {
  if (!tag.trim()) {
    return getDimensionByQuestionIndex(questionIndex);
  }

  return (
    metadata?.dimension?.[tag] ?? getDimensionByQuestionIndex(questionIndex)
  );
}

export function getTraitIcon(tag: string): MaterialSymbolName {
  return TRAIT_TO_ICON[tag] ?? DEFAULT_ICON_NAME;
}
