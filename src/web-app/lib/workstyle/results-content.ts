import { z } from 'zod';

import { materialSymbolNameSchema } from '@/web-app/lib/icons/material-symbol-names';
import { WORKSTYLE_DIMENSIONS, type WorkstyleDimension } from './dimensions';
import resultsContentData from './results-content.json';

export const PROFILE_AUDIENCES = ['team-builder', 'independent'] as const;

export type ProfileAudience = (typeof PROFILE_AUDIENCES)[number];

function byAudience<TSchema extends z.ZodType>(value: TSchema) {
  return z.object(
    Object.fromEntries(
      PROFILE_AUDIENCES.map((audience) => [audience, value]),
    ) as Record<ProfileAudience, TSchema>,
  );
}

function byDimension<TSchema extends z.ZodType>(value: TSchema) {
  return z.object(
    Object.fromEntries(
      WORKSTYLE_DIMENSIONS.map((dimension) => [dimension, value]),
    ) as Record<WorkstyleDimension, TSchema>,
  );
}

const copyByKeySchema = z.record(z.string(), z.string());

const positionEntriesSchema = z.array(
  z.tuple([
    z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    z.array(z.string()),
  ]),
);

/**
 * `results-content.json` is copy, edited by humans. Parsing it through a schema
 * at module load turns a malformed edit into a loud startup failure instead of
 * an `undefined` that surfaces as blank results copy in production.
 */
const resultsContentSchema = z.object({
  // Validated against the subset font's glyph list: naming an icon that was
  // not subset in would render an empty box in production.
  icons: z.record(z.string(), materialSymbolNameSchema),
  positions: byAudience(byDimension(positionEntriesSchema)),
  openings: byAudience(copyByKeySchema),
  closings: byAudience(copyByKeySchema),
  sentences: byAudience(byDimension(copyByKeySchema)),
  prewritten: byAudience(copyByKeySchema),
});

type WorkstyleResultsContent = z.infer<typeof resultsContentSchema>;

export const workstyleResultsContent: WorkstyleResultsContent =
  resultsContentSchema.parse(resultsContentData);
