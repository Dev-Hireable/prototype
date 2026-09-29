import { z } from 'zod';

const workstyleResponsesSchema = z.array(
  z.object({
    questionId: z.number().int().positive(),
    answerId: z.number().int().positive(),
  }),
);

export type WorkstyleResponse = z.infer<
  typeof workstyleResponsesSchema
>[number];

export function normalizeText(value: string): string {
  return value.trim();
}

export function normalizeTextOrNull(value: string): string | null {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
}
